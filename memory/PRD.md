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
- Système de renouvellement payant avec PayPal

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
- [x] Système de témoignages - Page publique + modération admin
- [x] Popup d'accueil avec vidéo gérable depuis admin
- [x] Page d'actualités - Publications, likes, commentaires avec modération
- [x] Expiration de compte personnalisée - Délai configurable par client
- [x] Système de renouvellement PayPal avec activation automatique
- [x] Système de facturation avec PDF
- [x] Application de TVA 20% sur tous les paiements
- [x] **PWA (Progressive Web App)** - Installation mobile, notifications push, offline support
- [x] **Galerie améliorée** - Diaporama plein écran avec :
  - Contrôles lecture/pause
  - Musique de fond configurable par galerie
  - Partage WhatsApp, Instagram, Email
  - QR Code pour partage
  - Navigation clavier
  - Téléchargement de photos
  - Page publique de partage `/galerie/:id`

### 🔴 Known Issues (P0 - BLOCKER)
1. **Erreur `[object Object]`** - Soumission de témoignage en production (IONOS)
   - Status: Nécessite déploiement sur IONOS pour vérification

### 🟠 Issues (P1-P2)
2. Dashboard site `devis` - Statistiques à zéro (P1)
3. Téléchargement factures PDF depuis admin (P1, vérification requise)
4. Erreur 404 mise à jour statut projet IONOS (P2)

## Technical Debt

### Refactoring Backend (IN PROGRESS)
Le fichier `/app/backend/server.py` fait ~10,000 lignes.
Structure de refactoring créée :
- `/app/backend/config.py` - Configuration centralisée
- `/app/backend/dependencies.py` - Auth helpers partagés
- `/app/backend/routes/auth.py` - Routes d'authentification admin
- `/app/backend/routes/clients.py` - Routes clients
- `/app/backend/routes/paypal.py` - Routes PayPal

La migration sera progressive pour maintenir la stabilité.

## Upcoming Tasks

### P1 - Prochaine fonctionnalité
1. **Livre d'or digital**
   - Messages vidéo/audio des invités
   - Accès via QR code sans compte
   - Galerie de messages simple

### P2 - Améliorations
- Rappels automatiques (expiration comptes, RDV)
- Paiement en plusieurs fois (3x/4x via PayPal)
- Compression images côté serveur
- Synchronisation données devis ↔ creativindustry
- Finaliser refactoring backend/frontend

## Key API Endpoints

### Galerie
- `GET /api/admin/galleries` - Liste des galeries (admin)
- `POST /api/admin/galleries/{id}/music` - Upload musique galerie
- `DELETE /api/admin/galleries/{id}/music` - Supprimer musique
- `GET /api/public/galleries/{id}` - Vue publique galerie (partage QR)
- `GET /api/client/galleries/{id}` - Vue client galerie

### PayPal
- `POST /api/paypal/create-order` - Créer paiement
- `POST /api/paypal/execute-payment` - Exécuter paiement
- `GET /api/admin/renewal-invoices` - Liste factures
- `GET /api/admin/renewal-invoice/{id}/pdf` - Télécharger PDF

## Database Collections
- `clients` - Avec `expires_at`, `auto_delete_days`
- `galleries` - Avec `music_url` pour musique diaporama
- `paypal_payments` - Paiements PayPal
- `renewal_invoices` - Factures de renouvellement
- `testimonials` - Témoignages clients

## 3rd Party Integrations
- IONOS SMTP (emails)
- PayPal REST API (paiements)
- openpyxl (export Excel)
- reportlab (génération PDF)
- qrcode (génération QR codes)

## Files Created/Modified This Session
- `/app/frontend/src/components/GallerySlideshowModal.js` - Amélioré
- `/app/frontend/src/pages/ClientDashboard.js` - Intégration diaporama
- `/app/frontend/src/pages/AdminDashboard.js` - Upload musique galerie
- `/app/frontend/src/pages/SharedGalleryPage.js` - NOUVEAU - Page publique galerie
- `/app/backend/models/schemas.py` - Ajout `music_url` à Gallery
- `/app/backend/server.py` - Endpoints upload/delete musique + galerie publique

## PWA Configuration
- `manifest.json` - Icônes et métadonnées
- `sw.js` - Service worker avec caching
- `PWAInstallPrompt.js` - Composant d'installation
- Notifications push configurées

---
*Last updated: December 2025*
