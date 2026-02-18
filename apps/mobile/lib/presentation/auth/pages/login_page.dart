import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/auth_cubit.dart';
import '../widgets/two_factor_auth_dialog.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool _showPassword = false;
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  static double _horizontalPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 360) return 16;
    if (width < 600) return 24;
    return 32;
  }

  static double _verticalPadding(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height;
    if (height < 600) return 12;
    return 16;
  }

  static double _logoHeight(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 360) return 72;
    if (width < 600) return 88;
    return 104;
  }

  static double _maxContentWidth(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    if (width < 600) return double.infinity;
    return 440;
  }

  static EdgeInsets _formPadding(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final h = width < 360 ? 16.0 : (width < 600 ? 20.0 : 24.0);
    final v = width < 360 ? 20.0 : 24.0;
    return EdgeInsets.symmetric(horizontal: h, vertical: v);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _submit() {
    context.read<AuthCubit>().login(
          _emailController.text,
          _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final paddingH = _horizontalPadding(context);
    final paddingV = _verticalPadding(context);
    final logoHeight = _logoHeight(context);
    final maxW = _maxContentWidth(context);
    final formPadding = _formPadding(context);

    return BlocConsumer<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthRequires2FA) {
          showDialog<void>(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => TwoFactorAuthDialog(
              email: state.email,
              tempToken: state.tempToken,
              onClose: () {
                Navigator.of(ctx).pop();
                context.read<AuthCubit>().cancel2FA();
              },
            ),
          );
        }
        // AuthGate rebuilds to show home when state is AuthAuthenticated
        if (state is AuthError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      buildWhen: (prev, curr) =>
          curr is AuthLoading || curr is AuthInitial || curr is AuthUnauthenticated || curr is AuthError,
      builder: (context, state) {
        final isLoading = state is AuthLoading;

        return Scaffold(
          body: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  colorScheme.surface,
                  colorScheme.surfaceVariant.withOpacity(0.9),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: EdgeInsets.symmetric(
                    horizontal: paddingH,
                    vertical: paddingV,
                  ),
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: maxW),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Image.asset(
                          'assets/images/LOGO_BLUE.png',
                          height: logoHeight,
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => Icon(
                            Icons.image_not_supported_outlined,
                            size: logoHeight,
                            color: colorScheme.outline,
                          ),
                        ),
                        SizedBox(height: MediaQuery.sizeOf(context).height < 600 ? 24 : 32),
                        Padding(
                          padding: formPadding,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Text(
                                'Login with your Google account or email',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w500,
                                ),
                                textAlign: TextAlign.center,
                              ),
                              const SizedBox(height: 16),
                              OutlinedButton.icon(
                                onPressed: isLoading ? null : () {},
                                icon: const Icon(Icons.g_mobiledata),
                                label: const Text('Login with Google'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                              const SizedBox(height: 20),
                              Row(
                                children: [
                                  Expanded(
                                    child: Divider(
                                      color: theme.dividerColor.withOpacity(0.6),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    'Or continue with',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Divider(
                                      color: theme.dividerColor.withOpacity(0.6),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 20),
                              TextField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                autocorrect: false,
                                enabled: !isLoading,
                                decoration: const InputDecoration(
                                  labelText: 'Email',
                                  hintText: 'm@example.com',
                                ),
                              ),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Password',
                                    style: theme.textTheme.bodySmall,
                                  ),
                                  TextButton(
                                    onPressed: isLoading ? null : () {},
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: const Size(0, 0),
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text(
                                      'Forgot your password?',
                                      style: theme.textTheme.bodySmall?.copyWith(
                                        color: colorScheme.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              TextField(
                                controller: _passwordController,
                                obscureText: !_showPassword,
                                enabled: !isLoading,
                                decoration: InputDecoration(
                                  hintText: 'Enter your password',
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _showPassword ? Icons.visibility_off : Icons.visibility,
                                    ),
                                    onPressed: () {
                                      setState(() => _showPassword = !_showPassword);
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(height: 24),
                              SizedBox(
                                width: double.infinity,
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(minHeight: 48),
                                  child: ElevatedButton(
                                    onPressed: isLoading ? null : _submit,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: colorScheme.primary,
                                      padding: const EdgeInsets.symmetric(vertical: 14),
                                    ),
                                    child: Text(
                                      isLoading ? 'Logging in...' : 'Login',
                                      style: const TextStyle(color: Colors.white),
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                "Don't have an account? Contact your administrator",
                                style: theme.textTheme.bodySmall?.copyWith(
                                  color: theme.textTheme.bodySmall?.color?.withOpacity(0.7),
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
