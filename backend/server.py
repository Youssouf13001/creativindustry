from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET', 'creativindustry-secret-key-2024')
ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# ==================== EMAIL HELPER ====================

def send_email(to_email: str, subject: str, html_content: str):
    """Send an email using SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False

def send_file_notification_email(client_email: str, client_name: str, file_title: str, file_type: str, file_url: str):
    """Send notification email when a file is added to client space"""
    
    file_type_fr = {
        "video": "vidéo",
        "photo": "photo",
        "document": "document"
    }.get(file_type, "fichier")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ color: #D4AF37; font-size: 24px; font-weight: bold; letter-spacing: -1px; }}
            .content {{ background-color: #111111; border: 1px solid #222222; padding: 40px; }}
            h1 {{ color: #D4AF37; font-size: 24px; margin-bottom: 20px; }}
            p {{ color: #cccccc; line-height: 1.6; margin-bottom: 15px; }}
            .file-info {{ background-color: #1a1a1a; border-left: 3px solid #D4AF37; padding: 20px; margin: 25px 0; }}
            .file-title {{ color: #ffffff; font-size: 18px; font-weight: bold; margin-bottom: 5px; }}
            .file-type {{ color: #D4AF37; font-size: 14px; text-transform: uppercase; }}
            .btn {{ display: inline-block; background-color: #D4AF37; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; }}
            .btn:hover {{ background-color: #ffffff; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">CREATIVINDUSTRY</div>
            </div>
            <div class="content">
                <h1>Nouveau fichier disponible !</h1>
                <p>Bonjour {client_name},</p>
                <p>Nous avons le plaisir de vous informer qu'un nouveau fichier a été ajouté à votre espace client.</p>
                
                <div class="file-info">
                    <div class="file-title">{file_title}</div>
                    <div class="file-type">{file_type_fr}</div>
                </div>
                
                <p>Vous pouvez dès maintenant accéder à ce fichier depuis votre espace client ou en cliquant sur le bouton ci-dessous.</p>
                
                <a href="{file_url}" class="btn">Télécharger le fichier</a>
                
                <p style="margin-top: 30px;">Vous pouvez également retrouver tous vos fichiers dans votre <a href="https://creativindustry.com/client" style="color: #D4AF37;">espace client</a>.</p>
            </div>
            <div class="footer">
                <p>© 2024 CREATIVINDUSTRY France<br>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"🎬 Nouveau fichier disponible : {file_title}"
    return send_email(client_email, subject, html_content)

# ==================== MODELS ====================

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str

class ServicePackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    features: List[str]
    category: str  # wedding, podcast, tv_set
    duration: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServicePackageCreate(BaseModel):
    name: str
    description: str
    price: float
    features: List[str]
    category: str
    duration: Optional[str] = None

class ServicePackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    duration: Optional[str] = None
    is_active: Optional[bool] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    service_name: str
    service_category: str
    event_date: str
    event_time: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    event_date: str
    event_time: Optional[str] = None
    message: Optional[str] = None

class BookingUpdate(BaseModel):
    status: str

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

# ==================== WEDDING QUOTE MODELS ====================

class WeddingOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str  # coverage, extras, editing
    is_active: bool = True

class WeddingOptionCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str

class WeddingOptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class WeddingQuote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]  # List of option IDs
    options_details: List[dict] = []  # Populated with option names and prices
    total_price: float = 0
    message: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeddingQuoteCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]
    message: Optional[str] = None

# ==================== PORTFOLIO MODELS ====================

class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    media_type: str  # photo, video
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str  # wedding, podcast, tv_set
    is_featured: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str
    is_featured: bool = False

class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, user_type: str = "admin") -> str:
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        user_type = payload.get("type", "admin")
        if user_type != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_client(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        client_id = payload.get("sub")
        user_type = payload.get("type", "admin")
        if user_type != "client":
            raise HTTPException(status_code=403, detail="Client access required")
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=401, detail="Client not found")
        return client
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ==================== CLIENT MODELS ====================

class ClientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None

class ClientFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str  # video, photo, document
    file_url: str  # External URL (Google Drive, Dropbox, YouTube)
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientFileCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str
    file_url: str
    thumbnail_url: Optional[str] = None

# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # user, assistant
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    session_id: str
    message: str

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register_admin(data: AdminCreate):
    existing = await db.admins.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    token = create_token(admin_id, "admin")
    return {"token": token, "admin": {"id": admin_id, "email": data.email, "name": data.name}}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin["id"], "admin")
    return {"token": token, "admin": {"id": admin["id"], "email": admin["email"], "name": admin["name"]}}

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(id=admin["id"], email=admin["email"], name=admin["name"])

# ==================== CLIENT AUTH ROUTES ====================

@api_router.post("/client/register", response_model=dict)
async def register_client(data: ClientCreate):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    token = create_token(client_id, "client")
    return {"token": token, "client": {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone}}

@api_router.post("/client/login", response_model=dict)
async def login_client(data: ClientLogin):
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    if not client or not verify_password(data.password, client["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(client["id"], "client")
    return {"token": token, "client": {"id": client["id"], "email": client["email"], "name": client["name"], "phone": client.get("phone")}}

@api_router.get("/client/me", response_model=ClientResponse)
async def get_client_me(client: dict = Depends(get_current_client)):
    return ClientResponse(id=client["id"], email=client["email"], name=client["name"], phone=client.get("phone"))

# ==================== CLIENT FILES ROUTES ====================

@api_router.get("/client/files", response_model=List[ClientFile])
async def get_client_files(client: dict = Depends(get_current_client)):
    files = await db.client_files.find({"client_id": client["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return files

@api_router.post("/client/files", response_model=ClientFile)
async def create_client_file(data: ClientFileCreate, admin: dict = Depends(get_current_admin)):
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    file = ClientFile(**data.model_dump())
    doc = file.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.client_files.insert_one(doc)
    return file

@api_router.delete("/client/files/{file_id}")
async def delete_client_file(file_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.client_files.delete_one({"id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted"}

# ==================== ADMIN CLIENT MANAGEMENT ====================

@api_router.get("/admin/clients", response_model=List[ClientResponse])
async def get_all_clients(admin: dict = Depends(get_current_admin)):
    clients = await db.clients.find({}, {"_id": 0, "password": 0}).to_list(500)
    return clients

@api_router.post("/admin/clients", response_model=dict)
async def create_client_by_admin(data: ClientCreate, admin: dict = Depends(get_current_admin)):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    return {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone}

@api_router.get("/admin/clients/{client_id}/files", response_model=List[ClientFile])
async def get_client_files_admin(client_id: str, admin: dict = Depends(get_current_admin)):
    files = await db.client_files.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return files

# ==================== CHATBOT ROUTES ====================

@api_router.post("/chat")
async def chat_with_bot(data: ChatRequest):
    try:
        # Get chat history for this session
        history = await db.chat_messages.find({"session_id": data.session_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
        
        # Build messages for context
        messages_for_llm = []
        for msg in history[-10:]:  # Last 10 messages for context
            messages_for_llm.append({"role": msg["role"], "content": msg["content"]})
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=data.session_id,
            system_message="""Tu es l'assistant virtuel de CREATIVINDUSTRY France, un studio de production créative spécialisé dans :
- La photographie et vidéographie de mariage
- Les studios podcast
- Les plateaux TV

Tu dois répondre en français de manière professionnelle et chaleureuse. 
Tu aides les visiteurs à :
- Comprendre nos services et tarifs
- Les orienter vers la bonne formule
- Répondre aux questions sur le processus de réservation
- Donner des informations sur le studio

Services principaux :
- Mariages : Formules de 1500€ à 4500€ (Essentielle, Complète, Premium)
- Podcast : Location studio de 150€/h à 700€/jour
- Plateau TV : De 800€ à 3500€ selon les besoins

Si tu ne sais pas répondre à une question spécifique, invite le visiteur à nous contacter directement ou à demander un devis personnalisé."""
        ).with_model("openai", "gpt-4o")
        
        # Save user message
        user_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "role": "user",
            "content": data.message,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(user_msg)
        
        # Get response from AI
        user_message = UserMessage(text=data.message)
        response = await chat.send_message(user_message)
        
        # Save assistant message
        assistant_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(assistant_msg)
        
        return {"response": response, "session_id": data.session_id}
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        return {"response": "Désolé, je rencontre un problème technique. Veuillez nous contacter directement au +33 1 23 45 67 89 ou par email à contact@creativindustry.fr", "session_id": data.session_id}

@api_router.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

# ==================== SERVICES ROUTES ====================

@api_router.get("/services", response_model=List[ServicePackage])
async def get_services(category: Optional[str] = None, active_only: bool = True):
    query = {}
    if category:
        query["category"] = category
    if active_only:
        query["is_active"] = True
    
    services = await db.services.find(query, {"_id": 0}).to_list(100)
    for s in services:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return services

@api_router.get("/services/{service_id}", response_model=ServicePackage)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return service

@api_router.post("/services", response_model=ServicePackage)
async def create_service(data: ServicePackageCreate, admin: dict = Depends(get_current_admin)):
    service = ServicePackage(**data.model_dump())
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service

@api_router.put("/services/{service_id}", response_model=ServicePackage)
async def update_service(service_id: str, data: ServicePackageUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.services.update_one({"id": service_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

# ==================== BOOKINGS ROUTES ====================

@api_router.post("/bookings", response_model=Booking)
async def create_booking(data: BookingCreate):
    service = await db.services.find_one({"id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    booking = Booking(
        **data.model_dump(),
        service_name=service["name"],
        service_category=service["category"]
    )
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookings.insert_one(doc)
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(status: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for b in bookings:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
    return bookings

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, data: BookingUpdate, admin: dict = Depends(get_current_admin)):
    result = await db.bookings.update_one({"id": booking_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if isinstance(booking.get('created_at'), str):
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    return booking

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact", response_model=ContactMessage)
async def create_contact(data: ContactMessageCreate):
    message = ContactMessage(**data.model_dump())
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contacts.insert_one(doc)
    return message

@api_router.get("/contact", response_model=List[ContactMessage])
async def get_contacts(admin: dict = Depends(get_current_admin)):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for c in contacts:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return contacts

@api_router.put("/contact/{contact_id}/read")
async def mark_contact_read(contact_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Marked as read"}

# ==================== WEDDING OPTIONS ROUTES ====================

@api_router.get("/wedding-options", response_model=List[WeddingOption])
async def get_wedding_options(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    options = await db.wedding_options.find(query, {"_id": 0}).to_list(100)
    return options

@api_router.post("/wedding-options", response_model=WeddingOption)
async def create_wedding_option(data: WeddingOptionCreate, admin: dict = Depends(get_current_admin)):
    option = WeddingOption(**data.model_dump())
    await db.wedding_options.insert_one(option.model_dump())
    return option

@api_router.put("/wedding-options/{option_id}", response_model=WeddingOption)
async def update_wedding_option(option_id: str, data: WeddingOptionUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.wedding_options.update_one({"id": option_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    option = await db.wedding_options.find_one({"id": option_id}, {"_id": 0})
    return option

@api_router.delete("/wedding-options/{option_id}")
async def delete_wedding_option(option_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.wedding_options.delete_one({"id": option_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    return {"message": "Option deleted"}

# ==================== WEDDING QUOTES ROUTES ====================

@api_router.post("/wedding-quotes", response_model=WeddingQuote)
async def create_wedding_quote(data: WeddingQuoteCreate):
    options = await db.wedding_options.find({"id": {"$in": data.selected_options}}, {"_id": 0}).to_list(100)
    options_details = [{"id": o["id"], "name": o["name"], "price": o["price"]} for o in options]
    total_price = sum(o["price"] for o in options)
    
    quote = WeddingQuote(
        **data.model_dump(),
        options_details=options_details,
        total_price=total_price
    )
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.wedding_quotes.insert_one(doc)
    return quote

@api_router.get("/wedding-quotes", response_model=List[WeddingQuote])
async def get_wedding_quotes(admin: dict = Depends(get_current_admin)):
    quotes = await db.wedding_quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for q in quotes:
        if isinstance(q.get('created_at'), str):
            q['created_at'] = datetime.fromisoformat(q['created_at'])
    return quotes

@api_router.put("/wedding-quotes/{quote_id}/status")
async def update_wedding_quote_status(quote_id: str, status: str, admin: dict = Depends(get_current_admin)):
    result = await db.wedding_quotes.update_one({"id": quote_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Status updated"}

# ==================== PORTFOLIO ROUTES ====================

@api_router.get("/portfolio", response_model=List[PortfolioItem])
async def get_portfolio(category: Optional[str] = None, media_type: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if media_type:
        query["media_type"] = media_type
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/portfolio", response_model=PortfolioItem)
async def create_portfolio_item(data: PortfolioItemCreate, admin: dict = Depends(get_current_admin)):
    item = PortfolioItem(**data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.portfolio.insert_one(doc)
    return item

@api_router.put("/portfolio/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(item_id: str, data: PortfolioItemUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.portfolio.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.portfolio.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(item_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.portfolio.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ==================== STATS ROUTE ====================

@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    unread_messages = await db.contacts.count_documents({"is_read": False})
    total_services = await db.services.count_documents({"is_active": True})
    pending_quotes = await db.wedding_quotes.count_documents({"status": "pending"})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "unread_messages": unread_messages,
        "total_services": total_services,
        "pending_quotes": pending_quotes
    }

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    existing = await db.services.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    services = [
        # Wedding packages
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Essentielle",
            "description": "Capturer les moments essentiels de votre journée avec élégance",
            "price": 1500,
            "features": ["6 heures de couverture", "300+ photos retouchées", "Galerie privée en ligne", "Livraison sous 4 semaines"],
            "category": "wedding",
            "duration": "6 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Complète",
            "description": "Une couverture complète de votre mariage du début à la fin",
            "price": 2800,
            "features": ["10 heures de couverture", "500+ photos retouchées", "Film teaser 3 min", "Album photo 30 pages", "Livraison sous 6 semaines"],
            "category": "wedding",
            "duration": "10 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Premium",
            "description": "L'expérience ultime pour immortaliser chaque instant",
            "price": 4500,
            "features": ["Couverture journée entière", "800+ photos retouchées", "Film cinématique 10 min", "Album luxe 50 pages", "Séance engagement incluse", "Second photographe"],
            "category": "wedding",
            "duration": "Journée complète",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Podcast packages
        {
            "id": str(uuid.uuid4()),
            "name": "Studio 1 Heure",
            "description": "Idéal pour les épisodes courts ou les interviews",
            "price": 150,
            "features": ["1 heure de studio", "Équipement audio pro", "2 micros inclus", "Assistance technique"],
            "category": "podcast",
            "duration": "1 heure",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Studio Demi-Journée",
            "description": "Parfait pour enregistrer plusieurs épisodes",
            "price": 400,
            "features": ["4 heures de studio", "Équipement audio pro", "4 micros inclus", "Montage audio basique", "Assistance technique dédiée"],
            "category": "podcast",
            "duration": "4 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Studio Journée",
            "description": "Location complète pour vos productions ambitieuses",
            "price": 700,
            "features": ["8 heures de studio", "Équipement complet", "6 micros + caméras", "Montage audio complet", "Équipe technique sur place"],
            "category": "podcast",
            "duration": "8 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # TV Set packages
        {
            "id": str(uuid.uuid4()),
            "name": "Plateau Standard",
            "description": "Un espace professionnel pour vos tournages",
            "price": 800,
            "features": ["Demi-journée de plateau", "Éclairage professionnel", "Fond vert disponible", "Loge maquillage"],
            "category": "tv_set",
            "duration": "4 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Plateau Équipé",
            "description": "Plateau complet avec équipement technique inclus",
            "price": 1500,
            "features": ["Journée complète", "3 caméras 4K", "Régie vidéo", "Éclairage LED", "Prompteur", "Technicien inclus"],
            "category": "tv_set",
            "duration": "8 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Production Complète",
            "description": "Service clé en main pour vos productions télévisées",
            "price": 3500,
            "features": ["2 jours de plateau", "Équipe technique complète", "Réalisation incluse", "Post-production", "Livraison fichiers masters"],
            "category": "tv_set",
            "duration": "2 jours",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.services.insert_many(services)
    
    # Seed wedding options for quote builder
    existing_options = await db.wedding_options.count_documents({})
    if existing_options == 0:
        wedding_options = [
            # Coverage options
            {"id": str(uuid.uuid4()), "name": "Préparatifs Mariée", "description": "Couverture des préparatifs de la mariée", "price": 300, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Préparatifs Marié", "description": "Couverture des préparatifs du marié", "price": 250, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Civile", "description": "Couverture de la mairie", "price": 400, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Religieuse", "description": "Couverture de la cérémonie religieuse", "price": 500, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Laïque", "description": "Couverture de la cérémonie laïque", "price": 450, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Vin d'honneur", "description": "Couverture du cocktail", "price": 350, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Soirée & Réception", "description": "Couverture de la soirée dansante", "price": 600, "category": "coverage", "is_active": True},
            # Extras
            {"id": str(uuid.uuid4()), "name": "Drone", "description": "Prises de vue aériennes par drone", "price": 400, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Second Photographe", "description": "Un photographe supplémentaire", "price": 500, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Séance Couple", "description": "Séance photo en extérieur le jour J", "price": 300, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Séance Engagement", "description": "Séance photo avant le mariage", "price": 350, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Photobooth", "description": "Installation photobooth pour vos invités", "price": 450, "category": "extras", "is_active": True},
            # Editing/Deliverables
            {"id": str(uuid.uuid4()), "name": "Film Teaser 3min", "description": "Montage vidéo court et dynamique", "price": 600, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Film Cinématique 10min", "description": "Film complet de votre journée", "price": 1200, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Album Photo 30 pages", "description": "Album premium personnalisé", "price": 400, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Album Photo 50 pages", "description": "Album luxe grand format", "price": 650, "category": "editing", "is_active": True},
        ]
        await db.wedding_options.insert_many(wedding_options)
    
    # Seed portfolio items
    existing_portfolio = await db.portfolio.count_documents({})
    if existing_portfolio == 0:
        portfolio_items = [
            # Wedding photos
            {"id": str(uuid.uuid4()), "title": "Mariage Élégant à Paris", "description": "Un mariage intime dans un château parisien", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Mariage Champêtre", "description": "Célébration en pleine nature", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Préparatifs de la Mariée", "description": "Moments intimes avant la cérémonie", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1594552072238-5c4cebd833d7?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Échange des Vœux", "description": "L'émotion de la cérémonie", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Première Danse", "description": "Un moment magique", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Détails & Décoration", "description": "L'art dans les détails", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # Wedding videos (YouTube embeds as examples)
            {"id": str(uuid.uuid4()), "title": "Film de Mariage - Sophie & Thomas", "description": "Un mariage romantique en Provence", "media_type": "video", "media_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Teaser - Marie & Jean", "description": "3 minutes d'émotion pure", "media_type": "video", "media_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail_url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # Podcast photos
            {"id": str(uuid.uuid4()), "title": "Notre Studio Podcast", "description": "Équipement professionnel", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800", "category": "podcast", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # TV Set photos
            {"id": str(uuid.uuid4()), "title": "Plateau TV Principal", "description": "Notre espace de tournage", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800", "category": "tv_set", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.portfolio.insert_many(portfolio_items)
    
    return {"message": "Data seeded successfully", "services_created": len(services)}

@api_router.get("/")
async def root():
    return {"message": "CREATIVINDUSTRY France API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
