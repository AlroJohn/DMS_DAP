import '../entities/pending_signature_document.dart';

abstract class PendingSignaturesRepository {
  Future<List<PendingSignatureDocument>> getPendingSignatures();
}
