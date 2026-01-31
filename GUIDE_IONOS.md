# Guide de Déploiement CREATIVINDUSTRY France sur VPS IONOS

## Prérequis
- VPS IONOS Linux Ubuntu 22.04 (minimum 2GB RAM)
- Nom de domaine configuré chez IONOS
- Accès SSH à votre VPS

---

## Étape 1 : Commander votre VPS IONOS

1. Allez sur [ionos.fr](https://www.ionos.fr/serveur/vps)
2. Choisissez **VPS Linux S** ou supérieur (à partir de ~4€/mois)
3. Sélectionnez **Ubuntu 22.04**
4. Notez l'adresse IP de votre serveur

---

## Étape 2 : Connectez-vous à votre VPS

```bash
ssh root@VOTRE_IP_IONOS
```

---

## Étape 3 : Installation automatique

Copiez et exécutez cette commande :

```bash
curl -fsSL https://raw.githubusercontent.com/VOTRE_USERNAME/creativindustry/main/deploy/install.sh | bash
```

OU faites l'installation manuelle ci-dessous.

---

## Étape 3 (Alternative) : Installation manuelle

### 3.1 Mettre à jour le système
```bash
apt update && apt upgrade -y
```

### 3.2 Installer les dépendances
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Python et pip
apt install -y python3 python3-pip python3-venv

# MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Nginx
apt install -y nginx

# Certbot pour HTTPS
apt install -y certbot python3-certbot-nginx
```

### 3.3 Créer l'utilisateur application
```bash
useradd -m -s /bin/bash creativindustry
```

### 3.4 Copier les fichiers
```bash
# Créer les dossiers
mkdir -p /var/www/creativindustry
cd /var/www/creativindustry

# Copier vos fichiers backend et frontend ici
# (via SFTP ou git clone)
```

### 3.5 Configurer le Backend
```bash
cd /var/www/creativindustry/backend

# Créer environnement virtuel
python3 -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=creativindustry
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=https://votre-domaine.fr
EOF
```

### 3.6 Configurer le Frontend
```bash
cd /var/www/creativindustry/frontend

# Installer les dépendances
npm install

# Créer le fichier .env
cat > .env << EOF
REACT_APP_BACKEND_URL=https://votre-domaine.fr
EOF

# Compiler pour la production
npm run build
```

### 3.7 Configurer Nginx
```bash
cat > /etc/nginx/sites-available/creativindustry << 'EOF'
server {
    listen 80;
    server_name votre-domaine.fr www.votre-domaine.fr;

    # Frontend React
    location / {
        root /var/www/creativindustry/frontend/build;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/creativindustry /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 3.8 Configurer le service Backend (systemd)
```bash
cat > /etc/systemd/system/creativindustry.service << 'EOF'
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
EOF

systemctl daemon-reload
systemctl start creativindustry
systemctl enable creativindustry
```

### 3.9 Configurer HTTPS avec Let's Encrypt
```bash
certbot --nginx -d votre-domaine.fr -d www.votre-domaine.fr
```

---

## Étape 4 : Configurer le DNS chez IONOS

1. Connectez-vous à votre espace IONOS
2. Allez dans **Domaines & SSL** → Votre domaine → **DNS**
3. Ajoutez/Modifiez ces enregistrements :

| Type | Nom | Valeur |
|------|-----|--------|
| A | @ | VOTRE_IP_VPS |
| A | www | VOTRE_IP_VPS |

---

## Étape 5 : Initialiser les données

```bash
curl -X POST https://votre-domaine.fr/api/seed
```

---

## Commandes utiles

```bash
# Voir les logs du backend
journalctl -u creativindustry -f

# Redémarrer le backend
systemctl restart creativindustry

# Redémarrer Nginx
systemctl restart nginx

# Voir le statut de MongoDB
systemctl status mongod
```

---

## Support

En cas de problème, vérifiez :
1. `systemctl status creativindustry` - Le backend tourne ?
2. `systemctl status nginx` - Nginx tourne ?
3. `systemctl status mongod` - MongoDB tourne ?
4. Les logs : `journalctl -u creativindustry -n 50`
