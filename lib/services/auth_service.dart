import 'package:firebase_auth/firebase_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final GoogleSignIn _googleSignIn = GoogleSignIn();

  // Get current user
  User? get currentUser => _auth.currentUser;

  // Send sign in link to email (Magic Link)
  Future<void> sendSignInLinkToEmail(String email) async {
    try {
      final actionCodeSettings = ActionCodeSettings(
        url: 'https://soireesmons.page.link/auth',
        handleCodeInApp: true,
        androidPackageName: 'com.soireesmons.soirees_mons',
        androidInstallApp: true,
        androidMinimumVersion: '21',
        iOSBundleId: 'com.soireesmons.soireesMons',
      );

      await _auth.sendSignInLinkToEmail(
        email: email,
        actionCodeSettings: actionCodeSettings,
      );
    } catch (e) {
      throw Exception('Erreur lors de l\'envoi du lien: $e');
    }
  }

  // Sign in with email link
  Future<UserCredential> signInWithEmailLink(String email, String emailLink) async {
    try {
      return await _auth.signInWithEmailLink(
        email: email,
        emailLink: emailLink,
      );
    } catch (e) {
      throw Exception('Erreur lors de la connexion: $e');
    }
  }

  // Sign in with Google
  Future<UserCredential?> signInWithGoogle() async {
    try {
      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        return null; // User cancelled the sign-in
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the credential
      return await _auth.signInWithCredential(credential);
    } catch (e) {
      throw Exception('Erreur lors de la connexion Google: $e');
    }
  }

  // Sign in with Apple
  Future<UserCredential> signInWithApple() async {
    try {
      // Request credentials from Apple
      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      // Create an OAuth credential from the Apple credential
      final oauthCredential = OAuthProvider('apple.com').credential(
        idToken: appleCredential.identityToken,
        accessToken: appleCredential.authorizationCode,
      );

      // Sign in to Firebase with the credential
      return await _auth.signInWithCredential(oauthCredential);
    } catch (e) {
      throw Exception('Erreur lors de la connexion Apple: $e');
    }
  }

  // Sign out
  Future<void> signOut() async {
    try {
      await Future.wait([
        _auth.signOut(),
        _googleSignIn.signOut(),
      ]);
    } catch (e) {
      throw Exception('Erreur lors de la déconnexion: $e');
    }
  }
}
