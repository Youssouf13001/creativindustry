#!/bin/bash

#############################################
# CREATIVINDUSTRY - Script de Déploiement IONOS
# Usage: ./deploy.sh
#############################################

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - MODIFIEZ CES VALEURS SELON VOTRE SERVEUR
APP_DIR="/var/www/creativindustry"  # Chemin vers votre application
BACKEND_SERVICE="creativindustry-backend"  # Nom du service systemd backend
FRONTEND_SERVICE="creativindustry-frontend"  # Nom du service systemd frontend (si applicable)
BRANCH="main"  # Branche git à déployer

#############################################
# FONCTIONS
#############################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#############################################
# DÉBUT DU DÉPLOIEMENT
#############################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  CREATIVINDUSTRY - Déploiement IONOS  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

cd "$APP_DIR" || { log_error "Dossier $APP_DIR introuvable"; exit 1; }

# 1. SAUVEGARDE DES MODIFICATIONS LOCALES
log_info "Étape 1/7 - Sauvegarde des modifications locales..."
if [[ -n $(git status --porcelain) ]]; then
    git stash push -m "Auto-stash before deploy $(date +%Y%m%d_%H%M%S)"
    log_warning "Modifications locales sauvegardées dans git stash"
else
    log_success "Pas de modifications locales"
fi

# 2. RÉCUPÉRATION DU CODE
log_info "Étape 2/7 - Récupération du code depuis GitHub..."
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH
log_success "Code mis à jour depuis la branche $BRANCH"

# 3. MISE À JOUR DES DÉPENDANCES BACKEND
log_info "Étape 3/7 - Mise à jour des dépendances Python..."
cd "$APP_DIR/backend"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt --quiet
    log_success "Dépendances Python installées"
else
    log_warning "Pas de requirements.txt trouvé"
fi

# 4. MISE À JOUR DES DÉPENDANCES FRONTEND
log_info "Étape 4/7 - Mise à jour des dépendances Node.js..."
cd "$APP_DIR/frontend"
if [ -f "package.json" ]; then
    # Utiliser --legacy-peer-deps pour éviter les conflits
    npm install --legacy-peer-deps --silent 2>/dev/null || {
        log_warning "npm install a rencontré des warnings (non bloquant)"
    }
    log_success "Dépendances Node.js installées"
else
    log_warning "Pas de package.json trouvé"
fi

# 5. BUILD DU FRONTEND
log_info "Étape 5/7 - Compilation du frontend React..."
cd "$APP_DIR/frontend"
npm run build 2>&1 | tail -5
if [ -d "build" ]; then
    log_success "Frontend compilé avec succès"
else
    log_error "Échec de la compilation du frontend"
    exit 1
fi

# 6. REDÉMARRAGE DES SERVICES
log_info "Étape 6/7 - Redémarrage des services..."

# Redémarrer le backend
if systemctl is-active --quiet "$BACKEND_SERVICE" 2>/dev/null; then
    sudo systemctl restart "$BACKEND_SERVICE"
    log_success "Service backend redémarré"
elif systemctl list-units --type=service | grep -q "$BACKEND_SERVICE"; then
    sudo systemctl start "$BACKEND_SERVICE"
    log_success "Service backend démarré"
else
    log_warning "Service backend '$BACKEND_SERVICE' non trouvé - vérifiez le nom du service"
    log_info "Services disponibles:"
    systemctl list-units --type=service | grep -i creat || echo "Aucun service 'creat*' trouvé"
fi

# Redémarrer le frontend (si service séparé)
if systemctl is-active --quiet "$FRONTEND_SERVICE" 2>/dev/null; then
    sudo systemctl restart "$FRONTEND_SERVICE"
    log_success "Service frontend redémarré"
fi

# Attendre que les services démarrent
sleep 3

# 7. VÉRIFICATION
log_info "Étape 7/7 - Vérification du déploiement..."

# Vérifier le backend
BACKEND_STATUS=$(systemctl is-active "$BACKEND_SERVICE" 2>/dev/null || echo "unknown")
if [ "$BACKEND_STATUS" = "active" ]; then
    log_success "Backend: ✅ En cours d'exécution"
else
    log_error "Backend: ❌ Status: $BACKEND_STATUS"
    log_info "Consultez les logs avec: sudo journalctl -u $BACKEND_SERVICE -n 50"
fi

# Test de l'API
API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/ 2>/dev/null || echo "000")
if [ "$API_TEST" = "200" ] || [ "$API_TEST" = "404" ]; then
    log_success "API Backend: ✅ Répond (HTTP $API_TEST)"
else
    log_warning "API Backend: ⚠️ HTTP $API_TEST - Vérifiez les logs"
fi

#############################################
# RÉSUMÉ
#############################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  DÉPLOIEMENT TERMINÉ !                ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - VIDEZ LE CACHE DE VOTRE NAVIGATEUR :${NC}"
echo "   Chrome/Edge: Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)"
echo "   Firefox: Ctrl+F5"
echo "   Ou ouvrez en navigation privée pour tester"
echo ""
echo -e "${BLUE}📋 Commandes utiles :${NC}"
echo "   Logs backend:  sudo journalctl -u $BACKEND_SERVICE -f"
echo "   Status:        sudo systemctl status $BACKEND_SERVICE"
echo "   Redémarrer:    sudo systemctl restart $BACKEND_SERVICE"
echo ""

exit 0
