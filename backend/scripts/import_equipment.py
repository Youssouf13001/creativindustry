#!/usr/bin/env python3
"""
Script pour importer le matériel dans la base de données
Exécuter avec: python import_equipment.py
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

# Configuration - Modifier si nécessaire
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'creativindustry')

# Catégories à créer
CATEGORIES = [
    {"id": str(uuid.uuid4()), "name": "Caméras", "icon": "📷", "color": "#EF4444"},
    {"id": str(uuid.uuid4()), "name": "Objectifs", "icon": "🔭", "color": "#F59E0B"},
    {"id": str(uuid.uuid4()), "name": "Éclairage", "icon": "💡", "color": "#FCD34D"},
    {"id": str(uuid.uuid4()), "name": "Audio", "icon": "🎤", "color": "#10B981"},
    {"id": str(uuid.uuid4()), "name": "Trépieds/Supports", "icon": "📐", "color": "#3B82F6"},
    {"id": str(uuid.uuid4()), "name": "Accessoires", "icon": "🎒", "color": "#8B5CF6"},
    {"id": str(uuid.uuid4()), "name": "Informatique", "icon": "💻", "color": "#EC4899"},
    {"id": str(uuid.uuid4()), "name": "Autre", "icon": "📦", "color": "#6B7280"},
    {"id": str(uuid.uuid4()), "name": "Batteries", "icon": "🔋", "color": "#22C55E"},
    {"id": str(uuid.uuid4()), "name": "Stockage", "icon": "💾", "color": "#06B6D4"},
    {"id": str(uuid.uuid4()), "name": "Chargeurs", "icon": "🔌", "color": "#F97316"},
    {"id": str(uuid.uuid4()), "name": "Stabilisateurs", "icon": "🎬", "color": "#A855F7"},
]

# Matériel à importer (catégorie, nom, marque, modèle)
EQUIPMENT_LIST = [
    # CAMERAS
    ("Caméras", "BMPCC 6K", "Blackmagic", "Pocket Cinema Camera 6K"),
    ("Caméras", "CANON 5D MK4", "Canon", "EOS 5D Mark IV"),
    ("Caméras", "CANON 5D MK3", "Canon", "EOS 5D Mark III"),
    ("Caméras", "CANON 5D MK2", "Canon", "EOS 5D Mark II"),
    ("Caméras", "CAMERA OSMO+", "DJI", "Osmo+"),
    ("Caméras", "CAMERA PANASONIC AG-UX90", "Panasonic", "AG-UX90"),
    ("Caméras", "PANASONIC", "Panasonic", ""),
    ("Caméras", "BLACK MAGIC 6K PRO", "Blackmagic", "Pocket Cinema Camera 6K Pro"),
    ("Caméras", "CAMERA SONY PMW 200", "Sony", "PMW-200"),
    
    # BATTERIES
    ("Batteries", "Batterie Panasonic camera", "Panasonic", ""),
    ("Batteries", "BATTERIE LUMIERE", "Générique", ""),
    ("Batteries", "BATTERIE CAMERA SONY", "Sony", ""),
    ("Batteries", "BATTERIE V-MOUNT 98", "V-Mount", "98Wh"),
    ("Batteries", "PILE PANASONIC BLANC", "Panasonic", ""),
    ("Batteries", "PILE PANASONIC BK-3HCDE", "Panasonic", "BK-3HCDE"),
    ("Batteries", "GP RECYKO VERT", "GP", "ReCyko"),
    ("Batteries", "ENERGIZER", "Energizer", ""),
    
    # ECLAIRAGE
    ("Éclairage", "APUTURE AMARAN", "Aputure", "Amaran"),
    ("Éclairage", "ETUI LUMIERE", "Générique", ""),
    ("Éclairage", "PANNEAU LED RGB", "Générique", "LED RGB"),
    ("Éclairage", "YONGNUO", "Yongnuo", ""),
    
    # STOCKAGE
    ("Stockage", "CARTE MEMOIRE 64 NOIR", "SanDisk", "64GB"),
    ("Stockage", "CARTE MEMOIRE 64 BLANC", "SanDisk", "64GB"),
    ("Stockage", "CARTE MEMOIRE 64 NOIR & GRIS", "SanDisk", "64GB"),
    ("Stockage", "CARTE MEMOIRE 128 ROUGE", "SanDisk", "128GB"),
    ("Stockage", "CARTE MEMOIRE 128 NOIR", "SanDisk", "128GB"),
    ("Stockage", "CARTE MEMOIRE 128 ROUGE & GRIS", "SanDisk", "128GB"),
    ("Stockage", "CARTE MEMOIRE 32 ROUGE & GRIS", "SanDisk", "32GB"),
    ("Stockage", "CARTE MEMOIRE 16 ROUGE & GRIS", "SanDisk", "16GB"),
    ("Stockage", "COMPACTFLASH 64 NOIR & DORE", "SanDisk", "64GB CF"),
    ("Stockage", "EXTREME PRO 16", "SanDisk", "Extreme Pro 16GB"),
    ("Stockage", "CARTE MEMOIRE 32 NOIR & DORE", "SanDisk", "32GB"),
    ("Stockage", "SONY SXS-1 32", "Sony", "SxS-1 32GB"),
    ("Stockage", "SONY SXS-1 16", "Sony", "SxS-1 16GB"),
    ("Stockage", "SAMSUNG SSD T7", "Samsung", "T7"),
    ("Stockage", "SAMSUNG SSD T5", "Samsung", "T5"),
    
    # ACCESSOIRES
    ("Accessoires", "FOND STUDIO 2.72 X 11 M", "Générique", "2.72x11m"),
    ("Accessoires", "BLACK 7", "Générique", ""),
    ("Accessoires", "LEADPOWER GOBOX LP 800X", "Leadpower", "LP 800X"),
    ("Accessoires", "LECTEUR DE CARTE", "Générique", ""),
    ("Accessoires", "BG-5DIII POIGNIER 5D MK3", "Canon", "BG-E11"),
    ("Accessoires", "POIGNIER DE COMMANDE RONIN RS2", "DJI", "RS2"),
    ("Accessoires", "PORTE CARTE NOIR", "Générique", ""),
    ("Accessoires", "PORTE CARTE NOIR & ROUGE", "Générique", ""),
    ("Accessoires", "RECEPTEUR WIFI", "Générique", ""),
    ("Accessoires", "VIDAGE DE CARTE", "Générique", ""),
    
    # OBJECTIFS
    ("Objectifs", "OBJECTIF CANON 100MM", "Canon", "EF 100mm f/2.8"),
    
    # AUDIO
    ("Audio", "MICRO CRAVATE BOYA", "Boya", ""),
    ("Audio", "MINI MICRO POUR OSMO+", "DJI", ""),
    
    # CHARGEURS
    ("Chargeurs", "CHARGEUR CANON", "Canon", ""),
    ("Chargeurs", "CHARGEUR DE PILE", "Générique", ""),
    ("Chargeurs", "CHARGEUR PANASONIC", "Panasonic", ""),
    ("Chargeurs", "CHARGEUR DOUBLE SONY", "Sony", "Double"),
    ("Chargeurs", "CHARGEUR SONY", "Sony", ""),
    ("Chargeurs", "CHARGEUR OSMO", "DJI", ""),
    
    # STABILISATEURS
    ("Stabilisateurs", "GIMBAL STABILISEUR", "DJI", ""),
]


async def main():
    print(f"Connexion à MongoDB: {MONGO_URL}")
    print(f"Base de données: {DB_NAME}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Vérifier la connexion
    try:
        await client.admin.command('ping')
        print("✓ Connexion MongoDB réussie")
    except Exception as e:
        print(f"✗ Erreur de connexion: {e}")
        return
    
    # Créer les catégories si elles n'existent pas
    print("\n=== Création des catégories ===")
    existing_cats = await db.equipment_categories.find({}, {"_id": 0}).to_list(100)
    existing_names = {c["name"] for c in existing_cats}
    
    cat_map = {}
    for cat in CATEGORIES:
        if cat["name"] not in existing_names:
            await db.equipment_categories.insert_one(cat)
            print(f"  ✓ Catégorie créée: {cat['icon']} {cat['name']}")
            cat_map[cat["name"]] = cat["id"]
        else:
            # Récupérer l'ID existant
            existing = next((c for c in existing_cats if c["name"] == cat["name"]), None)
            if existing:
                cat_map[cat["name"]] = existing["id"]
            print(f"  - Catégorie existante: {cat['name']}")
    
    # Ajouter le matériel
    print("\n=== Import du matériel ===")
    added = 0
    skipped = 0
    
    for category_name, name, brand, model in EQUIPMENT_LIST:
        # Vérifier si l'équipement existe déjà
        existing = await db.equipment.find_one({"name": name})
        if existing:
            print(f"  - Déjà existant: {name}")
            skipped += 1
            continue
        
        equipment = {
            "id": str(uuid.uuid4()),
            "name": name,
            "brand": brand,
            "model": model,
            "serial_number": "",
            "category_id": cat_map.get(category_name, ""),
            "purchase_date": "",
            "purchase_price": None,
            "warranty_end_date": "",
            "condition": "bon",
            "is_available": True,
            "notes": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "import_script"
        }
        
        await db.equipment.insert_one(equipment)
        print(f"  ✓ Ajouté: {name} ({category_name})")
        added += 1
    
    print(f"\n=== Résumé ===")
    print(f"  Ajoutés: {added}")
    print(f"  Ignorés (déjà existants): {skipped}")
    
    # Afficher les stats
    total = await db.equipment.count_documents({})
    print(f"  Total équipements: {total}")
    
    client.close()
    print("\n✓ Import terminé!")


if __name__ == "__main__":
    asyncio.run(main())
