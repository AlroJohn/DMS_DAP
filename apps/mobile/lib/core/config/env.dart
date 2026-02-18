/// API base URL for the backend.
/// Set via: flutter run --dart-define=API_BASE_URL=https://api.example.com
/// Default: Android emulator (10.0.2.2:3001), iOS simulator can use localhost.
String get apiBaseUrl {
  const value = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3001',
  );
  return value;
}
