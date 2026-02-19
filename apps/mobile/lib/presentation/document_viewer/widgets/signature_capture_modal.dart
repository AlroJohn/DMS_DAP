import 'dart:convert';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:syncfusion_flutter_signaturepad/signaturepad.dart';

/// Modal to capture signature by drawing or uploading image. Returns data URL (e.g. data:image/png;base64,...) on save.
class SignatureCaptureModal extends StatefulWidget {
  const SignatureCaptureModal({
    super.key,
    this.initialDataUrl,
  });

  final String? initialDataUrl;

  /// Shows the modal and returns the signature data URL, or null if cancelled.
  static Future<String?> show(BuildContext context, {String? initialDataUrl}) async {
    return showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => SignatureCaptureModal(initialDataUrl: initialDataUrl),
    );
  }

  @override
  State<SignatureCaptureModal> createState() => _SignatureCaptureModalState();
}

class _SignatureCaptureModalState extends State<SignatureCaptureModal> {
  final GlobalKey<SfSignaturePadState> _signaturePadKey = GlobalKey<SfSignaturePadState>();

  Future<String?> _exportSignature() async {
    final padState = _signaturePadKey.currentState;
    if (padState == null) return null;
    final image = await padState.toImage(pixelRatio: 2.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    if (byteData == null) return null;
    final bytes = byteData.buffer.asUint8List();
    if (bytes.isEmpty) return null;
    final base64 = base64Encode(bytes);
    return 'data:image/png;base64,$base64';
  }

  void _clear() {
    _signaturePadKey.currentState?.clear();
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final xfile = await picker.pickImage(source: ImageSource.gallery, maxWidth: 800, imageQuality: 90);
    if (xfile == null || !mounted) return;
    final bytes = await xfile.readAsBytes();
    final base64 = base64Encode(bytes);
    if (mounted) Navigator.of(context).pop('data:image/png;base64,$base64');
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Sign here', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              border: Border.all(color: Theme.of(context).colorScheme.outline),
              borderRadius: BorderRadius.circular(8),
            ),
            height: 200,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SfSignaturePad(
                key: _signaturePadKey,
                backgroundColor: Colors.white,
                strokeColor: Colors.black,
                minimumStrokeWidth: 1,
                maximumStrokeWidth: 4,
              ),
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              TextButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.clear),
                label: const Text('Clear'),
              ),
              TextButton.icon(
                onPressed: _pickImage,
                icon: const Icon(Icons.upload_file),
                label: const Text('Upload image'),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () async {
                  final dataUrl = await _exportSignature();
                  if (dataUrl != null && context.mounted) Navigator.of(context).pop(dataUrl);
                },
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
