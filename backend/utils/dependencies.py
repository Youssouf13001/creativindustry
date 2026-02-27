"""
Common dependencies for routes - Authentication, Database, etc.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt
import os
from datetime import datetime, timezone

# Security
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'creativindustry-secret-key-2024')
ALGORITHM = "HS256"

# Database connection
mongo_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = mongo_client[os.environ['DB_NAME']]


def verify_token(token: str):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("exp") and payload["exp"] < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=401, detail="Token expiré")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated admin"""
    payload = verify_token(credentials.credentials)
    if payload.get("type") != "admin":
        raise HTTPException(status_code=403, detail="Accès admin requis")
    
    admin = await db.admins.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not admin:
        raise HTTPException(status_code=404, detail="Admin non trouvé")
    return admin


async def get_current_client(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated client"""
    payload = verify_token(credentials.credentials)
    if payload.get("type") != "client":
        raise HTTPException(status_code=403, detail="Accès client requis")
    
    client = await db.clients.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return client


async def get_current_team_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated team user"""
    payload = verify_token(credentials.credentials)
    if payload.get("type") != "team":
        raise HTTPException(status_code=403, detail="Accès équipe requis")
    
    user = await db.team_users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return user


def create_token(user_id: str, user_type: str = "admin") -> str:
    """Create JWT token"""
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
