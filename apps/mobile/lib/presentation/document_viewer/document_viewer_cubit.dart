import 'dart:typed_data';

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/datasources/remote/document_files_remote.dart';
import '../../data/datasources/remote/document_stream_remote.dart';
import '../../domain/entities/pending_signature_document.dart';

/// States for the document viewer (load stream → show PDF or error).
abstract class DocumentViewerState {
  const DocumentViewerState();
}

class DocumentViewerInitial extends DocumentViewerState {
  const DocumentViewerInitial();
}

class DocumentViewerLoading extends DocumentViewerState {
  const DocumentViewerLoading();
}

class DocumentViewerLoaded extends DocumentViewerState {
  const DocumentViewerLoaded({
    required this.bytes,
    required this.files,
    required this.selectedFileIds,
    required this.currentFileId,
  });

  final Uint8List bytes;
  final List<DocumentFileInfo> files;
  final Set<String> selectedFileIds;
  final String currentFileId;
}

class DocumentViewerError extends DocumentViewerState {
  const DocumentViewerError(this.message);

  final String message;
}

/// No file available to display (empty files list and API returned empty).
class DocumentViewerNoFile extends DocumentViewerState {
  const DocumentViewerNoFile();
}

/// Loads document file bytes for the viewer. Resolves file from [files] or fetches list when empty.
class DocumentViewerCubit extends Cubit<DocumentViewerState> {
  DocumentViewerCubit({
    required DocumentStreamRemote documentStreamRemote,
    required DocumentFilesRemote documentFilesRemote,
  })  : _documentStreamRemote = documentStreamRemote,
        _documentFilesRemote = documentFilesRemote,
        super(const DocumentViewerInitial());

  final DocumentStreamRemote _documentStreamRemote;
  final DocumentFilesRemote _documentFilesRemote;

  String? _documentId;

  /// Resolve file to show: use first from [files] if non-empty; otherwise fetch via API.
  Future<void> load({
    required String documentId,
    required List<DocumentFileInfo> files,
  }) async {
    emit(const DocumentViewerLoading());
    _documentId = documentId;

    List<DocumentFileInfo> resolvedFiles = files;
    if (files.isEmpty) {
      try {
        final list = await _documentFilesRemote.getDocumentFiles(documentId);
        if (list.isEmpty) {
          emit(const DocumentViewerNoFile());
          return;
        }
        resolvedFiles = list
            .map((d) => DocumentFileInfo(
                  fileId: d.fileId,
                  fileName: d.fileName,
                  filePath: '',
                ))
            .toList();
      } catch (e) {
        emit(DocumentViewerError(_userFriendlyMessage(e)));
        return;
      }
    }

    final fileId = resolvedFiles.first.fileId;
    if (fileId.isEmpty) {
      emit(const DocumentViewerNoFile());
      return;
    }

    try {
      final bytes = await _documentStreamRemote.streamFile(documentId, fileId);
      final selectedIds = resolvedFiles.map((f) => f.fileId).toSet();
      emit(DocumentViewerLoaded(
        bytes: bytes,
        files: resolvedFiles,
        selectedFileIds: selectedIds,
        currentFileId: fileId,
      ));
    } catch (e) {
      emit(DocumentViewerError(_userFriendlyMessage(e)));
    }
  }

  /// Load a specific file by id (switch viewed file). Requires [load] to have been called first.
  Future<void> loadFile(String fileId) async {
    final docId = _documentId;
    if (docId == null || fileId.isEmpty) return;
    final current = state;
    if (current is! DocumentViewerLoaded) return;

    emit(DocumentViewerLoading());
    try {
      final bytes = await _documentStreamRemote.streamFile(docId, fileId);
      emit(DocumentViewerLoaded(
        bytes: bytes,
        files: current.files,
        selectedFileIds: current.selectedFileIds,
        currentFileId: fileId,
      ));
    } catch (e) {
      emit(DocumentViewerError(_userFriendlyMessage(e)));
    }
  }

  void selectAll() {
    final current = state;
    if (current is! DocumentViewerLoaded) return;
    final allIds = current.files.map((f) => f.fileId).toSet();
    emit(DocumentViewerLoaded(
      bytes: current.bytes,
      files: current.files,
      selectedFileIds: allIds,
      currentFileId: current.currentFileId,
    ));
  }

  void deselectAll() {
    final current = state;
    if (current is! DocumentViewerLoaded) return;
    emit(DocumentViewerLoaded(
      bytes: current.bytes,
      files: current.files,
      selectedFileIds: const {},
      currentFileId: current.currentFileId,
    ));
  }

  void toggleFileSelection(String fileId) {
    final current = state;
    if (current is! DocumentViewerLoaded) return;
    final next = Set<String>.from(current.selectedFileIds);
    if (next.contains(fileId)) {
      next.remove(fileId);
    } else {
      next.add(fileId);
    }
    emit(DocumentViewerLoaded(
      bytes: current.bytes,
      files: current.files,
      selectedFileIds: next,
      currentFileId: current.currentFileId,
    ));
  }

  static String _userFriendlyMessage(Object e) {
    if (e is Exception) {
      final s = e.toString().toLowerCase();
      if (s.contains('401') || s.contains('unauthorized')) return 'Session expired. Please sign in again.';
      if (s.contains('403') || s.contains('forbidden')) return 'You don\'t have permission to view this document.';
      if (s.contains('404') || s.contains('not found')) return 'Document or file not found.';
      if (s.contains('socket') || s.contains('connection') || s.contains('network')) return 'Network error. Check connection and try again.';
    }
    return 'Failed to load document. Please try again.';
  }
}
