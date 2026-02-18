import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../domain/entities/pending_signature_document.dart';
import '../../../domain/repositories/pending_signatures_repository.dart';

sealed class PendingSignaturesState {}

class PendingSignaturesInitial extends PendingSignaturesState {}

class PendingSignaturesLoading extends PendingSignaturesState {}

class PendingSignaturesLoaded extends PendingSignaturesState {
  PendingSignaturesLoaded(this.documents);
  final List<PendingSignatureDocument> documents;
}

class PendingSignaturesError extends PendingSignaturesState {
  PendingSignaturesError(this.message);
  final String message;
}

class PendingSignaturesCubit extends Cubit<PendingSignaturesState> {
  PendingSignaturesCubit(this._repository) : super(PendingSignaturesInitial());

  final PendingSignaturesRepository _repository;

  Future<void> load() async {
    emit(PendingSignaturesLoading());
    try {
      final documents = await _repository.getPendingSignatures();
      emit(PendingSignaturesLoaded(documents));
    } catch (e) {
      final message = e.toString().replaceFirst(RegExp(r'^Exception:?\s*'), '');
      emit(PendingSignaturesError(
        message.isNotEmpty ? message : 'Failed to load pending signatures',
      ));
    }
  }
}
