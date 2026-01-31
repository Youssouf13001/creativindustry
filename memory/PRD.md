# CREATIVINDUSTRY France - PRD

## Énoncé du Problème
Site vitrine pour photographe/vidéaste de mariage avec plateaux TV et studio podcast. Système de réservation avec prix modifiables via admin. Espace client pour télécharger fichiers. Chatbot IA.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec bcrypt (Admin + Client séparés)
- **IA**: OpenAI GPT-4o via Emergent Universal Key

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
  - Modification du titre/sous-titre Hero
  - Modification des images de fond (URL)
  - Édition des textes et images pour Mariage, Podcast, Plateau TV
  - Modification des informations de contact
  - Section CTA personnalisable
- ✅ Onglet "Portfolio" dans l'admin
  - Ajout/modification/suppression d'éléments
  - Support photo et vidéo
  - Catégorisation (Mariage, Podcast, Plateau TV)
  - Option "Featured" pour mise en avant
  - Activation/désactivation des éléments
- ✅ APIs Backend complètes (GET/PUT /api/content, CRUD /api/admin/portfolio)
- ✅ Tests validés : 100% backend, 100% frontend

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
- `/api/portfolio` - GET portfolio public
- `/api/auth/*` - Authentification admin
- `/api/client/*` - Authentification et gestion client
- `/api/chatbot` - Chatbot IA

## Backlog
- P1: Upload direct de fichiers (Cloudinary)
- P2: Calendrier disponibilités
- P2: Paiement en ligne (Stripe)
- P2: Refactoring du frontend (décomposer App.js en composants)

## Mise à jour du site
1. Modifier sur Emergent
2. "Save to GitHub"
3. Sur VPS IONOS: `git pull` + `npm run build` + `systemctl restart creativindustry`
