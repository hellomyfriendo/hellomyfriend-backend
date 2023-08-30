import * as express from 'express';
import {StatusCodes} from 'http-status-codes';
import {FriendsService} from '../../services';
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../../../errors';

interface FriendsRouterSettings {
  friendsService: FriendsService;
}

class FriendsRouter {
  constructor(private readonly settings: FriendsRouterSettings) {}

  get router() {
    const router = express.Router();

    router.get('/', async (req, res, next) => {
      try {
        const user = req.userId;

        if (!user) {
          throw new UnauthorizedError('User not found in req');
        }

        const friends = await this.settings.friendsService.listFriendships({
          userId: user.id,
        });

        return res.json(friends);
      } catch (err) {
        return next(err);
      }
    });

    router.delete('/:friendshipId', async (req, res, next) => {
      try {
        req.log.info(req, 'Delete Friend request received');

        const user = req.userId;

        if (!user) {
          throw new UnauthorizedError('User not found in req');
        }

        const {friendshipId} = req.params;

        const friendship = await this.settings.friendsService.getFriendshipById(
          friendshipId
        );

        if (!friendship) {
          throw new NotFoundError(`Friendship ${friendshipId} not found`);
        }

        if (
          !(friendship.userId1 === user.id || friendship.userId2 === user.id)
        ) {
          throw new ForbiddenError(
            `User ${user.id} cannot delete Friendship ${friendship.id}`
          );
        }

        await this.settings.friendsService.deleteFriendship(friendship.id);

        req.log.info(`Friendship ${friendship.id} deleted!`);

        return res.sendStatus(StatusCodes.NO_CONTENT);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {FriendsRouter};
