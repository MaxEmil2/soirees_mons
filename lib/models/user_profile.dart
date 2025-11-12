import 'package:cloud_firestore/cloud_firestore.dart';

class UserProfile {
  final String id;
  final String email;
  final String? displayName;
  final String? phoneNumber;
  final String? photoUrl;
  final DateTime createdAt;
  final DateTime? lastLogin;
  final List<String> purchasedTickets;
  final bool isAdmin;

  UserProfile({
    required this.id,
    required this.email,
    this.displayName,
    this.phoneNumber,
    this.photoUrl,
    required this.createdAt,
    this.lastLogin,
    this.purchasedTickets = const [],
    this.isAdmin = false,
  });

  // Créer un UserProfile depuis un document Firestore
  factory UserProfile.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return UserProfile(
      id: doc.id,
      email: data['email'] ?? '',
      displayName: data['displayName'],
      phoneNumber: data['phoneNumber'],
      photoUrl: data['photoUrl'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      lastLogin: data['lastLogin'] != null
          ? (data['lastLogin'] as Timestamp).toDate()
          : null,
      purchasedTickets: List<String>.from(data['purchasedTickets'] ?? []),
      isAdmin: data['isAdmin'] ?? false,
    );
  }

  // Convertir un UserProfile en Map pour Firestore
  Map<String, dynamic> toFirestore() {
    return {
      'email': email,
      'displayName': displayName,
      'phoneNumber': phoneNumber,
      'photoUrl': photoUrl,
      'createdAt': Timestamp.fromDate(createdAt),
      'lastLogin': lastLogin != null ? Timestamp.fromDate(lastLogin!) : null,
      'purchasedTickets': purchasedTickets,
      'isAdmin': isAdmin,
    };
  }

  // Copier avec modifications
  UserProfile copyWith({
    String? id,
    String? email,
    String? displayName,
    String? phoneNumber,
    String? photoUrl,
    DateTime? createdAt,
    DateTime? lastLogin,
    List<String>? purchasedTickets,
    bool? isAdmin,
  }) {
    return UserProfile(
      id: id ?? this.id,
      email: email ?? this.email,
      displayName: displayName ?? this.displayName,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      photoUrl: photoUrl ?? this.photoUrl,
      createdAt: createdAt ?? this.createdAt,
      lastLogin: lastLogin ?? this.lastLogin,
      purchasedTickets: purchasedTickets ?? this.purchasedTickets,
      isAdmin: isAdmin ?? this.isAdmin,
    );
  }
}
