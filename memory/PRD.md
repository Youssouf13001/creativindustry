# CREATIVINDUSTRY France - PRD

## Énoncé du Problème
Site vitrine pour photographe/vidéaste de mariage avec plateaux TV et studio podcast. Système de réservation avec prix modifiables via admin. Espace client pour télécharger fichiers. Chatbot IA.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec bcrypt (Admin + Client séparés)
- **IA**: OpenAI GPT-4o via Emergent Universal Key
- **Stockage**: Fichiers stockés sur le serveur IONOS

## Fonctionnalités Implémentées

### V1 - Site Vitrine (31 Jan 2026)
- Page d'accueil avec hero cinématique
- 3 pages services (Mariage, Podcast, Plateau TV)
- Page contact avec formulaire
- Design "Dark Luxury" avec accents dorés
- Système de réservation
- Espace Admin

### V2 - Devis Mariage Personnalisé (31 Jan 2026)
- Configurateur de devis en 3 étapes
- 16 options sélectionnables (Drone, Cérémonie, Soirée, etc.)
- Calcul automatique du prix
- Portfolio photos/vidéos

### V3 - Espace Client + Chatbot (31 Jan 2026)
- ✅ Espace Client avec connexion
- ✅ Dashboard client avec fichiers (vidéos/photos)
- ✅ Téléchargement via liens externes (Google Drive, Dropbox)
- ✅ Chatbot IA (GPT-4o) pour visiteurs
- ✅ Gestion des clients dans l'admin
- ✅ Ajout de fichiers aux clients

### V4 - Notifications Email (31 Jan 2026)
- ✅ Email automatique lors du dépôt d'un fichier client
- ✅ Template email professionnel avec design CREATIVINDUSTRY
- ✅ SMTP IONOS configuré (via variables d'environnement .env)

### V5 - Gestion Complète du Contenu (31 Jan 2026)
- ✅ Onglet "Contenu Site" dans l'admin
- ✅ Onglet "Portfolio" dans l'admin
- ✅ APIs Backend complètes
- ✅ Tests validés : 100% backend, 100% frontend

### V6 - Upload Direct de Fichiers (31 Jan 2026)
- ✅ Upload direct sur le serveur IONOS (pas de service externe)
- ✅ **Portfolio** : Bouton "Uploader une photo/vidéo" 
- ✅ **Espace Client** : Bouton "Uploader un fichier"
- ✅ Formats supportés : JPG, PNG, WEBP, GIF, MP4, WEBM, MOV
- ✅ Limite de taille : 100 Mo par fichier
- ✅ Notification email automatique au client après upload
- ✅ Possibilité de garder les liens externes (YouTube, Google Drive, etc.)

## Tarifs de Base
### Mariages : 1500€ - 4500€
### Podcast : 150€/h - 700€/jour
### Plateau TV : 800€ - 3500€

## URLs importantes
- Site : https://creativindustry.com
- Admin : /admin
- Espace Client : /client

## APIs Clés
- `/api/content` - GET/PUT contenu du site
- `/api/admin/portfolio` - CRUD portfolio (admin)
- `/api/upload/portfolio` - Upload fichiers portfolio
- `/api/upload/client/{id}` - Upload fichiers client
- `/api/portfolio` - GET portfolio public
- `/api/auth/*` - Authentification admin
- `/api/client/*` - Authentification et gestion client

## Backlog
- P2: Calendrier des disponibilités
- P2: Paiement en ligne (Stripe)
- P2: Refactoring du frontend (décomposer App.js en composants)

## Mise à jour du site IONOS
1. "Save to GitHub" sur Emergent
2. Sur VPS IONOS: 
```bash
cd /var/www/creativindustry
git pull origin main
cd frontend && npm run build
sudo systemctl restart creativindustry
```
