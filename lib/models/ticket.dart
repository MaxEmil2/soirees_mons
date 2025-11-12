import 'package:cloud_firestore/cloud_firestore.dart';

enum TicketStatus {
  pending,
  paid,
  validated,
  cancelled,
  refunded,
}

class Ticket {
  final String id;
  final String userId;
  final String eventId;
  final String eventTitle;
  final DateTime eventDate;
  final double price;
  final TicketStatus status;
  final String qrCodeData;
  final DateTime purchaseDate;
  final String? validatedAt;
  final String? validatedBy;
  final String paymentIntentId;

  Ticket({
    required this.id,
    required this.userId,
    required this.eventId,
    required this.eventTitle,
    required this.eventDate,
    required this.price,
    required this.status,
    required this.qrCodeData,
    required this.purchaseDate,
    this.validatedAt,
    this.validatedBy,
    required this.paymentIntentId,
  });

  // Créer un Ticket depuis un document Firestore
  factory Ticket.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Ticket(
      id: doc.id,
      userId: data['userId'] ?? '',
      eventId: data['eventId'] ?? '',
      eventTitle: data['eventTitle'] ?? '',
      eventDate: (data['eventDate'] as Timestamp).toDate(),
      price: (data['price'] ?? 0).toDouble(),
      status: _statusFromString(data['status'] ?? 'pending'),
      qrCodeData: data['qrCodeData'] ?? '',
      purchaseDate: (data['purchaseDate'] as Timestamp).toDate(),
      validatedAt: data['validatedAt'],
      validatedBy: data['validatedBy'],
      paymentIntentId: data['paymentIntentId'] ?? '',
    );
  }

  // Convertir un Ticket en Map pour Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'eventId': eventId,
      'eventTitle': eventTitle,
      'eventDate': Timestamp.fromDate(eventDate),
      'price': price,
      'status': _statusToString(status),
      'qrCodeData': qrCodeData,
      'purchaseDate': Timestamp.fromDate(purchaseDate),
      'validatedAt': validatedAt,
      'validatedBy': validatedBy,
      'paymentIntentId': paymentIntentId,
    };
  }

  // Convertir string en TicketStatus
  static TicketStatus _statusFromString(String status) {
    switch (status) {
      case 'pending':
        return TicketStatus.pending;
      case 'paid':
        return TicketStatus.paid;
      case 'validated':
        return TicketStatus.validated;
      case 'cancelled':
        return TicketStatus.cancelled;
      case 'refunded':
        return TicketStatus.refunded;
      default:
        return TicketStatus.pending;
    }
  }

  // Convertir TicketStatus en string
  static String _statusToString(TicketStatus status) {
    switch (status) {
      case TicketStatus.pending:
        return 'pending';
      case TicketStatus.paid:
        return 'paid';
      case TicketStatus.validated:
        return 'validated';
      case TicketStatus.cancelled:
        return 'cancelled';
      case TicketStatus.refunded:
        return 'refunded';
    }
  }

  // Vérifier si le ticket est valide
  bool get isValid => status == TicketStatus.paid && validatedAt == null;

  // Vérifier si le ticket a été utilisé
  bool get isUsed => validatedAt != null;

  // Copier avec modifications
  Ticket copyWith({
    String? id,
    String? userId,
    String? eventId,
    String? eventTitle,
    DateTime? eventDate,
    double? price,
    TicketStatus? status,
    String? qrCodeData,
    DateTime? purchaseDate,
    String? validatedAt,
    String? validatedBy,
    String? paymentIntentId,
  }) {
    return Ticket(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      eventId: eventId ?? this.eventId,
      eventTitle: eventTitle ?? this.eventTitle,
      eventDate: eventDate ?? this.eventDate,
      price: price ?? this.price,
      status: status ?? this.status,
      qrCodeData: qrCodeData ?? this.qrCodeData,
      purchaseDate: purchaseDate ?? this.purchaseDate,
      validatedAt: validatedAt ?? this.validatedAt,
      validatedBy: validatedBy ?? this.validatedBy,
      paymentIntentId: paymentIntentId ?? this.paymentIntentId,
    );
  }
}
