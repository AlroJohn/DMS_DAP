import 'package:dio/dio.dart';

import '../../../../core/config/env.dart';
import '../local/secure_token_storage.dart';

/// API client for auth endpoints. Sets X-Client: mobile and handles Bearer token + refresh.
class AuthApi {
  AuthApi({
    required this.tokenStorage,
    Dio? dio,
  }) : _dio = dio ?? Dio() {
    _dio.options.baseUrl = apiBaseUrl;
    _dio.options.headers['X-Client'] = 'mobile';
    _dio.options.headers['Accept'] = 'application/json';
    _dio.options.headers['Content-Type'] = 'application/json';
    _dio.interceptors.add(_AuthInterceptor(tokenStorage: tokenStorage, authApi: this));
  }

  final SecureTokenStorage tokenStorage;
  final Dio _dio;

  Dio get dio => _dio;

  /// POST /api/auth/login
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/auth/login',
      data: {'email': email, 'password': password},
    );
    return response.data!;
  }

  /// POST /api/auth/2fa/verify
  Future<Map<String, dynamic>> verify2FA(String email, String tempToken, String code) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/auth/2fa/verify',
      data: {'email': email, 'tempToken': tempToken, 'code': code},
    );
    return response.data!;
  }

  /// POST /api/auth/2fa/send-code
  Future<void> send2FACode(String email, String tempToken) async {
    await _dio.post(
      '/api/auth/2fa/send-code',
      data: {'email': email, 'tempToken': tempToken},
    );
  }

  /// POST /api/auth/refresh (body: refreshToken for mobile)
  Future<Map<String, dynamic>> refresh(String refreshToken) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/api/auth/refresh',
      data: {'refreshToken': refreshToken},
    );
    return response.data!;
  }

  /// POST /api/auth/logout (Bearer token in header)
  Future<void> logout() async {
    await _dio.post('/api/auth/logout');
  }

  /// GET /api/auth/me
  Future<Map<String, dynamic>> getMe() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/auth/me');
    return response.data!;
  }
}

/// Injects Bearer token and retries on 401 with refresh.
class _AuthInterceptor extends Interceptor {
  _AuthInterceptor({required this.tokenStorage, required this.authApi});

  final SecureTokenStorage tokenStorage;
  final AuthApi authApi;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    if (options.path.contains('/api/auth/login') ||
        options.path.contains('/api/auth/refresh') ||
        options.path.contains('/api/auth/2fa/')) {
      handler.next(options);
      return;
    }
    final token = await tokenStorage.getAccessToken();
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      handler.next(err);
      return;
    }
    final request = err.requestOptions;
    if (request.path.contains('/api/auth/refresh')) {
      await tokenStorage.clearTokens();
      handler.next(err);
      return;
    }
    final refresh = await tokenStorage.getRefreshToken();
    if (refresh == null || refresh.isEmpty) {
      handler.next(err);
      return;
    }
    try {
      final data = await authApi.refresh(refresh);
      final success = data['success'] as bool? ?? false;
      final newToken = data['data'] is Map ? (data['data'] as Map)['token'] as String? : null;
      final newRefresh = data['data'] is Map ? (data['data'] as Map)['refreshToken'] as String? : null;
      if (success && newToken != null && newRefresh != null) {
        await tokenStorage.saveTokens(accessToken: newToken, refreshToken: newRefresh);
        request.headers['Authorization'] = 'Bearer $newToken';
        final response = await authApi.dio.fetch(request);
        handler.resolve(response);
        return;
      }
    } catch (_) {
      await tokenStorage.clearTokens();
    }
    handler.next(err);
  }
}
