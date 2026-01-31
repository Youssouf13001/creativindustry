# CREATIVINDUSTRY France - PRD

## Énoncé du Problème
Site vitrine pour photographe/vidéaste de mariage avec plateaux TV et studio podcast. Système de réservation avec prix modifiables via admin.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Auth**: JWT avec bcrypt

## Fonctionnalités Implémentées (31 Jan 2026)

### Site Vitrine
- Page d'accueil avec hero cinématique
- 3 pages services (Mariage, Podcast, Plateau TV)
- Page contact avec formulaire
- Design "Dark Luxury" avec accents dorés

### Système de Réservation
- Sélection service → Date → Coordonnées
- 9 services avec tarification (seed data)
- Réservations stockées en base

### Espace Admin
- Inscription/Connexion par mot de passe
- Dashboard avec statistiques
- Gestion des réservations (statut)
- Modification des prix des services
- Visualisation des messages contact

## Tarifs de Base
### Mariages
- Essentielle: 1500€
- Complète: 2800€
- Premium: 4500€

### Podcast
- 1h: 150€
- Demi-journée: 400€
- Journée: 700€

### Plateau TV
- Standard: 800€
- Équipé: 1500€
- Production Complète: 3500€

## Backlog
- P1: Intégration calendrier disponibilités
- P1: Email de confirmation automatique
- P2: Galerie portfolio avec lightbox
- P2: Témoignages clients
- P3: Paiement en ligne (Stripe)

## Personas
1. **Couple** - Recherche photographe mariage
2. **Créateur** - Location studio podcast
3. **Entreprise** - Production TV/Corporate
4. **Admin** - Gestion site et réservations
