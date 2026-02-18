import 'package:flutter/material.dart';

import '../../../core/constants/app_strings.dart';

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
      appBar: AppBar(title: const Text(AppStrings.appTitle)),
      body: Center(
        child: Text(
          _currentIndex == 0
              ? AppStrings.tabReceiving
              : _currentIndex == 1
              ? AppStrings.tabPendingSignatures
              : AppStrings.tabSignedDocuments,
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.inbox),
            label: AppStrings.tabReceiving,
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
