# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind) avec reconnaissance faciale AWS
- Portail client avec galeries et sélection de photos
- Système de rendez-vous avec notifications SMS (Brevo)
- Paiements (Stripe, PayPal)
- Contrats électroniques avec signature
- Gestion de projets et suivi client

## Test Credentials
- **Admin**: test@admin.com / admin123
- **Client test**: test-client@example.com / Test1234

## Architecture après Refactoring (Mars 2026)

### Backend Structure
```
/backend/
├── server.py              (12 300+ lignes)
├── routes/
│   ├── appointments.py    (657 lignes) - RDV + Rappels SMS
│   ├── photofind.py       (1 089 lignes) - Kiosque
│   ├── galleries.py       (535 lignes) - Galeries
│   ├── contracts.py       (380 lignes) - Contrats
│   ├── guestbook.py       (632 lignes) - Livre d'or
│   ├── auth.py            (372 lignes) - Auth
│   ├── clients.py         (286 lignes) - Clients
│   └── paypal.py          (467 lignes) - PayPal
├── services/
│   ├── sms_service.py     - SMS Brevo
│   ├── scheduler_service.py - Rappels automatiques
│   └── email_service.py   - Emails SMTP
└── models/
    └── schemas.py         - Modèles Pydantic
```

### Frontend Structure
```
/frontend/src/
├── pages/
│   ├── AdminDashboard.js  (9 200 lignes) - À refactoriser
│   ├── ClientDashboard.js (3 500+ lignes)
│   └── PhotoFindKiosk.js  (1 875 lignes)
└── components/
    ├── admin/
    └── client/
        └── ClientAppointments.js - NOUVEAU
```

## Session du 3 Mars 2026 (matin)

### ✅ RÉSOLU: Vue des RDV côté client
- **Problème**: Les clients ne voyaient pas leurs RDV dans leur espace
- **Solution**:
  1. Créé endpoint `GET /api/client/appointments` dans `server.py`
  2. Créé endpoint `PUT /api/client/appointments/{id}/respond-reschedule`
  3. Intégré composant `ClientAppointments.js` dans `ClientDashboard.js`
  4. Ajouté onglet "Rendez-vous" avec icône CalendarDays
- **Testé**: ✅ Fonctionnel

### Sessions précédentes ✅
- **Écran noir Kiosque PhotoFind** - Variable `eventDetails` → `event`
- **SMS Brevo non envoyés** - `load_dotenv()` déplacé avant imports
- **Actions admin sur RDV confirmés** (proposer nouvelle date, annuler, supprimer)
- **Rappels SMS 100% automatiques** - APScheduler tous les jours à 10h

## Instructions de déploiement IONOS

Pour appliquer les changements sur votre serveur de production:

```bash
# Se connecter au serveur
ssh user@votre-serveur-ionos

# Aller dans le dossier du projet
cd /var/www/creativindustry

# Sauvegarder les modifications locales
git stash

# Récupérer les dernières modifications
git pull origin main

# Réappliquer les modifications locales
git stash pop

# IMPORTANT: Reconstruire le frontend
cd frontend
npm run build

# Redémarrer le backend
cd ..
pkill -f uvicorn
nohup python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 &
```

## Prochaines Tâches

### P0 - Urgent
- [ ] Vérifier que l'onglet RDV fonctionne en production (après build)

### P1 - Important
- [ ] Prise de RDV depuis l'espace client
- [ ] Refactoring AdminDashboard.js (9 200 lignes)
- [ ] Continuer refactoring server.py (admin, bookings, quotes)

### P2 - Backlog
- [ ] Bug témoignages `[object Object]`
- [ ] Dashboard devis statistiques à zéro
- [ ] Intégration Terminal SumUp
- [ ] Impression directe DNP

## Intégrations 3rd Party
- AWS Rekognition (reconnaissance faciale)
- Brevo/Sendinblue (SMS) ✅ Fonctionnel
- Stripe (paiements)
- PayPal (paiements)
- FFmpeg (traitement vidéo)
- react-pdf (affichage PDF)
- APScheduler (tâches planifiées)

## Notes Techniques
- MongoDB avec DB_NAME='test_database'
- SMTP via IONOS (smtp.ionos.fr)
- Déploiement manuel sur IONOS via SSH
- Backend: FastAPI + uvicorn
- Frontend: React + Tailwind
- **IMPORTANT**: Tout changement frontend nécessite `npm run build` sur le serveur

## Dernière mise à jour
3 Mars 2026 - 17:45 UTC
