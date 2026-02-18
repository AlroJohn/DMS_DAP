import 'package:dio/dio.dart';

import '../../dto/in_transit_dto.dart';

/// In-transit documents API. Uses authenticated Dio.
class IntransitRemote {
  IntransitRemote(this._dio);

  final Dio _dio;

  static const _prefix = '/api/intransit';

  /// GET /api/intransit/incoming?page=&limit=
  Future<InTransitResponseDto> getIncoming({int page = 1, int limit = 50}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$_prefix/incoming',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = response.data;
    if (data == null) throw IntransitException('No data returned');
    return InTransitResponseDto.fromJson(data);
  }

  /// GET /api/intransit/outgoing?page=&limit=
  Future<InTransitResponseDto> getOutgoing({int page = 1, int limit = 50}) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '$_prefix/outgoing',
      queryParameters: {'page': page, 'limit': limit},
    );
    final data = response.data;
    if (data == null) throw IntransitException('No data returned');
    return InTransitResponseDto.fromJson(data);
  }

  /// POST /api/intransit/:id/cancel
  Future<void> cancel(String documentId) async {
    await _dio.post<void>('$_prefix/$documentId/cancel');
  }

  /// POST /api/documents/:id/receive
  Future<void> receive(String documentId) async {
    await _dio.post<void>('/api/documents/$documentId/receive');
  }
}

class IntransitException implements Exception {
  IntransitException(this.message);
  final String message;
  @override
  String toString() => message;
}
