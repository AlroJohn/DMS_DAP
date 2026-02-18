/// Backend success response: { success: true, data: T }
class ApiResponse<T> {
  ApiResponse({required this.success, this.data, this.error});
  final bool success;
  final T? data;
  final ApiError? error;

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic)? fromJsonData) {
    return ApiResponse(
      success: json['success'] as bool? ?? false,
      data: json['data'] != null && fromJsonData != null ? fromJsonData(json['data']) : json['data'] as T?,
      error: json['error'] != null ? ApiError.fromJson(json['error'] as Map<String, dynamic>) : null,
    );
  }
}

class ApiError {
  ApiError({required this.message, this.code});
  final String message;
  final String? code;

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      message: json['message'] as String? ?? 'Unknown error',
      code: json['code'] as String?,
    );
  }
}

/// User as returned by backend (GET /api/auth/me and login).
class UserDto {
  UserDto({
    required this.id,
    required this.accountId,
    required this.email,
    this.name,
    this.departmentId,
    this.permissions,
    this.roles,
    this.firstName,
    this.lastName,
    this.active,
  });

  final String id;
  final String accountId;
  final String email;
  final String? name;
  final String? departmentId;
  final List<dynamic>? permissions;
  final List<dynamic>? roles;
  final String? firstName;
  final String? lastName;
  final bool? active;

  factory UserDto.fromJson(Map<String, dynamic> json) {
    return UserDto(
      id: json['id'] as String? ?? json['user_id'] as String? ?? '',
      accountId: json['accountId'] as String? ?? json['account_id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      name: json['name'] as String?,
      departmentId: json['department_id'] as String?,
      permissions: json['permissions'] as List<dynamic>?,
      roles: json['roles'] as List<dynamic>?,
      firstName: json['first_name'] as String?,
      lastName: json['last_name'] as String?,
      active: json['active'] as bool? ?? true,
    );
  }
}

/// Login success response data (mobile: includes token, refreshToken).
class LoginDataDto {
  LoginDataDto({
    this.user,
    this.token,
    this.refreshToken,
    this.requires2FA,
    this.tempToken,
    this.email,
    this.message,
  });

  final Map<String, dynamic>? user;
  final String? token;
  final String? refreshToken;
  final bool? requires2FA;
  final String? tempToken;
  final String? email;
  final String? message;

  factory LoginDataDto.fromJson(Map<String, dynamic> json) {
    return LoginDataDto(
      user: json['user'] as Map<String, dynamic>?,
      token: json['token'] as String?,
      refreshToken: json['refreshToken'] as String?,
      requires2FA: json['requires2FA'] as bool?,
      tempToken: json['tempToken'] as String?,
      email: json['email'] as String?,
      message: json['message'] as String?,
    );
  }
}
