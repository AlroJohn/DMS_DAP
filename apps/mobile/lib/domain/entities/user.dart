import 'package:equatable/equatable.dart';

/// Domain entity for the authenticated user.
/// Matches backend GET /api/auth/me and login response shape.
class User extends Equatable {
  const User({
    required this.id,
    required this.accountId,
    required this.email,
    this.name,
    required this.departmentId,
    this.permissions = const [],
    this.roles = const [],
    this.firstName,
    this.lastName,
    this.active = true,
  });

  final String id;
  final String accountId;
  final String email;
  final String? name;
  final String departmentId;
  final List<String> permissions;
  final List<Role> roles;
  final String? firstName;
  final String? lastName;
  final bool active;

  @override
  List<Object?> get props => [id, accountId, email, departmentId];
}

class Role extends Equatable {
  const Role({
    required this.roleId,
    required this.name,
    required this.code,
  });

  final String roleId;
  final String name;
  final String code;

  @override
  List<Object?> get props => [roleId, code];
}
