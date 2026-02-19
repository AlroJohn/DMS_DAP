import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_strings.dart';
import '../../../domain/entities/user.dart';
import '../../auth/cubit/auth_cubit.dart';

/// Dashboard tab: logged-in account at top, quick actions in a two-column grid.
class HomeDashboardPage extends StatelessWidget {
  const HomeDashboardPage({
    super.key,
    required this.onNavigateToIndex,
  });

  /// Called with the bottom nav index to switch to (1 = In Transit, 2 = Pending Signatures, 3 = Signed).
  final void Function(int index) onNavigateToIndex;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return BlocBuilder<AuthCubit, dynamic>(
      builder: (context, authState) {
        User? user;
        if (authState is AuthAuthenticated) {
          user = authState.user;
        }
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _LoggedInCard(
                user: user,
                onLogout: () => context.read<AuthCubit>().logout(),
              ),
              const SizedBox(height: 24),
              Text(
                'Quick actions',
                style: theme.textTheme.titleMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 0.95,
                children: [
                  _QuickActionCard(
                    icon: Icons.local_shipping_outlined,
                    label: AppStrings.tabInTransit,
                    onTap: () => onNavigateToIndex(1),
                  ),
                  _QuickActionCard(
                    icon: Icons.pending_actions,
                    label: AppStrings.tabPendingSignatures,
                    onTap: () => onNavigateToIndex(2),
                  ),
                  _QuickActionCard(
                    icon: Icons.done_all,
                    label: AppStrings.tabSignedDocuments,
                    onTap: () => onNavigateToIndex(3),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}

class _LoggedInCard extends StatelessWidget {
  const _LoggedInCard({this.user, required this.onLogout});

  final User? user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final name = user != null
        ? (user!.name?.isNotEmpty == true
            ? user!.name!
            : [user!.firstName, user!.lastName].where((e) => e != null && e.toString().isNotEmpty).join(' '))
        : null;
    final displayName = (name != null && name.isNotEmpty) ? name : 'Signed in';
    final email = user?.email ?? '';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: theme.colorScheme.primaryContainer,
              child: Text(
                displayName.isNotEmpty ? displayName[0].toUpperCase() : '?',
                style: theme.textTheme.titleLarge?.copyWith(
                  color: theme.colorScheme.onPrimaryContainer,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    displayName,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  if (email.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      email,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: onLogout,
              tooltip: 'Log out',
            ),
          ],
        ),
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: theme.colorScheme.primary),
              const SizedBox(height: 8),
              Text(
                label,
                style: theme.textTheme.labelLarge,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
