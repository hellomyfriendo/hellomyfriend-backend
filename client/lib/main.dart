import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:logger/logger.dart';

import 'app/app.dart';
import 'authentication/authentication.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  final logger = Logger();

  final authenticationRepository = AuthenticationRepository(logger: logger);
  await authenticationRepository.user.first;

  runApp(App(authenticationRepository: authenticationRepository));
}
