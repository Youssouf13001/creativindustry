# DNP Direct Print Service

Service d'impression silencieuse pour imprimantes DNP (DS620, DS820, RX1, etc.)

## Fonctionnalités

- ✅ Impression directe sans boîte de dialogue
- ✅ Impression par lot (plusieurs photos)
- ✅ Détection automatique de l'imprimante DNP
- ✅ Fallback vers impression navigateur si le service n'est pas disponible

## Installation sur le kiosque Windows

### Prérequis

1. **Python 3.8+** installé (https://www.python.org/downloads/)
2. **Pilotes DNP** installés pour votre imprimante
3. **Imprimante DNP** connectée en USB et configurée dans Windows

### Installation

1. Copiez le dossier `print_service` sur l'ordinateur du kiosque

2. Double-cliquez sur `install.bat` pour installer les dépendances :
   ```
   install.bat
   ```

3. Lancez le service :
   ```
   start_print_service.bat
   ```

### Installation manuelle

```bash
pip install flask flask-cors pillow requests pywin32
python dnp_print_service.py
```

## Utilisation

Une fois le service démarré, le kiosque PhotoFind détectera automatiquement le service et l'utilisera pour l'impression directe.

### Endpoints API

| Méthode | URL | Description |
|---------|-----|-------------|
| GET | http://localhost:5555/health | Vérifier si le service fonctionne |
| GET | http://localhost:5555/printers | Lister les imprimantes disponibles |
| POST | http://localhost:5555/print | Imprimer une photo |
| POST | http://localhost:5555/print-batch | Imprimer plusieurs photos |

### Exemple d'impression

```bash
curl -X POST http://localhost:5555/print \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/photo.jpg", "copies": 1}'
```

### Exemple d'impression par lot

```bash
curl -X POST http://localhost:5555/print-batch \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      {"url": "https://example.com/photo1.jpg", "copies": 1},
      {"url": "https://example.com/photo2.jpg", "copies": 2}
    ]
  }'
```

## Démarrage automatique avec Windows

Pour que le service démarre automatiquement au démarrage de Windows :

1. Appuyez sur `Win + R`, tapez `shell:startup` et appuyez sur Entrée
2. Créez un raccourci vers `start_print_service.bat` dans ce dossier

## Dépannage

### L'imprimante n'est pas détectée

1. Vérifiez que l'imprimante est allumée et connectée
2. Vérifiez que les pilotes DNP sont installés
3. Allez dans "Paramètres > Imprimantes" et vérifiez que l'imprimante apparaît

### Erreur d'impression

1. Vérifiez les logs dans la console du service
2. Testez l'impression depuis Windows (clic droit sur une image > Imprimer)
3. Vérifiez que l'imprimante a du papier et de l'encre

### Le service ne démarre pas

1. Vérifiez que Python est installé : `python --version`
2. Réinstallez les dépendances : `pip install flask flask-cors pillow requests pywin32`

## Configuration avancée

Vous pouvez modifier les paramètres dans `dnp_print_service.py` :

```python
PORT = 5555  # Port du service
DNP_PRINTER_NAME = "DNP DS820"  # Nom par défaut de l'imprimante
```
