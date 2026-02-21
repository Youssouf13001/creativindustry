from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, Request
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
import io
import secrets
import base64
import subprocess
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import pyotp
import qrcode
from io import BytesIO
from emergentintegrations.llm.chat import LlmChat, UserMessage
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

# Import models early to avoid circular imports
from models.schemas import AdminCreate, AdminUpdate, AdminResponse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "portfolio").mkdir(exist_ok=True)
(UPLOADS_DIR / "clients").mkdir(exist_ok=True)
(UPLOADS_DIR / "galleries").mkdir(exist_ok=True)
(UPLOADS_DIR / "selections").mkdir(exist_ok=True)
# New folders for client file transfers
(UPLOADS_DIR / "client_transfers").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "music").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "documents").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "photos").mkdir(exist_ok=True)
(UPLOADS_DIR / "client_transfers" / "videos").mkdir(exist_ok=True)

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


async def send_newsletter_notification(media_type: str, title: str, media_url: str = ""):
    """Send newsletter notification to all subscribed clients when new video/story is published"""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logging.warning("SMTP not configured - skipping newsletter")
        return
    
    # Get all subscribed clients
    subscribers = await db.clients.find(
        {"newsletter_subscribed": True},
        {"_id": 0, "email": 1, "name": 1, "id": 1}
    ).to_list(1000)
    
    if not subscribers:
        logging.info("No newsletter subscribers")
        return
    
    # Determine content type
    if media_type == "story":
        type_label = "Story"
        emoji = "📱"
        description = "Une nouvelle story est disponible !"
    else:
        type_label = "Vidéo"
        emoji = "🎬"
        description = "Une nouvelle vidéo est disponible !"
    
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    
    for subscriber in subscribers:
        try:
            unsubscribe_link = f"{site_url}/unsubscribe/{subscriber['id']}"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #000; font-size: 24px;">{emoji} Nouveau contenu !</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 18px; margin-bottom: 10px;">Bonjour {subscriber.get('name', 'Client')},</p>
                        <p style="color: #ccc; margin-bottom: 20px;">{description}</p>
                        <div style="background-color: #3a3a3a; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #888;">Nouveau contenu</p>
                            <p style="margin: 10px 0 0 0; font-size: 20px; font-weight: bold; color: #D4AF37;">{title}</p>
                            <p style="margin: 5px 0 0 0; font-size: 14px; color: #888;">Type: {type_label}</p>
                        </div>
                        <a href="{site_url}/portfolio" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                            Voir maintenant →
                        </a>
                    </div>
                    <div style="padding: 20px; background-color: #222; text-align: center; border-top: 1px solid #333;">
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            CREATIVINDUSTRY France<br>
                            <a href="{unsubscribe_link}" style="color: #888; text-decoration: underline;">Se désabonner</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            send_email(subscriber['email'], f"{emoji} {type_label} : {title} - CREATIVINDUSTRY", html_content)
            logging.info(f"Newsletter sent to {subscriber['email']}")
            
        except Exception as e:
            logging.error(f"Failed to send newsletter to {subscriber['email']}: {e}")


def send_email_with_attachment(to_email: str, subject: str, html_content: str, attachment_data: bytes, attachment_filename: str):
    """Send email with PDF attachment"""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logging.warning("SMTP credentials not configured")
        return False
    
    try:
        msg = MIMEMultipart()
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach HTML body
        msg.attach(MIMEText(html_content, 'html'))
        
        # Attach PDF
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment_data)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
        msg.attach(part)
        
        # Send email using STARTTLS (port 587)
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email with attachment sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email with attachment: {str(e)}")
        return False

def generate_quote_pdf(quote_data: dict, options_details: list) -> bytes:
    """Generate a professional PDF quote"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#d4af37'), alignment=TA_CENTER, spaceAfter=20)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=12, textColor=colors.HexColor('#666666'), alignment=TA_CENTER, spaceAfter=30)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#d4af37'), spaceBefore=20, spaceAfter=10)
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=11, spaceAfter=5)
    
    elements = []
    
    # Header
    elements.append(Paragraph("CREATIVINDUSTRY France", title_style))
    elements.append(Paragraph("Devis Mariage", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Quote reference
    ref_date = datetime.now().strftime("%d/%m/%Y")
    quote_id = quote_data.get('id', '')[:8].upper()
    elements.append(Paragraph(f"<b>Référence:</b> #{quote_id} | <b>Date:</b> {ref_date}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Client info section
    elements.append(Paragraph("Informations Client", heading_style))
    
    client_data = [
        ["Nom:", quote_data.get('client_name', '')],
        ["Email:", quote_data.get('client_email', '')],
        ["Téléphone:", quote_data.get('client_phone', '')],
        ["Date du mariage:", quote_data.get('event_date', '')],
        ["Lieu:", quote_data.get('event_location', '') or 'Non précisé'],
    ]
    
    client_table = Table(client_data, colWidths=[4*cm, 12*cm])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#666666')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 20))
    
    # Prestations section
    elements.append(Paragraph("Prestations Sélectionnées", heading_style))
    
    # Table header
    prestations_data = [["Prestation", "Prix"]]
    
    # Group by category
    categories = {'coverage': '📸 Couverture', 'extras': '✨ Options', 'editing': '🎬 Livrables', 'other': 'Autres'}
    options_by_cat = {}
    for opt in options_details:
        cat = opt.get('category', 'other')
        if cat not in options_by_cat:
            options_by_cat[cat] = []
        options_by_cat[cat].append(opt)
    
    for cat, cat_label in categories.items():
        if cat in options_by_cat:
            prestations_data.append([cat_label, ""])
            for opt in options_by_cat[cat]:
                prestations_data.append([f"   {opt['name']}", f"{opt['price']} €"])
    
    # Total
    total = sum(opt['price'] for opt in options_details)
    prestations_data.append(["TOTAL", f"{total} €"])
    
    prestations_table = Table(prestations_data, colWidths=[12*cm, 4*cm])
    prestations_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#d4af37')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        # Body
        ('FONTSIZE', (0, 1), (-1, -2), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        # Category rows (bold)
        ('FONTNAME', (0, 1), (0, -2), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, 1), (0, -2), colors.HexColor('#d4af37')),
        # Total row
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#d4af37')),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.black),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, -1), (-1, -1), 14),
    ]))
    elements.append(prestations_table)
    elements.append(Spacer(1, 30))
    
    # Message if any
    if quote_data.get('message'):
        elements.append(Paragraph("Message du Client", heading_style))
        elements.append(Paragraph(f"<i>\"{quote_data['message']}\"</i>", normal_style))
        elements.append(Spacer(1, 20))
    
    # Footer
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.HexColor('#888888'), alignment=TA_CENTER, spaceBefore=30)
    elements.append(Paragraph("─" * 50, footer_style))
    elements.append(Paragraph("CREATIVINDUSTRY France", footer_style))
    elements.append(Paragraph("contact@creativindustry.com | communication@creativindustry.com", footer_style))
    elements.append(Paragraph(f"Devis valable 30 jours à compter du {ref_date}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.read()

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
# Main models are imported from models/schemas.py

class AdminLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None  # Code MFA si activé

# MFA Models
class MFASetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code image
    backup_codes: List[str]

class MFAVerifyRequest(BaseModel):
    totp_code: str

class MFADisableRequest(BaseModel):
    password: str
    totp_code: Optional[str] = None
    backup_code: Optional[str] = None
    email_code: Optional[str] = None  # Code reçu par email

class MFAResetRequest(BaseModel):
    backup_code: str

class MFAEmailResetRequest(BaseModel):
    email: EmailStr

class MFAEmailResetVerify(BaseModel):
    email: EmailStr
    reset_code: str

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
    media_type: str  # photo, video, story
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str  # wedding, podcast, tv_set
    client_name: Optional[str] = None  # Nom du client pour regroupement
    cover_photo: Optional[str] = None  # Photo de couverture pour le client
    is_featured: bool = False
    is_active: bool = True
    story_duration: Optional[int] = 3  # Durée en secondes pour les stories (1-10)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    media_type: str
    media_url: str
    thumbnail_url: Optional[str] = None
    category: str
    client_name: Optional[str] = None
    cover_photo: Optional[str] = None
    is_featured: bool = False
    story_duration: Optional[int] = 3

class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    media_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    client_name: Optional[str] = None
    cover_photo: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    story_duration: Optional[int] = None

# ==================== STORY VIEWS MODELS ====================

class StoryView(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    story_id: str
    viewer_type: str  # "client" or "anonymous"
    viewer_id: Optional[str] = None  # Client ID if logged in
    viewer_name: Optional[str] = None  # Client name if logged in
    viewed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_hash: Optional[str] = None  # Hashed IP for anonymous deduplication

class StoryViewStats(BaseModel):
    total_views: int
    unique_views: int
    client_views: List[dict]  # List of {name, viewed_at}
    anonymous_views: int

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
    profile_photo: Optional[str] = None
    newsletter_subscribed: Optional[bool] = True
    must_change_password: Optional[bool] = False
    devis_id: Optional[str] = None  # Linked devis from devis site
    expires_at: Optional[str] = None  # Account expiration date (6 months from creation)
    extension_requested: Optional[bool] = False
    extension_paid: Optional[bool] = False

class ExtensionRequest(BaseModel):
    payment_method: str  # "card", "transfer"
    
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


# ==================== CLIENT DOCUMENTS (Admin uploaded invoices/quotes) ====================

class ClientDocument(BaseModel):
    """Document (invoice/quote) uploaded by admin for a client"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_email: str
    document_type: str  # "invoice" or "quote"
    title: str
    description: Optional[str] = None
    amount: float
    file_url: str
    filename: str
    status: str = "pending"  # pending, paid, partial
    paid_amount: float = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    due_date: Optional[str] = None


# ==================== INTEGRATION MODELS (from Devis site) ====================

class IntegrationCreateClient(BaseModel):
    """Model for creating client from devis site when devis is accepted"""
    email: str
    name: str
    phone: Optional[str] = None
    devis_id: str
    devis_data: dict  # Full devis data
    event_date: Optional[str] = None
    event_type: Optional[str] = None
    total_amount: float
    api_key: str  # Secret key for authentication between sites


class IntegrationSyncDevis(BaseModel):
    """Model for syncing devis updates"""
    client_email: str
    devis_id: str
    devis_data: dict
    status: str  # pending, accepted, rejected
    total_amount: float
    api_key: str


class IntegrationSyncInvoice(BaseModel):
    """Model for syncing invoice from devis site"""
    client_email: str
    devis_id: str
    invoice_id: str
    invoice_number: str
    invoice_date: str
    amount: float
    pdf_url: Optional[str] = None
    pdf_data: Optional[str] = None  # Base64 encoded PDF
    api_key: str


class IntegrationSyncPayment(BaseModel):
    """Model for syncing payment from devis site"""
    client_email: str
    devis_id: str
    payment_id: str
    amount: float
    payment_date: str
    payment_method: Optional[str] = None
    api_key: str


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

# MFA Helper Functions
def generate_mfa_secret():
    return pyotp.random_base32()

def generate_backup_codes(count=8):
    """Generate backup codes for MFA recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]

def verify_totp(secret: str, code: str) -> bool:
    """Verify a TOTP code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)  # Allow 30 seconds window

def generate_qr_code(secret: str, email: str) -> str:
    """Generate QR code for authenticator app"""
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="CREATIVINDUSTRY France")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

# REMOVED: Public admin registration endpoint for security
# Admin accounts can only be created by existing admins from the admin dashboard

@api_router.post("/admin/create-admin", response_model=dict)
async def create_admin_account(data: AdminCreate, admin: dict = Depends(get_current_admin)):
    """Create a new admin account - Only accessible by existing admins with 'complet' role"""
    # Check if current admin has permission
    if admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent créer des comptes")
    
    existing = await db.admins.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "allowed_tabs": data.allowed_tabs if data.role != "complet" else [],
        "is_active": True,
        "mfa_enabled": False,
        "mfa_secret": None,
        "backup_codes": [],
        "created_by": admin.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    
    logging.info(f"New admin account created: {data.email} with role {data.role} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Compte administrateur créé avec succès",
        "admin": {
            "id": admin_id, 
            "email": data.email, 
            "name": data.name,
            "role": data.role,
            "allowed_tabs": admin_doc["allowed_tabs"],
            "is_active": True
        }
    }

@api_router.get("/admin/admins-list")
async def get_admins_list(admin: dict = Depends(get_current_admin)):
    """Get list of all admin accounts - Only accessible by existing admins"""
    admins = await db.admins.find(
        {},
        {"_id": 0, "id": 1, "email": 1, "name": 1, "mfa_enabled": 1, "created_at": 1, "created_by": 1, "role": 1, "allowed_tabs": 1, "is_active": 1}
    ).to_list(100)
    # Ensure defaults for older accounts
    for a in admins:
        if "role" not in a:
            a["role"] = "complet"
        if "allowed_tabs" not in a:
            a["allowed_tabs"] = []
        if "is_active" not in a:
            a["is_active"] = True
    return admins

@api_router.put("/admin/update-admin/{admin_id}")
async def update_admin_account(admin_id: str, data: AdminUpdate, admin: dict = Depends(get_current_admin)):
    """Update an admin account - Only accessible by admins with 'complet' role"""
    # Check if current admin has permission (can update self, or must be complet to update others)
    is_self = admin_id == admin.get("id")
    if not is_self and admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent modifier d'autres comptes")
    
    target_admin = await db.admins.find_one({"id": admin_id})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.role is not None and not is_self:  # Can't change own role
        update_data["role"] = data.role
    if data.allowed_tabs is not None:
        update_data["allowed_tabs"] = data.allowed_tabs
    if data.is_active is not None and not is_self:  # Can't deactivate self
        update_data["is_active"] = data.is_active
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.admins.update_one({"id": admin_id}, {"$set": update_data})
    
    updated_admin = await db.admins.find_one({"id": admin_id}, {"_id": 0, "password": 0, "mfa_secret": 0, "backup_codes": 0})
    
    logging.info(f"Admin account updated: {target_admin.get('email')} by {admin.get('email')}")
    
    return {"success": True, "admin": updated_admin}

@api_router.delete("/admin/delete-admin/{admin_id}")
async def delete_admin_account(admin_id: str, admin: dict = Depends(get_current_admin)):
    """Delete an admin account - Cannot delete yourself"""
    if admin.get("role", "complet") != "complet":
        raise HTTPException(status_code=403, detail="Seuls les administrateurs complets peuvent supprimer des comptes")
    
    if admin_id == admin.get("id"):
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    
    # Check if admin exists
    target_admin = await db.admins.find_one({"id": admin_id})
    if not target_admin:
        raise HTTPException(status_code=404, detail="Administrateur non trouvé")
    
    # Check if it's the last admin
    admin_count = await db.admins.count_documents({})
    if admin_count <= 1:
        raise HTTPException(status_code=400, detail="Impossible de supprimer le dernier administrateur")
    
    await db.admins.delete_one({"id": admin_id})
    logging.info(f"Admin account deleted: {target_admin.get('email')} by {admin.get('email')}")
    
    return {"success": True, "message": "Compte administrateur supprimé"}

@api_router.post("/auth/login", response_model=dict)
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if account is active
    if not admin.get("is_active", True):
        raise HTTPException(status_code=401, detail="Ce compte est désactivé")
    
    # Check if MFA is enabled
    mfa_enabled = admin.get("mfa_enabled", False)
    
    if mfa_enabled:
        if not data.totp_code:
            # Return that MFA is required
            return {"mfa_required": True, "message": "Code MFA requis"}
        
        # Verify TOTP code or backup code
        mfa_secret = admin.get("mfa_secret")
        backup_codes = admin.get("backup_codes", [])
        
        is_valid_totp = verify_totp(mfa_secret, data.totp_code)
        is_valid_backup = data.totp_code.upper() in [code.upper() for code in backup_codes]
        
        if not is_valid_totp and not is_valid_backup:
            raise HTTPException(status_code=401, detail="Code MFA invalide")
        
        # If backup code used, remove it
        if is_valid_backup:
            backup_codes = [code for code in backup_codes if code.upper() != data.totp_code.upper()]
            await db.admins.update_one({"id": admin["id"]}, {"$set": {"backup_codes": backup_codes}})
    
    token = create_token(admin["id"], "admin")
    return {
        "token": token, 
        "admin": {
            "id": admin["id"], 
            "email": admin["email"], 
            "name": admin["name"],
            "mfa_enabled": mfa_enabled,
            "role": admin.get("role", "complet"),
            "allowed_tabs": admin.get("allowed_tabs", [])
        }
    }

@api_router.get("/auth/me", response_model=AdminResponse)
async def get_me(admin: dict = Depends(get_current_admin)):
    return AdminResponse(
        id=admin["id"], 
        email=admin["email"], 
        name=admin["name"],
        mfa_enabled=admin.get("mfa_enabled", False),
        role=admin.get("role", "complet"),
        allowed_tabs=admin.get("allowed_tabs", []),
        is_active=admin.get("is_active", True)
    )

# ==================== MFA ROUTES ====================

@api_router.post("/auth/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(admin: dict = Depends(get_current_admin)):
    """Generate MFA secret and QR code for setup"""
    if admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA déjà activé")
    
    # Generate new secret
    secret = generate_mfa_secret()
    backup_codes = generate_backup_codes()
    
    # Generate QR code
    qr_code = generate_qr_code(secret, admin["email"])
    
    # Store secret temporarily (not enabled yet)
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_secret": secret, "backup_codes": backup_codes}}
    )
    
    return MFASetupResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )

@api_router.post("/auth/mfa/verify")
async def verify_mfa_setup(data: MFAVerifyRequest, admin: dict = Depends(get_current_admin)):
    """Verify TOTP code and enable MFA"""
    mfa_secret = admin.get("mfa_secret")
    
    if not mfa_secret:
        raise HTTPException(status_code=400, detail="Veuillez d'abord configurer MFA")
    
    if not verify_totp(mfa_secret, data.totp_code):
        raise HTTPException(status_code=401, detail="Code invalide")
    
    # Enable MFA
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_enabled": True}}
    )
    
    return {"success": True, "message": "MFA activé avec succès"}

@api_router.post("/auth/mfa/disable")
async def disable_mfa(data: MFADisableRequest, admin: dict = Depends(get_current_admin)):
    """Disable MFA (requires password and TOTP or backup code)"""
    if not admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA n'est pas activé")
    
    # Verify password
    admin_full = await db.admins.find_one({"id": admin["id"]}, {"_id": 0})
    if not verify_password(data.password, admin_full["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe incorrect")
    
    # Verify TOTP or backup code
    mfa_secret = admin_full.get("mfa_secret")
    backup_codes = admin_full.get("backup_codes", [])
    
    is_valid = False
    if data.totp_code and verify_totp(mfa_secret, data.totp_code):
        is_valid = True
    elif data.backup_code and data.backup_code.upper() in [code.upper() for code in backup_codes]:
        is_valid = True
    
    if not is_valid:
        raise HTTPException(status_code=401, detail="Code MFA ou code de secours invalide")
    
    # Disable MFA
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"mfa_enabled": False, "mfa_secret": None, "backup_codes": [], "mfa_reset_code": None, "mfa_reset_expiry": None}}
    )
    
    return {"success": True, "message": "MFA désactivé"}

@api_router.post("/auth/mfa/backup-codes")
async def regenerate_backup_codes(data: MFAVerifyRequest, admin: dict = Depends(get_current_admin)):
    """Regenerate backup codes (requires valid TOTP)"""
    if not admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA n'est pas activé")
    
    mfa_secret = admin.get("mfa_secret")
    if not verify_totp(mfa_secret, data.totp_code):
        raise HTTPException(status_code=401, detail="Code invalide")
    
    # Generate new backup codes
    new_backup_codes = generate_backup_codes()
    
    await db.admins.update_one(
        {"id": admin["id"]},
        {"$set": {"backup_codes": new_backup_codes}}
    )
    
    return {"backup_codes": new_backup_codes}

@api_router.get("/auth/mfa/status")
async def get_mfa_status(admin: dict = Depends(get_current_admin)):
    """Get MFA status and remaining backup codes count"""
    admin_full = await db.admins.find_one({"id": admin["id"]}, {"_id": 0})
    backup_codes = admin_full.get("backup_codes", [])
    
    return {
        "mfa_enabled": admin_full.get("mfa_enabled", False),
        "backup_codes_remaining": len(backup_codes)
    }

@api_router.post("/auth/mfa/send-reset-email")
async def send_mfa_reset_email(data: MFAEmailResetRequest):
    """Send MFA reset code via email (for when user loses phone and backup codes)"""
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin:
        # Don't reveal if email exists
        return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}
    
    if not admin.get("mfa_enabled"):
        raise HTTPException(status_code=400, detail="MFA n'est pas activé sur ce compte")
    
    # Generate reset code (6 digits)
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc).timestamp() + 900  # 15 minutes
    
    # Store reset code
    await db.admins.update_one(
        {"email": data.email},
        {"$set": {"mfa_reset_code": reset_code, "mfa_reset_expiry": expiry}}
    )
    
    # Send email
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER')
        smtp_pass = os.environ.get('SMTP_PASS')
        
        if smtp_user and smtp_pass:
            msg = MIMEMultipart()
            msg['From'] = smtp_user
            msg['To'] = data.email
            msg['Subject'] = "🔐 Code de réinitialisation MFA - CREATIVINDUSTRY France"
            
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #D4AF37; margin-bottom: 20px;">🔐 Réinitialisation MFA</h1>
                    <p>Vous avez demandé un code pour désactiver la double authentification sur votre compte.</p>
                    <div style="background-color: #3a3a3a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">{reset_code}</span>
                    </div>
                    <p style="color: #888;">Ce code expire dans <strong>15 minutes</strong>.</p>
                    <p style="color: #888;">Si vous n'avez pas demandé ce code, ignorez cet email et votre compte restera sécurisé.</p>
                    <hr style="border-color: #444; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">CREATIVINDUSTRY France - Sécurité du compte</p>
                </div>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
            
            logging.info(f"MFA reset email sent to {data.email}")
    except Exception as e:
        logging.error(f"Failed to send MFA reset email: {e}")
        # Don't fail the request, just log the error
    
    return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}

@api_router.post("/auth/mfa/verify-reset-email")
async def verify_mfa_reset_email(data: MFAEmailResetVerify):
    """Verify email reset code and disable MFA"""
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Code invalide ou expiré")
    
    stored_code = admin.get("mfa_reset_code")
    expiry = admin.get("mfa_reset_expiry", 0)
    
    if not stored_code or stored_code != data.reset_code:
        raise HTTPException(status_code=401, detail="Code invalide")
    
    if datetime.now(timezone.utc).timestamp() > expiry:
        raise HTTPException(status_code=401, detail="Code expiré")
    
    # Disable MFA
    await db.admins.update_one(
        {"email": data.email},
        {"$set": {
            "mfa_enabled": False, 
            "mfa_secret": None, 
            "backup_codes": [],
            "mfa_reset_code": None,
            "mfa_reset_expiry": None
        }}
    )
    
    return {"success": True, "message": "MFA désactivé avec succès. Vous pouvez maintenant vous connecter."}


# ==================== PASSWORD RESET ====================

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetVerify(BaseModel):
    email: str
    reset_code: str
    new_password: str

@api_router.post("/auth/password/request-reset")
async def request_password_reset(data: PasswordResetRequest):
    """Send password reset code via email"""
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to not reveal if email exists
    if not admin:
        return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}
    
    # Generate reset code (6 digits)
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc).timestamp() + 1800  # 30 minutes
    
    # Store reset code
    await db.admins.update_one(
        {"email": data.email},
        {"$set": {"password_reset_code": reset_code, "password_reset_expiry": expiry}}
    )
    
    # Send email
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_pass = os.environ.get('SMTP_PASSWORD')
        
        if smtp_email and smtp_pass:
            msg = MIMEMultipart()
            msg['From'] = smtp_email
            msg['To'] = data.email
            msg['Subject'] = "🔑 Réinitialisation de mot de passe - CREATIVINDUSTRY France"
            
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #D4AF37; margin-bottom: 20px;">🔑 Réinitialisation de mot de passe</h1>
                    <p>Vous avez demandé à réinitialiser votre mot de passe administrateur.</p>
                    <p>Voici votre code de vérification :</p>
                    <div style="background-color: #3a3a3a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">{reset_code}</span>
                    </div>
                    <p style="color: #888;">Ce code expire dans <strong>30 minutes</strong>.</p>
                    <p style="color: #888;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.</p>
                    <hr style="border-color: #444; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">CREATIVINDUSTRY France - Sécurité du compte</p>
                </div>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_pass)
                server.send_message(msg)
            
            logging.info(f"Password reset email sent to {data.email}")
    except Exception as e:
        logging.error(f"Failed to send password reset email: {e}")
    
    return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}


@api_router.post("/auth/password/reset")
async def reset_password(data: PasswordResetVerify):
    """Verify code and reset password"""
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Code invalide ou expiré")
    
    stored_code = admin.get("password_reset_code")
    expiry = admin.get("password_reset_expiry", 0)
    
    if not stored_code or stored_code != data.reset_code:
        raise HTTPException(status_code=401, detail="Code invalide")
    
    if datetime.now(timezone.utc).timestamp() > expiry:
        raise HTTPException(status_code=401, detail="Code expiré")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Update password
    await db.admins.update_one(
        {"email": data.email},
        {"$set": {
            "password": hash_password(data.new_password),
            "password_reset_code": None,
            "password_reset_expiry": None
        }}
    )
    
    logging.info(f"Password reset successful for {data.email}")
    return {"success": True, "message": "Mot de passe modifié avec succès. Vous pouvez maintenant vous connecter."}

# ==================== CLIENT AUTH ROUTES ====================

@api_router.post("/client/register", response_model=dict)
async def register_client(data: ClientCreate):
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    
    client_id = str(uuid.uuid4())
    # Set expiration date to 6 months from now
    expires_at = (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
    
    client_doc = {
        "id": client_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "phone": data.phone,
        "newsletter_subscribed": True,  # Auto-subscribe to newsletter
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
        "extension_requested": False,
        "extension_paid": False
    }
    await db.clients.insert_one(client_doc)
    token = create_token(client_id, "client")
    return {"token": token, "client": {"id": client_id, "email": data.email, "name": data.name, "phone": data.phone, "expires_at": expires_at}}

@api_router.post("/client/login", response_model=dict)
async def login_client(data: ClientLogin):
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    if not client or not verify_password(data.password, client["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    # Update last_login
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(client["id"], "client")
    return {
        "token": token, 
        "client": {
            "id": client["id"], 
            "email": client["email"], 
            "name": client["name"], 
            "phone": client.get("phone"),
            "must_change_password": client.get("must_change_password", False),
            "expires_at": client.get("expires_at")
        }
    }

@api_router.get("/client/me", response_model=ClientResponse)
async def get_client_me(client: dict = Depends(get_current_client)):
    # Fetch full client data from database to get profile_photo
    full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    if full_client:
        return ClientResponse(
            id=full_client["id"],
            email=full_client["email"], 
            name=full_client["name"], 
            phone=full_client.get("phone"),
            profile_photo=full_client.get("profile_photo"),
            newsletter_subscribed=full_client.get("newsletter_subscribed", True),
            must_change_password=full_client.get("must_change_password", False)
        )
    return ClientResponse(id=client["id"], email=client["email"], name=client["name"], phone=client.get("phone"))


# ==================== CLIENT PROFILE MANAGEMENT ====================

class ClientProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class ClientPasswordChange(BaseModel):
    current_password: str
    new_password: str

class ClientPasswordResetRequest(BaseModel):
    email: str

class ClientPasswordResetVerify(BaseModel):
    email: str
    reset_code: str
    new_password: str


@api_router.put("/client/profile")
async def update_client_profile(data: ClientProfileUpdate, client: dict = Depends(get_current_client)):
    """Update client profile (name, phone)"""
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.clients.update_one({"id": client["id"]}, {"$set": update_data})
    
    # Get updated client
    updated_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    return {"success": True, "client": updated_client}


@api_router.post("/client/profile/photo")
async def upload_client_photo(
    file: UploadFile = File(...),
    client: dict = Depends(get_current_client)
):
    """Upload client profile photo"""
    # Check file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG ou WEBP.")
    
    # Create client folder
    client_folder = UPLOADS_DIR / "clients" / client["id"]
    client_folder.mkdir(exist_ok=True, parents=True)
    
    # Save file
    file_ext = Path(file.filename).suffix.lower()
    photo_filename = f"profile{file_ext}"
    file_path = client_folder / photo_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    # Update client with photo URL
    photo_url = f"/uploads/clients/{client['id']}/{photo_filename}"
    await db.clients.update_one({"id": client["id"]}, {"$set": {"profile_photo": photo_url}})
    
    return {"success": True, "photo_url": photo_url}


class NewsletterPreferenceUpdate(BaseModel):
    subscribed: bool


@api_router.put("/client/newsletter")
async def update_newsletter_preference(data: NewsletterPreferenceUpdate, client: dict = Depends(get_current_client)):
    """Update client newsletter subscription preference"""
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"newsletter_subscribed": data.subscribed}}
    )
    
    action = "abonné" if data.subscribed else "désabonné"
    logging.info(f"Client {client['id']} {action} de la newsletter")
    
    return {
        "success": True, 
        "newsletter_subscribed": data.subscribed,
        "message": f"Vous êtes maintenant {action} de la newsletter"
    }


# ==================== ACCOUNT EXTENSION SYSTEM ====================

@api_router.get("/client/account-status")
async def get_client_account_status(client: dict = Depends(get_current_client)):
    """Get client account status including expiration info"""
    full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
    
    expires_at = full_client.get("expires_at")
    if not expires_at:
        # Set default expiration for old accounts (6 months from now)
        expires_at = (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
        await db.clients.update_one({"id": client["id"]}, {"$set": {"expires_at": expires_at}})
    
    # Calculate days remaining
    try:
        expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        days_remaining = (expiry_date - now).days
    except:
        days_remaining = 180
    
    # Check for pending extension orders
    pending_order = await db.extension_orders.find_one({
        "client_id": client["id"],
        "status": "pending"
    }, {"_id": 0})
    
    return {
        "expires_at": expires_at,
        "days_remaining": max(0, days_remaining),
        "is_expired": days_remaining <= 0,
        "extension_price": 20,
        "extension_days": 60,
        "pending_order": pending_order
    }


@api_router.post("/client/request-extension")
async def request_account_extension(client: dict = Depends(get_current_client)):
    """Request a 2-month account extension for 20€"""
    
    # Check if there's already a pending order
    existing_order = await db.extension_orders.find_one({
        "client_id": client["id"],
        "status": "pending"
    })
    if existing_order:
        raise HTTPException(status_code=400, detail="Vous avez déjà une demande d'extension en attente")
    
    # Create extension order
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "client_id": client["id"],
        "client_email": client.get("email"),
        "client_name": client.get("name"),
        "amount": 20.00,
        "extension_days": 60,
        "status": "pending",  # pending, paid, cancelled
        "payment_method": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "paid_at": None
    }
    await db.extension_orders.insert_one(order)
    
    # Get bank details for transfer
    bank_details = await db.bank_details.find_one({}, {"_id": 0})
    
    # Send email notification to admin
    try:
        full_client = await db.clients.find_one({"id": client["id"]}, {"_id": 0, "password": 0})
        admin_emails = [a["email"] for a in await db.admins.find({}, {"email": 1}).to_list(10)]
        
        for admin_email in admin_emails:
            await send_email(
                to_email=admin_email,
                subject=f"Nouvelle demande d'extension - {full_client.get('name')}",
                html_content=f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d4af37;">Nouvelle demande d'extension</h2>
                    <p><strong>Client:</strong> {full_client.get('name')}</p>
                    <p><strong>Email:</strong> {full_client.get('email')}</p>
                    <p><strong>Montant:</strong> 20€</p>
                    <p><strong>Extension:</strong> 2 mois</p>
                    <p><strong>ID Commande:</strong> {order_id[:8]}</p>
                    <p style="color: #888; margin-top: 20px;">Connectez-vous au panneau admin pour valider le paiement.</p>
                </div>
                """
            )
    except Exception as e:
        logging.error(f"Failed to send extension request email: {e}")
    
    return {
        "success": True,
        "order_id": order_id,
        "amount": 20.00,
        "message": "Votre demande d'extension a été enregistrée",
        "bank_details": bank_details,
        "instructions": "Effectuez le virement de 20€ avec la référence indiquée. Votre compte sera prolongé de 2 mois après validation du paiement."
    }


@api_router.delete("/client/cancel-extension")
async def cancel_extension_request(client: dict = Depends(get_current_client)):
    """Cancel a pending extension request"""
    result = await db.extension_orders.delete_one({
        "client_id": client["id"],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aucune demande d'extension en attente")
    
    return {"success": True, "message": "Demande d'extension annulée"}


@api_router.get("/admin/extension-orders")
async def get_all_extension_orders(admin: dict = Depends(get_current_admin)):
    """Get all extension orders for admin"""
    orders = await db.extension_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders


@api_router.post("/admin/extension-orders/{order_id}/validate")
async def validate_extension_payment(order_id: str, admin: dict = Depends(get_current_admin)):
    """Admin validates an extension payment and extends client account"""
    
    order = await db.extension_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    if order["status"] == "paid":
        raise HTTPException(status_code=400, detail="Cette commande a déjà été validée")
    
    client_id = order["client_id"]
    
    # Get current client expiration
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    current_expiry = client.get("expires_at")
    if current_expiry:
        try:
            expiry_date = datetime.fromisoformat(current_expiry.replace('Z', '+00:00'))
        except:
            expiry_date = datetime.now(timezone.utc)
    else:
        expiry_date = datetime.now(timezone.utc)
    
    # If already expired, extend from now
    if expiry_date < datetime.now(timezone.utc):
        expiry_date = datetime.now(timezone.utc)
    
    # Add 60 days (2 months)
    new_expiry = (expiry_date + timedelta(days=60)).isoformat()
    
    # Update client expiration
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"expires_at": new_expiry, "extension_paid": True}}
    )
    
    # Update order status
    await db.extension_orders.update_one(
        {"id": order_id},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat(), "validated_by": admin.get("email")}}
    )
    
    # Send confirmation email to client
    try:
        await send_email(
            to_email=client.get("email"),
            subject="Extension de compte validée - CREATIVINDUSTRY",
            html_content=f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #d4af37;">Extension de compte validée</h2>
                <p>Bonjour {client.get('name')},</p>
                <p>Votre paiement a été validé. Votre compte a été prolongé de 2 mois.</p>
                <p><strong>Nouvelle date d'expiration:</strong> {new_expiry[:10]}</p>
                <p style="color: #888; margin-top: 20px;">Merci de votre confiance !</p>
                <p style="color: #d4af37;">CREATIVINDUSTRY France</p>
            </div>
            """
        )
    except Exception as e:
        logging.error(f"Failed to send extension confirmation email: {e}")
    
    logging.info(f"Extension validated for client {client.get('email')} by {admin.get('email')}")
    
    return {
        "success": True,
        "message": "Paiement validé et compte prolongé",
        "new_expires_at": new_expiry
    }


@api_router.delete("/admin/extension-orders/{order_id}")
async def delete_extension_order(order_id: str, admin: dict = Depends(get_current_admin)):
    """Delete/reject an extension order"""
    result = await db.extension_orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return {"success": True, "message": "Commande supprimée"}


# ==================== AUTOMATIC ACCOUNT CLEANUP ====================

# Create archives directory
ARCHIVES_DIR = UPLOADS_DIR / "archives"
ARCHIVES_DIR.mkdir(exist_ok=True)


@api_router.post("/admin/cleanup-expired-accounts")
async def cleanup_expired_accounts(admin: dict = Depends(get_current_admin)):
    """Archive and cleanup expired client accounts"""
    
    now = datetime.now(timezone.utc)
    archived_count = 0
    errors = []
    
    # Find expired clients
    all_clients = await db.clients.find({}, {"_id": 0}).to_list(1000)
    
    for client in all_clients:
        expires_at = client.get("expires_at")
        if not expires_at:
            continue
        
        try:
            expiry_date = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expiry_date > now:
                continue  # Not expired yet
        except:
            continue
        
        client_id = client["id"]
        client_name = client.get("name", "unknown").replace(" ", "_")
        client_email = client.get("email", "unknown")
        
        try:
            # 1. Archive client files
            archive_folder = ARCHIVES_DIR / f"archive_{client_name}_{client_id[:8]}"
            archive_folder.mkdir(exist_ok=True)
            
            # Move client files to archive
            file_types = ["music", "documents", "photos", "videos"]
            for file_type in file_types:
                src_folder = UPLOADS_DIR / "client_transfers" / file_type / client_id
                if src_folder.exists():
                    dest_folder = archive_folder / file_type
                    dest_folder.mkdir(exist_ok=True)
                    for file in src_folder.iterdir():
                        shutil.move(str(file), str(dest_folder / file.name))
                    src_folder.rmdir()
            
            # Archive client uploads
            client_uploads = UPLOADS_DIR / "clients" / client_id
            if client_uploads.exists():
                dest_folder = archive_folder / "uploads"
                shutil.move(str(client_uploads), str(dest_folder))
            
            # 2. Create archive metadata
            archive_metadata = {
                "client_id": client_id,
                "client_name": client.get("name"),
                "client_email": client_email,
                "archived_at": now.isoformat(),
                "original_expires_at": expires_at
            }
            with open(archive_folder / "metadata.json", "w") as f:
                json.dump(archive_metadata, f, indent=2)
            
            # 3. Delete database records but keep client in archives collection
            await db.archived_clients.insert_one({
                **client,
                "archived_at": now.isoformat(),
                "archive_path": str(archive_folder)
            })
            
            # Delete from main collections
            await db.client_transfers.delete_many({"client_id": client_id})
            await db.client_files.delete_many({"client_id": client_id})
            await db.client_devis.delete_many({"client_id": client_id})
            await db.client_invoices.delete_many({"client_id": client_id})
            await db.client_payments.delete_many({"client_id": client_id})
            await db.chat_messages.delete_many({"conversation_id": f"client_{client_id}"})
            await db.extension_orders.delete_many({"client_id": client_id})
            await db.clients.delete_one({"id": client_id})
            
            archived_count += 1
            logging.info(f"Archived expired client: {client_email} to {archive_folder}")
            
        except Exception as e:
            errors.append(f"Error archiving {client_email}: {str(e)}")
            logging.error(f"Error archiving client {client_email}: {e}")
    
    return {
        "success": True,
        "archived_count": archived_count,
        "errors": errors if errors else None,
        "message": f"{archived_count} compte(s) expiré(s) archivé(s)"
    }


@api_router.get("/admin/archived-clients")
async def get_archived_clients(admin: dict = Depends(get_current_admin)):
    """Get list of archived clients"""
    archived = await db.archived_clients.find({}, {"_id": 0}).sort("archived_at", -1).to_list(100)
    return archived


@api_router.put("/client/password")
async def change_client_password(data: ClientPasswordChange, client: dict = Depends(get_current_client)):
    """Change client password (requires current password)"""
    # Verify current password
    client_data = await db.clients.find_one({"id": client["id"]})
    if not verify_password(data.current_password, client_data["password"]):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 6 caractères")
    
    # Update password and remove must_change_password flag
    await db.clients.update_one(
        {"id": client["id"]},
        {"$set": {"password": hash_password(data.new_password), "must_change_password": False}}
    )
    
    return {"success": True, "message": "Mot de passe modifié avec succès"}


@api_router.post("/client/password/request-reset")
async def request_client_password_reset(data: ClientPasswordResetRequest):
    """Send password reset code via email for client"""
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    
    # Always return success to not reveal if email exists
    if not client:
        return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}
    
    # Generate reset code (6 digits)
    reset_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    expiry = datetime.now(timezone.utc).timestamp() + 1800  # 30 minutes
    
    # Store reset code
    await db.clients.update_one(
        {"email": data.email},
        {"$set": {"password_reset_code": reset_code, "password_reset_expiry": expiry}}
    )
    
    # Send email
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_email = os.environ.get('SMTP_EMAIL')
        smtp_pass = os.environ.get('SMTP_PASSWORD')
        
        if smtp_email and smtp_pass:
            msg = MIMEMultipart()
            msg['From'] = smtp_email
            msg['To'] = data.email
            msg['Subject'] = "🔑 Réinitialisation de mot de passe - CREATIVINDUSTRY France"
            
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
                    <h1 style="color: #D4AF37; margin-bottom: 20px;">🔑 Réinitialisation de mot de passe</h1>
                    <p>Bonjour {client.get('name', 'Client')},</p>
                    <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
                    <p>Voici votre code de vérification :</p>
                    <div style="background-color: #3a3a3a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D4AF37;">{reset_code}</span>
                    </div>
                    <p style="color: #888;">Ce code expire dans <strong>30 minutes</strong>.</p>
                    <p style="color: #888;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                    <hr style="border-color: #444; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">CREATIVINDUSTRY France - Espace Client</p>
                </div>
            </body>
            </html>
            """
            
            msg.attach(MIMEText(body, 'html'))
            
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_pass)
                server.send_message(msg)
            
            logging.info(f"Client password reset email sent to {data.email}")
    except Exception as e:
        logging.error(f"Failed to send client password reset email: {e}")
    
    return {"success": True, "message": "Si cet email existe, un code de réinitialisation a été envoyé"}


@api_router.post("/client/password/reset")
async def reset_client_password(data: ClientPasswordResetVerify):
    """Verify code and reset client password"""
    client = await db.clients.find_one({"email": data.email}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Code invalide ou expiré")
    
    stored_code = client.get("password_reset_code")
    expiry = client.get("password_reset_expiry", 0)
    
    if not stored_code or stored_code != data.reset_code:
        raise HTTPException(status_code=401, detail="Code invalide")
    
    if datetime.now(timezone.utc).timestamp() > expiry:
        raise HTTPException(status_code=401, detail="Code expiré")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins 6 caractères")
    
    # Update password
    await db.clients.update_one(
        {"email": data.email},
        {"$set": {
            "password": hash_password(data.new_password),
            "password_reset_code": None,
            "password_reset_expiry": None
        }}
    )
    
    logging.info(f"Client password reset successful for {data.email}")
    return {"success": True, "message": "Mot de passe modifié avec succès"}


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


# ==================== DOWNLOAD TRACKING ====================

@api_router.post("/client/files/{file_id}/download")
async def track_file_download(file_id: str, client: dict = Depends(get_current_client)):
    """Track when a client downloads a file"""
    # Record the download
    download_record = {
        "id": str(uuid.uuid4()),
        "file_id": file_id,
        "client_id": client["id"],
        "client_name": client.get("name", "Unknown"),
        "client_email": client.get("email", ""),
        "downloaded_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Get the file info to store the title
    file_info = await db.client_files.find_one({"id": file_id}, {"_id": 0})
    if file_info:
        download_record["file_title"] = file_info.get("title", "Fichier inconnu")
        download_record["file_type"] = file_info.get("file_type", "document")
        download_record["file_url"] = file_info.get("file_url", "")
    
    await db.file_downloads.insert_one(download_record)
    
    # Also update the file with download count
    await db.client_files.update_one(
        {"id": file_id},
        {"$inc": {"download_count": 1}, "$set": {"last_downloaded_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}


@api_router.get("/admin/downloads")
async def get_all_downloads(admin: dict = Depends(get_current_admin)):
    """Get all file downloads for admin view"""
    downloads = await db.file_downloads.find({}, {"_id": 0}).sort("downloaded_at", -1).to_list(500)
    return downloads


@api_router.get("/admin/clients/{client_id}/downloads")
async def get_client_downloads(client_id: str, admin: dict = Depends(get_current_admin)):
    """Get downloads for a specific client"""
    downloads = await db.file_downloads.find({"client_id": client_id}, {"_id": 0}).sort("downloaded_at", -1).to_list(100)
    return downloads


@api_router.delete("/admin/clients/{client_id}")
async def delete_client_completely(client_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a client and ALL their data including files on server"""
    
    # Check if client exists
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    client_email = client.get("email", "unknown")
    client_name = client.get("name", "unknown")
    deleted_files_count = 0
    
    # 1. Delete client files from filesystem
    file_types = ["music", "documents", "photos", "videos"]
    for file_type in file_types:
        client_folder = UPLOADS_DIR / "client_transfers" / file_type / client_id
        if client_folder.exists():
            import shutil
            try:
                shutil.rmtree(client_folder)
                logging.info(f"Deleted folder: {client_folder}")
            except Exception as e:
                logging.error(f"Error deleting folder {client_folder}: {e}")
    
    # 2. Delete client uploads folder
    client_uploads_folder = UPLOADS_DIR / "clients" / client_id
    if client_uploads_folder.exists():
        import shutil
        try:
            shutil.rmtree(client_uploads_folder)
            logging.info(f"Deleted client uploads folder: {client_uploads_folder}")
        except Exception as e:
            logging.error(f"Error deleting client uploads: {e}")
    
    # 3. Delete all database records related to client
    # Client transfers
    result = await db.client_transfers.delete_many({"client_id": client_id})
    deleted_files_count += result.deleted_count
    
    # Client files (uploaded by admin)
    result = await db.client_files.delete_many({"client_id": client_id})
    deleted_files_count += result.deleted_count
    
    # Client devis
    await db.client_devis.delete_many({"client_id": client_id})
    
    # Client invoices
    await db.client_invoices.delete_many({"client_id": client_id})
    
    # Client payments
    await db.client_payments.delete_many({"client_id": client_id})
    
    # Chat messages
    await db.chat_messages.delete_many({"conversation_id": f"client_{client_id}"})
    
    # File downloads history
    await db.file_downloads.delete_many({"client_id": client_id})
    
    # User activity
    await db.user_activity.delete_many({"user_id": client_id})
    
    # Gallery selections
    await db.gallery_selections.delete_many({"client_id": client_id})
    
    # Galleries created for this client
    galleries = await db.galleries.find({"client_id": client_id}).to_list(100)
    for gallery in galleries:
        # Delete gallery photos from filesystem
        gallery_folder = UPLOADS_DIR / "galleries" / gallery.get("id", "")
        if gallery_folder.exists():
            import shutil
            try:
                shutil.rmtree(gallery_folder)
            except:
                pass
    await db.galleries.delete_many({"client_id": client_id})
    
    # 4. Finally delete the client record
    await db.clients.delete_one({"id": client_id})
    
    logging.info(f"Client deleted: {client_email} ({client_name}) by admin {admin.get('email')}. Files deleted: {deleted_files_count}")
    
    return {
        "success": True,
        "message": f"Client {client_name} supprimé avec succès",
        "details": {
            "client_email": client_email,
            "files_deleted": deleted_files_count
        }
    }


# ==================== CLIENT DOCUMENTS (Admin uploaded invoices/quotes) ====================

@api_router.post("/admin/clients/{client_id}/documents")
async def upload_client_document(
    client_id: str,
    document_type: str = Form(...),
    title: str = Form(...),
    amount: float = Form(...),
    description: str = Form(None),
    due_date: str = Form(None),
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    """Upload a document (invoice/quote) for a client"""
    # Validate client exists
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Validate document type
    if document_type not in ["invoice", "quote"]:
        raise HTTPException(status_code=400, detail="Type de document invalide. Utilisez 'invoice' ou 'quote'")
    
    # Validate file type (PDF only)
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    
    # Create upload directory
    doc_folder = UPLOADS_DIR / "client_documents" / client_id
    doc_folder.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    doc_id = str(uuid.uuid4())
    safe_filename = f"{document_type}_{doc_id}.pdf"
    file_path = doc_folder / safe_filename
    
    # Save file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create document record
    document = {
        "id": doc_id,
        "client_id": client_id,
        "client_email": client.get("email"),
        "document_type": document_type,
        "title": title,
        "description": description,
        "amount": amount,
        "file_url": f"/uploads/client_documents/{client_id}/{safe_filename}",
        "filename": file.filename,
        "status": "pending",
        "paid_amount": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": due_date,
        "uploaded_by": admin.get("email")
    }
    
    await db.client_documents.insert_one(document)
    
    # Remove _id for response
    document.pop("_id", None)
    
    logging.info(f"Document uploaded for client {client.get('email')}: {title} ({document_type})")
    
    return {"success": True, "document": document}


@api_router.get("/admin/clients/{client_id}/documents")
async def get_client_documents_admin(client_id: str, admin: dict = Depends(get_current_admin)):
    """Get all documents for a client (admin view)"""
    documents = await db.client_documents.find(
        {"client_id": client_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return documents


@api_router.delete("/admin/documents/{document_id}")
async def delete_client_document(document_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a client document"""
    document = await db.client_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    # Delete file from filesystem
    file_path = UPLOADS_DIR / "client_documents" / document["client_id"] / f"{document['document_type']}_{document_id}.pdf"
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.client_documents.delete_one({"id": document_id})
    
    return {"success": True, "message": "Document supprimé"}


@api_router.post("/admin/documents/{document_id}/payment")
async def add_document_payment(document_id: str, amount: float = Form(...), admin: dict = Depends(get_current_admin)):
    """Add a payment to a document"""
    document = await db.client_documents.find_one({"id": document_id}, {"_id": 0})
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    new_paid_amount = document.get("paid_amount", 0) + amount
    new_status = "paid" if new_paid_amount >= document["amount"] else "partial"
    
    await db.client_documents.update_one(
        {"id": document_id},
        {"$set": {"paid_amount": new_paid_amount, "status": new_status}}
    )
    
    return {"success": True, "paid_amount": new_paid_amount, "status": new_status}


# Client endpoints for documents
@api_router.get("/client/documents")
async def get_my_documents(client: dict = Depends(get_current_client)):
    """Get all documents for the logged-in client"""
    documents = await db.client_documents.find(
        {"client_id": client["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return documents


@api_router.get("/client/documents/{document_id}/download")
async def download_client_document(document_id: str, client: dict = Depends(get_current_client)):
    """Download a document"""
    document = await db.client_documents.find_one(
        {"id": document_id, "client_id": client["id"]}, 
        {"_id": 0}
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document non trouvé")
    
    file_path = UPLOADS_DIR / "client_documents" / client["id"] / f"{document['document_type']}_{document_id}.pdf"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return FileResponse(
        path=str(file_path),
        filename=document.get("filename", f"{document['document_type']}_{document_id}.pdf"),
        media_type="application/pdf"
    )


# ==================== EXTERNAL FILE LINKS (Synology/Cloud) ====================

class ExternalFileLink(BaseModel):
    """External file link (Synology, Google Drive, etc.) for large files"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_id: str
    client_email: str
    title: str
    description: Optional[str] = None
    file_size: Optional[str] = None  # "2.5 GB", "10 GB", etc.
    external_url: str  # Synology QuickConnect link or other
    source: str = "synology"  # synology, google_drive, dropbox, other
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None  # Optional expiration date
    download_count: int = 0
    is_active: bool = True


@api_router.post("/admin/clients/{client_id}/external-links")
async def add_external_file_link(
    client_id: str,
    title: str = Form(...),
    external_url: str = Form(...),
    description: str = Form(None),
    file_size: str = Form(None),
    source: str = Form("synology"),
    expires_at: str = Form(None),
    admin: dict = Depends(get_current_admin)
):
    """Add an external file link (Synology, etc.) for a client"""
    # Validate client exists
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouve")
    
    # Create link record
    link = {
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "client_email": client.get("email"),
        "title": title,
        "description": description,
        "file_size": file_size,
        "external_url": external_url,
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
        "download_count": 0,
        "is_active": True,
        "created_by": admin.get("email")
    }
    
    await db.external_file_links.insert_one(link)
    link.pop("_id", None)
    
    logging.info(f"External link added for client {client.get('email')}: {title} ({source})")
    
    # Optionally send email notification to client
    try:
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C9A227;">Nouveau fichier disponible</h2>
            <p>Bonjour {client.get('name', '')},</p>
            <p>Un nouveau fichier volumineux est disponible pour vous :</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Titre :</strong> {title}</p>
                {f'<p><strong>Description :</strong> {description}</p>' if description else ''}
                {f'<p><strong>Taille :</strong> {file_size}</p>' if file_size else ''}
            </div>
            <p>Connectez-vous a votre espace client pour acceder au lien de telechargement.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
                CREATIVINDUSTRY France
            </p>
        </div>
        """
        send_email(client.get("email"), f"Nouveau fichier disponible : {title}", html_content)
    except Exception as e:
        logging.error(f"Failed to send notification email: {e}")
    
    return {"success": True, "link": link}


@api_router.get("/admin/clients/{client_id}/external-links")
async def get_client_external_links_admin(client_id: str, admin: dict = Depends(get_current_admin)):
    """Get all external file links for a client (admin view)"""
    links = await db.external_file_links.find(
        {"client_id": client_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return links


@api_router.delete("/admin/external-links/{link_id}")
async def delete_external_link(link_id: str, admin: dict = Depends(get_current_admin)):
    """Delete an external file link"""
    link = await db.external_file_links.find_one({"id": link_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Lien non trouve")
    
    await db.external_file_links.delete_one({"id": link_id})
    
    logging.info(f"External link deleted: {link.get('title')} by admin {admin.get('email')}")
    
    return {"success": True, "message": "Lien supprime"}


@api_router.put("/admin/external-links/{link_id}/toggle")
async def toggle_external_link(link_id: str, admin: dict = Depends(get_current_admin)):
    """Toggle active status of an external link"""
    link = await db.external_file_links.find_one({"id": link_id}, {"_id": 0})
    if not link:
        raise HTTPException(status_code=404, detail="Lien non trouve")
    
    new_status = not link.get("is_active", True)
    await db.external_file_links.update_one(
        {"id": link_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"success": True, "is_active": new_status}


# Client endpoints for external links
@api_router.get("/client/external-links")
async def get_my_external_links(client: dict = Depends(get_current_client)):
    """Get all external file links for the logged-in client"""
    links = await db.external_file_links.find(
        {"client_id": client["id"], "is_active": True}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Filter out expired links
    now = datetime.now(timezone.utc).isoformat()
    active_links = []
    for link in links:
        if link.get("expires_at") and link["expires_at"] < now:
            continue
        active_links.append(link)
    
    return active_links


@api_router.post("/client/external-links/{link_id}/track-download")
async def track_external_link_download(link_id: str, client: dict = Depends(get_current_client)):
    """Track when a client clicks on an external download link"""
    link = await db.external_file_links.find_one(
        {"id": link_id, "client_id": client["id"]}, 
        {"_id": 0}
    )
    if not link:
        raise HTTPException(status_code=404, detail="Lien non trouve")
    
    # Increment download count
    await db.external_file_links.update_one(
        {"id": link_id},
        {"$inc": {"download_count": 1}}
    )
    
    logging.info(f"External link download tracked: {link.get('title')} by client {client.get('email')}")
    
    return {"success": True, "external_url": link["external_url"]}


# ==================== USER ACTIVITY TRACKING ====================

@api_router.post("/client/activity/heartbeat")
async def client_heartbeat(client: dict = Depends(get_current_client)):
    """Record client activity (called periodically from frontend)"""
    await db.user_activity.update_one(
        {"user_id": client["id"], "user_type": "client"},
        {"$set": {
            "user_id": client["id"],
            "user_type": "client",
            "name": client.get("name", "Unknown"),
            "email": client.get("email", ""),
            "last_activity": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}


@api_router.get("/admin/users/online")
async def get_online_users(admin: dict = Depends(get_current_admin)):
    """Get all users active in the last 5 minutes"""
    five_minutes_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    # Get active clients
    active_users = await db.user_activity.find(
        {"last_activity": {"$gte": five_minutes_ago}},
        {"_id": 0}
    ).to_list(100)
    
    # Get all clients with their last activity
    all_clients = await db.clients.find({}, {"_id": 0, "password": 0}).to_list(500)
    
    # Merge activity data
    activity_map = {u["user_id"]: u for u in active_users}
    
    result = []
    for client in all_clients:
        activity = activity_map.get(client["id"])
        result.append({
            "id": client["id"],
            "name": client.get("name", "Unknown"),
            "email": client.get("email", ""),
            "phone": client.get("phone", ""),
            "is_online": activity is not None,
            "last_activity": activity["last_activity"] if activity else None
        })
    
    # Sort: online users first, then by last activity
    result.sort(key=lambda x: (not x["is_online"], x["last_activity"] or ""), reverse=True)
    
    return result

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
    
    # Send newsletter notification if it's a video or story
    if data.media_type in ["video", "story"]:
        import asyncio
        asyncio.create_task(send_newsletter_notification(data.media_type, data.title, data.media_url))
    
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
ALLOWED_DOC_TYPES = ["application/zip", "application/x-zip-compressed", "application/x-rar-compressed", "application/pdf", "application/octet-stream"]
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
    """Upload a file for a client (images, videos, or documents like ZIP, RAR, PDF)"""
    # Verify client exists
    client_data = await db.clients.find_one({"id": client_id})
    if not client_data:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Check file type - now includes documents
    content_type = file.content_type
    file_ext = Path(file.filename).suffix.lower()
    
    # Allow by extension for ZIP/RAR files (sometimes content_type is application/octet-stream)
    allowed_extensions = [".zip", ".rar", ".pdf"]
    is_allowed_by_ext = file_ext in allowed_extensions
    is_allowed_by_type = content_type in ALLOWED_IMAGE_TYPES + ALLOWED_VIDEO_TYPES + ALLOWED_DOC_TYPES
    
    if not (is_allowed_by_ext or is_allowed_by_type):
        raise HTTPException(status_code=400, detail="Type de fichier non supporté. Utilisez JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, ZIP, RAR ou PDF.")
    
    # Create client folder if not exists
    client_folder = UPLOADS_DIR / "clients" / client_id
    client_folder.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = client_folder / unique_filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'upload: {str(e)}")
    
    # Determine file type
    if content_type in ALLOWED_IMAGE_TYPES:
        file_type = "photo"
    elif content_type in ALLOWED_VIDEO_TYPES:
        file_type = "video"
    else:
        file_type = "document"
    
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
    
    # Generate PDF
    quote_data = {
        'id': quote.id,
        'client_name': data.client_name,
        'client_email': data.client_email,
        'client_phone': data.client_phone,
        'event_date': data.event_date,
        'event_location': data.event_location,
        'message': data.message
    }
    
    try:
        pdf_data = generate_quote_pdf(quote_data, options_details)
        pdf_filename = f"Devis_Mariage_{data.client_name.replace(' ', '_')}_{quote.id[:8].upper()}.pdf"
    except Exception as e:
        logging.error(f"Error generating PDF: {e}")
        pdf_data = None
    
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
                    📎 Le devis en PDF est joint à cet email.<br>
                    Connectez-vous à votre admin pour gérer cette demande.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to both admin emails with PDF attachment
    for admin_email in admin_emails:
        try:
            if pdf_data:
                send_email_with_attachment(
                    admin_email, 
                    f"💒 Nouveau Devis Mariage - {data.client_name} ({total_price}€)", 
                    html_content,
                    pdf_data,
                    pdf_filename
                )
            else:
                send_email(admin_email, f"💒 Nouveau Devis Mariage - {data.client_name} ({total_price}€)", html_content)
        except Exception as e:
            logging.error(f"Error sending email to {admin_email}: {e}")
    
    # Send confirmation email to the CLIENT with their quote
    client_html = f"""
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
                <h1>💒 Votre Devis Mariage</h1>
            </div>
            <div class="content">
                <p style="font-size: 16px; margin-bottom: 20px;">Bonjour {data.client_name},</p>
                <p style="color: #ccc; margin-bottom: 30px;">Merci pour votre demande de devis ! Voici le récapitulatif de votre sélection :</p>
                
                <h2 style="color: #d4af37; margin-bottom: 20px;">Récapitulatif</h2>
                <div class="info-row"><span class="label">Date du mariage</span><span class="value">{data.event_date}</span></div>
                <div class="info-row"><span class="label">Lieu</span><span class="value">{data.event_location or 'Non précisé'}</span></div>
                
                <h2 style="color: #d4af37; margin: 30px 0 20px;">Prestations Sélectionnées</h2>
                <table>
                    <tr><th>Prestation</th><th style="text-align: right;">Prix</th></tr>
                    {options_html}
                </table>
                
                <div class="total">TOTAL: {total_price}€</div>
                
                <p style="color: #ccc; margin-top: 30px;">
                    Nous avons bien reçu votre demande et nous vous recontacterons très prochainement pour discuter de votre projet.
                </p>
                <p style="color: #888; font-size: 12px; margin-top: 30px; text-align: center;">
                    📎 Votre devis en PDF est joint à cet email.<br><br>
                    CREATIVINDUSTRY France<br>
                    📞 +33 1 23 45 67 89 | ✉️ contact@creativindustry.com
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        if pdf_data:
            send_email_with_attachment(
                data.client_email,
                f"💒 Votre Devis Mariage - CREATIVINDUSTRY ({total_price}€)",
                client_html,
                pdf_data,
                pdf_filename
            )
        else:
            send_email(data.client_email, f"💒 Votre Devis Mariage - CREATIVINDUSTRY ({total_price}€)", client_html)
        logging.info(f"Quote confirmation sent to client: {data.client_email}")
    except Exception as e:
        logging.error(f"Error sending quote to client {data.client_email}: {e}")
    
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
    # Also delete associated views
    await db.story_views.delete_many({"story_id": item_id})
    return {"message": "Item deleted"}

# ==================== STORY VIEWS ROUTES ====================

@api_router.post("/stories/{story_id}/view")
async def record_story_view(story_id: str, request: Request, client_token: Optional[str] = None):
    """Record a view for a story - works for both clients and anonymous visitors"""
    import hashlib
    
    # Check if story exists
    story = await db.portfolio.find_one({"id": story_id, "media_type": "story"})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Get client info if token provided
    viewer_type = "anonymous"
    viewer_id = None
    viewer_name = None
    
    if client_token:
        try:
            payload = jwt.decode(client_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            client = await db.clients.find_one({"id": payload.get("sub")}, {"_id": 0})
            if client:
                viewer_type = "client"
                viewer_id = client["id"]
                viewer_name = client.get("name", client.get("email", "Client"))
        except:
            pass
    
    # Create IP hash for anonymous deduplication
    client_ip = request.client.host if request.client else "unknown"
    ip_hash = hashlib.sha256(f"{client_ip}{story_id}".encode()).hexdigest()[:16]
    
    # Check if this viewer already viewed this story (within last 24h)
    twenty_four_hours_ago = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    if viewer_type == "client":
        existing = await db.story_views.find_one({
            "story_id": story_id,
            "viewer_id": viewer_id,
            "viewed_at": {"$gte": twenty_four_hours_ago}
        })
    else:
        existing = await db.story_views.find_one({
            "story_id": story_id,
            "ip_hash": ip_hash,
            "viewed_at": {"$gte": twenty_four_hours_ago}
        })
    
    if existing:
        return {"message": "View already recorded", "new_view": False}
    
    # Record the view
    view = StoryView(
        story_id=story_id,
        viewer_type=viewer_type,
        viewer_id=viewer_id,
        viewer_name=viewer_name,
        ip_hash=ip_hash if viewer_type == "anonymous" else None
    )
    
    view_doc = view.model_dump()
    view_doc['viewed_at'] = view_doc['viewed_at'].isoformat()
    await db.story_views.insert_one(view_doc)
    
    return {"message": "View recorded", "new_view": True}

@api_router.get("/stories/{story_id}/views")
async def get_story_views(story_id: str, admin: dict = Depends(get_current_admin)):
    """Get view statistics for a story (admin only)"""
    views = await db.story_views.find({"story_id": story_id}, {"_id": 0}).to_list(1000)
    
    total_views = len(views)
    
    # Get unique views (by viewer_id for clients, by ip_hash for anonymous)
    unique_client_ids = set()
    unique_ip_hashes = set()
    client_views = []
    
    for view in views:
        if view.get("viewer_type") == "client":
            if view.get("viewer_id") not in unique_client_ids:
                unique_client_ids.add(view.get("viewer_id"))
                client_views.append({
                    "name": view.get("viewer_name", "Client"),
                    "viewed_at": view.get("viewed_at")
                })
        else:
            if view.get("ip_hash"):
                unique_ip_hashes.add(view.get("ip_hash"))
    
    return {
        "total_views": total_views,
        "unique_views": len(unique_client_ids) + len(unique_ip_hashes),
        "client_views": client_views,
        "anonymous_views": len(unique_ip_hashes)
    }

@api_router.get("/admin/stories/all-views")
async def get_all_stories_views(admin: dict = Depends(get_current_admin)):
    """Get view counts for all stories"""
    stories = await db.portfolio.find({"media_type": "story"}, {"_id": 0, "id": 1, "title": 1}).to_list(100)
    
    result = {}
    for story in stories:
        views = await db.story_views.find({"story_id": story["id"]}, {"_id": 0}).to_list(1000)
        
        unique_client_ids = set()
        unique_ip_hashes = set()
        
        for view in views:
            if view.get("viewer_type") == "client":
                unique_client_ids.add(view.get("viewer_id"))
            else:
                if view.get("ip_hash"):
                    unique_ip_hashes.add(view.get("ip_hash"))
        
        result[story["id"]] = {
            "total": len(views),
            "clients": len(unique_client_ids),
            "anonymous": len(unique_ip_hashes)
        }
    
    return result

# ==================== BACKUP ROUTE ====================

@api_router.post("/admin/backup/create")
async def create_backup(admin: dict = Depends(get_current_admin)):
    """Create a backup file and return its download URL (avoids timeout)"""
    import json
    from datetime import datetime
    
    # Create a temporary directory for backup
    backup_dir = UPLOADS_DIR / "backup_temp"
    backup_dir.mkdir(exist_ok=True)
    
    try:
        # Export all collections
        collections = [
            "admins", "clients", "services", "bookings", "contacts", 
            "portfolio", "site_content", "wedding_options", "wedding_quotes",
            "appointments", "bank_details", "galleries", "story_views"
        ]
        
        db_backup_dir = backup_dir / "database"
        db_backup_dir.mkdir(exist_ok=True)
        
        for collection_name in collections:
            try:
                collection = db[collection_name]
                documents = await collection.find({}, {"_id": 0}).to_list(10000)
                
                # Convert datetime objects to strings
                for doc in documents:
                    for key, value in doc.items():
                        if isinstance(value, datetime):
                            doc[key] = value.isoformat()
                
                with open(db_backup_dir / f"{collection_name}.json", "w", encoding="utf-8") as f:
                    json.dump(documents, f, ensure_ascii=False, indent=2, default=str)
            except Exception as e:
                logging.error(f"Error backing up {collection_name}: {e}")
        
        # Create the ZIP file with faster compression
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"creativindustry_backup_{timestamp}.zip"
        zip_path = UPLOADS_DIR / zip_filename
        
        # Use ZIP_STORED (no compression) for speed - files are already compressed (jpg, mp4, etc)
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
            # Add database exports (small files, compress these)
            for json_file in db_backup_dir.glob("*.json"):
                zipf.write(json_file, f"database/{json_file.name}")
            
            # Add uploaded files without compression (already compressed media)
            for upload_subdir in ["portfolio", "galleries", "clients"]:
                upload_path = UPLOADS_DIR / upload_subdir
                if upload_path.exists():
                    for file in upload_path.rglob("*"):
                        if file.is_file():
                            arcname = f"uploads/{upload_subdir}/{file.relative_to(upload_path)}"
                            zipf.write(file, arcname)
            
            # Add a readme file
            readme_content = f"""
CREATIVINDUSTRY France - Sauvegarde du {datetime.now().strftime("%d/%m/%Y à %H:%M")}

CONTENU DE LA SAUVEGARDE :
==========================

📁 database/
   - Toutes les collections MongoDB en format JSON
   - admins.json : Comptes administrateurs
   - clients.json : Comptes clients
   - portfolio.json : Éléments du portfolio (photos, vidéos, stories)
   - bookings.json : Réservations
   - etc.

📁 uploads/
   - portfolio/ : Photos et vidéos du portfolio
   - galleries/ : Photos des galeries clients
   - clients/ : Fichiers livrés aux clients

RESTAURATION :
==============

1. Importer les fichiers JSON dans MongoDB :
   mongoimport --db creativindustry --collection <nom> --file database/<nom>.json --jsonArray

2. Copier le dossier uploads/ vers /var/www/creativindustry/backend/uploads/

3. Redémarrer le serveur :
   sudo systemctl restart creativindustry

Pour toute question : infos@creativindustry.com
"""
            zipf.writestr("README.txt", readme_content)
        
        # Clean up temp directory
        shutil.rmtree(backup_dir)
        
        # Get file size
        file_size = zip_path.stat().st_size
        file_size_mb = round(file_size / (1024 * 1024), 2)
        
        # Return download URL instead of file (to avoid timeout)
        return {
            "success": True,
            "filename": zip_filename,
            "download_url": f"/api/admin/backup/download/{zip_filename}",
            "size_mb": file_size_mb,
            "created_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        # Clean up on error
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        logging.error(f"Backup error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")


@api_router.post("/admin/backup/confirm-download")
async def confirm_backup_download(admin: dict = Depends(get_current_admin)):
    """Confirm that a backup was downloaded - updates last backup date"""
    await db.backup_history.insert_one({
        "id": str(uuid.uuid4()),
        "performed_by": admin.get("email"),
        "performed_at": datetime.now(timezone.utc).isoformat(),
        "type": "manual"
    })
    return {"success": True, "message": "Sauvegarde confirmée"}


@api_router.get("/admin/backup/status")
async def get_backup_status(admin: dict = Depends(get_current_admin)):
    """Get backup status and reminder"""
    # Get last backup
    last_backup = await db.backup_history.find_one(
        {}, 
        {"_id": 0},
        sort=[("performed_at", -1)]
    )
    
    days_since_backup = None
    needs_reminder = True
    
    if last_backup and last_backup.get("performed_at"):
        last_date = datetime.fromisoformat(last_backup["performed_at"].replace("Z", "+00:00"))
        days_since_backup = (datetime.now(timezone.utc) - last_date).days
        needs_reminder = days_since_backup >= 7
    
    return {
        "last_backup": last_backup,
        "days_since_backup": days_since_backup,
        "needs_reminder": needs_reminder,
        "reminder_message": "⚠️ Vous n'avez pas fait de sauvegarde depuis plus de 7 jours !" if needs_reminder else None
    }


@api_router.get("/admin/backup/download/{filename}")
async def download_backup(filename: str, admin: dict = Depends(get_current_admin)):
    """Download a previously created backup file"""
    # Validate filename to prevent path traversal
    if ".." in filename or "/" in filename or not filename.startswith("creativindustry_backup_"):
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    
    zip_path = UPLOADS_DIR / filename
    
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Fichier de sauvegarde non trouvé. Créez d'abord une nouvelle sauvegarde.")
    
    return FileResponse(
        path=zip_path,
        filename=filename,
        media_type="application/zip"
    )


@api_router.get("/admin/backup")
async def create_backup_legacy(admin: dict = Depends(get_current_admin)):
    """Legacy endpoint - redirects to new 2-step process"""
    # For backwards compatibility, create backup and return file directly
    # But use ZIP_STORED for speed
    import json
    from datetime import datetime
    
    backup_dir = UPLOADS_DIR / "backup_temp"
    backup_dir.mkdir(exist_ok=True)
    
    try:
        collections = [
            "admins", "clients", "services", "bookings", "contacts", 
            "portfolio", "site_content", "wedding_options", "wedding_quotes",
            "appointments", "bank_details", "galleries", "story_views"
        ]
        
        db_backup_dir = backup_dir / "database"
        db_backup_dir.mkdir(exist_ok=True)
        
        for collection_name in collections:
            try:
                collection = db[collection_name]
                documents = await collection.find({}, {"_id": 0}).to_list(10000)
                for doc in documents:
                    for key, value in doc.items():
                        if isinstance(value, datetime):
                            doc[key] = value.isoformat()
                with open(db_backup_dir / f"{collection_name}.json", "w", encoding="utf-8") as f:
                    json.dump(documents, f, ensure_ascii=False, indent=2, default=str)
            except Exception as e:
                logging.error(f"Error backing up {collection_name}: {e}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"creativindustry_backup_{timestamp}.zip"
        zip_path = UPLOADS_DIR / zip_filename
        
        # Use ZIP_STORED for speed
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
            for json_file in db_backup_dir.glob("*.json"):
                zipf.write(json_file, f"database/{json_file.name}")
            
            for upload_subdir in ["portfolio", "galleries", "clients"]:
                upload_path = UPLOADS_DIR / upload_subdir
                if upload_path.exists():
                    for file in upload_path.rglob("*"):
                        if file.is_file():
                            arcname = f"uploads/{upload_subdir}/{file.relative_to(upload_path)}"
                            zipf.write(file, arcname)
            
            zipf.writestr("README.txt", f"CREATIVINDUSTRY Backup - {datetime.now().strftime('%d/%m/%Y')}")
        
        shutil.rmtree(backup_dir)
        
        return FileResponse(
            path=zip_path,
            filename=zip_filename,
            media_type="application/zip"
        )
        
    except Exception as e:
        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        logging.error(f"Backup error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde: {str(e)}")

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


@api_router.get("/download/social-media-zip")
async def download_social_media_zip():
    """Download all social media visuals as ZIP"""
    zip_path = UPLOADS_DIR / "visuels_reseaux_sociaux.zip"
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="ZIP non trouvé")
    return FileResponse(
        path=zip_path,
        filename="visuels_reseaux_sociaux.zip",
        media_type="application/zip"
    )


# ==================== INTEGRATION ENDPOINTS (Communication avec site Devis) ====================

# Secret API key for communication between sites (à configurer dans .env)
INTEGRATION_API_KEY = os.environ.get('INTEGRATION_API_KEY', 'creativindustry-devis-secret-key-2024')


def verify_integration_key(api_key: str):
    """Verify the API key from devis site"""
    if api_key != INTEGRATION_API_KEY:
        raise HTTPException(status_code=401, detail="Clé API invalide")


def generate_temp_password():
    """Generate a temporary password"""
    import string
    import random
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(12))


@api_router.post("/integration/create-client-from-devis")
async def create_client_from_devis(data: IntegrationCreateClient):
    """Create a client account when devis is accepted on devis site"""
    verify_integration_key(data.api_key)
    
    # Check if client already exists
    existing = await db.clients.find_one({"email": data.email})
    if existing:
        # Update existing client with devis info
        await db.clients.update_one(
            {"email": data.email},
            {"$set": {"devis_id": data.devis_id}}
        )
        client_id = existing["id"]
        logging.info(f"Existing client {data.email} linked to devis {data.devis_id}")
    else:
        # Create new client with temporary password
        temp_password = generate_temp_password()
        hashed_password = bcrypt.hashpw(temp_password.encode(), bcrypt.gensalt()).decode()
        
        client_id = str(uuid.uuid4())
        new_client = {
            "id": client_id,
            "email": data.email,
            "name": data.name,
            "phone": data.phone,
            "password": hashed_password,
            "must_change_password": True,
            "newsletter_subscribed": True,
            "devis_id": data.devis_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_from": "devis_site"
        }
        await db.clients.insert_one(new_client)
        
        # Send welcome email with credentials
        site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #000; font-size: 24px;">🎉 Bienvenue chez CREATIVINDUSTRY</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 18px;">Bonjour {data.name},</p>
                    <p style="color: #ccc;">Félicitations ! Votre devis a été accepté. Votre espace client est maintenant disponible.</p>
                    
                    <div style="background-color: #3a3a3a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #D4AF37; margin-top: 0;">Vos identifiants de connexion :</h3>
                        <p><strong>Email :</strong> {data.email}</p>
                        <p><strong>Mot de passe temporaire :</strong> {temp_password}</p>
                    </div>
                    
                    <p style="color: #ff9800; font-size: 14px;">⚠️ Vous devrez changer ce mot de passe lors de votre première connexion.</p>
                    
                    <a href="{site_url}/client" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 20px;">
                        Accéder à mon espace →
                    </a>
                    
                    <p style="color: #888; font-size: 12px; margin-top: 30px;">
                        Dans votre espace, vous pourrez :<br>
                        • Consulter vos devis et factures<br>
                        • Transférer des fichiers (musiques, photos, documents)<br>
                        • Suivre vos paiements<br>
                        • Accéder à vos galeries photos
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        try:
            send_email(data.email, "🎉 Votre espace client CREATIVINDUSTRY est prêt !", html_content)
        except Exception as e:
            logging.error(f"Failed to send welcome email to {data.email}: {e}")
        
        logging.info(f"New client {data.email} created from devis {data.devis_id}")
    
    # Store devis data
    await db.client_devis.update_one(
        {"devis_id": data.devis_id},
        {"$set": {
            "client_id": client_id,
            "client_email": data.email,
            "devis_id": data.devis_id,
            "devis_data": data.devis_data,
            "event_date": data.event_date,
            "event_type": data.event_type,
            "total_amount": data.total_amount,
            "status": "accepted",
            "synced_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "client_id": client_id, "message": "Client créé avec succès"}


@api_router.post("/integration/sync-devis")
async def sync_devis_from_devis_site(data: IntegrationSyncDevis):
    """Sync devis updates from devis site"""
    verify_integration_key(data.api_key)
    
    # Find client
    client = await db.clients.find_one({"email": data.client_email})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Update or create devis record
    await db.client_devis.update_one(
        {"devis_id": data.devis_id},
        {"$set": {
            "client_id": client["id"],
            "client_email": data.client_email,
            "devis_id": data.devis_id,
            "devis_data": data.devis_data,
            "total_amount": data.total_amount,
            "status": data.status,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Devis synchronisé"}


@api_router.post("/integration/sync-invoice")
async def sync_invoice_from_devis_site(data: IntegrationSyncInvoice):
    """Sync invoice from devis site"""
    verify_integration_key(data.api_key)
    
    # Find client
    client = await db.clients.find_one({"email": data.client_email})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Save PDF if provided
    pdf_path = None
    if data.pdf_data:
        try:
            pdf_bytes = base64.b64decode(data.pdf_data)
            pdf_filename = f"facture_{data.invoice_number.replace('/', '_')}_{client['id']}.pdf"
            pdf_path = UPLOADS_DIR / "client_transfers" / "documents" / pdf_filename
            with open(pdf_path, 'wb') as f:
                f.write(pdf_bytes)
            pdf_path = f"/uploads/client_transfers/documents/{pdf_filename}"
        except Exception as e:
            logging.error(f"Failed to save invoice PDF: {e}")
    
    # Store invoice
    await db.client_invoices.update_one(
        {"invoice_id": data.invoice_id},
        {"$set": {
            "client_id": client["id"],
            "client_email": data.client_email,
            "devis_id": data.devis_id,
            "invoice_id": data.invoice_id,
            "invoice_number": data.invoice_number,
            "invoice_date": data.invoice_date,
            "amount": data.amount,
            "pdf_url": pdf_path or data.pdf_url,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # Notify client by email
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; padding: 30px;">
            <h2 style="color: #D4AF37;">🧾 Nouvelle facture disponible</h2>
            <p>Bonjour {client.get('name', 'Client')},</p>
            <p>Une nouvelle facture est disponible dans votre espace client :</p>
            <div style="background-color: #3a3a3a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Facture N° :</strong> {data.invoice_number}</p>
                <p><strong>Date :</strong> {data.invoice_date}</p>
                <p><strong>Montant :</strong> {data.amount}€</p>
            </div>
            <a href="{site_url}/client/dashboard" style="display: inline-block; background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                Voir ma facture →
            </a>
        </div>
    </body>
    </html>
    """
    
    try:
        send_email(data.client_email, f"🧾 Facture N°{data.invoice_number} - CREATIVINDUSTRY", html_content)
    except Exception as e:
        logging.error(f"Failed to send invoice notification: {e}")
    
    return {"success": True, "message": "Facture synchronisée"}


@api_router.post("/integration/sync-payment")
async def sync_payment_from_devis_site(data: IntegrationSyncPayment):
    """Sync payment from devis site"""
    verify_integration_key(data.api_key)
    
    # Find client
    client = await db.clients.find_one({"email": data.client_email})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Store payment
    await db.client_payments.update_one(
        {"payment_id": data.payment_id},
        {"$set": {
            "client_id": client["id"],
            "client_email": data.client_email,
            "devis_id": data.devis_id,
            "payment_id": data.payment_id,
            "amount": data.amount,
            "payment_date": data.payment_date,
            "payment_method": data.payment_method,
            "synced_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Paiement synchronisé"}


# ==================== CLIENT FILE TRANSFER ENDPOINTS ====================

@api_router.post("/client/transfer/{file_type}")
async def upload_client_transfer(
    file_type: str,
    file: UploadFile = File(...),
    client: dict = Depends(get_current_client)
):
    """Upload a file (music, documents, photos, videos) - Max 5GB"""
    if file_type not in ["music", "documents", "photos", "videos"]:
        raise HTTPException(status_code=400, detail="Type de fichier invalide. Utilisez: music, documents, photos, videos")
    
    # Check file size (5GB max)
    MAX_SIZE = 5 * 1024 * 1024 * 1024  # 5GB
    
    # Validate file types first (before reading content)
    allowed_extensions = {
        "music": [".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"],
        "documents": [".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"],
        "photos": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"],
        "videos": [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    }
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions.get(file_type, []):
        raise HTTPException(
            status_code=400, 
            detail=f"Extension non autorisée pour {file_type}. Extensions acceptées: {', '.join(allowed_extensions.get(file_type, []))}"
        )
    
    # Create client folder if not exists
    client_folder = UPLOADS_DIR / "client_transfers" / file_type / client["id"]
    client_folder.mkdir(parents=True, exist_ok=True)
    
    # Save file with streaming for large files
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{file_ext}"
    file_path = client_folder / safe_filename
    
    total_size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # Read 1MB at a time
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                f.close()
                file_path.unlink()  # Delete partial file
                raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 5GB.")
            f.write(chunk)
    
    # Store in database
    file_record = {
        "id": file_id,
        "client_id": client["id"],
        "file_type": file_type,
        "original_name": file.filename,
        "stored_name": safe_filename,
        "file_url": f"/uploads/client_transfers/{file_type}/{client['id']}/{safe_filename}",
        "size_bytes": total_size,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.client_transfers.insert_one(file_record)
    
    return {
        "success": True,
        "file_id": file_id,
        "file_url": file_record["file_url"],
        "message": f"Fichier uploadé avec succès dans {file_type}"
    }


@api_router.get("/client/transfers")
async def get_client_transfers(client: dict = Depends(get_current_client)):
    """Get all transferred files for current client"""
    files = await db.client_transfers.find(
        {"client_id": client["id"]},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(500)
    
    # Group by type
    grouped = {
        "music": [],
        "documents": [],
        "photos": []
    }
    for f in files:
        if f["file_type"] in grouped:
            grouped[f["file_type"]].append(f)
    
    return grouped


@api_router.delete("/client/transfer/{file_id}")
async def delete_client_transfer(file_id: str, client: dict = Depends(get_current_client)):
    """Delete a transferred file"""
    file_record = await db.client_transfers.find_one({"id": file_id, "client_id": client["id"]})
    if not file_record:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Delete physical file
    file_path = UPLOADS_DIR / "client_transfers" / file_record["file_type"] / client["id"] / file_record["stored_name"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.client_transfers.delete_one({"id": file_id})
    
    return {"success": True, "message": "Fichier supprimé"}


# ==================== ADMIN FILE TRANSFER TO CLIENTS ====================

@api_router.post("/admin/transfer-to-client/{client_id}/{file_type}")
async def admin_upload_file_to_client(
    client_id: str,
    file_type: str,
    file: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    """Admin uploads a file for a specific client - Max 10GB"""
    if file_type not in ["music", "documents", "photos", "videos"]:
        raise HTTPException(status_code=400, detail="Type de fichier invalide. Utilisez: music, documents, photos, videos")
    
    # Verify client exists
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Read file in chunks for large files - ADMIN has 10GB limit
    MAX_SIZE = 10 * 1024 * 1024 * 1024  # 10GB for admin
    
    # Validate file types
    allowed_extensions = {
        "music": [".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"],
        "documents": [".pdf", ".doc", ".docx", ".txt", ".zip", ".rar"],
        "photos": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"],
        "videos": [".mp4", ".mov", ".avi", ".mkv", ".webm"]
    }
    
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions[file_type]:
        raise HTTPException(
            status_code=400, 
            detail=f"Extension non autorisée pour {file_type}. Extensions acceptées: {', '.join(allowed_extensions[file_type])}"
        )
    
    # Create client folder if not exists
    client_folder = UPLOADS_DIR / "client_transfers" / file_type / client_id
    client_folder.mkdir(parents=True, exist_ok=True)
    
    # Save file with streaming for large files
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{file_ext}"
    file_path = client_folder / safe_filename
    
    total_size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # Read 1MB at a time
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                f.close()
                file_path.unlink()  # Delete partial file
                raise HTTPException(status_code=400, detail="Fichier trop volumineux. Maximum 10GB.")
            f.write(chunk)
    
    # Store in database
    file_record = {
        "id": file_id,
        "client_id": client_id,
        "file_type": file_type,
        "original_name": file.filename,
        "stored_name": safe_filename,
        "file_url": f"/uploads/client_transfers/{file_type}/{client_id}/{safe_filename}",
        "size_bytes": total_size,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "uploaded_by": "admin",
        "admin_email": admin.get("email")
    }
    await db.client_transfers.insert_one(file_record)
    
    # Notify client by email
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    size_mb = round(total_size / (1024 * 1024), 2)
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; padding: 30px;">
            <h2 style="color: #D4AF37;">📁 Nouveau fichier disponible</h2>
            <p>Bonjour {client.get('name', 'Client')},</p>
            <p>Un nouveau fichier a été ajouté à votre espace client :</p>
            <div style="background-color: #3a3a3a; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Fichier :</strong> {file.filename}</p>
                <p><strong>Type :</strong> {file_type}</p>
                <p><strong>Taille :</strong> {size_mb} MB</p>
            </div>
            <a href="{site_url}/client/dashboard" style="display: inline-block; background: #D4AF37; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 5px;">
                Accéder à mon espace →
            </a>
        </div>
    </body>
    </html>
    """
    
    try:
        send_email(client.get("email"), f"📁 Nouveau fichier - {file.filename}", html_content)
    except Exception as e:
        logging.error(f"Failed to send file notification: {e}")
    
    logging.info(f"Admin {admin.get('email')} uploaded {file.filename} to client {client_id}")
    
    return {
        "success": True,
        "file_id": file_id,
        "file_url": file_record["file_url"],
        "size_mb": size_mb,
        "message": f"Fichier envoyé au client {client.get('name')}"
    }


@api_router.get("/admin/client-transfers/{client_id}")
async def admin_get_client_transfers(client_id: str, admin: dict = Depends(get_current_admin)):
    """Get all transferred files for a specific client"""
    files = await db.client_transfers.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(500)
    
    # Group by type
    grouped = {
        "music": [],
        "documents": [],
        "photos": [],
        "videos": []
    }
    for f in files:
        if f["file_type"] in grouped:
            grouped[f["file_type"]].append(f)
    
    return grouped


@api_router.delete("/admin/client-transfer/{file_id}")
async def admin_delete_client_transfer(file_id: str, admin: dict = Depends(get_current_admin)):
    """Admin deletes a client's transferred file"""
    file_record = await db.client_transfers.find_one({"id": file_id})
    if not file_record:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    # Delete physical file
    file_path = UPLOADS_DIR / "client_transfers" / file_record["file_type"] / file_record["client_id"] / file_record["stored_name"]
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.client_transfers.delete_one({"id": file_id})
    
    return {"success": True, "message": "Fichier supprimé"}


# ==================== CLIENT DEVIS/INVOICE/PAYMENT ENDPOINTS ====================

@api_router.get("/client/my-devis")
async def get_client_devis(client: dict = Depends(get_current_client)):
    """Get all devis for current client"""
    devis = await db.client_devis.find(
        {"client_id": client["id"]},
        {"_id": 0}
    ).sort("synced_at", -1).to_list(50)
    return devis


@api_router.get("/client/my-invoices")
async def get_client_invoices(client: dict = Depends(get_current_client)):
    """Get all invoices for current client"""
    invoices = await db.client_invoices.find(
        {"client_id": client["id"]},
        {"_id": 0}
    ).sort("invoice_date", -1).to_list(50)
    return invoices


@api_router.get("/client/my-payments")
async def get_client_payments(client: dict = Depends(get_current_client)):
    """Get all payments and summary for current client"""
    # Get all devis for total amount
    devis = await db.client_devis.find(
        {"client_id": client["id"]},
        {"_id": 0, "total_amount": 1, "devis_id": 1}
    ).to_list(50)
    
    total_devis = sum(d.get("total_amount", 0) for d in devis)
    
    # Get all payments
    payments = await db.client_payments.find(
        {"client_id": client["id"]},
        {"_id": 0}
    ).sort("payment_date", -1).to_list(100)
    
    total_paid = sum(p.get("amount", 0) for p in payments)
    remaining = total_devis - total_paid
    
    return {
        "total_amount": total_devis,
        "total_paid": total_paid,
        "remaining": remaining,
        "payments": payments
    }


# ==================== NEWSLETTER ENDPOINTS ====================

@api_router.get("/newsletter/unsubscribe/{client_id}")
async def unsubscribe_from_newsletter(client_id: str):
    """Unsubscribe a client from the newsletter"""
    # Find client by ID
    client = await db.clients.find_one({"id": client_id})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Check if already unsubscribed
    if not client.get("newsletter_subscribed", True):
        return {"message": "Vous êtes déjà désabonné de la newsletter", "already_unsubscribed": True}
    
    # Update subscription status
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"newsletter_subscribed": False}}
    )
    
    logging.info(f"Client {client.get('email')} unsubscribed from newsletter")
    
    return {
        "message": "Vous avez été désabonné avec succès de la newsletter CREATIVINDUSTRY",
        "email": client.get("email"),
        "already_unsubscribed": False
    }


@api_router.post("/newsletter/resubscribe/{client_id}")
async def resubscribe_to_newsletter(client_id: str):
    """Resubscribe a client to the newsletter"""
    # Find client by ID
    client = await db.clients.find_one({"id": client_id})
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Update subscription status
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"newsletter_subscribed": True}}
    )
    
    logging.info(f"Client {client.get('email')} resubscribed to newsletter")
    
    return {
        "message": "Vous êtes à nouveau abonné à la newsletter CREATIVINDUSTRY",
        "email": client.get("email")
    }


# ==================== ADMIN NEWSLETTER MANAGEMENT ====================

@api_router.get("/admin/newsletter/subscribers")
async def get_newsletter_subscribers(admin: dict = Depends(get_current_admin)):
    """Get all clients with their newsletter subscription status"""
    clients = await db.clients.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "email": 1, "newsletter_subscribed": 1, "created_at": 1}
    ).to_list(1000)
    
    # Add default newsletter_subscribed for older clients
    for client in clients:
        if "newsletter_subscribed" not in client:
            client["newsletter_subscribed"] = True
    
    subscribed = [c for c in clients if c.get("newsletter_subscribed", True)]
    unsubscribed = [c for c in clients if not c.get("newsletter_subscribed", True)]
    
    return {
        "total_clients": len(clients),
        "subscribed_count": len(subscribed),
        "unsubscribed_count": len(unsubscribed),
        "subscribers": subscribed,
        "unsubscribers": unsubscribed
    }


@api_router.get("/admin/newsletter/stats")
async def get_newsletter_stats(admin: dict = Depends(get_current_admin)):
    """Get newsletter statistics"""
    # Count total clients
    total_clients = await db.clients.count_documents({})
    
    # Count subscribed clients
    subscribed_count = await db.clients.count_documents({"newsletter_subscribed": {"$ne": False}})
    
    # Count unsubscribed clients
    unsubscribed_count = await db.clients.count_documents({"newsletter_subscribed": False})
    
    # Get newsletter history
    newsletter_history = await db.newsletter_history.find(
        {},
        {"_id": 0}
    ).sort("sent_at", -1).limit(10).to_list(10)
    
    # Calculate subscription rate
    subscription_rate = round((subscribed_count / total_clients * 100), 1) if total_clients > 0 else 0
    
    return {
        "total_clients": total_clients,
        "subscribed_count": subscribed_count,
        "unsubscribed_count": unsubscribed_count,
        "subscription_rate": subscription_rate,
        "recent_newsletters": newsletter_history
    }


class ManualNewsletterRequest(BaseModel):
    subject: str
    message: str


@api_router.post("/admin/newsletter/send")
async def send_manual_newsletter(data: ManualNewsletterRequest, admin: dict = Depends(get_current_admin)):
    """Send a manual newsletter to all subscribed clients"""
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        raise HTTPException(status_code=500, detail="SMTP non configuré")
    
    # Get all subscribed clients
    subscribers = await db.clients.find(
        {"newsletter_subscribed": {"$ne": False}},
        {"_id": 0, "email": 1, "name": 1}
    ).to_list(1000)
    
    if not subscribers:
        raise HTTPException(status_code=400, detail="Aucun abonné à la newsletter")
    
    site_url = os.environ.get('SITE_URL', 'https://creativindustry.com')
    sent_count = 0
    failed_count = 0
    
    for subscriber in subscribers:
        try:
            # Get client ID for unsubscribe link
            client = await db.clients.find_one({"email": subscriber["email"]}, {"id": 1})
            unsubscribe_link = f"{site_url}/unsubscribe/{client['id']}" if client else "#"
            
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px; margin: 0;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #000; font-size: 24px;">📬 CREATIVINDUSTRY</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 18px; margin-bottom: 10px;">Bonjour {subscriber.get('name', 'Client')},</p>
                        <div style="background-color: #3a3a3a; padding: 20px; border-radius: 8px; margin: 20px 0; line-height: 1.6;">
                            {data.message.replace(chr(10), '<br>')}
                        </div>
                        <a href="{site_url}" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 20px;">
                            Visiter le site →
                        </a>
                    </div>
                    <div style="padding: 20px; background-color: #222; text-align: center; border-top: 1px solid #333;">
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            CREATIVINDUSTRY France<br>
                            <a href="{unsubscribe_link}" style="color: #888; text-decoration: underline;">Se désabonner</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            send_email(subscriber["email"], data.subject, html_content)
            sent_count += 1
            
        except Exception as e:
            logging.error(f"Failed to send newsletter to {subscriber['email']}: {e}")
            failed_count += 1
    
    # Save to newsletter history
    await db.newsletter_history.insert_one({
        "id": str(uuid.uuid4()),
        "subject": data.subject,
        "message": data.message[:200] + "..." if len(data.message) > 200 else data.message,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "sent_count": sent_count,
        "failed_count": failed_count,
        "sent_by": admin.get("email", "admin")
    })
    
    logging.info(f"Manual newsletter sent: {sent_count} success, {failed_count} failed")
    
    return {
        "success": True,
        "message": f"Newsletter envoyée à {sent_count} abonné(s)",
        "sent_count": sent_count,
        "failed_count": failed_count
    }


# ==================== DEPLOYMENT MANAGEMENT ====================

# Configuration - Chemin du projet sur le serveur IONOS
PROJECT_PATH = os.environ.get('PROJECT_PATH', '/var/www/creativindustry')


@api_router.get("/admin/deployment/status")
async def get_deployment_status(admin: dict = Depends(get_current_admin)):
    """Get current deployment status including git info"""
    try:
        # Get current commit
        result = subprocess.run(
            ['git', 'log', '--oneline', '-1'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        current_commit = result.stdout.strip() if result.returncode == 0 else "Inconnu"
        
        # Get last 10 commits for rollback options
        result = subprocess.run(
            ['git', 'log', '--oneline', '-10'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        commits = []
        if result.returncode == 0:
            for line in result.stdout.strip().split('\n'):
                if line:
                    parts = line.split(' ', 1)
                    commits.append({
                        "hash": parts[0],
                        "message": parts[1] if len(parts) > 1 else ""
                    })
        
        # Get current branch
        result = subprocess.run(
            ['git', 'branch', '--show-current'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        branch = result.stdout.strip() if result.returncode == 0 else "main"
        
        # Check if there are updates available
        subprocess.run(['git', 'fetch', 'origin'], cwd=PROJECT_PATH, capture_output=True, timeout=30)
        result = subprocess.run(
            ['git', 'rev-list', '--count', f'{branch}..origin/{branch}'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        updates_available = int(result.stdout.strip()) if result.returncode == 0 and result.stdout.strip().isdigit() else 0
        
        return {
            "success": True,
            "current_commit": current_commit,
            "branch": branch,
            "commits": commits,
            "updates_available": updates_available,
            "project_path": PROJECT_PATH
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout lors de la récupération du statut")
    except Exception as e:
        logging.error(f"Deployment status error: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@api_router.post("/admin/deployment/update")
async def trigger_deployment_update(admin: dict = Depends(get_current_admin)):
    """Pull latest code and rebuild"""
    try:
        logs = []
        
        # Step 1: Git fetch and reset
        logs.append("📥 Récupération du code...")
        result = subprocess.run(
            ['git', 'fetch', 'origin'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        result = subprocess.run(
            ['git', 'reset', '--hard', 'origin/main'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            raise Exception(f"Git reset failed: {result.stderr}")
        logs.append("✅ Code mis à jour")
        
        # Step 2: Build frontend
        logs.append("🔨 Compilation du frontend...")
        frontend_path = os.path.join(PROJECT_PATH, 'frontend')
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=frontend_path,
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode != 0:
            raise Exception(f"Build failed: {result.stderr}")
        logs.append("✅ Frontend compilé")
        
        # Step 3: Restart service
        logs.append("🔄 Redémarrage du service...")
        result = subprocess.run(
            ['sudo', 'systemctl', 'restart', 'creativindustry'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            logs.append("⚠️ Redémarrage manuel peut être nécessaire")
        else:
            logs.append("✅ Service redémarré")
        
        # Get new commit info
        result = subprocess.run(
            ['git', 'log', '--oneline', '-1'],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=10
        )
        new_commit = result.stdout.strip() if result.returncode == 0 else "Inconnu"
        
        # Log the deployment
        await db.deployment_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "update",
            "commit": new_commit,
            "performed_by": admin.get("email"),
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "success": True,
            "logs": logs
        })
        
        return {
            "success": True,
            "message": "Mise à jour effectuée avec succès",
            "new_commit": new_commit,
            "logs": logs
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout lors de la mise à jour")
    except Exception as e:
        logging.error(f"Deployment update error: {e}")
        # Log failed deployment
        await db.deployment_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "update",
            "commit": "N/A",
            "performed_by": admin.get("email"),
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


class RollbackRequest(BaseModel):
    commit_hash: str


@api_router.post("/admin/deployment/rollback")
async def trigger_deployment_rollback(data: RollbackRequest, admin: dict = Depends(get_current_admin)):
    """Rollback to a specific commit"""
    try:
        logs = []
        
        # Step 1: Git checkout to specific commit
        logs.append(f"⏪ Retour à la version {data.commit_hash}...")
        result = subprocess.run(
            ['git', 'checkout', data.commit_hash],
            cwd=PROJECT_PATH,
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            raise Exception(f"Git checkout failed: {result.stderr}")
        logs.append("✅ Code restauré")
        
        # Step 2: Build frontend
        logs.append("🔨 Compilation du frontend...")
        frontend_path = os.path.join(PROJECT_PATH, 'frontend')
        result = subprocess.run(
            ['npm', 'run', 'build'],
            cwd=frontend_path,
            capture_output=True,
            text=True,
            timeout=300
        )
        if result.returncode != 0:
            raise Exception(f"Build failed: {result.stderr}")
        logs.append("✅ Frontend compilé")
        
        # Step 3: Restart service
        logs.append("🔄 Redémarrage du service...")
        result = subprocess.run(
            ['sudo', 'systemctl', 'restart', 'creativindustry'],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode != 0:
            logs.append("⚠️ Redémarrage manuel peut être nécessaire")
        else:
            logs.append("✅ Service redémarré")
        
        # Log the rollback
        await db.deployment_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "rollback",
            "commit": data.commit_hash,
            "performed_by": admin.get("email"),
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "success": True,
            "logs": logs
        })
        
        return {
            "success": True,
            "message": f"Rollback vers {data.commit_hash} effectué",
            "logs": logs
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Timeout lors du rollback")
    except Exception as e:
        logging.error(f"Deployment rollback error: {e}")
        await db.deployment_history.insert_one({
            "id": str(uuid.uuid4()),
            "action": "rollback",
            "commit": data.commit_hash,
            "performed_by": admin.get("email"),
            "performed_at": datetime.now(timezone.utc).isoformat(),
            "success": False,
            "error": str(e)
        })
        raise HTTPException(status_code=500, detail=f"Erreur: {str(e)}")


@api_router.get("/admin/deployment/history")
async def get_deployment_history(admin: dict = Depends(get_current_admin)):
    """Get deployment history"""
    history = await db.deployment_history.find(
        {},
        {"_id": 0}
    ).sort("performed_at", -1).limit(20).to_list(20)
    return history


# ==================== CLIENT PDF DOWNLOAD ENDPOINTS ====================

@api_router.get("/client/devis/{devis_id}/pdf")
async def download_devis_pdf(devis_id: str, client: dict = Depends(get_current_client)):
    """Download devis as PDF for client"""
    # Find the devis
    devis = await db.client_devis.find_one({"devis_id": devis_id, "client_id": client["id"]}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    # Company info
    company_info = {
        "name": "CREATIVINDUSTRY FRANCE",
        "legal": "SASU au capital de 101 €",
        "rcs": "RCS Paris 100 871 425",
        "siret": "SIRET : 100 871 425",
        "tva": "TVA intracommunautaire : FR7501100871425",
        "address": "60 rue François 1er, 75008 Paris",
        "email": "contact@creativindustry.com",
        "phone": ""
    }
    
    # Generate PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor('#d4af37'), alignment=TA_CENTER, spaceAfter=5)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=16, textColor=colors.HexColor('#d4af37'), alignment=TA_CENTER, spaceAfter=15)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#d4af37'), spaceBefore=20, spaceAfter=10)
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=11, spaceAfter=5)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#666666'), spaceAfter=2)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#888888'), alignment=TA_CENTER, spaceBefore=20)
    
    elements = []
    
    # Header with company info
    elements.append(Paragraph(company_info["name"], title_style))
    elements.append(Paragraph("DEVIS", subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Company details (left side info)
    elements.append(Paragraph(company_info["legal"], small_style))
    elements.append(Paragraph(company_info["rcs"], small_style))
    elements.append(Paragraph(company_info["siret"], small_style))
    elements.append(Paragraph(company_info["tva"], small_style))
    elements.append(Paragraph(f"Siège social : {company_info['address']}", small_style))
    elements.append(Paragraph(f"Email : {company_info['email']}", small_style))
    elements.append(Spacer(1, 20))
    
    # Devis info
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Paragraph(f"<b>Référence Devis :</b> DEV-{devis.get('devis_id', '')[:8].upper()}", normal_style))
    elements.append(Paragraph(f"<b>Date d'émission :</b> {devis.get('synced_at', '')[:10] if devis.get('synced_at') else 'N/A'}", normal_style))
    elements.append(Paragraph(f"<b>Client :</b> {client.get('name', 'N/A')}", normal_style))
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Spacer(1, 15))
    
    # Event info
    if devis.get('event_type'):
        elements.append(Paragraph(f"<b>Type d'événement :</b> {devis.get('event_type')}", normal_style))
    if devis.get('event_date'):
        elements.append(Paragraph(f"<b>Date de l'événement :</b> {devis.get('event_date')}", normal_style))
    
    # Devis details if available
    devis_data = devis.get('devis_data', {})
    if devis_data and isinstance(devis_data, dict):
        elements.append(Spacer(1, 15))
        elements.append(Paragraph("Détails de la prestation", heading_style))
        for key, value in devis_data.items():
            if key not in ['_id', 'id']:
                elements.append(Paragraph(f"• {key} : {value}", normal_style))
    
    elements.append(Spacer(1, 25))
    
    # Calculate TVA 20%
    total_ttc = float(devis.get('total_amount', 0))
    total_ht = round(total_ttc / 1.20, 2)
    tva_amount = round(total_ttc - total_ht, 2)
    
    # Totals with TVA breakdown
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Paragraph(f"<b>Total HT :</b> {total_ht:.2f} €", normal_style))
    elements.append(Paragraph(f"<b>TVA (20%) :</b> {tva_amount:.2f} €", normal_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>TOTAL TTC :</b> {total_ttc:.2f} €", ParagraphStyle('Total', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#d4af37'))))
    elements.append(Paragraph("─" * 60, normal_style))
    
    # Legal footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Conditions de paiement : 30% à la commande, solde à la livraison", footer_style))
    elements.append(Paragraph("Validité du devis : 30 jours", footer_style))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph(f"{company_info['name']} - {company_info['legal']}", footer_style))
    elements.append(Paragraph(f"{company_info['siret']} - {company_info['tva']}", footer_style))
    elements.append(Paragraph(f"{company_info['address']}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Devis_{devis_id[:8].upper()}.pdf"}
    )


@api_router.get("/client/invoice/{invoice_id}/pdf")
async def download_invoice_pdf(invoice_id: str, client: dict = Depends(get_current_client)):
    """Download invoice as PDF for client"""
    # Find the invoice
    invoice = await db.client_invoices.find_one({"invoice_id": invoice_id, "client_id": client["id"]}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Check if we have a stored PDF file
    pdf_path = invoice.get('pdf_path')
    if pdf_path:
        full_path = UPLOADS_DIR / pdf_path.lstrip('/uploads/')
        if full_path.exists():
            return FileResponse(
                str(full_path),
                media_type="application/pdf",
                filename=f"Facture_{invoice.get('invoice_number', invoice_id[:8])}.pdf"
            )
    
    # Company info
    company_info = {
        "name": "CREATIVINDUSTRY FRANCE",
        "legal": "SASU au capital de 101 €",
        "rcs": "RCS Paris 100 871 425",
        "siret": "SIRET : 100 871 425",
        "tva": "TVA intracommunautaire : FR7501100871425",
        "address": "60 rue François 1er, 75008 Paris",
        "email": "contact@creativindustry.com",
        "phone": ""
    }
    
    # Generate PDF if no stored file
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=1.5*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=22, textColor=colors.HexColor('#d4af37'), alignment=TA_CENTER, spaceAfter=5)
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'], fontSize=16, textColor=colors.HexColor('#d4af37'), alignment=TA_CENTER, spaceAfter=15)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#d4af37'), spaceBefore=20, spaceAfter=10)
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'], fontSize=11, spaceAfter=5)
    small_style = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#666666'), spaceAfter=2)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor('#888888'), alignment=TA_CENTER, spaceBefore=20)
    
    elements = []
    
    # Header with company info
    elements.append(Paragraph(company_info["name"], title_style))
    elements.append(Paragraph("FACTURE", subtitle_style))
    elements.append(Spacer(1, 10))
    
    # Company details
    elements.append(Paragraph(company_info["legal"], small_style))
    elements.append(Paragraph(company_info["rcs"], small_style))
    elements.append(Paragraph(company_info["siret"], small_style))
    elements.append(Paragraph(company_info["tva"], small_style))
    elements.append(Paragraph(f"Siège social : {company_info['address']}", small_style))
    elements.append(Paragraph(f"Email : {company_info['email']}", small_style))
    elements.append(Spacer(1, 20))
    
    # Invoice info
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Paragraph(f"<b>Numéro de facture :</b> {invoice.get('invoice_number', 'N/A')}", normal_style))
    elements.append(Paragraph(f"<b>Date d'émission :</b> {invoice.get('invoice_date', 'N/A')}", normal_style))
    elements.append(Paragraph(f"<b>Client :</b> {client.get('name', 'N/A')}", normal_style))
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Spacer(1, 20))
    
    # Amount with TVA breakdown
    total_ttc = float(invoice.get('amount', 0))
    total_ht = round(total_ttc / 1.20, 2)
    tva_amount = round(total_ttc - total_ht, 2)
    
    elements.append(Paragraph("Désignation", heading_style))
    elements.append(Paragraph("Prestation de services audiovisuels", normal_style))
    elements.append(Spacer(1, 20))
    
    # Totals with TVA
    elements.append(Paragraph("─" * 60, normal_style))
    elements.append(Paragraph(f"<b>Total HT :</b> {total_ht:.2f} €", normal_style))
    elements.append(Paragraph(f"<b>TVA (20%) :</b> {tva_amount:.2f} €", normal_style))
    elements.append(Spacer(1, 10))
    elements.append(Paragraph(f"<b>TOTAL TTC :</b> {total_ttc:.2f} €", ParagraphStyle('Total', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#d4af37'))))
    elements.append(Paragraph("─" * 60, normal_style))
    
    # Legal footer
    elements.append(Spacer(1, 30))
    elements.append(Paragraph("Conditions de règlement : paiement à réception de facture", footer_style))
    elements.append(Paragraph("En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.", footer_style))
    elements.append(Paragraph("Indemnité forfaitaire pour frais de recouvrement : 40 €", footer_style))
    elements.append(Spacer(1, 15))
    elements.append(Paragraph(f"{company_info['name']} - {company_info['legal']}", footer_style))
    elements.append(Paragraph(f"{company_info['siret']} - {company_info['tva']}", footer_style))
    elements.append(Paragraph(f"{company_info['address']}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Facture_{invoice.get('invoice_number', invoice_id[:8])}.pdf"}
    )


# ==================== ADMIN DOWNLOAD CLIENT FILES AS ZIP ====================

@api_router.get("/admin/client/{client_id}/files-zip")
async def download_client_files_zip(client_id: str, admin: dict = Depends(get_current_admin)):
    """Download all files from a specific client as ZIP"""
    # Verify client exists
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get all client transfers
    files = await db.client_transfers.find({"client_id": client_id}, {"_id": 0}).to_list(1000)
    
    if not files:
        raise HTTPException(status_code=404, detail="Aucun fichier à télécharger pour ce client")
    
    # Create temporary ZIP file
    client_name = client.get('name', 'client').replace(' ', '_')
    zip_filename = f"Fichiers_{client_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    zip_path = UPLOADS_DIR / zip_filename
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
            for file_record in files:
                file_type = file_record.get('file_type', 'other')
                stored_name = file_record.get('stored_name')
                original_name = file_record.get('original_name', stored_name)
                
                file_path = UPLOADS_DIR / "client_transfers" / file_type / client_id / stored_name
                
                if file_path.exists():
                    # Add to ZIP with folder structure: type/original_filename
                    arcname = f"{file_type}/{original_name}"
                    zipf.write(file_path, arcname)
        
        # Return file response
        return FileResponse(
            str(zip_path),
            media_type="application/zip",
            filename=zip_filename,
            background=BackgroundTask(lambda: zip_path.unlink() if zip_path.exists() else None)
        )
    except Exception as e:
        logging.error(f"Error creating ZIP: {e}")
        if zip_path.exists():
            zip_path.unlink()
        raise HTTPException(status_code=500, detail=f"Erreur lors de la création du ZIP: {str(e)}")


# ==================== CHAT WEBSOCKET SYSTEM ====================

from fastapi import WebSocket, WebSocketDisconnect
from starlette.background import BackgroundTask
from fastapi.responses import StreamingResponse
from typing import Dict, Set
import json
import asyncio

# Store active connections
class ConnectionManager:
    def __init__(self):
        # {client_id: websocket} for clients
        self.client_connections: Dict[str, WebSocket] = {}
        # {admin_id: websocket} for admins
        self.admin_connections: Dict[str, WebSocket] = {}
    
    async def connect_client(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.client_connections[client_id] = websocket
    
    async def connect_admin(self, websocket: WebSocket, admin_id: str):
        await websocket.accept()
        self.admin_connections[admin_id] = websocket
    
    def disconnect_client(self, client_id: str):
        if client_id in self.client_connections:
            del self.client_connections[client_id]
    
    def disconnect_admin(self, admin_id: str):
        if admin_id in self.admin_connections:
            del self.admin_connections[admin_id]
    
    async def send_to_client(self, client_id: str, message: dict):
        if client_id in self.client_connections:
            try:
                await self.client_connections[client_id].send_json(message)
            except Exception as e:
                logging.error(f"Error sending to client {client_id}: {e}")
                self.disconnect_client(client_id)
    
    async def send_to_admin(self, admin_id: str, message: dict):
        if admin_id in self.admin_connections:
            try:
                await self.admin_connections[admin_id].send_json(message)
            except Exception as e:
                logging.error(f"Error sending to admin {admin_id}: {e}")
                self.disconnect_admin(admin_id)
    
    async def broadcast_to_admins(self, message: dict):
        for admin_id in list(self.admin_connections.keys()):
            await self.send_to_admin(admin_id, message)
    
    def get_online_clients(self):
        return list(self.client_connections.keys())

manager = ConnectionManager()

# Create chat uploads directory
(UPLOADS_DIR / "chat").mkdir(exist_ok=True)


# Chat message model
class ChatMessageCreate(BaseModel):
    content: str
    recipient_id: str  # client_id if admin sends, "admin" if client sends
    message_type: str = "text"  # text, image, file
    file_url: Optional[str] = None
    file_name: Optional[str] = None


@api_router.websocket("/ws/chat/client/{client_id}")
async def websocket_client_endpoint(websocket: WebSocket, client_id: str, token: str = None):
    """WebSocket endpoint for client chat"""
    # Verify token
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "client" or payload.get("sub") != client_id:
            await websocket.close(code=4003)
            return
    except:
        await websocket.close(code=4001)
        return
    
    await manager.connect_client(websocket, client_id)
    
    # Get client info
    client = await db.clients.find_one({"id": client_id}, {"_id": 0, "name": 1, "email": 1})
    
    # Notify admins that client is online
    await manager.broadcast_to_admins({
        "type": "client_online",
        "client_id": client_id,
        "client_name": client.get("name", "Unknown") if client else "Unknown"
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            # Store message in database
            message_id = str(uuid.uuid4())
            message_record = {
                "id": message_id,
                "conversation_id": f"client_{client_id}",
                "sender_type": "client",
                "sender_id": client_id,
                "sender_name": client.get("name", "Client") if client else "Client",
                "content": data.get("content", ""),
                "message_type": data.get("message_type", "text"),
                "file_url": data.get("file_url"),
                "file_name": data.get("file_name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "read": False
            }
            await db.chat_messages.insert_one(message_record)
            
            # Send to all admins
            await manager.broadcast_to_admins({
                "type": "new_message",
                "message": {k: v for k, v in message_record.items() if k != "_id"}
            })
            
    except WebSocketDisconnect:
        manager.disconnect_client(client_id)
        # Notify admins
        await manager.broadcast_to_admins({
            "type": "client_offline",
            "client_id": client_id
        })


@api_router.websocket("/ws/chat/admin/{admin_id}")
async def websocket_admin_endpoint(websocket: WebSocket, admin_id: str, token: str = None):
    """WebSocket endpoint for admin chat"""
    # Verify token
    if not token:
        await websocket.close(code=4001)
        return
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "admin" or payload.get("sub") != admin_id:
            await websocket.close(code=4003)
            return
    except:
        await websocket.close(code=4001)
        return
    
    await manager.connect_admin(websocket, admin_id)
    
    # Send list of online clients
    online_clients = manager.get_online_clients()
    clients_info = []
    for cid in online_clients:
        client = await db.clients.find_one({"id": cid}, {"_id": 0, "id": 1, "name": 1, "email": 1})
        if client:
            clients_info.append(client)
    
    await websocket.send_json({
        "type": "online_clients",
        "clients": clients_info
    })
    
    try:
        while True:
            data = await websocket.receive_json()
            
            client_id = data.get("recipient_id")
            if not client_id:
                continue
            
            # Get admin info
            admin = await db.admins.find_one({"id": admin_id}, {"_id": 0, "name": 1})
            
            # Store message in database
            message_id = str(uuid.uuid4())
            message_record = {
                "id": message_id,
                "conversation_id": f"client_{client_id}",
                "sender_type": "admin",
                "sender_id": admin_id,
                "sender_name": admin.get("name", "Admin") if admin else "Admin",
                "recipient_id": client_id,
                "content": data.get("content", ""),
                "message_type": data.get("message_type", "text"),
                "file_url": data.get("file_url"),
                "file_name": data.get("file_name"),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "read": False
            }
            await db.chat_messages.insert_one(message_record)
            
            # Send to specific client
            await manager.send_to_client(client_id, {
                "type": "new_message",
                "message": {k: v for k, v in message_record.items() if k != "_id"}
            })
            
            # Also broadcast to other admins
            for other_admin_id in manager.admin_connections.keys():
                if other_admin_id != admin_id:
                    await manager.send_to_admin(other_admin_id, {
                        "type": "new_message",
                        "message": {k: v for k, v in message_record.items() if k != "_id"}
                    })
            
    except WebSocketDisconnect:
        manager.disconnect_admin(admin_id)


@api_router.get("/chat/conversations")
async def get_chat_conversations(admin: dict = Depends(get_current_admin)):
    """Get all chat conversations for admin"""
    # Get unique conversation IDs
    pipeline = [
        {"$match": {"conversation_id": {"$ne": None, "$exists": True}}},
        {"$group": {"_id": "$conversation_id", "last_message": {"$last": "$$ROOT"}, "unread_count": {"$sum": {"$cond": [{"$and": [{"$eq": ["$read", False]}, {"$eq": ["$sender_type", "client"]}]}, 1, 0]}}}},
        {"$sort": {"last_message.created_at": -1}}
    ]
    conversations = await db.chat_messages.aggregate(pipeline).to_list(100)
    
    result = []
    for conv in conversations:
        conversation_id = conv.get("_id")
        if not conversation_id or not isinstance(conversation_id, str):
            continue
        client_id = conversation_id.replace("client_", "")
        client = await db.clients.find_one({"id": client_id}, {"_id": 0, "id": 1, "name": 1, "email": 1, "profile_photo": 1})
        if client:
            result.append({
                "conversation_id": conversation_id,
                "client": client,
                "last_message": {k: v for k, v in conv["last_message"].items() if k != "_id"},
                "unread_count": conv["unread_count"],
                "is_online": client_id in manager.client_connections
            })
    
    return result


@api_router.get("/chat/messages/{client_id}")
async def get_chat_messages(client_id: str, admin: dict = Depends(get_current_admin)):
    """Get chat messages for a specific client conversation"""
    messages = await db.chat_messages.find(
        {"conversation_id": f"client_{client_id}"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Mark messages as read
    await db.chat_messages.update_many(
        {"conversation_id": f"client_{client_id}", "sender_type": "client", "read": False},
        {"$set": {"read": True}}
    )
    
    return messages


@api_router.get("/chat/my-messages")
async def get_my_chat_messages(client: dict = Depends(get_current_client)):
    """Get chat messages for current client"""
    messages = await db.chat_messages.find(
        {"conversation_id": f"client_{client['id']}"},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # Mark admin messages as read
    await db.chat_messages.update_many(
        {"conversation_id": f"client_{client['id']}", "sender_type": "admin", "read": False},
        {"$set": {"read": True}}
    )
    
    return messages


@api_router.post("/chat/upload")
async def upload_chat_file(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Upload file for chat (images or documents)"""
    # Verify token (can be admin or client)
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        user_type = payload.get("type")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Validate file type
    allowed_types = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'application/zip'
    ]
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.txt', '.zip']
    
    file_ext = Path(file.filename).suffix.lower()
    if file.content_type not in allowed_types and file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Type de fichier non supporté")
    
    # Max size 50MB for chat files
    MAX_SIZE = 50 * 1024 * 1024
    
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}{file_ext}"
    file_path = UPLOADS_DIR / "chat" / safe_filename
    
    total_size = 0
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            total_size += len(chunk)
            if total_size > MAX_SIZE:
                f.close()
                file_path.unlink()
                raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 50MB)")
            f.write(chunk)
    
    # Determine message type
    message_type = "image" if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp'] else "file"
    
    return {
        "file_url": f"/uploads/chat/{safe_filename}",
        "file_name": file.filename,
        "message_type": message_type,
        "size": total_size
    }


@api_router.get("/chat/unread-count")
async def get_unread_count(admin: dict = Depends(get_current_admin)):
    """Get total unread message count for admin"""
    count = await db.chat_messages.count_documents({
        "sender_type": "client",
        "read": False
    })
    return {"unread_count": count}


@api_router.get("/chat/client/unread-count")
async def get_client_unread_count(client: dict = Depends(get_current_client)):
    """Get unread message count for client"""
    count = await db.chat_messages.count_documents({
        "conversation_id": f"client_{client['id']}",
        "sender_type": "admin",
        "read": False
    })
    return {"unread_count": count}


# ==================== TASK MANAGEMENT ROUTES ====================

from models.schemas import TeamUser, TeamUserCreate, TeamUserUpdate, TeamUserLogin, TeamUserResponse, Task, TaskCreate, TaskUpdate

# Team User Management

@api_router.post("/admin/team-users", response_model=dict)
async def create_team_user(data: TeamUserCreate, admin: dict = Depends(get_current_admin)):
    """Create a new team user (admin only)"""
    # Check if email already exists
    existing = await db.team_users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"]
    }
    await db.team_users.insert_one(user_doc)
    
    logging.info(f"Team user created: {data.email} with role {data.role} by admin {admin.get('email')}")
    
    return {
        "success": True,
        "user": {
            "id": user_id,
            "email": data.email,
            "name": data.name,
            "role": data.role,
            "is_active": True
        }
    }


@api_router.get("/admin/team-users")
async def get_team_users(admin: dict = Depends(get_current_admin)):
    """Get all team users"""
    users = await db.team_users.find({}, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(100)
    return users


@api_router.put("/admin/team-users/{user_id}")
async def update_team_user(user_id: str, data: TeamUserUpdate, admin: dict = Depends(get_current_admin)):
    """Update a team user"""
    user = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    await db.team_users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.team_users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return {"success": True, "user": updated_user}


@api_router.delete("/admin/team-users/{user_id}")
async def delete_team_user(user_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a team user"""
    user = await db.team_users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    await db.team_users.delete_one({"id": user_id})
    
    logging.info(f"Team user deleted: {user.get('email')} by admin {admin.get('email')}")
    
    return {"success": True, "message": "Utilisateur supprimé"}


@api_router.post("/team/login")
async def login_team_user(data: TeamUserLogin):
    """Login for team users"""
    user = await db.team_users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Ce compte est désactivé")
    
    # Update last login
    await db.team_users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(user["id"], "team")
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }


async def get_current_team_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current team user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "team":
            raise HTTPException(status_code=401, detail="Token invalide")
        user = await db.team_users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        if not user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Compte désactivé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


@api_router.get("/team/me")
async def get_team_me(user: dict = Depends(get_current_team_user)):
    """Get current team user profile"""
    return TeamUserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        is_active=user.get("is_active", True)
    )


# Task Management

@api_router.post("/tasks", response_model=dict)
async def create_task(data: TaskCreate, admin: dict = Depends(get_current_admin)):
    """Create a new task (admin only)"""
    task_id = str(uuid.uuid4())
    
    # Get assigned user names
    assigned_names = []
    if data.assigned_to:
        for user_id in data.assigned_to:
            user = await db.team_users.find_one({"id": user_id}, {"_id": 0, "name": 1})
            if user:
                assigned_names.append(user["name"])
    
    # Get client name if linked
    client_name = None
    if data.client_id:
        client = await db.clients.find_one({"id": data.client_id}, {"_id": 0, "name": 1})
        if client:
            client_name = client["name"]
    
    # Prepare reminders
    reminders = []
    for r in data.reminders:
        reminders.append({
            "days_before": r.get("days_before", 1),
            "enabled": r.get("enabled", True),
            "sent": False,
            "last_sent_at": None
        })
    
    task_doc = {
        "id": task_id,
        "title": data.title,
        "description": data.description,
        "due_date": data.due_date,
        "priority": data.priority,
        "status": "pending",
        "client_id": data.client_id,
        "client_name": client_name,
        "assigned_to": data.assigned_to,
        "assigned_names": assigned_names,
        "created_by": admin["id"],
        "created_by_name": admin.get("name", "Admin"),
        "reminders": reminders,
        "client_visible": data.client_visible,
        "client_status_label": data.client_status_label,
        "step_number": data.step_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None,
        "completed_at": None
    }
    
    await db.tasks.insert_one(task_doc)
    
    logging.info(f"Task created: {data.title} by admin {admin.get('email')}")
    
    # Remove _id before returning
    task_doc.pop("_id", None)
    return {"success": True, "task": task_doc}


@api_router.get("/tasks")
async def get_tasks(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    client_id: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Get all tasks with optional filters"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if client_id:
        query["client_id"] = client_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(500)
    return tasks


@api_router.get("/tasks/{task_id}")
async def get_task(task_id: str, admin: dict = Depends(get_current_admin)):
    """Get a single task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    return task


@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, data: TaskUpdate, admin: dict = Depends(get_current_admin)):
    """Update a task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Update assigned names if assigned_to changed
    if "assigned_to" in update_data:
        assigned_names = []
        for user_id in update_data["assigned_to"]:
            user = await db.team_users.find_one({"id": user_id}, {"_id": 0, "name": 1})
            if user:
                assigned_names.append(user["name"])
        update_data["assigned_names"] = assigned_names
    
    # Update client name if client_id changed
    if "client_id" in update_data:
        if update_data["client_id"]:
            client = await db.clients.find_one({"id": update_data["client_id"]}, {"_id": 0, "name": 1})
            update_data["client_name"] = client["name"] if client else None
        else:
            update_data["client_name"] = None
    
    # Set completed_at if status changed to completed
    if update_data.get("status") == "completed" and task.get("status") != "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif update_data.get("status") != "completed":
        update_data["completed_at"] = None
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return {"success": True, "task": updated_task}


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, admin: dict = Depends(get_current_admin)):
    """Delete a task"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    await db.tasks.delete_one({"id": task_id})
    
    logging.info(f"Task deleted: {task.get('title')} by admin {admin.get('email')}")
    
    return {"success": True, "message": "Tâche supprimée"}


@api_router.post("/tasks/{task_id}/toggle-status")
async def toggle_task_status(task_id: str, admin: dict = Depends(get_current_admin)):
    """Quick toggle between pending and completed"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    new_status = "completed" if task["status"] != "completed" else "pending"
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if new_status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update_data["completed_at"] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    return {"success": True, "status": new_status}


@api_router.get("/tasks/stats/overview")
async def get_tasks_stats(admin: dict = Depends(get_current_admin)):
    """Get task statistics"""
    total = await db.tasks.count_documents({})
    pending = await db.tasks.count_documents({"status": "pending"})
    in_progress = await db.tasks.count_documents({"status": "in_progress"})
    completed = await db.tasks.count_documents({"status": "completed"})
    
    # Get overdue tasks
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    overdue = await db.tasks.count_documents({
        "status": {"$ne": "completed"},
        "due_date": {"$lt": today}
    })
    
    # Get tasks due today
    due_today = await db.tasks.count_documents({
        "status": {"$ne": "completed"},
        "due_date": today
    })
    
    # Get high priority pending
    high_priority = await db.tasks.count_documents({
        "status": {"$ne": "completed"},
        "priority": "high"
    })
    
    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
        "due_today": due_today,
        "high_priority": high_priority
    }


# Team user access to tasks (based on role)

@api_router.get("/team/tasks")
async def get_team_tasks(
    status: Optional[str] = None,
    user: dict = Depends(get_current_team_user)
):
    """Get tasks for team user (only assigned to them or all if editor/admin role)"""
    query = {}
    if status:
        query["status"] = status
    
    # Readers only see tasks assigned to them
    if user["role"] == "reader":
        query["assigned_to"] = user["id"]
    
    tasks = await db.tasks.find(query, {"_id": 0}).sort("due_date", 1).to_list(500)
    return tasks


@api_router.put("/team/tasks/{task_id}/status")
async def update_team_task_status(task_id: str, status: str, user: dict = Depends(get_current_team_user)):
    """Update task status (editors and assigned users can update)"""
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Tâche non trouvée")
    
    # Check permissions
    if user["role"] == "reader" and user["id"] not in task.get("assigned_to", []):
        raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à modifier cette tâche")
    
    if status not in ["pending", "in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
    
    update_data = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    else:
        update_data["completed_at"] = None
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    return {"success": True, "status": status}


# Client project status endpoint

@api_router.get("/client/project-status")
async def get_client_project_status(client: dict = Depends(get_current_client)):
    """Get project status updates visible to the client"""
    # Find tasks linked to this client that are visible to them
    tasks = await db.tasks.find(
        {
            "client_id": client["id"],
            "client_visible": True
        },
        {"_id": 0, "id": 1, "title": 1, "client_status_label": 1, "status": 1, "due_date": 1, "updated_at": 1, "step_number": 1, "assigned_names": 1, "completed_at": 1}
    ).sort("step_number", 1).to_list(50)
    
    return tasks


# Task reminder check endpoint (to be called by cron)

@api_router.post("/tasks/check-reminders")
async def check_task_reminders(request: Request):
    """Check and send task reminders - called by cron job"""
    # Verify internal call or admin
    auth_header = request.headers.get("Authorization")
    internal_key = os.environ.get("INTERNAL_API_KEY", "")
    
    if auth_header != f"Bearer {internal_key}" and internal_key:
        # Try to verify as admin
        try:
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                if payload.get("type") != "admin":
                    raise HTTPException(status_code=401, detail="Non autorisé")
            else:
                raise HTTPException(status_code=401, detail="Non autorisé")
        except:
            raise HTTPException(status_code=401, detail="Non autorisé")
    
    today = datetime.now(timezone.utc).date()
    reminders_sent = 0
    
    # Get all pending/in_progress tasks
    tasks = await db.tasks.find(
        {"status": {"$ne": "completed"}},
        {"_id": 0}
    ).to_list(1000)
    
    for task in tasks:
        task_due_date = datetime.strptime(task["due_date"], "%Y-%m-%d").date()
        
        for i, reminder in enumerate(task.get("reminders", [])):
            if not reminder.get("enabled", True) or reminder.get("sent", False):
                continue
            
            days_before = reminder.get("days_before", 1)
            reminder_date = task_due_date - timedelta(days=days_before)
            
            if reminder_date == today:
                # Send reminder emails to assigned users
                for user_id in task.get("assigned_to", []):
                    user = await db.team_users.find_one({"id": user_id}, {"_id": 0})
                    if user and user.get("email"):
                        # Prepare email
                        days_text = "aujourd'hui" if days_before == 0 else f"dans {days_before} jour(s)" if days_before > 0 else f"depuis {-days_before} jour(s)"
                        
                        html_content = f"""
                        <html>
                        <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
                            <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; padding: 30px; border-radius: 10px;">
                                <h1 style="color: #D4AF37;">⏰ Rappel de tâche</h1>
                                <p>Bonjour {user.get('name', '')},</p>
                                <p>Ceci est un rappel pour la tâche suivante :</p>
                                <div style="background-color: #3a3a3a; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h2 style="color: #D4AF37; margin-top: 0;">{task['title']}</h2>
                                    <p><strong>Échéance :</strong> {task['due_date']} ({days_text})</p>
                                    <p><strong>Priorité :</strong> {task['priority'].upper()}</p>
                                    {f"<p><strong>Client :</strong> {task['client_name']}</p>" if task.get('client_name') else ""}
                                    {f"<p>{task['description']}</p>" if task.get('description') else ""}
                                </div>
                                <p style="color: #888;">Connectez-vous à votre espace pour marquer cette tâche comme terminée.</p>
                            </div>
                        </body>
                        </html>
                        """
                        
                        try:
                            send_email(user["email"], f"⏰ Rappel : {task['title']}", html_content)
                            reminders_sent += 1
                        except Exception as e:
                            logging.error(f"Failed to send reminder to {user['email']}: {e}")
                
                # Also send to admin email
                admin_email = os.environ.get("SMTP_EMAIL")
                if admin_email:
                    try:
                        send_email(admin_email, f"⏰ Rappel de tâche : {task['title']}", html_content)
                    except:
                        pass
                
                # Mark reminder as sent
                task["reminders"][i]["sent"] = True
                task["reminders"][i]["last_sent_at"] = datetime.now(timezone.utc).isoformat()
                
                await db.tasks.update_one(
                    {"id": task["id"]},
                    {"$set": {"reminders": task["reminders"]}}
                )
    
    logging.info(f"Task reminders checked: {reminders_sent} sent")
    return {"success": True, "reminders_sent": reminders_sent}


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
