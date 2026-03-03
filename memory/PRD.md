# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind) avec reconnaissance faciale AWS
- Portail client avec galeries et sélection de photos
- Système de rendez-vous avec notifications SMS (Brevo)
- Paiements (Stripe, PayPal)
- Contrats électroniques avec signature
- Gestion de projets et suivi client

## Test Credentials
- **Admin**: test@admin.com / admin123
- **Client**: client@test.com / testpassword

## Architecture après Refactoring (Mars 2026)

### Backend Structure
```
/backend/
├── server.py              (12 216 lignes - réduit de 14 500)
├── routes/
│   ├── appointments.py    (523 lignes) - RDV
│   ├── photofind.py       (1 089 lignes) - Kiosque
│   ├── galleries.py       (535 lignes) - Galeries
│   ├── contracts.py       (380 lignes) - Contrats
│   ├── guestbook.py       (632 lignes) - Livre d'or
│   ├── auth.py            (372 lignes) - Auth
│   ├── clients.py         (286 lignes) - Clients
│   └── paypal.py          (467 lignes) - PayPal
├── services/
│   ├── sms_service.py     - SMS Brevo
│   └── email_service.py   - Emails SMTP
└── models/
    └── schemas.py         - Modèles Pydantic
```

### Frontend Structure
```
/frontend/src/
├── pages/
│   ├── AdminDashboard.js  (9 200 lignes) - À refactoriser
│   ├── ClientDashboard.js (2 500+ lignes)
│   └── PhotoFindKiosk.js  (1 875 lignes)
└── components/
    ├── admin/
    └── client/
```

## Session du 3 Mars 2026

### Bugs Corrigés ✅
1. **Écran noir Kiosque PhotoFind** - Variable `eventDetails` → `event`
2. **SMS Brevo non envoyés** - `load_dotenv()` déplacé avant imports

### Fonctionnalités Ajoutées ✅
- Actions admin sur RDV confirmés (proposer nouvelle date, annuler, supprimer)
- Endpoint `DELETE /api/appointments/{id}`
- Statut "cancelled" pour les RDV

### Refactoring Backend ✅
- **server.py**: 14 500 → 12 216 lignes (-2 284)
- 3 nouveaux modules: `appointments.py`, `photofind.py`, `galleries.py`

## Prochaines Tâches

### P0 - Urgent
- [ ] Rappels SMS 24h avant les RDV (Brevo)

### P1 - Important
- [ ] Prise de RDV depuis l'espace client
- [ ] Refactoring AdminDashboard.js (9 200 lignes)
- [ ] Continuer refactoring server.py (admin, bookings, quotes)

### P2 - Backlog
- [ ] Bug témoignages `[object Object]`
- [ ] Dashboard devis statistiques à zéro
- [ ] Intégration Terminal SumUp
- [ ] Impression directe DNP

## Intégrations 3rd Party
- AWS Rekognition (reconnaissance faciale)
- Brevo/Sendinblue (SMS) ✅ Fonctionnel
- Stripe (paiements)
- PayPal (paiements)
- FFmpeg (traitement vidéo)
- react-pdf (affichage PDF)

## Notes Techniques
- MongoDB avec DB_NAME='test_database'
- SMTP via IONOS (smtp.ionos.fr)
- Déploiement manuel sur IONOS via SSH
- Backend: FastAPI + uvicorn
- Frontend: React + Tailwind

## Dernière mise à jour
3 Mars 2026
