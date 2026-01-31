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

## Tarifs de Base
### Mariages : 1500€ - 4500€
### Podcast : 150€/h - 700€/jour
### Plateau TV : 800€ - 3500€

## URLs importantes
- Site : https://creativindustry.com
- Admin : /admin
- Espace Client : /client

## Backlog
- P1: Upload direct de fichiers (Cloudinary)
- P1: Notifications email automatiques
- P2: Calendrier disponibilités
- P2: Paiement en ligne (Stripe)

## Mise à jour du site
1. Modifier sur Emergent
2. "Save to GitHub"
3. Sur VPS: `git pull` + `npm run build` + `systemctl restart creativindustry`
