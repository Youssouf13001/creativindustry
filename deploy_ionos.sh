#!/bin/bash
# ===========================================
# Script de déploiement - CREATIVINDUSTRY
# Mise à jour: Système de Contrats Électroniques
# ===========================================

set -e  # Arrêter en cas d'erreur

echo "=========================================="
echo "  CREATIVINDUSTRY - Déploiement"
echo "  $(date)"
echo "=========================================="

# Configuration - ADAPTEZ CES CHEMINS SI NÉCESSAIRE
APP_DIR="/var/www/creativindustry"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}[1/7] Arrêt des services...${NC}"
sudo systemctl stop creativindustry-backend || true
sleep 2

echo -e "${YELLOW}[2/7] Récupération du code...${NC}"
cd $APP_DIR
git stash || true
git pull origin main
git stash pop || true

echo -e "${YELLOW}[3/7] Création du dossier pour les contrats PDF...${NC}"
mkdir -p $BACKEND_DIR/uploads/contracts
chmod 755 $BACKEND_DIR/uploads/contracts

echo -e "${YELLOW}[4/7] Installation des dépendances backend...${NC}"
cd $BACKEND_DIR
source venv/bin/activate || source .venv/bin/activate
pip install -r requirements.txt --quiet

echo -e "${YELLOW}[5/7] Build du frontend...${NC}"
cd $FRONTEND_DIR
npm install --legacy-peer-deps
npm run build

echo -e "${YELLOW}[6/7] Configuration Nginx pour servir les PDF...${NC}"
# Vérifier si la config pour les contrats existe déjà
NGINX_CONF="/etc/nginx/sites-available/creativindustry"
if ! grep -q "uploads/contracts" $NGINX_CONF 2>/dev/null; then
    echo -e "${YELLOW}Ajout de la configuration pour les PDF de contrats...${NC}"
    
    # Créer un fichier temporaire avec la nouvelle location
    cat > /tmp/nginx_contracts_location.txt << 'NGINX_BLOCK'
    
    # Servir les PDF de contrats
    location /uploads/contracts/ {
        alias /var/www/creativindustry/backend/uploads/contracts/;
        types {
            application/pdf pdf;
        }
        add_header Content-Type application/pdf;
        add_header X-Content-Type-Options nosniff;
    }
NGINX_BLOCK
    
    echo -e "${YELLOW}Veuillez ajouter manuellement cette configuration à Nginx :${NC}"
    cat /tmp/nginx_contracts_location.txt
    echo ""
    echo -e "${YELLOW}Commande: sudo nano $NGINX_CONF${NC}"
    echo -e "${YELLOW}Puis: sudo nginx -t && sudo systemctl reload nginx${NC}"
fi

echo -e "${YELLOW}[7/7] Redémarrage des services...${NC}"
sudo systemctl start creativindustry-backend
sudo systemctl reload nginx || true
sleep 3

# Vérification
echo ""
echo -e "${GREEN}=========================================="
echo "  Vérification du déploiement"
echo "==========================================${NC}"

# Test du backend
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend: OK${NC}"
else
    echo -e "${RED}✗ Backend: ERREUR${NC}"
    echo "Vérifiez les logs: sudo journalctl -u creativindustry-backend -n 50"
fi

# Test des contrats API
if curl -s http://localhost:8001/api/contracts/templates > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API Contrats: OK${NC}"
else
    echo -e "${YELLOW}⚠ API Contrats: Non testable (authentification requise)${NC}"
fi

# Vérifier le dossier uploads
if [ -d "$BACKEND_DIR/uploads/contracts" ]; then
    echo -e "${GREEN}✓ Dossier uploads/contracts: OK${NC}"
else
    echo -e "${RED}✗ Dossier uploads/contracts: MANQUANT${NC}"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  Déploiement terminé !"
echo "==========================================${NC}"
echo ""
echo "Prochaines étapes:"
echo "1. Vérifiez la configuration Nginx pour les PDF"
echo "2. Testez l'onglet Contrats dans l'admin"
echo "3. Uploadez un vrai PDF de contrat"
echo ""
