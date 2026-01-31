#!/bin/bash

# ===========================================
# Script d'installation CREATIVINDUSTRY France
# Pour VPS Ubuntu 22.04 (IONOS ou autre)
# ===========================================

set -e

echo "=========================================="
echo "  CREATIVINDUSTRY France - Installation"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Demander le nom de domaine
read -p "Entrez votre nom de domaine (ex: creativindustry.fr): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Erreur: Le nom de domaine est requis${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[1/8] Mise à jour du système...${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${YELLOW}[2/8] Installation de Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo ""
echo -e "${YELLOW}[3/8] Installation de Python...${NC}"
apt install -y python3 python3-pip python3-venv

echo ""
echo -e "${YELLOW}[4/8] Installation de MongoDB...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

echo ""
echo -e "${YELLOW}[5/8] Installation de Nginx...${NC}"
apt install -y nginx certbot python3-certbot-nginx

echo ""
echo -e "${YELLOW}[6/8] Configuration du Backend...${NC}"
mkdir -p /var/www/creativindustry
cd /var/www/creativindustry

# Créer l'environnement Python
mkdir -p backend
cd backend
python3 -m venv venv
source venv/bin/activate

# Créer requirements.txt
cat > requirements.txt << 'REQUIREMENTS'
fastapi==0.110.1
uvicorn==0.25.0
python-dotenv>=1.0.1
pymongo==4.5.0
pydantic>=2.6.4
email-validator>=2.2.0
pyjwt>=2.10.1
bcrypt==4.1.3
motor==3.3.1
REQUIREMENTS

pip install -r requirements.txt

# Générer une clé secrète
JWT_SECRET=$(openssl rand -hex 32)

# Créer .env
cat > .env << ENVFILE
MONGO_URL=mongodb://localhost:27017
DB_NAME=creativindustry
JWT_SECRET=$JWT_SECRET
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN
ENVFILE

echo ""
echo -e "${GREEN}Backend configuré !${NC}"
echo -e "${YELLOW}IMPORTANT: Copiez votre fichier server.py dans /var/www/creativindustry/backend/${NC}"

echo ""
echo -e "${YELLOW}[7/8] Configuration de Nginx...${NC}"
cat > /etc/nginx/sites-available/creativindustry << NGINXCONF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        root /var/www/creativindustry/frontend/build;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXCONF

ln -sf /etc/nginx/sites-available/creativindustry /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo ""
echo -e "${YELLOW}[8/8] Configuration du service systemd...${NC}"
cat > /etc/systemd/system/creativindustry.service << 'SYSTEMD'
[Unit]
Description=CREATIVINDUSTRY Backend
After=network.target mongod.service

[Service]
User=root
WorkingDirectory=/var/www/creativindustry/backend
EnvironmentFile=/var/www/creativindustry/backend/.env
ExecStart=/var/www/creativindustry/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable creativindustry

echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  Installation terminée !${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo "Prochaines étapes :"
echo "1. Copiez server.py dans /var/www/creativindustry/backend/"
echo "2. Copiez le dossier frontend dans /var/www/creativindustry/"
echo "3. cd /var/www/creativindustry/frontend && npm install && npm run build"
echo "4. systemctl start creativindustry"
echo "5. certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "6. curl -X POST https://$DOMAIN/api/seed"
echo ""
echo -e "${YELLOW}N'oubliez pas de configurer le DNS chez IONOS !${NC}"
