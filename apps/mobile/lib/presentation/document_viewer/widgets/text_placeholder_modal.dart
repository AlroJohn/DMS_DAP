import 'package:flutter/material.dart';

/// Modal to enter text for a text placeholder.
class TextPlaceholderModal extends StatefulWidget {
  const TextPlaceholderModal({
    super.key,
    required this.initialValue,
    this.hint = 'Enter text',
  });

  final String initialValue;
  final String hint;

  /// Shows the modal and returns the text value, or null if cancelled.
  static Future<String?> show(BuildContext context, {String initialValue = '', String hint = 'Enter text'}) async {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => TextPlaceholderModal(initialValue: initialValue, hint: hint),
    );
  }

  @override
  State<TextPlaceholderModal> createState() => _TextPlaceholderModalState();
}

class _TextPlaceholderModalState extends State<TextPlaceholderModal> {
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialValue);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: 16 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Enter text', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _controller,
            decoration: InputDecoration(
              hintText: widget.hint,
              border: const OutlineInputBorder(),
            ),
            maxLines: 3,
            autofocus: true,
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              FilledButton(
                onPressed: () => Navigator.of(context).pop(_controller.text),
                child: const Text('Save'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Cancel'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
