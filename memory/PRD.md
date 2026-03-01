# PhotoFind - Borne Photo & Portail Client

## Original Problem Statement
Application de borne photo "mode kiosque" (PhotoFind) pour les événements de photographe, avec un portail client complet incluant:
- Mode Kiosque: Prise de selfies, reconnaissance faciale, filtres/cadres, paiement multi-options
- Portail Client: Espace paiement, suivi de projet détaillé
- Livre d'or Vidéo: Messages vidéo des invités avec montage automatique
- Gestion Admin: Interface complète pour gérer tarifs, événements, projets
- Contrats Électroniques: Système de signature de contrats avec validation OTP

## User's Preferred Language
French

## Core Architecture
- **Frontend**: React (port 3000)
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB (creativindustry + creativindustry_devis)

## What's Been Implemented

### Session du 1er Mars 2026 - Contrats Électroniques

#### 1. Système de Contrats Électroniques ✅
- **Backend API** (`/backend/routes/contracts.py`):
  - `POST /api/contracts/templates/upload-pdf` - Upload PDF de contrat
  - `POST /api/contracts/templates` - Créer un modèle avec champs
  - `GET /api/contracts/templates` - Liste des modèles
  - `GET /api/contracts/templates/{id}` - Détail d'un modèle
  - `PUT /api/contracts/templates/{id}` - Modifier un modèle
  - `DELETE /api/contracts/templates/{id}` - Supprimer un modèle
  - `POST /api/contracts/send` - Envoyer contrat à un client
  - `GET /api/contracts/client/{client_id}` - Contrats d'un client
  - `GET /api/contracts/{contract_id}` - Détail d'un contrat
  - `PUT /api/contracts/{contract_id}/fill` - Remplir les champs
  - `POST /api/contracts/{contract_id}/request-otp` - Demander code OTP
  - `POST /api/contracts/{contract_id}/sign` - Signer avec OTP
  - `GET /api/contracts/admin/list` - Liste admin de tous les contrats

- **Frontend Admin** (`ContractEditor.js`):
  - Upload de PDF de contrat
  - Placement de champs par clic sur le PDF (problème d'iframe résolu)
  - Types de champs: Texte, Case à cocher, Date, Signature
  - Drag & drop pour repositionner les champs
  - Panneau de propriétés pour configurer chaque champ
  - Sauvegarde du modèle avec positions des champs

- **Frontend Client** (`ClientContracts.js`):
  - Liste des contrats reçus avec statut
  - Formulaire de remplissage des champs
  - Validation par code OTP envoyé par email
  - Signature électronique

#### 2. Tests Backend Contrats ✅
- 15/16 tests passés (1 skipped car pas de contrat signé disponible)
- Fichier: `/app/backend/tests/test_contracts.py`
- Rapport: `/app/test_reports/pytest/pytest_results_contracts.xml`

### Sessions Précédentes

#### Intégration SMS Brevo ✅
- Service SMS créé (`/backend/services/sms_service.py`)
- Routes API SMS (`/backend/routes/sms.py`)
- SMS automatiques sur suivi de projet
- Campagnes SMS dans Admin (onglet Extensions)

#### Design Premium Borne PhotoFind ✅
- Fond doré avec particules scintillantes
- Interface premium pour la borne

#### Fonctionnalités de Base ✅
- Mode Kiosque PhotoFind avec reconnaissance faciale (AWS Rekognition)
- Portail de paiement client (Stripe, PayPal)
- Synchronisation factures depuis base externe
- Suivi de projet dynamique
- Livre d'or vidéo avec montage automatique (FFmpeg)
- Dashboard admin complet

## 3rd Party Integrations
- **Stripe**: Paiements CB
- **PayPal REST API**: Paiements PayPal
- **AWS Rekognition**: Reconnaissance faciale
- **FFmpeg**: Traitement vidéo
- **Brevo (Sendinblue)**: Notifications SMS

## Database Schema - Contrats
```javascript
// Collection: contract_templates
{
  id: String (UUID),
  name: String,
  pdf_url: String,
  fields: [
    { id, type, label, x, y, page, width, height, required }
  ],
  created_at: DateTime
}

// Collection: contracts
{
  id: String (UUID),
  template_id: String,
  template_name: String,
  client_id: String,
  client_name: String,
  client_email: String,
  status: "pending" | "sent" | "filled" | "signed",
  field_values: Object,
  otp_code: String (nullable),
  otp_expires: DateTime (nullable),
  signed_at: DateTime (nullable),
  created_at: DateTime,
  sent_at: DateTime
}
```

## Key Files Modified This Session
- `/app/backend/routes/contracts.py` - API complète des contrats
- `/app/frontend/src/components/admin/ContractEditor.js` - Éditeur avec overlay pour clics PDF
- `/app/frontend/src/components/admin/ContractsTab.js` - Onglet gestion contrats admin
- `/app/frontend/src/components/client/ClientContracts.js` - Interface client contrats
- `/app/backend/tests/test_contracts.py` - Suite de tests complète

## Environment Variables
### Backend (.env)
- MONGO_URL, DB_NAME
- SMTP_HOST, SMTP_PORT, SMTP_EMAIL, SMTP_PASSWORD
- STRIPE_PUBLIC_KEY, STRIPE_SECRET_KEY
- PAYPAL_CLIENT_ID, PAYPAL_SECRET
- AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
- BREVO_API_KEY

## Test Credentials
- Admin: testadmin@test.com / testpassword
- Client: client@test.com / testpassword

## Upcoming Tasks (P1)
- Intégration Terminal SumUp (paiement CB sur borne)
- Impression directe DNP (éviter popup OS)

## Known Issues
- **P2**: Erreur `[object Object]` sur les témoignages (production)
- **P2**: Dashboard `devis` affiche des statistiques à zéro

## Technical Debt
- `/backend/server.py` - >13,000 lignes (refactoring urgent)
- `/frontend/src/pages/AdminDashboard.js` - Monolithe à décomposer
- `/frontend/src/pages/ClientDashboard.js` - >2,500 lignes

## Last Update
1er Mars 2026 - Système de Contrats Électroniques complet
