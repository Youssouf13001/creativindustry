# CREATIVINDUSTRY - PhotoFind & Booking Platform

## Description
Application complète pour photographe incluant :
- Borne photo "mode kiosque" (PhotoFind) avec reconnaissance faciale AWS
- Portail client avec galeries et sélection de photos
- Système de rendez-vous avec notifications SMS (Brevo)
- Paiements (Stripe, PayPal)
- Contrats électroniques avec signature
- Gestion de projets et suivi client
- Gestion de matériel (style GLPI) avec inventaire, déplacements, PDF, signatures, tickets pertes/vols et corbeille

## Test Credentials
- **Admin**: test@admin.com / admin123
- **Client test**: test-client@example.com / Test1234

## Fonctionnalités Matériel (Complet)

### Backend API Endpoints
- `GET/POST /api/equipment` - CRUD équipements avec quantités
- `DELETE /api/equipment/{id}` - Suppression douce (corbeille)
- `GET /api/equipment-trash` - Liste corbeille
- `POST /api/equipment-trash/{id}/restore` - Restaurer depuis corbeille
- `DELETE /api/equipment-trash/{id}` - Suppression définitive
- `GET/POST /api/equipment/categories` - Catégories
- `GET/POST/PUT/DELETE /api/deployments` - Déplacements avec quantités
- `POST /api/deployments/{id}/signature` - Signature digitale
- `GET /api/deployments/{id}/pdf` - Génération PDF checklist
- `GET/POST /api/loss-tickets` - Tickets pertes/vols/casses
- `PUT /api/loss-tickets/{id}` - Mise à jour statut ticket
- `POST /api/loss-tickets/{id}/remind` - Relance email
- `DELETE /api/loss-tickets/{id}` - Suppression ticket

### Ticket Workflow Statuts
- `pending` → En attente
- `ordering` → Commande lancée
- `delivering` → En cours de livraison
- `insurance` → Assurance prend le relais
- `replaced` → Matériel remplacé et inventorié (clôture)
- `reimbursed` → Remboursement de l'assurance (clôture)
- `obsolete` → Obsolète, pas de remplacement (clôture)

### Signature Workflow
1. Planifié → "Signer départ" obligatoire
2. Signé → "Démarrer" disponible
3. En cours → "Signer retour" disponible
4. Retour validé → Terminé

### Collections MongoDB
- `equipment` : inventaire actif
- `equipment_trash` : équipements supprimés (soft delete)
- `equipment_categories` : catégories
- `deployments` : déplacements avec items, signatures
- `equipment_reminders` : alertes
- `loss_tickets` : tickets pertes/vols avec historique messages

## Tâches

### Terminé
- [x] Gestion Matériel CRUD complet
- [x] Import bulk 57 équipements
- [x] Déploiements avec quantités
- [x] Signatures digitales (Canvas API)
- [x] Génération PDF checklists (ReportLab)
- [x] Mode offline PWA (Service Worker)
- [x] APScheduler rappels automatiques
- [x] Édition/Suppression déploiements
- [x] Tickets pertes/vols/casses (backend + frontend)
- [x] Workflow signature obligatoire (départ avant démarrage, retour en cours)
- [x] Workflow ticket complet (commande/livraison/assurance + clôture)
- [x] Corbeille équipement (soft delete, restaurer, supprimer définitivement)
- [x] Lien email ?tab=alertes pour redirection directe
- [x] Fix "None€" dans emails quand prix non renseigné
- [x] Fix permissions suppression (équipement + déploiement)

### P1 - Important
- [ ] Bug retour PayPal sur mobile kiosque (Safari/iOS)
- [ ] Refactoring EquipmentPage.js (extraction modales)
- [ ] Refactoring AdminDashboard.js (9500+ lignes)

### P2 - Backlog
- [ ] Enregistrement global Service Worker PWA
- [ ] Bug témoignages `[object Object]`
- [ ] Dashboard devis statistiques à zéro
- [ ] Intégration Terminal SumUp

## Instructions Déploiement IONOS
```bash
cd /var/www/creativindustry && git pull origin main && cd frontend && npm run build && cd .. && sudo systemctl restart creativindustry
```

## Dernière mise à jour
19 Avril 2026
