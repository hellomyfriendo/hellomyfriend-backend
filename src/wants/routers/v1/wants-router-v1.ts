import * as express from 'express';
import {celebrate, Joi, Segments} from 'celebrate';
import {StatusCodes} from 'http-status-codes';
import {WantsService} from '../../services';
import {WantVisibility} from '../../models';
import {UnauthorizedError} from '../../../errors/unauthorized-error';

interface WantsRouterV1Settings {
  wantsService: WantsService;
}

class WantsRouterV1 {
  constructor(private readonly settings: WantsRouterV1Settings) {}

  get router() {
    const router = express.Router();

    router.post(
      '/',
      celebrate({
        [Segments.BODY]: Joi.object()
          .keys({
            title: Joi.string().required(),
            visibility: Joi.alternatives()
              .try(
                Joi.string().valid(...Object.values(WantVisibility)),
                Joi.array().items(Joi.string())
              )
              .required(),
            location: Joi.alternatives()
              .try(
                Joi.object().keys({
                  address: Joi.string().required(),
                  radius: Joi.number().required(),
                })
              )
              .required(),
          })
          .required(),
      }),
      async (req, res, next) => {
        try {
          req.log.info(req, 'Create Want request received');

          const user = req.user;

          if (!user) {
            throw new UnauthorizedError('user not found in req');
          }

          const {title, visibility, location} = req.body;

          const want = await this.settings.wantsService.createWant({
            creatorId: user.id,
            title,
            visibility,
            location,
          });

          req.log.info(want, 'Want created!');

          return res.status(StatusCodes.CREATED).json(want);
        } catch (err) {
          return next(err);
        }
      }
    );

    return router;
  }
}

export {WantsRouterV1};
