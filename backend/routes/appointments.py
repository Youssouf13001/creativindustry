"""
Routes pour la gestion des rendez-vous (Appointments)
Refactorisé depuis server.py - Mars 2026
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Union
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from motor.motor_asyncio import AsyncIOMotorClient

# Import SMS service
from services.sms_service import send_appointment_reminder_sms

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

# Router
router = APIRouter(tags=["Appointments"])

# ==================== CONSTANTS ====================

APPOINTMENT_TYPES = [
    {"id": "contract_sign", "label": "Signature de contrat"},
    {"id": "contract_discuss", "label": "Discussion de contrat"},
    {"id": "billing", "label": "Problème de facturation"},
    {"id": "project", "label": "Discussion de projet"},
    {"id": "other", "label": "Autre"}
]

APPOINTMENT_DURATIONS = [
    {"id": "30", "label": "30 minutes"},
    {"id": "60", "label": "1 heure"},
    {"id": "90", "label": "1 heure 30"}
]

# ==================== MODELS ====================

class Appointment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    appointment_type: str
    appointment_type_label: str = ""
    duration: Union[str, int] = "60"
    proposed_date: str
    proposed_time: str
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, refused, rescheduled_pending, cancelled
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None
    confirmation_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    reminder_sent: bool = False  # SMS reminder 24h before
    reminder_sent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

    class Config:
        extra = "ignore"

class AppointmentCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    appointment_type: str
    duration: str
    proposed_date: str
    proposed_time: str
    message: Optional[str] = None

class AppointmentAdminUpdate(BaseModel):
    status: str  # confirmed, refused, rescheduled_pending, cancelled
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None

# ==================== EMAIL FUNCTIONS ====================

def send_email(to_email: str, subject: str, html_content: str):
    """Send email via SMTP"""
    if not SMTP_HOST or not SMTP_EMAIL:
        logging.warning("SMTP not configured, skipping email")
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
        logging.error(f"Failed to send email: {str(e)}")
        return False

def send_appointment_request_email(client_email: str, client_name: str, appointment_type: str, 
                                   proposed_date: str, proposed_time: str, appointment_id: str):
    """Send email to client confirming their appointment request"""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="color: #D4AF37; font-size: 24px; font-weight: bold;">CREATIVINDUSTRY</div>
            </div>
            <div style="background-color: #111111; border: 1px solid #222222; padding: 40px;">
                <h1 style="color: #D4AF37; font-size: 24px; margin-bottom: 20px;">📅 Demande de rendez-vous reçue</h1>
                <p style="color: #cccccc; line-height: 1.6;">Bonjour {client_name},</p>
                <p style="color: #cccccc; line-height: 1.6;">Nous avons bien reçu votre demande de rendez-vous. Notre équipe va l'examiner et vous répondra dans les plus brefs délais.</p>
                
                <div style="background-color: #1a1a1a; border-left: 3px solid #D4AF37; padding: 20px; margin: 25px 0;">
                    <p style="margin: 5px 0;"><strong style="color: #888;">Motif :</strong> <span style="color: #fff;">{appointment_type}</span></p>
                    <p style="margin: 5px 0;"><strong style="color: #888;">Date souhaitée :</strong> <span style="color: #fff;">{proposed_date}</span></p>
                    <p style="margin: 5px 0;"><strong style="color: #888;">Heure :</strong> <span style="color: #fff;">{proposed_time}</span></p>
                    <p style="margin: 5px 0;"><strong style="color: #888;">Référence :</strong> <span style="color: #D4AF37;">RDV-{appointment_id[:8].upper()}</span></p>
                </div>
                
                <p style="color: #888; font-size: 13px;">Vous recevrez un email de confirmation dès que votre rendez-vous sera validé.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                <p>© 2024 CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    subject = f"📅 Demande de rendez-vous reçue - RDV-{appointment_id[:8].upper()}"
    return send_email(client_email, subject, html_content)

def send_appointment_confirmed_email(client_email: str, client_name: str, appointment_type: str,
                                     confirmed_date: str, confirmed_time: str, appointment_id: str, 
                                     admin_message: str = ""):
    """Send email to client confirming their appointment"""
    admin_msg_html = f'<p style="color: #cccccc; line-height: 1.6; background: #1a1a1a; padding: 15px; margin: 20px 0;"><strong>Message :</strong> {admin_message}</p>' if admin_message else ''
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="color: #D4AF37; font-size: 24px; font-weight: bold;">CREATIVINDUSTRY</div>
            </div>
            <div style="background-color: #111111; border: 1px solid #222222; padding: 40px;">
                <h1 style="color: #22c55e; font-size: 24px; margin-bottom: 20px;">✅ Rendez-vous confirmé !</h1>
                <p style="color: #cccccc; line-height: 1.6;">Bonjour {client_name},</p>
                <p style="color: #cccccc; line-height: 1.6;">Votre rendez-vous a été confirmé. Nous vous attendons à nos locaux.</p>
                
                <div style="background-color: #22c55e; color: #000; padding: 20px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px;">Rendez-vous confirmé</p>
                    <p style="margin: 10px 0 5px 0; font-size: 28px; font-weight: bold;">{confirmed_date}</p>
                    <p style="margin: 0; font-size: 20px;">{confirmed_time}</p>
                </div>
                
                <div style="background-color: #1a1a1a; border-left: 3px solid #D4AF37; padding: 20px; margin: 25px 0;">
                    <p style="margin: 5px 0;"><strong style="color: #888;">Motif :</strong> <span style="color: #fff;">{appointment_type}</span></p>
                    <p style="margin: 5px 0;"><strong style="color: #888;">Lieu :</strong> <span style="color: #fff;">Nos locaux CREATIVINDUSTRY</span></p>
                    <p style="margin: 5px 0;"><strong style="color: #888;">Référence :</strong> <span style="color: #D4AF37;">RDV-{appointment_id[:8].upper()}</span></p>
                </div>
                
                {admin_msg_html}
                
                <p style="color: #888; font-size: 13px;">En cas d'empêchement, merci de nous prévenir au plus tôt.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                <p>© 2024 CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    subject = f"✅ Rendez-vous confirmé le {confirmed_date} - RDV-{appointment_id[:8].upper()}"
    return send_email(client_email, subject, html_content)

def send_appointment_refused_email(client_email: str, client_name: str, appointment_type: str,
                                   appointment_id: str, admin_message: str = ""):
    """Send email to client about refused appointment"""
    admin_msg_html = f'<p style="color: #cccccc; line-height: 1.6; background: #1a1a1a; padding: 15px; margin: 20px 0;"><strong>Motif :</strong> {admin_message}</p>' if admin_message else ''
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="color: #D4AF37; font-size: 24px; font-weight: bold;">CREATIVINDUSTRY</div>
            </div>
            <div style="background-color: #111111; border: 1px solid #222222; padding: 40px;">
                <h1 style="color: #ef4444; font-size: 24px; margin-bottom: 20px;">❌ Rendez-vous non disponible</h1>
                <p style="color: #cccccc; line-height: 1.6;">Bonjour {client_name},</p>
                <p style="color: #cccccc; line-height: 1.6;">Nous sommes désolés, mais nous ne sommes pas en mesure de vous recevoir à la date demandée.</p>
                
                {admin_msg_html}
                
                <p style="color: #cccccc; line-height: 1.6;">N'hésitez pas à faire une nouvelle demande avec une autre date.</p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://creativindustry.com/rendez-vous" style="display: inline-block; background-color: #D4AF37; color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold;">Proposer une autre date</a>
                </div>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                <p>© 2024 CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    subject = f"❌ Rendez-vous non disponible - RDV-{appointment_id[:8].upper()}"
    return send_email(client_email, subject, html_content)

def send_appointment_reschedule_email(client_email: str, client_name: str, appointment_type: str,
                                      new_date: str, new_time: str, appointment_id: str, 
                                      confirmation_token: str, admin_message: str = ""):
    """Send email to client proposing a new date"""
    confirm_url = f"https://creativindustry.com/rendez-vous/confirmer/{appointment_id}/{confirmation_token}"
    admin_msg_html = f'<p style="color: #cccccc; line-height: 1.6; background: #1a1a1a; padding: 15px; margin: 20px 0;"><strong>Message :</strong> {admin_message}</p>' if admin_message else ''
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <div style="color: #D4AF37; font-size: 24px; font-weight: bold;">CREATIVINDUSTRY</div>
            </div>
            <div style="background-color: #111111; border: 1px solid #222222; padding: 40px;">
                <h1 style="color: #f59e0b; font-size: 24px; margin-bottom: 20px;">📅 Nouvelle date proposée</h1>
                <p style="color: #cccccc; line-height: 1.6;">Bonjour {client_name},</p>
                <p style="color: #cccccc; line-height: 1.6;">La date que vous avez demandée n'est pas disponible. Nous vous proposons le créneau suivant :</p>
                
                <div style="background-color: #f59e0b; color: #000; padding: 20px; text-align: center; margin: 25px 0;">
                    <p style="margin: 0; font-size: 14px;">Nouvelle date proposée</p>
                    <p style="margin: 10px 0 5px 0; font-size: 28px; font-weight: bold;">{new_date}</p>
                    <p style="margin: 0; font-size: 20px;">{new_time}</p>
                </div>
                
                {admin_msg_html}
                
                <p style="color: #cccccc; line-height: 1.6; text-align: center;"><strong>Cette date vous convient-elle ?</strong></p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{confirm_url}" style="display: inline-block; background-color: #22c55e; color: #fff; padding: 15px 30px; text-decoration: none; font-weight: bold; margin: 5px;">✓ Accepter cette date</a>
                </div>
                
                <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">Si cette date ne vous convient pas, vous pouvez faire une nouvelle demande sur notre site.</p>
            </div>
            <div style="text-align: center; margin-top: 30px; color: #666; font-size: 12px;">
                <p>© 2024 CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    subject = f"📅 Nouvelle date proposée pour votre RDV - {new_date}"
    return send_email(client_email, subject, html_content)

def send_admin_appointment_notification(appointment_id: str, client_name: str, client_email: str,
                                        client_phone: str, appointment_type: str, proposed_date: str,
                                        proposed_time: str, duration: str, message: str = ""):
    """Send notification to admin about new appointment request"""
    msg_html = f'<p><strong>Message du client :</strong> {message}</p>' if message else ''
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #D4AF37;">📅 Nouvelle demande de RDV</h1>
            
            <h3>Client</h3>
            <p><strong>Nom :</strong> {client_name}</p>
            <p><strong>Email :</strong> {client_email}</p>
            <p><strong>Téléphone :</strong> {client_phone}</p>
            
            <h3>Rendez-vous demandé</h3>
            <p><strong>Motif :</strong> {appointment_type}</p>
            <p><strong>Date souhaitée :</strong> {proposed_date}</p>
            <p><strong>Heure :</strong> {proposed_time}</p>
            <p><strong>Durée :</strong> {duration}</p>
            <p><strong>Référence :</strong> RDV-{appointment_id[:8].upper()}</p>
            
            {msg_html}
            
            <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px;">
                ⏳ En attente de votre validation. Connectez-vous à l'admin pour répondre.
            </p>
        </div>
    </body>
    </html>
    """
    subject = f"📅 Nouvelle demande de RDV - {client_name} - {proposed_date}"
    return send_email(SMTP_EMAIL, subject, html_content)

# ==================== AUTH DEPENDENCY ====================
# Import from main server to avoid circular dependency
# This will be injected when the router is included

_get_current_admin = None

def set_admin_dependency(get_current_admin_func):
    """Set the admin authentication dependency"""
    global _get_current_admin
    _get_current_admin = get_current_admin_func

def get_current_admin():
    """Get admin dependency - raises if not set"""
    if _get_current_admin is None:
        raise HTTPException(status_code=500, detail="Admin dependency not configured")
    return Depends(_get_current_admin)

# ==================== ROUTES ====================

@router.get("/appointment-types")
async def get_appointment_types():
    """Get available appointment types"""
    return {"types": APPOINTMENT_TYPES, "durations": APPOINTMENT_DURATIONS}

@router.post("/appointments", response_model=Appointment)
async def create_appointment(data: AppointmentCreate):
    """Create a new appointment request"""
    type_label = next((t["label"] for t in APPOINTMENT_TYPES if t["id"] == data.appointment_type), data.appointment_type)
    duration_label = next((d["label"] for d in APPOINTMENT_DURATIONS if d["id"] == data.duration), data.duration + " min")
    
    appointment = Appointment(
        **data.model_dump(),
        appointment_type_label=type_label
    )
    doc = appointment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.appointments.insert_one(doc)
    
    # Send confirmation email to client
    try:
        send_appointment_request_email(
            client_email=data.client_email,
            client_name=data.client_name,
            appointment_type=type_label,
            proposed_date=data.proposed_date,
            proposed_time=data.proposed_time,
            appointment_id=appointment.id
        )
    except Exception as e:
        logging.error(f"Failed to send appointment request email: {str(e)}")
    
    # Send notification to admin
    try:
        send_admin_appointment_notification(
            appointment_id=appointment.id,
            client_name=data.client_name,
            client_email=data.client_email,
            client_phone=data.client_phone,
            appointment_type=type_label,
            proposed_date=data.proposed_date,
            proposed_time=data.proposed_time,
            duration=duration_label,
            message=data.message or ""
        )
    except Exception as e:
        logging.error(f"Failed to send admin notification: {str(e)}")
    
    return appointment

@router.get("/appointments", response_model=List[Appointment])
async def get_appointments(status: Optional[str] = None, admin: dict = Depends(lambda: _get_current_admin)):
    """Get all appointments (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for a in appointments:
        if isinstance(a.get('created_at'), str):
            a['created_at'] = datetime.fromisoformat(a['created_at'])
        if a.get('updated_at') and isinstance(a['updated_at'], str):
            a['updated_at'] = datetime.fromisoformat(a['updated_at'])
    return appointments

@router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, data: AppointmentAdminUpdate, admin: dict = Depends(lambda: _get_current_admin)):
    """Update appointment status (admin only)"""
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    update_data = {
        "status": data.status,
        "admin_response": data.admin_response,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    type_label = appointment.get("appointment_type_label", appointment.get("appointment_type"))
    
    if data.status == "confirmed":
        try:
            send_appointment_confirmed_email(
                client_email=appointment["client_email"],
                client_name=appointment["client_name"],
                appointment_type=type_label,
                confirmed_date=appointment["proposed_date"],
                confirmed_time=appointment["proposed_time"],
                appointment_id=appointment_id,
                admin_message=data.admin_response or ""
            )
        except Exception as e:
            logging.error(f"Failed to send confirmation email: {str(e)}")
    
    elif data.status == "refused":
        try:
            send_appointment_refused_email(
                client_email=appointment["client_email"],
                client_name=appointment["client_name"],
                appointment_type=type_label,
                appointment_id=appointment_id,
                admin_message=data.admin_response or ""
            )
        except Exception as e:
            logging.error(f"Failed to send refusal email: {str(e)}")
    
    elif data.status == "rescheduled_pending":
        if not data.new_proposed_date or not data.new_proposed_time:
            raise HTTPException(status_code=400, detail="New date and time required for rescheduling")
        
        update_data["new_proposed_date"] = data.new_proposed_date
        update_data["new_proposed_time"] = data.new_proposed_time
        
        try:
            send_appointment_reschedule_email(
                client_email=appointment["client_email"],
                client_name=appointment["client_name"],
                appointment_type=type_label,
                new_date=data.new_proposed_date,
                new_time=data.new_proposed_time,
                appointment_id=appointment_id,
                confirmation_token=appointment["confirmation_token"],
                admin_message=data.admin_response or ""
            )
        except Exception as e:
            logging.error(f"Failed to send reschedule email: {str(e)}")
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    updated = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if updated.get('updated_at') and isinstance(updated['updated_at'], str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    return updated

@router.delete("/appointments/{appointment_id}")
async def delete_appointment(appointment_id: str, admin: dict = Depends(lambda: _get_current_admin)):
    """Delete an appointment (admin only)"""
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    result = await db.appointments.delete_one({"id": appointment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete appointment")
    
    return {"message": "Appointment deleted successfully", "id": appointment_id}

@router.get("/appointments/confirm/{appointment_id}/{token}")
async def confirm_rescheduled_appointment(appointment_id: str, token: str):
    """Confirm a rescheduled appointment (client clicks link in email)"""
    appointment = await db.appointments.find_one({"id": appointment_id, "confirmation_token": token}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or invalid token")
    
    if appointment["status"] != "rescheduled_pending":
        return {"message": "Ce rendez-vous a déjà été traité", "status": appointment["status"]}
    
    update_data = {
        "status": "confirmed",
        "proposed_date": appointment["new_proposed_date"],
        "proposed_time": appointment["new_proposed_time"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    type_label = appointment.get("appointment_type_label", appointment.get("appointment_type"))
    try:
        send_appointment_confirmed_email(
            client_email=appointment["client_email"],
            client_name=appointment["client_name"],
            appointment_type=type_label,
            confirmed_date=appointment["new_proposed_date"],
            confirmed_time=appointment["new_proposed_time"],
            appointment_id=appointment_id,
            admin_message=""
        )
    except Exception as e:
        logging.error(f"Failed to send final confirmation email: {str(e)}")
    
    return {
        "message": "Rendez-vous confirmé", 
        "status": "confirmed", 
        "date": appointment["new_proposed_date"], 
        "time": appointment["new_proposed_time"]
    }


# ==================== SMS REMINDER ROUTES ====================

@router.post("/appointments/send-reminders")
async def send_appointment_reminders(admin: dict = Depends(lambda: _get_current_admin)):
    """
    Send SMS reminders for appointments happening in the next 24 hours.
    This endpoint can be called by a cron job daily.
    """
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(hours=24)
    
    # Get today and tomorrow dates in YYYY-MM-DD format
    today_str = now.strftime("%Y-%m-%d")
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")
    
    # Find confirmed appointments for tomorrow that haven't received a reminder
    appointments = await db.appointments.find({
        "status": "confirmed",
        "proposed_date": tomorrow_str,
        "reminder_sent": {"$ne": True}
    }, {"_id": 0}).to_list(100)
    
    sent_count = 0
    failed_count = 0
    results = []
    
    for apt in appointments:
        client_phone = apt.get("client_phone", "")
        client_name = apt.get("client_name", "")
        appointment_date = apt.get("proposed_date", "")
        appointment_time = apt.get("proposed_time", "")
        appointment_type = apt.get("appointment_type_label", apt.get("appointment_type", "RDV"))
        
        if not client_phone:
            results.append({"id": apt["id"], "status": "skipped", "reason": "No phone number"})
            continue
        
        # Send SMS reminder
        success = send_appointment_reminder_sms(
            client_phone=client_phone,
            client_name=client_name,
            appointment_date=appointment_date,
            appointment_time=appointment_time,
            appointment_type=appointment_type
        )
        
        if success:
            # Mark reminder as sent
            await db.appointments.update_one(
                {"id": apt["id"]},
                {"$set": {
                    "reminder_sent": True,
                    "reminder_sent_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            sent_count += 1
            results.append({"id": apt["id"], "client": client_name, "status": "sent"})
        else:
            failed_count += 1
            results.append({"id": apt["id"], "client": client_name, "status": "failed"})
    
    return {
        "message": f"Rappels envoyés: {sent_count}, Échecs: {failed_count}",
        "total_found": len(appointments),
        "sent": sent_count,
        "failed": failed_count,
        "date_checked": tomorrow_str,
        "results": results
    }

@router.get("/appointments/pending-reminders")
async def get_pending_reminders(admin: dict = Depends(lambda: _get_current_admin)):
    """
    Get list of appointments that will receive reminders tomorrow.
    """
    now = datetime.now(timezone.utc)
    tomorrow = now + timedelta(hours=24)
    tomorrow_str = tomorrow.strftime("%Y-%m-%d")
    
    appointments = await db.appointments.find({
        "status": "confirmed",
        "proposed_date": tomorrow_str,
        "reminder_sent": {"$ne": True}
    }, {"_id": 0, "id": 1, "client_name": 1, "client_phone": 1, "proposed_date": 1, "proposed_time": 1, "appointment_type_label": 1}).to_list(100)
    
    return {
        "date": tomorrow_str,
        "count": len(appointments),
        "appointments": appointments
    }

@router.post("/appointments/{appointment_id}/send-reminder")
async def send_single_reminder(appointment_id: str, admin: dict = Depends(lambda: _get_current_admin)):
    """
    Manually send SMS reminder for a specific appointment.
    """
    appointment = await db.appointments.find_one({"id": appointment_id}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if appointment.get("status") != "confirmed":
        raise HTTPException(status_code=400, detail="Can only send reminders for confirmed appointments")
    
    client_phone = appointment.get("client_phone", "")
    if not client_phone:
        raise HTTPException(status_code=400, detail="No phone number for this appointment")
    
    success = send_appointment_reminder_sms(
        client_phone=client_phone,
        client_name=appointment.get("client_name", ""),
        appointment_date=appointment.get("proposed_date", ""),
        appointment_time=appointment.get("proposed_time", ""),
        appointment_type=appointment.get("appointment_type_label", appointment.get("appointment_type", "RDV"))
    )
    
    if success:
        await db.appointments.update_one(
            {"id": appointment_id},
            {"$set": {
                "reminder_sent": True,
                "reminder_sent_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Rappel SMS envoyé avec succès", "client": appointment.get("client_name")}
    else:
        raise HTTPException(status_code=500, detail="Échec de l'envoi du SMS")
