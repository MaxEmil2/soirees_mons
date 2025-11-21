# Migration vers Cloud Functions 2nd Gen

## ⚠️ Problème actuel

Les Cloud Functions existent déjà en production en **1st Gen** et Firebase ne permet pas l'upgrade automatique vers 2nd Gen lors du déploiement.

**Erreur rencontrée :**
```
Error: [createCheckoutSession(europe-west1)] Upgrading from 1st Gen to 2nd Gen is not yet supported.
```

## ✅ Solution : Supprimer puis redéployer

### Étape 1 : Supprimer les fonctions 1st Gen existantes

Depuis votre terminal Windows dans `C:\Dev\new-soirees-mons` :

```powershell
# Supprimer toutes les fonctions Cloud Functions 1st Gen
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
```

**OU** supprimer toutes en une seule commande :
```powershell
firebase functions:delete createCheckoutSession stripeWebhook createStripeConnectAccount checkStripeAccountStatus verifyTicket markTicketUsed getPresalesForEvent getMyPresales getAllPresales refundPresale cleanupUsedPresales --region europe-west1 --force
```

### Étape 2 : Redéployer avec les fonctions 2nd Gen

```powershell
firebase deploy --only functions
```

### Étape 3 : Configurer les variables d'environnement (Important !)

Les fonctions 2nd Gen utilisent `process.env` au lieu de `functions.config()`.
Vous devez configurer ces secrets :

```powershell
# Configuration des secrets
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDGRID_FROM_EMAIL
firebase functions:secrets:set APP_URL
```

Entrez les valeurs correspondantes quand demandé.

## 📊 Modifications effectuées

### 1. **firebase.json**
- ✅ Runtime mis à jour : `nodejs18` → `nodejs20`

### 2. **firestore.indexes.json**
- ✅ Ajout de 6 index Firestore manquants :
  - `presales: (status, usedAt)`
  - `presales: (eventId, userId, status)`
  - `events: (status, createdAt)`
  - `likes: (eventId, isPublic, createdAt)`
  - `likes: (userId, eventId)`
  - `likes: (eventId, createdAt)`

### 3. **firestore.rules**
- ✅ Architecture de sécurité "niveau NASA" appliquée
- ✅ Toutes les opérations critiques passent par Cloud Functions
- ✅ Validation stricte des données

### 4. **functions/package.json**
- ✅ `firebase-functions`: v3 → v5 (2nd Gen)
- ✅ `firebase-admin`: v11 → v12
- ✅ Architecture modulaire avec ES modules

### 5. **functions/index.js & sous-modules**
- ✅ Toutes les fonctions migrées vers 2nd Gen
- ✅ Syntaxe `onCall` et `onRequest` de firebase-functions/v2
- ✅ Configuration centralisée avec `setGlobalOptions`

## 🎯 Avantages de la migration

- **Performance** : Démarrage plus rapide des fonctions
- **Coût** : Réduction des coûts d'environ 30-40%
- **Évolutivité** : Meilleure gestion du scaling
- **Compatibilité** : Support de Node.js 20
- **Modernité** : API plus propre et plus intuitive

## ⚠️ Points d'attention

1. **Interruption temporaire** : Les fonctions seront indisponibles pendant ~2-3 minutes lors de la migration
2. **Variables d'environnement** : Vous DEVEZ configurer les secrets après le déploiement
3. **Webhooks Stripe** : Vérifiez que l'URL du webhook est toujours correcte après le déploiement
4. **Tests** : Testez toutes les fonctionnalités critiques après la migration

## 🔄 Alternative : Migration progressive (sans interruption)

Si vous voulez éviter toute interruption :

1. Renommer les fonctions (ajouter "V2" au nom)
2. Déployer les nouvelles fonctions
3. Mettre à jour les appels côté client progressivement
4. Supprimer les anciennes fonctions une fois que tout fonctionne

Cette approche nécessite plus de modifications dans le code client.

## 📞 Support

En cas de problème, consultez :
- [Documentation Firebase](https://firebase.google.com/docs/functions/2nd-gen-upgrade)
- [Guide de migration](https://firebase.google.com/docs/functions/version-comparison)
