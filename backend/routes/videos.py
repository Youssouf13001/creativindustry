"""
VIP Video Platform Routes
Plateforme de streaming vidéo style Netflix pour clients VIP
"""

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
import logging
import shutil
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(tags=["VIP Videos"])

VIDEOS_DIR = Path(__file__).parent.parent / "uploads" / "videos"
THUMBNAILS_DIR = VIDEOS_DIR / "thumbnails"
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)

# ==================== AUTH ====================

_get_current_admin = None

def set_admin_dependency(get_current_admin_func):
    global _get_current_admin
    _get_current_admin = get_current_admin_func

async def get_current_user(credentials=Depends(HTTPBearer(auto_error=False))):
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Auth not configured")
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return await _get_current_admin(credentials)

# ==================== MODELS ====================

class VIPClientCreate(BaseModel):
    name: str
    email: str
    password: str
    notes: Optional[str] = None

class VIPClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class VIPLogin(BaseModel):
    email: str
    password: str

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    client_ids: Optional[List[str]] = None

# ==================== VIP CLIENT MANAGEMENT (Admin) ====================

@router.get("/vip/clients")
async def get_vip_clients(current_user: dict = Depends(get_current_user)):
    """Get all VIP clients"""
    clients = await db.vip_clients.find({}, {"_id": 0}).sort("name", 1).to_list(500)
    # Add video count for each client
    for c in clients:
        c["video_count"] = await db.vip_videos.count_documents({"client_ids": c["id"]})
    return clients

@router.post("/vip/clients")
async def create_vip_client(data: VIPClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a VIP client account"""
    import bcrypt
    
    existing = await db.vip_clients.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    hashed = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    client_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "email": data.email.lower(),
        "password_hash": hashed,
        "notes": data.notes,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id")
    }
    await db.vip_clients.insert_one(client_doc)
    return {"id": client_doc["id"], "message": "Client VIP créé"}

@router.put("/vip/clients/{client_id}")
async def update_vip_client(client_id: str, data: VIPClientUpdate, current_user: dict = Depends(get_current_user)):
    """Update a VIP client"""
    import bcrypt
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update["name"] = data.name
    if data.email is not None:
        update["email"] = data.email.lower()
    if data.password is not None:
        update["password_hash"] = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if data.notes is not None:
        update["notes"] = data.notes
    if data.is_active is not None:
        update["is_active"] = data.is_active
    
    result = await db.vip_clients.update_one({"id": client_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client mis à jour"}

@router.delete("/vip/clients/{client_id}")
async def delete_vip_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a VIP client"""
    result = await db.vip_clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

# ==================== VIDEO MANAGEMENT (Admin) ====================

@router.get("/vip/videos")
async def get_all_videos(current_user: dict = Depends(get_current_user)):
    """Get all videos (admin)"""
    videos = await db.vip_videos.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return videos

@router.post("/vip/videos/upload-chunk")
async def upload_video_chunk(
    chunk: UploadFile = File(...),
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    title: str = Form(""),
    description: str = Form(""),
    category: str = Form(""),
    client_ids: str = Form(""),
    current_user: dict = Depends(get_current_user)
):
    """Upload a video chunk"""
    chunk_dir = VIDEOS_DIR / "chunks" / upload_id
    chunk_dir.mkdir(parents=True, exist_ok=True)
    
    chunk_path = chunk_dir / f"chunk_{chunk_index:05d}"
    content = await chunk.read()
    with open(chunk_path, 'wb') as f:
        f.write(content)
    
    # Check if all chunks uploaded
    existing_chunks = list(chunk_dir.glob("chunk_*"))
    
    if len(existing_chunks) >= total_chunks:
        # Assemble the video
        video_id = str(uuid.uuid4())
        ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'mp4'
        video_filename = f"{video_id}.{ext}"
        video_path = VIDEOS_DIR / video_filename
        
        with open(video_path, 'wb') as outfile:
            for i in range(total_chunks):
                cp = chunk_dir / f"chunk_{i:05d}"
                if cp.exists():
                    with open(cp, 'rb') as infile:
                        shutil.copyfileobj(infile, outfile)
        
        # Clean up chunks
        shutil.rmtree(chunk_dir, ignore_errors=True)
        
        file_size = video_path.stat().st_size
        
        # Parse client_ids
        cids = [c.strip() for c in client_ids.split(",") if c.strip()] if client_ids else []
        
        video_doc = {
            "id": video_id,
            "title": title or filename,
            "description": description,
            "category": category or "Non classé",
            "filename": video_filename,
            "original_filename": filename,
            "file_size": file_size,
            "client_ids": cids,
            "thumbnail": None,
            "duration": None,
            "views": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user.get("id")
        }
        await db.vip_videos.insert_one(video_doc)
        
        # Try to generate thumbnail
        try:
            thumb_path = THUMBNAILS_DIR / f"{video_id}.jpg"
            os.system(f'ffmpeg -i "{video_path}" -ss 00:00:02 -vframes 1 -vf scale=640:-1 "{thumb_path}" -y 2>/dev/null')
            if thumb_path.exists():
                await db.vip_videos.update_one(
                    {"id": video_id},
                    {"$set": {"thumbnail": f"{video_id}.jpg"}}
                )
        except Exception as e:
            logging.error(f"Thumbnail generation failed: {e}")
        
        return {
            "status": "complete",
            "video_id": video_id,
            "message": "Vidéo uploadée avec succès"
        }
    
    return {
        "status": "uploading",
        "chunks_received": len(existing_chunks),
        "total_chunks": total_chunks
    }

@router.post("/vip/videos/{video_id}/thumbnail")
async def upload_thumbnail(video_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """Upload custom thumbnail"""
    video = await db.vip_videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'jpg'
    thumb_filename = f"{video_id}.{ext}"
    thumb_path = THUMBNAILS_DIR / thumb_filename
    
    content = await file.read()
    with open(thumb_path, 'wb') as f:
        f.write(content)
    
    await db.vip_videos.update_one({"id": video_id}, {"$set": {"thumbnail": thumb_filename}})
    return {"message": "Miniature mise à jour"}

@router.put("/vip/videos/{video_id}")
async def update_video(video_id: str, data: VideoUpdate, current_user: dict = Depends(get_current_user)):
    """Update video metadata"""
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.title is not None:
        update["title"] = data.title
    if data.description is not None:
        update["description"] = data.description
    if data.category is not None:
        update["category"] = data.category
    if data.client_ids is not None:
        update["client_ids"] = data.client_ids
    
    result = await db.vip_videos.update_one({"id": video_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    return {"message": "Vidéo mise à jour"}

@router.delete("/vip/videos/{video_id}")
async def delete_video(video_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a video"""
    video = await db.vip_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    # Delete file
    video_path = VIDEOS_DIR / video.get("filename", "")
    if video_path.exists():
        video_path.unlink()
    
    # Delete thumbnail
    if video.get("thumbnail"):
        thumb_path = THUMBNAILS_DIR / video["thumbnail"]
        if thumb_path.exists():
            thumb_path.unlink()
    
    await db.vip_videos.delete_one({"id": video_id})
    return {"message": "Vidéo supprimée"}

# ==================== VIDEO STREAMING ====================

@router.get("/vip/stream/{video_id}")
async def stream_video(video_id: str, request: Request):
    """Stream video with range support for seeking"""
    video = await db.vip_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")
    
    video_path = VIDEOS_DIR / video.get("filename", "")
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    file_size = video_path.stat().st_size
    
    # Determine content type
    ext = video_path.suffix.lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
    }
    content_type = content_types.get(ext, "video/mp4")
    
    # Handle range requests for video seeking
    range_header = request.headers.get("range")
    
    if range_header:
        range_str = range_header.replace("bytes=", "")
        start_str, end_str = range_str.split("-")
        start = int(start_str)
        end = int(end_str) if end_str else min(start + 5_000_000, file_size - 1)
        
        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")
        
        def iter_file():
            with open(video_path, 'rb') as f:
                f.seek(start)
                remaining = end - start + 1
                while remaining > 0:
                    chunk_size = min(65536, remaining)
                    data = f.read(chunk_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=content_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
            }
        )
    else:
        # Increment view count
        await db.vip_videos.update_one({"id": video_id}, {"$inc": {"views": 1}})
        
        def iter_full():
            with open(video_path, 'rb') as f:
                while chunk := f.read(65536):
                    yield chunk
        
        return StreamingResponse(
            iter_full(),
            media_type=content_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
            }
        )

@router.get("/vip/thumbnails/{filename}")
async def get_thumbnail(filename: str):
    """Serve video thumbnail"""
    thumb_path = THUMBNAILS_DIR / filename
    if not thumb_path.exists():
        raise HTTPException(status_code=404, detail="Miniature non trouvée")
    return FileResponse(thumb_path)

# ==================== VIP CLIENT AUTH & ACCESS ====================

@router.post("/vip/login")
async def vip_login(data: VIPLogin):
    """VIP client login"""
    import bcrypt
    import jwt
    
    client_doc = await db.vip_clients.find_one({"email": data.email.lower()}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not client_doc.get("is_active", True):
        raise HTTPException(status_code=403, detail="Compte désactivé")
    
    if not bcrypt.checkpw(data.password.encode('utf-8'), client_doc["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-here")
    token = jwt.encode(
        {"sub": client_doc["id"], "type": "vip", "exp": datetime.now(timezone.utc).timestamp() + 86400 * 30},
        JWT_SECRET, algorithm="HS256"
    )
    
    # Update last login
    await db.vip_clients.update_one(
        {"id": client_doc["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "token": token,
        "client": {
            "id": client_doc["id"],
            "name": client_doc["name"],
            "email": client_doc["email"]
        }
    }

@router.get("/vip/my-videos")
async def get_my_videos(request: Request):
    """Get videos assigned to the logged-in VIP client"""
    import jwt
    
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    token = auth.split(" ")[1]
    JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-here")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "vip":
            raise HTTPException(status_code=403, detail="Accès non autorisé")
        client_id = payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    videos = await db.vip_videos.find(
        {"client_ids": client_id},
        {"_id": 0, "filename": 0, "client_ids": 0}
    ).sort("created_at", -1).to_list(500)
    
    return videos
