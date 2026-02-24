"""
Routes d'authentification admin et MFA
"""
import uuid
import secrets
import base64
import logging
from datetime import datetime, timezone
from io import BytesIO
from fastapi import APIRouter, HTTPException, Depends
import pyotp
import qrcode

from config import db
from dependencies import (
    hash_password, verify_password, create_token,
    get_current_admin, security
)
from models.schemas import (
    AdminCreate, AdminUpdate, AdminResponse,
    MFASetupResponse, MFAVerifyRequest, MFADisableRequest,
    MFAEmailResetRequest, MFAEmailResetVerify
)

router = APIRouter(tags=["Auth"])


# ==================== MFA HELPERS ====================

def generate_mfa_secret():
    return pyotp.random_base32()


def generate_backup_codes(count=8):
    """Generate backup codes for MFA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_qr_code(secret: str, email: str) -> str:
    """Generate QR code for authenticator app"""
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="CREATIVINDUSTRY France")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


# ==================== ADMIN AUTH ROUTES ====================

class AdminLogin:
    def __init__(self, email: str, password: str, totp_code: str = None):
        self.email = email
        self.password = password
        self.totp_code = totp_code


from pydantic import BaseModel, EmailStr
from typing import Optional

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


@router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLoginRequest):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if account is active
    if not admin.get("is_active", True):
        raise HTTPException(status_code=401, detail="Ce compte est désactivé")
    
    # Check if MFA is enabled
    mfa_enabled = admin.get("mfa_enabled", False)
    
    if mfa_enabled:
        if not data.totp_code:
            return {"mfa_required": True, "message": "Code MFA requis"}
        
        # Verify TOTP code or backup code
        mfa_secret = admin.get("mfa_secret")
        backup_codes = admin.get("backup_codes", [])
        
        is_valid_totp = verify_totp(mfa_secret, data.totp_code)
        is_valid_backup = data.totp_code.upper() in [code.upper() for code in backup_codes]
        
        if not is_valid_totp and not is_valid_backup:
            raise HTTPException(status_code=401, detail="Code MFA invalide")
        
        # If backup code used, remove it
        if is_valid_backup:
            backup_codes = [code for code in backup_codes if code.upper() != data.totp_code.upper()]
            await db.admins.update_one({"id": admin["id"]}, {"$set": {"backup_codes": backup_codes}})
    
    token = create_token(admin["id"], "admin")
    return {
        "token": token, 
        "admin": {
            "id": admin["id"], 
            "email": admin["email"], 
            "name": admin["name"],
            "mfa_enabled": mfa_enabled,
            "role": admin.get("role", "complet"),
            "allowed_tabs": admin.get("allowed_tabs", [])
        }
    }


@router.get("/auth/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(
        id=admin["id"], 
        email=admin["email"], 
        name=admin["name"],
        mfa_enabled=admin.get("mfa_enabled", False),
        role=admin.get("role", "complet"),
        allowed_tabs=admin.get("allowed_tabs", []),
        is_active=admin.get("is_active", True)
    )


@router.get("/admin/me")
async def get_admin_me(admin: dict = Depends(get_current_admin)):
    """Get current admin info"""
    return {
        "id": admin["id"],
        "email": admin["email"],
        "name": admin["name"],
        "mfa_enabled": admin.get("mfa_enabled", False),
        "role": admin.get("role", "complet"),
        "allowed_tabs": admin.get("allowed_tabs", []),
        "is_active": admin.get("is_active", True)
    }


@router.post("/admin/create-admin", response_model=dict)
async def create_admin_account(data: AdminCreate, admin: dict = Depends(get_current_admin)):
    """Create a new admin account - Only accessible by existing admins with 'complet' role"""
    if admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent créer des comptes")
    
    existing = await db.admins.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "allowed_tabs": data.allowed_tabs if data.role != "complet" else [],
        "is_active": True,
        "mfa_enabled": False,
        "mfa_secret": None,
        "backup_codes": [],
        "created_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    
    logging.info(f"New admin account created: {data.email} with role {data.role} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Compte administrateur créé avec succès",
        "admin": {
            "id": admin_id, 
            "email": data.email, 
            "name": data.name,
            "role": data.role,
            "allowed_tabs": admin_doc["allowed_tabs"],
            "is_active": True
        }
    }


@router.get("/admin/admins-list")
async def get_admins_list(admin: dict = Depends(get_current_admin)):
    """Get list of all admin accounts"""
    admins = await db.admins.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "mfa_enabled": 1, "created_at": 1, "created_by": 1, "role": 1, "allowed_tabs": 1, "is_active": 1}
    ).to_list(100)
    for a in admins:
        if "role" not in a:
            a["role"] = "complet"
        if "allowed_tabs" not in a:
            a["allowed_tabs"] = []
        if "is_active" not in a:
            a["is_active"] = True
    return admins


@router.put("/admin/update-admin/{admin_id}")
async def update_admin_account(admin_id: str, data: AdminUpdate, admin: dict = Depends(get_current_admin)):
    """Update an admin account"""
    is_self = admin_id == admin.get("id")
    if not is_self and admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent modifier d'autres comptes")
    
    target_admin = await db.admins.find_one({"id": admin_id})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.role is not None and not is_self:
        update_data["role"] = data.role
    if data.allowed_tabs is not None:
        update_data["allowed_tabs"] = data.allowed_tabs
    if data.is_active is not None and not is_self:
        update_data["is_active"] = data.is_active
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.admins.update_one({"id": admin_id}, {"$set": update_data})
    
    updated_admin = await db.admins.find_one({"id": admin_id}, {"_id": 0, "password": 0, "mfa_secret": 0, "backup_codes": 0})
    
    logging.info(f"Admin account updated: {target_admin.get('email')} by {admin.get('email')}")
    
    return {"success": True, "admin": updated_admin}


@router.delete("/admin/delete-admin/{admin_id}")
async def delete_admin_account(admin_id: str, admin: dict = Depends(get_current_admin)):
    """Delete an admin account"""
    if admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent supprimer des comptes")
    
    if admin_id == admin.get("id"):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    target_admin = await db.admins.find_one({"id": admin_id})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    
    admin_count = await db.admins.count_documents({})
    if admin_count <= 1:
        raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier administrateur")
    
    await db.admins.delete_one({"id": admin_id})
    logging.info(f"Admin account deleted: {target_admin.get('email')} by {admin.get('email')}")
    
    return {"success": True, "message": "Compte administrateur supprimé"}


# ==================== MFA ROUTES ====================

@router.post("/auth/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(admin: dict = Depends(get_current_admin)):
    """Generate MFA secret and QR code for setup"""
    if admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA déjà activé")
    
    secret = generate_mfa_secret()
    qr_code = generate_qr_code(secret, admin["email"])
    backup_codes = generate_backup_codes()
    
    # Store secret temporarily (not enabled yet)
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_secret": secret, "backup_codes": backup_codes}}
    )
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )


@router.post("/auth/mfa/verify")
async def verify_mfa_setup(data: MFAVerifyRequest, admin: dict = Depends(get_current_admin)):
    """Verify MFA code and enable MFA"""
    if admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA déjà activé")
    
    mfa_secret = admin.get("mfa_secret")
    if not mfa_secret:
        raise HTTPException(status_code=400, detail="MFA non initialisé")
    
    if not verify_totp(mfa_secret, data.totp_code):
        raise HTTPException(status_code=400, detail="Code invalide")
    
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_enabled": True}}
    )
    
    return {"success": True, "message": "MFA activé avec succès"}


@router.post("/auth/mfa/disable")
async def disable_mfa(data: MFADisableRequest, admin: dict = Depends(get_current_admin)):
    """Disable MFA"""
    if not admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA non activé")
    
    # Verify password
    if not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    # Verify MFA code (TOTP, backup, or email)
    mfa_secret = admin.get("mfa_secret")
    backup_codes = admin.get("backup_codes", [])
    
    valid = False
    if data.totp_code and verify_totp(mfa_secret, data.totp_code):
        valid = True
    elif data.backup_code and data.backup_code.upper() in [code.upper() for code in backup_codes]:
        valid = True
    elif data.email_code:
        stored_code = admin.get("email_reset_code")
        if stored_code and data.email_code == stored_code:
            valid = True
    
    if not valid:
        raise HTTPException(status_code=401, detail="Code de vérification invalide")
    
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_enabled": False, "mfa_secret": None, "backup_codes": []}}
    )
    
    return {"success": True, "message": "MFA désactivé"}


@router.post("/auth/mfa/backup-codes")
async def regenerate_backup_codes(admin: dict = Depends(get_current_admin)):
    """Regenerate backup codes"""
    if not admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA non activé")
    
    backup_codes = generate_backup_codes()
    
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"backup_codes": backup_codes}}
    )
    
    return {"backup_codes": backup_codes}


@router.get("/auth/mfa/status")
async def get_mfa_status(admin: dict = Depends(get_current_admin)):
    """Get MFA status"""
    return {
        "mfa_enabled": admin.get("mfa_enabled", False),
        "backup_codes_count": len(admin.get("backup_codes", []))
    }
