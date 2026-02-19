import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../data/dto/in_transit_dto.dart';
import '../in_transit_cubit.dart';

class InTransitPage extends StatefulWidget {
  const InTransitPage({super.key});

  @override
  State<InTransitPage> createState() => _InTransitPageState();
}

class _InTransitPageState extends State<InTransitPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_onTabChanged);
    context.read<InTransitCubit>().loadIncoming();
  }

  void _onTabChanged() {
    if (!_tabController.indexIsChanging) {
      final cubit = context.read<InTransitCubit>();
      cubit.setTab(_tabController.index == 0 ? InTransitTab.incoming : InTransitTab.outgoing);
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Material(
          color: theme.colorScheme.surface,
          child: TabBar(
            controller: _tabController,
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
            tabs: const [
              Tab(text: 'Incoming Documents'),
              Tab(text: 'Outgoing Documents'),
            ],
          ),
        ),
        Expanded(
          child: BlocConsumer<InTransitCubit, InTransitState>(
            listenWhen: (a, b) => a.error != b.error && b.error != null,
            listener: (context, state) {
              if (state.error != null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(state.error!), backgroundColor: theme.colorScheme.error),
                );
                context.read<InTransitCubit>().clearError();
              }
            },
            builder: (context, state) {
              return TabBarView(
                controller: _tabController,
                children: [
                  _IncomingList(state: state),
                  _OutgoingList(state: state),
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}

class _IncomingList extends StatelessWidget {
  const _IncomingList({required this.state});

  final InTransitState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (state.loadingIncoming && state.incoming.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => context.read<InTransitCubit>().loadIncoming(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 200,
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading incoming documents...'),
                ],
              ),
            ),
          ),
        ),
      );
    }
    if (state.incoming.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => context.read<InTransitCubit>().loadIncoming(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 200,
            ),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.inbox_outlined, size: 64, color: theme.colorScheme.primary),
                    const SizedBox(height: 16),
                    Text(
                      'No incoming documents',
                      style: theme.textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Documents in transit to you will appear here.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () => context.read<InTransitCubit>().loadIncoming(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: state.incoming.length,
        itemBuilder: (context, index) {
          final doc = state.incoming[index];
          return _InTransitCard(
            doc: doc,
            isOutgoing: false,
            onReceive: () => context.read<InTransitCubit>().receiveDocument(doc.id),
            onCancel: null,
          );
        },
      ),
    );
  }
}

class _OutgoingList extends StatelessWidget {
  const _OutgoingList({required this.state});

  final InTransitState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (state.loadingOutgoing && state.outgoing.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => context.read<InTransitCubit>().loadOutgoing(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 200,
            ),
            child: const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading outgoing documents...'),
                ],
              ),
            ),
          ),
        ),
      );
    }
    if (state.outgoing.isEmpty) {
      return RefreshIndicator(
        onRefresh: () => context.read<InTransitCubit>().loadOutgoing(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 200,
            ),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.send_outlined, size: 64, color: theme.colorScheme.primary),
                    const SizedBox(height: 16),
                    Text(
                      'No outgoing documents',
                      style: theme.textTheme.titleMedium,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Documents you sent in transit will appear here.',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () => context.read<InTransitCubit>().loadOutgoing(),
      child: ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount: state.outgoing.length,
        itemBuilder: (context, index) {
          final doc = state.outgoing[index];
          return _InTransitCard(
            doc: doc,
            isOutgoing: true,
            onReceive: null,
            onCancel: () => context.read<InTransitCubit>().cancelDocument(doc.id),
          );
        },
      ),
    );
  }
}

class _InTransitCard extends StatelessWidget {
  const _InTransitCard({
    required this.doc,
    required this.isOutgoing,
    this.onReceive,
    this.onCancel,
  });

  final InTransitDocumentDto doc;
  final bool isOutgoing;
  final VoidCallback? onReceive;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              doc.document,
              style: theme.textTheme.titleMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              doc.contactPerson,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            if (doc.contactOrganization.isNotEmpty)
              Text(
                doc.contactOrganization,
                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
            const SizedBox(height: 4),
            Row(
              children: [
                if (doc.classification.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: Chip(
                      label: Text(doc.classification, style: theme.textTheme.labelSmall),
                      padding: EdgeInsets.zero,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                if (doc.status.isNotEmpty)
                  Chip(
                    label: Text(doc.status, style: theme.textTheme.labelSmall),
                    padding: EdgeInsets.zero,
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (onReceive != null)
                  FilledButton.tonal(
                    onPressed: onReceive,
                    child: const Text('Receive'),
                  ),
                if (onCancel != null) ...[
                  if (onReceive != null) const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: onCancel,
                    child: const Text('Cancel'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
