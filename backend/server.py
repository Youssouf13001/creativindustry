from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import shutil
import zipfile
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from emergentintegrations.llm.chat import LlmChat, UserMessage
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "portfolio").mkdir(exist_ok=True)
(UPLOADS_DIR / "clients").mkdir(exist_ok=True)
(UPLOADS_DIR / "galleries").mkdir(exist_ok=True)
(UPLOADS_DIR / "selections").mkdir(exist_ok=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

SECRET_KEY = os.environ.get('JWT_SECRET', 'creativindustry-secret-key-2024')
ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# ==================== EMAIL HELPER ====================

def send_email(to_email: str, subject: str, html_content: str):
    """Send an email using SMTP"""
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False

def send_file_notification_email(client_email: str, client_name: str, file_title: str, file_type: str, file_url: str):
    """Send notification email when a file is added to client space"""
    
    file_type_fr = {
        "video": "vidéo",
        "photo": "photo",
        "document": "document"
    }.get(file_type, "fichier")
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ color: #D4AF37; font-size: 24px; font-weight: bold; letter-spacing: -1px; }}
            .content {{ background-color: #111111; border: 1px solid #222222; padding: 40px; }}
            h1 {{ color: #D4AF37; font-size: 24px; margin-bottom: 20px; }}
            p {{ color: #cccccc; line-height: 1.6; margin-bottom: 15px; }}
            .file-info {{ background-color: #1a1a1a; border-left: 3px solid #D4AF37; padding: 20px; margin: 25px 0; }}
            .file-title {{ color: #ffffff; font-size: 18px; font-weight: bold; margin-bottom: 5px; }}
            .file-type {{ color: #D4AF37; font-size: 14px; text-transform: uppercase; }}
            .btn {{ display: inline-block; background-color: #D4AF37; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; }}
            .btn:hover {{ background-color: #ffffff; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">CREATIVINDUSTRY</div>
            </div>
            <div class="content">
                <h1>Nouveau fichier disponible !</h1>
                <p>Bonjour {client_name},</p>
                <p>Nous avons le plaisir de vous informer qu'un nouveau fichier a été ajouté à votre espace client.</p>
                
                <div class="file-info">
                    <div class="file-title">{file_title}</div>
                    <div class="file-type">{file_type_fr}</div>
                </div>
                
                <p>Vous pouvez dès maintenant accéder à ce fichier depuis votre espace client ou en cliquant sur le bouton ci-dessous.</p>
                
                <a href="{file_url}" class="btn">Télécharger le fichier</a>
                
                <p style="margin-top: 30px;">Vous pouvez également retrouver tous vos fichiers dans votre <a href="https://creativindustry.com/client" style="color: #D4AF37;">espace client</a>.</p>
            </div>
            <div class="footer">
                <p>© 2024 CREATIVINDUSTRY France<br>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"🎬 Nouveau fichier disponible : {file_title}"
    return send_email(client_email, subject, html_content)

def send_booking_confirmation_email(
    client_email: str, 
    client_name: str, 
    service_name: str,
    service_price: float,
    deposit_amount: float,
    event_date: str,
    booking_id: str,
    bank_details: dict
):
    """Send booking confirmation email with bank transfer details"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 40px 20px; }}
            .header {{ text-align: center; margin-bottom: 40px; }}
            .logo {{ color: #D4AF37; font-size: 24px; font-weight: bold; letter-spacing: -1px; }}
            .content {{ background-color: #111111; border: 1px solid #222222; padding: 40px; }}
            h1 {{ color: #D4AF37; font-size: 24px; margin-bottom: 20px; }}
            h2 {{ color: #ffffff; font-size: 18px; margin-top: 30px; margin-bottom: 15px; }}
            p {{ color: #cccccc; line-height: 1.6; margin-bottom: 15px; }}
            .booking-info {{ background-color: #1a1a1a; border-left: 3px solid #D4AF37; padding: 20px; margin: 25px 0; }}
            .price-box {{ background-color: #D4AF37; color: #000000; padding: 20px; text-align: center; margin: 25px 0; }}
            .price-total {{ font-size: 14px; color: #666; }}
            .price-deposit {{ font-size: 28px; font-weight: bold; }}
            .bank-details {{ background-color: #1a1a1a; padding: 20px; margin: 25px 0; border: 1px solid #333; }}
            .bank-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }}
            .bank-label {{ color: #888; }}
            .bank-value {{ color: #fff; font-weight: bold; font-family: monospace; }}
            .reference {{ background-color: #D4AF37; color: #000; padding: 10px 15px; font-weight: bold; display: inline-block; margin-top: 10px; }}
            .footer {{ text-align: center; margin-top: 40px; color: #666666; font-size: 12px; }}
            .warning {{ background-color: #332200; border: 1px solid #D4AF37; padding: 15px; margin-top: 20px; color: #ffcc00; font-size: 13px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">CREATIVINDUSTRY</div>
            </div>
            <div class="content">
                <h1>🎉 Réservation confirmée !</h1>
                <p>Bonjour {client_name},</p>
                <p>Nous avons bien reçu votre demande de réservation. Voici le récapitulatif :</p>
                
                <div class="booking-info">
                    <p><strong>Formule :</strong> {service_name}</p>
                    <p><strong>Date de l'événement :</strong> {event_date}</p>
                    <p><strong>Référence :</strong> #{booking_id[:8].upper()}</p>
                </div>
                
                <div class="price-box">
                    <div class="price-total">Prix total : {service_price:.0f}€</div>
                    <div class="price-deposit">Acompte à régler : {deposit_amount:.0f}€</div>
                    <div style="font-size: 12px; margin-top: 5px;">(30% du montant total)</div>
                </div>
                
                <h2>💳 Coordonnées bancaires pour le virement</h2>
                <div class="bank-details">
                    <div class="bank-row">
                        <span class="bank-label">Titulaire</span>
                        <span class="bank-value">{bank_details['account_holder']}</span>
                    </div>
                    <div class="bank-row">
                        <span class="bank-label">IBAN</span>
                        <span class="bank-value">{bank_details['iban']}</span>
                    </div>
                    <div class="bank-row">
                        <span class="bank-label">BIC</span>
                        <span class="bank-value">{bank_details['bic']}</span>
                    </div>
                    <div class="bank-row" style="border-bottom: none;">
                        <span class="bank-label">Référence à indiquer</span>
                        <span class="reference">CREATIVINDUSTRY-{booking_id[:8].upper()}</span>
                    </div>
                </div>
                
                <div class="warning">
                    ⚠️ <strong>Important :</strong> Merci d'indiquer la référence ci-dessus dans le motif de votre virement pour faciliter le traitement de votre réservation.
                </div>
                
                <p style="margin-top: 30px;">Dès réception de votre acompte, nous vous enverrons une confirmation définitive et prendrons contact avec vous pour finaliser les détails de votre événement.</p>
                
                <p>Pour toute question, n'hésitez pas à nous contacter.</p>
            </div>
            <div class="footer">
                <p>© 2024 CREATIVINDUSTRY France<br>
                contact@creativindustry.fr</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    subject = f"✅ Réservation #{booking_id[:8].upper()} - {service_name}"
    return send_email(client_email, subject, html_content)

def send_admin_booking_notification(
    booking_id: str,
    client_name: str,
    client_email: str,
    client_phone: str,
    service_name: str,
    service_price: float,
    deposit_amount: float,
    event_date: str
):
    """Send notification to admin about new booking"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px;">
            <h1 style="color: #D4AF37;">🎉 Nouvelle réservation !</h1>
            
            <h3>Client</h3>
            <p><strong>Nom :</strong> {client_name}</p>
            <p><strong>Email :</strong> {client_email}</p>
            <p><strong>Téléphone :</strong> {client_phone}</p>
            
            <h3>Réservation</h3>
            <p><strong>Formule :</strong> {service_name}</p>
            <p><strong>Date :</strong> {event_date}</p>
            <p><strong>Prix total :</strong> {service_price:.0f}€</p>
            <p><strong>Acompte attendu :</strong> {deposit_amount:.0f}€</p>
            <p><strong>Référence :</strong> CREATIVINDUSTRY-{booking_id[:8].upper()}</p>
            
            <p style="margin-top: 30px; padding: 15px; background: #fff3cd; border-radius: 5px;">
                ⏳ En attente du virement de l'acompte. Surveillez votre compte bancaire !
            </p>
        </div>
    </body>
    </html>
    """
    
    subject = f"🔔 Nouvelle réservation - {client_name} - {service_name}"
    return send_email(SMTP_EMAIL, subject, html_content)

# ==================== APPOINTMENT EMAIL FUNCTIONS ====================

def send_appointment_request_email(client_email: str, client_name: str, appointment_type: str, proposed_date: str, proposed_time: str, appointment_id: str):
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

def send_appointment_confirmed_email(client_email: str, client_name: str, appointment_type: str, confirmed_date: str, confirmed_time: str, appointment_id: str, admin_message: str = ""):
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

def send_appointment_refused_email(client_email: str, client_name: str, appointment_type: str, appointment_id: str, admin_message: str = ""):
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

def send_appointment_reschedule_email(client_email: str, client_name: str, appointment_type: str, new_date: str, new_time: str, appointment_id: str, confirmation_token: str, admin_message: str = ""):
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

def send_admin_appointment_notification(appointment_id: str, client_name: str, client_email: str, client_phone: str, appointment_type: str, proposed_date: str, proposed_time: str, duration: str, message: str = ""):
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

# ==================== MODELS ====================

class AdminCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class AdminResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str

class ServicePackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    features: List[str]
    category: str  # wedding, podcast, tv_set
    duration: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServicePackageCreate(BaseModel):
    name: str
    description: str
    price: float
    features: List[str]
    category: str
    duration: Optional[str] = None

class ServicePackageUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    features: Optional[List[str]] = None
    duration: Optional[str] = None
    is_active: Optional[bool] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    service_name: str
    service_category: str
    service_price: float = 0
    deposit_amount: float = 0  # Acompte (30%)
    deposit_percentage: int = 30
    event_date: str
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    message: Optional[str] = None
    status: str = "pending_payment"  # pending_payment, payment_received, confirmed, cancelled
    payment_reference: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    service_id: str
    event_date: str
    event_time: Optional[str] = None
    event_location: Optional[str] = None
    message: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[str] = None
    payment_reference: Optional[str] = None

# Bank Details Model
class BankDetails(BaseModel):
    iban: str = "FR7628233000011130178183593"
    bic: str = "REVOFRP2"
    account_holder: str = "CREATIVINDUSTRY FRANCE"
    bank_name: str = "Revolut"
    deposit_percentage: int = 30

# Appointment Models
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

class Appointment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    appointment_type: str  # contract_sign, contract_discuss, billing, project, other
    appointment_type_label: str = ""
    duration: str  # 30, 60, 90 (minutes)
    proposed_date: str
    proposed_time: str
    message: Optional[str] = None
    status: str = "pending"  # pending, confirmed, refused, rescheduled_pending, rescheduled_confirmed
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None
    confirmation_token: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

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
    status: str  # confirmed, refused, rescheduled_pending
    admin_response: Optional[str] = None
    new_proposed_date: Optional[str] = None
    new_proposed_time: Optional[str] = None

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

# ==================== WEDDING QUOTE MODELS ====================

class WeddingOption(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str  # coverage, extras, editing
    is_active: bool = True

class WeddingOptionCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str

class WeddingOptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None

class WeddingQuote(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]  # List of option IDs
    options_details: List[dict] = []  # Populated with option names and prices
    total_price: float = 0
    message: Optional[str] = None
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WeddingQuoteCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_location: Optional[str] = None
    selected_options: List[str]
    message: Optional[str] = None

# ==================== PORTFOLIO MODELS ====================

class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    media_type: str  # photo, video
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str  # wedding, podcast, tv_set
    is_featured: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str
    is_featured: bool = False

class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

# ==================== SITE CONTENT MODELS ====================

class SiteContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "main"
    # Hero Section
    hero_title: str = "Créons vos moments d'exception"
    hero_subtitle: str = "Studio de production créative pour mariages, podcasts et productions télévisées. L'excellence au service de votre vision."
    hero_image: str = "https://images.unsplash.com/photo-1673195577797-d86fd842ade8?w=1920"
    # Services
    wedding_title: str = "Mariages"
    wedding_subtitle: str = "Immortalisez votre amour"
    wedding_description: str = "Photographie et vidéographie cinématique pour immortaliser votre jour le plus précieux."
    wedding_image: str = "https://images.unsplash.com/photo-1644951565774-1b0904943820?w=800"
    podcast_title: str = "Studio Podcast"
    podcast_subtitle: str = "Votre voix, notre expertise"
    podcast_description: str = "Studio d'enregistrement professionnel équipé pour vos podcasts et interviews."
    podcast_image: str = "https://images.unsplash.com/photo-1659083725992-9d88c12e719c?w=800"
    tv_title: str = "Plateau TV"
    tv_subtitle: str = "Production professionnelle"
    tv_description: str = "Plateaux de tournage équipés pour vos productions télévisées et corporate."
    tv_image: str = "https://images.unsplash.com/photo-1643651342963-d4478284de5d?w=800"
    # Contact Info
    phone: str = "+33 1 23 45 67 89"
    email: str = "contact@creativindustry.fr"
    address: str = "123 Rue de la Création, 75001 Paris, France"
    hours: str = "Lun - Ven: 9h - 19h, Sam: Sur rendez-vous"
    # Social Links
    instagram: str = ""
    facebook: str = ""
    youtube: str = ""
    # CTA Section
    cta_title: str = "Prêt à créer quelque chose d'extraordinaire ?"
    cta_subtitle: str = "Contactez-nous pour discuter de votre projet et obtenir un devis personnalisé."

class SiteContentUpdate(BaseModel):
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    hero_image: Optional[str] = None
    wedding_title: Optional[str] = None
    wedding_subtitle: Optional[str] = None
    wedding_description: Optional[str] = None
    wedding_image: Optional[str] = None
    podcast_title: Optional[str] = None
    podcast_subtitle: Optional[str] = None
    podcast_description: Optional[str] = None
    podcast_image: Optional[str] = None
    tv_title: Optional[str] = None
    tv_subtitle: Optional[str] = None
    tv_description: Optional[str] = None
    tv_image: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    hours: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    cta_title: Optional[str] = None
    cta_subtitle: Optional[str] = None

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, user_type: str = "admin") -> str:
    payload = {
        "sub": user_id,
        "type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        user_type = payload.get("type", "admin")
        if user_type != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
        if not admin:
            raise HTTPException(status_code=401, detail="Admin not found")
        return admin
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_client(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        client_id = payload.get("sub")
        user_type = payload.get("type", "admin")
        if user_type != "client":
            raise HTTPException(status_code=403, detail="Client access required")
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=401, detail="Client not found")
        return client
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def verify_token(token: str):
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

def verify_client_token(token: str):
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

# ==================== CLIENT MODELS ====================

class ClientCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class ClientLogin(BaseModel):
    email: EmailStr
    password: str

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None

class ClientFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str  # video, photo, document
    file_url: str  # External URL (Google Drive, Dropbox, YouTube)
    thumbnail_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientFileCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    file_type: str
    file_url: str
    thumbnail_url: Optional[str] = None

# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: str  # user, assistant
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    session_id: str
    message: str

# ==================== GALLERY MODELS (Photo Selection) ====================

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
    name: str  # Event name like "Mariage 15 juin"
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
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SelectionUpdate(BaseModel):
    selected_photo_ids: List[str]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=dict)
async def register_admin(data: AdminCreate):
    existing = await db.admins.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    token = create_token(admin_id, "admin")
    return {"token": token, "admin": {"id": admin_id, "email": data.email, "name": data.name}}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(admin["id"], "admin")
    return {"token": token, "admin": {"id": admin["id"], "email": admin["email"], "name": admin["name"]}}

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(id=admin["id"], email=admin["email"], name=admin["name"])

# ==================== CLIENT AUTH ROUTES ====================

@api_router.post("/client/register", response_model=dict)
async def register_client(data: ClientCreate):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    token = create_token(client_id, "client")
    return {"token": token, "client": {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone}}

@api_router.post("/client/login", response_model=dict)
async def login_client(data: ClientLogin):
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    if not client or not verify_password(data.password, client["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_token(client["id"], "client")
    return {"token": token, "client": {"id": client["id"], "email": client["email"], "name": client["name"], "phone": client.get("phone")}}

@api_router.get("/client/me", response_model=ClientResponse)
async def get_client_me(client: dict = Depends(get_current_client)):
    return ClientResponse(id=client["id"], email=client["email"], name=client["name"], phone=client.get("phone"))

# ==================== CLIENT FILES ROUTES ====================

@api_router.get("/client/files", response_model=List[ClientFile])
async def get_client_files(client: dict = Depends(get_current_client)):
    files = await db.client_files.find({"client_id": client["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return files

@api_router.post("/client/files", response_model=ClientFile)
async def create_client_file(data: ClientFileCreate, admin: dict = Depends(get_current_admin)):
    # Verify client exists
    client_data = await db.clients.find_one({"id": data.client_id}, {"_id": 0})
    if not client_data:
        raise HTTPException(status_code=404, detail="Client not found")
    
    file = ClientFile(**data.model_dump())
    doc = file.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.client_files.insert_one(doc)
    
    # Send email notification to client
    try:
        send_file_notification_email(
            client_email=client_data["email"],
            client_name=client_data["name"],
            file_title=data.title,
            file_type=data.file_type,
            file_url=data.file_url
        )
    except Exception as e:
        logging.error(f"Failed to send notification email: {str(e)}")
    
    return file

@api_router.delete("/client/files/{file_id}")
async def delete_client_file(file_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.client_files.delete_one({"id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted"}

# ==================== ADMIN CLIENT MANAGEMENT ====================

@api_router.get("/admin/clients", response_model=List[ClientResponse])
async def get_all_clients(admin: dict = Depends(get_current_admin)):
    clients = await db.clients.find({}, {"_id": 0, "password": 0}).to_list(500)
    return clients

@api_router.post("/admin/clients", response_model=dict)
async def create_client_by_admin(data: ClientCreate, admin: dict = Depends(get_current_admin)):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.clients.insert_one(client_doc)
    return {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone}

@api_router.get("/admin/clients/{client_id}/files", response_model=List[ClientFile])
async def get_client_files_admin(client_id: str, admin: dict = Depends(get_current_admin)):
    files = await db.client_files.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        if isinstance(f.get('created_at'), str):
            f['created_at'] = datetime.fromisoformat(f['created_at'])
    return files

# ==================== SITE CONTENT ROUTES ====================

@api_router.get("/content")
async def get_site_content():
    content = await db.site_content.find_one({"id": "main"}, {"_id": 0})
    if not content:
        # Return default content
        default = SiteContent()
        return default.model_dump()
    return content

@api_router.put("/content")
async def update_site_content(data: SiteContentUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Upsert the content
    await db.site_content.update_one(
        {"id": "main"},
        {"$set": update_data},
        upsert=True
    )
    
    content = await db.site_content.find_one({"id": "main"}, {"_id": 0})
    return content

# ==================== PORTFOLIO ADMIN ROUTES ====================

@api_router.get("/admin/portfolio", response_model=List[PortfolioItem])
async def get_all_portfolio(admin: dict = Depends(get_current_admin)):
    items = await db.portfolio.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/admin/portfolio", response_model=PortfolioItem)
async def create_portfolio_item(data: PortfolioItemCreate, admin: dict = Depends(get_current_admin)):
    item = PortfolioItem(**data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.portfolio.insert_one(doc)
    return item

@api_router.put("/admin/portfolio/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(item_id: str, data: PortfolioItemUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.portfolio.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.portfolio.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.delete("/admin/portfolio/{item_id}")
async def delete_portfolio_item(item_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.portfolio.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ==================== FILE UPLOAD ROUTES ====================

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"]
MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1 GB

@api_router.post("/upload/portfolio")
async def upload_portfolio_file(
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    """Upload a file for portfolio (images or videos)"""
    # Check file type
    content_type = file.content_type
    if content_type not in ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOADS_DIR / "portfolio" / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    # Determine media type
    media_type = "photo" if content_type in ALLOWED_IMAGE_TYPES else "video"
    
    # Return URL
    file_url = f"/uploads/portfolio/{unique_filename}"
    return {
        "url": file_url,
        "filename": unique_filename,
        "media_type": media_type,
        "original_name": file.filename
    }

@api_router.post("/upload/content")
async def upload_content_image(
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    """Upload an image for site content (hero, services, etc.)"""
    # Check file type - only images for content
    content_type = file.content_type
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP ou GIF.")
    
    # Create content folder if not exists
    content_folder = UPLOADS_DIR / "content"
    content_folder.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = content_folder / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    # Return URL
    file_url = f"/uploads/content/{unique_filename}"
    return {
        "url": file_url,
        "filename": unique_filename,
        "original_name": file.filename
    }

@api_router.post("/upload/client/{client_id}")
async def upload_client_file(
    client_id: str,
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(""),
    admin: dict = Depends(get_current_admin)
):
    """Upload a file for a client (images or videos)"""
    # Verify client exists
    client_data = await db.clients.find_one({"id": client_id})
    if not client_data:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Check file type
    content_type = file.content_type
    if content_type not in ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM ou MOV.")
    
    # Create client folder if not exists
    client_folder = UPLOADS_DIR / "clients" / client_id
    client_folder.mkdir(exist_ok=True)
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = client_folder / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    # Determine file type
    file_type = "photo" if content_type in ALLOWED_IMAGE_TYPES else "video"
    
    # Create file record
    file_url = f"/uploads/clients/{client_id}/{unique_filename}"
    file_record = ClientFile(
        client_id=client_id,
        title=title,
        description=description,
        file_type=file_type,
        file_url=file_url,
        thumbnail_url=file_url if file_type == "photo" else ""
    )
    
    doc = file_record.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.client_files.insert_one(doc)
    
    # Send notification email
    try:
        send_file_notification_email(
            client_email=client_data["email"],
            client_name=client_data["name"],
            file_title=title,
            file_type=file_type,
            file_url=file_url
        )
    except Exception as e:
        logging.error(f"Failed to send notification email: {str(e)}")
    
    return {
        "id": file_record.id,
        "url": file_url,
        "filename": unique_filename,
        "file_type": file_type,
        "title": title
    }

@api_router.delete("/upload/file")
async def delete_uploaded_file(file_path: str, admin: dict = Depends(get_current_admin)):
    """Delete an uploaded file from the server"""
    # Security check - only allow deleting files in uploads directory
    if not file_path.startswith("/uploads/"):
        raise HTTPException(status_code=400, detail="Chemin de fichier invalide")
    
    full_path = ROOT_DIR / file_path.lstrip("/")
    if full_path.exists():
        full_path.unlink()
        return {"message": "Fichier supprimé"}
    else:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")

# ==================== BANK DETAILS ROUTES ====================

@api_router.get("/bank-details")
async def get_bank_details():
    """Get bank details for payment"""
    details = await db.settings.find_one({"key": "bank_details"}, {"_id": 0})
    if not details:
        # Return default bank details
        return BankDetails().model_dump()
    return details.get("value", BankDetails().model_dump())

@api_router.put("/bank-details")
async def update_bank_details(data: BankDetails, admin: dict = Depends(get_current_admin)):
    """Update bank details (admin only)"""
    await db.settings.update_one(
        {"key": "bank_details"},
        {"$set": {"key": "bank_details", "value": data.model_dump()}},
        upsert=True
    )
    return data.model_dump()

# ==================== APPOINTMENT ROUTES ====================

@api_router.get("/appointment-types")
async def get_appointment_types():
    """Get available appointment types"""
    return {"types": APPOINTMENT_TYPES, "durations": APPOINTMENT_DURATIONS}

@api_router.post("/appointments", response_model=Appointment)
async def create_appointment(data: AppointmentCreate):
    """Create a new appointment request"""
    # Find type label
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

@api_router.get("/appointments", response_model=List[Appointment])
async def get_appointments(status: Optional[str] = None, admin: dict = Depends(get_current_admin)):
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

@api_router.put("/appointments/{appointment_id}", response_model=Appointment)
async def update_appointment(appointment_id: str, data: AppointmentAdminUpdate, admin: dict = Depends(get_current_admin)):
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
        # Send confirmation email
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
        # Send refusal email
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
        
        # Send reschedule email with confirmation link
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

@api_router.get("/appointments/confirm/{appointment_id}/{token}")
async def confirm_rescheduled_appointment(appointment_id: str, token: str):
    """Confirm a rescheduled appointment (client clicks link in email)"""
    appointment = await db.appointments.find_one({"id": appointment_id, "confirmation_token": token}, {"_id": 0})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found or invalid token")
    
    if appointment["status"] != "rescheduled_pending":
        return {"message": "Ce rendez-vous a déjà été traité", "status": appointment["status"]}
    
    # Update status to confirmed with new date
    update_data = {
        "status": "confirmed",
        "proposed_date": appointment["new_proposed_date"],
        "proposed_time": appointment["new_proposed_time"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.appointments.update_one({"id": appointment_id}, {"$set": update_data})
    
    # Send final confirmation email
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
    
    return {"message": "Rendez-vous confirmé", "status": "confirmed", "date": appointment["new_proposed_date"], "time": appointment["new_proposed_time"]}

# ==================== CHATBOT ROUTES ====================

@api_router.post("/chat")
async def chat_with_bot(data: ChatRequest):
    try:
        # Get chat history for this session
        history = await db.chat_messages.find({"session_id": data.session_id}, {"_id": 0}).sort("created_at", 1).to_list(50)
        
        # Build messages for context
        messages_for_llm = []
        for msg in history[-10:]:  # Last 10 messages for context
            messages_for_llm.append({"role": msg["role"], "content": msg["content"]})
        
        # Initialize chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=data.session_id,
            system_message="""Tu es l'assistant virtuel de CREATIVINDUSTRY France, un studio de production créative spécialisé dans :
- La photographie et vidéographie de mariage
- Les studios podcast
- Les plateaux TV

Tu dois répondre en français de manière professionnelle et chaleureuse. 
Tu aides les visiteurs à :
- Comprendre nos services et tarifs
- Les orienter vers la bonne formule
- Répondre aux questions sur le processus de réservation
- Donner des informations sur le studio

Services principaux :
- Mariages : Formules de 1500€ à 4500€ (Essentielle, Complète, Premium)
- Podcast : Location studio de 150€/h à 700€/jour
- Plateau TV : De 800€ à 3500€ selon les besoins

Si tu ne sais pas répondre à une question spécifique, invite le visiteur à nous contacter directement ou à demander un devis personnalisé."""
        ).with_model("openai", "gpt-4o")
        
        # Save user message
        user_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "role": "user",
            "content": data.message,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(user_msg)
        
        # Get response from AI
        user_message = UserMessage(text=data.message)
        response = await chat.send_message(user_message)
        
        # Save assistant message
        assistant_msg = {
            "id": str(uuid.uuid4()),
            "session_id": data.session_id,
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.chat_messages.insert_one(assistant_msg)
        
        return {"response": response, "session_id": data.session_id}
    except Exception as e:
        logging.error(f"Chat error: {str(e)}")
        return {"response": "Désolé, je rencontre un problème technique. Veuillez nous contacter directement au +33 1 23 45 67 89 ou par email à contact@creativindustry.fr", "session_id": data.session_id}

@api_router.get("/chat/{session_id}/history")
async def get_chat_history(session_id: str):
    messages = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return messages

# ==================== SERVICES ROUTES ====================

@api_router.get("/services", response_model=List[ServicePackage])
async def get_services(category: Optional[str] = None, active_only: bool = True):
    query = {}
    if category:
        query["category"] = category
    if active_only:
        query["is_active"] = True
    
    services = await db.services.find(query, {"_id": 0}).to_list(100)
    for s in services:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    return services

@api_router.get("/services/{service_id}", response_model=ServicePackage)
async def get_service(service_id: str):
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return service

@api_router.post("/services", response_model=ServicePackage)
async def create_service(data: ServicePackageCreate, admin: dict = Depends(get_current_admin)):
    service = ServicePackage(**data.model_dump())
    doc = service.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.services.insert_one(doc)
    return service

@api_router.put("/services/{service_id}", response_model=ServicePackage)
async def update_service(service_id: str, data: ServicePackageUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.services.update_one({"id": service_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    
    service = await db.services.find_one({"id": service_id}, {"_id": 0})
    if isinstance(service.get('created_at'), str):
        service['created_at'] = datetime.fromisoformat(service['created_at'])
    return service

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

# ==================== BOOKINGS ROUTES ====================

@api_router.post("/bookings", response_model=Booking)
async def create_booking(data: BookingCreate):
    service = await db.services.find_one({"id": data.service_id}, {"_id": 0})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Get bank details for deposit calculation
    bank_settings = await db.settings.find_one({"key": "bank_details"}, {"_id": 0})
    if bank_settings:
        bank_details = bank_settings.get("value", BankDetails().model_dump())
    else:
        bank_details = BankDetails().model_dump()
    
    deposit_percentage = bank_details.get("deposit_percentage", 30)
    service_price = service["price"]
    deposit_amount = service_price * deposit_percentage / 100
    
    booking = Booking(
        **data.model_dump(),
        service_name=service["name"],
        service_category=service["category"],
        service_price=service_price,
        deposit_amount=deposit_amount,
        deposit_percentage=deposit_percentage,
        status="pending_payment"
    )
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.bookings.insert_one(doc)
    
    # Send confirmation email to client with bank details
    try:
        send_booking_confirmation_email(
            client_email=data.client_email,
            client_name=data.client_name,
            service_name=service["name"],
            service_price=service_price,
            deposit_amount=deposit_amount,
            event_date=data.event_date,
            booking_id=booking.id,
            bank_details=bank_details
        )
    except Exception as e:
        logging.error(f"Failed to send booking confirmation email: {str(e)}")
    
    # Send notification to admin
    try:
        send_admin_booking_notification(
            booking_id=booking.id,
            client_name=data.client_name,
            client_email=data.client_email,
            client_phone=data.client_phone,
            service_name=service["name"],
            service_price=service_price,
            deposit_amount=deposit_amount,
            event_date=data.event_date
        )
    except Exception as e:
        logging.error(f"Failed to send admin notification: {str(e)}")
    
    return booking

@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(status: Optional[str] = None, admin: dict = Depends(get_current_admin)):
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for b in bookings:
        if isinstance(b.get('created_at'), str):
            b['created_at'] = datetime.fromisoformat(b['created_at'])
    return bookings

@api_router.put("/bookings/{booking_id}", response_model=Booking)
async def update_booking(booking_id: str, data: BookingUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.bookings.update_one({"id": booking_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if isinstance(booking.get('created_at'), str):
        booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    return booking

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact", response_model=ContactMessage)
async def create_contact(data: ContactMessageCreate):
    message = ContactMessage(**data.model_dump())
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.contacts.insert_one(doc)
    return message

@api_router.get("/contact", response_model=List[ContactMessage])
async def get_contacts(admin: dict = Depends(get_current_admin)):
    contacts = await db.contacts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for c in contacts:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return contacts

@api_router.put("/contact/{contact_id}/read")
async def mark_contact_read(contact_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.contacts.update_one({"id": contact_id}, {"$set": {"is_read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Marked as read"}

# ==================== WEDDING OPTIONS ROUTES ====================

@api_router.get("/wedding-options", response_model=List[WeddingOption])
async def get_wedding_options(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    options = await db.wedding_options.find(query, {"_id": 0}).to_list(100)
    return options

@api_router.post("/wedding-options", response_model=WeddingOption)
async def create_wedding_option(data: WeddingOptionCreate, admin: dict = Depends(get_current_admin)):
    option = WeddingOption(**data.model_dump())
    await db.wedding_options.insert_one(option.model_dump())
    return option

@api_router.put("/wedding-options/{option_id}", response_model=WeddingOption)
async def update_wedding_option(option_id: str, data: WeddingOptionUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.wedding_options.update_one({"id": option_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    option = await db.wedding_options.find_one({"id": option_id}, {"_id": 0})
    return option

@api_router.delete("/wedding-options/{option_id}")
async def delete_wedding_option(option_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.wedding_options.delete_one({"id": option_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Option not found")
    return {"message": "Option deleted"}

# ==================== WEDDING QUOTES ROUTES ====================

@api_router.post("/wedding-quotes", response_model=WeddingQuote)
async def create_wedding_quote(data: WeddingQuoteCreate):
    options = await db.wedding_options.find({"id": {"$in": data.selected_options}}, {"_id": 0}).to_list(100)
    options_details = [{"id": o["id"], "name": o["name"], "price": o["price"], "category": o.get("category", "")} for o in options]
    total_price = sum(o["price"] for o in options)
    
    quote = WeddingQuote(
        **data.model_dump(),
        options_details=options_details,
        total_price=total_price
    )
    doc = quote.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.wedding_quotes.insert_one(doc)
    
    # Send notification email to admin addresses
    admin_emails = ["contact@creativindustry.com", "communication@creativindustry.com"]
    
    # Build options HTML
    options_html = ""
    for opt in options_details:
        options_html += f"<tr><td style='padding: 8px; border-bottom: 1px solid #333;'>{opt['name']}</td><td style='padding: 8px; border-bottom: 1px solid #333; text-align: right;'>{opt['price']}€</td></tr>"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><style>
        body {{ font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; }}
        .header {{ background: linear-gradient(135deg, #d4af37, #f5e6a3); padding: 30px; text-align: center; }}
        .header h1 {{ color: #000; margin: 0; font-size: 24px; }}
        .content {{ padding: 30px; }}
        .info-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #333; }}
        .label {{ color: #888; }}
        .value {{ color: #fff; font-weight: bold; }}
        .total {{ background: #d4af37; color: #000; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin-top: 20px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th {{ text-align: left; padding: 10px; background: #222; color: #d4af37; }}
    </style></head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💒 Nouvelle Demande de Devis Mariage</h1>
            </div>
            <div class="content">
                <h2 style="color: #d4af37; margin-bottom: 20px;">Informations Client</h2>
                <div class="info-row"><span class="label">Nom</span><span class="value">{data.client_name}</span></div>
                <div class="info-row"><span class="label">Email</span><span class="value">{data.client_email}</span></div>
                <div class="info-row"><span class="label">Téléphone</span><span class="value">{data.client_phone}</span></div>
                <div class="info-row"><span class="label">Date du mariage</span><span class="value">{data.event_date}</span></div>
                <div class="info-row"><span class="label">Lieu</span><span class="value">{data.event_location or 'Non précisé'}</span></div>
                
                <h2 style="color: #d4af37; margin: 30px 0 20px;">Prestations Sélectionnées</h2>
                <table>
                    <tr><th>Prestation</th><th style="text-align: right;">Prix</th></tr>
                    {options_html}
                </table>
                
                <div class="total">TOTAL: {total_price}€</div>
                
                {f'<div style="margin-top: 20px; padding: 15px; background: #222;"><strong>Message du client:</strong><br>{data.message}</div>' if data.message else ''}
                
                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    Connectez-vous à votre admin pour gérer cette demande.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to both admin emails
    for admin_email in admin_emails:
        try:
            send_email(admin_email, f"💒 Nouveau Devis Mariage - {data.client_name} ({total_price}€)", html_content)
        except Exception as e:
            logging.error(f"Error sending email to {admin_email}: {e}")
    
    return quote

@api_router.get("/wedding-quotes", response_model=List[WeddingQuote])
async def get_wedding_quotes(admin: dict = Depends(get_current_admin)):
    quotes = await db.wedding_quotes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for q in quotes:
        if isinstance(q.get('created_at'), str):
            q['created_at'] = datetime.fromisoformat(q['created_at'])
    return quotes

@api_router.put("/wedding-quotes/{quote_id}/status")
async def update_wedding_quote_status(quote_id: str, status: str, admin: dict = Depends(get_current_admin)):
    result = await db.wedding_quotes.update_one({"id": quote_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"message": "Status updated"}

@api_router.get("/wedding-quotes/{quote_id}", response_model=dict)
async def get_wedding_quote_detail(quote_id: str, admin: dict = Depends(get_current_admin)):
    quote = await db.wedding_quotes.find_one({"id": quote_id}, {"_id": 0})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Keep created_at as string for JSON serialization
    
    # Group options by category
    options_by_category = {}
    for opt in quote.get('options_details', []):
        category = opt.get('category', 'other')
        if category not in options_by_category:
            options_by_category[category] = []
        options_by_category[category].append(opt)
    
    quote['options_by_category'] = options_by_category
    
    return quote

# ==================== PORTFOLIO ROUTES ====================

@api_router.get("/portfolio", response_model=List[PortfolioItem])
async def get_portfolio(category: Optional[str] = None, media_type: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if media_type:
        query["media_type"] = media_type
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/portfolio", response_model=PortfolioItem)
async def create_portfolio_item(data: PortfolioItemCreate, admin: dict = Depends(get_current_admin)):
    item = PortfolioItem(**data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.portfolio.insert_one(doc)
    return item

@api_router.put("/portfolio/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(item_id: str, data: PortfolioItemUpdate, admin: dict = Depends(get_current_admin)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.portfolio.update_one({"id": item_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.portfolio.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item.get('created_at'), str):
        item['created_at'] = datetime.fromisoformat(item['created_at'])
    return item

@api_router.delete("/portfolio/{item_id}")
async def delete_portfolio_item(item_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.portfolio.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}

# ==================== STATS ROUTE ====================

@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_bookings = await db.bookings.count_documents({})
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    confirmed_bookings = await db.bookings.count_documents({"status": "confirmed"})
    unread_messages = await db.contacts.count_documents({"is_read": False})
    total_services = await db.services.count_documents({"is_active": True})
    pending_quotes = await db.wedding_quotes.count_documents({"status": "pending"})
    
    return {
        "total_bookings": total_bookings,
        "pending_bookings": pending_bookings,
        "confirmed_bookings": confirmed_bookings,
        "unread_messages": unread_messages,
        "total_services": total_services,
        "pending_quotes": pending_quotes
    }

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    existing = await db.services.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    services = [
        # Wedding packages
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Essentielle",
            "description": "Capturer les moments essentiels de votre journée avec élégance",
            "price": 1500,
            "features": ["6 heures de couverture", "300+ photos retouchées", "Galerie privée en ligne", "Livraison sous 4 semaines"],
            "category": "wedding",
            "duration": "6 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Complète",
            "description": "Une couverture complète de votre mariage du début à la fin",
            "price": 2800,
            "features": ["10 heures de couverture", "500+ photos retouchées", "Film teaser 3 min", "Album photo 30 pages", "Livraison sous 6 semaines"],
            "category": "wedding",
            "duration": "10 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Formule Premium",
            "description": "L'expérience ultime pour immortaliser chaque instant",
            "price": 4500,
            "features": ["Couverture journée entière", "800+ photos retouchées", "Film cinématique 10 min", "Album luxe 50 pages", "Séance engagement incluse", "Second photographe"],
            "category": "wedding",
            "duration": "Journée complète",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # Podcast packages
        {
            "id": str(uuid.uuid4()),
            "name": "Studio 1 Heure",
            "description": "Idéal pour les épisodes courts ou les interviews",
            "price": 150,
            "features": ["1 heure de studio", "Équipement audio pro", "2 micros inclus", "Assistance technique"],
            "category": "podcast",
            "duration": "1 heure",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Studio Demi-Journée",
            "description": "Parfait pour enregistrer plusieurs épisodes",
            "price": 400,
            "features": ["4 heures de studio", "Équipement audio pro", "4 micros inclus", "Montage audio basique", "Assistance technique dédiée"],
            "category": "podcast",
            "duration": "4 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Studio Journée",
            "description": "Location complète pour vos productions ambitieuses",
            "price": 700,
            "features": ["8 heures de studio", "Équipement complet", "6 micros + caméras", "Montage audio complet", "Équipe technique sur place"],
            "category": "podcast",
            "duration": "8 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        # TV Set packages
        {
            "id": str(uuid.uuid4()),
            "name": "Plateau Standard",
            "description": "Un espace professionnel pour vos tournages",
            "price": 800,
            "features": ["Demi-journée de plateau", "Éclairage professionnel", "Fond vert disponible", "Loge maquillage"],
            "category": "tv_set",
            "duration": "4 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Plateau Équipé",
            "description": "Plateau complet avec équipement technique inclus",
            "price": 1500,
            "features": ["Journée complète", "3 caméras 4K", "Régie vidéo", "Éclairage LED", "Prompteur", "Technicien inclus"],
            "category": "tv_set",
            "duration": "8 heures",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Production Complète",
            "description": "Service clé en main pour vos productions télévisées",
            "price": 3500,
            "features": ["2 jours de plateau", "Équipe technique complète", "Réalisation incluse", "Post-production", "Livraison fichiers masters"],
            "category": "tv_set",
            "duration": "2 jours",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.services.insert_many(services)
    
    # Seed wedding options for quote builder
    existing_options = await db.wedding_options.count_documents({})
    if existing_options == 0:
        wedding_options = [
            # Coverage options
            {"id": str(uuid.uuid4()), "name": "Préparatifs Mariée", "description": "Couverture des préparatifs de la mariée", "price": 300, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Préparatifs Marié", "description": "Couverture des préparatifs du marié", "price": 250, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Civile", "description": "Couverture de la mairie", "price": 400, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Religieuse", "description": "Couverture de la cérémonie religieuse", "price": 500, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Cérémonie Laïque", "description": "Couverture de la cérémonie laïque", "price": 450, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Vin d'honneur", "description": "Couverture du cocktail", "price": 350, "category": "coverage", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Soirée & Réception", "description": "Couverture de la soirée dansante", "price": 600, "category": "coverage", "is_active": True},
            # Extras
            {"id": str(uuid.uuid4()), "name": "Drone", "description": "Prises de vue aériennes par drone", "price": 400, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Second Photographe", "description": "Un photographe supplémentaire", "price": 500, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Séance Couple", "description": "Séance photo en extérieur le jour J", "price": 300, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Séance Engagement", "description": "Séance photo avant le mariage", "price": 350, "category": "extras", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Photobooth", "description": "Installation photobooth pour vos invités", "price": 450, "category": "extras", "is_active": True},
            # Editing/Deliverables
            {"id": str(uuid.uuid4()), "name": "Film Teaser 3min", "description": "Montage vidéo court et dynamique", "price": 600, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Film Cinématique 10min", "description": "Film complet de votre journée", "price": 1200, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Album Photo 30 pages", "description": "Album premium personnalisé", "price": 400, "category": "editing", "is_active": True},
            {"id": str(uuid.uuid4()), "name": "Album Photo 50 pages", "description": "Album luxe grand format", "price": 650, "category": "editing", "is_active": True},
        ]
        await db.wedding_options.insert_many(wedding_options)
    
    # Seed portfolio items
    existing_portfolio = await db.portfolio.count_documents({})
    if existing_portfolio == 0:
        portfolio_items = [
            # Wedding photos
            {"id": str(uuid.uuid4()), "title": "Mariage Élégant à Paris", "description": "Un mariage intime dans un château parisien", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Mariage Champêtre", "description": "Célébration en pleine nature", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Préparatifs de la Mariée", "description": "Moments intimes avant la cérémonie", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1594552072238-5c4cebd833d7?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Échange des Vœux", "description": "L'émotion de la cérémonie", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Première Danse", "description": "Un moment magique", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Détails & Décoration", "description": "L'art dans les détails", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # Wedding videos (YouTube embeds as examples)
            {"id": str(uuid.uuid4()), "title": "Film de Mariage - Sophie & Thomas", "description": "Un mariage romantique en Provence", "media_type": "video", "media_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=400", "category": "wedding", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "title": "Teaser - Marie & Jean", "description": "3 minutes d'émotion pure", "media_type": "video", "media_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "thumbnail_url": "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400", "category": "wedding", "is_featured": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # Podcast photos
            {"id": str(uuid.uuid4()), "title": "Notre Studio Podcast", "description": "Équipement professionnel", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800", "category": "podcast", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            # TV Set photos
            {"id": str(uuid.uuid4()), "title": "Plateau TV Principal", "description": "Notre espace de tournage", "media_type": "photo", "media_url": "https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=800", "category": "tv_set", "is_featured": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.portfolio.insert_many(portfolio_items)
    
    return {"message": "Data seeded successfully", "services_created": len(services)}

# ==================== GALLERY ROUTES (Photo Selection System) ====================

# Helper function to send selection notification email
def send_selection_notification_email(admin_email: str, client_name: str, gallery_name: str, photo_count: int):
    """Send notification email when a client validates their photo selection"""
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><style>
        body {{ font-family: Arial, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: #111; border: 1px solid #333; }}
        .header {{ background: linear-gradient(135deg, #d4af37, #f5e6a3); padding: 30px; text-align: center; }}
        .header h1 {{ color: #000; margin: 0; font-size: 24px; }}
        .content {{ padding: 30px; }}
        .highlight {{ color: #d4af37; font-weight: bold; }}
        .info-box {{ background: #1a1a1a; border: 1px solid #d4af37; padding: 20px; margin: 20px 0; text-align: center; }}
        .info-box .number {{ font-size: 48px; color: #d4af37; font-weight: bold; }}
    </style></head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📸 Nouvelle Sélection de Photos</h1>
            </div>
            <div class="content">
                <p>Bonjour,</p>
                <p>Le client <span class="highlight">{client_name}</span> a validé sa sélection de photos pour :</p>
                <div class="info-box">
                    <p style="margin: 0; font-size: 18px;">{gallery_name}</p>
                    <p class="number">{photo_count}</p>
                    <p style="margin: 0; color: #888;">photos sélectionnées</p>
                </div>
                <p>Connectez-vous à votre espace admin pour voir les photos sélectionnées et commencer le travail de retouche.</p>
                <p style="color: #888; font-size: 12px; margin-top: 30px;">— L'équipe CREATIVINDUSTRY</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    send_email(admin_email, f"📸 Sélection validée - {client_name} ({gallery_name})", html_content)

# Admin: Get all galleries
@api_router.get("/admin/galleries", response_model=List[dict])
async def get_all_galleries(credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    galleries = await db.galleries.find().to_list(1000)
    for g in galleries:
        g.pop("_id", None)
        # Get client info
        client = await db.clients.find_one({"id": g["client_id"]})
        if client:
            g["client_name"] = client.get("name", "")
            g["client_email"] = client.get("email", "")
        # Get selection info
        selection = await db.photo_selections.find_one({"gallery_id": g["id"]})
        if selection:
            g["selection_count"] = len(selection.get("selected_photo_ids", []))
            g["is_validated"] = selection.get("is_validated", False)
        else:
            g["selection_count"] = 0
            g["is_validated"] = False
    return galleries

# Admin: Create a gallery for a client
@api_router.post("/admin/galleries", response_model=dict)
async def create_gallery(data: GalleryCreate, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    gallery = Gallery(
        client_id=data.client_id,
        name=data.name,
        description=data.description
    )
    
    gallery_dict = gallery.model_dump()
    gallery_dict["created_at"] = gallery_dict["created_at"].isoformat()
    await db.galleries.insert_one(gallery_dict)
    gallery_dict.pop("_id", None)
    
    return gallery_dict

# Admin: Upload photos to a gallery
@api_router.post("/admin/galleries/{gallery_id}/photos", response_model=dict)
async def upload_gallery_photo(
    gallery_id: str,
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    verify_token(credentials.credentials)
    
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    # Check file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not supported")
    
    # Save file
    file_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{file_id}{ext}"
    file_path = UPLOADS_DIR / "galleries" / filename
    
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    photo = {
        "id": file_id,
        "url": f"/uploads/galleries/{filename}",
        "filename": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add photo to gallery
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$push": {"photos": photo}}
    )
    
    return {"message": "Photo uploaded", "photo": photo}

# Admin: Delete a photo from a gallery
@api_router.delete("/admin/galleries/{gallery_id}/photos/{photo_id}", response_model=dict)
async def delete_gallery_photo(
    gallery_id: str,
    photo_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    verify_token(credentials.credentials)
    
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    # Find and remove photo
    photo_to_delete = None
    for photo in gallery.get("photos", []):
        if photo["id"] == photo_id:
            photo_to_delete = photo
            break
    
    if not photo_to_delete:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete file from disk
    file_path = UPLOADS_DIR / "galleries" / Path(photo_to_delete["url"]).name
    if file_path.exists():
        file_path.unlink()
    
    # Remove from database
    await db.galleries.update_one(
        {"id": gallery_id},
        {"$pull": {"photos": {"id": photo_id}}}
    )
    
    # Also remove from any selections
    await db.photo_selections.update_many(
        {"gallery_id": gallery_id},
        {"$pull": {"selected_photo_ids": photo_id}}
    )
    
    return {"message": "Photo deleted"}

# Admin: Delete a gallery
@api_router.delete("/admin/galleries/{gallery_id}", response_model=dict)
async def delete_gallery(gallery_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    # Delete all photos from disk
    for photo in gallery.get("photos", []):
        file_path = UPLOADS_DIR / "galleries" / Path(photo["url"]).name
        if file_path.exists():
            file_path.unlink()
    
    # Delete gallery and its selections
    await db.galleries.delete_one({"id": gallery_id})
    await db.photo_selections.delete_many({"gallery_id": gallery_id})
    
    return {"message": "Gallery deleted"}

# Admin: Get selection for a gallery
@api_router.get("/admin/galleries/{gallery_id}/selection", response_model=dict)
async def get_gallery_selection_admin(gallery_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id})
    if not selection:
        return {"selected_photo_ids": [], "is_validated": False, "photos": []}
    
    selection.pop("_id", None)
    
    # Get selected photos details
    selected_photos = [p for p in gallery.get("photos", []) if p["id"] in selection.get("selected_photo_ids", [])]
    selection["photos"] = selected_photos
    
    return selection

# Admin: Download selected photos as ZIP
@api_router.get("/admin/galleries/{gallery_id}/download-selection")
async def download_gallery_selection(gallery_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    verify_token(credentials.credentials)
    
    gallery = await db.galleries.find_one({"id": gallery_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id})
    if not selection or len(selection.get("selected_photo_ids", [])) == 0:
        raise HTTPException(status_code=400, detail="No photos selected")
    
    # Get selected photos
    selected_photos = [p for p in gallery.get("photos", []) if p["id"] in selection.get("selected_photo_ids", [])]
    
    if not selected_photos:
        raise HTTPException(status_code=400, detail="No photos to download")
    
    # Create ZIP file
    zip_filename = f"selection_{gallery_id[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = UPLOADS_DIR / "selections" / zip_filename
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for idx, photo in enumerate(selected_photos, 1):
            # Get original filename or create one
            original_filename = photo.get("filename", f"photo_{idx}.jpg")
            # Add index prefix for ordering
            archive_name = f"{idx:03d}_{original_filename}"
            
            # Get file path
            file_path = UPLOADS_DIR / "galleries" / Path(photo["url"]).name
            
            if file_path.exists():
                zipf.write(file_path, archive_name)
    
    # Get client name for the filename
    client = await db.clients.find_one({"id": gallery.get("client_id")})
    client_name = client.get("name", "client").replace(" ", "_") if client else "client"
    gallery_name = gallery.get("name", "galerie").replace(" ", "_")
    
    download_filename = f"Selection_{client_name}_{gallery_name}.zip"
    
    return FileResponse(
        path=str(zip_path),
        filename=download_filename,
        media_type="application/zip"
    )

# Client: Get my galleries
@api_router.get("/client/galleries", response_model=List[dict])
async def get_client_galleries(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_client_token(credentials.credentials)
    client_id = payload["sub"]
    
    galleries = await db.galleries.find({"client_id": client_id, "is_active": True}).to_list(100)
    for g in galleries:
        g.pop("_id", None)
        g["photo_count"] = len(g.get("photos", []))
        # Get selection info
        selection = await db.photo_selections.find_one({"gallery_id": g["id"], "client_id": client_id})
        if selection:
            g["selection_count"] = len(selection.get("selected_photo_ids", []))
            g["is_validated"] = selection.get("is_validated", False)
        else:
            g["selection_count"] = 0
            g["is_validated"] = False
    return galleries

# Client: Get a gallery with photos
@api_router.get("/client/galleries/{gallery_id}", response_model=dict)
async def get_client_gallery(gallery_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_client_token(credentials.credentials)
    client_id = payload["sub"]
    
    gallery = await db.galleries.find_one({"id": gallery_id, "client_id": client_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    gallery.pop("_id", None)
    
    # Get current selection
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id, "client_id": client_id})
    if selection:
        gallery["selected_photo_ids"] = selection.get("selected_photo_ids", [])
        gallery["is_validated"] = selection.get("is_validated", False)
    else:
        gallery["selected_photo_ids"] = []
        gallery["is_validated"] = False
    
    return gallery

# Client: Save/update selection
@api_router.post("/client/galleries/{gallery_id}/selection", response_model=dict)
async def save_selection(
    gallery_id: str, 
    data: SelectionUpdate, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    payload = verify_client_token(credentials.credentials)
    client_id = payload["sub"]
    
    gallery = await db.galleries.find_one({"id": gallery_id, "client_id": client_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    # Verify all photo IDs exist in gallery
    gallery_photo_ids = [p["id"] for p in gallery.get("photos", [])]
    for photo_id in data.selected_photo_ids:
        if photo_id not in gallery_photo_ids:
            raise HTTPException(status_code=400, detail=f"Photo {photo_id} not in gallery")
    
    # Update or create selection
    existing = await db.photo_selections.find_one({"gallery_id": gallery_id, "client_id": client_id})
    
    if existing:
        await db.photo_selections.update_one(
            {"gallery_id": gallery_id, "client_id": client_id},
            {"$set": {
                "selected_photo_ids": data.selected_photo_ids,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        selection = PhotoSelection(
            client_id=client_id,
            gallery_id=gallery_id,
            selected_photo_ids=data.selected_photo_ids
        )
        selection_dict = selection.model_dump()
        selection_dict["updated_at"] = selection_dict["updated_at"].isoformat()
        await db.photo_selections.insert_one(selection_dict)
    
    return {"message": "Selection saved", "count": len(data.selected_photo_ids)}

# Client: Validate selection (final confirmation)
@api_router.post("/client/galleries/{gallery_id}/validate", response_model=dict)
async def validate_selection(gallery_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = verify_client_token(credentials.credentials)
    client_id = payload["sub"]
    
    gallery = await db.galleries.find_one({"id": gallery_id, "client_id": client_id})
    if not gallery:
        raise HTTPException(status_code=404, detail="Gallery not found")
    
    selection = await db.photo_selections.find_one({"gallery_id": gallery_id, "client_id": client_id})
    if not selection or len(selection.get("selected_photo_ids", [])) == 0:
        raise HTTPException(status_code=400, detail="No photos selected")
    
    # Mark as validated
    await db.photo_selections.update_one(
        {"gallery_id": gallery_id, "client_id": client_id},
        {"$set": {
            "is_validated": True,
            "validated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get client info for email
    client = await db.clients.find_one({"id": client_id})
    
    # Send notification email to admin
    admin = await db.admins.find_one({})  # Get first admin
    if admin and SMTP_EMAIL:
        send_selection_notification_email(
            admin.get("email", SMTP_EMAIL),
            client.get("name", "Client"),
            gallery.get("name", "Galerie"),
            len(selection.get("selected_photo_ids", []))
        )
    
    return {"message": "Selection validated", "count": len(selection.get("selected_photo_ids", []))}

@api_router.get("/")
async def root():
    return {"message": "CREATIVINDUSTRY France API"}

app.include_router(api_router)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
