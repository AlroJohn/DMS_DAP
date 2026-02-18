import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/user.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../data/repositories/auth_repository_impl.dart';

sealed class AuthState {}

class AuthInitial extends AuthState {}

class AuthLoading extends AuthState {}

class AuthAuthenticated extends AuthState {
  AuthAuthenticated(this.user);
  final User user;
}

class AuthUnauthenticated extends AuthState {}

class AuthRequires2FA extends AuthState {
  AuthRequires2FA({required this.email, required this.tempToken});
  final String email;
  final String tempToken;
}

class AuthError extends AuthState {
  AuthError(this.message);
  final String message;
}

class AuthCubit extends Cubit<AuthState> {
  AuthCubit(this._repository) : super(AuthInitial());

  final AuthRepository _repository;

  Future<void> checkAuth() async {
    final hasTokens = await _repository.hasStoredTokens();
    if (!hasTokens) {
      emit(AuthUnauthenticated());
      return;
    }
    emit(AuthLoading());
    try {
      final user = await _repository.getCurrentUser();
      if (user != null) {
        emit(AuthAuthenticated(user));
      } else {
        await _repository.logout();
        emit(AuthUnauthenticated());
      }
    } catch (_) {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> login(String email, String password) async {
    if (email.trim().isEmpty || password.isEmpty) {
      emit(AuthError('Please enter email and password'));
      return;
    }
    emit(AuthLoading());
    try {
      final result = await _repository.login(email.trim(), password);
      if (result is LoginSuccess) {
        emit(AuthAuthenticated(result.result.user));
      } else if (result is LoginRequires2FA) {
        emit(AuthRequires2FA(email: result.email, tempToken: result.tempToken));
      }
    } on AuthException catch (e) {
      emit(AuthError(_mapErrorMessage(e.message)));
    } catch (e) {
      emit(AuthError('Unable to connect. Please check your connection and try again.'));
    }
  }

  Future<void> verify2FA(String email, String tempToken, String code) async {
    if (code.length != 6) {
      emit(AuthError('Please enter the 6-digit code'));
      return;
    }
    emit(AuthLoading());
    try {
      final result = await _repository.verify2FA(email, tempToken, code);
      emit(AuthAuthenticated(result.user));
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    } catch (e) {
      emit(AuthError('Verification failed. Please try again.'));
    }
  }

  Future<void> send2FACode(String email, String tempToken) async {
    try {
      await _repository.send2FACode(email, tempToken);
    } on AuthException catch (e) {
      emit(AuthError(e.message));
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } catch (_) {}
    emit(AuthUnauthenticated());
  }

  void clearError() {
    if (state is AuthError) {
      emit(AuthUnauthenticated());
    }
  }

  /// Call when user cancels 2FA dialog.
  void cancel2FA() {
    if (state is AuthRequires2FA) {
      emit(AuthUnauthenticated());
    }
  }

  /// Map backend error messages to user-facing text (parity with web).
  String _mapErrorMessage(String backendMessage) {
    final m = backendMessage.toLowerCase();
    if (m.contains('invalid email or password') || m.contains('invalid credentials')) {
      return 'The email or password you entered is incorrect. Please try again.';
    }
    if (m.contains('social login') || m.contains('google')) {
      return 'This account uses Google sign-in. Please use "Login with Google".';
    }
    if (m.contains('user profile not found')) {
      return 'User profile not found. Please contact your administrator.';
    }
    if (m.contains('already in use') || m.contains('another device')) {
      return 'This account is already logged in on another device. Please log out there first.';
    }
    if (m.contains('two-factor') || m.contains('2fa')) {
      return 'Two-factor authentication required. Please check your email for the code.';
    }
    return backendMessage;
  }
}
