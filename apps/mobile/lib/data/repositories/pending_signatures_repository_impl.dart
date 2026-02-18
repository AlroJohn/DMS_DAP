import '../../domain/entities/pending_signature_document.dart';
import '../../domain/repositories/pending_signatures_repository.dart';
import '../datasources/remote/pending_signatures_remote.dart';
import '../dto/pending_signatures_dto.dart';

class PendingSignaturesRepositoryImpl implements PendingSignaturesRepository {
  PendingSignaturesRepositoryImpl(this._remote);

  final PendingSignaturesRemote _remote;

  @override
  Future<List<PendingSignatureDocument>> getPendingSignatures() async {
    final list = await _remote.getPendingSignatures();
    return list.map((json) => _toEntity(PendingSignatureDocumentDto.fromJson(json))).toList();
  }

  PendingSignatureDocument _toEntity(PendingSignatureDocumentDto dto) {
    DateTime createdAt;
    try {
      createdAt = DateTime.parse(dto.createdAt);
    } catch (_) {
      createdAt = DateTime.now();
    }
    return PendingSignatureDocument(
      documentId: dto.documentId,
      documentName: dto.documentName,
      classification: dto.classification,
      status: dto.status,
      createdAt: createdAt,
      type: dto.type != null
          ? DocumentTypeInfo(typeId: dto.type!.typeId, typeName: dto.type!.typeName)
          : null,
      files: dto.files
          .map((f) => DocumentFileInfo(
                fileId: f.fileId,
                fileName: f.fileName,
                filePath: f.filePath,
              ))
          .toList(),
      isSigned: dto.isSigned,
      pendingSignatures: dto.pendingSignatures,
    );
  }
}
