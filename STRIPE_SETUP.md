# Guide de Configuration du Système de Préventes Stripe

Ce guide explique comment configurer le système complet de préventes pour Soirées Mons.

## Architecture du Système

Le système de préventes utilise :
- **Stripe Connect** : Pour les paiements et le split automatique (88% organisateur + 12% commission)
- **Firebase Cloud Functions** : Pour le backend (webhooks, génération QR, emails)
- **Firebase Firestore** : Pour stocker les préventes
- **Nodemailer** : Pour l'envoi des emails avec QR code

## Étape 1 : Configuration du Compte Stripe

### 1.1 Créer un compte Stripe
1. Allez sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Complétez l'inscription avec vos informations

### 1.2 Activer Stripe Connect
1. Dans le Dashboard Stripe, allez dans **Settings** > **Connect**
2. Activez **Connect** pour votre compte
3. Configurez les paramètres :
   - Platform type: **Express**
   - Country: **Belgium**

### 1.3 Récupérer les clés API
1. Allez dans **Developers** > **API keys**
2. Copiez :
   - **Secret key** (commence par `sk_live_` ou `sk_test_`)
   - **Publishable key** (commence par `pk_live_` ou `pk_test_`)

### 1.4 Configurer le Webhook
1. Allez dans **Developers** > **Webhooks**
2. Cliquez sur **Add endpoint**
3. Configurez :
   - **Endpoint URL**: `https://europe-west1-soirees-mons-6ce3e.cloudfunctions.net/stripeWebhook`
   - **Events to listen**:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
4. Copiez le **Signing secret** (commence par `whsec_`)

## Étape 2 : Configuration de l'Email

### 2.1 Utiliser Gmail
1. Créez un compte Gmail dédié ou utilisez votre compte existant
2. Activez l'**authentification à deux facteurs**
3. Créez un **mot de passe d'application** :
   - Allez dans [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Créez un mot de passe pour "Mail" et "Autre"
   - Copiez le mot de passe généré (16 caractères)

## Étape 3 : Configuration Firebase Functions

### 3.1 Installer Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 3.2 Initialiser les fonctions
```bash
cd /chemin/vers/soirees_mons
firebase init functions
```

### 3.3 Installer les dépendances
```bash
cd functions
npm install
```

### 3.4 Configurer les variables d'environnement
```bash
# Stripe
firebase functions:config:set stripe.secret_key="sk_live_votre_cle_secrete"
firebase functions:config:set stripe.webhook_secret="whsec_votre_secret_webhook"

# Email
firebase functions:config:set email.user="votre-email@gmail.com"
firebase functions:config:set email.pass="votre_mot_de_passe_application"
```

### 3.5 Déployer les fonctions
```bash
firebase deploy --only functions
```

## Étape 4 : Configuration Firestore

### 4.1 Déployer les règles de sécurité
```bash
firebase deploy --only firestore:rules
```

### 4.2 Déployer les index
```bash
firebase deploy --only firestore:indexes
```

## Étape 5 : Test du Système

### 5.1 Mode Test Stripe
Pour tester, utilisez les clés de test (commençant par `sk_test_`).

Cartes de test :
- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **Bancontact** : `4000 0000 0000 3055`

### 5.2 Tester le flux complet
1. Créez un événement avec préventes activées
2. Faites approuver l'événement par un admin
3. Le créateur doit configurer son compte Stripe Connect
4. Un utilisateur achète une prévente
5. Vérifiez la réception de l'email avec QR code
6. Testez le scanner QR

## Structure des Collections Firestore

### Collection `presales`
```javascript
{
  id: "uuid-unique",           // ID unique de la prévente
  eventId: "id-evenement",     // Référence à l'événement
  eventName: "Nom Soirée",     // Nom de l'événement
  userId: "uid-acheteur",      // UID Firebase de l'acheteur
  userEmail: "email@test.com", // Email de l'acheteur
  userName: "Nom Acheteur",    // Nom de l'acheteur
  amount: 8,                   // Montant payé en euros (compatibilité)
  prix_total: 8,               // Prix total payé par l'acheteur
  commission: 0.96,            // Commission plateforme (12%)
  montant_recu: 7.04,          // Montant reçu par l'organisateur (88%)
  currency: "eur",             // Devise
  status: "valid",             // valid | used | refunded
  qrCode: "data:image/png...", // QR code en base64
  qrCodeData: "{json}",        // Données encodées dans le QR
  stripeSessionId: "cs_xxx",   // ID session Stripe
  stripePaymentIntentId: "pi_xxx", // ID PaymentIntent
  emailSent: true,             // Email envoyé
  createdAt: Timestamp,        // Date de création
  usedAt: null,                // Date d'utilisation
  scannedBy: null              // UID du scanner
}
```

### Collection `users` (champs ajoutés)
```javascript
{
  // ... champs existants ...
  stripeAccountId: "acct_xxx",      // ID compte Stripe Connect
  stripeAccountStatus: "active",    // pending | active
  stripeCanReceivePayments: true    // Peut recevoir des paiements
}
```

## Flux de Paiement

1. **Utilisateur clique sur "Acheter une prévente"**
2. **Cloud Function `createCheckoutSession`** :
   - Vérifie l'événement et la disponibilité
   - Vérifie que le créateur a un compte Stripe actif
   - Crée une session Stripe Checkout avec split payment
3. **Redirection vers Stripe Checkout**
4. **Paiement effectué**
5. **Webhook `checkout.session.completed`** :
   - Génère le QR code unique
   - Crée le document `presales`
   - Envoie l'email avec le QR code
   - Notifie l'acheteur et le créateur
6. **Transfert automatique** :
   - 88% vers le compte de l'organisateur (7.04€ pour un ticket à 8€)
   - 12% commission Soirées Mons (0.96€ pour un ticket à 8€)

## Pages Créées

| Page | Description |
|------|-------------|
| `scanner.html` | Scanner QR pour les organisateurs |
| `mes-preventes.html` | Liste des préventes de l'utilisateur |
| `presale-success.html` | Page de confirmation après achat |

## Sécurité

### Vérification des tickets
- Chaque QR code contient un UUID unique
- Le ticket est vérifié en temps réel dans Firestore
- Un ticket ne peut être utilisé qu'une seule fois
- Seul le créateur de l'événement ou un admin peut scanner

### Règles Firestore
- Les préventes ne peuvent être créées que par les Cloud Functions
- Seul le statut peut être modifié (pour marquer comme utilisé)
- L'acheteur peut voir sa prévente
- Le créateur peut voir toutes les préventes de son événement

## Commandes Utiles

```bash
# Voir les logs des fonctions
firebase functions:log

# Tester localement
firebase emulators:start

# Voir la configuration
firebase functions:config:get

# Mettre à jour une variable
firebase functions:config:set stripe.secret_key="nouvelle_cle"

# Redéployer les fonctions
firebase deploy --only functions
```

## Dépannage

### L'email n'est pas envoyé
- Vérifiez que le mot de passe d'application Gmail est correct
- Vérifiez les logs : `firebase functions:log`
- Testez avec un email de test

### Le paiement échoue
- Vérifiez que la clé secrète Stripe est correcte
- Vérifiez que le créateur a configuré son compte Connect
- En mode test, utilisez les cartes de test Stripe

### Le QR code n'est pas scanné
- Vérifiez que vous êtes le créateur de l'événement ou admin
- Vérifiez que l'événement sélectionné correspond
- Vérifiez la connexion internet

### Le webhook ne fonctionne pas
- Vérifiez l'URL du webhook dans Stripe Dashboard
- Vérifiez le signing secret
- Testez avec les événements de test Stripe

## Support

Pour toute question, contactez :
- Instagram : @soirees_mons
- Email : (configuré dans Firebase)

## Mise en Production

### Checklist avant mise en production
- [ ] Utiliser les clés Stripe LIVE (pas test)
- [ ] Configurer le domaine de production
- [ ] Tester le flux complet avec un vrai paiement
- [ ] Vérifier les transferts vers les créateurs
- [ ] Configurer la tarification Stripe Connect (vérifier les frais)
- [ ] Sauvegarder les clés de manière sécurisée
- [ ] Configurer les alertes Stripe pour les paiements
