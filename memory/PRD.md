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
- **Frontend**: React + TailwindCSS + Shadcn/UI + Recharts
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
- [x] Expiration de compte personnalisée
- [x] Système de renouvellement PayPal avec activation automatique
- [x] Système de facturation avec PDF
- [x] Application de TVA 20% sur tous les paiements
- [x] **PWA (Progressive Web App)** - Installation mobile, notifications push
- [x] **Galerie améliorée** - Diaporama, musique, partage social, QR code
- [x] **Livre d'or digital** - Messages texte/audio/vidéo des invités via QR code
- [x] **Graphique espace disque** - Camembert d'utilisation stockage dans admin (25 Fév 2026)
- [x] **Galerie Interactive** - Expérience immersive avec carrousel 3D CSS et vue grille (25 Fév 2026)

### 🔴 Known Issues (P0 - BLOCKER)
1. **Erreur `[object Object]`** - Soumission de témoignage en production (IONOS)

### 🟠 Issues (P1-P2)
2. Dashboard site `devis` - Statistiques à zéro (P1)
3. Téléchargement factures PDF depuis admin (P1, vérification requise)
4. Erreur 404 mise à jour statut projet IONOS (P2)

## Upcoming Tasks

### P2 - Améliorations
- Rappels automatiques (expiration comptes, RDV)
- Paiement en plusieurs fois (3x/4x via PayPal)
- Compression images côté serveur
- Synchronisation données devis ↔ creativindustry
- Refactoring backend/frontend (dette technique)

## Key API Endpoints

### Livre d'or
- `POST /api/admin/guestbooks` - Créer un livre d'or
- `GET /api/admin/guestbooks` - Liste des livres d'or (admin)
- `GET /api/admin/guestbooks/{id}` - Détails avec messages
- `PUT /api/admin/guestbook-messages/{id}/approve` - Approuver message
- `DELETE /api/admin/guestbook-messages/{id}` - Supprimer message
- `GET /api/public/guestbooks/{id}` - Vue publique
- `POST /api/public/guestbooks/{id}/messages/text` - Poster message texte
- `POST /api/public/guestbooks/{id}/messages/media` - Poster audio/vidéo
- `GET /api/client/guestbooks` - Livres d'or du client
- `PUT /api/client/guestbook-messages/{id}/approve` - Client approuve

### Galerie
- `POST /api/admin/galleries/{id}/music` - Upload musique galerie
- `GET /api/public/galleries/{id}` - Vue publique galerie

## Database Collections
- `guestbooks` - Livres d'or
- `guestbook_messages` - Messages (texte/audio/vidéo)
- `galleries` - Avec `music_url` pour musique diaporama

## New Pages Created
- `/livre-dor/:guestbookId` - Page publique pour laisser des messages
- `/galerie/:galleryId` - Page publique pour voir une galerie
- `/galerie3d/:galleryId` - Galerie interactive avec carrousel 3D et vue grille

## Key API Endpoints (PhotoFind)
- IONOS SMTP (emails)
- PayPal REST API (paiements)
- openpyxl (export Excel)
- reportlab (génération PDF)
- qrcode (génération QR codes)
- MediaRecorder API (enregistrement audio/vidéo)

## PWA Configuration
- `manifest.json` - Icônes et métadonnées
- `sw.js` - Service worker avec caching
- `PWAInstallPrompt.js` - Composant d'installation

---
*Last updated: December 2025*
