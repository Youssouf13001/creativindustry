"""
Scheduler automatique pour les tâches planifiées
- Rappels SMS 24h avant les RDV (tous les jours à 10h)
"""

import logging
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# Scheduler instance
scheduler = AsyncIOScheduler()

async def send_daily_appointment_reminders():
    """
    Envoie les rappels SMS pour les RDV de demain.
    Exécuté automatiquement tous les jours à 10h.
    """
    from services.sms_service import send_appointment_reminder_sms
    
    logging.info("🔔 Début de l'envoi des rappels SMS quotidiens...")
    
    try:
        # Connexion à la base de données
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Calculer la date de demain
        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(hours=24)
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")
        
        # Trouver les RDV confirmés pour demain sans rappel envoyé
        appointments = await db.appointments.find({
            "status": "confirmed",
            "proposed_date": tomorrow_str,
            "reminder_sent": {"$ne": True}
        }).to_list(100)
        
        sent_count = 0
        failed_count = 0
        
        for apt in appointments:
            client_phone = apt.get("client_phone", "")
            if not client_phone:
                continue
            
            success = send_appointment_reminder_sms(
                client_phone=client_phone,
                client_name=apt.get("client_name", ""),
                appointment_date=apt.get("proposed_date", ""),
                appointment_time=apt.get("proposed_time", ""),
                appointment_type=apt.get("appointment_type_label", apt.get("appointment_type", "RDV"))
            )
            
            if success:
                await db.appointments.update_one(
                    {"id": apt["id"]},
                    {"$set": {
                        "reminder_sent": True,
                        "reminder_sent_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                sent_count += 1
                logging.info(f"✅ Rappel envoyé à {apt.get('client_name')} ({client_phone})")
            else:
                failed_count += 1
                logging.error(f"❌ Échec rappel pour {apt.get('client_name')} ({client_phone})")
        
        logging.info(f"🔔 Rappels terminés: {sent_count} envoyés, {failed_count} échecs (RDV du {tomorrow_str})")
        
        # Fermer la connexion
        client.close()
        
    except Exception as e:
        logging.error(f"❌ Erreur scheduler rappels SMS: {e}")

def start_scheduler():
    """Démarre le scheduler avec toutes les tâches planifiées"""
    
    # Rappels SMS tous les jours à 10h (heure de Paris)
    scheduler.add_job(
        send_daily_appointment_reminders,
        CronTrigger(hour=10, minute=0, timezone='Europe/Paris'),
        id='daily_sms_reminders',
        name='Rappels SMS quotidiens',
        replace_existing=True
    )
    
    scheduler.start()
    logging.info("📅 Scheduler démarré - Rappels SMS programmés à 10h chaque jour")

def stop_scheduler():
    """Arrête le scheduler proprement"""
    if scheduler.running:
        scheduler.shutdown()
        logging.info("📅 Scheduler arrêté")
