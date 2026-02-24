# CREATIVINDUSTRY - Product Requirements Document

## Original Problem Statement
Site vitrine pour photographe avec espace client/admin comprenant :
- Système de gestion de projet
- Chat d'équipe
- Notifications par e-mail
- Système de témoignages
- Popup d'accueil
- Page d'actualités
- Expiration de compte personnalisée
- Système de renouvellement payant

## User's Preferred Language
French

## Core Architecture
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + Python
- **Database**: MongoDB
- **Hosting**: IONOS (production)

## What's Been Implemented

### ✅ Completed Features
- [x] Système d'authentification admin avec MFA
- [x] Gestion des clients (CRUD)
- [x] Système de fichiers client
- [x] Portfolio avec photos/vidéos/stories
- [x] Système de réservation
- [x] Système de rendez-vous avec emails
- [x] Chat d'équipe
- [x] Galeries photo avec sélection client
- [x] Newsletter
- [x] **Système de témoignages** - Page publique + modération admin
- [x] **Popup d'accueil** - Avec vidéo gérable depuis admin
- [x] **Page d'actualités** - Publications, likes, commentaires avec modération
- [x] **Expiration de compte personnalisée** - Délai configurable par client
- [x] **Système de renouvellement PayPal avec activation automatique** - Intégration API PayPal, pas de validation admin nécessaire

### 🔴 Known Issues (P0 - BLOCKER)
1. **Erreur `[object Object]`** - Soumission de témoignage en production (IONOS)
   - Corrections appliquées : claim JWT `sub`, modèle Pydantic, gestion erreurs frontend
   - Persiste en production - Nécessite logs serveur pour diagnostic

### 🟠 Issues (P1-P2)
2. Dashboard site `devis` - Statistiques à zéro (P1)
3. E-mails arrivent en spam (P2, récurrent)
4. Erreur 404 mise à jour statut projet IONOS (P2)

## Technical Debt (URGENT)
- `/app/backend/server.py` - Fichier monolithique > 9000 lignes → Refactoring en APIRouter
- `/app/frontend/src/pages/AdminDashboard.js` - > 7000 lignes → Décomposer en sous-composants

## Key API Endpoints
- `POST /api/client/login` - Gère expiration compte
- `POST /api/renewal/request` - Créer demande renouvellement
- `GET /api/admin/renewal-requests` - Liste demandes
- `PUT /api/admin/renewal-requests/{id}/approve` - Valider
- `PUT /api/admin/renewal-requests/{id}/reject` - Rejeter
- `GET/POST /api/testimonials` - Témoignages
- `GET/POST /api/news` - Actualités
- `PUT /api/admin/clients/{id}/expiration` - Modifier expiration

## Database Collections
- `clients` - Avec `expires_at`, `auto_delete_days`
- `renewal_requests` - Demandes de renouvellement PayPal
- `testimonials` - Témoignages clients
- `news_posts` - Publications actualités
- `news_comments` - Commentaires (avec modération)
- `news_likes` - Likes

## Upcoming Tasks
1. Synchronisation données `devis` → `creativindustry`
2. Automatisation archivage comptes expirés
3. Rappels automatiques par e-mail
4. Compression images côté serveur

## 3rd Party Integrations
- IONOS SMTP
- PayPal (via paypal.me link)
- openpyxl (export Excel)

## Important Notes for Development
- Token JWT client utilise claim `sub` (pas `client_id`)
- Déploiement IONOS : `git pull` + `npm run build` + `systemctl restart`
- Vider cache navigateur après mises à jour
