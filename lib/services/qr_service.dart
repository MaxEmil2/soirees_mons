import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/material.dart';

class QRService {
  /// Génère un widget QR code pour un ticket
  static Widget generateQRCode({
    required String data,
    double size = 200,
    Color color = Colors.black,
    Color backgroundColor = Colors.white,
  }) {
    return QrImageView(
      data: data,
      version: QrVersions.auto,
      size: size,
      gapless: false,
      errorStateBuilder: (cxt, err) {
        return Container(
          width: size,
          height: size,
          color: Colors.red.withOpacity(0.1),
          child: const Center(
            child: Text(
              'Erreur QR Code',
              style: TextStyle(color: Colors.red),
            ),
          ),
        );
      },
    );
  }

  /// Génère les données du QR code pour un ticket
  static String generateTicketData({
    required String ticketId,
    required String userId,
    required String eventId,
  }) {
    // Format: TICKET_ID|USER_ID|EVENT_ID|TIMESTAMP
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    return '$ticketId|$userId|$eventId|$timestamp';
  }

  /// Vérifie si un QR code de ticket est valide
  static bool validateTicketData(String data) {
    try {
      final parts = data.split('|');
      if (parts.length != 4) return false;

      // Vérifier que toutes les parties sont présentes
      if (parts[0].isEmpty || parts[1].isEmpty || parts[2].isEmpty) {
        return false;
      }

      // Vérifier que le timestamp est valide
      final timestamp = int.tryParse(parts[3]);
      if (timestamp == null) return false;

      return true;
    } catch (e) {
      return false;
    }
  }

  /// Parse les données d'un QR code de ticket
  static Map<String, String>? parseTicketData(String data) {
    try {
      final parts = data.split('|');
      if (parts.length != 4) return null;

      return {
        'ticketId': parts[0],
        'userId': parts[1],
        'eventId': parts[2],
        'timestamp': parts[3],
      };
    } catch (e) {
      return null;
    }
  }
}
