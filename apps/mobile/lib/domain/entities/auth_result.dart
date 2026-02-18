import 'package:equatable/equatable.dart';

import 'user.dart';

/// Result of a successful login (user + tokens for mobile).
class AuthResult extends Equatable {
  const AuthResult({
    required this.user,
    this.token,
    this.refreshToken,
  });

  final User user;
  final String? token;
  final String? refreshToken;

  @override
  List<Object?> get props => [user, token, refreshToken];
}

/// Indicates that 2FA is required; holds tempToken and email for verify step.
class Requires2FA extends Equatable {
  const Requires2FA({
    required this.email,
    required this.tempToken,
  });

  final String email;
  final String tempToken;

  @override
  List<Object?> get props => [email, tempToken];
}
