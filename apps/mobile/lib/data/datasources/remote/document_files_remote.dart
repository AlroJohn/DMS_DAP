import 'package:dio/dio.dart';

import '../../dto/document_file_dto.dart';

/// Fetches document files list from GET /api/documents/:id/files.
/// Uses an authenticated Dio instance (e.g. AuthApi.dio).
class DocumentFilesRemote {
  DocumentFilesRemote(this._dio);

  final Dio _dio;

  /// GET /api/documents/:id/files. Returns list of file info.
  Future<List<DocumentFileDto>> getDocumentFiles(String documentId) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/api/documents/$documentId/files',
    );
    final data = response.data;
    if (data == null) return [];
    final list = data['data'] as List<dynamic>? ?? data['files'] as List<dynamic>? ?? [];
    return list
        .map((e) => DocumentFileDto.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
