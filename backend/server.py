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

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(admin_id: str) -> str:
    payload = {
        "sub": admin_id,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
    token = create_token(admin_id)
    return {"token": token, "admin": {"id": admin_id, "email": data.email, "name": data.name}}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin["id"])
    return {"token": token, "admin": {"id": admin["id"], "email": admin["email"], "name": admin["name"]}}

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(id=admin["id"], email=admin["email"], name=admin["name"])

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

# ==================== STATS ROUTE ====================

@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    unread_messages = await db.contacts.count_documents({"is_read": False})
    total_services = await db.services.count_documents({"is_active": True})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "unread_messages": unread_messages,
        "total_services": total_services
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
