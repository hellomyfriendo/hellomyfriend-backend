import {Request, Response, NextFunction} from 'express';
import {AuthService} from '../../auth';
import {UnauthorizedError} from '../../errors';
import {UsersService} from '../../users';

interface AuthSettings {
  authService: AuthService;
  usersService: UsersService;
}

class Auth {
  constructor(private readonly settings: AuthSettings) {}

  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idToken = this.getIdToken(req);

      if (!idToken) {
        throw new UnauthorizedError(
          '"token" is required in the "authorization" header'
        );
      }

      const decodedIdToken = await this.settings.authService.decodeIdToken(
        idToken
      );

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

  private getIdToken = (req: Request) => {
    const authorizationHeader =
      req.header('Authorization') || req.header('authorization');

    if (!authorizationHeader) {
      return;
    }

    return authorizationHeader.split(' ')[1];
  };
}

export {Auth};
