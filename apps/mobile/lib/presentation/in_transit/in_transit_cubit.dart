import 'package:flutter_bloc/flutter_bloc.dart';

import '../../data/datasources/remote/intransit_remote.dart';
import '../../data/dto/in_transit_dto.dart';

enum InTransitTab { incoming, outgoing }

class InTransitState {
  const InTransitState({
    this.activeTab = InTransitTab.incoming,
    this.incoming = const [],
    this.outgoing = const [],
    this.paginationIncoming,
    this.paginationOutgoing,
    this.loadingIncoming = false,
    this.loadingOutgoing = false,
    this.error,
  });

  final InTransitTab activeTab;
  final List<InTransitDocumentDto> incoming;
  final List<InTransitDocumentDto> outgoing;
  final InTransitPaginationDto? paginationIncoming;
  final InTransitPaginationDto? paginationOutgoing;
  final bool loadingIncoming;
  final bool loadingOutgoing;
  final String? error;

  InTransitState copyWith({
    InTransitTab? activeTab,
    List<InTransitDocumentDto>? incoming,
    List<InTransitDocumentDto>? outgoing,
    InTransitPaginationDto? paginationIncoming,
    InTransitPaginationDto? paginationOutgoing,
    bool? loadingIncoming,
    bool? loadingOutgoing,
    String? error,
  }) {
    return InTransitState(
      activeTab: activeTab ?? this.activeTab,
      incoming: incoming ?? this.incoming,
      outgoing: outgoing ?? this.outgoing,
      paginationIncoming: paginationIncoming ?? this.paginationIncoming,
      paginationOutgoing: paginationOutgoing ?? this.paginationOutgoing,
      loadingIncoming: loadingIncoming ?? this.loadingIncoming,
      loadingOutgoing: loadingOutgoing ?? this.loadingOutgoing,
      error: error,
    );
  }
}

class InTransitCubit extends Cubit<InTransitState> {
  InTransitCubit(this._remote) : super(const InTransitState());

  final IntransitRemote _remote;

  void setTab(InTransitTab tab) {
    emit(state.copyWith(activeTab: tab, error: null));
    if (tab == InTransitTab.incoming && state.incoming.isEmpty && !state.loadingIncoming) {
      loadIncoming();
    } else if (tab == InTransitTab.outgoing && state.outgoing.isEmpty && !state.loadingOutgoing) {
      loadOutgoing();
    }
  }

  Future<void> loadIncoming() async {
    emit(state.copyWith(loadingIncoming: true, error: null));
    try {
      final res = await _remote.getIncoming(page: 1, limit: 50);
      emit(state.copyWith(
        incoming: res.data,
        paginationIncoming: res.pagination,
        loadingIncoming: false,
        error: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        loadingIncoming: false,
        error: _message(e),
      ));
    }
  }

  Future<void> loadOutgoing() async {
    emit(state.copyWith(loadingOutgoing: true, error: null));
    try {
      final res = await _remote.getOutgoing(page: 1, limit: 50);
      emit(state.copyWith(
        outgoing: res.data,
        paginationOutgoing: res.pagination,
        loadingOutgoing: false,
        error: null,
      ));
    } catch (e) {
      emit(state.copyWith(
        loadingOutgoing: false,
        error: _message(e),
      ));
    }
  }

  Future<void> refresh() async {
    if (state.activeTab == InTransitTab.incoming) {
      await loadIncoming();
    } else {
      await loadOutgoing();
    }
  }

  Future<void> cancelDocument(String documentId) async {
    try {
      await _remote.cancel(documentId);
      await loadOutgoing();
    } catch (e) {
      emit(state.copyWith(error: _message(e)));
    }
  }

  Future<void> receiveDocument(String documentId) async {
    try {
      await _remote.receive(documentId);
      await loadIncoming();
    } catch (e) {
      emit(state.copyWith(error: _message(e)));
    }
  }

  void clearError() {
    emit(state.copyWith(error: null));
  }

  static String _message(Object e) {
    final s = e.toString().toLowerCase();
    if (s.contains('401') || s.contains('unauthorized')) return 'Session expired. Please sign in again.';
    if (s.contains('403') || s.contains('forbidden')) return 'You don\'t have permission.';
    if (s.contains('404')) return 'Document not found.';
    if (s.contains('socket') || s.contains('connection') || s.contains('network')) return 'Network error. Please try again.';
    if (e is IntransitException) return e.message;
    final msg = e.toString().replaceFirst(RegExp(r'^Exception:?\s*'), '');
    return msg.isNotEmpty ? msg : 'Something went wrong. Please try again.';
  }
}
