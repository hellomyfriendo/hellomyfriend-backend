import express from 'express';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import {OAuth2Client} from 'google-auth-library';
import {BackendServicesClient} from '@google-cloud/compute';
import {Firestore} from '@google-cloud/firestore';
import {LanguageServiceClient} from '@google-cloud/language';
import {Storage} from '@google-cloud/storage';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import {Client} from '@googlemaps/google-maps-services-js';
import {HealthCheckRouter} from './health-check';
import {UsersService, UsersRouter as UsersRouterV1} from './users/v1';
import {
  FriendsRouter as FriendsRouterV1,
  FriendsService as FriendsServiceV1,
  FriendRequestsService as FriendRequestsServiceV1,
  FriendRequestsRouter as FriendRequestsRouterV1,
} from './friends/v1';
import {
  WantsRouter as WantsRouterV1,
  WantsService as WantsServiceV1,
} from './wants/v1';
import {Auth} from './middleware';
import {errorHandler} from './error-handler/v1';
import {logger} from './logger';
import {config} from './config';

const oAuth2Client = new OAuth2Client();

const backendServicesClient = new BackendServicesClient({
  projectId: config.google.projectId,
});

const firestore = new Firestore({
  projectId: config.google.projectId,
  ignoreUndefinedProperties: true,
});

const languageServiceClient = new LanguageServiceClient({
  projectId: config.google.projectId,
});

const storage = new Storage({
  projectId: config.google.projectId,
});

const imageAnnotatorClient = new ImageAnnotatorClient({
  projectId: config.google.projectId,
});

const googleMapsServicesClient = new Client({});

const usersServiceV1 = new UsersService({
  firestore: {
    client: firestore,
    collections: {
      users: config.users.firestore.collections.users,
    },
  },
});

const friendsServiceV1 = new FriendsServiceV1({
  firestore: {
    client: firestore,
    collections: {
      friendships: config.friends.firestore.collections.friendships,
    },
  },
  usersService: usersServiceV1,
});

const friendRequestsServiceV1 = new FriendRequestsServiceV1({
  firestore: {
    client: firestore,
    collections: {
      friendRequests: config.friends.firestore.collections.friendRequests,
    },
  },
  friendsService: friendsServiceV1,
  usersService: usersServiceV1,
});

const wantsServiceV1 = new WantsServiceV1({
  firestore: {
    client: firestore,
    collections: {
      wants: config.wants.firestore.collections.wants,
    },
  },
  language: {
    client: languageServiceClient,
  },
  storage: {
    client: storage,
    buckets: {
      wantsAssets: config.wants.storage.buckets.wantsAssets,
    },
  },
  vision: {
    imageAnnotatorClient,
  },
  googleMapsServicesClient,
  googleApiKey: config.google.apiKey,
  friendsService: friendsServiceV1,
  usersService: usersServiceV1,
});

const healthCheckRouter = new HealthCheckRouter().router;

const usersRouterV1 = new UsersRouterV1({
  usersService: usersServiceV1,
}).router;

const friendsRouterV1 = new FriendsRouterV1({friendsService: friendsServiceV1})
  .router;

const friendRequestsRouterV1 = new FriendRequestsRouterV1({
  friendsService: friendsServiceV1,
  friendRequestsService: friendRequestsServiceV1,
}).router;

const wantsRouterV1 = new WantsRouterV1({
  wantsService: wantsServiceV1,
}).router;

const app = express();

app.use(
  pinoHttp({
    logger,

    genReqId: function (req, res) {
      const existingId = req.id ?? req.headers['x-cloud-trace-context'];

      if (existingId) {
        return existingId;
      }

      // See https://cloud.google.com/trace/docs/setup#force-trace
      const traceId = crypto.randomBytes(16).toString('hex');
      const spanId = crypto.randomInt(1, 281474976710655);
      const id = `${traceId}/${spanId};o=1`;
      res.setHeader('x-cloud-trace-context', id);
      return id;
    },

    serializers: {
      req(req) {
        req.body = req.raw.body;
        return req;
      },
    },
  })
);

app.use(cors());

app.use(express.json());

app.use(fileUpload());

app.use('/', healthCheckRouter);

app.use(
  new Auth({
    oAuth2Client,
    backendServicesClient,
    projectId: config.google.projectId,
    projectNumber: config.google.projectNumber,
    backendServiceName: config.google.backendServiceName,
  }).requireAuth
);

app.use('/v1/users', usersRouterV1);

app.use('/v1/friends', friendsRouterV1);

app.use('/v1/friend-requests', friendRequestsRouterV1);

app.use('/v1/wants', wantsRouterV1);

app.use(
  async (
    err: Error,
    req: express.Request,
    res: express.Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: express.NextFunction
  ) => {
    await errorHandler.handleError(err, req, res);
  }
);

export {
  app,
  usersServiceV1,
  friendsServiceV1,
  friendRequestsServiceV1,
  wantsServiceV1,
};
