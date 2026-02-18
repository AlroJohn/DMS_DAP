import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/datasources/remote/document_signing_remote.dart';
import '../../data/dto/document_signature_dto.dart';
import '../../data/dto/signature_placeholder_dto.dart';
import '../../data/dto/text_placeholder_dto.dart';

/// State for signing: placeholders, existing signatures, and pending entries.
abstract class SigningState {
  const SigningState();
}

class SigningInitial extends SigningState {
  const SigningInitial();
}

class SigningLoading extends SigningState {
  const SigningLoading();
}

class SigningReady extends SigningState {
  const SigningReady({
    required this.signaturePlaceholders,
    required this.textPlaceholders,
    required this.existingSignatures,
    required this.placedSignatures,
    required this.textValues,
  });

  final List<SignaturePlaceholderDto> signaturePlaceholders;
  final List<TextPlaceholderDto> textPlaceholders;
  final List<DocumentSignatureDto> existingSignatures;
  /// placeholderId -> signature data URL (base64 image)
  final Map<String, String> placedSignatures;
  /// placeholderId -> text value
  final Map<String, String> textValues;
}

class SigningSubmitting extends SigningState {
  const SigningSubmitting();
}

class SigningSubmitSuccess extends SigningState {
  const SigningSubmitSuccess();
}

class SigningError extends SigningState {
  const SigningError(this.message);
  final String message;
}

/// Loads placeholders/signatures and submits place-signature + update-text-placeholder.
class SigningCubit extends Cubit<SigningState> {
  SigningCubit(this._remote) : super(const SigningInitial());

  final DocumentSigningRemote _remote;

  /// Load signature placeholders, text placeholders, and existing signatures for [documentId].
  Future<void> loadPlaceholders(String documentId) async {
    emit(const SigningLoading());
    try {
      final results = await Future.wait([
        _remote.getSignaturePlaceholders(documentId),
        _remote.getTextPlaceholders(documentId),
        _remote.getDocumentSignatures(documentId),
      ]);
      emit(SigningReady(
        signaturePlaceholders: results[0] as List<SignaturePlaceholderDto>,
        textPlaceholders: results[1] as List<TextPlaceholderDto>,
        existingSignatures: results[2] as List<DocumentSignatureDto>,
        placedSignatures: const {},
        textValues: const {},
      ));
    } catch (e) {
      emit(SigningError(_message(e)));
    }
  }

  void setSignature(String placeholderId, String signatureDataUrl) {
    final current = state;
    if (current is! SigningReady) return;
    final next = Map<String, String>.from(current.placedSignatures)..[placeholderId] = signatureDataUrl;
    emit(SigningReady(
      signaturePlaceholders: current.signaturePlaceholders,
      textPlaceholders: current.textPlaceholders,
      existingSignatures: current.existingSignatures,
      placedSignatures: next,
      textValues: current.textValues,
    ));
  }

  void setTextValue(String placeholderId, String textValue) {
    final current = state;
    if (current is! SigningReady) return;
    final next = Map<String, String>.from(current.textValues)..[placeholderId] = textValue;
    emit(SigningReady(
      signaturePlaceholders: current.signaturePlaceholders,
      textPlaceholders: current.textPlaceholders,
      existingSignatures: current.existingSignatures,
      placedSignatures: current.placedSignatures,
      textValues: next,
    ));
  }

  /// Submit all pending signatures and text values. [signeeId] = current user id.
  /// [selectedFileIds] = which files are in scope (if empty, all placeholders are considered).
  Future<void> submit({
    required String documentId,
    required String signeeId,
    Set<String>? selectedFileIds,
  }) async {
    final current = state;
    if (current is! SigningReady) return;
    final fileIds = selectedFileIds ?? {};
    final hasFileFilter = fileIds.isNotEmpty;

    emit(const SigningSubmitting());
    try {
      for (final entry in current.placedSignatures.entries) {
        if (entry.value.isEmpty) continue;
        SignaturePlaceholderDto? ph;
        for (final p in current.signaturePlaceholders) {
          if (p.placeholderId == entry.key) {
            ph = p;
            break;
          }
        }
        if (ph == null) continue;
        if (hasFileFilter && !fileIds.contains(ph.documentFileId)) continue;
        await _remote.placeSignature(
          documentId,
          signeeId: signeeId,
          documentFileId: ph.documentFileId,
          pageNumber: ph.pageNumber,
          xPosition: ph.xPosition,
          yPosition: ph.yPosition,
          width: ph.width,
          height: ph.height,
          signatureData: entry.value,
        );
      }
      for (final entry in current.textValues.entries) {
        if (hasFileFilter) {
          TextPlaceholderDto? ph;
          for (final p in current.textPlaceholders) {
            if (p.placeholderId == entry.key) {
              ph = p;
              break;
            }
          }
          if (ph == null || !fileIds.contains(ph.documentFileId)) continue;
        }
        await _remote.updateTextPlaceholder(
          documentId,
          placeholderId: entry.key,
          textValue: entry.value,
        );
      }
      emit(const SigningSubmitSuccess());
    } catch (e) {
      emit(SigningError(_message(e)));
    }
  }

  static String _message(Object e) {
    final s = e.toString().toLowerCase();
    if (s.contains('401') || s.contains('unauthorized')) return 'Session expired. Please sign in again.';
    if (s.contains('403') || s.contains('forbidden')) return 'You don\'t have permission to sign.';
    if (s.contains('404')) return 'Document or placeholder not found.';
    if (s.contains('socket') || s.contains('connection') || s.contains('network')) return 'Network error. Please try again.';
    return 'Failed to submit signatures. Please try again.';
  }
}
