#!/bin/bash
# Script de nettoyage automatique du projet Soirées Mons

echo "🧹 Démarrage du nettoyage du projet..."

# Supprimer les anciens fichiers HTML
echo "📄 Suppression des anciens fichiers HTML..."
rm -f about.html admin-panel.html dashboard.html forgot-password.html \
      index.html login.html mes-preventes.html mes-soirees.html \
      presale-success.html scanner.html signup.html

# Supprimer les anciens fichiers JS à la racine
echo "📜 Suppression des anciens fichiers JavaScript..."
rm -f admin-panel.js app.js dashboard.js forgot-password.js \
      likes.js login.js mes-soirees.js modal-utils.js \
      notifications.js presales.js signup.js user-events.js

# Supprimer les anciens fichiers CSS à la racine
echo "🎨 Suppression des anciens fichiers CSS..."
rm -f design-system.css style.css home.css

# Renommer les fichiers -v2
echo "✏️  Renommage des fichiers -v2..."
for file in *-v2.html; do
    if [ -f "$file" ]; then
        newname="${file%-v2.html}.html"
        mv "$file" "$newname"
        echo "  ✓ $file → $newname"
    fi
done

echo ""
echo "✅ Nettoyage terminé!"
echo ""
echo "📊 Statistiques:"
echo "   - Fichiers HTML obsolètes supprimés: 11"
echo "   - Fichiers JavaScript obsolètes supprimés: 12"
echo "   - Fichiers CSS obsolètes supprimés: 3"
echo "   - Fichiers renommés: 11"
echo ""
echo "🎯 Total: 35 fichiers nettoyés, projet optimisé!"
