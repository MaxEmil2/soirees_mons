# 🔐 Page de Connexion Firebase - Soirées Mons

Page de connexion sécurisée avec Firebase Authentication v10 (ES Modules), incluant :
- ✉️ Connexion Email/Mot de passe
- 🌐 Connexion Google
- 🍎 Connexion Apple
- 🎨 Design moderne et sombre
- 📱 Responsive

---

## 📦 Fichiers du Projet

```
soirees_mons/
├── index.html          # Page de connexion principale
├── dashboard.html      # Page après connexion
├── style.css           # Styles modernes (fond sombre, design premium)
├── app.js              # Logique Firebase Authentication
└── README.md           # Ce fichier
```

---

## 🚀 Installation & Configuration

### Étape 1: Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Donnez un nom à votre projet (ex: "soirees-mons")
4. Suivez les étapes de création

### Étape 2: Activer Firebase Authentication

1. Dans votre projet Firebase, allez dans **"Authentication"**
2. Cliquez sur **"Commencer"**
3. Dans l'onglet **"Sign-in method"**, activez :
   - ✅ **Email/Password** : cliquez sur "Activer"
   - ✅ **Google** : cliquez sur "Activer" et choisissez un email support
   - ✅ **Apple** : suivez les instructions ci-dessous pour Apple

### Étape 3: Récupérer votre configuration Firebase

1. Dans Firebase Console, allez dans **Paramètres du projet** (⚙️ en haut à gauche)
2. Descendez à **"Vos applications"**
3. Cliquez sur l'icône **Web** `</>`
4. Enregistrez votre app (ex: "Soirées Mons Web")
5. Copiez l'objet `firebaseConfig`

### Étape 4: Ajouter votre configuration dans le code

Ouvrez **`app.js`** et **`dashboard.html`**, puis remplacez :

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "votre-project.firebaseapp.com",
    projectId: "votre-project-id",
    storageBucket: "votre-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

Par vos vraies valeurs copiées depuis Firebase Console.

⚠️ **IMPORTANT**: Mettez la même configuration dans `app.js` ET `dashboard.html`.

---

## 🌍 Configuration des Domaines Autorisés (OAuth)

Pour que les connexions Google et Apple fonctionnent, vous devez autoriser votre domaine.

### Configuration dans Firebase Console

1. Allez dans **Authentication** > **Settings** > **Authorized domains**
2. Par défaut, `localhost` et `votre-projet.firebaseapp.com` sont autorisés
3. Pour ajouter votre domaine personnalisé :
   - Cliquez sur **"Add domain"**
   - Entrez votre domaine (ex: `soirees-mons.com`)
   - Cliquez sur **"Add"**

### Domaines à autoriser selon l'environnement

#### 🏠 Développement local
```
localhost
127.0.0.1
```
✅ Déjà autorisés par défaut

#### 🌐 Production
```
votre-domaine.com
www.votre-domaine.com
```
🔧 À ajouter manuellement

#### ☁️ Firebase Hosting
```
votre-projet.web.app
votre-projet.firebaseapp.com
```
✅ Déjà autorisés automatiquement

---

## 🍎 Configuration Spécifique pour Apple Sign-In

La connexion Apple nécessite une configuration supplémentaire :

### 1. Créer un Apple Developer Account

- Créez un compte sur [Apple Developer](https://developer.apple.com/)
- Vous aurez besoin d'un compte payant (99$/an) pour la production

### 2. Configurer Apple Sign-In dans Firebase

1. Dans Firebase Console, allez dans **Authentication** > **Sign-in method**
2. Cliquez sur **Apple**
3. Activez le provider
4. Suivez les instructions pour :
   - Créer un **Service ID** dans Apple Developer Console
   - Configurer les **Return URLs** (fournis par Firebase)
   - Télécharger la **clé privée** Apple

### 3. URLs de redirection Apple

Firebase vous fournira des URLs comme :
```
https://votre-projet.firebaseapp.com/__/auth/handler
```

Ajoutez cette URL dans votre **Apple Developer Console** > **Service ID** > **Return URLs**.

### 💡 Alternative pour le développement

Si vous ne voulez pas configurer Apple Sign-In immédiatement :
- Vous pouvez **commenter** ou **masquer** le bouton Apple dans `index.html`
- Ou simplement ignorer les erreurs liées à Apple (elles n'affecteront pas Email et Google)

---

## 🧪 Test en Local

### 1. Ouvrir avec un serveur HTTP

⚠️ **Ne PAS** ouvrir directement `index.html` dans le navigateur (problème de CORS).

**Option A: Avec Python 3**
```bash
python3 -m http.server 8000
```

**Option B: Avec PHP**
```bash
php -S localhost:8000
```

**Option C: Avec Node.js (npx)**
```bash
npx http-server -p 8000
```

**Option D: Avec l'extension VSCode**
- Installez l'extension **"Live Server"**
- Faites un clic droit sur `index.html` > **"Open with Live Server"**

### 2. Ouvrir dans le navigateur

Allez sur : `http://localhost:8000`

---

## 📱 Déploiement sur Firebase Hosting

### 1. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Se connecter à Firebase

```bash
firebase login
```

### 3. Initialiser Firebase Hosting

```bash
firebase init hosting
```

Choisissez :
- **Public directory**: `.` (racine du projet)
- **Configure as single-page app**: `No`
- **Set up automatic builds**: `No`

### 4. Déployer

```bash
firebase deploy --only hosting
```

Votre site sera accessible à : `https://votre-projet.web.app`

---

## 🔒 Sécurité - Bonnes Pratiques

### 1. Variables d'environnement (Production)

Pour un site de production, stockez votre config Firebase dans des variables d'environnement :

```javascript
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    // ...
};
```

### 2. Règles Firebase Security Rules

Dans Firebase Console > **Firestore/Realtime Database** > **Rules**, configurez :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Restrictions de domaine

Limitez l'utilisation de votre API Key aux domaines autorisés :
- Firebase Console > **Paramètres** > **Restrictions d'API Key**

---

## 🎨 Personnalisation

### Modifier les couleurs

Dans `style.css`, changez les variables CSS :

```css
:root {
    --accent: #6c63ff;          /* Couleur principale */
    --bg-primary: #0f0f1e;      /* Fond principal */
    --bg-card: #16213e;         /* Fond de la carte */
}
```

### Ajouter un logo

Dans `index.html`, ajoutez dans `.header` :

```html
<img src="logo.png" alt="Logo" style="width: 100px; margin-bottom: 20px;">
```

### Changer les textes

Tous les textes sont dans `index.html` et facilement modifiables.

---

## 🐛 Dépannage

### Erreur: "auth/configuration-not-found"
➡️ Vérifiez que vous avez bien configuré `firebaseConfig` dans `app.js` et `dashboard.html`

### Erreur: "auth/unauthorized-domain"
➡️ Ajoutez votre domaine dans Firebase Console > Authentication > Authorized domains

### Popup bloquée pour Google/Apple
➡️ Autorisez les popups pour votre domaine dans les paramètres du navigateur

### La connexion fonctionne mais ne redirige pas
➡️ Vérifiez que `dashboard.html` existe bien dans le même dossier

### Erreur CORS en local
➡️ Utilisez un serveur HTTP local (voir section "Test en Local")

---

## 📚 Ressources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firebase Web SDK v10](https://firebase.google.com/docs/web/setup)
- [Google Sign-In](https://firebase.google.com/docs/auth/web/google-signin)
- [Apple Sign-In](https://firebase.google.com/docs/auth/web/apple)

---

## 📄 Licence

Ce projet est libre d'utilisation pour vos projets personnels ou commerciaux.

---

## ✨ Fonctionnalités Futures (optionnelles)

- [ ] Page d'inscription séparée avec `createUserWithEmailAndPassword()`
- [ ] Réinitialisation du mot de passe avec `sendPasswordResetEmail()`
- [ ] Connexion Facebook
- [ ] Vérification d'email avec `sendEmailVerification()`
- [ ] Profil utilisateur avec Firestore

---

**Créé avec ❤️ pour Soirées Mons**
