import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../cubit/auth_cubit.dart';

class TwoFactorAuthDialog extends StatefulWidget {
  const TwoFactorAuthDialog({
    super.key,
    required this.email,
    required this.tempToken,
    required this.onClose,
  });

  final String email;
  final String tempToken;
  final VoidCallback onClose;

  @override
  State<TwoFactorAuthDialog> createState() => _TwoFactorAuthDialogState();
}

class _TwoFactorAuthDialogState extends State<TwoFactorAuthDialog> {
  final List<TextEditingController> _controllers = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _resendCooldown = 0;

  @override
  void initState() {
    super.initState();
    _requestSendCode();
  }

  Future<void> _requestSendCode() async {
    context.read<AuthCubit>().send2FACode(widget.email, widget.tempToken);
    setState(() => _resendCooldown = 60);
    for (var t = 60; t > 0 && mounted; t--) {
      await Future<void>.delayed(const Duration(seconds: 1));
      if (!mounted) {
        return;
      }
      setState(() => _resendCooldown = t - 1);
    }
  }

  void _verify() {
    final code = _controllers.map((c) => c.text).join();
    if (code.length != 6) return;
    context.read<AuthCubit>().verify2FA(widget.email, widget.tempToken, code);
  }

  @override
  void dispose() {
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return BlocListener<AuthCubit, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          Navigator.of(context).pop();
        }
      },
      child: AlertDialog(
      title: const Text('Two-factor authentication'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Enter the 6-digit code sent to ${widget.email}',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: List.generate(6, (i) {
                return SizedBox(
                  width: 40,
                  child: TextField(
                    controller: _controllers[i],
                    focusNode: _focusNodes[i],
                    keyboardType: TextInputType.number,
                    maxLength: 1,
                    textAlign: TextAlign.center,
                    onChanged: (v) {
                      if (v.isNotEmpty && i < 5) {
                        _focusNodes[i + 1].requestFocus();
                      } else if (v.isEmpty && i > 0) {
                        _focusNodes[i - 1].requestFocus();
                      }
                      if (_controllers.every((c) => c.text.length == 1)) {
                        _verify();
                      }
                    },
                    decoration: const InputDecoration(
                      counterText: '',
                      contentPadding: EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                );
              }),
            ),
            const SizedBox(height: 16),
            if (_resendCooldown > 0)
              Text(
                'Resend code in $_resendCooldown s',
                style: theme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              )
            else
              TextButton(
                onPressed: _requestSendCode,
                child: const Text('Resend code'),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: widget.onClose,
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: () {
            final code = _controllers.map((c) => c.text).join();
            if (code.length == 6) _verify();
          },
          child: const Text('Verify'),
        ),
      ],
    )
    );
  }
}
