# PhotoFind - Borne Photo & Portail Client

## Original Problem Statement
Application de borne photo "mode kiosque" (PhotoFind) pour les événements de photographe, avec un portail client complet incluant:
- Mode Kiosque: Prise de selfies, recherche faciale, filtres/cadres, paiement multi-options
- Portail Client: Espace paiement, suivi de projet détaillé
- Livre d'or Vidéo: Messages vidéo des invités avec montage automatique
- Gestion Admin: Interface complète pour gérer tarifs, événements, projets

## User's Preferred Language
French

## Core Architecture
- **Frontend**: React (port 3000)
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB (creativindustry + creativindustry_devis)

## What's Been Implemented

### Completed Features
1. **Mode Kiosque PhotoFind**
   - Prise de selfies avec reconnaissance faciale (AWS Rekognition)
   - Recherche de photos par visage
   - Filtres et cadres personnalisables
   - Paiement multi-options (CB Stripe, PayPal, Espèces)

2. **Portail Client**
   - Authentification clients
   - Onglet "Mes Paiements" - synchronisation avec base externe
   - Suivi de projet dynamique avec étapes interactives
   - Upload de musique et sélection de photos

3. **Livre d'Or Vidéo**
   - Enregistrement de messages vidéo par les invités
   - Montage automatique via FFmpeg
   - Téléchargement du montage final

4. **Dashboard Admin**
   - Gestion complète des clients, tarifs, événements
   - Suivi de projet avec notifications
   - Gestion des témoignages, actualités, portfolio

5. **Notifications**
   - Emails automatiques (SMTP IONOS)
   - **SMS Brevo** (Implémenté le 28/02/2025)
     - Notifications automatiques lors des mises à jour de projet
     - API: `/api/admin/sms/test`, `/api/admin/sms/send`, `/api/admin/sms/status`

### 3rd Party Integrations
- **Stripe**: Paiements CB (clés LIVE configurées)
- **PayPal REST API**: Paiements PayPal
- **AWS Rekognition**: Reconnaissance faciale
- **FFmpeg**: Traitement vidéo
- **Brevo (Sendinblue)**: Notifications SMS transactionnelles

## Technical Debt (CRITICAL)
- `/app/backend/server.py`: >13,000 lignes - REFACTORING URGENT
- `/app/frontend/src/pages/ClientDashboard.js`: >2,500 lignes - À décomposer
- Routes dupliquées entre server.py et routes/guestbook.py

## Upcoming Tasks (P0-P1)
1. **P0: Refactoring backend** - Extraire les routes en modules
2. **P0: Refactoring frontend** - Décomposer ClientDashboard.js
3. **P1: Intégration Terminal SumUp** - Paiement CB sur borne
4. **P1: Impression directe DNP** - Éviter popup d'impression

## Known Issues
- Erreur `[object Object]` sur les témoignages (production)
- Dashboard devis affiche des statistiques à zéro
- Déploiement IONOS fragile (processus manuel)

## Key Files
- `/app/backend/server.py` - Monolithe backend principal
- `/app/backend/services/sms_service.py` - Service SMS Brevo
- `/app/backend/routes/guestbook.py` - Routes livre d'or (extrait)
- `/app/frontend/src/pages/ClientDashboard.js` - Dashboard client
- `/app/frontend/src/components/admin/ProjectTracker.js` - Suivi projet admin

## Environment Variables
### Backend (.env)
- MONGO_URL, DB_NAME
- SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
- STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY
- PAYPAL_CLIENT_ID, PAYPAL_SECRET
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- **BREVO_API_KEY** - Notifications SMS

### Frontend (.env)
- REACT_APP_BACKEND_URL
- REACT_APP_STRIPE_PUBLIC_KEY

## Test Credentials
- Admin: testadmin@test.com / testpassword
- Client: client@test.com / testpassword
- Stripe Test: 4242 4242 4242 4242

## Last Update
28 Février 2025 - Intégration SMS Brevo complète et testée
