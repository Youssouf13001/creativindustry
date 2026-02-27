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
- [x] **Options Premium Galeries** - Système de paiement PayPal pour 3D et téléchargement HD (25 Fév 2026)
- [x] **Mode Kiosque PhotoFind** - Borne photo plein écran pour événements (26 Fév 2026)
- [x] **Onglet Kiosque Admin** - Gestion séparée du mode kiosque dans l'admin (26 Fév 2026)
- [x] **Cadres/Filtres Photos** - 5 styles (Mariage, Vintage, Polaroid, Fête, Sans cadre) + cadres personnalisés (26 Fév 2026)
- [x] **Paiement PayPal Mobile Kiosque** - QR code pour payer sur téléphone + impression auto (26 Fév 2026)
- [x] **Paiement Stripe CB Kiosque** - Paiement par carte bancaire intégré avec Stripe (26 Fév 2026)
- [x] **Paiement Liquide/CB Kiosque** - Option paiement manuel avec confirmation (26 Fév 2026)
- [x] **Popup PWA désactivé** - Plus de popup intrusif (26 Fév 2026)
- [x] **Tarification avancée Kiosque** - Prix par format (A4, 10x15) avec/sans cadre (26 Fév 2026)
- [x] **Montage Vidéo Automatique Livre d'Or** - Génération FFmpeg des vidéos approuvées avec interface client (27 Fév 2026)

### 🔴 Known Issues (P0 - BLOCKER)
1. **Erreur `[object Object]`** - Soumission de témoignage en production (IONOS)
2. **Déploiement IONOS cassé** - Erreurs npm install persistantes

### 🟠 Issues (P1-P2)
3. Dashboard site `devis` - Statistiques à zéro (P1)
4. Téléchargement factures PDF depuis admin (P1, vérification requise)
5. Erreur 404 mise à jour statut projet IONOS (P2)
6. Popup PWA répétitif (P1)

## Upcoming Tasks

### P1 - Mode Kiosque avancé
- Intégration terminal CB (SumUp) pour paiements sur borne
- Intégration imprimante DNP pour impression directe
- Upload photos par les invités

### P2 - Améliorations
- Rappels automatiques (expiration comptes, RDV)
- Paiement en plusieurs fois (3x/4x via PayPal)
- Compression images côté serveur
- Synchronisation données devis ↔ creativindustry
- **Refactoring backend/frontend** (dette technique CRITIQUE - server.py et AdminDashboard.js sont des monolithes)

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

### PhotoFind Kiosk (NEW)
- `GET /api/public/photofind/{eventId}` - Infos publiques d'un événement (avec pricing.formats)
- `POST /api/public/photofind/{eventId}/search` - Recherche par selfie
- `GET /api/public/photofind/{eventId}/photo/{photoId}` - Servir une photo
- `POST /api/public/photofind/{eventId}/kiosk-purchase` - Créer un achat kiosque
- `POST /api/public/photofind/{eventId}/log-print` - Logger une impression
- `GET /api/admin/photofind/events/{eventId}/kiosk-stats` - Stats kiosque admin
- `PUT /api/admin/photofind/events/{eventId}/pricing` - Sauvegarder tarification avancée (formats + cadres)

## Database Collections
- `guestbooks` - Livres d'or
- `guestbook_messages` - Messages (texte/audio/vidéo)
- `galleries` - Avec `music_url` pour musique diaporama
- `photofind_events` - Événements PhotoFind
- `photofind_photos` - Photos avec faces indexées
- `photofind_kiosk_purchases` - Achats kiosque
- `photofind_print_logs` - Logs d'impressions

## New Pages Created
- `/livre-dor/:guestbookId` - Page publique pour laisser des messages
- `/galerie/:galleryId` - Page publique pour voir une galerie
- `/galerie3d/:galleryId` - Galerie interactive avec carrousel 3D CSS et vue grille
- `/kiosk/:eventId` - **Mode Kiosque PhotoFind** (plein écran, sans header/footer)

## Key API Endpoints (Gallery 3D)
- `GET /api/public/galleries/{gallery_id}` - Données publiques d'une galerie
- `GET /api/public/galleries/{gallery_id}/image/{photo_id}` - Servir une image inline
- `GET /api/admin/galleries/{gallery_id}/3d-info` - Infos galerie 3D + QR code base64
- `GET /api/admin/galleries/{gallery_id}/qrcode-3d` - Télécharger QR code PNG

## Key API Endpoints (Gallery Premium Options)
- `GET /api/admin/gallery-pricing` - Récupérer les tarifs
- `PUT /api/admin/gallery-pricing` - Modifier les tarifs
- `GET /api/admin/gallery-purchases` - Historique des ventes
- `GET /api/client/gallery/{gallery_id}/options` - Statut des options pour un client
- `POST /api/client/gallery/purchase` - Créer un paiement PayPal
- `POST /api/client/gallery/execute-payment` - Valider le paiement
- `GET /api/client/gallery/{gallery_id}/download-hd` - Télécharger toutes les photos HD en ZIP
- `GET /api/client/gallery/{gallery_id}/download-hd/{photo_id}` - Télécharger une photo HD

## 3rd Party Integrations
- IONOS SMTP (emails)
- PayPal REST API (paiements)
- openpyxl (export Excel)
- reportlab (génération PDF)
- qrcode (génération QR codes)
- MediaRecorder API (enregistrement audio/vidéo)
- AWS Rekognition (PhotoFind - reconnaissance faciale)
- FFmpeg (génération de diaporamas vidéo)

## PWA Configuration
- `manifest.json` - Icônes et métadonnées
- `sw.js` - Service worker avec caching
- `PWAInstallPrompt.js` - Composant d'installation

## Tarification Kiosque (Structure)
```json
{
  "pricing": {
    "formats": {
      "10x15": {"sans_cadre": 5, "avec_cadre": 8},
      "13x18": {"sans_cadre": 6, "avec_cadre": 10},
      "A5": {"sans_cadre": 8, "avec_cadre": 12},
      "A4": {"sans_cadre": 10, "avec_cadre": 20}
    },
    "email_single": 3,
    "email_pack_5": 12,
    "email_pack_10": 20,
    "email_all": 30
  }
}
```

---
*Last updated: February 26, 2026*
