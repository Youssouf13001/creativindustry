"""
Guestbook (Livre d'or) Routes
All routes related to guestbook management, messages, montage, and payments
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from pathlib import Path
import uuid
import shutil
import os
import logging
import subprocess
import tempfile

# Import shared dependencies
from utils.dependencies import (
    db, security, verify_token, 
    get_current_admin, get_current_client, create_token
)

# Create router
router = APIRouter(tags=["Guestbook"])

# Paths
UPLOADS_DIR = Path("/app/backend/uploads")
GUESTBOOK_DIR = UPLOADS_DIR / "guestbooks"
GUESTBOOK_DIR.mkdir(parents=True, exist_ok=True)

# ==================== MODELS ====================

class GuestbookCreate(BaseModel):
    client_id: str
    name: str
    event_date: Optional[str] = None
    description: Optional[str] = None
    welcome_message: Optional[str] = None
    allow_video: bool = True
    allow_audio: bool = True
    allow_text: bool = True
    max_video_duration: int = 60
    max_audio_duration: int = 120
    require_approval: bool = True

class GuestbookPurchaseRequest(BaseModel):
    name: str
    event_date: Optional[str] = None

# Default background musics (royalty-free)
DEFAULT_MUSICS = [
    {"id": "romantic", "name": "Romantique", "url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3"},
    {"id": "happy", "name": "Joyeux", "url": "https://cdn.pixabay.com/download/audio/2022/10/25/audio_946b0939c8.mp3"},
    {"id": "emotional", "name": "Émouvant", "url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"},
]

# ==================== HELPER FUNCTIONS ====================

async def get_guestbook_price():
    """Get guestbook price from settings"""
    settings = await db.settings.find_one({"key": "guestbook_price"}, {"_id": 0})
    if settings and settings.get("value"):
        return float(settings.get("value"))
    return 200.00  # Default price


# ==================== ADMIN ROUTES ====================

@router.post("/admin/guestbooks", response_model=dict)
async def create_guestbook(data: GuestbookCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Create a new guestbook for a client"""
    verify_token(credentials.credentials)
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    guestbook_id = str(uuid.uuid4())
    guestbook = {
        "id": guestbook_id,
        "client_id": data.client_id,
        "client_name": client.get("name", ""),
        "name": data.name,
        "event_date": data.event_date,
        "description": data.description,
        "welcome_message": data.welcome_message or f"Laissez un message pour {client.get('name', 'les mariés')} !",
        "is_active": True,
        "allow_video": data.allow_video,
        "allow_audio": data.allow_audio,
        "allow_text": data.allow_text,
        "max_video_duration": data.max_video_duration,
        "max_audio_duration": data.max_audio_duration,
        "require_approval": data.require_approval,
        "message_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.guestbooks.insert_one(guestbook)
    
    # Create folder for media
    guestbook_folder = GUESTBOOK_DIR / guestbook_id
    guestbook_folder.mkdir(exist_ok=True)
    
    guestbook.pop("_id", None)
    return guestbook


@router.get("/admin/guestbooks", response_model=List[dict])
async def get_all_guestbooks(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all guestbooks for admin"""
    verify_token(credentials.credentials)
    
    guestbooks = await db.guestbooks.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Add message counts
    for gb in guestbooks:
        total = await db.guestbook_messages.count_documents({"guestbook_id": gb["id"]})
        pending = await db.guestbook_messages.count_documents({"guestbook_id": gb["id"], "is_approved": False})
        gb["message_count"] = total
        gb["pending_count"] = pending
    
    return guestbooks


@router.get("/admin/guestbooks/{guestbook_id}", response_model=dict)
async def get_guestbook_admin(guestbook_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get a specific guestbook with all messages"""
    verify_token(credentials.credentials)
    
    guestbook = await db.guestbooks.find_one({"id": guestbook_id}, {"_id": 0})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    messages = await db.guestbook_messages.find(
        {"guestbook_id": guestbook_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    guestbook["messages"] = messages
    return guestbook


@router.put("/admin/guestbooks/{guestbook_id}", response_model=dict)
async def update_guestbook(guestbook_id: str, data: dict, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Update guestbook settings"""
    verify_token(credentials.credentials)
    
    guestbook = await db.guestbooks.find_one({"id": guestbook_id})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    allowed_fields = ["name", "event_date", "description", "welcome_message", "is_active", 
                      "allow_video", "allow_audio", "allow_text", "max_video_duration", 
                      "max_audio_duration", "require_approval"]
    
    update_data = {k: v for k, v in data.items() if k in allowed_fields}
    
    if update_data:
        await db.guestbooks.update_one({"id": guestbook_id}, {"$set": update_data})
    
    updated = await db.guestbooks.find_one({"id": guestbook_id}, {"_id": 0})
    return updated


@router.delete("/admin/guestbooks/{guestbook_id}")
async def delete_guestbook(guestbook_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a guestbook and all its messages"""
    verify_token(credentials.credentials)
    
    guestbook = await db.guestbooks.find_one({"id": guestbook_id})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    # Delete media files
    guestbook_folder = GUESTBOOK_DIR / guestbook_id
    if guestbook_folder.exists():
        shutil.rmtree(guestbook_folder)
    
    # Delete messages and guestbook
    await db.guestbook_messages.delete_many({"guestbook_id": guestbook_id})
    await db.guestbooks.delete_one({"id": guestbook_id})
    
    return {"success": True, "message": "Livre d'or supprimé"}


@router.put("/admin/guestbook-messages/{message_id}/approve")
async def approve_guestbook_message_admin(message_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Approve a guestbook message (admin)"""
    verify_token(credentials.credentials)
    
    message = await db.guestbook_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    await db.guestbook_messages.update_one(
        {"id": message_id},
        {"$set": {"is_approved": True}}
    )
    
    return {"success": True}


@router.delete("/admin/guestbook-messages/{message_id}")
async def delete_guestbook_message_admin(message_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Delete a guestbook message (admin)"""
    verify_token(credentials.credentials)
    
    message = await db.guestbook_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Delete media file if exists
    if message.get("media_url"):
        media_path = UPLOADS_DIR / message["media_url"].lstrip("/uploads/")
        if media_path.exists():
            media_path.unlink()
    
    await db.guestbook_messages.delete_one({"id": message_id})
    
    return {"success": True}


@router.get("/admin/guestbook-price")
async def get_admin_guestbook_price(admin: dict = Depends(get_current_admin)):
    """Get current guestbook price setting"""
    price = await get_guestbook_price()
    return {"price": price}


@router.put("/admin/guestbook-price")
async def update_guestbook_price(
    price: float = Body(..., embed=True),
    admin: dict = Depends(get_current_admin)
):
    """Update guestbook price"""
    if price < 0:
        raise HTTPException(status_code=400, detail="Le prix ne peut pas être négatif")
    
    await db.settings.update_one(
        {"key": "guestbook_price"},
        {"$set": {"key": "guestbook_price", "value": price}},
        upsert=True
    )
    
    return {"success": True, "price": price}


# ==================== PUBLIC ROUTES ====================

@router.get("/public/guestbooks/{guestbook_id}")
async def get_public_guestbook(guestbook_id: str):
    """Public endpoint to access a guestbook for leaving messages"""
    guestbook = await db.guestbooks.find_one({"id": guestbook_id}, {"_id": 0})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    if not guestbook.get("is_active", True):
        raise HTTPException(status_code=403, detail="Ce livre d'or n'est plus actif")
    
    return {
        "id": guestbook["id"],
        "name": guestbook.get("name"),
        "event_date": guestbook.get("event_date"),
        "welcome_message": guestbook.get("welcome_message"),
        "allow_video": guestbook.get("allow_video", True),
        "allow_audio": guestbook.get("allow_audio", True),
        "allow_text": guestbook.get("allow_text", True),
        "max_video_duration": guestbook.get("max_video_duration", 60),
        "max_audio_duration": guestbook.get("max_audio_duration", 120)
    }


@router.get("/public/guestbooks/{guestbook_id}/messages")
async def get_public_guestbook_messages(guestbook_id: str):
    """Get approved messages for a public guestbook"""
    guestbook = await db.guestbooks.find_one({"id": guestbook_id})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    messages = await db.guestbook_messages.find(
        {"guestbook_id": guestbook_id, "is_approved": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return messages


@router.post("/public/guestbooks/{guestbook_id}/messages/text")
async def post_text_message(
    guestbook_id: str,
    author_name: str = Form(...),
    text_content: str = Form(...)
):
    """Post a text message to the guestbook"""
    guestbook = await db.guestbooks.find_one({"id": guestbook_id})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    if not guestbook.get("is_active", True):
        raise HTTPException(status_code=403, detail="Ce livre d'or n'est plus actif")
    
    if not guestbook.get("allow_text", True):
        raise HTTPException(status_code=403, detail="Les messages texte ne sont pas autorisés")
    
    message_id = str(uuid.uuid4())
    message = {
        "id": message_id,
        "guestbook_id": guestbook_id,
        "author_name": author_name,
        "message_type": "text",
        "text_content": text_content,
        "is_approved": not guestbook.get("require_approval", True),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.guestbook_messages.insert_one(message)
    message.pop("_id", None)
    
    return {"success": True, "message": message, "needs_approval": guestbook.get("require_approval", True)}


@router.post("/public/guestbooks/{guestbook_id}/messages/media")
async def post_media_message(
    guestbook_id: str,
    author_name: str = Form(...),
    message_type: str = Form(...),
    file: UploadFile = File(...),
    duration: int = Form(default=0)
):
    """Post an audio or video message to the guestbook"""
    guestbook = await db.guestbooks.find_one({"id": guestbook_id})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    if not guestbook.get("is_active", True):
        raise HTTPException(status_code=403, detail="Ce livre d'or n'est plus actif")
    
    if message_type == "video" and not guestbook.get("allow_video", True):
        raise HTTPException(status_code=403, detail="Les vidéos ne sont pas autorisées")
    
    if message_type == "audio" and not guestbook.get("allow_audio", True):
        raise HTTPException(status_code=403, detail="Les messages audio ne sont pas autorisés")
    
    # Check duration limits
    if message_type == "video" and duration > guestbook.get("max_video_duration", 60):
        raise HTTPException(status_code=400, detail=f"Vidéo trop longue (max {guestbook.get('max_video_duration', 60)}s)")
    
    if message_type == "audio" and duration > guestbook.get("max_audio_duration", 120):
        raise HTTPException(status_code=400, detail=f"Audio trop long (max {guestbook.get('max_audio_duration', 120)}s)")
    
    # Validate file type
    allowed_video = ["video/mp4", "video/webm", "video/quicktime"]
    allowed_audio = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"]
    
    if message_type == "video" and file.content_type not in allowed_video:
        raise HTTPException(status_code=400, detail="Format vidéo non supporté")
    
    if message_type == "audio" and file.content_type not in allowed_audio:
        raise HTTPException(status_code=400, detail="Format audio non supporté")
    
    # Save file
    guestbook_folder = GUESTBOOK_DIR / guestbook_id
    guestbook_folder.mkdir(exist_ok=True)
    
    message_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix.lower() or (".webm" if "webm" in file.content_type else ".mp4")
    media_filename = f"{message_id}{file_ext}"
    file_path = guestbook_folder / media_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    media_url = f"/uploads/guestbooks/{guestbook_id}/{media_filename}"
    
    message = {
        "id": message_id,
        "guestbook_id": guestbook_id,
        "author_name": author_name,
        "message_type": message_type,
        "media_url": media_url,
        "duration": duration,
        "is_approved": not guestbook.get("require_approval", True),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.guestbook_messages.insert_one(message)
    message.pop("_id", None)
    
    return {"success": True, "message": message, "needs_approval": guestbook.get("require_approval", True)}


@router.get("/public/guestbook-price")
async def get_public_guestbook_price():
    """Get current guestbook price for display"""
    price = await get_guestbook_price()
    return {"price": price}


@router.get("/public/guestbook-musics")
async def get_default_musics():
    """Get list of default background musics"""
    return {"musics": DEFAULT_MUSICS}


# ==================== CLIENT ROUTES ====================

@router.get("/client/guestbooks")
async def get_client_guestbooks(client: dict = Depends(get_current_client)):
    """Get all guestbooks for a client"""
    guestbooks = await db.guestbooks.find(
        {"client_id": client["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for gb in guestbooks:
        total = await db.guestbook_messages.count_documents({"guestbook_id": gb["id"]})
        pending = await db.guestbook_messages.count_documents({"guestbook_id": gb["id"], "is_approved": False})
        approved = await db.guestbook_messages.count_documents({"guestbook_id": gb["id"], "is_approved": True})
        gb["message_count"] = total
        gb["pending_count"] = pending
        gb["approved_count"] = approved
    
    return guestbooks


@router.get("/client/guestbooks/{guestbook_id}")
async def get_client_guestbook(guestbook_id: str, client: dict = Depends(get_current_client)):
    """Get a specific guestbook for the client"""
    guestbook = await db.guestbooks.find_one(
        {"id": guestbook_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    messages = await db.guestbook_messages.find(
        {"guestbook_id": guestbook_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    guestbook["messages"] = messages
    return guestbook


@router.put("/client/guestbook-messages/{message_id}/approve")
async def approve_guestbook_message_client(message_id: str, client: dict = Depends(get_current_client)):
    """Approve a guestbook message (client)"""
    message = await db.guestbook_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Verify ownership
    guestbook = await db.guestbooks.find_one({"id": message["guestbook_id"], "client_id": client["id"]})
    if not guestbook:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    await db.guestbook_messages.update_one(
        {"id": message_id},
        {"$set": {"is_approved": True}}
    )
    
    return {"success": True}


@router.delete("/client/guestbook-messages/{message_id}")
async def delete_guestbook_message_client(message_id: str, client: dict = Depends(get_current_client)):
    """Delete a guestbook message (client)"""
    message = await db.guestbook_messages.find_one({"id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    # Verify ownership
    guestbook = await db.guestbooks.find_one({"id": message["guestbook_id"], "client_id": client["id"]})
    if not guestbook:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Delete media file if exists
    if message.get("media_url"):
        media_path = UPLOADS_DIR / message["media_url"].lstrip("/uploads/")
        if media_path.exists():
            media_path.unlink()
    
    await db.guestbook_messages.delete_one({"id": message_id})
    
    return {"success": True}


# ==================== VIDEO MONTAGE ====================

@router.post("/client/guestbook/{guestbook_id}/generate-montage")
async def generate_guestbook_montage(
    guestbook_id: str,
    music_url: Optional[str] = Body(None, embed=True),
    client: dict = Depends(get_current_client)
):
    """Generate a video montage from all approved video messages"""
    import httpx
    
    # Verify ownership
    guestbook = await db.guestbooks.find_one({"id": guestbook_id, "client_id": client["id"]})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    # Get all approved video messages
    messages = await db.guestbook_messages.find({
        "guestbook_id": guestbook_id,
        "message_type": "video",
        "is_approved": True
    }).sort("created_at", 1).to_list(100)
    
    if not messages:
        raise HTTPException(status_code=400, detail="Aucune vidéo approuvée à monter")
    
    # Collect video files
    video_files = []
    for msg in messages:
        if msg.get("media_url"):
            video_path = UPLOADS_DIR / msg["media_url"].lstrip("/uploads/")
            if video_path.exists():
                video_files.append(str(video_path))
    
    if not video_files:
        raise HTTPException(status_code=400, detail="Aucun fichier vidéo trouvé")
    
    # Create output directory
    montage_dir = GUESTBOOK_DIR / guestbook_id / "montages"
    montage_dir.mkdir(parents=True, exist_ok=True)
    
    montage_id = str(uuid.uuid4())[:8]
    output_file = montage_dir / f"montage_{montage_id}.mp4"
    
    try:
        # Create a temporary file list for FFmpeg concat
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            for vf in video_files:
                f.write(f"file '{vf}'\n")
            concat_file = f.name
        
        # Step 1: Concatenate all videos
        temp_concat = str(montage_dir / f"temp_concat_{montage_id}.mp4")
        concat_cmd = [
            "ffmpeg", "-y", "-f", "concat", "-safe", "0",
            "-i", concat_file,
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            temp_concat
        ]
        
        result = subprocess.run(concat_cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            logging.error(f"FFmpeg concat error: {result.stderr}")
            raise HTTPException(status_code=500, detail="Erreur lors de la concaténation des vidéos")
        
        # Step 2: Add background music if provided
        if music_url:
            music_path = None
            if music_url.startswith("/uploads/"):
                music_path = UPLOADS_DIR / music_url.lstrip("/uploads/")
            elif music_url.startswith("http"):
                music_path = montage_dir / f"music_{montage_id}.mp3"
                async with httpx.AsyncClient() as http_client:
                    response = await http_client.get(music_url)
                    with open(music_path, "wb") as mf:
                        mf.write(response.content)
            
            if music_path and Path(music_path).exists():
                music_cmd = [
                    "ffmpeg", "-y",
                    "-i", temp_concat,
                    "-i", str(music_path),
                    "-filter_complex", "[0:a]volume=1.0[a0];[1:a]volume=0.3[a1];[a0][a1]amix=inputs=2:duration=first[aout]",
                    "-map", "0:v", "-map", "[aout]",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart",
                    str(output_file)
                ]
                result = subprocess.run(music_cmd, capture_output=True, text=True, timeout=300)
                if result.returncode != 0:
                    logging.error(f"FFmpeg music error: {result.stderr}")
                    shutil.move(temp_concat, str(output_file))
            else:
                shutil.move(temp_concat, str(output_file))
        else:
            shutil.move(temp_concat, str(output_file))
        
        # Clean up temp files
        os.unlink(concat_file)
        if Path(temp_concat).exists():
            os.unlink(temp_concat)
        
        # Save montage record
        montage_record = {
            "id": montage_id,
            "guestbook_id": guestbook_id,
            "client_id": client["id"],
            "video_count": len(video_files),
            "has_music": bool(music_url),
            "file_path": f"/uploads/guestbooks/{guestbook_id}/montages/montage_{montage_id}.mp4",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.guestbook_montages.insert_one(montage_record)
        
        return {
            "success": True,
            "montage_id": montage_id,
            "video_url": f"/uploads/guestbooks/{guestbook_id}/montages/montage_{montage_id}.mp4",
            "video_count": len(video_files)
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Le montage a pris trop de temps")
    except Exception as e:
        logging.error(f"Montage error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors du montage: {str(e)}")


@router.get("/client/guestbook/{guestbook_id}/montages")
async def get_guestbook_montages(guestbook_id: str, client: dict = Depends(get_current_client)):
    """Get all montages for a guestbook"""
    guestbook = await db.guestbooks.find_one({"id": guestbook_id, "client_id": client["id"]})
    if not guestbook:
        raise HTTPException(status_code=404, detail="Livre d'or non trouvé")
    
    montages = await db.guestbook_montages.find(
        {"guestbook_id": guestbook_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"montages": montages}
