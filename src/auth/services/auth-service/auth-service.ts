import {Auth} from 'firebase-admin/auth';
import {Logger} from 'pino';
import {UnauthorizedError} from '../../../errors';

interface AuthServiceSettings {
  firebaseAuth: Auth;
  logger: Logger;
}

class AuthService {
  constructor(private readonly settings: AuthServiceSettings) {}

  async decodeIdToken(idToken: string) {
    try {
      const decodedIdToken = await this.settings.firebaseAuth.verifyIdToken(
        idToken
      );
      return decodedIdToken;
    } catch (err) {
      this.settings.logger.error(err, `Error decoding idToken ${idToken}`);
      throw new UnauthorizedError(`Error decoding idToken ${idToken}`);
    }
  }
}

export {AuthService};
