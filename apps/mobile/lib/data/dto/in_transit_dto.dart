/// Single in-transit document from GET /api/intransit/incoming or /outgoing.
class InTransitDocumentDto {
  InTransitDocumentDto({
    required this.id,
    required this.documentId,
    required this.document,
    required this.contactPerson,
    required this.contactOrganization,
    this.contactOrganizationName,
    required this.type,
    required this.classification,
    required this.status,
    required this.activity,
    required this.activityTime,
    this.createdAt,
    this.requestAction,
    this.releaseRemarks,
  });

  final String id;
  final String documentId;
  final String document;
  final String contactPerson;
  final String contactOrganization;
  final String? contactOrganizationName;
  final String type;
  final String classification;
  final String status;
  final String activity;
  final String activityTime;
  final String? createdAt;
  final String? requestAction;
  final String? releaseRemarks;

  factory InTransitDocumentDto.fromJson(Map<String, dynamic> json) {
    final created = json['created_at'] ?? json['createdAt'];
    final createdAtStr = created is String ? created : (created is DateTime ? created.toIso8601String() : null);
    return InTransitDocumentDto(
      id: json['id'] as String? ?? '',
      documentId: json['documentId'] as String? ?? '',
      document: json['document'] as String? ?? '',
      contactPerson: json['contactPerson'] as String? ?? '',
      contactOrganization: json['contactOrganization'] as String? ?? '',
      contactOrganizationName: json['contactOrganizationName'] as String?,
      type: json['type'] as String? ?? '',
      classification: json['classification'] as String? ?? '',
      status: json['status'] as String? ?? '',
      activity: json['activity'] as String? ?? '',
      activityTime: json['activityTime'] as String? ?? '',
      createdAt: createdAtStr,
      requestAction: json['requestAction'] as String?,
      releaseRemarks: json['releaseRemarks'] as String?,
    );
  }
}

/// Pagination from intransit API response.
class InTransitPaginationDto {
  InTransitPaginationDto({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
    required this.hasNext,
    required this.hasPrev,
  });

  final int page;
  final int limit;
  final int total;
  final int totalPages;
  final bool hasNext;
  final bool hasPrev;

  factory InTransitPaginationDto.fromJson(Map<String, dynamic> json) {
    return InTransitPaginationDto(
      page: (json['page'] as num?)?.toInt() ?? 1,
      limit: (json['limit'] as num?)?.toInt() ?? 10,
      total: (json['total'] as num?)?.toInt() ?? 0,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 0,
      hasNext: json['hasNext'] as bool? ?? false,
      hasPrev: json['hasPrev'] as bool? ?? false,
    );
  }
}

/// Response from GET /api/intransit/incoming or /outgoing.
class InTransitResponseDto {
  InTransitResponseDto({
    required this.data,
    this.pagination,
  });

  final List<InTransitDocumentDto> data;
  final InTransitPaginationDto? pagination;

  factory InTransitResponseDto.fromJson(Map<String, dynamic> json) {
    final list = json['data'] as List<dynamic>? ?? [];
    final pag = json['pagination'] as Map<String, dynamic>?;
    return InTransitResponseDto(
      data: list.map((e) => InTransitDocumentDto.fromJson(e as Map<String, dynamic>)).toList(),
      pagination: pag != null ? InTransitPaginationDto.fromJson(pag) : null,
    );
  }
}
