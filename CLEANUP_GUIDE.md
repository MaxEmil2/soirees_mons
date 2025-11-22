# 🧹 Guide de Nettoyage - Soirées Mons

## 📋 Tâches de Nettoyage Nécessaires

### ✅ COMPLÉTÉ

1. **Firestore Rules** - Fonctions inutilisées supprimées
   - ❌ `hasRole()` - Supprimée
   - ❌ `isOrganizerOrAdmin()` - Supprimée
   - ❌ `isScannerOrAdmin()` - Supprimée
   - ❌ `canManageEvent()` - Supprimée
   - ❌ `isNumberInRange()` - Supprimée
   - ❌ `isFutureTimestamp()` - Supprimée

---

## 🔥 À FAIRE MAINTENANT

### 1. Supprimer les 8 Vieilles Fonctions Cloud

Ces fonctions existent dans le cloud mais plus dans le code local:

```bash
firebase functions:delete createCheckoutSession --region europe-west1 --force
firebase functions:delete getEventPresales --region europe-west1 --force
firebase functions:delete getPaymentStatus --region europe-west1 --force
firebase functions:delete getUserPresales --region europe-west1 --force
firebase functions:delete getUserTickets --region europe-west1 --force
firebase functions:delete markTicketUsed --region europe-west1 --force
firebase functions:delete stripeWebhook --region europe-west1 --force
firebase functions:delete verifyTicket --region europe-west1 --force
```

**OU en une seule commande**:

```bash
firebase functions:delete createCheckoutSession getEventPresales getPaymentStatus getUserPresales getUserTickets markTicketUsed stripeWebhook verifyTicket --region europe-west1 --force
```

---

### 2. Supprimer le Vieil Index Obsolète

L'ancien index `(status ASCENDING, date ASCENDING)` doit être supprimé car il est remplacé par `(status ASCENDING, date DESCENDING)`.

**Option A - Via Firebase Console**:
1. Aller sur: https://console.firebase.google.com/project/soirees-mons-6ce3e/firestore/indexes
2. Chercher l'index `events` avec:
   - `status` ASCENDING
   - `date` ASCENDING
3. Cliquer sur "Delete"

**Option B - Redéployer avec suppression automatique**:

```bash
firebase deploy --only firestore:indexes
```

Quand Firebase demande:
```
Would you like to delete these indexes? [Y/n]
```

Répondre **Y** (YES) au lieu de **No**

---

### 3. Vérifier que les Nouveaux Index sont Construits

**Étape 1**: Aller dans la console Firebase:
https://console.firebase.google.com/project/soirees-mons-6ce3e/firestore/indexes

**Étape 2**: Vérifier que ces index sont en statut **"Enabled"** (vert):

| Collection | Champs | Statut Attendu |
|-----------|---------|----------------|
| events | status ASC, date DESC | 🟢 Enabled |
| events | status ASC, createdAt DESC | 🟢 Enabled |
| likes | eventId ASC, isPublic ASC, createdAt DESC | 🟢 Enabled |
| likes | userId ASC, eventId ASC | 🟢 Enabled |
| likes | eventId ASC, createdAt DESC | 🟢 Enabled |
| presales | eventId ASC, createdAt DESC | 🟢 Enabled |
| presales | userId ASC, createdAt DESC | 🟢 Enabled |
| presales | status ASC, usedAt ASC | 🟢 Enabled |
| presales | eventId ASC, userId ASC, status ASC | 🟢 Enabled |
| notifications | userId ASC, createdAt DESC | 🟢 Enabled |

**Attention**: Les index peuvent prendre **5-15 minutes** à se construire.

Pendant la construction, vous verrez:
- 🟡 **"Building"** - Index en cours de construction
- ⏳ **"Enabling"** - Finalisation

---

## 🚀 Ordre d'Exécution Recommandé

```bash
# 1. Commiter le nettoyage des Firestore Rules
git add firestore.rules
git commit -m "🧹 Clean: Suppression fonctions inutilisées dans firestore.rules"
git push

# 2. Supprimer les vieilles fonctions Cloud (UNE SEULE COMMANDE)
firebase functions:delete createCheckoutSession getEventPresales getPaymentStatus getUserPresales getUserTickets markTicketUsed stripeWebhook verifyTicket --region europe-west1 --force

# 3. Redéployer les index et accepter la suppression
firebase deploy --only firestore:indexes
# Répondre Y quand demandé

# 4. Attendre 5-15 minutes que les index se construisent

# 5. Vérifier dans la console Firebase
# https://console.firebase.google.com/project/soirees-mons-6ce3e/firestore/indexes

# 6. Une fois les index "Enabled", recharger l'application
# Ctrl+Shift+R (ou Cmd+Shift+R sur Mac)
```

---

## ⚠️ Notes Importantes

1. **Supprimer les fonctions Cloud** ne supprimera PAS vos données
2. **Les fonctions suivantes sont actives et DOIVENT RESTER**:
   - ✅ `createEvent(europe-west1)`
   - ✅ `updateEvent(europe-west1)`
   - ✅ `approveEvent(europe-west1)`
   - ✅ `deleteEvent(europe-west1)`
   - ✅ `onUserCreated(europe-west1)`
   - ✅ `onEventCreated(europe-west1)`
   - ✅ `onPresaleCreated(europe-west1)`
   - ✅ `healthCheck(europe-west1)`

3. **L'ancien index** sera automatiquement supprimé lors du prochain déploiement si vous répondez Y

4. **Les nouveaux index** doivent être complètement construits avant que l'application fonctionne

---

## ✅ Comment Vérifier que Tout Fonctionne

Une fois les index construits, l'application devrait:

1. ✅ Afficher les événements sans erreur
2. ✅ Ne plus afficher "The query requires an index"
3. ✅ Likes fonctionnent correctement
4. ✅ Notifications s'affichent
5. ✅ Aucun warning dans la console Firebase deploy

---

## 📞 En Cas de Problème

Si après 15 minutes les index sont toujours en "Building":

1. Vérifier dans la console Firebase si les index sont bloqués
2. Vider le cache du navigateur (Ctrl+Shift+Delete)
3. Redémarrer le navigateur
4. Si le problème persiste, créer les index manuellement via la console

---

**Dernière mise à jour**: 2025-11-22
