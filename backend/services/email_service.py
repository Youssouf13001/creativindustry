"""
Email sending services
"""
import smtplib
import logging
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.ionos.fr')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')


def send_email(to_email: str, subject: str, html_content: str) -> bool:
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


def send_email_with_attachment(to_email: str, subject: str, html_content: str, 
                                attachment_data: bytes, attachment_filename: str) -> bool:
    """Send an email with a file attachment"""
    try:
        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = f"CREATIVINDUSTRY <{SMTP_EMAIL}>"
        msg['To'] = to_email
        
        # HTML content
        html_part = MIMEText(html_content, 'html')
        msg.attach(html_part)
        
        # Attachment
        part = MIMEBase('application', 'octet-stream')
        part.set_payload(attachment_data)
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', f'attachment; filename="{attachment_filename}"')
        msg.attach(part)
        
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        
        logging.info(f"Email with attachment sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email with attachment: {str(e)}")
        return False


def send_file_notification_email(client_email: str, client_name: str, file_title: str, 
                                  file_type: str, file_url: str) -> bool:
    """Send notification when a file is shared with a client"""
    subject = f"Nouveau fichier disponible - {file_title}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: #d4a574; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CREATIVINDUSTRY</h1>
                <p>Nouveau fichier disponible</p>
            </div>
            <div class="content">
                <p>Bonjour {client_name},</p>
                <p>Un nouveau fichier a ete partage avec vous :</p>
                <p><strong>{file_title}</strong> ({file_type})</p>
                <p>Connectez-vous a votre espace client pour y acceder.</p>
                <a href="{file_url}" class="button">Voir le fichier</a>
            </div>
            <div class="footer">
                <p>CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(client_email, subject, html_content)


def send_booking_confirmation_email(client_email: str, client_name: str, service_name: str,
                                     event_date: str, deposit_amount: float, total_price: float,
                                     iban: str, bic: str, account_holder: str, 
                                     bank_name: str, booking_id: str) -> bool:
    """Send booking confirmation with payment instructions"""
    subject = f"Confirmation de reservation - {service_name}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .bank-details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d4a574; }}
            .amount {{ font-size: 24px; color: #d4a574; font-weight: bold; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CREATIVINDUSTRY</h1>
                <p>Confirmation de reservation</p>
            </div>
            <div class="content">
                <p>Bonjour {client_name},</p>
                <p>Merci pour votre reservation ! Voici les details :</p>
                <ul>
                    <li><strong>Service :</strong> {service_name}</li>
                    <li><strong>Date :</strong> {event_date}</li>
                    <li><strong>Prix total :</strong> {total_price:.2f} EUR</li>
                </ul>
                <p>Pour confirmer votre reservation, veuillez effectuer le versement de l'acompte :</p>
                <p class="amount">Acompte : {deposit_amount:.2f} EUR</p>
                <div class="bank-details">
                    <h3>Coordonnees bancaires</h3>
                    <p><strong>Titulaire :</strong> {account_holder}</p>
                    <p><strong>Banque :</strong> {bank_name}</p>
                    <p><strong>IBAN :</strong> {iban}</p>
                    <p><strong>BIC :</strong> {bic}</p>
                    <p><strong>Reference :</strong> {booking_id[:8].upper()}</p>
                </div>
                <p>Une fois le paiement recu, votre reservation sera confirmee.</p>
            </div>
            <div class="footer">
                <p>CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(client_email, subject, html_content)


def send_appointment_request_email(client_email: str, client_name: str, appointment_type: str,
                                    proposed_date: str, proposed_time: str, appointment_id: str) -> bool:
    """Send appointment request confirmation to client"""
    subject = f"Demande de rendez-vous recue - {appointment_type}"
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CREATIVINDUSTRY</h1>
                <p>Demande de rendez-vous</p>
            </div>
            <div class="content">
                <p>Bonjour {client_name},</p>
                <p>Votre demande de rendez-vous a bien ete recue.</p>
                <ul>
                    <li><strong>Type :</strong> {appointment_type}</li>
                    <li><strong>Date souhaitee :</strong> {proposed_date}</li>
                    <li><strong>Heure :</strong> {proposed_time}</li>
                </ul>
                <p>Nous vous contacterons sous peu pour confirmer votre rendez-vous.</p>
            </div>
            <div class="footer">
                <p>CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(client_email, subject, html_content)


def send_appointment_confirmed_email(client_email: str, client_name: str, appointment_type: str,
                                      confirmed_date: str, confirmed_time: str, appointment_id: str,
                                      admin_message: str = "") -> bool:
    """Send appointment confirmation to client"""
    subject = f"Rendez-vous confirme - {appointment_type}"
    message_section = f"<p><strong>Message :</strong> {admin_message}</p>" if admin_message else ""
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .confirmed {{ background: #d4edda; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>CREATIVINDUSTRY</h1>
                <p>Rendez-vous confirme</p>
            </div>
            <div class="content">
                <p>Bonjour {client_name},</p>
                <div class="confirmed">
                    <h2>Votre rendez-vous est confirme !</h2>
                </div>
                <ul>
                    <li><strong>Type :</strong> {appointment_type}</li>
                    <li><strong>Date :</strong> {confirmed_date}</li>
                    <li><strong>Heure :</strong> {confirmed_time}</li>
                </ul>
                {message_section}
                <p>A bientot !</p>
            </div>
            <div class="footer">
                <p>CREATIVINDUSTRY France</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email(client_email, subject, html_content)
