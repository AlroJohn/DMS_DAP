import 'package:dio/dio.dart';

import '../../dto/document_signature_dto.dart';
import '../../dto/signature_placeholder_dto.dart';
import '../../dto/text_placeholder_dto.dart';

/// Document signing and placeholder APIs. Uses authenticated Dio.
class DocumentSigningRemote {
  DocumentSigningRemote(this._dio);

  final Dio _dio;

  static const _signaturesPrefix = '/api/document-signatures';
  static const _textsPrefix = '/api/document-texts';

  /// GET /api/document-signatures/documents/:documentId/signature-placeholders
  Future<List<SignaturePlaceholderDto>> getSignaturePlaceholders(String documentId) async {
    final response = await _dio.get<List<dynamic>>(
      '$_signaturesPrefix/documents/$documentId/signature-placeholders',
    );
    final list = response.data ?? [];
    return list
        .map((e) => SignaturePlaceholderDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/document-texts/documents/:documentId/text-placeholders
  Future<List<TextPlaceholderDto>> getTextPlaceholders(String documentId) async {
    final response = await _dio.get<List<dynamic>>(
      '$_textsPrefix/documents/$documentId/text-placeholders',
    );
    final list = response.data ?? [];
    return list
        .map((e) => TextPlaceholderDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// GET /api/document-signatures/documents/:documentId/signatures
  Future<List<DocumentSignatureDto>> getDocumentSignatures(String documentId) async {
    final response = await _dio.get<List<dynamic>>(
      '$_signaturesPrefix/documents/$documentId/signatures',
    );
    final list = response.data ?? [];
    return list
        .map((e) => DocumentSignatureDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// POST /api/document-signatures/documents/:documentId/place-signature
  Future<void> placeSignature(
    String documentId, {
    required String signeeId,
    required String documentFileId,
    required int pageNumber,
    required double xPosition,
    required double yPosition,
    required double width,
    required double height,
    required String signatureData,
  }) async {
    await _dio.post<void>(
      '$_signaturesPrefix/documents/$documentId/place-signature',
      data: {
        'signee_id': signeeId,
        'document_file_id': documentFileId,
        'page_number': pageNumber,
        'x_position': xPosition,
        'y_position': yPosition,
        'width': width,
        'height': height,
        'signature_data': signatureData,
      },
    );
  }

  /// PUT /api/document-texts/documents/:documentId/update-text-placeholder
  Future<void> updateTextPlaceholder(
    String documentId, {
    required String placeholderId,
    required String textValue,
  }) async {
    await _dio.put<void>(
      '$_textsPrefix/documents/$documentId/update-text-placeholder',
      data: {
        'placeholder_id': placeholderId,
        'text_value': textValue,
      },
    );
  }
}
