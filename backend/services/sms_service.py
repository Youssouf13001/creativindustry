"""
SMS Notification Service using Brevo (Sendinblue) API
"""
import os
import logging
import requests
from typing import Optional

# Brevo API Configuration
BREVO_API_KEY = os.environ.get('BREVO_API_KEY', '')
BREVO_SMS_API_URL = "https://api.brevo.com/v3/transactionalSMS/sms"
SENDER_NAME = "CREATIVIND"  # Max 11 characters for alphanumeric sender

logger = logging.getLogger(__name__)


def send_sms(phone_number: str, message: str) -> bool:
    """
    Send SMS via Brevo API
    
    Args:
        phone_number: Phone number in international format (e.g., +33612345678)
        message: SMS message content (max 160 chars for single SMS)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured - skipping SMS")
        return False
    
    # Clean phone number - ensure it starts with +
    if not phone_number.startswith('+'):
        # Assume French number if no country code
        if phone_number.startswith('0'):
            phone_number = '+33' + phone_number[1:]
        else:
            phone_number = '+33' + phone_number
    
    # Remove spaces and dashes
    phone_number = phone_number.replace(' ', '').replace('-', '').replace('.', '')
    
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }
    
    payload = {
        "type": "transactional",
        "unicodeEnabled": True,
        "sender": SENDER_NAME,
        "recipient": phone_number,
        "content": message
    }
    
    try:
        response = requests.post(BREVO_SMS_API_URL, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            logger.info(f"SMS sent successfully to {phone_number}")
            return True
        else:
            logger.error(f"Failed to send SMS: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"SMS request failed: {str(e)}")
        return False


def send_project_status_sms(client_phone: str, client_name: str, task_label: str, new_status: str, progress_percentage: int) -> bool:
    """
    Send SMS notification for project status update
    
    Args:
        client_phone: Client's phone number
        client_name: Client's name
        task_label: Name of the task/step
        new_status: New status (completed or in_progress)
        progress_percentage: Overall project progress percentage
    """
    if not client_phone:
        logger.warning("No phone number provided - skipping SMS")
        return False
    
    # Build message based on status
    if new_status == "completed":
        status_emoji = "✅"
        status_text = "terminée"
    else:
        status_emoji = "🔄"
        status_text = "en cours"
    
    # Keep message concise for SMS (160 chars limit)
    message = f"{status_emoji} {client_name}, votre projet avance ! '{task_label}' est {status_text}. Progression: {progress_percentage}%. Voir: creativindustry.com/client"
    
    # Truncate if too long
    if len(message) > 160:
        message = message[:157] + "..."
    
    return send_sms(client_phone, message)


def send_project_completion_sms(client_phone: str, client_name: str) -> bool:
    """
    Send SMS notification when project is fully completed
    """
    if not client_phone:
        return False
    
    message = f"🎉 Félicitations {client_name} ! Votre projet est terminé ! Tous vos fichiers sont disponibles dans votre espace client. creativindustry.com/client"
    
    if len(message) > 160:
        message = message[:157] + "..."
    
    return send_sms(client_phone, message)


def send_action_required_sms(client_phone: str, client_name: str, action_description: str) -> bool:
    """
    Send SMS when client action is required (e.g., upload music, select photos)
    """
    if not client_phone:
        return False
    
    message = f"📢 {client_name}, action requise ! {action_description}. Connectez-vous: creativindustry.com/client"
    
    if len(message) > 160:
        message = message[:157] + "..."
    
    return send_sms(client_phone, message)


def send_new_file_sms(client_phone: str, client_name: str, file_title: str) -> bool:
    """
    Send SMS notification when a new file is available
    """
    if not client_phone:
        return False
    
    message = f"🎬 {client_name}, nouveau fichier disponible: '{file_title}'. Téléchargez-le dans votre espace client. creativindustry.com/client"
    
    if len(message) > 160:
        message = message[:157] + "..."
    
    return send_sms(client_phone, message)


def send_test_sms(phone_number: str) -> dict:
    """
    Send a test SMS to verify configuration
    
    Returns:
        dict with success status and message
    """
    message = "✅ Test CREATIVINDUSTRY - Votre service SMS est correctement configuré !"
    
    success = send_sms(phone_number, message)
    
    return {
        "success": success,
        "message": "SMS de test envoyé avec succès" if success else "Échec de l'envoi du SMS de test",
        "phone": phone_number
    }



def send_appointment_reminder_sms(client_phone: str, client_name: str, appointment_date: str, appointment_time: str, appointment_type: str) -> bool:
    """
    Send SMS reminder 24h before appointment
    
    Args:
        client_phone: Client's phone number
        client_name: Client's name
        appointment_date: Date of appointment (YYYY-MM-DD)
        appointment_time: Time of appointment (HH:MM)
        appointment_type: Type of appointment
    
    Returns:
        bool: True if sent successfully
    """
    # Format date for display (DD/MM/YYYY)
    try:
        from datetime import datetime
        date_obj = datetime.strptime(appointment_date, "%Y-%m-%d")
        formatted_date = date_obj.strftime("%d/%m/%Y")
    except:
        formatted_date = appointment_date
    
    message = f"📅 Rappel RDV CREATIVINDUSTRY\n\nBonjour {client_name},\n\nVotre RDV ({appointment_type}) est prévu demain {formatted_date} à {appointment_time}.\n\nÀ bientôt !"
    
    return send_sms(client_phone, message)
