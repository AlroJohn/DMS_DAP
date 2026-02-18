import '../../domain/entities/auth_result.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/local/secure_token_storage.dart';
import '../datasources/remote/auth_api.dart';
import '../dto/auth_dto.dart';

class AuthRepositoryImpl implements AuthRepository {
  AuthRepositoryImpl({
    required AuthApi authApi,
    required SecureTokenStorage tokenStorage,
  })  : _api = authApi,
        _storage = tokenStorage;

  final AuthApi _api;
  final SecureTokenStorage _storage;

  @override
  Future<LoginResult> login(String email, String password) async {
    final json = await _api.login(email, password);
    final success = json['success'] as bool? ?? false;
    final data = json['data'] as Map<String, dynamic>?;
    if (data == null) {
      throw AuthException(_extractMessage(json));
    }
    final dto = LoginDataDto.fromJson(data);
    if (dto.requires2FA == true && dto.tempToken != null && dto.email != null) {
      return LoginRequires2FA(email: dto.email!, tempToken: dto.tempToken!);
    }
    if (success && dto.user != null) {
      final user = _userFromJson(dto.user!);
      final token = dto.token;
      final refreshToken = dto.refreshToken;
      if (token != null && refreshToken != null) {
        await _storage.saveTokens(accessToken: token, refreshToken: refreshToken);
      }
      return LoginSuccess(AuthResult(user: user, token: token, refreshToken: refreshToken));
    }
    throw AuthException(_extractMessage(json));
  }

  @override
  Future<AuthResult> verify2FA(String email, String tempToken, String code) async {
    final json = await _api.verify2FA(email, tempToken, code);
    final success = json['success'] as bool? ?? false;
    final data = json['data'] as Map<String, dynamic>?;
    if (!success || data == null) {
      throw AuthException(_extractMessage(json));
    }
    final userJson = data['user'] as Map<String, dynamic>?;
    final token = data['token'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (userJson == null) {
      throw AuthException('User not returned');
    }
    final user = _userFromJson(userJson);
    if (token != null && refreshToken != null) {
      await _storage.saveTokens(accessToken: token, refreshToken: refreshToken);
    }
    return AuthResult(user: user, token: token, refreshToken: refreshToken);
  }

  @override
  Future<void> send2FACode(String email, String tempToken) async {
    await _api.send2FACode(email, tempToken);
  }

  @override
  Future<AuthResult> refreshTokens() async {
    final refresh = await _storage.getRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      throw AuthException('No refresh token');
    }
    final json = await _api.refresh(refresh);
    final success = json['success'] as bool? ?? false;
    final data = json['data'] as Map<String, dynamic>?;
    if (!success || data == null) {
      await _storage.clearTokens();
      throw AuthException(_extractMessage(json));
    }
    final token = data['token'] as String?;
    final refreshToken = data['refreshToken'] as String?;
    if (token == null || refreshToken == null) {
      throw AuthException('Tokens not returned');
    }
    await _storage.saveTokens(accessToken: token, refreshToken: refreshToken);
    final user = await getCurrentUser();
    if (user == null) {
      throw AuthException('Could not load user after refresh');
    }
    return AuthResult(user: user, token: token, refreshToken: refreshToken);
  }

  @override
  Future<void> logout() async {
    try {
      await _api.logout();
    } catch (_) {
      // Best effort; clear local state anyway
    }
    await _storage.clearTokens();
  }

  @override
  Future<User?> getCurrentUser() async {
    try {
      final json = await _api.getMe();
      final success = json['success'] as bool? ?? false;
      final data = json['data'] as Map<String, dynamic>?;
      if (!success || data == null) return null;
      return _userFromJson(data);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<bool> hasStoredTokens() => _storage.hasTokens();

  User _userFromJson(Map<String, dynamic> json) {
    final dto = UserDto.fromJson(json);
    final roles = <Role>[];
    if (dto.roles != null) {
      for (final r in dto.roles!) {
        if (r is Map<String, dynamic>) {
          roles.add(Role(
            roleId: r['role_id'] as String? ?? '',
            name: r['name'] as String? ?? '',
            code: r['code'] as String? ?? '',
          ));
        }
      }
    }
    final permissions = <String>[];
    if (dto.permissions != null) {
      for (final p in dto.permissions!) {
        if (p is String) permissions.add(p);
      }
    }
    return User(
      id: dto.id,
      accountId: dto.accountId,
      email: dto.email,
      name: dto.name ?? '${dto.firstName ?? ''} ${dto.lastName ?? ''}'.trim(),
      departmentId: dto.departmentId ?? '',
      permissions: permissions,
      roles: roles,
      firstName: dto.firstName,
      lastName: dto.lastName,
      active: dto.active ?? true,
    );
  }

  String _extractMessage(Map<String, dynamic> json) {
    final err = json['error'];
    if (err is Map<String, dynamic>) {
      return err['message'] as String? ?? 'Unknown error';
    }
    return json['message'] as String? ?? 'Unknown error';
  }
}

class AuthException implements Exception {
  AuthException(this.message);
  final String message;
  @override
  String toString() => message;
}
