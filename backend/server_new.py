"""
CREATIVINDUSTRY Backend Server (Refactored)
FastAPI application with modular routes
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
import os
import logging

from config import UPLOADS_DIR, mongo_client

# Import route modules
from routes.auth import router as auth_router
from routes.clients import router as clients_router
from routes.paypal import router as paypal_router

# Create FastAPI app
app = FastAPI(title="CREATIVINDUSTRY API", version="2.0.0")

# Include route modules with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(paypal_router, prefix="/api")

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()


# Health check endpoint
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
