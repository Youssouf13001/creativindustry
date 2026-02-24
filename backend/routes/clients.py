"""
Routes d'authentification et gestion des clients
"""
import uuid
import shutil
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from config import db, UPLOADS_DIR, SMTP_EMAIL, SMTP_PASSWORD, SITE_URL
from dependencies import (
    hash_password, verify_password, create_token,
    get_current_client, security
)
from models.schemas import ClientCreate, ClientResponse

router = APIRouter(tags=["Clients"])

# Allowed image types
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]


# ==================== REQUEST MODELS ====================

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

class ClientProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class ClientPasswordChange(BaseModel):
    current_password: str
    new_password: str

class ClientPasswordResetRequest(BaseModel):
    email: str

class ClientPasswordResetVerify(BaseModel):
    email: str
    reset_code: str
    new_password: str

class NewsletterPreferenceUpdate(BaseModel):
    subscribed: bool

class ExtensionRequestModel(BaseModel):
    payment_method: str


# ==================== CLIENT AUTH ROUTES ====================

@router.post("/client/register", response_model=dict)
async def register_client(data: ClientCreate):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
    
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "newsletter_subscribed": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
        "extension_requested": False,
        "extension_paid": False
    }
    await db.clients.insert_one(client_doc)
    token = create_token(client_id, "client")
    return {"token": token, "client": {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone, "expires_at": expires_at}}


@router.post("/client/login", response_model=dict)
async def login_client(data: ClientLogin):
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    if not client or not verify_password(data.password, client["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Check if account is expired
    expires_at = client.get("expires_at")
    if expires_at:
        try:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expiry_date:
                raise HTTPException(
                    status_code=403, 
                    detail={
                        "expired": True,
                        "client_id": client["id"],
                        "client_email": client["email"],
                        "client_name": client["name"],
                        "message": "Votre accès a expiré",
                        "renewal_options": [
                            {"id": "weekly", "label": "1 semaine", "price": 24, "price_ht": 20, "tva": 4, "days": 7},
                            {"id": "6months", "label": "6 mois", "price": 108, "price_ht": 90, "tva": 18, "days": 180}
                        ],
                        "paypal_link": "https://paypal.me/creativindustryfranc"
                    }
                )
        except ValueError:
            pass
    
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(client["id"], "client")
    return {
        "token": token, 
        "client": {
            "id": client["id"], 
            "email": client["email"], 
            "name": client["name"], 
            "phone": client.get("phone"),
            "must_change_password": client.get("must_change_password", False),
            "expires_at": client.get("expires_at")
        }
    }


@router.get("/client/me", response_model=ClientResponse)
async def get_client_me(client: dict = Depends(get_current_client)):
    full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    if full_client:
        return ClientResponse(
            id=full_client["id"],
            email=full_client["email"], 
            name=full_client["name"], 
            phone=full_client.get("phone"),
            profile_photo=full_client.get("profile_photo"),
            newsletter_subscribed=full_client.get("newsletter_subscribed", True),
            must_change_password=full_client.get("must_change_password", False)
        )
    return ClientResponse(id=client["id"], email=client["email"], name=client["name"], phone=client.get("phone"))


# ==================== CLIENT PROFILE MANAGEMENT ====================

@router.put("/client/profile")
async def update_client_profile(data: ClientProfileUpdate, client: dict = Depends(get_current_client)):
    """Update client profile (name, phone)"""
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.clients.update_one({"id": client["id"]}, {"$set": update_data})
    
    updated_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    return {"success": True, "client": updated_client}


@router.post("/client/profile/photo")
async def upload_client_photo(
    file: UploadFile = File(...),
    client: dict = Depends(get_current_client)
):
    """Upload client profile photo"""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG ou WEBP.")
    
    client_folder = UPLOADS_DIR / "clients" / client["id"]
    client_folder.mkdir(exist_ok=True, parents=True)
    
    file_ext = Path(file.filename).suffix.lower()
    photo_filename = f"profile{file_ext}"
    file_path = client_folder / photo_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    photo_url = f"/uploads/clients/{client['id']}/{photo_filename}"
    await db.clients.update_one({"id": client["id"]}, {"$set": {"profile_photo": photo_url}})
    
    return {"success": True, "photo_url": photo_url}


@router.put("/client/newsletter")
async def update_newsletter_preference(data: NewsletterPreferenceUpdate, client: dict = Depends(get_current_client)):
    """Update client newsletter subscription preference"""
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"newsletter_subscribed": data.subscribed}}
    )
    
    action = "abonné" if data.subscribed else "désabonné"
    logging.info(f"Client {client['id']} {action} de la newsletter")
    
    return {
        "success": True, 
        "newsletter_subscribed": data.subscribed,
        "message": f"Vous êtes maintenant {action} de la newsletter"
    }


# ==================== ACCOUNT STATUS ====================

@router.get("/client/account-status")
async def get_client_account_status(client: dict = Depends(get_current_client)):
    """Get client account status including expiration info"""
    full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    if not full_client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    expires_at = full_client.get("expires_at")
    is_expired = False
    days_remaining = None
    
    if expires_at:
        try:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            is_expired = now > expiry_date
            if not is_expired:
                days_remaining = (expiry_date - now).days
        except ValueError:
            pass
    
    # If expired, return 403 to force renewal
    if is_expired:
        raise HTTPException(
            status_code=403,
            detail={
                "expired": True,
                "client_id": client["id"],
                "client_email": client["email"],
                "client_name": client["name"],
                "message": "Votre accès a expiré",
                "renewal_options": [
                    {"id": "weekly", "label": "1 semaine", "price": 24, "price_ht": 20, "tva": 4, "days": 7},
                    {"id": "6months", "label": "6 mois", "price": 108, "price_ht": 90, "tva": 18, "days": 180}
                ]
            }
        )
    
    return {
        "id": full_client["id"],
        "name": full_client["name"],
        "email": full_client["email"],
        "expires_at": expires_at,
        "is_expired": is_expired,
        "days_remaining": days_remaining,
        "extension_requested": full_client.get("extension_requested", False),
        "extension_paid": full_client.get("extension_paid", False),
        "renewal_options": [
            {"id": "weekly", "label": "1 semaine", "price": 24, "price_ht": 20, "tva": 4, "days": 7},
            {"id": "6months", "label": "6 mois", "price": 108, "price_ht": 90, "tva": 18, "days": 180}
        ]
    }


# ==================== PASSWORD MANAGEMENT ====================

@router.put("/client/password")
async def change_client_password(data: ClientPasswordChange, client: dict = Depends(get_current_client)):
    """Change client password"""
    full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0})
    
    if not verify_password(data.current_password, full_client["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    
    new_hashed = hash_password(data.new_password)
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"password": new_hashed, "must_change_password": False}}
    )
    
    return {"success": True, "message": "Mot de passe modifié avec succès"}
