import 'package:cloud_firestore/cloud_firestore.dart';

class Event {
  final String id;
  final String title;
  final String description;
  final String location;
  final DateTime date;
  final double price;
  final String imageUrl;
  final int totalTickets;
  final int soldTickets;
  final List<String> categories;
  final DateTime createdAt;
  final bool isActive;

  Event({
    required this.id,
    required this.title,
    required this.description,
    required this.location,
    required this.date,
    required this.price,
    required this.imageUrl,
    required this.totalTickets,
    required this.soldTickets,
    required this.categories,
    required this.createdAt,
    this.isActive = true,
  });

  // Créer un Event depuis un document Firestore
  factory Event.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Event(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      location: data['location'] ?? '',
      date: (data['date'] as Timestamp).toDate(),
      price: (data['price'] ?? 0).toDouble(),
      imageUrl: data['imageUrl'] ?? '',
      totalTickets: data['totalTickets'] ?? 0,
      soldTickets: data['soldTickets'] ?? 0,
      categories: List<String>.from(data['categories'] ?? []),
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      isActive: data['isActive'] ?? true,
    );
  }

  // Convertir un Event en Map pour Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'location': location,
      'date': Timestamp.fromDate(date),
      'price': price,
      'imageUrl': imageUrl,
      'totalTickets': totalTickets,
      'soldTickets': soldTickets,
      'categories': categories,
      'createdAt': Timestamp.fromDate(createdAt),
      'isActive': isActive,
    };
  }

  // Vérifier si des billets sont disponibles
  bool get hasAvailableTickets => soldTickets < totalTickets;

  // Nombre de billets disponibles
  int get availableTickets => totalTickets - soldTickets;

  // Copier avec modifications
  Event copyWith({
    String? id,
    String? title,
    String? description,
    String? location,
    DateTime? date,
    double? price,
    String? imageUrl,
    int? totalTickets,
    int? soldTickets,
    List<String>? categories,
    DateTime? createdAt,
    bool? isActive,
  }) {
    return Event(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      location: location ?? this.location,
      date: date ?? this.date,
      price: price ?? this.price,
      imageUrl: imageUrl ?? this.imageUrl,
      totalTickets: totalTickets ?? this.totalTickets,
      soldTickets: soldTickets ?? this.soldTickets,
      categories: categories ?? this.categories,
      createdAt: createdAt ?? this.createdAt,
      isActive: isActive ?? this.isActive,
    );
  }
}
