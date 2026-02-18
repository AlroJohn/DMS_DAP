import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'core/constants/app_strings.dart';
import 'core/theme/app_theme.dart';
import 'data/datasources/local/secure_token_storage.dart';
import 'data/datasources/remote/auth_api.dart';
import 'data/datasources/remote/document_files_remote.dart';
import 'data/datasources/remote/document_signing_remote.dart';
import 'data/datasources/remote/document_stream_remote.dart';
import 'data/datasources/remote/intransit_remote.dart';
import 'data/datasources/remote/pending_signatures_remote.dart';
import 'data/repositories/auth_repository_impl.dart';
import 'data/repositories/pending_signatures_repository_impl.dart';
import 'domain/repositories/auth_repository.dart';
import 'domain/repositories/pending_signatures_repository.dart';
import 'presentation/auth/cubit/auth_cubit.dart';
import 'presentation/auth/pages/auth_gate.dart';

void main() {
  final tokenStorage = SecureTokenStorage();
  final authApi = AuthApi(tokenStorage: tokenStorage);
  final AuthRepository authRepository = AuthRepositoryImpl(
    authApi: authApi,
    tokenStorage: tokenStorage,
  );
  final authCubit = AuthCubit(authRepository);

  final pendingSignaturesRemote = PendingSignaturesRemote(authApi.dio);
  final PendingSignaturesRepository pendingSignaturesRepository =
      PendingSignaturesRepositoryImpl(pendingSignaturesRemote);

  final documentStreamRemote = DocumentStreamRemote(authApi.dio);
  final documentFilesRemote = DocumentFilesRemote(authApi.dio);
  final documentSigningRemote = DocumentSigningRemote(authApi.dio);
  final intransitRemote = IntransitRemote(authApi.dio);

  runApp(
    BlocProvider<AuthCubit>.value(
      value: authCubit,
      child: RepositoryProvider<DocumentStreamRemote>.value(
        value: documentStreamRemote,
        child: RepositoryProvider<DocumentFilesRemote>.value(
          value: documentFilesRemote,
          child: RepositoryProvider<DocumentSigningRemote>.value(
            value: documentSigningRemote,
            child: RepositoryProvider<IntransitRemote>.value(
              value: intransitRemote,
              child: RepositoryProvider<PendingSignaturesRepository>.value(
                value: pendingSignaturesRepository,
                child: MaterialApp(
                debugShowCheckedModeBanner: false,
                title: AppStrings.appTitle,
                theme: AppTheme.light,
                darkTheme: AppTheme.dark,
                home: const AuthGate(),
              ),
            ),
          ),
          ),
        ),
      ),
    ),
  );
}
