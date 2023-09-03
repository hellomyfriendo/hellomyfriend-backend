import 'package:equatable/equatable.dart';

class User extends Equatable {
  const User({
    required this.id,
    this.displayName,
    this.photoURL,
  });

  final String id;

  final String? displayName;

  final String? photoURL;

  static const empty = User(id: '');

  bool get isEmpty => this == User.empty;

  @override
  List<Object?> get props => [id, displayName, photoURL];
}
