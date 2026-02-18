import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Fetches document file bytes from GET /api/documents/:id/files/:fileId/stream.
/// Uses an authenticated Dio instance (e.g. AuthApi.dio).
class DocumentStreamRemote {
  DocumentStreamRemote(this._dio);

  final Dio _dio;

  /// GET /api/documents/:id/files/:fileId/stream.
  /// Returns raw bytes (e.g. PDF). Throws [DioException] on failure.
  Future<Uint8List> streamFile(String documentId, String fileId) async {
    final response = await _dio.get<Uint8List>(
      '/api/documents/$documentId/files/$fileId/stream',
      options: Options(responseType: ResponseType.bytes),
    );
    final data = response.data;
    if (data == null) throw DioException(requestOptions: response.requestOptions, message: 'Empty response');
    return data;
  }
}
