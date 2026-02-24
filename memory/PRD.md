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

### V20 - Témoignages & Popup Accueil (22 Fév 2026)
- ✅ **Page Témoignages publique** (`/temoignages`) :
  - Design élégant avec grille responsive 3 colonnes
  - Affichage des témoignages approuvés avec étoiles dorées
  - Badge "RECOMMANDÉ" pour les témoignages mis en avant (featured)
  - Avatar du client visible sur chaque témoignage
  - **Authentification requise** pour laisser un témoignage
  - Formulaire pré-rempli avec infos du client connecté
- ✅ **Gestion Admin Témoignages** (onglet "⭐ Témoignages") :
  - Liste tous les témoignages avec statut
  - Boutons Approuver/Rejeter/Supprimer
  - Toggle "Mettre en avant" pour les témoignages approuvés
- ✅ **Popup d'Accueil avec Vidéo** :
  - Popup modal animé à l'arrivée sur le site
  - Upload vidéo max **500MB** (MP4, WebM, MOV)
  - Fonctionne avec ou sans vidéo
- ✅ **Page Actualités** (`/actualites`) - Style Instagram :
  - Grille de photos/vidéos carrées
  - Likes (clients connectés uniquement)
  - Commentaires avec validation :
    - Clients connectés → publication immédiate avec avatar
    - Visiteurs → nom/email requis + validation admin
  - Modal détail avec lecture vidéo
- ✅ **Gestion Admin Actualités** (onglet "📰 Actualités") :
  - Création de publications (photo/vidéo + légende + lieu)
  - Modération des commentaires visiteurs
  - Suppression des publications
- ✅ **Endpoints Backend** :
  - Témoignages : POST (auth required), GET, admin CRUD
  - Actualités : CRUD posts, likes, comments avec modération
- ✅ **Tests** : UI vérifiée ✅

### V19 - Notifications E-mail Progression Client (22 Fév 2026)
- ✅ **E-mail automatique au client lors de l'avancement du projet** :
  - Envoyé quand une étape visible passe à "Terminé" ou "En cours"
  - Contenu détaillé avec progression globale (pourcentage)
  - Liste des étapes terminées (✓ vert)
  - Liste des étapes en cours (⏳ orange)
  - Liste des prochaines étapes (○ gris)
  - Barre de progression visuelle avec dégradé doré
  - Bouton CTA vers l'espace client
  - Template e-mail professionnel avec branding CREATIVINDUSTRY
- ✅ **Fonction `send_client_progress_email`** (server.py ligne ~102) :
  - Calcule automatiquement le % de progression
  - Récupère toutes les tâches visibles du client
  - Gère les cas limites (client sans e-mail, division par zéro)
- ✅ **Intégration dans les endpoints** :
  - `PUT /api/tasks/{id}` - envoie l'e-mail si statut change vers completed/in_progress
  - `POST /api/tasks/{id}/toggle-status` - envoie l'e-mail si toggle vers completed
- ✅ **Tests** : 11 tests backend (100% passés)
  - `/app/backend/tests/test_client_email_notifications.py`

### V18 - Gestion des Tâches et Collaborateurs (21 Fév 2026)
- ✅ **Système de gestion des tâches complet** :
  - Créer des tâches avec titre, description, date d'échéance, priorité (Haute/Moyenne/Basse)
  - Marquer comme fait/non fait avec toggle rapide
  - Statuts : En attente, En cours, Terminée
  - Indicateur visuel des tâches en retard et dues aujourd'hui
  - Statistiques : Total, En attente, En cours, Terminées, En retard, Aujourd'hui, Priorité haute
  - Filtres : Recherche, Statut, Priorité, Client
- ✅ **Gestion des collaborateurs** :
  - 3 niveaux : Admin (accès total), Éditeur (peut modifier), Lecteur (peut voir ses tâches)
  - Créer/Modifier/Supprimer des collaborateurs
  - Connexion séparée pour les collaborateurs (`/api/team/login`)
- ✅ **Assignation des tâches** :
  - Assigner une tâche à plusieurs collaborateurs
  - Affichage des noms assignés sur chaque tâche
- ✅ **Lien avec les clients** :
  - Associer une tâche à un client existant
  - Exemple : "Montage pour Mohamed"
- ✅ **Relances par e-mail personnalisables** :
  - 1 jour avant l'échéance
  - Le jour même
  - 1 jour après (si non fait)
  - Endpoint cron : `POST /api/tasks/check-reminders`
- ✅ **Visibilité client (Suivi de projet)** :
  - Rendre une tâche visible au client avec un message personnalisé
  - Exemple : "Montage en cours de finalisation"
  - Nouvel onglet "Mon Projet" dans l'espace client
  - Le client voit l'avancement de son projet
- ✅ **Endpoints Backend** :
  - `POST /api/admin/team-users` - Créer collaborateur
  - `GET /api/admin/team-users` - Liste des collaborateurs
  - `PUT /api/admin/team-users/{id}` - Modifier collaborateur
  - `DELETE /api/admin/team-users/{id}` - Supprimer collaborateur
  - `POST /api/team/login` - Connexion collaborateur
  - `GET /api/team/me` - Profil collaborateur connecté
  - `POST /api/tasks` - Créer tâche
  - `GET /api/tasks` - Liste des tâches (avec filtres)
  - `GET /api/tasks/{id}` - Détail d'une tâche
  - `PUT /api/tasks/{id}` - Modifier tâche
  - `DELETE /api/tasks/{id}` - Supprimer tâche
  - `POST /api/tasks/{id}/toggle-status` - Toggle statut
  - `GET /api/tasks/stats/overview` - Statistiques
  - `GET /api/client/project-status` - Statut projet pour client
- ✅ **Composant Frontend** :
  - `/app/frontend/src/components/admin/TaskManager.js` - Gestion complète des tâches et équipe
  - Nouvel onglet "📋 Tâches" dans AdminDashboard
  - Onglet "Mon Projet" dans ClientDashboard
- ✅ **Tests** :
  - 21 tests unitaires backend (100% passés)
  - `/app/backend/tests/test_task_management.py`

### V17 - Chat WebSocket, PDF Downloads, ZIP & Upload Multiple (19 Fév 2026)
- ✅ **Chat Messagerie Instantanée (WebSocket)** :
  - Communication en temps réel entre admin et clients
  - Envoi de fichiers et images (max 50MB)
  - Indicateur "en ligne" pour les clients
  - Compteur de messages non lus
  - WebSocket avec authentification JWT
  - Composants : `ClientChat.js`, `AdminChat.js`
- ✅ **Téléchargement PDF Devis et Factures** :
  - Client peut télécharger ses devis en PDF
  - Client peut télécharger ses factures en PDF
  - PDF générés à la volée avec ReportLab
  - Design professionnel avec branding CREATIVINDUSTRY
- ✅ **Téléchargement ZIP Fichiers Client (Admin)** :
  - Admin peut télécharger tous les fichiers d'un client en ZIP
  - Structure par catégorie (music, documents, photos, videos)
  - ZIP supprimé automatiquement après téléchargement
- ✅ **Limite Admin Upload augmentée à 10Go** (au lieu de 5Go)
- ✅ **Upload Multiple de Fichiers (Client)** :
  - Toutes les catégories supportent l'upload multiple
  - Musique, Documents, Photos, Vidéos
  - Attribut `multiple` sur tous les inputs

### V16 - Newsletter & Améliorations Espace Client (03 Fév 2026)
- ✅ **Système de Newsletter complet** :
  - Les nouveaux clients sont automatiquement abonnés à l'inscription
  - Email de notification envoyé lors de la publication d'une nouvelle vidéo ou story
  - Template email stylisé avec branding CREATIVINDUSTRY
  - Lien de désabonnement dans chaque email
  - Endpoints : `GET /api/newsletter/unsubscribe/{client_id}`, `POST /api/newsletter/resubscribe/{client_id}`
- ✅ **Page de désabonnement** (`/unsubscribe/:clientId`) :
  - États : succès, déjà désabonné, erreur, réabonnement réussi
  - Bouton de réabonnement
  - Design cohérent avec le site
- ✅ **Gestion des préférences newsletter dans l'espace client** :
  - Section "Notifications" dans l'onglet Paramètres
  - Toggle ON/OFF pour activer/désactiver la newsletter
  - Endpoint : `PUT /api/client/newsletter`
  - Mise à jour en temps réel avec feedback visuel
- ✅ **Espace Client Amélioré** :
  - Photo de profil avec persistance (stockée dans localStorage)
  - Menu déroulant global dans le header pour les clients connectés
  - Réinitialisation de mot de passe par email
- ✅ **Suivi d'Activité Client** :
  - Clients en ligne visibles dans l'admin
  - Historique des téléchargements avec nom du fichier
- ✅ **Upload de fichiers amélioré** :
  - Support ZIP, RAR, PDF
  - Barre de progression

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
- `/api/newsletter/unsubscribe/{client_id}` - Désabonnement newsletter
- `/api/newsletter/resubscribe/{client_id}` - Réabonnement newsletter
- `/api/client/newsletter` - PUT pour modifier préférence newsletter
- `/api/client/profile/photo` - Upload photo de profil
- `/api/client/heartbeat` - Suivi activité client
- `/api/admin/clients/online` - Liste clients en ligne

### Chat & Communication (V17)
- `/api/ws/chat/client/{client_id}` - WebSocket chat client
- `/api/ws/chat/admin/{admin_id}` - WebSocket chat admin
- `/api/chat/conversations` - Liste des conversations (admin)
- `/api/chat/messages/{client_id}` - Messages d'un client (admin)
- `/api/chat/my-messages` - Mes messages (client)
- `/api/chat/upload` - Upload fichier pour chat
- `/api/chat/unread-count` - Compteur non lus (admin)
- `/api/chat/client/unread-count` - Compteur non lus (client)

### PDF & ZIP Downloads (V17)
- `/api/client/devis/{devis_id}/pdf` - Télécharger devis PDF
- `/api/client/invoice/{invoice_id}/pdf` - Télécharger facture PDF
- `/api/admin/client/{client_id}/files-zip` - Télécharger fichiers client en ZIP

## Backlog
- P0: Refactoring AdminDashboard.js (5500+ lignes) en composants séparés - CRITIQUE
- P0: Refactoring server.py (6900+ lignes) en plusieurs routers FastAPI - CRITIQUE
- P1: Tableau de bord du site `devis` affiche zéro (bug signalé)
- P1: E-mails de création de compte arrivent en spam (configuration DNS SPF/DKIM/DMARC)
- P2: Page comptabilité ne se rafraîchit pas après envoi de rapport (site `devis`)
- P2: Chat client/admin - vérification utilisateur en attente
- P2: Rappels automatiques 24h avant le RDV
- P2: Compression automatique des images à l'upload
- P2: Fonctionnalité liens Synology pour fichiers volumineux (reportée)

## Problèmes Résolus (19 Fév 2026)
- ✅ **Problème de miniatures** : Les URLs relatives n'étaient pas préfixées avec `BACKEND_URL` dans `PortfolioPage.js`. Corrigé en ajoutant des vérifications `startsWith('http')` sur toutes les URLs de médias.

## Intégration Paiements (Documentation)
Pour synchroniser les paiements depuis le site devis, envoyer une requête POST à :
```
POST /api/integration/sync-payment
{
  "client_email": "client@example.com",
  "devis_id": "uuid-du-devis",
  "payment_id": "uuid-unique-paiement",
  "amount": 400.00,
  "payment_date": "2026-02-19",
  "payment_method": "Virement bancaire",
  "api_key": "votre-clé-api"
}
```

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
    ├── ClientDashboard.js
    └── UnsubscribePage.js
```

## Mise à jour IONOS
```bash
cd /var/www/creativindustry
git pull origin main
cd frontend && npm run build
sudo systemctl restart creativindustry
```
