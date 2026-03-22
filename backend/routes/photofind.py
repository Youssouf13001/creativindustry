"""
Routes pour PhotoFind (Kiosque Photo avec reconnaissance faciale)
Refactorisé depuis server.py - Mars 2026
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid
import logging
import os
import io
import zipfile
import qrcode
import requests
import boto3
from botocore.exceptions import ClientError
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
AWS_ACCESS_KEY = os.environ.get('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY', '')
AWS_REGION = os.environ.get('AWS_REGION', 'eu-west-3')
SITE_URL = os.environ.get('SITE_URL', 'https://creativindustry.com')
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_CLIENT_SECRET = os.environ.get('PAYPAL_CLIENT_SECRET', '')
STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY', '')

# Database connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Uploads directory
ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "uploads"
PHOTOFIND_DIR = UPLOADS_DIR / "photofind"
PHOTOFIND_DIR.mkdir(parents=True, exist_ok=True)

# Router
router = APIRouter(tags=["PhotoFind"])

# ==================== AWS REKOGNITION ====================

def get_rekognition_client():
    """Get AWS Rekognition client"""
    return boto3.client(
        'rekognition',
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY
    )

# ==================== MODELS ====================

class PhotoFindEventCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    event_date: str
    price_per_photo: float = 5.0
    price_pack_5: float = 20.0
    price_pack_10: float = 35.0
    price_all: float = 50.0

class PhotoFindEventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[str] = None
    price_per_photo: Optional[float] = None
    price_pack_5: Optional[float] = None
    price_pack_10: Optional[float] = None
    price_all: Optional[float] = None
    is_active: Optional[bool] = None

class KioskPurchaseData(BaseModel):
    photo_ids: List[str]
    email: str
    payment_method: str  # cash, card
    amount: float
    format: Optional[str] = "digital"
    frame_id: Optional[str] = None

class KioskPrintLog(BaseModel):
    photo_ids: List[str]
    format: str
    frame_id: Optional[str] = None

class KioskPayPalOrderRequest(BaseModel):
    photo_ids: List[str]
    email: Optional[str] = None
    amount: float
    format: Optional[str] = "digital"
    frame_id: Optional[str] = None
    return_url: Optional[str] = None

class KioskCapturePayPalRequest(BaseModel):
    order_id: str
    photo_ids: List[str]
    email: Optional[str] = None
    amount: float
    format: Optional[str] = "digital"
    frame_id: Optional[str] = None

class KioskStripePaymentIntent(BaseModel):
    photo_ids: List[str]
    email: Optional[str] = None
    amount: float
    format: Optional[str] = "digital"
    frame_id: Optional[str] = None

# ==================== UPLOAD PRINT SESSION MODELS ====================

class UploadPrintSession(BaseModel):
    session_id: str
    event_id: str
    status: str  # waiting, uploaded, printing, completed
    photo_url: Optional[str] = None
    created_at: str
    expires_at: str

# ==================== AUTH DEPENDENCY ====================

_get_current_admin = None

def set_admin_dependency(get_current_admin_func):
    """Set the admin authentication dependency"""
    global _get_current_admin
    _get_current_admin = get_current_admin_func

async def require_admin(credentials = Depends(HTTPBearer(auto_error=False))):
    """Wrapper function for admin authentication"""
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Admin auth not configured")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _get_current_admin(credentials)

# ==================== EMAIL HELPER ====================

def send_purchase_email(email: str, download_url: str, photo_count: int):
    """Send email with download link after purchase"""
    import smtplib
    import re
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    # Validate email before attempting to send
    if not email or not isinstance(email, str):
        logging.warning(f"Invalid email (empty or not string): {email}")
        return False
    
    email = email.strip()
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        logging.warning(f"Invalid email format: {email}")
        return False
    
    SMTP_HOST = os.environ.get('SMTP_HOST', '')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    
    if not SMTP_HOST or not SMTP_EMAIL:
        logging.warning("SMTP not configured, skipping email")
        return False
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="color: #D4AF37; font-size: 24px; font-weight: bold;">CREATIVINDUSTRY</div>
                <p style="color: #888;">PhotoFind - Vos photos vous attendent</p>
            </div>
            <div style="background-color: #111111; border: 1px solid #222222; padding: 40px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin-bottom: 20px;">📸 Merci pour votre achat !</h1>
                <p style="color: #cccccc; line-height: 1.6;">Vous avez acheté {photo_count} photo(s).</p>
                <p style="color: #cccccc; line-height: 1.6;">Cliquez sur le bouton ci-dessous pour télécharger vos photos :</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{download_url}" style="display: inline-block; background-color: #D4AF37; color: #000; padding: 15px 40px; text-decoration: none; font-weight: bold; font-size: 16px;">
                        📥 Télécharger mes photos
                    </a>
                </div>
                
                <p style="color: #888; font-size: 13px;">Ce lien est valable pendant 7 jours.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                <p>© 2024 CREATIVINDUSTRY France - PhotoFind</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"📸 Vos {photo_count} photo(s) sont prêtes - PhotoFind"
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = email
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, email, msg.as_string())
        return True
    except Exception as e:
        logging.error(f"Failed to send purchase email: {str(e)}")
        return False

# ==================== ADMIN ROUTES ====================

@router.post("/admin/photofind/events")
async def create_photofind_event(data: PhotoFindEventCreate, admin: dict = Depends(require_admin)):
    """Create a new PhotoFind event with its own face collection"""
    
    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        raise HTTPException(
            status_code=500, 
            detail="AWS non configuré. Ajoutez AWS_ACCESS_KEY_ID et AWS_SECRET_ACCESS_KEY dans le fichier .env du serveur."
        )
    
    event_id = str(uuid.uuid4())
    collection_id = f"photofind-{event_id[:8]}"
    
    # Create Rekognition collection for this event
    try:
        rekognition = get_rekognition_client()
        rekognition.create_collection(CollectionId=collection_id)
        logging.info(f"Created Rekognition collection: {collection_id}")
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'ResourceAlreadyExistsException':
            pass
        elif error_code == 'AccessDeniedException':
            raise HTTPException(status_code=500, detail="Accès AWS refusé. Vérifiez vos clés AWS et les permissions Rekognition.")
        elif error_code == 'InvalidParameterException':
            raise HTTPException(status_code=500, detail="Erreur de configuration AWS Rekognition.")
        else:
            raise HTTPException(status_code=500, detail=f"Erreur AWS Rekognition: {error_code}")
    except Exception as e:
        logging.error(f"AWS Error: {e}")
        raise HTTPException(status_code=500, detail="Impossible de se connecter à AWS. Vérifiez votre connexion et vos clés.")
    
    # Create event folder
    event_folder = PHOTOFIND_DIR / event_id
    event_folder.mkdir(exist_ok=True)
    
    event = {
        "id": event_id,
        "name": data.name,
        "description": data.description,
        "event_date": data.event_date,
        "collection_id": collection_id,
        "price_per_photo": data.price_per_photo,
        "price_pack_5": data.price_pack_5,
        "price_pack_10": data.price_pack_10,
        "price_all": data.price_all,
        "photos_count": 0,
        "faces_indexed": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"]
    }
    
    await db.photofind_events.insert_one(event)
    
    # Generate QR code for public access
    public_url = f"{SITE_URL}/photofind/{event_id}"
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(public_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    qr_path = event_folder / "qr_code.png"
    qr_img.save(str(qr_path))
    
    event["qr_code_url"] = f"/uploads/photofind/{event_id}/qr_code.png"
    event["public_url"] = public_url
    del event["_id"]
    
    return event

@router.get("/admin/photofind/events")
async def get_photofind_events(admin: dict = Depends(require_admin)):
    """Get all PhotoFind events"""
    events = await db.photofind_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return events

@router.get("/admin/photofind/events/{event_id}")
async def get_photofind_event(event_id: str, admin: dict = Depends(require_admin)):
    """Get a single PhotoFind event with its photos"""
    event = await db.photofind_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Get photos for this event
    photos = await db.photofind_photos.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    event["photos"] = photos
    
    return event

@router.put("/admin/photofind/events/{event_id}")
async def update_photofind_event(event_id: str, data: PhotoFindEventUpdate, admin: dict = Depends(require_admin)):
    """Update a PhotoFind event"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.photofind_events.update_one({"id": event_id}, {"$set": update_data})
    event = await db.photofind_events.find_one({"id": event_id}, {"_id": 0})
    return event

@router.delete("/admin/photofind/events/{event_id}")
async def delete_photofind_event(event_id: str, admin: dict = Depends(require_admin)):
    """Delete a PhotoFind event and its collection"""
    event = await db.photofind_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Delete Rekognition collection
    try:
        rekognition = get_rekognition_client()
        rekognition.delete_collection(CollectionId=event["collection_id"])
    except ClientError as e:
        logging.error(f"Failed to delete collection: {e}")
    
    # Delete photos from database
    await db.photofind_photos.delete_many({"event_id": event_id})
    
    # Delete event
    await db.photofind_events.delete_one({"id": event_id})
    
    return {"message": "Événement supprimé"}

@router.post("/admin/photofind/events/{event_id}/photos")
async def upload_photofind_photos(
    event_id: str,
    files: List[UploadFile] = File(...),
    admin: dict = Depends(require_admin)
):
    """Upload photos to a PhotoFind event and index faces"""
    event = await db.photofind_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    rekognition = get_rekognition_client()
    uploaded_photos = []
    faces_indexed = 0
    
    event_folder = PHOTOFIND_DIR / event_id
    event_folder.mkdir(exist_ok=True)
    
    for file in files:
        photo_id = str(uuid.uuid4())
        filename = f"{photo_id}_{file.filename}"
        filepath = event_folder / filename
        
        # Save file
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        # Index faces in Rekognition
        try:
            response = rekognition.index_faces(
                CollectionId=event["collection_id"],
                Image={'Bytes': content},
                ExternalImageId=photo_id,
                DetectionAttributes=['ALL']
            )
            
            face_count = len(response.get('FaceRecords', []))
            faces_indexed += face_count
            
            photo_doc = {
                "id": photo_id,
                "event_id": event_id,
                "filename": filename,
                "url": f"/uploads/photofind/{event_id}/{filename}",
                "faces_count": face_count,
                "face_ids": [f['Face']['FaceId'] for f in response.get('FaceRecords', [])],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.photofind_photos.insert_one(photo_doc)
            del photo_doc["_id"]
            uploaded_photos.append(photo_doc)
            
        except Exception as e:
            logging.error(f"Failed to index faces for {filename}: {e}")
            # Still save the photo even if face indexing fails
            photo_doc = {
                "id": photo_id,
                "event_id": event_id,
                "filename": filename,
                "url": f"/uploads/photofind/{event_id}/{filename}",
                "faces_count": 0,
                "face_ids": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "indexing_error": str(e)
            }
            await db.photofind_photos.insert_one(photo_doc)
            del photo_doc["_id"]
            uploaded_photos.append(photo_doc)
    
    # Update event stats
    await db.photofind_events.update_one(
        {"id": event_id},
        {
            "$inc": {"photos_count": len(uploaded_photos), "faces_indexed": faces_indexed}
        }
    )
    
    return {
        "uploaded": len(uploaded_photos),
        "faces_indexed": faces_indexed,
        "photos": uploaded_photos
    }

@router.delete("/admin/photofind/photos/{photo_id}")
async def delete_photofind_photo(photo_id: str, admin: dict = Depends(require_admin)):
    """Delete a photo from PhotoFind"""
    photo = await db.photofind_photos.find_one({"id": photo_id})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    event = await db.photofind_events.find_one({"id": photo["event_id"]})
    
    # Delete faces from Rekognition
    if photo.get("face_ids") and event:
        try:
            rekognition = get_rekognition_client()
            rekognition.delete_faces(
                CollectionId=event["collection_id"],
                FaceIds=photo["face_ids"]
            )
        except Exception as e:
            logging.error(f"Failed to delete faces: {e}")
    
    # Delete file
    filepath = PHOTOFIND_DIR / photo["event_id"] / photo["filename"]
    if filepath.exists():
        filepath.unlink()
    
    # Delete from database
    await db.photofind_photos.delete_one({"id": photo_id})
    
    # Update event stats
    if event:
        await db.photofind_events.update_one(
            {"id": photo["event_id"]},
            {"$inc": {"photos_count": -1, "faces_indexed": -photo.get("faces_count", 0)}}
        )
    
    return {"message": "Photo supprimée"}

@router.get("/admin/photofind/purchases")
async def get_photofind_purchases(admin: dict = Depends(require_admin)):
    """Get all PhotoFind purchases"""
    purchases = await db.photofind_purchases.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return purchases

@router.put("/admin/photofind/purchases/{purchase_id}/confirm")
async def confirm_photofind_purchase(purchase_id: str, admin: dict = Depends(require_admin)):
    """Confirm a pending purchase and send download link"""
    purchase = await db.photofind_purchases.find_one({"id": purchase_id})
    if not purchase:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    if purchase["status"] == "completed":
        return {"message": "Achat déjà confirmé", "download_url": purchase.get("download_url")}
    
    # Generate download token
    download_token = str(uuid.uuid4())
    download_url = f"{SITE_URL}/photofind/download/{purchase_id}?token={download_token}"
    
    await db.photofind_purchases.update_one(
        {"id": purchase_id},
        {
            "$set": {
                "status": "completed",
                "download_token": download_token,
                "download_url": download_url,
                "confirmed_at": datetime.now(timezone.utc).isoformat(),
                "confirmed_by": admin["id"]
            }
        }
    )
    
    # Send email with download link
    try:
        send_purchase_email(
            email=purchase["email"],
            download_url=download_url,
            photo_count=len(purchase["photo_ids"])
        )
    except Exception as e:
        logging.error(f"Failed to send purchase email: {e}")
    
    return {"message": "Achat confirmé", "download_url": download_url}

@router.get("/admin/photofind/events/{event_id}/frames")
async def get_event_frames(event_id: str, admin: dict = Depends(require_admin)):
    """Get custom frames for an event"""
    event = await db.photofind_events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    return {"frames": event.get("custom_frames", [])}

@router.post("/admin/photofind/events/{event_id}/frames")
async def add_event_frame(
    event_id: str,
    file: UploadFile = File(...),
    name: str = Form(...),
    admin: dict = Depends(require_admin)
):
    """Add a custom frame to an event"""
    event = await db.photofind_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    frame_id = str(uuid.uuid4())
    filename = f"frame_{frame_id}_{file.filename}"
    
    event_folder = PHOTOFIND_DIR / event_id / "frames"
    event_folder.mkdir(parents=True, exist_ok=True)
    
    filepath = event_folder / filename
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    frame_doc = {
        "id": frame_id,
        "name": name,
        "url": f"/uploads/photofind/{event_id}/frames/{filename}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_events.update_one(
        {"id": event_id},
        {"$push": {"custom_frames": frame_doc}}
    )
    
    return frame_doc

@router.delete("/admin/photofind/events/{event_id}/frames/{frame_id}")
async def delete_event_frame(event_id: str, frame_id: str, admin: dict = Depends(require_admin)):
    """Delete a custom frame"""
    await db.photofind_events.update_one(
        {"id": event_id},
        {"$pull": {"custom_frames": {"id": frame_id}}}
    )
    return {"success": True}

@router.put("/admin/photofind/events/{event_id}/pricing")
async def update_event_pricing(event_id: str, data: dict = Body(...), admin: dict = Depends(require_admin)):
    """Update pricing for a PhotoFind event"""
    event = await db.photofind_events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    pricing = data.get("pricing", {})
    await db.photofind_events.update_one(
        {"id": event_id},
        {"$set": {"pricing": pricing}}
    )
    
    updated_event = await db.photofind_events.find_one({"id": event_id}, {"_id": 0})
    return {"success": True, "pricing": updated_event.get("pricing", {})}

@router.get("/admin/photofind/events/{event_id}/kiosk-stats")
async def get_kiosk_stats(event_id: str, admin: dict = Depends(require_admin)):
    """Get kiosk statistics for an event"""
    purchases = await db.photofind_kiosk_purchases.find(
        {"event_id": event_id}, {"_id": 0}
    ).to_list(1000)
    
    prints = await db.photofind_print_logs.find(
        {"event_id": event_id}, {"_id": 0}
    ).to_list(1000)
    
    total_revenue = sum(p.get("amount", 0) for p in purchases)
    total_photos_sold = sum(len(p.get("photo_ids", [])) for p in purchases)
    total_printed = sum(p.get("count", 0) for p in prints)
    
    return {
        "total_purchases": len(purchases),
        "total_revenue": total_revenue,
        "total_photos_sold": total_photos_sold,
        "total_printed": total_printed,
        "recent_purchases": purchases[:10],
        "recent_prints": prints[:10]
    }

# ==================== PUBLIC ROUTES ====================

@router.get("/public/stripe-config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {"publishable_key": STRIPE_PUBLIC_KEY}

@router.get("/public/photofind/{event_id}")
async def get_public_event(event_id: str):
    """Get public event info for kiosk display"""
    event = await db.photofind_events.find_one(
        {"id": event_id, "is_active": True},
        {"_id": 0, "collection_id": 0, "created_by": 0}
    )
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé ou inactif")
    return event

@router.post("/public/photofind/{event_id}/search")
async def search_photos_by_face(event_id: str, file: UploadFile = File(...)):
    """Search for photos containing a face using AWS Rekognition"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé ou inactif")
    
    content = await file.read()
    
    try:
        rekognition = get_rekognition_client()
        response = rekognition.search_faces_by_image(
            CollectionId=event["collection_id"],
            Image={'Bytes': content},
            MaxFaces=100,
            FaceMatchThreshold=70
        )
        
        matched_photo_ids = set()
        for match in response.get('FaceMatches', []):
            external_id = match['Face'].get('ExternalImageId')
            if external_id:
                matched_photo_ids.add(external_id)
        
        if not matched_photo_ids:
            return {"photos": [], "message": "Aucune photo trouvée avec ce visage"}
        
        photos = await db.photofind_photos.find(
            {"id": {"$in": list(matched_photo_ids)}},
            {"_id": 0}
        ).to_list(100)
        
        return {"photos": photos, "count": len(photos)}
        
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == 'InvalidParameterException':
            return {"photos": [], "message": "Aucun visage détecté dans l'image"}
        raise HTTPException(status_code=500, detail=f"Erreur de recherche: {error_code}")
    except Exception as e:
        logging.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la recherche")

@router.post("/public/photofind/{event_id}/purchase")
async def create_photofind_purchase(event_id: str, data: dict = Body(...)):
    """Create a purchase request"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    photo_ids = data.get("photo_ids", [])
    email = data.get("email")
    
    if not photo_ids or not email:
        raise HTTPException(status_code=400, detail="photo_ids et email requis")
    
    # Calculate price
    count = len(photo_ids)
    if count >= 10:
        price = event.get("price_all", 50.0)
    elif count >= 5:
        price = event.get("price_pack_5", 20.0)
    else:
        price = count * event.get("price_per_photo", 5.0)
    
    purchase_id = str(uuid.uuid4())
    purchase = {
        "id": purchase_id,
        "event_id": event_id,
        "photo_ids": photo_ids,
        "email": email,
        "amount": price,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_purchases.insert_one(purchase)
    del purchase["_id"]
    
    return purchase

@router.get("/public/photofind/download/{purchase_id}")
async def download_purchased_photos(purchase_id: str, token: str):
    """Download purchased photos - returns info for the download page"""
    # Check in photofind_purchases first
    purchase = await db.photofind_purchases.find_one({
        "id": purchase_id,
        "download_token": token
    })
    
    # Also check kiosk_purchases if not found
    if not purchase:
        purchase = await db.photofind_kiosk_purchases.find_one({
            "id": purchase_id,
            "download_token": token
        })
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Achat non trouvé ou lien invalide")
    
    # Get event info
    event = await db.photofind_events.find_one({"id": purchase["event_id"]})
    event_name = event.get("name", "PhotoFind") if event else "PhotoFind"
    
    # Build photo list with URLs
    photo_list = []
    for photo_id in purchase.get("photo_ids", []):
        # Check if it's an uploaded photo
        if photo_id.startswith("upload_"):
            # Uploaded photo - get from session or directly use the stored URL
            session_id = photo_id.replace("upload_", "")
            session = await db.photofind_upload_sessions.find_one({"session_id": session_id})
            if session and session.get("photo_url"):
                photo_list.append({
                    "id": photo_id,
                    "filename": session.get("photo_filename", f"photo_{session_id}.jpg"),
                    "url": session["photo_url"]
                })
        else:
            # Regular photo from event
            photo = await db.photofind_photos.find_one({"id": photo_id})
            if photo:
                photo_list.append({
                    "id": photo["id"],
                    "filename": photo["filename"],
                    "url": photo.get("url") or f"/uploads/photofind/{purchase['event_id']}/{photo['filename']}"
                })
    
    # Determine actual payment status
    # If payment_method is "kiosk", "pay_later", "email", or "pending" and no paid_at, it's not paid
    payment_method = purchase.get("payment_method", "")
    paid_at = purchase.get("paid_at")
    
    # Consider as paid only if:
    # 1. Has paid_at timestamp OR
    # 2. payment_method is one of the actual payment methods (stripe, paypal, cash with confirmation)
    actual_paid_methods = ["stripe", "paypal", "cash_confirmed", "card"]
    
    if paid_at or payment_method in actual_paid_methods:
        effective_status = "completed"
    else:
        effective_status = "pending"
    
    return {
        "purchase_id": purchase_id,
        "event_name": event_name,
        "photo_count": len(photo_list),
        "photos": photo_list,
        "amount": purchase.get("amount", 0),
        "created_at": purchase.get("created_at"),
        "status": effective_status,
        "payment_method": payment_method
    }

@router.get("/public/photofind/download/{purchase_id}/zip")
async def download_photos_as_zip(purchase_id: str, token: str):
    """Download all purchased photos as a zip file"""
    purchase = await db.photofind_purchases.find_one({
        "id": purchase_id,
        "download_token": token
    })
    
    if not purchase:
        # Also check kiosk purchases
        purchase = await db.photofind_kiosk_purchases.find_one({
            "id": purchase_id,
            "download_token": token
        })
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Achat non trouvé ou lien invalide")
    
    # Check if payment is actually completed
    payment_method = purchase.get("payment_method", "")
    paid_at = purchase.get("paid_at")
    actual_paid_methods = ["stripe", "paypal", "cash_confirmed", "card"]
    
    if not paid_at and payment_method not in actual_paid_methods:
        raise HTTPException(status_code=402, detail="Paiement requis avant téléchargement")
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for photo_id in purchase.get("photo_ids", []):
            # Check if it's an uploaded photo
            if photo_id.startswith("upload_"):
                session_id = photo_id.replace("upload_", "")
                session = await db.photofind_upload_sessions.find_one({"session_id": session_id})
                if session and session.get("photo_filename"):
                    # Uploaded photos are in the uploads subfolder
                    filepath = PHOTOFIND_DIR / purchase["event_id"] / "uploads" / session["photo_filename"]
                    if filepath.exists():
                        zf.write(filepath, session["photo_filename"])
            else:
                # Regular photo
                photo = await db.photofind_photos.find_one({"id": photo_id})
                if photo:
                    filepath = PHOTOFIND_DIR / purchase["event_id"] / photo["filename"]
                    if filepath.exists():
                        zf.write(filepath, photo["filename"])
    
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=photofind_{purchase_id[:8]}.zip"}
    )


# ==================== DOWNLOAD PAGE PAYMENT ENDPOINTS ====================

@router.post("/public/photofind/download/{purchase_id}/create-payment")
async def create_download_payment(purchase_id: str, data: dict = Body(...)):
    """Create a payment for a pending purchase from the download page"""
    token = data.get("token")
    payment_method_req = data.get("payment_method")
    return_url = data.get("return_url")
    
    # Find the purchase
    purchase = await db.photofind_purchases.find_one({
        "id": purchase_id,
        "download_token": token
    })
    
    if not purchase:
        purchase = await db.photofind_kiosk_purchases.find_one({
            "id": purchase_id,
            "download_token": token
        })
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    # Check if already actually paid (same logic as download info)
    stored_payment_method = purchase.get("payment_method", "")
    paid_at = purchase.get("paid_at")
    actual_paid_methods = ["stripe", "paypal", "cash_confirmed", "card"]
    
    if paid_at or stored_payment_method in actual_paid_methods:
        raise HTTPException(status_code=400, detail="Cet achat a déjà été payé")
    
    amount = purchase.get("amount", 0)
    
    if payment_method_req == "stripe":
        # Create Stripe payment intent
        import stripe
        stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
        
        if not stripe.api_key:
            raise HTTPException(status_code=500, detail="Configuration Stripe manquante")
        
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Stripe uses cents
            currency="eur",
            metadata={
                "purchase_id": purchase_id,
                "type": "photofind_download"
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
        
    elif payment_method_req == "paypal":
        # Create PayPal order
        paypal_client_id = os.environ.get("PAYPAL_CLIENT_ID")
        paypal_secret = os.environ.get("PAYPAL_SECRET")
        
        if not paypal_client_id or not paypal_secret:
            raise HTTPException(status_code=500, detail="Configuration PayPal manquante")
        
        # Get access token
        auth_response = requests.post(
            "https://api-m.paypal.com/v1/oauth2/token",
            auth=(paypal_client_id, paypal_secret),
            data={"grant_type": "client_credentials"}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=500, detail="Erreur authentification PayPal")
        
        access_token = auth_response.json()["access_token"]
        
        # Create order
        order_response = requests.post(
            "https://api-m.paypal.com/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": "EUR",
                        "value": str(amount)
                    },
                    "description": "PhotoFind - Téléchargement photos"
                }],
                "application_context": {
                    "return_url": f"{return_url}&paypal_order_id={{order_id}}".replace("{order_id}", ""),
                    "cancel_url": return_url
                }
            }
        )
        
        if order_response.status_code != 201:
            raise HTTPException(status_code=500, detail="Erreur création commande PayPal")
        
        order_data = order_response.json()
        
        # Get approval URL
        approval_url = None
        for link in order_data.get("links", []):
            if link.get("rel") == "approve":
                approval_url = link.get("href")
                break
        
        # Add order_id to return URL
        if approval_url:
            # Store PayPal order ID in purchase
            collection = db.photofind_purchases if await db.photofind_purchases.find_one({"id": purchase_id}) else db.photofind_kiosk_purchases
            await collection.update_one(
                {"id": purchase_id},
                {"$set": {"paypal_order_id": order_data["id"]}}
            )
        
        return {
            "order_id": order_data["id"],
            "approval_url": approval_url
        }
    
    raise HTTPException(status_code=400, detail="Méthode de paiement non supportée")

@router.post("/public/photofind/download/{purchase_id}/confirm-payment")
async def confirm_download_payment(purchase_id: str, data: dict = Body(...)):
    """Confirm payment for a purchase from the download page"""
    token = data.get("token")
    payment_id = data.get("payment_id")
    payment_method = data.get("payment_method")
    
    # Find the purchase
    purchase = await db.photofind_purchases.find_one({
        "id": purchase_id,
        "download_token": token
    })
    collection = db.photofind_purchases
    
    if not purchase:
        purchase = await db.photofind_kiosk_purchases.find_one({
            "id": purchase_id,
            "download_token": token
        })
        collection = db.photofind_kiosk_purchases
    
    if not purchase:
        raise HTTPException(status_code=404, detail="Achat non trouvé")
    
    if payment_method == "paypal":
        # Capture PayPal payment
        paypal_client_id = os.environ.get("PAYPAL_CLIENT_ID")
        paypal_secret = os.environ.get("PAYPAL_SECRET")
        
        # Get access token
        auth_response = requests.post(
            "https://api-m.paypal.com/v1/oauth2/token",
            auth=(paypal_client_id, paypal_secret),
            data={"grant_type": "client_credentials"}
        )
        
        if auth_response.status_code == 200:
            access_token = auth_response.json()["access_token"]
            
            # Capture order
            capture_response = requests.post(
                f"https://api-m.paypal.com/v2/checkout/orders/{payment_id}/capture",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
            )
            
            if capture_response.status_code not in [200, 201]:
                logging.error(f"PayPal capture error: {capture_response.text}")
                raise HTTPException(status_code=500, detail="Erreur capture PayPal")
    
    # Update purchase status to completed
    await collection.update_one(
        {"id": purchase_id},
        {"$set": {
            "status": "completed",
            "paid_at": datetime.now(timezone.utc).isoformat(),
            "payment_id": payment_id,
            "payment_method": payment_method
        }}
    )
    
    # Send email with download link if email exists
    if purchase.get("email") and purchase.get("download_url"):
        try:
            send_purchase_email(
                email=purchase["email"],
                download_url=purchase["download_url"],
                photo_count=len(purchase.get("photo_ids", []))
            )
        except Exception as e:
            logging.error(f"Failed to send confirmation email: {e}")
    
    return {"success": True, "message": "Paiement confirmé"}


@router.get("/public/photofind/{event_id}/photo/{photo_id}")
async def get_photo(event_id: str, photo_id: str):
    """Get a single photo for preview"""
    photo = await db.photofind_photos.find_one({"id": photo_id, "event_id": event_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    filepath = PHOTOFIND_DIR / event_id / photo["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(filepath, media_type="image/jpeg")

@router.post("/public/photofind/{event_id}/kiosk-purchase")
async def create_kiosk_purchase(event_id: str, data: KioskPurchaseData):
    """Create a kiosk purchase (cash or card on-site)"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    purchase_id = str(uuid.uuid4())
    download_token = str(uuid.uuid4())
    download_url = f"{SITE_URL}/photofind/download/{purchase_id}?token={download_token}"
    
    # Status depends on payment method
    # "pay_later" or "email" = pending (needs to pay on download page)
    # "cash", "stripe", "paypal" = completed (already paid)
    is_pay_later = data.payment_method in ["pay_later", "email", "pending"]
    status = "pending" if is_pay_later else "completed"
    
    purchase = {
        "id": purchase_id,
        "event_id": event_id,
        "photo_ids": data.photo_ids,
        "email": data.email,
        "payment_method": data.payment_method,
        "amount": data.amount,
        "format": data.format,
        "frame_id": data.frame_id,
        "download_token": download_token,
        "download_url": download_url,
        "status": status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_kiosk_purchases.insert_one(purchase)
    
    # Send email with download link (for pay later, they will pay on the download page)
    try:
        send_purchase_email(
            email=data.email,
            download_url=download_url,
            photo_count=len(data.photo_ids)
        )
    except Exception as e:
        logging.error(f"Failed to send kiosk purchase email: {e}")
    
    del purchase["_id"]
    return purchase

# ==================== CASH PAYMENT CODE VERIFICATION ====================

import random

@router.post("/public/photofind/{event_id}/request-cash-code")
async def request_cash_payment_code(event_id: str, data: dict = Body(...)):
    """Generate a verification code for cash payment - displayed to admin"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    # Generate a 4-digit code
    code = str(random.randint(1000, 9999))
    request_id = str(uuid.uuid4())
    
    cash_request = {
        "id": request_id,
        "event_id": event_id,
        "code": code,
        "photo_ids": data.get("photo_ids", []),
        "amount": data.get("amount", 0),
        "photo_count": len(data.get("photo_ids", [])),
        "print_format": data.get("print_format", "10x15"),
        "delivery_method": data.get("delivery_method", "print"),
        "status": "pending",  # pending, validated, expired
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_cash_codes.insert_one(cash_request)
    
    return {"request_id": request_id, "message": "Code généré - demandez le code au photographe"}

@router.post("/public/photofind/{event_id}/validate-cash-code")
async def validate_cash_payment_code(event_id: str, data: dict = Body(...)):
    """Validate the cash payment code entered by client"""
    code = data.get("code", "")
    request_id = data.get("request_id", "")
    
    if not code or not request_id:
        raise HTTPException(status_code=400, detail="Code et request_id requis")
    
    # Find the pending cash request
    cash_request = await db.photofind_cash_codes.find_one({
        "id": request_id,
        "event_id": event_id,
        "status": "pending"
    })
    
    if not cash_request:
        raise HTTPException(status_code=404, detail="Demande non trouvée ou expirée")
    
    if cash_request["code"] != code:
        return {"valid": False, "message": "Code incorrect"}
    
    # Mark as validated
    await db.photofind_cash_codes.update_one(
        {"id": request_id},
        {"$set": {"status": "validated", "validated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create the actual purchase record
    purchase_id = str(uuid.uuid4())
    download_token = str(uuid.uuid4())
    download_url = f"{SITE_URL}/photofind/download/{purchase_id}?token={download_token}"
    
    purchase = {
        "id": purchase_id,
        "event_id": event_id,
        "photo_ids": cash_request["photo_ids"],
        "email": "cash@kiosk.local",
        "payment_method": "cash",
        "amount": cash_request["amount"],
        "format": "print",
        "print_format": cash_request.get("print_format", "10x15"),
        "download_token": download_token,
        "download_url": download_url,
        "status": "completed",
        "cash_code": code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_kiosk_purchases.insert_one(purchase)
    
    return {"valid": True, "message": "Code validé - impression autorisée", "purchase_id": purchase_id}

@router.post("/public/photofind/{event_id}/validate-cash-code-mobile")
async def validate_cash_payment_code_mobile(event_id: str, data: dict = Body(...)):
    """Validate cash code from mobile and create remote print order"""
    code = data.get("code", "")
    request_id = data.get("request_id", "")
    delivery_info = data.get("delivery_info", {})
    email = data.get("email")
    
    if not code or not request_id:
        raise HTTPException(status_code=400, detail="Code et request_id requis")
    
    cash_request = await db.photofind_cash_codes.find_one({
        "id": request_id,
        "event_id": event_id,
        "status": "pending"
    })
    
    if not cash_request:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    
    if cash_request["code"] != code:
        return {"valid": False, "message": "Code incorrect"}
    
    # Mark as validated
    await db.photofind_cash_codes.update_one(
        {"id": request_id},
        {"$set": {"status": "validated"}}
    )
    
    # Create remote print order
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "event_id": event_id,
        "photo_ids": cash_request.get("photo_ids", []),
        "amount": cash_request.get("amount", 0),
        "payment_method": "cash",
        "cash_code": code,
        "delivery_method": cash_request.get("delivery_method", "print"),
        "delivery_info": delivery_info,
        "email": email,
        "status": "pending_print",  # pending_print, printing, delivered
        "source": "mobile",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_remote_orders.insert_one(order)
    
    return {"valid": True, "message": "Commande créée", "order_id": order_id}

@router.post("/public/photofind/{event_id}/remote-print-order")
async def create_remote_print_order(event_id: str, data: dict = Body(...)):
    """Create a remote print order from mobile"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "event_id": event_id,
        "photo_ids": data.get("photo_ids", []),
        "amount": data.get("amount", 0),
        "payment_method": data.get("payment_method", "unknown"),
        "payment_id": data.get("payment_id"),
        "delivery_method": data.get("delivery_method", "print"),
        "delivery_info": data.get("delivery_info", {}),
        "email": data.get("email"),
        "status": "pending_print",
        "source": "mobile",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_remote_orders.insert_one(order)
    
    return {"success": True, "order_id": order_id}

@router.get("/admin/photofind/events/{event_id}/remote-orders")
async def get_remote_orders(event_id: str, admin: dict = Depends(require_admin)):
    """Get pending remote print orders for admin"""
    orders = await db.photofind_remote_orders.find(
        {"event_id": event_id, "status": {"$in": ["pending_print", "printing"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"orders": orders}

@router.put("/admin/photofind/remote-orders/{order_id}/status")
async def update_remote_order_status(order_id: str, data: dict = Body(...), admin: dict = Depends(require_admin)):
    """Update remote order status (printing, delivered)"""
    new_status = data.get("status", "delivered")
    
    await db.photofind_remote_orders.update_one(
        {"id": order_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@router.get("/admin/photofind/events/{event_id}/pending-cash-codes")
async def get_pending_cash_codes(event_id: str, admin: dict = Depends(require_admin)):
    """Get pending cash payment codes for admin to see"""
    codes = await db.photofind_cash_codes.find(
        {"event_id": event_id, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"pending_codes": codes}

@router.delete("/admin/photofind/cash-codes/{code_id}")
async def delete_cash_code(code_id: str, admin: dict = Depends(require_admin)):
    """Delete/expire a cash code"""
    await db.photofind_cash_codes.update_one(
        {"id": code_id},
        {"$set": {"status": "expired"}}
    )
    return {"success": True}

@router.post("/public/photofind/{event_id}/log-print")
async def log_kiosk_print(event_id: str, data: KioskPrintLog):
    """Log a print from the kiosk"""
    log_entry = {
        "id": str(uuid.uuid4()),
        "event_id": event_id,
        "photo_ids": data.photo_ids,
        "format": data.format,
        "frame_id": data.frame_id,
        "count": len(data.photo_ids),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_print_logs.insert_one(log_entry)
    del log_entry["_id"]
    
    return log_entry

@router.get("/public/photofind/{event_id}/frames")
async def get_public_event_frames(event_id: str):
    """Get custom frames for kiosk display"""
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        return {"frames": []}
    return {"frames": event.get("custom_frames", [])}

# ==================== PAYPAL ROUTES ====================

@router.post("/public/photofind/{event_id}/create-paypal-order")
async def create_paypal_order(event_id: str, data: KioskPayPalOrderRequest):
    """Create a PayPal order for kiosk payment"""
    import requests
    
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PayPal non configuré")
    
    # Get PayPal access token
    auth_response = requests.post(
        "https://api-m.paypal.com/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"}
    )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur authentification PayPal")
    
    access_token = auth_response.json()["access_token"]
    
    # Create order with application context for redirect
    order_payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "amount": {
                "currency_code": "EUR",
                "value": str(data.amount)
            },
            "description": f"PhotoFind - {len(data.photo_ids)} photo(s)"
        }]
    }
    
    # Add application context for mobile redirect
    if data.return_url:
        order_payload["application_context"] = {
            "return_url": data.return_url,
            "cancel_url": data.return_url,
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW"
        }
    
    order_response = requests.post(
        "https://api-m.paypal.com/v2/checkout/orders",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        },
        json=order_payload
    )
    
    if order_response.status_code != 201:
        logging.error(f"PayPal order creation error: {order_response.text}")
        raise HTTPException(status_code=500, detail="Erreur création commande PayPal")
    
    order_data = order_response.json()
    
    # Get approval URL
    approval_url = None
    for link in order_data.get("links", []):
        if link.get("rel") == "approve":
            approval_url = link.get("href")
            break
    
    # Store pending order
    pending_order = {
        "id": str(uuid.uuid4()),
        "paypal_order_id": order_data["id"],
        "event_id": event_id,
        "photo_ids": data.photo_ids,
        "email": data.email,
        "amount": data.amount,
        "format": data.format,
        "frame_id": data.frame_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_pending_orders.insert_one(pending_order)
    
    return {
        "order_id": order_data["id"],
        "approval_url": approval_url
    }

@router.get("/public/photofind/{event_id}/check-payment/{order_id}")
async def check_paypal_payment(event_id: str, order_id: str):
    """Check PayPal payment status"""
    import requests
    
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PayPal non configuré")
    
    auth_response = requests.post(
        "https://api-m.paypal.com/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"}
    )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur authentification PayPal")
    
    access_token = auth_response.json()["access_token"]
    
    order_response = requests.get(
        f"https://api-m.paypal.com/v2/checkout/orders/{order_id}",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if order_response.status_code != 200:
        return {"status": "error", "message": "Commande non trouvée"}
    
    order_data = order_response.json()
    return {"status": order_data.get("status", "UNKNOWN")}

@router.post("/public/photofind/{event_id}/capture-paypal-order")
async def capture_paypal_order(event_id: str, data: KioskCapturePayPalRequest):
    """Capture a PayPal order after approval"""
    import requests
    
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="PayPal non configuré")
    
    auth_response = requests.post(
        "https://api-m.paypal.com/v1/oauth2/token",
        auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
        data={"grant_type": "client_credentials"}
    )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=500, detail="Erreur authentification PayPal")
    
    access_token = auth_response.json()["access_token"]
    
    capture_response = requests.post(
        f"https://api-m.paypal.com/v2/checkout/orders/{data.order_id}/capture",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
    )
    
    if capture_response.status_code != 201:
        raise HTTPException(status_code=500, detail="Erreur capture paiement PayPal")
    
    # Create completed purchase
    purchase_id = str(uuid.uuid4())
    download_token = str(uuid.uuid4())
    download_url = f"{SITE_URL}/photofind/download/{purchase_id}?token={download_token}"
    
    purchase = {
        "id": purchase_id,
        "event_id": event_id,
        "photo_ids": data.photo_ids,
        "email": data.email,
        "payment_method": "paypal",
        "paypal_order_id": data.order_id,
        "amount": data.amount,
        "format": data.format,
        "frame_id": data.frame_id,
        "download_token": download_token,
        "download_url": download_url,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.photofind_kiosk_purchases.insert_one(purchase)
    
    # Update pending order
    await db.photofind_pending_orders.update_one(
        {"paypal_order_id": data.order_id},
        {"$set": {"status": "completed", "purchase_id": purchase_id}}
    )
    
    # Send email
    try:
        send_purchase_email(data.email, download_url, len(data.photo_ids))
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
    
    del purchase["_id"]
    return purchase

# ==================== STRIPE ROUTES ====================

@router.post("/public/photofind/{event_id}/create-stripe-payment")
async def create_stripe_payment(event_id: str, data: KioskStripePaymentIntent):
    """Create a Stripe payment intent for kiosk"""
    import stripe
    
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = STRIPE_SECRET_KEY
    
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(data.amount * 100),  # Convert to cents
            currency="eur",
            metadata={
                "event_id": event_id,
                "photo_ids": ",".join(data.photo_ids),
                "email": data.email,
                "format": data.format or "digital",
                "frame_id": data.frame_id or ""
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "payment_intent_id": intent.id
        }
    except Exception as e:
        logging.error(f"Stripe error: {e}")
        raise HTTPException(status_code=500, detail="Erreur Stripe")

@router.post("/public/photofind/{event_id}/confirm-stripe-payment")
async def confirm_stripe_payment(event_id: str, data: dict = Body(...)):
    """Confirm Stripe payment and create purchase"""
    import stripe
    
    payment_intent_id = data.get("payment_intent_id")
    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="payment_intent_id requis")
    
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = STRIPE_SECRET_KEY
    
    try:
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            raise HTTPException(status_code=400, detail="Paiement non confirmé")
        
        metadata = intent.metadata
        photo_ids = metadata.get("photo_ids", "").split(",")
        email = metadata.get("email", "")
        
        # Create purchase
        purchase_id = str(uuid.uuid4())
        download_token = str(uuid.uuid4())
        download_url = f"{SITE_URL}/photofind/download/{purchase_id}?token={download_token}"
        
        purchase = {
            "id": purchase_id,
            "event_id": event_id,
            "photo_ids": photo_ids,
            "email": email,
            "payment_method": "stripe",
            "stripe_payment_intent_id": payment_intent_id,
            "amount": intent.amount / 100,
            "format": metadata.get("format", "digital"),
            "frame_id": metadata.get("frame_id"),
            "download_token": download_token,
            "download_url": download_url,
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.photofind_kiosk_purchases.insert_one(purchase)
        
        # Send email (log detailed info for debugging)
        logging.info(f"Stripe payment confirmed - attempting to send email to: '{email}' for {len(photo_ids)} photos")
        try:
            email_sent = send_purchase_email(email, download_url, len(photo_ids))
            if not email_sent:
                logging.warning(f"Email not sent (validation failed or SMTP issue) for email: '{email}'")
        except Exception as e:
            logging.error(f"Failed to send email: {e}")
        
        del purchase["_id"]
        # Add success field for frontend compatibility
        purchase["success"] = True
        return purchase
        
    except HTTPException:
        # Re-raise HTTPException as-is (don't wrap in 500)
        raise
    except stripe.error.InvalidRequestError as e:
        # Invalid payment intent ID
        logging.error(f"Stripe invalid request error: {e}")
        raise HTTPException(status_code=400, detail="Payment intent invalide")
    except Exception as e:
        logging.error(f"Stripe confirmation error: {e}")
        raise HTTPException(status_code=500, detail="Erreur confirmation paiement")


# ==================== UPLOAD & PRINT FROM PHONE ====================

@router.post("/public/photofind/{event_id}/create-upload-session")
async def create_upload_session(event_id: str):
    """
    Crée une session d'upload pour permettre à un client d'envoyer une photo depuis son téléphone.
    La borne affiche un QR code avec cette session.
    """
    event = await db.photofind_events.find_one({"id": event_id, "is_active": True})
    if not event:
        raise HTTPException(status_code=404, detail="Événement non trouvé")
    
    session_id = str(uuid.uuid4())[:8].upper()  # Code court facile à lire
    now = datetime.now(timezone.utc)
    
    # Add 30 minutes using timedelta
    expires = now + timedelta(minutes=30)
    
    session = {
        "session_id": session_id,
        "event_id": event_id,
        "status": "waiting",  # waiting, uploaded, printing, completed
        "photo_url": None,
        "photo_filename": None,
        "created_at": now.isoformat(),
        "expires_at": expires.isoformat()
    }
    
    await db.photofind_upload_sessions.insert_one(session)
    
    # Générer l'URL pour le mobile
    upload_url = f"{SITE_URL}/upload-print/{event_id}/{session_id}"
    
    return {
        "session_id": session_id,
        "upload_url": upload_url,
        "expires_in_minutes": 30
    }

@router.get("/public/photofind/{event_id}/upload-session/{session_id}")
async def get_upload_session(event_id: str, session_id: str):
    """
    Vérifie le statut d'une session d'upload (polling depuis la borne)
    """
    session = await db.photofind_upload_sessions.find_one({
        "session_id": session_id,
        "event_id": event_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Vérifier expiration
    expires_at = datetime.fromisoformat(session["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        return {"status": "expired", "session_id": session_id}
    
    return {
        "session_id": session["session_id"],
        "status": session["status"],
        "photo_url": session.get("photo_url"),
        "created_at": session["created_at"]
    }

@router.post("/public/photofind/{event_id}/upload-session/{session_id}/upload")
async def upload_photo_to_session(
    event_id: str, 
    session_id: str,
    file: UploadFile = File(...)
):
    """
    Upload une photo depuis le téléphone vers une session
    """
    session = await db.photofind_upload_sessions.find_one({
        "session_id": session_id,
        "event_id": event_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    # Vérifier expiration
    expires_at = datetime.fromisoformat(session["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Session expirée")
    
    if session["status"] != "waiting":
        raise HTTPException(status_code=400, detail="Une photo a déjà été uploadée")
    
    # Vérifier le type de fichier
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Fichier image requis")
    
    # Sauvegarder le fichier
    upload_dir = PHOTOFIND_DIR / event_id / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"upload_{session_id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = upload_dir / filename
    
    content = await file.read()
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # URL de la photo (sans /api car les fichiers statiques sont montés sur /uploads)
    photo_url = f"/uploads/photofind/{event_id}/uploads/{filename}"
    
    # Mettre à jour la session
    await db.photofind_upload_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "uploaded",
            "photo_url": photo_url,
            "photo_filename": filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": "Photo uploadée avec succès",
        "photo_url": photo_url
    }

@router.post("/public/photofind/{event_id}/upload-session/{session_id}/complete")
async def complete_upload_session(event_id: str, session_id: str, data: dict = Body(...)):
    """
    Marque une session comme terminée (après impression)
    """
    session = await db.photofind_upload_sessions.find_one({
        "session_id": session_id,
        "event_id": event_id
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    status = data.get("status", "completed")
    
    await db.photofind_upload_sessions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "status": status}

@router.delete("/public/photofind/{event_id}/upload-session/{session_id}")
async def cancel_upload_session(event_id: str, session_id: str):
    """
    Annule une session d'upload
    """
    result = await db.photofind_upload_sessions.delete_one({
        "session_id": session_id,
        "event_id": event_id
    })
    
    return {"success": result.deleted_count > 0}
