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

### V15 - Sauvegarde Complète & Stories (02 Fév 2026)
- ✅ **Sauvegarde complète ZIP** : Téléchargement depuis l'admin (Paramètres)
  - Base de données MongoDB exportée en JSON (toutes les collections)
  - Fichiers uploadés inclus (portfolio, galeries, clients)
  - README.txt avec instructions de restauration
  - Endpoint : `GET /api/admin/backup` (authentification requise)
- ✅ **Stories style Instagram** : Vidéos de 1 à 90 secondes en haut du portfolio
  - Durée personnalisable, son activé par défaut
  - Comptage de vues (clients vs anonymes)
  - Gestion dans l'admin (filtre dédié)
- ✅ **MFA complet** : Double authentification pour les admins
  - QR code TOTP, codes de secours
  - Récupération par email

### V14 - Réorganisation Portfolio (02 Fév 2026)
- ✅ **Structure par catégories** : Vue principale avec 3 catégories (Mariages, Podcast, Plateau TV)
- ✅ **Icônes et compteurs** : Chaque catégorie affiche une icône colorée et le nombre de clients/médias
- ✅ **Vue clients** : Clic sur une catégorie → liste des clients avec photo de couverture
- ✅ **Galerie client** : Clic sur un client → toutes ses photos et vidéos
- ✅ **Navigation intuitive** : Fil d'Ariane avec boutons "Retour aux clients" / "Retour aux catégories"
- ✅ **Lightbox** : Vue agrandie des photos avec navigation
- ✅ **Admin - Champ "Nom du client"** : Nouveau champ dans le formulaire d'ajout portfolio
- ✅ **Admin - Affichage client** : Le nom du client s'affiche en doré sur chaque élément

### V13 - Améliorations Devis Mariage (01 Fév 2026)
- ✅ **Vue détaillée du devis** : Modal avec toutes les infos client et prestations
- ✅ **Bouton "Imprimer / PDF"** : Génère une version imprimable
- ✅ **Notifications email** aux 2 adresses :
  - contact@creativindustry.com
  - communication@creativindustry.com
- ✅ **Email formaté** avec récap complet (client, prestations, total)

### V12 - Système de Sélection Photos Client (01 Fév 2026)
- ✅ **Admin - Gestion des galeries** :
  - Nouvel onglet "📸 Galeries" 
  - Créer des galeries par client (ex: "Mariage 15 juin")
  - Upload multiple de photos
  - Voir les photos sélectionnées par le client
  - **⬇ Télécharger ZIP** des photos sélectionnées
  - Supprimer photos/galeries
- ✅ **Client - Sélection des photos** :
  - Nouvel onglet "📸 Sélection Photos" dans l'espace client
  - Vue des galeries disponibles
  - **🔍 Lightbox** pour voir les photos en grand (navigation ← →)
  - Clic pour sélectionner/désélectionner (bouton ✓ sur chaque photo)
  - Numéro d'ordre affiché sur chaque photo sélectionnée
  - Sauvegarde brouillon possible
  - Validation définitive de la sélection
- ✅ **Email de notification** à l'admin quand le client valide sa sélection

### V11 - Calendrier Admin (01 Fév 2026)
- ✅ Nouvel onglet "📅 Calendrier" dans l'admin
- ✅ Vue mensuelle avec navigation (mois précédent/suivant/aujourd'hui)
- ✅ Affichage des RDV avec couleurs par statut
- ✅ Affichage des réservations (violet)
- ✅ Clic sur un RDV → détails
- ✅ Statistiques en bas (En attente, Confirmés, Date proposée, Réservations)

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
- `/api/admin/backup` - Téléchargement sauvegarde ZIP (auth admin)
- `/api/auth/mfa/*` - Endpoints MFA (generate, verify, disable, reset)
- `/api/stories/{id}/view` - Enregistrement vue story

## Backlog
- P1: Refactoring AdminDashboard.js (2000+ lignes) en composants séparés
- P1: Refactoring server.py en plusieurs routers FastAPI
- P2: Rappels automatiques 24h avant le RDV
- P2: Compression automatique des images à l'upload

## Architecture Frontend (Refactorisé V10)
```
/app/frontend/src/
├── App.js (55 lignes)
├── config/api.js
├── components/
│   ├── Header.js
│   ├── Footer.js
│   └── ChatWidget.js
└── pages/
    ├── HomePage.js
    ├── ServicePage.js
    ├── WeddingQuotePage.js
    ├── PortfolioPage.js
    ├── BookingPage.js
    ├── AppointmentPage.js
    ├── AppointmentConfirmPage.js
    ├── ContactPage.js
    ├── AdminLogin.js
    ├── AdminDashboard.js
    ├── ClientLogin.js
    └── ClientDashboard.js
```

## Mise à jour IONOS
```bash
cd /var/www/creativindustry
git pull origin main
cd frontend && npm run build
sudo systemctl restart creativindustry
```
