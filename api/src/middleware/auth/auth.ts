import {Request, Response, NextFunction} from 'express';
import {OAuth2Client} from 'google-auth-library';
import {BackendServicesClient} from '@google-cloud/compute';
import {AuthUser} from '../../auth/v1';
import {UnauthorizedError} from '../../errors';

interface AuthSettings {
  oAuth2Client: OAuth2Client;
  backendServicesClient: BackendServicesClient;
  projectId: string;
  projectNumber: number;
  backendServiceName: string;
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
    const iapJwt = req.header('x-goog-iap-jwt-assertion');

    if (!iapJwt) {
      throw new UnauthorizedError(
        '"token" is required in "x-goog-iap-jwt-assertion" header'
      );
    }

    const [getBackendServiceResponse] =
      await this.settings.backendServicesClient.get({
        backendService: this.settings.backendServiceName,
        project: this.settings.projectId,
      });

    const iapPublicKeysResponse =
      await this.settings.oAuth2Client.getIapPublicKeys();

    const expectedAudience = `/projects/${this.settings.projectNumber}/global/backendServices/${getBackendServiceResponse.id}`;

    const ticket =
      await this.settings.oAuth2Client.verifySignedJwtWithCertsAsync(
        iapJwt,
        iapPublicKeysResponse.pubkeys,
        expectedAudience,
        ['https://cloud.google.com/iap']
      );

    return ticket.getPayload();
  }
}

export {Auth};
