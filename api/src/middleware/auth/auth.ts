import {Request, Response, NextFunction} from 'express';
import {OAuth2Client} from 'google-auth-library';
import {AuthUser} from '../../auth/v1';
import {UnauthorizedError} from '../../errors';
import {config} from '../../config';

interface AuthSettings {
  oAuth2Client: OAuth2Client;
}

class Auth {
  constructor(private readonly settings: AuthSettings) {}

  requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenPayload = await this.getTokenPayload(req);

      if (!tokenPayload) {
        throw new UnauthorizedError('tokenPayload must be defined');
      }

      if (!tokenPayload.sub) {
        throw new UnauthorizedError('tokenPayload.sub is required');
      }

      if (!tokenPayload.name) {
        throw new UnauthorizedError('tokenPayload.name is required');
      }

      const user: AuthUser = {
        id: tokenPayload.sub,
        name: tokenPayload.name,
      };

      req.user = user;

      return next();
    } catch (err) {
      return next(err);
    }
  };

  private async getTokenPayload(req: Request) {
    // See https://cloud.google.com/iap/docs/signed-headers-howto#retrieving_the_user_identity
    const authorizationHeader =
      req.header('authorization') || req.header('Authorization');

    if (!authorizationHeader) {
      throw new UnauthorizedError(
        '"token" is required in "x-goog-iap-jwt-assertion" header'
      );
    }

    const idToken = authorizationHeader.split(' ')[1];

    const ticket = await this.settings.oAuth2Client.verifyIdToken({
      idToken,
      audience: config.google.projectId,
    });

    return ticket.getPayload();
  }
}

export {Auth};
