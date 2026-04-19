# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind)
- Portail client avec galeries
- Système de rendez-vous avec SMS
- Paiements (Stripe, PayPal)
- Gestion de matériel (GLPI) avec inventaire, déplacements, PDF, signatures, tickets, corbeille
- **NOUVEAU** : Plateforme vidéo VIP (Netflix-style) pour clients à l'étranger
- **NOUVEAU** : Envoi PDF checklist par email

## Routes principales
- `/admin/dashboard` — Dashboard admin
- `/admin/equipment` — Gestion matériel
- `/admin/vip-videos` — Gestion vidéos VIP (admin)
- `/vip` — Espace client VIP (Netflix-style)

## Fonctionnalités VIP Vidéo
- Upload chunké (5MB chunks, jusqu'à 50Go)
- Streaming vidéo avec HTTP Range support (seeking)
- Miniatures auto via ffmpeg
- Gestion clients VIP (créer compte, activer/désactiver)
- Interface Netflix : login, catégories, lecteur intégré

## Backend API
### Matériel
- CRUD équipements + corbeille (soft delete)
- Déploiements avec quantités, signatures, PDF
- Tickets pertes/vols (workflow complet)
- Envoi PDF par email

### VIP Vidéo
- `POST/GET /api/vip/clients` — Gestion clients VIP
- `POST /api/vip/login` — Auth client VIP (bcrypt + JWT)
- `POST /api/vip/videos/upload-chunk` — Upload chunké
- `GET /api/vip/stream/{id}` — Streaming avec Range
- `GET /api/vip/my-videos` — Vidéos du client connecté

## Tâches terminées
- [x] Gestion Matériel complète
- [x] Tickets pertes/vols avec workflow complet
- [x] Corbeille équipement
- [x] Workflow signature (départ/retour)
- [x] Envoi PDF par email
- [x] Plateforme vidéo VIP (backend + admin + client Netflix)

## P1 - Important
- [ ] Bug retour PayPal mobile (Safari/iOS)
- [ ] Refactoring EquipmentPage.js
- [ ] Refactoring AdminDashboard.js

## P2 - Backlog
- [ ] Service Worker PWA
- [ ] Bug témoignages `[object Object]`
- [ ] Stats devis à zéro
- [ ] Terminal SumUp

## Déploiement IONOS
```bash
cd /var/www/creativindustry && git pull origin main && cd frontend && npm run build && cd .. && sudo systemctl restart creativindustry
```

## Dernière mise à jour
19 Avril 2026
