"""
Authentication and security services
"""
import jwt
import bcrypt
import secrets
from datetime import datetime, timezone
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET', 'creativindustry-secret-key-2024')
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: str, user_type: str = "admin") -> str:
    """Create a JWT token"""
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    """Verify admin JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_type = payload.get("type", "admin")
        if user_type != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def verify_client_token(token: str) -> dict:
    """Verify client JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_type = payload.get("type", "admin")
        if user_type != "client":
            raise HTTPException(status_code=403, detail="Client access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_temp_password(length: int = 12) -> str:
    """Generate a temporary password"""
    return secrets.token_urlsafe(length)


# Integration key verification
INTEGRATION_API_KEY = os.environ.get('INTEGRATION_API_KEY', 'creativindustry-devis-integration-key-2024')


def verify_integration_key(api_key: str) -> bool:
    """Verify integration API key"""
    return api_key == INTEGRATION_API_KEY
