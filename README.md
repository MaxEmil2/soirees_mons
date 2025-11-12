# Soirées Mons 🎉

Application mobile Flutter complète de gestion d'événements avec Firebase, Stripe et génération de QR codes.

## 🌟 Fonctionnalités

### Authentification
- ✉️ **Magic Link** : Inscription/Connexion par email sans mot de passe
- 🔐 **Google Sign-In** : Authentification via compte Google
- 🍎 **Apple Sign-In** : Authentification via Apple ID
- 🎨 Interface élégante avec fond noir et accent doré

### Gestion d'événements
- 📅 Liste des événements disponibles
- 🎫 Achat de billets avec paiement Stripe
- 📱 Génération de QR codes pour les billets
- ✅ Validation des billets

### Profil utilisateur
- 👤 Gestion du profil
- 🎟️ Historique des billets achetés
- 📊 Suivi des événements

## 🛠️ Stack Technique

- **Framework** : Flutter (SDK >= 3.0.0)
- **Backend** : Firebase
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
- **Paiements** : Stripe
- **QR Codes** : qr_flutter & qr_code_scanner
- **State Management** : Provider
- **UI** : Material Design avec Google Fonts

## 📋 Prérequis

- Flutter SDK (>= 3.0.0)
- Dart SDK (>= 3.0.0)
- Un compte Firebase
- Un compte Stripe
- Android Studio / Xcode (pour le développement mobile)

## 🚀 Installation

### 1. Cloner le projet

```bash
git clone https://github.com/MaxEmil2/soirees_mons.git
cd soirees_mons
```

### 2. Installer les dépendances

```bash
flutter pub get
```

### 3. Configuration Firebase

#### Étape 1 : Créer un projet Firebase
1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez un nouveau projet "Soirées Mons"
3. Activez les services suivants :
   - **Authentication** (Email/Password, Google, Apple)
   - **Cloud Firestore**
   - **Storage**

#### Étape 2 : Configurer les applications

**Pour Android :**
```bash
# Installer FlutterFire CLI
dart pub global activate flutterfire_cli

# Configurer Firebase
flutterfire configure
```

**Ou manuellement :**
1. Téléchargez `google-services.json` depuis Firebase Console
2. Placez-le dans `android/app/`

**Pour iOS :**
1. Téléchargez `GoogleService-Info.plist` depuis Firebase Console
2. Placez-le dans `ios/Runner/`

#### Étape 3 : Mettre à jour les clés Firebase

Modifiez le fichier `lib/firebase_options.dart` avec vos propres clés Firebase.

### 4. Configuration Stripe

1. Créez un compte sur [Stripe](https://stripe.com/)
2. Récupérez vos clés API (Publishable Key et Secret Key)
3. Dans `lib/main.dart`, remplacez :
   ```dart
   Stripe.publishableKey = 'YOUR_STRIPE_PUBLISHABLE_KEY';
   ```

#### Backend Stripe
Vous devez créer un backend pour gérer les PaymentIntents. Exemple avec Node.js :

```javascript
const stripe = require('stripe')('YOUR_STRIPE_SECRET_KEY');

app.post('/create-payment-intent', async (req, res) => {
  const { amount, currency } = req.body;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: currency,
  });

  res.json({
    paymentIntent: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
  });
});
```

### 5. Configuration Google Sign-In

**Android :**
1. Dans Firebase Console, activez Google comme fournisseur d'authentification
2. Ajoutez votre SHA-1 :
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

**iOS :**
1. Ouvrez `ios/Runner.xcworkspace` dans Xcode
2. Ajoutez votre `GoogleService-Info.plist`
3. Configurez le URL Scheme

### 6. Configuration Apple Sign-In

**iOS seulement :**
1. Dans votre Apple Developer Account, activez "Sign in with Apple"
2. Dans Firebase Console, activez Apple comme fournisseur
3. Configurez le Service ID et les clés

### 7. Ajouter le logo

Placez votre logo "hangar" dans `assets/images/logo_hangar.png`

## 📱 Lancer l'application

### Émulateur/Simulateur
```bash
flutter run
```

### Device physique
```bash
flutter run -d <device_id>
```

### Mode release
```bash
flutter build apk --release  # Android
flutter build ios --release  # iOS
```

## 🏗️ Structure du projet

```
lib/
├── main.dart                 # Point d'entrée
├── firebase_options.dart     # Configuration Firebase
├── models/                   # Modèles de données
│   ├── event.dart
│   ├── ticket.dart
│   └── user_profile.dart
├── providers/                # State management
│   └── auth_provider.dart
├── screens/                  # Écrans de l'app
│   ├── auth/
│   │   ├── login_screen.dart
│   │   └── email_verification_screen.dart
│   └── home/
│       └── home_screen.dart
├── services/                 # Services
│   ├── auth_service.dart
│   ├── stripe_service.dart
│   └── qr_service.dart
└── widgets/                  # Composants réutilisables
    └── auth_button.dart
```

## 🗄️ Structure Firestore

### Collection `events`
```json
{
  "title": "Soirée Hangar",
  "description": "...",
  "location": "Hangar, Mons",
  "date": Timestamp,
  "price": 15.0,
  "imageUrl": "...",
  "totalTickets": 200,
  "soldTickets": 45,
  "categories": ["Musique", "Soirée"],
  "createdAt": Timestamp,
  "isActive": true
}
```

### Collection `tickets`
```json
{
  "userId": "user_id",
  "eventId": "event_id",
  "eventTitle": "Soirée Hangar",
  "eventDate": Timestamp,
  "price": 15.0,
  "status": "paid",
  "qrCodeData": "ticket_id|user_id|event_id|timestamp",
  "purchaseDate": Timestamp,
  "validatedAt": null,
  "validatedBy": null,
  "paymentIntentId": "pi_xxx"
}
```

### Collection `users`
```json
{
  "email": "user@example.com",
  "displayName": "John Doe",
  "phoneNumber": "+32...",
  "photoUrl": "...",
  "createdAt": Timestamp,
  "lastLogin": Timestamp,
  "purchasedTickets": ["ticket_id_1", "ticket_id_2"],
  "isAdmin": false
}
```

## 🔐 Sécurité Firestore

Ajoutez ces règles dans Firebase Console :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Events - lecture publique, écriture admin
    match /events/{eventId} {
      allow read: if true;
      allow write: if request.auth != null &&
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Tickets - lecture/écriture uniquement par le propriétaire
    match /tickets/{ticketId} {
      allow read: if request.auth != null &&
                    resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
                      request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null &&
                      resource.data.userId == request.auth.uid;
    }

    // Users - lecture/écriture uniquement par le propriétaire
    match /users/{userId} {
      allow read, write: if request.auth != null &&
                           request.auth.uid == userId;
    }
  }
}
```

## 🎨 Thème et Design

- **Couleur primaire** : Or (#FFD700)
- **Fond** : Noir (#000000)
- **Surface** : Gris foncé (#1A1A1A)
- **Police** : Montserrat (via Google Fonts)

## 📝 TODO / Améliorations futures

- [ ] Implémenter le système de notifications push
- [ ] Ajouter un système de favoris pour les événements
- [ ] Créer un dashboard admin pour gérer les événements
- [ ] Ajouter la géolocalisation des événements
- [ ] Implémenter un système de partage d'événements
- [ ] Ajouter des statistiques pour les organisateurs
- [ ] Intégrer un système de chat/commentaires
- [ ] Mode hors ligne avec synchronisation

## 🐛 Débogage

### Problèmes courants

**Firebase non initialisé :**
```bash
flutter clean
flutter pub get
```

**Erreurs de build Android :**
```bash
cd android
./gradlew clean
cd ..
flutter clean
flutter pub get
```

**Problèmes iOS :**
```bash
cd ios
pod install
cd ..
flutter clean
flutter pub get
```

## 📄 Licence

Ce projet est sous licence MIT.

## 👥 Contributeurs

- **Équipe Soirées Mons** - Développement initial

## 📞 Support

Pour toute question ou problème :
- 📧 Email : support@soireesmons.be
- 🌐 Site web : https://soireesmons.be

## 🙏 Remerciements

- Flutter & Dart team
- Firebase
- Stripe
- La communauté open source

---

Fait avec ❤️ pour Soirées Mons
