import {Request, Response, NextFunction} from 'express';
import {Auth as FirebaseAdminAuth} from 'firebase-admin/auth';
import {UnauthorizedError} from '../../errors';

interface AuthSettings {
  firebaseAdminAuth: FirebaseAdminAuth;
}

class Auth {
  constructor(private readonly settings: AuthSettings) {}

  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decodedIdToken = await this.getDecodedIdToken(req);

      req.userId = decodedIdToken.uid;

      return next();
    } catch (err) {
      return next(err);
    }
  };

  private async getDecodedIdToken(req: Request) {
    // See https://cloud.google.com/iap/docs/signed-headers-howto#retrieving_the_user_identity
    const authorizationHeader =
      req.header('authorization') || req.header('Authorization');

    if (!authorizationHeader) {
      throw new UnauthorizedError(
        '"token" is required in "x-goog-iap-jwt-assertion" header'
      );
    }

    const idToken = authorizationHeader.split(' ')[1];

    try {
      return await this.settings.firebaseAdminAuth.verifyIdToken(idToken);
    } catch (err) {
      throw new UnauthorizedError('Error verifying ID Token', err);
    }
  }
}

export {Auth};
