# 🎉 Soirées Mons - Plateforme d'Événements Ultra-Sécurisée

[![Firebase](https://img.shields.io/badge/Firebase-10.8.0-orange)](https://firebase.google.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Latest-blue)](https://stripe.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Plateforme moderne, rapide et ultra-sécurisée pour la gestion d'événements et la vente de préventes à Mons.

## ✨ Caractéristiques

### 🚀 Ultra Rapide
- **Optimisations de performance** : Lazy-loading, compression, mise en cache
- **Build optimisé** : Vite.js avec compression Gzip et Brotli
- **Chargement instantané** : Code splitting et chunking intelligent

### 🔒 Sécurité Niveau NASA
- **Cloud Functions sécurisées** : Toutes les opérations sensibles côté serveur
- **Firestore Rules béton** : Contrôle d'accès granulaire
- **Storage Rules sécurisées** : Protection des fichiers uploadés
- **Validation complète** : Toutes les entrées sont validées et sanitizées
- **Protection anti-fraude** : Anti-double-scan, anti-duplication de tickets
- **Logs d'audit** : Traçabilité complète des actions

### 💎 Design Premium
- **UI Moderne** : Design épuré inspiré des startups tech
- **Responsive 100%** : Parfait sur mobile, tablette et desktop
- **Animations fluides** : Transitions et effets visuels soignés
- **Design System** : Cohérence visuelle complète

### ⚡ Fonctionnalités

#### Pour les Utilisateurs
- 🎫 Achat de préventes sécurisé via Stripe
- 📱 Tickets QR code dans le profil
- 🔔 Notifications en temps réel
- ❤️ Système de likes pour les événements
- 🔍 Recherche et filtres d'événements

#### Pour les Organisateurs
- ✏️ Création et gestion d'événements
- 📊 Statistiques de ventes en temps réel
- 🎯 Gestion des tickets vendus
- 📸 Upload d'images optimisé

#### Pour les Scanners
- 📷 Scanner QR code des tickets
- ✅ Validation instantanée
- 🚫 Protection anti-double-scan

#### Pour les Admins
- 👑 Panneau d'administration complet
- ✓ Approbation des événements
- 👥 Gestion des utilisateurs et rôles
- 📈 Statistiques globales

## 📦 Installation

### Prérequis

- Node.js >= 18.0.0
- npm ou yarn
- Compte Firebase
- Compte Stripe (pour les paiements)

### 🔧 Configuration

1. **Clonez le repository**

```bash
git clone https://github.com/MaxEmil2/soirees_mons.git
cd soirees_mons
```

2. **Installez les dépendances**

```bash
# Frontend
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

3. **Configurez Firebase**

Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com/)

Activez les services suivants :
- **Authentication** (Email/Password + Google)
- **Firestore Database**
- **Storage**
- **Functions**
- **Hosting** (optionnel)

4. **Configurez les variables d'environnement**

```bash
# Copiez le fichier .env.example
cp .env.example .env

# Éditez .env et ajoutez vos clés Firebase et Stripe
nano .env
```

5. **Configurez Stripe**

- Créez un compte sur [stripe.com](https://stripe.com/)
- Récupérez vos clés API (Dashboard > Developers > API keys)
- Ajoutez-les dans `.env`
- Configurez le webhook Stripe pour recevoir les événements de paiement

6. **Déployez les règles de sécurité**

```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules
firebase deploy --only storage:rules
```

7. **Déployez les Cloud Functions**

```bash
# En développement (avec émulateurs)
npm run functions:dev

# En production
firebase deploy --only functions
```

8. **Lancez le projet**

```bash
# Mode développement
npm run dev

# Build de production
npm run build

# Preview du build
npm run preview
```

## 🏗️ Architecture du Projet

```
soirees_mons/
├── src/
│   ├── components/          # Composants UI réutilisables
│   │   ├── EventCard.js     # Carte d'événement
│   │   ├── Modal.js         # Composant modal
│   │   ├── Toast.js         # Notifications toast
│   │   └── QRScanner.js     # Scanner QR code
│   ├── services/            # Services métier
│   │   ├── auth.service.js  # Authentification
│   │   ├── events.service.js# Gestion des événements
│   │   ├── stripe.service.js# Paiements Stripe
│   │   ├── tickets.service.js# Gestion des tickets
│   │   └── storage.service.js# Upload de fichiers
│   ├── config/
│   │   └── firebase.js      # Configuration Firebase
│   └── utils/               # Utilitaires
├── functions/               # Cloud Functions Firebase
│   ├── events/              # Fonctions pour les événements
│   ├── stripe/              # Fonctions pour Stripe
│   ├── tickets/             # Fonctions pour les tickets
│   ├── presales/            # Fonctions pour les préventes
│   └── utils/               # Utilitaires backend
│       ├── auth.js          # Authentification/Autorisation
│       └── validators.js    # Validation des données
├── public/
│   └── styles/
│       └── design-system.css# Design system CSS
├── index.html               # Page d'accueil
├── dashboard.html           # Tableau de bord
├── mes-soirees.html         # Gestion des événements
├── scanner.html             # Scanner de tickets
├── admin-panel.html         # Panneau admin
├── firestore.rules          # Règles de sécurité Firestore
├── storage.rules            # Règles de sécurité Storage
├── vite.config.js           # Configuration Vite
└── package.json             # Dépendances

```

## 🔐 Sécurité

### Firestore Rules
- ✅ Toutes les collections protégées
- ✅ Validation des données côté serveur
- ✅ Contrôle d'accès basé sur les rôles
- ✅ Protection contre les injections

### Cloud Functions
- ✅ Validation complète de toutes les entrées
- ✅ Sanitization des données
- ✅ Authentification obligatoire
- ✅ Vérification des permissions
- ✅ Protection contre les attaques

### Paiements
- ✅ Intégration Stripe sécurisée
- ✅ Webhooks signés
- ✅ Validation côté serveur
- ✅ Protection contre la manipulation de prix

### Tickets
- ✅ QR codes uniques et sécurisés
- ✅ Protection anti-double-scan
- ✅ Validation en temps réel
- ✅ Traçabilité complète

## 🎨 Design System

Le projet utilise un design system complet avec :
- Variables CSS pour la cohérence
- Composants réutilisables
- Thème sombre moderne
- Animations fluides
- Responsive design

## 📱 Responsive

Le site est 100% responsive et optimisé pour :
- 📱 Mobile (320px - 768px)
- 📱 Tablette (769px - 1024px)
- 💻 Desktop (1025px+)

## 🚀 Déploiement

### Firebase Hosting

```bash
# Build du projet
npm run build

# Déploiement complet
firebase deploy

# Ou déploiement par parties
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Variables d'Environnement en Production

Pour les Cloud Functions, configurez les variables :

```bash
firebase functions:config:set stripe.secret_key="sk_live_xxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxx"
firebase functions:config:set app.url="https://votre-domaine.com"
```

## 🧪 Tests

```bash
# Lancer les tests unitaires
npm test

# Lancer les tests avec couverture
npm run test:coverage
```

## 📚 Documentation Technique

### Services Frontend

- **authService** : Gestion de l'authentification
- **eventsService** : CRUD des événements avec cache
- **stripeService** : Intégration paiements
- **ticketsService** : Gestion des tickets QR
- **storageService** : Upload d'images optimisé

### Cloud Functions

- **createEvent** : Création d'événement sécurisée
- **updateEvent** : Mise à jour avec validation
- **deleteEvent** : Suppression avec vérifications
- **approveEvent** : Approbation admin
- **createCheckoutSession** : Création session Stripe
- **stripeWebhook** : Traitement des paiements
- **verifyTicket** : Vérification de ticket
- **markTicketUsed** : Validation de ticket

## 🐛 Dépannage

### Erreur Firebase
```bash
# Reconnectez-vous à Firebase
firebase login

# Vérifiez la configuration
firebase projects:list
```

### Erreur de build
```bash
# Nettoyez le cache
rm -rf node_modules dist
npm install
npm run build
```

### Problèmes d'émulateurs
```bash
# Tuez les processus Firebase
pkill -f firebase

# Relancez les émulateurs
firebase emulators:start
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](CONTRIBUTING.md) pour plus de détails.

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus d'informations.

## 👨‍💻 Auteur

**Soirées Mons Team**

## 🙏 Remerciements

- Firebase pour l'infrastructure
- Stripe pour les paiements
- La communauté open source

---

**Fait avec ❤️ pour Soirées Mons**
