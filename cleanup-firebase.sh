#!/bin/bash

###############################################################################
# SOIRÉES MONS - FIREBASE CLEANUP SCRIPT
# Script automatique pour nettoyer les anciennes fonctions Cloud
###############################################################################

echo "🧹 =========================================="
echo "   SOIRÉES MONS - Firebase Cleanup"
echo "=========================================="
echo ""

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Liste des fonctions à supprimer
FUNCTIONS_TO_DELETE=(
    "createCheckoutSession"
    "getEventPresales"
    "getPaymentStatus"
    "getUserPresales"
    "getUserTickets"
    "markTicketUsed"
    "stripeWebhook"
    "verifyTicket"
)

REGION="europe-west1"

echo -e "${YELLOW}⚠️  ATTENTION${NC}"
echo "Ce script va supprimer les 8 vieilles fonctions Cloud suivantes:"
echo ""

for func in "${FUNCTIONS_TO_DELETE[@]}"; do
    echo -e "  ${RED}❌${NC} $func($REGION)"
done

echo ""
echo -e "${BLUE}ℹ️  Les fonctions suivantes RESTERONT intactes:${NC}"
echo -e "  ${GREEN}✅${NC} createEvent($REGION)"
echo -e "  ${GREEN}✅${NC} updateEvent($REGION)"
echo -e "  ${GREEN}✅${NC} approveEvent($REGION)"
echo -e "  ${GREEN}✅${NC} deleteEvent($REGION)"
echo -e "  ${GREEN}✅${NC} onUserCreated($REGION)"
echo -e "  ${GREEN}✅${NC} onEventCreated($REGION)"
echo -e "  ${GREEN}✅${NC} onPresaleCreated($REGION)"
echo -e "  ${GREEN}✅${NC} healthCheck($REGION)"
echo ""

# Demander confirmation
read -p "Voulez-vous continuer? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${YELLOW}❌ Opération annulée.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Suppression des fonctions Cloud...${NC}"
echo ""

# Compteur de succès/échecs
SUCCESS_COUNT=0
FAIL_COUNT=0

# Supprimer chaque fonction
for func in "${FUNCTIONS_TO_DELETE[@]}"; do
    echo -ne "  Suppression de ${YELLOW}$func${NC}... "

    # Supprimer la fonction (rediriger stderr pour capturer les erreurs)
    if firebase functions:delete "$func" --region "$REGION" --force &>/dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
        ((SUCCESS_COUNT++))
    else
        echo -e "${RED}❌ ÉCHEC${NC}"
        ((FAIL_COUNT++))
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"

# Résumé
if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ Toutes les fonctions ont été supprimées avec succès!${NC}"
    echo -e "   ${SUCCESS_COUNT} fonctions supprimées"
else
    echo -e "${YELLOW}⚠️  Nettoyage terminé avec avertissements:${NC}"
    echo -e "   ${GREEN}${SUCCESS_COUNT} fonctions supprimées${NC}"
    echo -e "   ${RED}${FAIL_COUNT} échecs${NC}"
    echo ""
    echo -e "${BLUE}Note:${NC} Les échecs peuvent être normaux si certaines fonctions"
    echo "      n'existaient déjà plus dans le cloud."
fi

echo ""
echo -e "${BLUE}📋 Prochaines étapes:${NC}"
echo ""
echo "1. Redéployer les index Firestore:"
echo "   ${YELLOW}firebase deploy --only firestore:indexes${NC}"
echo "   (Répondez Y pour supprimer l'ancien index)"
echo ""
echo "2. Vérifier la construction des index:"
echo "   ${YELLOW}https://console.firebase.google.com/project/soirees-mons-6ce3e/firestore/indexes${NC}"
echo ""
echo "3. Attendre 5-15 minutes que les index se construisent"
echo ""
echo "4. Recharger l'application (Ctrl+Shift+R)"
echo ""
echo -e "${GREEN}✅ Script terminé!${NC}"
echo ""
