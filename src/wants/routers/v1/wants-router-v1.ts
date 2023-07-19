import * as express from 'express';
import {celebrate, Joi, Segments} from 'celebrate';
import {StatusCodes} from 'http-status-codes';
import {WantsService} from '../../services';
import {WantVisibility} from '../../models';
import {UnauthorizedError} from '../../../errors/unauthorized-error';
import {ForbiddenError, NotFoundError} from '../../../errors';

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
            description: Joi.string().required(),
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

          const {title, description, visibility, location} = req.body;

          const want = await this.settings.wantsService.createWant({
            creator: user.id,
            title,
            description,
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

    router.post('/:wantId/upload-image', async (req, res, next) => {
      try {
        const user = req.user;

        if (!user) {
          throw new UnauthorizedError('User not found in the request');
        }

        const {wantId} = req.params;

        req.log.info(
          req,
          `Upload image request for Want ${wantId} from user ${user.id} received`
        );

        const want = await this.settings.wantsService.getWantById(wantId);

        if (!want) {
          throw new NotFoundError(`Want ${wantId} not found`);
        }

        if (!want.admins.includes(user.id)) {
          throw new ForbiddenError(
            `User ${user.id} cannot update Want ${want.id}`
          );
        }

        if (!req.files) {
          throw new RangeError('No files were uploaded');
        }

        const fileKeys = Object.keys(req.files);

        if (fileKeys.length !== 1) {
          throw new RangeError('A single file must be uploaded');
        }

        const uploadedImage = req.files[fileKeys[0]];

        if (!('data' in uploadedImage)) {
          throw new Error(
            "The uploaded file should contain the 'data' property"
          );
        }

        const updatedWant = await this.settings.wantsService.updateWantById(
          want.id,
          {
            imageData: uploadedImage.data,
          }
        );

        req.log.info(updatedWant, `Want ${updatedWant.id} updated!`);

        return res.json(updatedWant);
      } catch (err) {
        return next(err);
      }
    });

    return router;
  }
}

export {WantsRouterV1};
