import * as express from 'express';
import {celebrate, Segments, Joi} from 'celebrate';
import {StatusCodes} from 'http-status-codes';
import {FriendRequestsService, FriendsService} from '../../services';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../errors';

interface FriendRequestsRouterSettings {
  friendRequestsService: FriendRequestsService;
  friendsService: FriendsService;
}

class FriendRequestsRouter {
  constructor(private readonly settings: FriendRequestsRouterSettings) {}

  get router() {
    const router = express.Router();

    router.post(
      '/',
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

          const fromUserId = req.userId;

          if (!fromUserId) {
            throw new UnauthorizedError('User not found in req');
          }

          const {toUserId} = req.body;

          const friendRequest =
            await this.settings.friendRequestsService.createFriendRequest(
              fromUserId,
              toUserId
            );

          req.log.info(friendRequest, 'Friend Request created!');

          return res.status(StatusCodes.CREATED).json(friendRequest);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.post('/:friendRequestId/accept', async (req, res, next) => {
      try {
        req.log.info(req, 'Accept Friend Request request received');

        const userId = req.userId;

        if (!userId) {
          throw new UnauthorizedError('User not found in req');
        }

        const {friendRequestId} = req.params;

        const friendRequest =
          await this.settings.friendRequestsService.getFriendRequestById(
            friendRequestId
          );

        if (!friendRequest) {
          throw new NotFoundError(
            `Friend Request ${friendRequestId} not found`
          );
        }

        if (userId !== friendRequest.toUserId) {
          throw new ForbiddenError(
            `User ${userId} cannot accept Friend Request ${friendRequest.id}`
          );
        }

        const friendship = await this.settings.friendsService.createFriendship(
          friendRequest.fromUserId,
          friendRequest.toUserId
        );

        await this.settings.friendRequestsService.deleteFriendRequest(
          friendRequest.id
        );

        req.log.info(friendship, `Friend Request ${friendRequestId} accepted!`);

        return res.json(friendship);
      } catch (err) {
        return next(err);
      }
    });

    router.post('/:friendRequestId/reject', async (req, res, next) => {
      try {
        req.log.info(req, 'Reject Friend Request request received');

        const userId = req.userId;

        if (!userId) {
          throw new UnauthorizedError('User not found in req');
        }

        const {friendRequestId} = req.params;

        const friendRequest =
          await this.settings.friendRequestsService.getFriendRequestById(
            friendRequestId
          );

        if (!friendRequest) {
          throw new NotFoundError(
            `Friend Request ${friendRequestId} not found`
          );
        }

        if (userId !== friendRequest.toUserId) {
          throw new ForbiddenError(
            `User ${userId} cannot reject Friend Request ${friendRequest.id}`
          );
        }

        await this.settings.friendRequestsService.deleteFriendRequest(
          friendRequest.id
        );

        req.log.info(`Friend Request ${friendRequestId} rejected!`);

        return res.sendStatus(StatusCodes.NO_CONTENT);
      } catch (err) {
        return next(err);
      }
    });

    router.get(
      '/sent',
      celebrate({
        [Segments.QUERY]: Joi.object().keys({
          from: Joi.string(),
          to: Joi.string(),
        }),
      }),
      async (req, res, next) => {
        try {
          const userId = req.userId;

          if (!userId) {
            throw new UnauthorizedError('User not found in req');
          }

          const friendRequests =
            await this.settings.friendRequestsService.listFriendRequests({
              fromUserId: userId,
            });

          return res.json(friendRequests);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.get(
      '/received',
      celebrate({
        [Segments.QUERY]: Joi.object().keys({
          from: Joi.string(),
          to: Joi.string(),
        }),
      }),
      async (req, res, next) => {
        try {
          const userId = req.userId;

          if (!userId) {
            throw new UnauthorizedError('User not found in req');
          }

          const friendRequests =
            await this.settings.friendRequestsService.listFriendRequests({
              toUserId: userId,
            });

          return res.json(friendRequests);
        } catch (err) {
          return next(err);
        }
      }
    );

    router.delete(
      '/:friendRequestId',
      celebrate({
        [Segments.QUERY]: Joi.object()
          .keys({
            userId: Joi.string().required(),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          req.log.info(req, 'Delete Friend Request request received');

          const userId = req.userId;

          if (!userId) {
            throw new UnauthorizedError('User not found in req');
          }

          const {friendRequestid} = req.params;

          const friendRequest =
            await this.settings.friendRequestsService.getFriendRequestById(
              friendRequestid
            );

          if (!friendRequest) {
            throw new NotFoundError(
              `Friend Request ${friendRequestid} not found`
            );
          }

          if (userId !== friendRequest.fromUserId) {
            throw new ForbiddenError(
              `User ${userId} cannot delete Friend Request ${friendRequest.id}`
            );
          }

          await this.settings.friendRequestsService.deleteFriendRequest(
            friendRequest.id
          );

          req.log.info(`Friend Request ${friendRequest.id} deleted!`);

          res.sendStatus(StatusCodes.NO_CONTENT);
        } catch (err) {
          next(err);
        }
      }
    );

    return router;
  }
}

export {FriendRequestsRouter};
