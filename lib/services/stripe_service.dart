import 'package:flutter_stripe/flutter_stripe.dart';

class StripeService {
  static Future<void> initializePaymentSheet({
    required String customerId,
    required String ephemeralKey,
    required String paymentIntentClientSecret,
  }) async {
    try {
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          merchantDisplayName: 'Soirées Mons',
          customerId: customerId,
          customerEphemeralKeySecret: ephemeralKey,
          paymentIntentClientSecret: paymentIntentClientSecret,
          style: ThemeMode.dark,
          appearance: PaymentSheetAppearance(
            colors: PaymentSheetAppearanceColors(
              primary: const Color(0xFFFFD700),
              background: const Color(0xFF1A1A1A),
            ),
          ),
        ),
      );
    } catch (e) {
      throw Exception('Erreur lors de l\'initialisation du paiement: $e');
    }
  }

  static Future<void> presentPaymentSheet() async {
    try {
      await Stripe.instance.presentPaymentSheet();
    } catch (e) {
      if (e is StripeException) {
        throw Exception('Paiement annulé ou échoué: ${e.error.localizedMessage}');
      } else {
        throw Exception('Erreur lors du paiement: $e');
      }
    }
  }

  static Future<Map<String, dynamic>> createPaymentIntent({
    required int amount,
    required String currency,
  }) async {
    // Cette fonction doit appeler votre backend pour créer un PaymentIntent
    // Exemple de structure de retour:
    // {
    //   'paymentIntent': 'pi_xxx',
    //   'ephemeralKey': 'ek_xxx',
    //   'customer': 'cus_xxx',
    //   'publishableKey': 'pk_xxx'
    // }

    // TODO: Implémenter l'appel à votre backend
    throw UnimplementedError('Vous devez implémenter l\'appel à votre backend');
  }

  static Future<void> processPayment({
    required int amount,
    required String eventId,
    required String userId,
  }) async {
    try {
      // 1. Créer le PaymentIntent via le backend
      final paymentData = await createPaymentIntent(
        amount: amount,
        currency: 'eur',
      );

      // 2. Initialiser le Payment Sheet
      await initializePaymentSheet(
        customerId: paymentData['customer'],
        ephemeralKey: paymentData['ephemeralKey'],
        paymentIntentClientSecret: paymentData['paymentIntent'],
      );

      // 3. Présenter le Payment Sheet
      await presentPaymentSheet();

      // 4. Si succès, créer le ticket dans Firestore
      // TODO: Implémenter la création du ticket
    } catch (e) {
      rethrow;
    }
  }
}
