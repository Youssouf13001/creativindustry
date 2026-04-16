"""
Scheduler automatique pour les tâches planifiées
- Rappels SMS 24h avant les RDV (tous les jours à 10h)
- Rappels équipement retour (tous les jours à 9h)
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
SITE_URL = os.environ.get("SITE_URL", "https://creativindustry.com")

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

async def send_equipment_return_reminders():
    """
    Envoie les rappels email pour les retours de matériel.
    - Rappel 1 jour avant la date de retour
    - Alerte si matériel non retourné (overdue)
    Exécuté automatiquement tous les jours à 9h.
    """
    from services.email_service import send_email
    
    logging.info("📦 Vérification des rappels de retour matériel...")
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        today = datetime.now(timezone.utc).date()
        tomorrow = today + timedelta(days=1)
        
        # Find deployments ending tomorrow
        deployments_ending = await db.deployments.find({
            "status": {"$in": ["planned", "in_progress"]},
            "end_date": tomorrow.isoformat(),
            "reminder_sent": {"$ne": True}
        }, {"_id": 0}).to_list(100)
        
        # Find overdue deployments
        deployments_overdue = await db.deployments.find({
            "status": {"$in": ["planned", "in_progress"]},
            "end_date": {"$lt": today.isoformat()}
        }, {"_id": 0}).to_list(100)
        
        reminders_sent = 0
        
        # Get admin emails
        admins = await db.admins.find({"role": "complet"}, {"_id": 0, "email": 1}).to_list(10)
        admin_emails = [a["email"] for a in admins if a.get("email")]
        
        if not admin_emails:
            logging.warning("⚠️ Aucun email admin trouvé pour les rappels")
            client.close()
            return
        
        # Send reminder for deployments ending tomorrow
        for dep in deployments_ending:
            for email in admin_emails:
                try:
                    await send_email(
                        to_email=email,
                        subject=f"📦 Rappel: Retour matériel demain - {dep.get('name')}",
                        html_content=f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #f59e0b;">📦 Rappel de retour matériel</h2>
                            <p>Le déplacement <strong>{dep.get('name')}</strong> se termine <strong>demain ({dep.get('end_date')})</strong>.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Lieu:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{dep.get('location', 'Non spécifié')}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Équipements:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{len(dep.get('items', []))} articles</td></tr>
                            </table>
                            <p>Pensez à valider le retour du matériel sur l'application.</p>
                            <a href="{SITE_URL}/admin/equipment" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Gérer le retour</a>
                        </div>
                        """
                    )
                    reminders_sent += 1
                except Exception as e:
                    logging.error(f"❌ Erreur envoi email rappel: {e}")
            
            # Mark as reminded
            await db.deployments.update_one(
                {"id": dep["id"]},
                {"$set": {"reminder_sent": True, "reminder_sent_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        # Send alert for overdue deployments
        for dep in deployments_overdue:
            last_alert = dep.get("last_overdue_alert")
            if last_alert and last_alert[:10] == today.isoformat():
                continue
                
            for email in admin_emails:
                try:
                    await send_email(
                        to_email=email,
                        subject=f"⚠️ ALERTE: Matériel non retourné - {dep.get('name')}",
                        html_content=f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #ef4444;">⚠️ Matériel non retourné</h2>
                            <p>Le déplacement <strong>{dep.get('name')}</strong> devait se terminer le <strong>{dep.get('end_date')}</strong>.</p>
                            <p style="color: #ef4444; font-weight: bold;">Le matériel n'a pas encore été retourné.</p>
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Lieu:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{dep.get('location', 'Non spécifié')}</td></tr>
                                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Équipements:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">{len(dep.get('items', []))} articles</td></tr>
                            </table>
                            <p><strong>Veuillez vérifier le statut du matériel immédiatement.</strong></p>
                            <a href="{SITE_URL}/admin/equipment" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px;">Vérifier maintenant</a>
                        </div>
                        """
                    )
                    reminders_sent += 1
                except Exception as e:
                    logging.error(f"❌ Erreur envoi email alerte: {e}")
            
            await db.deployments.update_one(
                {"id": dep["id"]},
                {"$set": {"last_overdue_alert": today.isoformat()}}
            )
        
        logging.info(f"📦 Rappels équipement: {reminders_sent} envoyés, {len(deployments_ending)} à retourner demain, {len(deployments_overdue)} en retard")
        
        client.close()
        
    except Exception as e:
        logging.error(f"❌ Erreur scheduler rappels équipement: {e}")

async def send_loss_ticket_reminders():
    """
    Envoie des rappels pour les tickets de perte/vol non résolus.
    Rappel tous les 3 jours si pas de mise à jour.
    Exécuté automatiquement tous les jours à 9h30.
    """
    from services.email_service import send_email
    
    logging.info("🎫 Vérification des tickets de perte/vol...")
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        today = datetime.now(timezone.utc)
        three_days_ago = (today - timedelta(days=3)).isoformat()
        
        # Find unresolved tickets that haven't been updated or reminded in 3 days
        tickets = await db.loss_tickets.find({
            "status": {"$nin": ["resolved", "obsolete"]},
            "$or": [
                {"last_reminder_at": None},
                {"last_reminder_at": {"$lt": three_days_ago}}
            ]
        }, {"_id": 0}).to_list(50)
        
        if not tickets:
            logging.info("🎫 Aucun ticket nécessitant un rappel")
            client.close()
            return
        
        notification_email = "communication@creativindustry.com"
        reminders_sent = 0
        
        for ticket in tickets:
            issue_labels = {"lost": "PERDU", "stolen": "VOLÉ", "damaged": "ENDOMMAGÉ"}
            status_labels = {
                "pending": "En attente",
                "ordering": "Commande en cours",
                "insurance": "Assurance en cours"
            }
            
            try:
                await send_email(
                    to_email=notification_email,
                    subject=f"🔔 RAPPEL #{reminders_sent+1} - Matériel {issue_labels.get(ticket.get('issue_type'), '')}: {ticket.get('equipment_name')}",
                    html_content=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #ef4444;">🔔 Rappel automatique - Ticket non résolu</h2>
                        
                        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                            <p><strong>Équipement:</strong> {ticket.get('equipment_name')}</p>
                            <p><strong>Problème:</strong> {issue_labels.get(ticket.get('issue_type'), ticket.get('issue_type'))}</p>
                            <p><strong>Statut:</strong> {status_labels.get(ticket.get('status'), ticket.get('status'))}</p>
                            <p><strong>Ouvert depuis:</strong> {ticket.get('created_at', '')[:10]}</p>
                        </div>
                        
                        <p><strong>Action requise :</strong> Merci de mettre à jour ce ticket.</p>
                        
                        <p>
                            <a href="{SITE_URL}/admin/equipment" 
                               style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                                Mettre à jour
                            </a>
                        </p>
                    </div>
                    """
                )
                
                await db.loss_tickets.update_one(
                    {"id": ticket["id"]},
                    {"$set": {"last_reminder_at": today.isoformat()}}
                )
                reminders_sent += 1
                
            except Exception as e:
                logging.error(f"❌ Erreur rappel ticket {ticket.get('id')}: {e}")
        
        logging.info(f"🎫 Rappels tickets: {reminders_sent} envoyés sur {len(tickets)} tickets en attente")
        client.close()
        
    except Exception as e:
        logging.error(f"❌ Erreur scheduler rappels tickets: {e}")

def start_scheduler():
    """Démarre le scheduler avec toutes les tâches planifiées"""
    
    # Rappels SMS RDV tous les jours à 10h
    scheduler.add_job(
        send_daily_appointment_reminders,
        CronTrigger(hour=10, minute=0, timezone='Europe/Paris'),
        id='daily_sms_reminders',
        name='Rappels SMS quotidiens',
        replace_existing=True
    )
    
    # Rappels équipement tous les jours à 9h
    scheduler.add_job(
        send_equipment_return_reminders,
        CronTrigger(hour=9, minute=0, timezone='Europe/Paris'),
        id='daily_equipment_reminders',
        name='Rappels retour matériel',
        replace_existing=True
    )
    
    # Rappels tickets perte/vol tous les jours à 9h30
    scheduler.add_job(
        send_loss_ticket_reminders,
        CronTrigger(hour=9, minute=30, timezone='Europe/Paris'),
        id='daily_loss_ticket_reminders',
        name='Rappels tickets perte/vol',
        replace_existing=True
    )
    
    scheduler.start()
    logging.info("📅 Scheduler démarré - SMS 10h, Équipement 9h, Tickets perte/vol 9h30")

def stop_scheduler():
    """Arrête le scheduler proprement"""
    if scheduler.running:
        scheduler.shutdown()
        logging.info("📅 Scheduler arrêté")
