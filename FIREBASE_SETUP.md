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

## 6. Configuration Stripe (Complete)

### Etape 6.1 : Creer un compte Stripe
1. Allez sur [Stripe Dashboard](https://dashboard.stripe.com/)
2. Creez un compte ou connectez-vous
3. **Completez la verification d'identite** :
   - Informations personnelles
   - Document d'identite
   - Informations bancaires (IBAN)
   - Adresse de l'entreprise

### Etape 6.2 : Activer Stripe Connect

Stripe Connect permet de payer les organisateurs de soirees automatiquement.

1. Dashboard > **Connect** > Settings
2. Cliquez sur **Get started with Connect**
3. Configurez le profil de la plateforme :
   - **Platform type** : Marketplace or platform
   - **Business type** : Event ticketing
   - **Country** : Belgium

4. **Types de comptes Connect** :
   - Selectionnez **Express** (recommande)
   - Les organisateurs creent leur compte simplement
   - Stripe gere la verification KYC

5. **Branding Connect** :
   - Dashboard > Connect > Settings > Branding
   - Uploadez votre logo
   - Couleur primaire : `#6c63ff`
   - Nom de la plateforme : `Soirees Mons`

### Etape 6.3 : Configurer les paiements

1. **Methodes de paiement** :
   - Dashboard > Settings > Payment methods
   - Activez :
     - Cards (Visa, Mastercard)
     - Bancontact (Belgique)
     - iDEAL (Pays-Bas, optionnel)

2. **Devise** :
   - Devise par defaut : EUR

3. **Commission de la plateforme** :
   - Le code applique 12% de commission
   - Organisateur recoit 88%
   - Vous recevez 12%

### Etape 6.4 : Recuperer les cles API

1. Dashboard > Developers > API keys

**Mode Test (pour developpement)** :
- Secret key : `sk_test_xxxxxxxxxxxx`
- Publishable key : `pk_test_xxxxxxxxxxxx`

**Mode Live (pour production)** :
- Secret key : `sk_live_xxxxxxxxxxxx`
- Publishable key : `pk_live_xxxxxxxxxxxx`

> **IMPORTANT** : Ne jamais exposer la secret key cote client !

### Etape 6.5 : Configurer le Webhook

Le webhook recoit les notifications de paiement de Stripe.

1. Dashboard > Developers > Webhooks
2. Cliquez **Add endpoint**
3. **URL de l'endpoint** :
   ```
   https://europe-west1-VOTRE-PROJET.cloudfunctions.net/stripeWebhook
   ```
   Remplacez `VOTRE-PROJET` par votre ID de projet Firebase.

4. **Evenements a ecouter** (cliquez "Select events") :
   - `checkout.session.completed` - Paiement reussi
   - `payment_intent.succeeded` - Intent confirme
   - `payment_intent.payment_failed` - Echec de paiement
   - `charge.refunded` - Remboursement effectue

5. Cliquez **Add endpoint**

6. **Copiez le Signing secret** : `whsec_xxxxxxxxxxxx`
   - Cliquez sur l'endpoint cree
   - Section "Signing secret" > Reveal

### Etape 6.6 : Configurer dans Firebase

```bash
# Mode Test
firebase functions:config:set stripe.secret_key="sk_test_xxxxxxxxxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxxxxxxxxx"

# Mode Production (quand pret)
firebase functions:config:set stripe.secret_key="sk_live_xxxxxxxxxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxxxxxxxxx"
```

### Etape 6.7 : Tester les paiements

**Cartes de test Stripe** :

| Carte | Numero | Resultat |
|-------|--------|----------|
| Visa | 4242 4242 4242 4242 | Succes |
| Visa (auth) | 4000 0025 0000 3155 | Authentification 3D Secure |
| Declined | 4000 0000 0000 0002 | Refuse |
| Insufficient | 4000 0000 0000 9995 | Fonds insuffisants |

- Date d'expiration : n'importe quelle date future (ex: 12/34)
- CVC : n'importe quels 3 chiffres (ex: 123)

**Tester Bancontact** :
- Utilisez le test card: `pm_card_be`
- Ou simulez via le mode test

### Etape 6.8 : Checklist avant production

- [ ] Verification d'identite complete
- [ ] Informations bancaires ajoutees
- [ ] Branding Connect configure
- [ ] Webhook endpoint en mode Live cree
- [ ] Secret key Live configuree dans Firebase
- [ ] Webhook secret Live configure dans Firebase
- [ ] Tests effectues avec vraies cartes (petits montants)
- [ ] Politique de remboursement definie

### Etape 6.9 : Gestion des organisateurs (Connect)

Quand un organisateur active les preventes :
1. Il clique "Configurer Stripe" dans son dashboard
2. La function `createStripeConnectAccount` cree un compte Express
3. Il est redirige vers l'onboarding Stripe
4. Il complete ses infos (identite, IBAN)
5. Son `stripeAccountId` est sauvegarde dans Firestore
6. Les paiements sont automatiquement repartis (88% organisateur, 12% plateforme)

### Etape 6.10 : Monitoring et Rapports

- **Dashboard Stripe** > Payments : Voir tous les paiements
- **Dashboard Stripe** > Connect > Accounts : Voir les organisateurs
- **Dashboard Stripe** > Balance : Voir vos revenus de commission
- **Firebase Console** > Functions > Logs : Debug des webhooks

---

## 7. Configuration Email

### Option A : Mailtrap (Test/Developpement)

Mailtrap intercepte les emails pour les tester sans envoyer de vrais emails.

1. Creez un compte sur [Mailtrap](https://mailtrap.io/)
2. Allez dans **Email Testing** > **Inboxes**
3. Cliquez sur votre inbox > **SMTP Settings**
4. Selectionnez **Nodemailer** dans le dropdown
5. Copiez les credentials

```bash
firebase functions:config:set email.user="votre_username_mailtrap"
firebase functions:config:set email.pass="votre_password_mailtrap"
```

Le code actuel utilise deja Mailtrap par defaut.

---

### Option B : SendGrid (Recommande pour Production)

SendGrid est le service d'email recommande pour la production. Plan gratuit : 100 emails/jour.

#### Etape 7.1 : Creer un compte SendGrid

1. Allez sur [SendGrid](https://sendgrid.com/)
2. Cliquez **Start for Free**
3. Creez votre compte avec votre email
4. Verifiez votre email

#### Etape 7.2 : Configurer l'authentification de l'expediteur

**IMPORTANT** : SendGrid requiert une verification de l'expediteur.

1. Dashboard > **Settings** > **Sender Authentication**
2. Choisissez une methode :

**Option 1 : Single Sender (Simple, pour commencer)**
- Cliquez **Verify a Single Sender**
- Remplissez :
  - From Email : `noreply@soireesmons.be`
  - From Name : `Soirees Mons`
  - Reply To : `contact@soireesmons.be`
  - Company Address : Votre adresse
- Verifiez l'email recu

**Option 2 : Domain Authentication (Recommande pour production)**
- Cliquez **Authenticate Your Domain**
- Entrez votre domaine : `soireesmons.be`
- Ajoutez les enregistrements DNS fournis chez votre registrar
- Attendez la propagation DNS (jusqu'a 48h)

#### Etape 7.3 : Creer une API Key

1. Dashboard > **Settings** > **API Keys**
2. Cliquez **Create API Key**
3. Nom : `Soirees Mons Functions`
4. Permissions : **Restricted Access**
   - Mail Send : **Full Access**
   - (Laissez le reste en No Access)
5. Cliquez **Create & View**
6. **COPIEZ LA CLE** (elle ne sera plus visible apres !)

Format : `SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyy`

#### Etape 7.4 : Installer SendGrid dans les Functions

```bash
cd functions
npm install @sendgrid/mail
```

Mettez a jour `package.json` :
```json
{
  "dependencies": {
    "@sendgrid/mail": "^8.1.0",
    // ... autres dependances
  }
}
```

#### Etape 7.5 : Modifier le code des Functions

Remplacez la fonction `getEmailTransporter` et `sendPresaleEmail` dans `functions/index.js` :

```javascript
const sgMail = require('@sendgrid/mail');

// Configuration SendGrid
const initSendGrid = () => {
    const apiKey = functions.config().sendgrid?.api_key;
    if (!apiKey) {
        throw new Error('SendGrid API key not configured. Run: firebase functions:config:set sendgrid.api_key="SG.xxx"');
    }
    sgMail.setApiKey(apiKey);
};

/**
 * Envoie l'email avec le QR code via SendGrid
 */
async function sendPresaleEmail(presaleData) {
    initSendGrid();

    const eventDoc = await db.collection('events').doc(presaleData.eventId).get();
    const eventData = eventDoc.data();
    const eventDate = new Date(eventData.date).toLocaleDateString('fr-BE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Contenu HTML de l'email (gardez le meme HTML que dans le code actuel)
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #0a0a12;
                color: #ffffff;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 212, 255, 0.1));
                border-radius: 20px;
                padding: 40px;
                border: 1px solid rgba(108, 99, 255, 0.3);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                background: linear-gradient(90deg, #6c63ff, #00d4ff);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .title {
                font-size: 24px;
                color: #00d4ff;
                margin: 20px 0;
            }
            .event-name {
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
                margin: 10px 0;
            }
            .qr-container {
                text-align: center;
                background: #ffffff;
                border-radius: 15px;
                padding: 30px;
                margin: 30px 0;
            }
            .qr-code {
                max-width: 250px;
            }
            .warning {
                background: rgba(250, 173, 20, 0.2);
                border: 1px solid rgba(250, 173, 20, 0.5);
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">SOIREES MONS</div>
                <div class="title">Votre prevente est confirmee !</div>
            </div>
            <div class="event-name">${presaleData.eventName}</div>
            <p><strong>Date :</strong> ${eventDate}</p>
            <p><strong>Lieu :</strong> ${eventData.location}</p>
            <p><strong>Prix paye :</strong> ${presaleData.amount} EUR</p>
            <div class="qr-container">
                <img src="cid:qrcode" alt="QR Code" class="qr-code">
                <p style="color: #333;">Presentez ce QR code a l'entree</p>
                <p style="color: #666; font-size: 12px;">ID: ${presaleData.id}</p>
            </div>
            <div class="warning">
                <strong>Important :</strong> Ce QR code est unique et personnel.
                Ne le partagez pas. Il ne peut etre utilise qu'une seule fois.
            </div>
            <p style="text-align: center; color: #a0a0a0; font-size: 12px;">
                Merci d'avoir choisi Soirees Mons !<br>
                Contact : @soireesmons sur Instagram
            </p>
        </div>
    </body>
    </html>
    `;

    // Extraire le base64 du QR code
    const qrBase64 = presaleData.qrCode.split(',')[1];

    const msg = {
        to: presaleData.userEmail,
        from: {
            email: functions.config().sendgrid?.from_email || 'noreply@soireesmons.be',
            name: 'Soirees Mons'
        },
        subject: `🎉 Votre prevente pour ${presaleData.eventName}`,
        html: htmlContent,
        attachments: [
            {
                content: qrBase64,
                filename: 'qrcode.png',
                type: 'image/png',
                disposition: 'inline',
                content_id: 'qrcode'
            }
        ]
    };

    try {
        await sgMail.send(msg);
        console.log(`Email envoye a ${presaleData.userEmail} via SendGrid`);
    } catch (error) {
        console.error('Erreur SendGrid:', error);
        if (error.response) {
            console.error('SendGrid response body:', error.response.body);
        }
        throw error;
    }
}
```

#### Etape 7.6 : Configurer dans Firebase

```bash
# API Key SendGrid
firebase functions:config:set sendgrid.api_key="SG.xxxxxxxxxxxx"

# Email expediteur (doit etre verifie dans SendGrid)
firebase functions:config:set sendgrid.from_email="noreply@soireesmons.be"
```

#### Etape 7.7 : Deployer et tester

```bash
# Deployer les functions
firebase deploy --only functions

# Verifier la configuration
firebase functions:config:get

# Tester un email
# Faites un achat de prevente test et verifiez la reception
```

#### Etape 7.8 : Monitoring SendGrid

1. Dashboard SendGrid > **Activity** : Voir les emails envoyes
2. Dashboard SendGrid > **Statistics** : Metriques de delivrabilite
3. Dashboard SendGrid > **Suppressions** : Emails bloques/bounces

#### Etape 7.9 : Templates SendGrid (Optionnel)

Vous pouvez creer des templates dans SendGrid pour faciliter la maintenance :

1. Dashboard > **Email API** > **Dynamic Templates**
2. Creez un template avec le design de l'email
3. Utilisez l'ID du template dans le code :

```javascript
const msg = {
    to: presaleData.userEmail,
    from: 'noreply@soireesmons.be',
    templateId: 'd-xxxxxxxxxxxx',
    dynamicTemplateData: {
        eventName: presaleData.eventName,
        eventDate: eventDate,
        location: eventData.location,
        amount: presaleData.amount,
        qrCode: presaleData.qrCode,
        presaleId: presaleData.id
    }
};
```

---

### Option C : Gmail (Alternative simple)

Pour les petits volumes (< 500 emails/jour).

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

> **Limitation** : Gmail limite a 500 emails/jour et peut bloquer les envois en masse.

---

### Comparaison des options email

| Service | Gratuit | Limite | Recommande pour |
|---------|---------|--------|-----------------|
| Mailtrap | Oui | Test uniquement | Developpement |
| SendGrid | 100/jour | 100 emails/jour | Production |
| Gmail | Oui | 500/jour | Petits volumes |
| SendGrid Pro | $19.95/mois | 50,000/mois | Gros volumes |

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
