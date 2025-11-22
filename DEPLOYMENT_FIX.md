# 🔧 GUIDE DE RÉSOLUTION - Erreur Cloud Functions CPU

## ❌ Erreur Rencontrée
```
Error: Cannot set CPU on the functions createEvent,updateEvent,approveEvent,deleteEvent
because they are GCF gen 1
```

## 🔍 Cause du Problème

Cette erreur se produit quand:
- Les fonctions Cloud existantes dans Firebase ont été configurées avec des paramètres **Gen 2** (comme CPU)
- Mais le code actuel utilise l'API **Gen 1** (firebase-functions v4)
- Firebase refuse de déployer car Gen 1 ne supporte pas les paramètres CPU

## ✅ SOLUTION 1: Supprimer et Redéployer (Recommandée)

### Étape 1: Supprimer les fonctions existantes

Ouvrez votre terminal et exécutez:

```bash
firebase functions:delete createEvent --force
firebase functions:delete updateEvent --force
firebase functions:delete approveEvent --force
firebase functions:delete deleteEvent --force
```

### Étape 2: Redéployer les fonctions

```bash
firebase deploy --only functions
```

---

## ✅ SOLUTION 2: Via Firebase Console

### Étape 1: Aller dans Firebase Console
1. Ouvrir https://console.firebase.google.com
2. Sélectionner votre projet **soirees-mons-6ce3e**
3. Aller dans **Build > Functions**

### Étape 2: Supprimer les fonctions manuellement
1. Sélectionner les fonctions: `createEvent`, `updateEvent`, `approveEvent`, `deleteEvent`
2. Cliquer sur les 3 points verticaux (⋮)
3. Cliquer sur "Delete function"
4. Confirmer la suppression

### Étape 3: Redéployer
```bash
firebase deploy --only functions
```

---

## ✅ SOLUTION 3: Déployer Firestore et Hosting d'abord

Si vous voulez éviter de supprimer les fonctions pour l'instant:

```bash
# Déployer seulement Firestore Rules
firebase deploy --only firestore:rules

# Déployer seulement le Hosting
firebase deploy --only hosting
```

Les fonctions resteront en erreur, mais le site web sera déployé.

---

## 📋 Commandes Utiles

### Lister toutes les fonctions
```bash
firebase functions:list
```

### Voir les logs des fonctions
```bash
firebase functions:log
```

### Déployer seulement une fonction spécifique
```bash
firebase deploy --only functions:createEvent
```

---

## 🎯 Pourquoi cela arrive?

Possiblement, lors d'un déploiement précédent ou dans la console Firebase, les fonctions ont été configurées avec:
- **CPU**: 2 GHz ou plus (paramètre Gen 2 uniquement)
- **Concurrency**: Paramètre Gen 2
- **Min/Max instances**: Avec options Gen 2

Le code actuel utilise Gen 1 qui ne supporte pas ces paramètres.

---

## 🚀 Après la Correction

Une fois les fonctions supprimées et redéployées, vous verrez:

```bash
✔ functions[createEvent(europe-west1)]: Successful create operation.
✔ functions[updateEvent(europe-west1)]: Successful create operation.
✔ functions[approveEvent(europe-west1)]: Successful create operation.
✔ functions[deleteEvent(europe-west1)]: Successful create operation.
```

---

## ⚠️ Note Importante

Les fonctions suivantes seront également déployées (triggers automatiques):
- `onUserCreated` - Notifie les nouveaux utilisateurs
- `onEventCreated` - Notifie les admins des événements en attente
- `onPresaleCreated` - Notifie les achats de préventes
- `healthCheck` - Endpoint de santé

Ces fonctions ne causent pas d'erreur car elles n'ont jamais été déployées avec des paramètres CPU.

---

## 📝 Commande Complète Recommandée

```bash
# 1. Supprimer les 4 fonctions problématiques
firebase functions:delete createEvent updateEvent approveEvent deleteEvent --force

# 2. Attendre 30 secondes que Firebase nettoie

# 3. Redéployer tout
firebase deploy

# 4. Vérifier le déploiement
firebase functions:list
```

---

**Exécutez la Solution 1 pour résoudre rapidement le problème! 🚀**
