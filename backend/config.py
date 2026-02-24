"""
Configuration centrale pour l'application CREATIVINDUSTRY
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# JWT
SECRET_KEY = os.environ.get('JWT_SECRET', 'creativindustry-secret-key-2024')
ALGORITHM = "HS256"

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')

# Site URL
SITE_URL = os.environ.get('SITE_URL', 'https://creativindustry.com')

# Emergent LLM
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "portfolio").mkdir(exist_ok=True)
(UPLOADS_DIR / "clients").mkdir(exist_ok=True)
(UPLOADS_DIR / "galleries").mkdir(exist_ok=True)
(UPLOADS_DIR / "selections").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "music").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "documents").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "photos").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "videos").mkdir(exist_ok=True)
(UPLOADS_DIR / "news").mkdir(exist_ok=True)
(UPLOADS_DIR / "welcome").mkdir(exist_ok=True)
(UPLOADS_DIR / "social_media").mkdir(exist_ok=True)
(UPLOADS_DIR / "archives").mkdir(exist_ok=True)
(UPLOADS_DIR / "chat").mkdir(exist_ok=True)
