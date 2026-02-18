import '../entities/auth_result.dart';
import '../entities/user.dart';

/// Result of login: either success with tokens, or 2FA required.
sealed class LoginResult {}

class LoginSuccess extends LoginResult {
  LoginSuccess(this.result);
  final AuthResult result;
}

class LoginRequires2FA extends LoginResult {
  LoginRequires2FA({required this.email, required this.tempToken});
  final String email;
  final String tempToken;
}

/// Contract for authentication operations.
abstract class AuthRepository {
  /// Login with email and password.
  /// Returns [LoginSuccess] with user and tokens, or [LoginRequires2FA].
  Future<LoginResult> login(String email, String password);

  /// Verify 2FA code and complete login. Returns [AuthResult] with user and tokens.
  Future<AuthResult> verify2FA(String email, String tempToken, String code);

  /// Send 2FA code to email (e.g. resend).
  Future<void> send2FACode(String email, String tempToken);

  /// Refresh access and refresh tokens using stored refresh token.
  Future<AuthResult> refreshTokens();

  /// Logout: invalidate session on server and clear stored tokens.
  Future<void> logout();

  /// Get current user from API using stored access token.
  /// Returns null if not authenticated or token invalid.
  Future<User?> getCurrentUser();

  /// Check if we have stored tokens (quick check without network).
  Future<bool> hasStoredTokens();
}
