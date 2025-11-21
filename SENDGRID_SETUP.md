# Guide Complet - Configuration SendGrid pour Soirees Mons

Ce tutoriel vous guide pas a pas pour configurer SendGrid afin d'envoyer les emails de confirmation avec QR code.

---

## Pourquoi SendGrid ?

- **100 emails gratuits/jour** (suffisant pour commencer)
- **Delivrabilite elevee** (les emails arrivent en inbox, pas en spam)
- **API simple** et bien documentee
- **Monitoring** des emails envoyes

---

## Etape 1 : Creer un compte SendGrid

1. Allez sur **https://sendgrid.com/**
2. Cliquez sur **"Start for Free"**
3. Remplissez le formulaire :
   - Email professionnel (pas Gmail/Yahoo)
   - Mot de passe fort
   - Informations de l'entreprise
4. **Verifiez votre email** (cliquez le lien recu)
5. Connectez-vous au dashboard SendGrid

---

## Etape 2 : Verifier l'expediteur

SendGrid requiert de verifier l'adresse email d'expedition.

### Option A : Single Sender (Rapide - pour commencer)

1. Dashboard > **Settings** > **Sender Authentication**
2. Cliquez **"Verify a Single Sender"**
3. Remplissez le formulaire :

| Champ | Valeur |
|-------|--------|
| From Name | `Soirees Mons` |
| From Email | `noreply@soireesmons.be` |
| Reply To | `contact@soireesmons.be` |
| Company Address | Votre adresse complete |
| City | Mons |
| Country | Belgium |

4. Cliquez **"Create"**
5. **Verifiez l'email recu** dans votre boite (cliquez le lien)
6. Le statut passe a **"Verified"**

### Option B : Domain Authentication (Recommande pour production)

1. Dashboard > **Settings** > **Sender Authentication**
2. Cliquez **"Authenticate Your Domain"**
3. DNS Host : Selectionnez votre registrar (OVH, Cloudflare, etc.)
4. Domaine : `soireesmons.be`
5. Cliquez **"Next"**
6. **Ajoutez les enregistrements DNS** fournis chez votre registrar :
   - 3 enregistrements CNAME
   - Exemple :
     ```
     em1234.soireesmons.be CNAME u1234567.wl001.sendgrid.net
     s1._domainkey.soireesmons.be CNAME s1.domainkey.u1234567.wl001.sendgrid.net
     s2._domainkey.soireesmons.be CNAME s2.domainkey.u1234567.wl001.sendgrid.net
     ```
7. Attendez la propagation DNS (jusqu'a 48h)
8. Cliquez **"Verify"** pour confirmer

---

## Etape 3 : Creer l'API Key

1. Dashboard > **Settings** > **API Keys**
2. Cliquez **"Create API Key"**
3. Configuration :

| Parametre | Valeur |
|-----------|--------|
| API Key Name | `Soirees Mons Firebase Functions` |
| API Key Permissions | **Restricted Access** |

4. Dans les permissions, activez uniquement :
   - **Mail Send** : Full Access
   - Laissez tout le reste en "No Access"

5. Cliquez **"Create & View"**

6. **COPIEZ IMMEDIATEMENT LA CLE API !**
   - Format : `SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyy`
   - Elle ne sera plus visible apres !
   - Stockez-la dans un endroit securise

---

## Etape 4 : Configurer Firebase

Maintenant, configurez les secrets dans Firebase :

```bash
# 1. Configurez l'API Key SendGrid
firebase functions:config:set sendgrid.api_key="SG.votre_cle_api_complete"

# 2. Configurez l'email d'expedition (doit etre verifie dans SendGrid)
firebase functions:config:set sendgrid.from_email="noreply@soireesmons.be"

# 3. Verifiez la configuration
firebase functions:config:get
```

Vous devriez voir :
```json
{
  "sendgrid": {
    "api_key": "SG.xxx...",
    "from_email": "noreply@soireesmons.be"
  },
  "stripe": {
    "secret_key": "sk_...",
    "webhook_secret": "whsec_..."
  }
}
```

---

## Etape 5 : Installer les dependances

```bash
# Allez dans le dossier functions
cd functions

# Installez les dependances (incluant @sendgrid/mail)
npm install

# Verifiez que @sendgrid/mail est installe
npm list @sendgrid/mail
```

---

## Etape 6 : Deployer les Functions

```bash
# Depuis la racine du projet
cd ..

# Deployez uniquement les functions
firebase deploy --only functions
```

Attendez que le deploiement soit termine (environ 1-2 minutes).

---

## Etape 7 : Tester l'envoi d'email

### Test 1 : Achat de prevente

1. Allez sur votre site
2. Connectez-vous avec un compte utilisateur
3. Selectionnez un evenement avec preventes activees
4. Achetez une prevente (utilisez une carte test Stripe)
5. Verifiez votre email pour le QR code

### Test 2 : Verifier les logs

```bash
# Voir les logs des functions en temps reel
firebase functions:log --only stripeWebhook

# Ou voir tous les logs
firebase functions:log
```

Vous devriez voir :
```
i functions: Email envoye a user@example.com via SendGrid
```

### Test 3 : Verifier dans SendGrid

1. Dashboard SendGrid > **Activity**
2. Recherchez l'email envoye
3. Verifiez le statut : "Delivered"

---

## Problemes courants et solutions

### Erreur : "SendGrid API key not configured"

**Cause** : La cle API n'est pas configuree dans Firebase

**Solution** :
```bash
firebase functions:config:set sendgrid.api_key="SG.votre_cle"
firebase deploy --only functions
```

### Erreur : "The from address does not match a verified Sender Identity"

**Cause** : L'email d'expedition n'est pas verifie dans SendGrid

**Solution** :
1. Verifiez l'email dans SendGrid (Single Sender)
2. Ou utilisez un email de votre domaine authentifie
3. Mettez a jour la config :
```bash
firebase functions:config:set sendgrid.from_email="email_verifie@domain.com"
```

### Erreur : "Forbidden" (403)

**Cause** : La cle API n'a pas les bonnes permissions

**Solution** :
1. Creez une nouvelle cle API dans SendGrid
2. Assurez-vous que "Mail Send" a "Full Access"
3. Mettez a jour la config avec la nouvelle cle

### Email en spam

**Cause** : Domaine non authentifie

**Solution** :
1. Configurez Domain Authentication dans SendGrid
2. Ajoutez les enregistrements DNS SPF et DKIM
3. Attendez la propagation DNS

### Email non recu

**Verifications** :
1. Verifiez les logs Firebase : `firebase functions:log`
2. Verifiez l'Activity dans SendGrid
3. Verifiez le dossier spam du destinataire
4. Verifiez que l'adresse email est correcte

---

## Monitoring et statistiques

### Dashboard SendGrid

- **Activity** : Voir chaque email envoye
  - Status : Delivered, Bounced, Blocked
  - Clics et ouvertures

- **Statistics** : Metriques globales
  - Taux de delivrabilite
  - Taux d'ouverture
  - Taux de clics

- **Suppressions** : Emails bloques
  - Bounces : Adresses invalides
  - Spam Reports : Signalements
  - Unsubscribes : Desabonnements

### Alertes recommandees

1. Dashboard > **Settings** > **Alerts**
2. Configurez des alertes pour :
   - Bounce rate > 5%
   - Spam reports
   - Daily usage

---

## Limites du plan gratuit

| Limite | Valeur |
|--------|--------|
| Emails/jour | 100 |
| Emails/mois | 100 |
| Support | Documentation uniquement |

### Upgrade recommande

Pour un usage en production (> 100 emails/jour) :
- **Essentials** : $19.95/mois - 50,000 emails/mois
- **Pro** : $89.95/mois - 100,000 emails/mois

---

## Commandes utiles

```bash
# Voir la configuration actuelle
firebase functions:config:get

# Mettre a jour l'API key
firebase functions:config:set sendgrid.api_key="SG.nouvelle_cle"

# Mettre a jour l'email d'expedition
firebase functions:config:set sendgrid.from_email="nouveau@email.com"

# Deployer apres modification de config
firebase deploy --only functions

# Voir les logs en temps reel
firebase functions:log --follow

# Voir les logs d'une function specifique
firebase functions:log --only stripeWebhook
```

---

## Resume rapide

```bash
# 1. Creer compte SendGrid et verifier expediteur

# 2. Creer API Key avec permission "Mail Send"

# 3. Configurer Firebase
firebase functions:config:set sendgrid.api_key="SG.xxx"
firebase functions:config:set sendgrid.from_email="noreply@soireesmons.be"

# 4. Installer dependances
cd functions && npm install && cd ..

# 5. Deployer
firebase deploy --only functions

# 6. Tester
# Achetez une prevente et verifiez l'email
```

---

## Support

- Documentation SendGrid : https://docs.sendgrid.com/
- Documentation Firebase Functions : https://firebase.google.com/docs/functions
- Status SendGrid : https://status.sendgrid.com/

---

*Guide cree pour Soirees Mons - Novembre 2024*
