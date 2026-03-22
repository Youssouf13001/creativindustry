# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind) avec reconnaissance faciale AWS
- Portail client avec galeries et sélection de photos
- Système de rendez-vous avec notifications SMS (Brevo)
- Paiements (Stripe, PayPal)
- Contrats électroniques avec signature
- Gestion de projets et suivi client
- **NOUVEAU** : Gestion de matériel (style GLPI) avec inventaire, déplacements et PDF

## Test Credentials
- **Admin**: test@admin.com / admin123
- **Client test**: test-client@example.com / Test1234

## Architecture après Refactoring (Mars 2026)

### Backend Structure
```
/backend/
├── server.py              (12 400+ lignes)
├── routes/
│   ├── appointments.py    (657 lignes) - RDV + Rappels SMS
│   ├── photofind.py       (1 784 lignes) - Kiosque + Upload mobile
│   ├── galleries.py       (535 lignes) - Galeries
│   ├── contracts.py       (380 lignes) - Contrats
│   ├── guestbook.py       (632 lignes) - Livre d'or
│   ├── auth.py            (372 lignes) - Auth
│   ├── clients.py         (286 lignes) - Clients
│   ├── paypal.py          (467 lignes) - PayPal
│   └── equipment.py       (650 lignes) - **NOUVEAU** Inventaire & Déplacements
├── print_service/
│   └── dnp_print_service.py - Service d'impression DNP local
├── services/
│   ├── sms_service.py     - SMS Brevo
│   ├── scheduler_service.py - Rappels automatiques
│   └── email_service.py   - Emails SMTP
└── models/
    └── schemas.py         - Modèles Pydantic
```

### Frontend Structure
```
/frontend/src/
├── pages/
│   ├── AdminDashboard.js  (9 500 lignes) - À refactoriser
│   ├── ClientDashboard.js (3 500+ lignes)
│   ├── PhotoFindKiosk.js  (2 300 lignes)
│   ├── PhotoFindMobile.js - Kiosque mobile Safari/iOS compatible
│   ├── UploadPrint.js     - Upload photo depuis téléphone vers kiosque
│   └── PhotoFindDownloadPage.js - Page de téléchargement avec paywall
└── components/
    ├── admin/
    │   └── EquipmentPage.js (1 064 lignes) - **NOUVEAU** Gestion matériel
    └── client/
        └── ClientAppointments.js
```

## Session du 22 Mars 2026

### ✅ IMPLÉMENTÉ: Gestion de Matériel (style GLPI)
- **Fonctionnalité complète** pour gérer l'inventaire photographique
- **Backend** : `/app/backend/routes/equipment.py`
  - `GET/POST /api/equipment` - CRUD équipements
  - `GET /api/equipment/categories` - Catégories (8 par défaut)
  - `GET /api/equipment/stats` - Statistiques (total, disponible, en déplacement)
  - `GET/POST /api/deployments` - Gestion des déplacements
  - `GET /api/deployments/{id}/pdf` - **Génération PDF checklist** (ReportLab)
  - `POST /api/deployments/{id}/start` - Démarrer un déplacement
  - `POST /api/deployments/{id}/return` - Valider le retour avec signalement pertes/casses
  - `GET /api/equipment/reminders` - Alertes (garantie expirante, équipement perdu)
- **Frontend** : `/app/frontend/src/components/admin/EquipmentPage.js`
  - Page fullscreen accessible via `/admin/equipment`
  - 3 onglets : Inventaire, Déplacements, Alertes
  - Statistiques en temps réel (Total, Disponibles, En déplacement, Alertes)
  - Filtres par catégorie, état, recherche
  - Modals pour création équipement et déplacement
  - Téléchargement PDF des checklists
  - **Lien ajouté dans le menu profil admin** (Gestion Matériel)
- **Tests** : 100% passés (16 tests backend, tous tests UI)

### Collections MongoDB ajoutées
- `equipment` : {id, name, brand, model, serial_number, category_id, purchase_date, purchase_price, warranty_end_date, condition, is_available, notes, created_at, created_by}
- `equipment_categories` : {id, name, icon, color}
- `deployments` : {id, name, location, start_date, end_date, equipment_ids, status, notes, checked_out_at, checked_in_at, return_notes, issues}
- `equipment_reminders` : {id, type, equipment_id, message, resolved, created_at}

## Session du 3 Mars 2026 (matin)

### ✅ RÉSOLU: Vue des RDV côté client
- **Problème**: Les clients ne voyaient pas leurs RDV dans leur espace
- **Solution**:
  1. Créé endpoint `GET /api/client/appointments` dans `server.py`
  2. Créé endpoint `PUT /api/client/appointments/{id}/respond-reschedule`
  3. Intégré composant `ClientAppointments.js` dans `ClientDashboard.js`
  4. Ajouté onglet "Rendez-vous" avec icône CalendarDays
- **Testé**: ✅ Fonctionnel

### Sessions précédentes ✅
- **Écran noir Kiosque PhotoFind** - Variable `eventDetails` → `event`
- **SMS Brevo non envoyés** - `load_dotenv()` déplacé avant imports
- **Actions admin sur RDV confirmés** (proposer nouvelle date, annuler, supprimer)
- **Rappels SMS 100% automatiques** - APScheduler tous les jours à 10h

## Instructions de déploiement IONOS

Pour appliquer les changements sur votre serveur de production:

```bash
# Se connecter au serveur
ssh user@votre-serveur-ionos

# Aller dans le dossier du projet
cd /var/www/creativindustry

# Sauvegarder les modifications locales
git stash

# Récupérer les dernières modifications
git pull origin main

# Réappliquer les modifications locales
git stash pop

# IMPORTANT: Reconstruire le frontend
cd frontend
npm run build

# Redémarrer le backend
cd ..
pkill -f uvicorn
nohup python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 &
```

## Prochaines Tâches

### P0 - Urgent
- [x] ~~Gestion de Matériel (GLPI)~~ ✅ Terminé le 22 Mars 2026

### P1 - Important
- [ ] Bug retour PayPal sur mobile kiosque (Safari/iOS)
- [ ] Prise de RDV depuis l'espace client
- [ ] Refactoring AdminDashboard.js (9 500 lignes)
- [ ] Continuer refactoring server.py (admin, bookings, quotes)

### P2 - Backlog
- [ ] Bug témoignages `[object Object]`
- [ ] Dashboard devis statistiques à zéro
- [ ] Intégration Terminal SumUp
- [ ] Impression directe DNP (service local créé, à tester sur Windows)

## Intégrations 3rd Party
- AWS Rekognition (reconnaissance faciale)
- Brevo/Sendinblue (SMS) ✅ Fonctionnel
- Stripe (paiements) ✅ Fonctionnel
- PayPal (paiements) ✅ Fonctionnel (bug retour mobile en cours)
- FFmpeg (traitement vidéo)
- react-pdf (affichage PDF)
- APScheduler (tâches planifiées)
- **ReportLab** (génération PDF pour checklists équipement)

## Notes Techniques
- MongoDB avec DB_NAME='test_database'
- SMTP via IONOS (smtp.ionos.fr)
- Déploiement manuel sur IONOS via SSH
- Backend: FastAPI + uvicorn
- Frontend: React + Tailwind
- **IMPORTANT**: Tout changement frontend nécessite `npm run build` sur le serveur
- **IMPORTANT**: Tout changement backend nécessite redémarrage de PM2/systemd

## Dernière mise à jour
22 Mars 2026 - 19:55 UTC
