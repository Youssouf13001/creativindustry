"""
Routes d'intégration PayPal
"""
import os
import uuid
import logging
import jwt
from datetime import datetime, timezone, timedelta
from io import BytesIO
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional

import paypalrestsdk
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

from config import db, PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_MODE, SITE_URL, SECRET_KEY, ALGORITHM, SMTP_EMAIL, SMTP_PASSWORD
from dependencies import get_current_admin, get_current_client, security

router = APIRouter(tags=["PayPal"])


# Configure PayPal SDK
paypalrestsdk.configure({
    "mode": PAYPAL_MODE,
    "client_id": PAYPAL_CLIENT_ID,
    "client_secret": PAYPAL_SECRET
})


# PayPal Plans (prices TTC with 20% TVA)
PAYPAL_PLANS = {
    "weekly": {"label": "1 semaine", "price": "24.00", "price_ht": "20.00", "tva": "4.00", "days": 7, "currency": "EUR"},
    "6months": {"label": "6 mois", "price": "108.00", "price_ht": "90.00", "tva": "18.00", "days": 180, "currency": "EUR"}
}


# ==================== REQUEST MODELS ====================

class PayPalOrderCreate(BaseModel):
    client_email: str
    plan: str

class PayPalOrderCapture(BaseModel):
    order_id: str

class DevisPaymentCreate(BaseModel):
    devis_id: Optional[str] = None
    invoice_id: Optional[str] = None
    document_id: Optional[str] = None
    amount: float
    description: Optional[str] = None


# ==================== EMAIL HELPER ====================

def send_email(to_email: str, subject: str, html_content: str):
    """Send email helper - imported from config"""
    import smtplib
    import re
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.utils import formatdate, make_msgid
    
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        msg['Date'] = formatdate(localtime=True)
        msg['Message-ID'] = make_msgid(domain='creativindustry.com')
        
        text_content = re.sub(r'<[^>]+>', '', html_content)
        text_content = re.sub(r'\s+', ' ', text_content).strip()
        text_part = MIMEText(text_content, 'plain', 'utf-8')
        html_part = MIMEText(html_content, 'html', 'utf-8')
        
        msg.attach(text_part)
        msg.attach(html_part)
        
        with smtplib.SMTP(os.environ.get('SMTP_HOST', 'smtp.ionos.fr'), int(os.environ.get('SMTP_PORT', 587))) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False


# ==================== PAYPAL RENEWAL ROUTES ====================

@router.post("/paypal/create-order")
async def create_paypal_order(data: PayPalOrderCreate):
    """Create a PayPal order for renewal payment"""
    
    client = await db.clients.find_one({"email": data.client_email}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    if data.plan not in PAYPAL_PLANS:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    plan = PAYPAL_PLANS[data.plan]
    
    payment = paypalrestsdk.Payment({
        "intent": "sale",
        "payer": {"payment_method": "paypal"},
        "redirect_urls": {
            "return_url": f"{SITE_URL}/renouvellement/success",
            "cancel_url": f"{SITE_URL}/renouvellement/cancel"
        },
        "transactions": [{
            "item_list": {
                "items": [{
                    "name": f"Renouvellement CREATIVINDUSTRY - {plan['label']}",
                    "sku": data.plan,
                    "price": plan['price'],
                    "currency": plan['currency'],
                    "quantity": 1
                }]
            },
            "amount": {"total": plan['price'], "currency": plan['currency']},
            "description": f"Renouvellement d'accès CREATIVINDUSTRY - {plan['label']} pour {client['name']}"
        }],
        "note_to_payer": f"Renouvellement compte CREATIVINDUSTRY pour {client['email']}"
    })
    
    if payment.create():
        payment_record = {
            "id": str(uuid.uuid4()),
            "paypal_payment_id": payment.id,
            "client_id": client["id"],
            "client_email": client["email"],
            "client_name": client["name"],
            "plan": data.plan,
            "plan_label": plan["label"],
            "amount": float(plan["price"]),
            "days": plan["days"],
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.paypal_payments.insert_one(payment_record)
        
        approval_url = None
        for link in payment.links:
            if link.rel == "approval_url":
                approval_url = link.href
                break
        
        return {"success": True, "payment_id": payment.id, "approval_url": approval_url}
    else:
        logging.error(f"PayPal error: {payment.error}")
        raise HTTPException(status_code=500, detail=f"Erreur PayPal: {payment.error.get('message', 'Unknown error')}")


@router.post("/paypal/execute-payment")
async def execute_paypal_payment(payment_id: str, payer_id: str):
    """Execute (capture) a PayPal payment after user approval"""
    
    payment_record = await db.paypal_payments.find_one({"paypal_payment_id": payment_id}, {"_id": 0})
    if not payment_record:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment_record["status"] != "pending":
        raise HTTPException(status_code=400, detail="Ce paiement a déjà été traité")
    
    payment = paypalrestsdk.Payment.find(payment_id)
    
    if payment.execute({"payer_id": payer_id}):
        new_expires_at = (datetime.now(timezone.utc) + timedelta(days=payment_record["days"])).isoformat()
        
        await db.clients.update_one(
            {"id": payment_record["client_id"]},
            {"$set": {
                "expires_at": new_expires_at,
                "last_renewal": datetime.now(timezone.utc).isoformat(),
                "last_renewal_plan": payment_record["plan"],
                "last_renewal_amount": payment_record["amount"]
            }}
        )
        
        await db.paypal_payments.update_one(
            {"paypal_payment_id": payment_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "payer_id": payer_id
            }}
        )
        
        # Generate invoice
        invoice_number = f"FAC-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
        invoice = {
            "id": str(uuid.uuid4()),
            "invoice_number": invoice_number,
            "client_id": payment_record["client_id"],
            "client_email": payment_record["client_email"],
            "client_name": payment_record["client_name"],
            "paypal_payment_id": payment_id,
            "plan": payment_record["plan"],
            "plan_label": payment_record["plan_label"],
            "amount_ht": round(payment_record["amount"] / 1.20, 2),
            "tva": round(payment_record["amount"] - (payment_record["amount"] / 1.20), 2),
            "amount_ttc": payment_record["amount"],
            "days": payment_record["days"],
            "new_expires_at": new_expires_at,
            "status": "paid",
            "payment_method": "PayPal",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.renewal_invoices.insert_one(invoice)
        
        # Send confirmation email
        expiry_date = datetime.fromisoformat(new_expires_at.replace('Z', '+00:00'))
        formatted_date = expiry_date.strftime("%d/%m/%Y")
        
        if SMTP_EMAIL and SMTP_PASSWORD:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #1a1a1a; color: #ffffff; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #2a2a2a; border-radius: 10px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; color: #fff;">Paiement confirmé !</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 18px;">Bonjour <strong>{payment_record['client_name']}</strong>,</p>
                        <p style="color: #ccc;">Votre paiement de <strong style="color: #22c55e;">{payment_record['amount']}€</strong> a été reçu avec succès !</p>
                        <div style="background: #3a3a3a; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                            <p style="color: #22c55e; font-size: 20px; margin: 0;">Votre accès est prolongé jusqu'au</p>
                            <p style="color: #D4AF37; font-size: 28px; margin: 10px 0;"><strong>{formatted_date}</strong></p>
                        </div>
                        <a href="{SITE_URL}/espace-client" style="display: inline-block; background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%); color: #000; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; margin-top: 20px;">
                            Se connecter
                        </a>
                    </div>
                </div>
            </body>
            </html>
            """
            try:
                send_email(payment_record["client_email"], "Paiement confirmé - CREATIVINDUSTRY", html_content)
            except Exception as e:
                logging.error(f"Failed to send payment confirmation email: {e}")
        
        return {
            "success": True,
            "message": f"Paiement confirmé ! Votre accès est prolongé jusqu'au {formatted_date}",
            "new_expires_at": new_expires_at
        }
    else:
        await db.paypal_payments.update_one(
            {"paypal_payment_id": payment_id},
            {"$set": {"status": "failed", "error": str(payment.error)}}
        )
        logging.error(f"PayPal execution error: {payment.error}")
        raise HTTPException(status_code=500, detail="Le paiement a échoué. Veuillez réessayer.")


@router.post("/paypal/webhook")
async def paypal_webhook(request: Request):
    """Handle PayPal webhook notifications"""
    try:
        body = await request.json()
        event_type = body.get("event_type", "")
        
        logging.info(f"PayPal webhook received: {event_type}")
        
        if event_type in ["PAYMENT.CAPTURE.COMPLETED", "CHECKOUT.ORDER.APPROVED"]:
            resource = body.get("resource", {})
            payment_id = resource.get("parent_payment") or resource.get("id")
            
            if payment_id:
                payment_record = await db.paypal_payments.find_one(
                    {"paypal_payment_id": payment_id, "status": "pending"},
                    {"_id": 0}
                )
                
                if payment_record:
                    new_expires_at = (datetime.now(timezone.utc) + timedelta(days=payment_record["days"])).isoformat()
                    
                    await db.clients.update_one(
                        {"id": payment_record["client_id"]},
                        {"$set": {
                            "expires_at": new_expires_at,
                            "last_renewal": datetime.now(timezone.utc).isoformat(),
                            "last_renewal_plan": payment_record["plan"]
                        }}
                    )
                    
                    await db.paypal_payments.update_one(
                        {"paypal_payment_id": payment_id},
                        {"$set": {
                            "status": "completed",
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                            "webhook_event": event_type
                        }}
                    )
                    
                    logging.info(f"Account activated via webhook for client {payment_record['client_email']}")
        
        return {"status": "received"}
    except Exception as e:
        logging.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ==================== RENEWAL INVOICES ====================

@router.get("/admin/renewal-invoices")
async def get_renewal_invoices(admin: dict = Depends(get_current_admin)):
    """Get all renewal invoices for admin dashboard"""
    invoices = await db.renewal_invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    total_revenue = sum(inv.get("amount_ttc", 0) for inv in invoices)
    total_invoices = len(invoices)
    
    return {
        "invoices": invoices,
        "total_revenue": total_revenue,
        "total_invoices": total_invoices
    }


@router.get("/client/my-renewal-invoices")
async def get_client_renewal_invoices(client: dict = Depends(get_current_client)):
    """Get renewal invoices for logged in client"""
    invoices = await db.renewal_invoices.find(
        {"client_id": client["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return invoices


@router.get("/admin/paypal-payments")
async def get_paypal_payments(admin: dict = Depends(get_current_admin)):
    """Get all PayPal payments for admin dashboard"""
    payments = await db.paypal_payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return payments


@router.get("/admin/renewal-invoice/{invoice_id}/pdf")
async def download_renewal_invoice_pdf(invoice_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Generate and download a renewal invoice as PDF"""
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        admin_id = payload.get("sub")
        admin = await db.admins.find_one({"id": admin_id})
        if not admin:
            raise HTTPException(status_code=401, detail="Non autorisé")
    except:
        raise HTTPException(status_code=401, detail="Non autorisé")
    
    invoice = await db.renewal_invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#D4AF37'), alignment=TA_CENTER)
    normal_style = styles['Normal']
    
    content = []
    
    content.append(Paragraph("CREATIVINDUSTRY", title_style))
    content.append(Paragraph("L'Industrie Créative", ParagraphStyle('Sub', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.gray)))
    content.append(Spacer(1, 30))
    
    content.append(Paragraph(f"FACTURE N° {invoice.get('invoice_number', 'N/A')}", ParagraphStyle('InvTitle', parent=styles['Heading2'], fontSize=16)))
    content.append(Spacer(1, 10))
    
    created_at = invoice.get('created_at', '')
    if created_at:
        try:
            date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            formatted_date = date_obj.strftime("%d/%m/%Y")
        except:
            formatted_date = created_at[:10]
    else:
        formatted_date = "N/A"
    content.append(Paragraph(f"Date : {formatted_date}", normal_style))
    content.append(Spacer(1, 20))
    
    content.append(Paragraph("<b>Client :</b>", normal_style))
    content.append(Paragraph(f"{invoice.get('client_name', 'N/A')}", normal_style))
    content.append(Paragraph(f"{invoice.get('client_email', 'N/A')}", normal_style))
    content.append(Spacer(1, 30))
    
    data = [
        ['Description', 'Quantité', 'Prix HT', 'TVA', 'Total TTC'],
        [
            f"Renouvellement accès - {invoice.get('plan_label', 'N/A')}\n({invoice.get('days', 0)} jours)",
            '1',
            f"{invoice.get('amount_ht', 0):.2f} €",
            f"{invoice.get('tva', 0):.2f} €",
            f"{invoice.get('amount_ttc', 0):.2f} €"
        ]
    ]
    
    table = Table(data, colWidths=[8*cm, 2*cm, 2.5*cm, 2.5*cm, 2.5*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#D4AF37')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f5f5f5')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dddddd')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 1), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
    ]))
    content.append(table)
    content.append(Spacer(1, 20))
    
    totals_data = [
        ['', 'Total HT :', f"{invoice.get('amount_ht', 0):.2f} €"],
        ['', 'TVA (20%) :', f"{invoice.get('tva', 0):.2f} €"],
        ['', 'Total TTC :', f"{invoice.get('amount_ttc', 0):.2f} €"],
    ]
    totals_table = Table(totals_data, colWidths=[10*cm, 4*cm, 3*cm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (1, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (1, 2), (-1, 2), 12),
        ('TEXTCOLOR', (2, 2), (2, 2), colors.HexColor('#D4AF37')),
    ]))
    content.append(totals_table)
    content.append(Spacer(1, 30))
    
    content.append(Paragraph(f"<b>Mode de paiement :</b> {invoice.get('payment_method', 'PayPal')}", normal_style))
    content.append(Paragraph(f"<b>Statut :</b> Payée", ParagraphStyle('Paid', parent=normal_style, textColor=colors.green)))
    content.append(Spacer(1, 40))
    
    content.append(Paragraph("Merci pour votre confiance !", ParagraphStyle('Footer', parent=normal_style, alignment=TA_CENTER, textColor=colors.gray)))
    
    doc.build(content)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Facture_{invoice.get('invoice_number', 'N-A')}.pdf"}
    )


@router.delete("/admin/paypal-payments/cleanup-pending")
async def cleanup_pending_payments(admin: dict = Depends(get_current_admin)):
    """Delete old pending PayPal payments"""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    result = await db.paypal_payments.delete_many({
        "status": "pending",
        "created_at": {"$lt": cutoff}
    })
    return {"deleted": result.deleted_count}
