#!/usr/bin/env python3
"""
DNP Direct Print Service - Service d'impression silencieuse pour imprimante DNP
À exécuter sur l'ordinateur du kiosque Windows

Installation:
1. pip install flask flask-cors pillow requests pywin32
2. python dnp_print_service.py

Ce service écoute sur le port 5555 et imprime directement sur l'imprimante DNP
sans afficher de boîte de dialogue.
"""

import os
import sys
import tempfile
import time
import subprocess
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from PIL import Image
import logging

# Configuration
PORT = 5555
DNP_PRINTER_NAME = "DNP DS820"  # Nom de l'imprimante dans Windows

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_printer_name():
    """Trouve le nom exact de l'imprimante DNP installée"""
    try:
        import win32print
        printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
        for printer in printers:
            name = printer[2]
            if "DNP" in name.upper() or "DS820" in name.upper() or "DS-820" in name.upper():
                logger.info(f"Imprimante DNP trouvée: {name}")
                return name
        # Si pas trouvé, retourner le nom par défaut
        logger.warning(f"Imprimante DNP non trouvée, utilisation du nom par défaut: {DNP_PRINTER_NAME}")
        return DNP_PRINTER_NAME
    except Exception as e:
        logger.error(f"Erreur lors de la recherche de l'imprimante: {e}")
        return DNP_PRINTER_NAME

def print_image_windows(image_path, printer_name, copies=1):
    """Imprime une image sur Windows en utilisant l'API Windows"""
    try:
        import win32print
        import win32ui
        from PIL import Image, ImageWin
        
        # Ouvrir l'image
        img = Image.open(image_path)
        
        # Obtenir le handle de l'imprimante
        hprinter = win32print.OpenPrinter(printer_name)
        
        try:
            # Créer un device context pour l'imprimante
            hdc = win32ui.CreateDC()
            hdc.CreatePrinterDC(printer_name)
            
            # Obtenir les dimensions de la page
            page_width = hdc.GetDeviceCaps(110)  # PHYSICALWIDTH
            page_height = hdc.GetDeviceCaps(111)  # PHYSICALHEIGHT
            
            # Calculer le ratio pour ajuster l'image
            img_width, img_height = img.size
            ratio = min(page_width / img_width, page_height / img_height)
            
            new_width = int(img_width * ratio)
            new_height = int(img_height * ratio)
            
            # Centrer l'image
            x_offset = (page_width - new_width) // 2
            y_offset = (page_height - new_height) // 2
            
            for _ in range(copies):
                hdc.StartDoc("PhotoFind Print")
                hdc.StartPage()
                
                # Convertir l'image pour Windows
                dib = ImageWin.Dib(img)
                dib.draw(hdc.GetHandleOutput(), (x_offset, y_offset, x_offset + new_width, y_offset + new_height))
                
                hdc.EndPage()
                hdc.EndDoc()
            
            hdc.DeleteDC()
            return True
            
        finally:
            win32print.ClosePrinter(hprinter)
            
    except Exception as e:
        logger.error(f"Erreur d'impression Windows: {e}")
        # Fallback: utiliser la commande système
        return print_image_fallback(image_path, printer_name, copies)

def print_image_fallback(image_path, printer_name, copies=1):
    """Méthode de fallback utilisant mspaint ou autre"""
    try:
        for _ in range(copies):
            # Utiliser rundll32 pour impression silencieuse
            cmd = f'rundll32.exe C:\\Windows\\System32\\shimgvw.dll,ImageView_PrintTo /pt "{image_path}" "{printer_name}"'
            subprocess.run(cmd, shell=True, check=True)
            time.sleep(1)  # Petit délai entre les copies
        return True
    except Exception as e:
        logger.error(f"Erreur d'impression fallback: {e}")
        return False

def download_image(url):
    """Télécharge une image depuis une URL"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return BytesIO(response.content)
    except Exception as e:
        logger.error(f"Erreur de téléchargement: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Endpoint de santé pour vérifier si le service est actif"""
    printer_name = get_printer_name()
    return jsonify({
        "status": "ok",
        "service": "DNP Print Service",
        "printer": printer_name,
        "port": PORT
    })

@app.route('/printers', methods=['GET'])
def list_printers():
    """Liste les imprimantes disponibles"""
    try:
        import win32print
        printers = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
        printer_list = [{"name": p[2], "description": p[1]} for p in printers]
        return jsonify({"printers": printer_list})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/print', methods=['POST'])
def print_photo():
    """
    Imprime une photo directement sur l'imprimante DNP
    
    Body JSON:
    {
        "image_url": "https://...",  // URL de l'image à imprimer
        "copies": 1,                 // Nombre de copies (optionnel, défaut: 1)
        "printer": "DNP DS820"       // Nom de l'imprimante (optionnel)
    }
    
    Ou multipart/form-data avec:
    - file: fichier image
    - copies: nombre de copies
    """
    try:
        printer_name = request.json.get('printer') if request.is_json else request.form.get('printer')
        if not printer_name:
            printer_name = get_printer_name()
        
        copies = 1
        temp_file = None
        
        if request.is_json:
            # Image depuis URL
            data = request.json
            image_url = data.get('image_url')
            copies = data.get('copies', 1)
            
            if not image_url:
                return jsonify({"error": "image_url requis"}), 400
            
            logger.info(f"Téléchargement de l'image: {image_url}")
            image_data = download_image(image_url)
            if not image_data:
                return jsonify({"error": "Impossible de télécharger l'image"}), 400
            
            # Sauvegarder temporairement
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            img = Image.open(image_data)
            img.save(temp_file.name, 'JPEG', quality=95)
            image_path = temp_file.name
            
        else:
            # Image uploadée
            if 'file' not in request.files:
                return jsonify({"error": "Fichier requis"}), 400
            
            file = request.files['file']
            copies = int(request.form.get('copies', 1))
            
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            file.save(temp_file.name)
            image_path = temp_file.name
        
        logger.info(f"Impression de {image_path} sur {printer_name} ({copies} copie(s))")
        
        # Imprimer
        success = print_image_windows(image_path, printer_name, copies)
        
        # Nettoyer le fichier temporaire
        if temp_file:
            try:
                os.unlink(temp_file.name)
            except:
                pass
        
        if success:
            return jsonify({
                "success": True,
                "message": f"Impression envoyée ({copies} copie(s))",
                "printer": printer_name
            })
        else:
            return jsonify({"error": "Échec de l'impression"}), 500
            
    except Exception as e:
        logger.error(f"Erreur: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/print-batch', methods=['POST'])
def print_batch():
    """
    Imprime plusieurs photos en batch
    
    Body JSON:
    {
        "images": [
            {"url": "https://...", "copies": 1},
            {"url": "https://...", "copies": 2}
        ],
        "printer": "DNP DS820"  // optionnel
    }
    """
    try:
        data = request.json
        images = data.get('images', [])
        printer_name = data.get('printer') or get_printer_name()
        
        if not images:
            return jsonify({"error": "Liste d'images vide"}), 400
        
        results = []
        for i, img_data in enumerate(images):
            url = img_data.get('url')
            copies = img_data.get('copies', 1)
            
            logger.info(f"Impression {i+1}/{len(images)}: {url}")
            
            image_data = download_image(url)
            if not image_data:
                results.append({"url": url, "success": False, "error": "Téléchargement échoué"})
                continue
            
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            img = Image.open(image_data)
            img.save(temp_file.name, 'JPEG', quality=95)
            
            success = print_image_windows(temp_file.name, printer_name, copies)
            
            try:
                os.unlink(temp_file.name)
            except:
                pass
            
            results.append({"url": url, "success": success, "copies": copies})
            
            # Petit délai entre les impressions
            time.sleep(0.5)
        
        successful = sum(1 for r in results if r.get('success'))
        return jsonify({
            "success": True,
            "total": len(images),
            "printed": successful,
            "results": results
        })
        
    except Exception as e:
        logger.error(f"Erreur batch: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print("DNP Direct Print Service")
    print("=" * 60)
    print(f"Service démarré sur http://localhost:{PORT}")
    print(f"Imprimante: {get_printer_name()}")
    print("")
    print("Endpoints:")
    print(f"  GET  http://localhost:{PORT}/health   - Vérifier le service")
    print(f"  GET  http://localhost:{PORT}/printers - Lister les imprimantes")
    print(f"  POST http://localhost:{PORT}/print    - Imprimer une photo")
    print(f"  POST http://localhost:{PORT}/print-batch - Imprimer plusieurs photos")
    print("=" * 60)
    
    app.run(host='127.0.0.1', port=PORT, debug=False)
