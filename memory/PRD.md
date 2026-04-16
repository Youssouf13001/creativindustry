# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind) avec reconnaissance faciale AWS
- Portail client avec galeries et sélection de photos
- Système de rendez-vous avec notifications SMS (Brevo)
- Paiements (Stripe, PayPal)
- Contrats électroniques avec signature
- Gestion de projets et suivi client
- Gestion de matériel (style GLPI) avec inventaire, déplacements, PDF, signatures et tickets pertes/vols

## Test Credentials
- **Admin**: test@admin.com / admin123
- **Client test**: test-client@example.com / Test1234

## Architecture

### Backend Structure
```
/backend/
├── server.py              (12 400+ lignes)
├── routes/
│   ├── appointments.py    - RDV + Rappels SMS
│   ├── photofind.py       - Kiosque + Upload mobile
│   ├── galleries.py       - Galeries
│   ├── contracts.py       - Contrats
│   ├── guestbook.py       - Livre d'or
│   ├── auth.py            - Auth
│   ├── clients.py         - Clients
│   ├── paypal.py          - PayPal
│   └── equipment.py       (1133 lignes) - Inventaire, Déplacements, Tickets
├── services/
│   ├── sms_service.py     - SMS Brevo
│   ├── scheduler_service.py - Rappels auto (déploiements + tickets)
│   └── email_service.py   - Emails SMTP
└── scripts/
    └── import_equipment.py - Import bulk DB
```

### Frontend Structure
```
/frontend/src/
├── components/
│   ├── admin/
│   │   └── EquipmentPage.js (1700+ lignes) - Gestion matériel complète
│   ├── SignaturePad.js     - Canvas API signature digitale
│   └── client/
├── hooks/
│   └── useOfflineEquipment.js - PWA offline mode
└── public/
    └── sw-equipment.js     - Service Worker offline
```

## Fonctionnalités Matériel (Complet)

### Backend API Endpoints
- `GET/POST /api/equipment` - CRUD équipements avec quantités
- `GET/POST /api/equipment/categories` - Catégories
- `GET /api/equipment/stats` - Statistiques
- `GET/POST/PUT/DELETE /api/deployments` - Déplacements avec quantités
- `POST /api/deployments/{id}/start` - Démarrer un déplacement
- `POST /api/deployments/{id}/return` - Valider retour avec signalement
- `POST /api/deployments/{id}/signature` - Signature digitale (départ/retour)
- `GET /api/deployments/{id}/pdf` - Génération PDF checklist (ReportLab)
- `GET/POST /api/loss-tickets` - Tickets pertes/vols/casses
- `PUT /api/loss-tickets/{id}` - Mise à jour statut ticket
- `POST /api/loss-tickets/{id}/remind` - Relance email
- `DELETE /api/loss-tickets/{id}` - Suppression ticket

### Frontend UI (EquipmentPage.js)
- 3 onglets : Inventaire, Déplacements, Alertes
- Statistiques temps réel
- Modals : Ajout/Édition équipement, Nouveau déplacement, Édition déplacement, Détails/Retour, Signature
- Onglet Alertes : Tickets pertes/vols/casses + Alertes équipement
- Mise à jour statut ticket (En attente, Commande en cours, Assurance, Résolu, Obsolète)

### Collections MongoDB
- `equipment` : {id, name, brand, model, serial_number, category_id, purchase_date, purchase_price, warranty_end_date, condition, quantity, is_available, notes}
- `equipment_categories` : {id, name, icon, color}
- `deployments` : {id, name, location, start_date, end_date, items: [{equipment_id, quantity, status, return_status}], signature_departure, signature_return, status}
- `equipment_reminders` : {id, type, equipment_id, equipment_name, issue, notes, resolved}
- `loss_tickets` : {id, equipment_id, equipment_name, equipment_details, issue_type, deployment_id, deployment_name, status, messages: [{id, status, message, estimated_date, created_at}], created_at, resolved_at}

## Tâches

### Terminé
- [x] Gestion Matériel CRUD complet
- [x] Catégories avec icônes
- [x] Import bulk 57 équipements
- [x] Déploiements avec quantités
- [x] Signatures digitales (Canvas API)
- [x] Génération PDF checklists (ReportLab)
- [x] Mode offline PWA (Service Worker)
- [x] APScheduler rappels automatiques
- [x] Édition/Suppression déploiements
- [x] Tickets pertes/vols/casses (backend + frontend)
- [x] UI tickets dans onglet Alertes
- [x] Bug fix: Backend crashé (SyntaxError f-string)

### P1 - Important
- [ ] Bug retour PayPal sur mobile kiosque (Safari/iOS)
- [ ] Refactoring EquipmentPage.js (extraction modales)
- [ ] Refactoring AdminDashboard.js (9500+ lignes)
- [ ] Refactoring server.py

### P2 - Backlog
- [ ] Enregistrement global Service Worker PWA
- [ ] Bug témoignages `[object Object]`
- [ ] Dashboard devis statistiques à zéro
- [ ] Intégration Terminal SumUp
- [ ] Impression directe DNP

## Instructions Déploiement IONOS
```bash
cd /var/www/creativindustry && git pull origin main && source venv/bin/activate && pip install -r requirements.txt && cd frontend && npm run build && cd .. && sudo systemctl restart creativindustry
```

## Intégrations 3rd Party
- AWS Rekognition, Brevo SMS, Stripe, PayPal, FFmpeg, ReportLab, APScheduler

## Dernière mise à jour
16 Avril 2026
