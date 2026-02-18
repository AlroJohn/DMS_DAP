import 'package:flutter/material.dart';

/// Placeholder for document view/sign until full in-app viewer is implemented.
class DocumentPlaceholderPage extends StatelessWidget {
  const DocumentPlaceholderPage({
    super.key,
    required this.documentId,
    required this.documentName,
    this.isSignMode = true,
  });

  final String documentId;
  final String documentName;
  final bool isSignMode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Document'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isSignMode ? Icons.draw : Icons.description_outlined,
                size: 64,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                documentName,
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'ID: $documentId',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                isSignMode
                    ? 'View & Sign will be available in a future update.'
                    : 'View Document will be available in a future update.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
