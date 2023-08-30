import {Router} from 'express';
import {UsersService} from '../../services';
import {UnauthorizedError} from '../../../../errors';
import {StatusCodes} from 'http-status-codes';

interface UsersRouterSettings {
  usersService: UsersService;
}

class UsersRouter {
  constructor(private readonly settings: UsersRouterSettings) {}

  get router() {
    const router = Router();

    router.post('/', async (req, res, next) => {
      try {
        const authUser = req.user;

        if (!authUser) {
          throw new UnauthorizedError('User not found in req');
        }

        const user = await this.settings.usersService.createUser({
          id: authUser.id,
          name: authUser.name,
        });

        return res.status(StatusCodes.CREATED).json(user);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {UsersRouter};
