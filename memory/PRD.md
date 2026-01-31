# CREATIVINDUSTRY France - PRD

## Énoncé du Problème
Site vitrine pour photographe/vidéaste de mariage avec plateaux TV et studio podcast. Système de réservation avec prix modifiables via admin. Espace client pour télécharger fichiers. Chatbot IA.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec bcrypt (Admin + Client séparés)
- **IA**: OpenAI GPT-4o via Emergent Universal Key
- **Stockage**: Fichiers stockés sur le serveur IONOS

## Fonctionnalités Implémentées

### V1 - V5 (Précédemment implémentées)
- Site vitrine complet
- Devis mariage personnalisé
- Espace client avec téléchargements
- Chatbot IA
- Notifications email SMTP
- Gestion du contenu depuis l'admin
- Upload direct de fichiers

### V7 - Système de Réservation avec Acompte (31 Jan 2026)
- ✅ **Modification des formules depuis l'admin**
  - Édition du nom, description, prix, durée
  - Gestion des prestations incluses (ajouter/supprimer)
  - Ex: "6h de couverture", "300+ photos retouchées"
  
- ✅ **Onglet Paramètres dans l'admin**
  - Coordonnées bancaires modifiables (IBAN, BIC, titulaire)
  - Pourcentage d'acompte configurable (par défaut 30%)
  
- ✅ **Page de réservation améliorée**
  - Affichage du prix total et de l'acompte
  - Bouton "Valider et recevoir les instructions de paiement"
  - Étape de confirmation après validation
  
- ✅ **Emails automatiques**
  - Email client : Récapitulatif + coordonnées bancaires + référence de virement
  - Email admin : Notification de nouvelle réservation avec détails client

### Coordonnées bancaires par défaut
- IBAN: FR7628233000011130178183593
- BIC: REVOFRP2
- Titulaire: CREATIVINDUSTRY FRANCE

## URLs importantes
- Site : https://creativindustry.com
- Admin : /admin
- Espace Client : /client
- Réservation : /booking

## APIs Clés
- `/api/bank-details` - GET/PUT coordonnées bancaires
- `/api/bookings` - POST créer réservation avec acompte
- `/api/services` - CRUD services avec features
- `/api/upload/portfolio` - Upload fichiers portfolio
- `/api/upload/client/{id}` - Upload fichiers client

## Backlog
- P2: Calendrier des disponibilités
- P2: Système de confirmation automatique après virement

## Mise à jour du site IONOS
```bash
cd /var/www/creativindustry
git pull origin main
cd frontend && npm run build
cd ../backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart creativindustry
```
