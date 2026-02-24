"""
Routes pour le Livre d'or digital
Permet aux invités de laisser des messages vidéo/audio via QR code
"""
import uuid
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(tags=["Guestbook"])

# Ces imports seront utilisés quand intégré dans server.py
# from config import db, UPLOADS_DIR
# from dependencies import get_current_admin, get_current_client
