"""
Contract Management Service
Electronic contracts with OTP signature validation
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uuid
import random
import string
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import base64

load_dotenv()

router = APIRouter(prefix="/contracts", tags=["Contracts"])

# Database connection
def get_db():
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'creativindustry')
    client = AsyncIOMotorClient(mongo_url)
    return client[db_name]

# Models
class ContractField(BaseModel):
    id: str
    type: str  # text, checkbox, date, signature
    label: str
    x: float  # position X (percentage)
    y: float  # position Y (percentage)
    page: int = 1
    width: float = 200
    height: float = 30
    required: bool = True

class ContractTemplate(BaseModel):
    id: Optional[str] = None
    name: str
    pdf_url: str
    fields: List[ContractField]
    created_at: Optional[datetime] = None

class ContractInstance(BaseModel):
    id: Optional[str] = None
    template_id: str
    client_id: str
    client_name: str
    client_email: str
    status: str = "pending"  # pending, sent, filled, signed
    field_values: Dict[str, Any] = {}
    otp_code: Optional[str] = None
    otp_expires: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    signed_pdf_url: Optional[str] = None
    created_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None

class SendContractRequest(BaseModel):
    template_id: str
    client_id: str

class FillContractRequest(BaseModel):
    field_values: Dict[str, Any]

class SignContractRequest(BaseModel):
    otp_code: str

# Helper to generate OTP
def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

# ==================== TEMPLATE ENDPOINTS ====================

@router.post("/templates/upload-pdf")
async def upload_contract_pdf(file: UploadFile = File(...)):
    """Upload a PDF file for contract template"""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Le fichier doit être un PDF")
    
    # Create uploads directory if not exists
    upload_dir = "/app/backend/uploads/contracts"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(upload_dir, filename)
    
    # Save file
    content = await file.read()
    with open(filepath, 'wb') as f:
        f.write(content)
    
    # Return URL (relative path)
    return {
        "success": True,
        "pdf_url": f"/uploads/contracts/{filename}",
        "filename": file.filename
    }

@router.post("/templates")
async def create_contract_template(template: ContractTemplate):
    """Create a new contract template"""
    db = get_db()
    
    template_data = {
        "id": str(uuid.uuid4()),
        "name": template.name,
        "pdf_url": template.pdf_url,
        "fields": [f.dict() for f in template.fields],
        "created_at": datetime.utcnow()
    }
    
    await db.contract_templates.insert_one(template_data)
    del template_data['_id'] if '_id' in template_data else None
    
    return {"success": True, "template": template_data}

@router.get("/templates")
async def get_contract_templates():
    """Get all contract templates"""
    db = get_db()
    templates = await db.contract_templates.find({}, {"_id": 0}).to_list(100)
    return templates

@router.get("/templates/{template_id}")
async def get_contract_template(template_id: str):
    """Get a specific contract template"""
    db = get_db()
    template = await db.contract_templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    return template

@router.put("/templates/{template_id}")
async def update_contract_template(template_id: str, template: ContractTemplate):
    """Update a contract template"""
    db = get_db()
    
    update_data = {
        "name": template.name,
        "pdf_url": template.pdf_url,
        "fields": [f.dict() for f in template.fields]
    }
    
    result = await db.contract_templates.update_one(
        {"id": template_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    
    return {"success": True}

@router.delete("/templates/{template_id}")
async def delete_contract_template(template_id: str):
    """Delete a contract template"""
    db = get_db()
    result = await db.contract_templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    return {"success": True}

# ==================== CONTRACT INSTANCE ENDPOINTS ====================

@router.post("/send")
async def send_contract_to_client(request: SendContractRequest):
    """Send a contract to a client"""
    db = get_db()
    
    # Get template
    template = await db.contract_templates.find_one({"id": request.template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Modèle non trouvé")
    
    # Get client
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Create contract instance
    contract_data = {
        "id": str(uuid.uuid4()),
        "template_id": request.template_id,
        "template_name": template.get("name"),
        "client_id": request.client_id,
        "client_name": client.get("name", ""),
        "client_email": client.get("email", ""),
        "status": "sent",
        "field_values": {},
        "created_at": datetime.utcnow(),
        "sent_at": datetime.utcnow()
    }
    
    await db.contracts.insert_one(contract_data)
    
    # Send email notification to client
    try:
        from services.email_service import send_email
        await send_email(
            to_email=client.get("email"),
            subject="📋 Nouveau contrat à signer - CREATIVINDUSTRY",
            html_content=f"""
            <h2>Bonjour {client.get('name', '')},</h2>
            <p>Un nouveau contrat est disponible dans votre espace client.</p>
            <p><strong>Contrat :</strong> {template.get('name')}</p>
            <p>Connectez-vous à votre espace client pour le consulter et le signer.</p>
            <p><a href="https://creativindustry.com/client/dashboard" style="background: #D4AF37; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accéder à mon espace</a></p>
            <br>
            <p>Cordialement,<br>CREATIVINDUSTRY</p>
            """
        )
    except Exception as e:
        print(f"Email error: {e}")
    
    return {"success": True, "contract_id": contract_data["id"]}

@router.get("/admin/list")
async def get_all_contracts():
    """Get all contracts for admin"""
    db = get_db()
    contracts = await db.contracts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return contracts

@router.get("/client/{client_id}")
async def get_client_contracts(client_id: str):
    """Get all contracts for a specific client"""
    db = get_db()
    contracts = await db.contracts.find(
        {"client_id": client_id},
        {"_id": 0, "otp_code": 0, "otp_expires": 0}
    ).sort("created_at", -1).to_list(100)
    return contracts

@router.get("/{contract_id}")
async def get_contract(contract_id: str):
    """Get a specific contract"""
    db = get_db()
    contract = await db.contracts.find_one(
        {"id": contract_id},
        {"_id": 0, "otp_code": 0, "otp_expires": 0}
    )
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")
    
    # Also get template fields
    template = await db.contract_templates.find_one(
        {"id": contract.get("template_id")},
        {"_id": 0}
    )
    if template:
        contract["fields"] = template.get("fields", [])
        contract["pdf_url"] = template.get("pdf_url")
    
    return contract

@router.put("/{contract_id}/fill")
async def fill_contract(contract_id: str, request: FillContractRequest):
    """Fill contract fields (client action)"""
    db = get_db()
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")
    
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Ce contrat est déjà signé")
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "field_values": request.field_values,
            "status": "filled"
        }}
    )
    
    return {"success": True}

@router.post("/{contract_id}/request-otp")
async def request_signature_otp(contract_id: str):
    """Request OTP code for signature"""
    db = get_db()
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")
    
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Ce contrat est déjà signé")
    
    # Generate OTP
    otp_code = generate_otp()
    otp_expires = datetime.utcnow() + timedelta(minutes=10)
    
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "otp_code": otp_code,
            "otp_expires": otp_expires
        }}
    )
    
    # Send OTP by email
    try:
        from services.email_service import send_email
        await send_email(
            to_email=contract.get("client_email"),
            subject="🔐 Code de signature - CREATIVINDUSTRY",
            html_content=f"""
            <h2>Code de validation</h2>
            <p>Votre code pour signer le contrat :</p>
            <h1 style="font-size: 48px; letter-spacing: 10px; color: #D4AF37; text-align: center;">{otp_code}</h1>
            <p>Ce code est valable pendant <strong>10 minutes</strong>.</p>
            <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
            <br>
            <p>CREATIVINDUSTRY</p>
            """
        )
    except Exception as e:
        print(f"Email error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de l'envoi du code")
    
    return {"success": True, "message": "Code envoyé par email"}

@router.post("/{contract_id}/sign")
async def sign_contract(contract_id: str, request: SignContractRequest):
    """Sign contract with OTP verification"""
    db = get_db()
    
    contract = await db.contracts.find_one({"id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contrat non trouvé")
    
    if contract.get("status") == "signed":
        raise HTTPException(status_code=400, detail="Ce contrat est déjà signé")
    
    # Verify OTP
    if contract.get("otp_code") != request.otp_code:
        raise HTTPException(status_code=400, detail="Code invalide")
    
    if datetime.utcnow() > contract.get("otp_expires", datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Code expiré")
    
    # Mark as signed
    signed_at = datetime.utcnow()
    await db.contracts.update_one(
        {"id": contract_id},
        {"$set": {
            "status": "signed",
            "signed_at": signed_at,
            "otp_code": None,
            "otp_expires": None
        }}
    )
    
    # Notify admin
    try:
        from services.email_service import send_email
        admin_email = os.environ.get('SMTP_EMAIL', 'contact@creativindustry.com')
        await send_email(
            to_email=admin_email,
            subject=f"✅ Contrat signé - {contract.get('client_name')}",
            html_content=f"""
            <h2>Contrat signé !</h2>
            <p><strong>Client :</strong> {contract.get('client_name')}</p>
            <p><strong>Email :</strong> {contract.get('client_email')}</p>
            <p><strong>Contrat :</strong> {contract.get('template_name')}</p>
            <p><strong>Signé le :</strong> {signed_at.strftime('%d/%m/%Y à %H:%M')}</p>
            <p><a href="https://creativindustry.com/admin/dashboard">Voir dans l'admin</a></p>
            """
        )
    except Exception as e:
        print(f"Admin notification error: {e}")
    
    return {"success": True, "message": "Contrat signé avec succès"}
