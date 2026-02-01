# CREATIVINDUSTRY France - PRD

## Énoncé du Problème
Site vitrine pour photographe/vidéaste de mariage avec plateaux TV et studio podcast. Système de réservation avec prix modifiables via admin. Espace client pour télécharger fichiers. Chatbot IA.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec bcrypt
- **IA**: OpenAI GPT-4o via Emergent Universal Key
- **Stockage**: Fichiers sur serveur IONOS

## Fonctionnalités Implémentées

### V1-V7 (Précédemment)
- Site vitrine complet
- Devis mariage personnalisé
- Espace client avec téléchargements
- Chatbot IA, Notifications email SMTP
- Gestion contenu admin, Upload fichiers
- Système réservation avec acompte 30%

### V10 - Refactoring Frontend (01 Fév 2026)
- ✅ **Découpage App.js** (4910 → 55 lignes)
- ✅ Structure modulaire :
  - `/src/config/api.js` - Constantes API
  - `/src/components/` - Header, Footer, ChatWidget
  - `/src/pages/` - 12 pages séparées
- ✅ Build optimisé (166 kB gzipped)
- ✅ Tous les fonctionnalités préservées

### V9 - Upload Miniature Direct (01 Fév 2026)
- ✅ Remplacement du champ URL miniature par bouton d'upload direct
- ✅ Aperçu de la miniature avec bouton de suppression
- ✅ Limite 50 Mo pour les miniatures (JPG, PNG, WEBP, GIF)
- ✅ Fonctionnalité disponible dans Portfolio et Fichiers Client

### V8 - Système de Rendez-vous (31 Jan 2026)
- ✅ **Page /rendez-vous** pour prise de RDV
  - 5 motifs : Signature contrat, Discussion contrat, Facturation, Projet, Autre
  - 3 durées : 30 min, 1h, 1h30
  - Créneaux : Lundi-Vendredi 18h+, Dimanche 9h-17h
  - Lieu : Dans vos locaux

- ✅ **Onglet "Rendez-vous" dans l'admin**
  - Liste des demandes avec statut coloré
  - Détails complets (nom, email, téléphone, motif, date, message)
  - 3 actions : Confirmer / Refuser / Proposer nouvelle date

- ✅ **Processus de validation en 2 étapes**
  - Si nouvelle date proposée → Email au client avec lien de confirmation
  - Client clique sur le lien → RDV confirmé automatiquement

- ✅ **Emails automatiques**
  - Email client : Demande reçue
  - Email admin : Notification nouvelle demande
  - Email client : Confirmation / Refus / Nouvelle date proposée
  - Email client : Confirmation finale après validation du lien

## URLs importantes
- Site : https://creativindustry.com
- Rendez-vous : /rendez-vous
- Confirmation RDV : /rendez-vous/confirmer/:id/:token
- Admin : /admin

## APIs Clés
- `/api/appointment-types` - Types et durées de RDV
- `/api/appointments` - CRUD rendez-vous
- `/api/appointments/confirm/:id/:token` - Confirmation lien email

## Backlog
- P2: Calendrier visuel des disponibilités
- P2: Rappels automatiques 24h avant le RDV

## Mise à jour IONOS
```bash
cd /var/www/creativindustry
git pull origin main
cd frontend && npm run build
sudo systemctl restart creativindustry
```
