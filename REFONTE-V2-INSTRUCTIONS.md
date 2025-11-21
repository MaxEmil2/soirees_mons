# 🚀 SOIRÉES MONS - REFONTE V2
## Architecture Ultra Professionnelle & Sécurisée

---

## 📋 CE QUI A ÉTÉ CRÉÉ

### ✅ Phase 1 : Architecture & Fondations (TERMINÉE)

#### 1. Design System V2 Professionnel (`css/design-system-v2.css`)
- Design moderne niveau Apple/Stripe/Startup Tech
- Variables CSS (design tokens) pour cohérence
- Composants réutilisables (boutons, cards, inputs, modals)
- Animations fluides et transitions propres
- Responsive 100% parfait
- Thème sombre élégant

#### 2. Firestore Rules Niveau NASA (`firestore-v2.rules`)
- Système de rôles : `user`, `organizer`, `scanner`, `admin`
- Protection complète de toutes les collections
- Validation stricte des données
- Audit trail (scanLogs)
- Blocage par défaut

#### 3. Cloud Functions Sécurisées (`functions/index-v2.js`)
- `createEvent` : Création d'événements avec validation
- `approveEvent` / `rejectEvent` : Workflow admin
- `scanPresale` : Scan QR sécurisé
- `addScanner` : Gestion des scanners
- `stripeWebhook` : Traitement paiements
- `cleanupOldPresales` : Nettoyage auto 24h

#### 4. Modules Utilitaires JS
- `js/auth-utils.js` : Gestion auth & rôles
- `js/firebase-utils.js` : Utilitaires Firebase optimisés

---

## 🔐 SYSTÈME DE RÔLES

### Rôles disponibles :

| Rôle | Permissions |
|------|-------------|
| **user** | Acheter des préventes, liker des événements, voir son dashboard |
| **organizer** | Créer des événements, gérer ses événements, ajouter des scanners |
| **scanner** | Scanner les QR codes des préventes pour les événements assignés |
| **admin** | Accès complet : valider/refuser événements, voir toutes les stats, gérer tous les utilisateurs |

### Attribution des rôles :
- **user** : Attribué automatiquement à l'inscription
- **scanner** : Attribué automatiquement quand un organisateur ajoute quelqu'un comme scanner
- **organizer** : Doit être attribué manuellement par un admin via Firestore
- **admin** : Doit être attribué manuellement via Firestore

---

## 🚀 DÉPLOIEMENT

### Étape 1 : Déployer les Firestore Rules

**Option A : Firebase Console (Recommandé)**
1. Aller sur https://console.firebase.google.com
2. Sélectionner votre projet `soirees-mons-6ce3e`
3. Aller dans **Firestore Database** → **Rules**
4. Copier le contenu de `firestore-v2.rules`
5. Cliquer sur **Publier**

**Option B : Firebase CLI**
```bash
# Copier les nouvelles règles
cp firestore-v2.rules firestore.rules

# Déployer
firebase deploy --only firestore:rules
```

### Étape 2 : Déployer les Cloud Functions

```bash
# Installer les dépendances
cd functions
npm install

# Déployer toutes les functions
firebase deploy --only functions
```

### Étape 3 : Configurer Stripe

```bash
# Définir les secrets Stripe
firebase functions:config:set stripe.secret_key="sk_live_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# Redéployer les functions
firebase deploy --only functions
```

### Étape 4 : Mettre à jour les pages HTML

Les pages HTML doivent être mises à jour pour :
1. Inclure le nouveau Design System V2
2. Utiliser les nouveaux modules utilitaires
3. Appeler les Cloud Functions au lieu d'écrire directement dans Firestore

**Exemple de migration :**

**Avant :**
```html
<link rel="stylesheet" href="design-system.css">
```

**Après :**
```html
<link rel="stylesheet" href="css/design-system-v2.css">
```

**Avant (création événement) :**
```javascript
// Écriture directe dans Firestore (NON SÉCURISÉ)
await addDoc(collection(db, 'events'), eventData);
```

**Après (via Cloud Function) :**
```javascript
// Via Cloud Function sécurisée
import { callFunction } from './js/firebase-utils.js';
await callFunction(functions, 'createEvent', eventData);
```

---

## 📖 UTILISATION DES MODULES

### Auth Utils

```javascript
import { getUserRole, isAdmin, protectPage } from './js/auth-utils.js';

// Récupérer le rôle
const role = await getUserRole(uid, db);

// Vérifier si admin
if (await isAdmin(uid, db)) {
    // Afficher panel admin
}

// Protéger une page (admin only)
await protectPage(auth, db, ['admin']);
```

### Firebase Utils

```javascript
import {
    callFunction,
    handleFirebaseError,
    compressImage,
    cachedQuery
} from './js/firebase-utils.js';

// Appeler une Cloud Function
try {
    const result = await callFunction(functions, 'createEvent', eventData);
} catch (error) {
    alert(handleFirebaseError(error));
}

// Compresser une image
const compressedFile = await compressImage(file);

// Requête avec cache
const events = await cachedQuery('approved-events', async () => {
    return await getDocs(query(collection(db, 'events'), where('status', '==', 'approved')));
});
```

---

## 🔒 SÉCURITÉ

### Ce qui est protégé :

✅ **Création d'événements** : Via Cloud Function avec validation
✅ **Approbation/Rejet** : Admin uniquement via Cloud Function
✅ **Scan QR** : Vérification scanner autorisé + audit trail
✅ **Paiements Stripe** : Traités par webhook sécurisé
✅ **Préventes** : Aucune modification directe possible
✅ **Statistiques** : Lecture limitée au créateur + admin
✅ **Rôles** : Modification impossible depuis le front

### Protection contre :

🛡️ **Injections SQL/NoSQL** : Validation stricte de tous les champs
🛡️ **XSS** : Sanitization de toutes les entrées utilisateur
🛡️ **Accès non autorisés** : Vérification rôles à chaque opération
🛡️ **Modification de prix** : Prix validé côté serveur uniquement
🛡️ **Duplication de tickets** : ID unique + status tracking
🛡️ **Forçage de rôle** : Rôles gérés uniquement côté serveur

---

## 📊 STRUCTURE FIRESTORE

```
/users/{userId}
  - email: string
  - displayName: string
  - photoURL: string
  - role: string ('user' | 'organizer' | 'scanner' | 'admin')
  - createdAt: timestamp
  - lastLoginAt: timestamp

/events/{eventId}
  - name: string
  - location: string
  - date: timestamp
  - age: number
  - price: number
  - presales: boolean
  - maxPresales: number
  - presalesSold: number
  - status: string ('pending' | 'approved' | 'rejected')
  - createdBy: string (userId)
  - scanners: array<string> (userIds)

/presales/{presaleId}
  - eventId: string
  - userId: string
  - buyerName: string
  - buyerEmail: string
  - qrCodeURL: string
  - status: string ('valid' | 'used' | 'expired' | 'refunded')
  - paymentIntentId: string
  - purchasedAt: timestamp
  - usedAt: timestamp
  - scannedBy: string (userId)

/scanLogs/{logId}
  - presaleId: string
  - eventId: string
  - scannedBy: string
  - scannedAt: timestamp
  - buyerEmail: string
```

---

## 🎨 DESIGN SYSTEM

### Utilisation des composants :

```html
<!-- Boutons -->
<button class="btn btn-primary">Primaire</button>
<button class="btn btn-secondary">Secondaire</button>
<button class="btn btn-ghost">Ghost</button>
<button class="btn btn-danger">Danger</button>

<!-- Tailles -->
<button class="btn btn-primary btn-sm">Petit</button>
<button class="btn btn-primary btn-lg">Grand</button>

<!-- Cards -->
<div class="card">
    <div class="card-header">
        <h3 class="card-title">Titre</h3>
        <p class="card-subtitle">Sous-titre</p>
    </div>
    <div class="card-body">
        Contenu
    </div>
    <div class="card-footer">
        Actions
    </div>
</div>

<!-- Inputs -->
<input type="text" class="input" placeholder="Texte...">

<!-- Modal -->
<div class="modal-overlay active">
    <div class="modal">
        <div class="modal-header">
            <h2 class="modal-title">Titre</h2>
            <button class="modal-close">×</button>
        </div>
        <div class="modal-body">
            Contenu
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary">Annuler</button>
            <button class="btn btn-primary">Confirmer</button>
        </div>
    </div>
</div>
```

---

## 🚀 PROCHAINES ÉTAPES

### Phase 2 : Modernisation des pages
- [ ] Moderniser index.html (page d'accueil)
- [ ] Moderniser dashboard.html
- [ ] Moderniser mes-soirees.html
- [ ] Moderniser scanner.html
- [ ] Moderniser admin-panel.html

### Phase 3 : Optimisations performances
- [ ] Lazy loading des images
- [ ] Code splitting
- [ ] Service Worker pour cache
- [ ] Optimisation bundle JavaScript

---

## 📞 SUPPORT

En cas de problème :
1. Vérifier les logs Firebase Console
2. Vérifier les logs Cloud Functions
3. Vérifier la console navigateur (F12)
4. Vérifier que les règles Firestore sont déployées

---

**Version :** 2.0.0
**Date :** 2025
**Statut :** Phase 1 ✅ Terminée
