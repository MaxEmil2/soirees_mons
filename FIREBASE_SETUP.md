# Guide de Configuration Firebase - Soirees Mons

Ce guide explique comment configurer Firebase de A a Z pour le projet Soirees Mons.

## Table des matieres

1. [Creation du projet Firebase](#1-creation-du-projet-firebase)
2. [Configuration Authentication](#2-configuration-authentication)
3. [Configuration Firestore](#3-configuration-firestore)
4. [Configuration Storage](#4-configuration-storage)
5. [Configuration Cloud Functions](#5-configuration-cloud-functions)
6. [Configuration Stripe](#6-configuration-stripe)
7. [Configuration Email](#7-configuration-email)
8. [Deploiement](#8-deploiement)
9. [Test et verification](#9-test-et-verification)

---

## 1. Creation du projet Firebase

### Etape 1.1 : Creer le projet
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Nom du projet : `soirees-mons` (ou le nom de votre choix)
4. Activez Google Analytics (optionnel)
5. Selectionnez votre compte Analytics et creez le projet

### Etape 1.2 : Ajouter une application web
1. Dans la console Firebase, cliquez sur l'icone Web (</>)
2. Nom de l'application : `Soirees Mons Web`
3. Cochez "Configurer aussi Firebase Hosting"
4. Enregistrez l'application

### Etape 1.3 : Recuperer la configuration
Copiez la configuration Firebase et mettez-la a jour dans tous les fichiers JS qui l'utilisent :

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "votre-projet.firebaseapp.com",
    projectId: "votre-projet",
    storageBucket: "votre-projet.firebasestorage.app",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123",
    measurementId: "G-XXXXXXX"
};
```

**Fichiers a mettre a jour :**
- `index.html`
- `app.js`
- `login.js`
- `signup.js`
- `dashboard.js`
- `likes.js`
- `notifications.js`
- `user-events.js`
- `admin-panel.js`

---

## 2. Configuration Authentication

### Etape 2.1 : Activer les fournisseurs
1. Firebase Console > Authentication > Sign-in method
2. Activez **Email/Password**
3. (Optionnel) Activez **Google Sign-in**

### Etape 2.2 : Configurer les parametres
1. Onglet "Settings" > "User actions"
2. Activez "Email link (passwordless sign-in)" si desire
3. Configurez "Password policy" selon vos besoins

### Etape 2.3 : Configurer les emails
1. Onglet "Templates"
2. Personnalisez les emails :
   - Verification d'adresse email
   - Reinitialisation du mot de passe
3. Changez la langue en francais si besoin

### Etape 2.4 : Domaines autorises
1. Onglet "Settings" > "Authorized domains"
2. Ajoutez vos domaines :
   - `localhost` (dev)
   - `votre-projet.web.app`
   - `votre-domaine.com` (production)

---

## 3. Configuration Firestore

### Etape 3.1 : Creer la base de donnees
1. Firebase Console > Firestore Database
2. Cliquez sur "Creer une base de donnees"
3. Mode de securite : **Commencez en mode production**
4. Emplacement : `europe-west1` (Belgique)

### Etape 3.2 : Deployer les regles
Les regles sont definies dans `firestore.rules`. Pour les deployer :

```bash
firebase deploy --only firestore:rules
```

### Etape 3.3 : Deployer les index
Les index sont definis dans `firestore.indexes.json`. Pour les deployer :

```bash
firebase deploy --only firestore:indexes
```

### Etape 3.4 : Collections creees automatiquement

| Collection | Description |
|------------|-------------|
| `users` | Profils utilisateurs |
| `events` | Evenements/soirees |
| `likes` | Likes des evenements |
| `notifications` | Notifications utilisateurs |
| `partners` | Logos partenaires |
| `presales` | Preventes de tickets |
| `suggestions` | Suggestions utilisateurs |

### Etape 3.5 : Creer le premier admin
Creez manuellement un document dans `users` avec :
```javascript
{
    email: "admin@soireesmons.be",
    displayName: "Admin",
    isAdmin: true,
    createdAt: Timestamp.now()
}
```

---

## 4. Configuration Storage

### Etape 4.1 : Activer Storage
1. Firebase Console > Storage
2. Cliquez sur "Commencer"
3. Mode de securite : Commencez en mode production
4. Emplacement : `europe-west1`

### Etape 4.2 : Deployer les regles
Les regles sont definies dans `storage.rules`. Pour les deployer :

```bash
firebase deploy --only storage
```

### Etape 4.3 : Structure des dossiers

```
storage/
  events/          # Images des evenements
    {eventId}/
      image.jpg
  users/           # Photos de profil
    {userId}/
      avatar.jpg
  partners/        # Logos partenaires
    {partnerId}/
      logo.png
  presales/        # QR codes (generes par functions)
    {presaleId}/
      qrcode.png
```

---

## 5. Configuration Cloud Functions

### Etape 5.1 : Activer le plan Blaze
**IMPORTANT** : Les Cloud Functions necessitent le plan Blaze (pay-as-you-go).
1. Firebase Console > Upgrade
2. Selectionnez Blaze plan
3. Configurez une limite de budget

### Etape 5.2 : Installer les outils Firebase
```bash
npm install -g firebase-tools
firebase login
```

### Etape 5.3 : Initialiser le projet
```bash
cd /chemin/vers/soirees_mons
firebase init
```
Selectionnez :
- Firestore
- Functions
- Hosting
- Storage

### Etape 5.4 : Installer les dependances
```bash
cd functions
npm install
```

### Etape 5.5 : Configurer les variables d'environnement
```bash
# Configuration Stripe
firebase functions:config:set stripe.secret_key="sk_live_xxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxx"

# Configuration Email (Mailtrap pour test)
firebase functions:config:set email.user="votre_user_mailtrap"
firebase functions:config:set email.pass="votre_pass_mailtrap"
```

### Etape 5.6 : Deployer les functions
```bash
firebase deploy --only functions
```

### Functions disponibles

| Function | Type | Description |
|----------|------|-------------|
| `createStripeConnectAccount` | Callable | Cree un compte Stripe Connect |
| `checkStripeAccountStatus` | Callable | Verifie le statut du compte Stripe |
| `createCheckoutSession` | Callable | Cree une session de paiement |
| `stripeWebhook` | HTTP | Webhook pour evenements Stripe |
| `verifyTicket` | Callable | Verifie un QR code |
| `markTicketUsed` | Callable | Marque un ticket comme utilise |
| `getPresalesForEvent` | Callable | Recup preventes d'un event |
| `getMyPresales` | Callable | Recup preventes de l'utilisateur |
| `getAllPresales` | Callable | Recup toutes preventes (admin) |
| `refundPresale` | Callable | Rembourse une prevente |

---

## 6. Configuration Stripe

### Etape 6.1 : Creer un compte Stripe
1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Creez un compte ou connectez-vous
3. Completez la verification d'identite

### Etape 6.2 : Activer Connect
1. Dashboard > Connect > Settings
2. Activez les comptes Express
3. Configurez :
   - Pays : Belgique
   - Type de business : Plateforme de ticketing

### Etape 6.3 : Recuperer les cles API
1. Dashboard > Developers > API keys
2. Copiez :
   - **Secret key** : `sk_live_xxx` (production) ou `sk_test_xxx` (test)
   - **Publishable key** : `pk_live_xxx` ou `pk_test_xxx`

### Etape 6.4 : Configurer le webhook
1. Dashboard > Developers > Webhooks
2. Cliquez "Add endpoint"
3. URL : `https://europe-west1-votre-projet.cloudfunctions.net/stripeWebhook`
4. Evenements a ecouter :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copiez le **Signing secret** : `whsec_xxx`

### Etape 6.5 : Configurer dans Firebase
```bash
firebase functions:config:set stripe.secret_key="sk_live_xxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxx"
```

---

## 7. Configuration Email

### Option A : Mailtrap (Test/Dev)

1. Creez un compte sur [Mailtrap](https://mailtrap.io/)
2. Allez dans Inboxes > SMTP Settings
3. Copiez Username et Password

```bash
firebase functions:config:set email.user="votre_username"
firebase functions:config:set email.pass="votre_password"
```

### Option B : Gmail (Production)

1. Activez l'authentification 2FA sur votre compte Google
2. Creez un mot de passe d'application :
   - Google Account > Security > App passwords
   - Selectionnez "Mail" et "Other (Custom name)"
   - Copiez le mot de passe genere

3. Modifiez `functions/index.js` :
```javascript
const getEmailTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: functions.config().email.user,
            pass: functions.config().email.pass
        }
    });
};
```

4. Configurez :
```bash
firebase functions:config:set email.user="votre@gmail.com"
firebase functions:config:set email.pass="mot_de_passe_app"
```

### Option C : SendGrid (Recommande pour production)

1. Creez un compte sur [SendGrid](https://sendgrid.com/)
2. Recuperez votre API key
3. Modifiez le transporter :

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(functions.config().sendgrid.api_key);
```

---

## 8. Deploiement

### Etape 8.1 : Deploiement complet
```bash
# Depuis la racine du projet
firebase deploy
```

### Etape 8.2 : Deploiement par composant
```bash
# Regles Firestore seulement
firebase deploy --only firestore:rules

# Index Firestore seulement
firebase deploy --only firestore:indexes

# Storage rules seulement
firebase deploy --only storage

# Functions seulement
firebase deploy --only functions

# Hosting seulement
firebase deploy --only hosting
```

### Etape 8.3 : Verifier les URL
Apres deploiement, vos URLs seront :
- **Hosting** : `https://votre-projet.web.app`
- **Functions** : `https://europe-west1-votre-projet.cloudfunctions.net/`

---

## 9. Test et verification

### Checklist de verification

#### Authentication
- [ ] Inscription avec email/password fonctionne
- [ ] Connexion fonctionne
- [ ] Reinitialisation mot de passe fonctionne
- [ ] Deconnexion fonctionne

#### Firestore
- [ ] Lecture des events fonctionne
- [ ] Creation d'event par user authentifie fonctionne
- [ ] Likes fonctionnent (public et anonyme)
- [ ] Notifications se creent correctement

#### Storage
- [ ] Upload image event fonctionne
- [ ] Upload photo profil fonctionne
- [ ] Images s'affichent correctement

#### Cloud Functions
- [ ] createCheckoutSession cree une session Stripe
- [ ] Webhook recoit les evenements Stripe
- [ ] QR code genere et email envoye apres paiement
- [ ] Scan de ticket fonctionne

#### Stripe
- [ ] Paiement test avec carte 4242 4242 4242 4242 fonctionne
- [ ] Organisateur recoit 88%
- [ ] Plateforme recoit 12%

### Commandes utiles

```bash
# Voir les logs des functions
firebase functions:log

# Voir la configuration actuelle
firebase functions:config:get

# Tester localement
firebase emulators:start

# Voir le statut du projet
firebase projects:list
```

### Problemes courants

#### 1. "Functions not deploying"
- Verifiez que vous avez le plan Blaze
- Verifiez `npm install` dans le dossier functions

#### 2. "Permission denied" Firestore
- Verifiez les regles Firestore
- Assurez-vous que l'utilisateur est authentifie

#### 3. "Stripe webhook fails"
- Verifiez que l'URL du webhook est correcte
- Verifiez le signing secret

#### 4. "Emails not sending"
- Verifiez la configuration email
- Regardez les logs des functions

---

## Resume de la configuration

```bash
# 1. Installer Firebase CLI
npm install -g firebase-tools
firebase login

# 2. Initialiser (si pas deja fait)
firebase init

# 3. Configurer les secrets
firebase functions:config:set stripe.secret_key="sk_xxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxx"
firebase functions:config:set email.user="xxx"
firebase functions:config:set email.pass="xxx"

# 4. Installer dependances functions
cd functions && npm install && cd ..

# 5. Deployer tout
firebase deploy

# 6. Verifier
firebase functions:log
```

---

## Support

- Documentation Firebase : https://firebase.google.com/docs
- Documentation Stripe : https://stripe.com/docs
- Issues projet : [GitHub Issues]

---

*Derniere mise a jour : Novembre 2024*
