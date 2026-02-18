import 'package:dio/dio.dart';

/// Fetches pending signatures from GET /api/pending-signatures.
/// Uses an authenticated Dio instance (e.g. AuthApi.dio).
class PendingSignaturesRemote {
  PendingSignaturesRemote(this._dio);

  final Dio _dio;

  Future<List<Map<String, dynamic>>> getPendingSignatures() async {
    final response = await _dio.get<Map<String, dynamic>>('/api/pending-signatures');
    final data = response.data;
    if (data == null) {
      throw PendingSignaturesException('No data returned');
    }
    final success = data['success'] as bool? ?? false;
    if (!success) {
      final message = (data['error'] is Map
              ? (data['error'] as Map)['message']
              : data['message']) as String? ??
          'Failed to fetch pending signatures';
      throw PendingSignaturesException(message);
    }
    final list = data['data'];
    if (list is! List) {
      return [];
    }
    return list
        .whereType<Map<String, dynamic>>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }
}

class PendingSignaturesException implements Exception {
  PendingSignaturesException(this.message);
  final String message;
  @override
  String toString() => message;
}
