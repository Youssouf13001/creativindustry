"""
Routes pour la gestion des Galeries photos clients
Refactorisé depuis server.py - Mars 2026
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from pathlib import Path
import uuid
import logging
import os
import io
import zipfile
import qrcode
from motor.motor_asyncio import AsyncIOMotorClient
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

security = HTTPBearer()

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Database connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Uploads directory
ROOT_DIR = Path(__file__).parent.parent
UPLOADS_DIR = ROOT_DIR / "uploads"
GALLERIES_DIR = UPLOADS_DIR / "galleries"
GALLERIES_DIR.mkdir(parents=True, exist_ok=True)

# Router
router = APIRouter(tags=["Galleries"])

# ==================== MODELS ====================

class GalleryPhoto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    thumbnail_url: Optional[str] = None
    filename: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Gallery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    name: str
    description: Optional[str] = None
    photos: List[dict] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class GalleryCreate(BaseModel):
    client_id: str
    name: str
    description: Optional[str] = None

class PhotoSelection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    gallery_id: str
    selected_photo_ids: List[str] = []
    is_validated: bool = False
    validated_at: Optional[datetime] = None

# ==================== AUTH DEPENDENCIES ====================

_get_current_admin = None
_get_current_client = None

def set_admin_dependency(func):
    global _get_current_admin
    _get_current_admin = func

def set_client_dependency(func):
    global _get_current_client
    _get_current_client = func

async def get_client_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper for client authentication"""
    if _get_current_client is None:
        raise HTTPException(status_code=500, detail="Client auth not configured")
    return await _get_current_client(credentials)

async def get_admin_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper for admin authentication"""
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Admin auth not configured")
    return await _get_current_admin(credentials)

# ==================== EMAIL FUNCTIONS ====================

def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    if not SMTP_HOST or not SMTP_EMAIL:
        logging.warning("SMTP not configured")
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        msg.attach(MIMEText(html_content, 'html'))
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        logging.error(f"Email error: {e}")
        return False

def send_selection_notification_email(admin_email: str, client_name: str, gallery_name: str, photo_count: int):
    """Notify admin when client validates selection"""
    html = f"""
    <html>
    <body style="font-family: Arial; background: #0a0a0a; color: #fff; padding: 20px;">
        <h1 style="color: #D4AF37;">📸 Sélection validée</h1>
        <p><strong>{client_name}</strong> a validé sa sélection pour la galerie <strong>{gallery_name}</strong>.</p>
        <p>Nombre de photos sélectionnées: <strong>{photo_count}</strong></p>
    </body>
    </html>
    """
    send_email(admin_email, f"📸 Sélection validée - {client_name}", html)

# ==================== ADMIN ROUTES ====================

@router.get("/admin/galleries", response_model=List[dict])
async def get_galleries(admin: dict = Depends(get_admin_auth)):
    """Get all galleries with client info"""
    galleries = await db.galleries.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for gallery in galleries:
        client = await db.clients.find_one({"id": gallery["client_id"]}, {"_id": 0, "name": 1, "email": 1})
        gallery["client"] = client or {"name": "Client inconnu", "email": ""}
        
        selection = await db.photo_selections.find_one(
            {"gallery_id": gallery["id"]},
            {"_id": 0, "selected_photo_ids": 1, "is_validated": 1}
        )
        gallery["selection"] = selection
    
    return galleries

@router.post("/admin/galleries", response_model=dict)
async def create_gallery(data: GalleryCreate, admin: dict = Depends(get_admin_auth)):
    """Create a new gallery for a client"""
    client = await db.clients.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    gallery = Gallery(**data.model_dump())
    doc = gallery.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.galleries.insert_one(doc)
    del doc["_id"]
    return doc

@router.post("/admin/galleries/{gallery_id}/photos", response_model=dict)
async def upload_gallery_photos(gallery_id: str, files: List[UploadFile] = File(...), admin: dict = Depends(get_admin_auth)):
    """Upload photos to a gallery"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    uploaded = []
    for file in files:
        photo_id = str(uuid.uuid4())
        filename = f"{gallery_id}_{photo_id}_{file.filename}"
        filepath = GALLERIES_DIR / filename
        
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        
        photo = {
            "id": photo_id,
            "url": f"/uploads/galleries/{filename}",
            "filename": filename,
            "uploaded_at": datetime.now(timezone.utc).isoformat()
        }
        uploaded.append(photo)
    
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$push": {"photos": {"$each": uploaded}}}
    )
    
    return {"uploaded": len(uploaded), "photos": uploaded}

@router.delete("/admin/galleries/{gallery_id}/photos/{photo_id}", response_model=dict)
async def delete_gallery_photo(gallery_id: str, photo_id: str, admin: dict = Depends(get_admin_auth)):
    """Delete a photo from gallery"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    photo = next((p for p in gallery.get("photos", []) if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    # Delete file
    filepath = GALLERIES_DIR / photo["filename"]
    if filepath.exists():
        filepath.unlink()
    
    # Remove from selection if present
    await db.photo_selections.update_one(
        {"gallery_id": gallery_id},
        {"$pull": {"selected_photo_ids": photo_id}}
    )
    
    # Remove from gallery
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$pull": {"photos": {"id": photo_id}}}
    )
    
    return {"message": "Photo supprimée"}

@router.delete("/admin/galleries/{gallery_id}", response_model=dict)
async def delete_gallery(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Delete a gallery and all its photos"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    # Delete all photo files
    for photo in gallery.get("photos", []):
        filepath = GALLERIES_DIR / photo["filename"]
        if filepath.exists():
            filepath.unlink()
    
    # Delete selections
    await db.photo_selections.delete_many({"gallery_id": gallery_id})
    
    # Delete gallery
    await db.galleries.delete_one({"id": gallery_id})
    
    return {"message": "Galerie supprimée"}

@router.post("/admin/galleries/{gallery_id}/music", response_model=dict)
async def upload_gallery_music(gallery_id: str, file: UploadFile = File(...), admin: dict = Depends(get_admin_auth)):
    """Upload background music for gallery slideshow"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    # Create gallery folder if needed
    gallery_folder = GALLERIES_DIR / gallery_id
    gallery_folder.mkdir(exist_ok=True)
    
    # Delete old music if exists
    old_music = gallery.get("music_url")
    if old_music:
        old_path = UPLOADS_DIR / old_music.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink()
    
    # Save new music
    music_filename = f"music_{uuid.uuid4()[:8]}_{file.filename}"
    music_path = gallery_folder / music_filename
    content = await file.read()
    with open(music_path, "wb") as f:
        f.write(content)
    
    music_url = f"/uploads/galleries/{gallery_id}/{music_filename}"
    
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$set": {"music_url": music_url}}
    )
    
    return {"music_url": music_url}

@router.delete("/admin/galleries/{gallery_id}/music", response_model=dict)
async def delete_gallery_music(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Delete gallery background music"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    music_url = gallery.get("music_url")
    if music_url:
        music_path = UPLOADS_DIR / music_url.lstrip("/uploads/")
        if music_path.exists():
            music_path.unlink()
    
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$unset": {"music_url": ""}}
    )
    
    return {"message": "Musique supprimée"}

@router.get("/admin/galleries/{gallery_id}/selection", response_model=dict)
async def get_gallery_selection(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Get client's photo selection for a gallery"""
    gallery = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id}, {"_id": 0})
    
    return {
        "gallery": gallery,
        "selection": selection,
        "selected_count": len(selection.get("selected_photo_ids", [])) if selection else 0
    }

@router.get("/admin/galleries/{gallery_id}/download-selection")
async def download_selection_zip(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Download selected photos as ZIP"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id})
    if not selection or not selection.get("selected_photo_ids"):
        raise HTTPException(status_code=404, detail="Aucune sélection trouvée")
    
    selected_ids = set(selection["selected_photo_ids"])
    photos = [p for p in gallery.get("photos", []) if p["id"] in selected_ids]
    
    if not photos:
        raise HTTPException(status_code=404, detail="Aucune photo sélectionnée trouvée")
    
    # Create ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
        for photo in photos:
            filepath = GALLERIES_DIR / photo["filename"]
            if filepath.exists():
                zf.write(filepath, photo["filename"])
    
    zip_buffer.seek(0)
    
    client = await db.clients.find_one({"id": gallery["client_id"]})
    client_name = client.get("name", "client").replace(" ", "_") if client else "client"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=selection_{client_name}_{gallery_id[:8]}.zip"}
    )

@router.get("/admin/galleries/{gallery_id}/qrcode-3d")
async def get_gallery_qrcode_3d(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Generate QR code for 3D gallery view"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    gallery_url = f"{site_url}/galerie-3d/{gallery_id}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(gallery_url)
    qr.make(fit=True)
    
    img_buffer = io.BytesIO()
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_img.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    return StreamingResponse(img_buffer, media_type="image/png")

@router.get("/admin/galleries/{gallery_id}/3d-info")
async def get_gallery_3d_info(gallery_id: str, admin: dict = Depends(get_admin_auth)):
    """Get info for 3D gallery display"""
    gallery = await db.galleries.find_one({"id": gallery_id}, {"_id": 0})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    client = await db.clients.find_one({"id": gallery["client_id"]}, {"_id": 0, "name": 1})
    
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    
    return {
        "gallery": gallery,
        "client_name": client.get("name") if client else "Client",
        "public_url": f"{site_url}/galerie-3d/{gallery_id}",
        "photo_count": len(gallery.get("photos", []))
    }

# ==================== CLIENT ROUTES ====================

@router.get("/client/galleries", response_model=List[dict])
async def get_client_galleries(client: dict = Depends(get_client_auth)):
    """Get galleries for current client"""
    galleries = await db.galleries.find(
        {"client_id": client["id"], "is_active": True},
        {"_id": 0}
    ).to_list(50)
    
    for gallery in galleries:
        selection = await db.photo_selections.find_one(
            {"gallery_id": gallery["id"], "client_id": client["id"]},
            {"_id": 0}
        )
        gallery["selection"] = selection
    
    return galleries

@router.get("/client/galleries/{gallery_id}", response_model=dict)
async def get_client_gallery(gallery_id: str, client: dict = Depends(get_client_auth)):
    """Get a specific gallery for client"""
    gallery = await db.galleries.find_one(
        {"id": gallery_id, "client_id": client["id"], "is_active": True},
        {"_id": 0}
    )
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    selection = await db.photo_selections.find_one(
        {"gallery_id": gallery_id, "client_id": client["id"]},
        {"_id": 0}
    )
    gallery["selection"] = selection
    
    return gallery

@router.post("/client/galleries/{gallery_id}/selection", response_model=dict)
async def update_photo_selection(gallery_id: str, photo_ids: List[str], client: dict = Depends(get_client_auth)):
    """Update client's photo selection"""
    gallery = await db.galleries.find_one({"id": gallery_id, "client_id": client["id"]})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    # Get or create selection
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id, "client_id": client["id"]})
    
    if selection:
        if selection.get("is_validated"):
            raise HTTPException(status_code=400, detail="Sélection déjà validée")
        await db.photo_selections.update_one(
            {"gallery_id": gallery_id, "client_id": client["id"]},
            {"$set": {"selected_photo_ids": photo_ids}}
        )
    else:
        new_selection = PhotoSelection(
            client_id=client["id"],
            gallery_id=gallery_id,
            selected_photo_ids=photo_ids
        )
        doc = new_selection.model_dump()
        await db.photo_selections.insert_one(doc)
    
    return {"message": "Sélection mise à jour", "count": len(photo_ids)}

@router.post("/client/galleries/{gallery_id}/validate", response_model=dict)
async def validate_selection(gallery_id: str, client: dict = Depends(get_client_auth)):
    """Validate and finalize photo selection"""
    gallery = await db.galleries.find_one({"id": gallery_id, "client_id": client["id"]})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id, "client_id": client["id"]})
    if not selection:
        raise HTTPException(status_code=404, detail="Aucune sélection trouvée")
    
    if selection.get("is_validated"):
        raise HTTPException(status_code=400, detail="Sélection déjà validée")
    
    await db.photo_selections.update_one(
        {"gallery_id": gallery_id, "client_id": client["id"]},
        {"$set": {"is_validated": True, "validated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Notify admin
    admin = await db.admins.find_one({}, {"_id": 0, "email": 1})
    if admin and SMTP_EMAIL:
        send_selection_notification_email(
            admin.get("email", SMTP_EMAIL),
            client.get("name", "Client"),
            gallery.get("name", "Galerie"),
            len(selection.get("selected_photo_ids", []))
        )
    
    return {"message": "Selection validated", "count": len(selection.get("selected_photo_ids", []))}

# ==================== PUBLIC ROUTES ====================

@router.get("/public/galleries/{gallery_id}")
async def get_public_gallery(gallery_id: str):
    """Get gallery for public 3D view"""
    gallery = await db.galleries.find_one(
        {"id": gallery_id, "is_active": True},
        {"_id": 0}
    )
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    client = await db.clients.find_one({"id": gallery["client_id"]}, {"_id": 0, "name": 1})
    gallery["client_name"] = client.get("name") if client else "Client"
    
    return gallery

@router.get("/public/galleries/{gallery_id}/image/{photo_id}")
async def get_gallery_image(gallery_id: str, photo_id: str):
    """Get a gallery image for display"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    photo = next((p for p in gallery.get("photos", []) if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    filepath = GALLERIES_DIR / photo["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(filepath)

@router.get("/public/galleries/{gallery_id}/photos/{photo_id}/download")
async def download_gallery_photo(gallery_id: str, photo_id: str):
    """Download a single photo from gallery"""
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Galerie non trouvée")
    
    photo = next((p for p in gallery.get("photos", []) if p["id"] == photo_id), None)
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    filepath = GALLERIES_DIR / photo["filename"]
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(
        filepath,
        media_type="image/jpeg",
        filename=photo["filename"],
        headers={"Content-Disposition": f"attachment; filename={photo['filename']}"}
    )
