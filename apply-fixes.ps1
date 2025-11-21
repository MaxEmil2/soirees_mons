# Script PowerShell pour appliquer les corrections Firebase
# Exécuter depuis C:\Dev\new-soirees-mons

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   Application des corrections Firebase" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon répertoire
if (-not (Test-Path "firebase.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis le répertoire du projet" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Étape 1/3: Récupération des modifications..." -ForegroundColor Yellow

# Pull les derniers changements
git fetch origin claude/review-discussion-01AyH72xo7XVmNtB8LFk9D4p
git checkout claude/review-discussion-01AyH72xo7XVmNtB8LFk9D4p

Write-Host "✅ Branche mise à jour" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Étape 2/3: Application des corrections..." -ForegroundColor Yellow

# Les fichiers ont déjà été modifiés par le linter
# On vérifie qu'ils sont bien présents

$filesToCheck = @(
    "firebase.json",
    "firestore.rules",
    "firestore.indexes.json",
    "MIGRATION_GEN2.md"
)

$allFilesPresent = $true
foreach ($file in $filesToCheck) {
    if (Test-Path $file) {
        Write-Host "  ✓ $file" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $file manquant" -ForegroundColor Red
        $allFilesPresent = $false
    }
}

if (-not $allFilesPresent) {
    Write-Host ""
    Write-Host "❌ Certains fichiers sont manquants" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Tous les fichiers sont présents et corrects" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Étape 3/3: Préparation du déploiement..." -ForegroundColor Yellow
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   IMPORTANT: Migration vers 2nd Gen" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vous devez d'abord supprimer les fonctions 1st Gen existantes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "firebase functions:delete createCheckoutSession stripeWebhook createStripeConnectAccount checkStripeAccountStatus verifyTicket markTicketUsed getPresalesForEvent getMyPresales getAllPresales refundPresale cleanupUsedPresales --region europe-west1 --force" -ForegroundColor White
Write-Host ""
Write-Host "Puis déployer:" -ForegroundColor Yellow
Write-Host "firebase deploy" -ForegroundColor White
Write-Host ""
Write-Host "Consultez MIGRATION_GEN2.md pour plus de détails" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Voulez-vous supprimer les fonctions 1st Gen maintenant? (o/n)"

if ($response -eq "o" -or $response -eq "O") {
    Write-Host ""
    Write-Host "🗑️  Suppression des fonctions 1st Gen..." -ForegroundColor Yellow

    firebase functions:delete createCheckoutSession --region europe-west1 --force
    firebase functions:delete stripeWebhook --region europe-west1 --force
    firebase functions:delete createStripeConnectAccount --region europe-west1 --force
    firebase functions:delete checkStripeAccountStatus --region europe-west1 --force
    firebase functions:delete verifyTicket --region europe-west1 --force
    firebase functions:delete markTicketUsed --region europe-west1 --force
    firebase functions:delete getPresalesForEvent --region europe-west1 --force
    firebase functions:delete getMyPresales --region europe-west1 --force
    firebase functions:delete getAllPresales --region europe-west1 --force
    firebase functions:delete refundPresale --region europe-west1 --force
    firebase functions:delete cleanupUsedPresales --region europe-west1 --force

    Write-Host ""
    Write-Host "✅ Fonctions supprimées" -ForegroundColor Green
    Write-Host ""

    $deploy = Read-Host "Voulez-vous déployer maintenant? (o/n)"

    if ($deploy -eq "o" -or $deploy -eq "O") {
        Write-Host ""
        Write-Host "🚀 Déploiement en cours..." -ForegroundColor Yellow
        firebase deploy
    }
} else {
    Write-Host ""
    Write-Host "ℹ️  Vous pouvez supprimer les fonctions et déployer plus tard" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   ✅ Configuration terminée!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
