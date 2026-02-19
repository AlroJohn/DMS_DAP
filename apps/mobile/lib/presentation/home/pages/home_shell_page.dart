import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/constants/app_strings.dart';
import '../../../data/datasources/remote/intransit_remote.dart';
import '../../../domain/repositories/pending_signatures_repository.dart';
import 'home_dashboard_page.dart';
import '../../in_transit/in_transit_cubit.dart';
import '../../in_transit/pages/in_transit_page.dart';
import '../../pending_signatures/cubit/pending_signatures_cubit.dart';
import '../../pending_signatures/pages/pending_signatures_page.dart';

class HomeShellPage extends StatefulWidget {
  const HomeShellPage({super.key});

  @override
  State<HomeShellPage> createState() => _HomeShellPageState();
}

class _HomeShellPageState extends State<HomeShellPage> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(AppStrings.appTitle),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeDashboardPage(
            onNavigateToIndex: (index) => setState(() => _currentIndex = index),
          ),
          BlocProvider(
            create: (_) => InTransitCubit(context.read<IntransitRemote>()),
            child: const InTransitPage(),
          ),
          BlocProvider(
            create: (_) => PendingSignaturesCubit(
              context.read<PendingSignaturesRepository>(),
            ),
            child: const PendingSignaturesPage(),
          ),
          RefreshIndicator(
            onRefresh: () async {
              // Signed tab: refresh placeholder for when list is implemented
            },
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: MediaQuery.of(context).size.height - 200,
                ),
                child: Center(child: Text(AppStrings.tabSignedDocuments)),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            label: AppStrings.tabHome,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.local_shipping_outlined),
            label: AppStrings.tabInTransit,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.pending_actions),
            label: AppStrings.tabPendingSignatures,
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.done_all),
            label: AppStrings.tabSignedDocuments,
          ),
        ],
      ),
    );
  }
}
