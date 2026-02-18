import 'package:equatable/equatable.dart';

/// Document that has signature placeholders for the current user (by assignment or department).
class PendingSignatureDocument extends Equatable {
  const PendingSignatureDocument({
    required this.documentId,
    required this.documentName,
    required this.classification,
    required this.status,
    required this.createdAt,
    this.type,
    this.files = const [],
    required this.isSigned,
    required this.pendingSignatures,
  });

  final String documentId;
  final String documentName;
  final String classification;
  final String status;
  final DateTime createdAt;
  final DocumentTypeInfo? type;
  final List<DocumentFileInfo> files;
  final bool isSigned;
  final int pendingSignatures;

  @override
  List<Object?> get props =>
      [documentId, documentName, classification, status, createdAt, type, isSigned, pendingSignatures];
}

class DocumentTypeInfo extends Equatable {
  const DocumentTypeInfo({required this.typeId, required this.typeName});

  final String typeId;
  final String typeName;

  @override
  List<Object?> get props => [typeId, typeName];
}

class DocumentFileInfo extends Equatable {
  const DocumentFileInfo({
    required this.fileId,
    required this.fileName,
    required this.filePath,
  });

  final String fileId;
  final String fileName;
  final String filePath;

  @override
  List<Object?> get props => [fileId, fileName, filePath];
}
