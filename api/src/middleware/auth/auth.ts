import {Request, Response, NextFunction} from 'express';
import {Auth as FirebaseAdminAuth} from 'firebase-admin/auth';
import {UnauthorizedError} from '../../errors';
import {UsersService} from '../../users/v1';

interface AuthSettings {
  firebaseAdminAuth: FirebaseAdminAuth;
  usersService: UsersService;
}

class Auth {
  constructor(private readonly settings: AuthSettings) {}

  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decodedIdToken = await this.decodeIdToken(req);

      let user = await this.settings.usersService.getUserByFirebaseUid(
        decodedIdToken.uid
      );

      if (!user) {
        user = await this.settings.usersService.createUser({
          firebaseUid: decodedIdToken.uid,
        });
      }

      req.user = user;

      return next();
    } catch (err) {
      return next(err);
    }
  };

  private async decodeIdToken(req: Request) {
    const authorizationHeader =
      req.header('Authorization') || req.header('authorization');

    if (!authorizationHeader) {
      throw new UnauthorizedError(
        '"token" is required in the "authorization" header'
      );
    }

    const idToken = authorizationHeader.split(' ')[1];

    try {
      return await this.settings.firebaseAdminAuth.verifyIdToken(idToken);
    } catch (err) {
      throw new UnauthorizedError(`Error verifying idToken ${idToken}`, err);
    }
  }
}

export {Auth};
