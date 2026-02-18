import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/theme/app_theme.dart';
import 'data/datasources/local/secure_token_storage.dart';
import 'data/datasources/remote/auth_api.dart';
import 'data/repositories/auth_repository_impl.dart';
import 'domain/repositories/auth_repository.dart';
import 'presentation/auth/cubit/auth_cubit.dart';
import 'presentation/auth/pages/auth_gate.dart';
import 'core/constants/app_strings.dart';

void main() {
  final tokenStorage = SecureTokenStorage();
  final authApi = AuthApi(tokenStorage: tokenStorage);
  final AuthRepository authRepository = AuthRepositoryImpl(
    authApi: authApi,
    tokenStorage: tokenStorage,
  );
  final authCubit = AuthCubit(authRepository);

  runApp(
    BlocProvider<AuthCubit>.value(
      value: authCubit,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        title: AppStrings.appTitle,
        theme: AppTheme.light,
        darkTheme: AppTheme.dark,
        home: const AuthGate(),
      ),
    ),
  );
}
