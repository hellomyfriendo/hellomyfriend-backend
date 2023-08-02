import * as express from 'express';
import {celebrate, Segments, Joi} from 'celebrate';
import {StatusCodes} from 'http-status-codes';
import {FriendsService} from '../../services';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../errors';

interface FriendsRouterV1Settings {
  friendsService: FriendsService;
}

class FriendsRouterV1 {
  constructor(private readonly settings: FriendsRouterV1Settings) {}

  get router() {
    const router = express.Router();

    router.get('/friends', async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          throw new UnauthorizedError('User not found in req');
        }

        const friends = await this.settings.friendsService.listFriendsByUserId(
          user.id
        );

        res.json(friends);
      } catch (err) {
        next(err);
      }
    });

    router.delete(
      '/friends',
      celebrate({
        [Segments.QUERY]: Joi.object()
          .keys({
            userId: Joi.string().required(),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          req.log.info(req, 'Delete Friend request received');

          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('User not found in req');
          }

          const {userId: friendId} = req.body;

          await this.settings.friendsService.deleteFriendship(
            user.id,
            friendId
          );

          req.log.info(req, 'Friend deleted!');

          res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (err) {
          next(err);
        }
      }
    );

    router.post(
      '/friend-requests',
      celebrate({
        [Segments.BODY]: Joi.object()
          .keys({
            toUserId: Joi.string().required(),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          req.log.info(req, 'Create Friend Request request received');

          const fromUser = req.user;

          if (!fromUser) {
            throw new UnauthorizedError('User not found in req');
          }

          const {toUserId} = req.body;

          const friendRequest =
            await this.settings.friendsService.createFriendRequest(
              fromUser.id,
              toUserId
            );

          req.log.info(friendRequest, 'Friend Request created!');

          return res.status(StatusCodes.CREATED).json(friendRequest);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.post(
      '/friend-requests/:friendRequestId/accept',
      async (req, res, next) => {
        try {
          req.log.info(req, 'Accept Friend Request request received');

          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('User not found in req');
          }

          const {friendRequestId} = req.params;

          const friendRequest =
            await this.settings.friendsService.getFriendRequestById(
              friendRequestId
            );

          if (!friendRequest) {
            throw new NotFoundError(
              `Friend Request ${friendRequestId} not found`
            );
          }

          if (user.id !== friendRequest.toUserId) {
            throw new ForbiddenError(
              `User ${user.id} cannot accept Friend Request ${friendRequest.id}`
            );
          }

          await this.settings.friendsService.createFriendship(friendRequest.id);

          req.log.info(req, 'Friend Request accepted!');

          return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.get('/friend-requests/sent', async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          throw new UnauthorizedError('User not found in req');
        }

        const friendRequests =
          await this.settings.friendsService.listFriendRequests({
            fromUserId: user.id,
          });

        return res.json(friendRequests);
      } catch (err) {
        return next(err);
      }
    });

    router.get('/friend-requests/received', async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          throw new UnauthorizedError('User not found in req');
        }

        const friendRequests =
          await this.settings.friendsService.listFriendRequests({
            toUserId: user.id,
          });

        return res.json(friendRequests);
      } catch (err) {
        return next(err);
      }
    });

    router.delete(
      '/friend-requests/:friendRequestId',
      async (req, res, next) => {
        try {
          req.log.info(req, 'Delete Friend Request request received');

          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('User not found in req');
          }

          const {friendRequestId} = req.params;

          const friendRequest =
            await this.settings.friendsService.getFriendRequestById(
              friendRequestId
            );

          if (!friendRequest) {
            throw new NotFoundError(
              `Friend Request ${friendRequestId} not found`
            );
          }

          if (user.id !== friendRequest.fromUserId) {
            throw new ForbiddenError(
              `User ${user.id} cannot delete Friend Request ${friendRequest.id}`
            );
          }

          await this.settings.friendsService.deleteFriendRequest(
            friendRequest.id
          );

          console.log('Friend Request deleted!', friendRequestId);

          return res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (err) {
          return next(err);
        }
      }
    );

    return router;
  }
}

export {FriendsRouterV1};
