import 'package:flutter/material.dart';

import '../../presentation/auth/pages/login_page.dart';
import '../../presentation/home/pages/home_shell_page.dart';
import '../constants/app_strings.dart';

class AppRouter {
  static Widget buildHome(BuildContext context) {
    return const HomeShellPage();
  }

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppStrings.routeHome:
        return MaterialPageRoute(
          builder: (_) => const HomeShellPage(),
          settings: settings,
        );
      case AppStrings.routeLogin:
      default:
        return MaterialPageRoute(
          builder: (_) => const LoginPage(),
          settings: settings,
        );
    }
  }
}
