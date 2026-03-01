# PhotoFind - Borne Photo & Portail Client

## Original Problem Statement
Application de borne photo "mode kiosque" (PhotoFind) pour les événements de photographe, avec un portail client complet incluant:
- Mode Kiosque: Prise de selfies, reconnaissance faciale, filtres/cadres, paiement multi-options
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

### Session du 1er Mars 2025

#### 1. Intégration SMS Brevo ✅
- Service SMS créé (`/backend/services/sms_service.py`)
- Routes API SMS (`/backend/routes/sms.py`):
  - `GET /api/admin/sms/status` - Vérifier si SMS configuré
  - `POST /api/admin/sms/test` - Envoyer SMS de test
  - `POST /api/admin/sms/campaign` - Envoyer campagne SMS
  - `POST /api/admin/sms/send-to-client/{client_id}` - SMS à un client
- Clé API Brevo configurée dans `.env`
- Crédits SMS prépayés (200 SMS achetés)

#### 2. SMS Automatiques sur Suivi de Projet ✅
- Intégration dans `server.py` endpoint `/admin/client-project/{client_id}`
- SMS envoyé automatiquement quand:
  - Une étape du projet change
  - Une action client est requise (photos, musique)
  - Le projet est terminé

#### 3. Campagnes SMS dans Admin ✅
- Interface dans onglet "Extensions"
- Sélection de clients avec checkboxes
- Envoi aux sélectionnés ou à tous
- Affichage du résultat (envoyés/échecs/sans téléphone)

#### 4. Nouveau Design Premium Borne PhotoFind ✅
- Fond doré avec particules scintillantes (image générée)
- Icône caméra avec bordure et effet lumineux dorés
- Titre "Trouvez vos photos !" en dégradé doré
- Bouton "Commencer" premium doré
- Cartes de prix avec bordures dorées et reflets
- Logo "CreativIndustry France" en bas à gauche
- Nom de l'événement affiché en haut

### Fonctionnalités Précédentes
- Mode Kiosque PhotoFind avec reconnaissance faciale (AWS Rekognition)
- Portail de paiement client (Stripe)
- Synchronisation factures depuis base externe
- Suivi de projet dynamique
- Livre d'or vidéo avec montage automatique (FFmpeg)
- Dashboard admin complet

## 3rd Party Integrations
- **Stripe**: Paiements CB
- **PayPal REST API**: Paiements PayPal
- **AWS Rekognition**: Reconnaissance faciale
- **FFmpeg**: Traitement vidéo
- **Brevo (Sendinblue)**: Notifications SMS (NOUVEAU)

## Key Files Modified This Session
- `/backend/services/sms_service.py` - Service SMS Brevo
- `/backend/routes/sms.py` - Routes API SMS
- `/backend/server.py` - Import SMS + endpoints
- `/frontend/src/pages/AdminDashboard.js` - Interface campagnes SMS
- `/frontend/src/pages/PhotoFindKiosk.js` - Nouveau design premium

## Environment Variables
### Backend (.env)
- MONGO_URL, DB_NAME
- SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
- STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY
- PAYPAL_CLIENT_ID, PAYPAL_SECRET
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- **BREVO_API_KEY** - Notifications SMS

## URLs Importantes
- Borne: `https://creativindustry.com/kiosk/{event-id}`
- Admin: `https://creativindustry.com/admin/dashboard`

## Test Credentials
- Admin: testadmin@test.com / testpassword
- Client: client@test.com / testpassword

## Upcoming Tasks
- Intégration Terminal SumUp (paiement CB sur borne)
- Impression directe DNP (éviter popup)

## Technical Debt
- `/backend/server.py` - >13,000 lignes (refactoring urgent)
- `/frontend/src/pages/ClientDashboard.js` - >2,500 lignes

## Last Update
1er Mars 2025 - SMS Brevo + Campagnes SMS + Design Premium Borne
