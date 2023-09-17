import {Sql} from 'postgres';
import {LanguageServiceClient} from '@google-cloud/language';
import {Storage} from '@google-cloud/storage';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import {Client, GeocodeResult} from '@googlemaps/google-maps-services-js';
import dayjs from 'dayjs';
import {orderBy} from 'lodash';
import mime from 'mime-types';
import {
  GeolocationCoordinates,
  Want,
  WantMemberRole,
  WantVisibility,
} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';
import {FriendsService} from '../../../friends';

interface WantsServiceSettings {
  sql: Sql;
  language: {
    client: LanguageServiceClient;
  };
  storage: {
    client: Storage;
    buckets: {
      wantsAssets: string;
    };
  };
  vision: {
    imageAnnotatorClient: ImageAnnotatorClient;
  };
  googleApiKey: string;
  googleMapsServicesClient: Client;
  friendsService: FriendsService;
  usersService: UsersService;
}

interface WantRow {
  id: string;
  creatorId: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
  address: string;
  coordinates: [number, number];
  googlePlaceId: string;
  radiusInMeters: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface WantMemberRow {
  id: string;
  wantId: string;
  userId: string;
  role: WantMemberRole;
  createdAt: Date;
  deletedAt?: Date;
}

interface WantVisibleToRow {
  id: string;
  wantId: string;
  userId: string;
  createdAt: Date;
  deletedAt?: Date;
}

interface WantImageRow {
  id: string;
  wantId: string;
  googleStorageBucket: string;
  googleStorageFile: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWantOptions {
  creatorId: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
  visibleTo?: string[];
  address: string;
  radiusInMeters: number;
}

interface ListWantsOptions {
  userId?: string;
  orderBy?: {
    column: 'createdAt';
    direction: 'asc' | 'desc';
  }[];
}

interface ListHomeFeedOptions {
  userId: string;
  geolocationCoordinates?: GeolocationCoordinates;
}

interface UpdateWantOptions {
  administratorsIds?: string[];
  membersIds?: string[];
  title?: string;
  description?: string;
  visibility?: WantVisibility;
  visibleTo?: string[];
  image?: {
    data: Buffer;
    mimeType: string;
  };
}

class WantsService {
  private readonly wantsTable = 'wants';
  private readonly wantsMembersTable = 'wants_members';
  private readonly wantsVisibleToTable = 'wants_visible_to';
  private readonly wantsImagesTable = 'wants_images';

  constructor(private readonly settings: WantsServiceSettings) {}

  async createWant(options: CreateWantOptions): Promise<Want> {
    const creator = await this.settings.usersService.getUserById(
      options.creatorId
    );

    if (!creator) {
      throw new NotFoundError(`User ${options.creatorId} not found`);
    }

    await this.validateWantTitle(options.title);

    if (options.description) {
      await this.validateWantDescription(options.description);
    }

    const visibleTo: string[] = [];
    if (options.visibility === WantVisibility.Specific) {
      if (!options.visibleTo) {
        throw new RangeError(
          `options.visibleTo must be defined when options.visibility is ${options.visibility}`
        );
      }

      for (const userId of options.visibleTo) {
        const user = await this.settings.usersService.getUserById(userId);

        if (!user) {
          throw new NotFoundError(`User ${userId} not found`);
        }

        visibleTo.push(userId);
      }
    }

    const geocodeResult = await this.geocodeAddress(options.address);

    if (!Number.isInteger(options.radiusInMeters)) {
      throw new RangeError('options.radiusInMeters must be an integer');
    }

    const {sql} = this.settings;

    const [wantId] = await sql.begin(async sql => {
      const [{id: wantId}]: [{id: string}] = await sql`
        INSERT INTO ${sql(this.wantsTable)}(
          creator_id,
          title,
          description,
          visibility,
          address,
          coordinates,
          ${sql('googlePlaceId')},
          ${sql('radiusInMeters')}
        )
        VALUES(
          ${creator.id},
          ${options.title},
          ${options.description ? options.description : null},
          ${options.visibility},
          ${geocodeResult.formatted_address},
          ${[
            geocodeResult.geometry.location.lat,
            geocodeResult.geometry.location.lng,
          ]},
          ${geocodeResult.place_id},
          ${options.radiusInMeters}
        )
        RETURNING id
      `;

      await sql`
          INSERT INTO ${sql(this.wantsMembersTable)}(
            ${sql('wantId')},
            ${sql('userId')},
            role
          )
          VALUES(
            ${wantId},
            ${creator.id},
            ${WantMemberRole.Administrator}
          )
        `;

      if (visibleTo.length > 0) {
        await sql`
          INSERT INTO ${sql(this.wantsVisibleToTable)} ${sql(
          visibleTo.map(userId => {
            return {
              wantId,
              userId,
            };
          })
        )}
        `;
      }

      return [wantId];
    });

    const want = await this.getWantById(wantId);

    if (!want) {
      throw new Error(`Want ${wantId} not found. This should not happen`);
    }

    return want;
  }

  async getWantById(wantId: string): Promise<Want | undefined> {
    const {sql} = this.settings;

    const [wantRow]: [WantRow?] = await sql`
      SELECT *
      FROM ${sql(this.wantsTable)}
      WHERE ${sql('deletedAt')} IS NULL
      AND id = ${wantId}
    `;

    if (!wantRow) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    const members: WantMemberRow[] = await sql`
      SELECT ${sql('userId')}, role
      FROM ${sql(this.wantsMembersTable)}
      WHERE ${sql('deletedAt')} IS NULL
      AND ${sql('wantId')} = ${wantId}
    `;

    const visibleTo: WantVisibleToRow[] = await sql`
      SELECT ${sql('userId')}
      FROM ${sql(this.wantsVisibleToTable)}
      WHERE ${sql('deletedAt')} IS NULL
      AND ${sql('wantId')} = ${wantId}
    `;

    const imageURL = await this.getWantImageURL(wantId);

    const want: Want = {
      id: wantId,
      creatorId: wantRow.creatorId,
      administratorsIds: members
        .filter(member => member.role === WantMemberRole.Administrator)
        .map(member => member.userId),
      membersIds: members
        .filter(member => member.role === WantMemberRole.Member)
        .map(member => member.userId),
      title: wantRow.title,
      description: wantRow.description,
      imageURL,
      visibility: wantRow.visibility,
      visibleTo: visibleTo.map(visibleTo => visibleTo.userId),
      address: wantRow.address,
      coordinates: {
        latitude: wantRow.coordinates[0],
        longitude: wantRow.coordinates[1],
      },
      radiusInMeters: wantRow.radiusInMeters,
      createdAt: wantRow.createdAt,
      updatedAt: wantRow.updatedAt,
    };

    return want;
  }

  async listWants(options: ListWantsOptions): Promise<Want[]> {
    const {sql} = this.settings;

    const rows: {id: string}[] = await sql`
      SELECT w.id
      FROM ${sql(this.wantsTable)} w
      ${
        options.userId
          ? sql`JOIN ${sql(this.wantsMembersTable)} wm ON w.${sql(
              'id'
            )} = wm.${sql('wantId')}`
          : sql``
      }
      WHERE w.${sql('deletedAt')} IS NULL
      ${
        options.userId
          ? sql`AND wm.${sql('userId')} = ${options.userId}`
          : sql``
      }
      ${
        options.orderBy
          ? sql`ORDER BY ${options.orderBy.map((x, i) => {
              return `${i ? sql`,` : sql``} ${sql(x.column)} ${
                x.direction === 'asc' ? sql`ASC` : sql`DESC`
              }`;
            })}`
          : sql``
      }
    `;

    return await Promise.all(
      rows.map(async wantRow => {
        const want = await this.getWantById(wantRow.id);

        if (!want) {
          throw new Error(
            `Want ${wantRow.id} not found. This should not happen`
          );
        }

        return want;
      })
    );
  }

  async updateWantById(
    wantId: string,
    options: UpdateWantOptions
  ): Promise<Want> {
    const want = await this.getWantById(wantId);

    if (!want) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    if (options.administratorsIds) {
      await this.validateWantAdministratorsIds(options.administratorsIds);
    }

    if (options.membersIds) {
      await this.validateWantMembersIds(options.membersIds);
    }

    if (options.title) {
      await this.validateWantTitle(options.title);
    }

    if (options.description) {
      await this.validateWantDescription(options.description);
    }

    if (options.visibility === WantVisibility.Specific) {
      if (!options.visibleTo) {
        throw new RangeError(
          `options.visibleTo must be defined when options.visibility is ${options.visibility}`
        );
      }

      await this.validateWantVisibleTo(options.visibleTo);
    }

    if (options.image) {
      await this.validateWantImage(options.image.data);
      await this.uploadWantImage(want.id, {
        data: options.image.data,
        mimeType: options.image.mimeType,
      });
    }

    const {sql} = this.settings;

    await sql.begin(async sql => {
      if (options.administratorsIds) {
        await sql`
          UPDATE ${this.wantsMembersTable} 
          SET role = ${WantMemberRole.Administrator}
          WHERE ${sql('wantId')} = ${want.id}
          AND ${sql('userId')} IN ${options.administratorsIds}
        `;
      }

      if (options.membersIds) {
        await sql`
          UPDATE ${this.wantsMembersTable} 
          SET role = ${WantMemberRole.Member}
          WHERE ${sql('wantId')} = ${want.id}
          AND ${sql('userId')} IN ${options.membersIds}
        `;
      }

      const wantUpdate = {
        title: options.title || want.title,
        description: options.description || want.description,
        visibility: options.visibility || want.visibility,
      };

      await sql`
        UPDATE ${sql(this.wantsTable)}
        SET 
          title = ${wantUpdate.title}
          ${
            wantUpdate.description
              ? sql`, description = ${wantUpdate.description}`
              : sql``
          }
          , visibility = ${wantUpdate.visibility}
          , ${sql('updatedAt')} = now()
        WHERE id = ${want.id}
      `;

      if (options.visibility === WantVisibility.Specific && options.visibleTo) {
        await sql`
          UPDATE ${sql(this.wantsVisibleToTable)}
          SET ${sql('deletedAt')} = now()
          WHERE ${sql('wantId')} = ${want.id}
        `;

        await sql`
          INSERT INTO ${sql(this.wantsVisibleToTable)} ${sql(
          options.visibleTo.map(userId => {
            return {
              wantId: want.id,
              userId,
            };
          })
        )}
        `;
      }
    });

    const updatedWant = await this.getWantById(wantId);

    if (!updatedWant) {
      throw new Error(
        `Updated Want ${wantId} not found. This should not happen`
      );
    }

    return updatedWant;
  }

  private async getWantImageURL(wantId: string): Promise<string | undefined> {
    const {sql, storage} = this.settings;

    const [row]: [WantImageRow?] = await sql`
      SELECT 
        ${sql('googleStorageBucket')},
        ${sql('googleStorageFile')}
      FROM ${sql(this.wantsImagesTable)}
      WHERE ${sql('wantId')} = ${wantId}
    `;
    if (!row) {
      return;
    }

    const expires = dayjs().add(1, 'hour').toDate();

    const [imageURL] = await storage.client
      .bucket(row.googleStorageBucket)
      .file(row.googleStorageFile)
      .getSignedUrl({
        action: 'read',
        expires,
      });

    return imageURL;
  }

  private async uploadWantImage(
    wantId: string,
    // TODO(Marcus): Check mimeType from Buffer? Could use https://github.com/sindresorhus/file-type but converting this project to ESM seems a bit of a hassle at this point.
    image: {data: Buffer; mimeType: string}
  ): Promise<{storage: {bucket: string; fileName: string}}> {
    const want = await this.getWantById(wantId);

    if (!want) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
    const allowedMimeTypes = [
      'image/bmp',
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(image.mimeType)) {
      throw new RangeError(
        `Invalid image mimeType ${
          image.mimeType
        }. Allowed values: ${allowedMimeTypes.join(',')}`
      );
    }

    await this.validateWantImage(image.data);

    const {sql, storage} = this.settings;

    const fileName = `images/${wantId}.${mime.extension(image.mimeType)}`;

    const gcsFile = storage.client
      .bucket(storage.buckets.wantsAssets)
      .file(fileName);

    await gcsFile.save(image.data);

    await sql`
      INSERT INTO ${sql(this.wantsImagesTable)}(
        ${sql('wantId')},
        ${sql('googleStorageBucket')},
        ${sql('googleStorageFile')}
      ) VALUES(
        ${want.id},
        ${gcsFile.bucket.name},
        ${gcsFile.name}
      )
      ON CONFLICT(${sql('wantId')}) DO UPDATE
      SET
        ${sql('googleStorageBucket')} = ${gcsFile.bucket.name},
        ${sql('googleStorageFile')} = ${gcsFile.name},
        ${sql('updatedAt')} = now()
    `;

    return {
      storage: {
        bucket: gcsFile.bucket.name,
        fileName: gcsFile.name,
      },
    };
  }

  private async geocodeAddress(address: string): Promise<GeocodeResult> {
    const geocodeAddressResponse =
      await this.settings.googleMapsServicesClient.geocode({
        params: {
          address,
          key: this.settings.googleApiKey,
        },
      });

    return geocodeAddressResponse.data.results[0];
  }

  private async detectTextExplicitContentCategory(
    text: string
  ): Promise<string | undefined> {
    const [moderateTextResult] =
      await this.settings.language.client.moderateText({
        document: {
          type: 'PLAIN_TEXT',
          content: text,
        },
      });

    if (!moderateTextResult.moderationCategories) {
      return;
    }

    const confidenceThreshold = 0.8;
    const excludedCategories = ['Health', 'Legal', 'Religion & Belief'];

    for (const moderationCategory of moderateTextResult.moderationCategories) {
      if (!moderationCategory.name) {
        continue;
      }

      if (excludedCategories.includes(moderationCategory.name)) {
        continue;
      }

      if (!moderationCategory.confidence) {
        continue;
      }

      if (moderationCategory.confidence > confidenceThreshold) {
        return moderationCategory.name;
      }
    }

    return;
  }

  private async detectImageExplicitContentCategory(
    imageData: Buffer
  ): Promise<string | undefined> {
    const [safeSearchDetectionResult] =
      await this.settings.vision.imageAnnotatorClient.safeSearchDetection(
        imageData
      );

    const detections = safeSearchDetectionResult.safeSearchAnnotation;

    if (!detections) {
      return;
    }

    if (detections.adult === 'LIKELY' || detections.adult === 'VERY_LIKELY') {
      return 'Adult';
    }

    if (
      detections.medical === 'LIKELY' ||
      detections.medical === 'VERY_LIKELY'
    ) {
      return 'Medical';
    }

    if (detections.racy === 'LIKELY' || detections.racy === 'VERY_LIKELY') {
      return 'Racy';
    }

    if (detections.spoof === 'LIKELY' || detections.spoof === 'VERY_LIKELY') {
      return 'Spoof';
    }

    if (
      detections.violence === 'LIKELY' ||
      detections.violence === 'VERY_LIKELY'
    ) {
      return 'Violence';
    }

    return;
  }

  private async validateWantAdministratorsIds(adminsIds: string[]) {
    for (const userId of adminsIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantMembersIds(membersIds: string[]) {
    for (const userId of membersIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantTitle(text: string) {
    const explicitContentCategory =
      await this.detectTextExplicitContentCategory(text);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} detected in title: ${text}. Explicit content is not allowed.`
      );
    }
  }

  private async validateWantDescription(text: string) {
    const explicitContentCategory =
      await this.detectTextExplicitContentCategory(text);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} detected in description: ${text}. Explicit content is not allowed.`
      );
    }
  }

  private async validateWantVisibleTo(visibleToUserIds: string[]) {
    for (const userId of visibleToUserIds) {
      const user = await this.settings.usersService.getUserById(userId);

      if (!user) {
        throw new NotFoundError(`User ${userId} not found`);
      }
    }
  }

  private async validateWantImage(imageData: Buffer) {
    const explicitContentCategory =
      await this.detectImageExplicitContentCategory(imageData);

    if (explicitContentCategory) {
      throw new RangeError(
        `${explicitContentCategory} content detected. Explicit content is not allowed. `
      );
    }
  }
}

export {WantsService};
