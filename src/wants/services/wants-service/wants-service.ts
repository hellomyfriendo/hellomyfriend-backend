import {
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {Storage} from '@google-cloud/storage';
import {Client} from '@googlemaps/google-maps-services-js';
import {geohashForLocation} from 'geofire-common';
import mime from 'mime-types';
import {Want, WantImage, WantVisibility, WantVisibleTo} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';

interface WantDocVisibility {
  visibleTo: WantVisibleTo | string[];
  address?: string;
  radiusInMeters?: number;
  googlePlaceId?: string;
  location?: {
    lat: number;
    lng: number;
  };
  geohash?: string;
}

interface WantDoc {
  creator: string;
  admins: string[];
  title: string;
  description?: string;
  visibility: WantDocVisibility;
  image?: WantImage;
  createdAt: Date;
  updatedAt: Date;
}

const wantDocConverter: FirestoreDataConverter<WantDoc> = {
  toFirestore: function (
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    modelObject: FirebaseFirestore.WithFieldValue<WantDoc>
  ): FirebaseFirestore.DocumentData {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (
    snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
  ): WantDoc {
    const data = snapshot.data();

    return {
      creator: data.creator,
      admins: data.admins,
      title: data.title,
      description: data.description,
      visibility: data.visibility,
      image: data.image,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};

interface WantsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      wants: string;
    };
  };
  storage: {
    client: Storage;
    buckets: {
      wantsImages: string;
    };
  };
  googleApiKey: string;
  googleMapsServicesClient: Client;
  usersService: UsersService;
}

interface CreateWantOptions {
  creator: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
}

interface UpdateWantOptions {
  admins?: string[];
  title?: string;
  description?: string;
  visibility?: WantVisibility;
  image: {
    data: Buffer;
    mimeType: string;
  };
}

class WantsService {
  constructor(private readonly settings: WantsServiceSettings) {}

  async createWant(options: CreateWantOptions): Promise<Want> {
    const creator = await this.settings.usersService.getUserById(
      options.creator
    );

    if (!creator) {
      throw new NotFoundError(`Creator id ${options.creator} not found`);
    }

    const wantDocVisibility = await this.getWantDocVisibility(
      options.visibility
    );

    const now = new Date();

    const wantDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.wants)
      .add({
        creator: creator.id,
        admins: [creator.id],
        title: options.title,
        description: options.description,
        visibility: wantDocVisibility,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

    const want = await this.getWantById(wantDocRef.id);

    if (!want) {
      throw new Error(
        'This should not happen. Want should not be undefined at this point'
      );
    }

    return want;
  }

  async getWantById(wantId: string): Promise<Want | undefined> {
    const wantDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.wants}/${wantId}`)
      .withConverter(wantDocConverter)
      .get();

    const wantDocData = wantDocSnapshot.data();

    if (!wantDocData) {
      return;
    }

    const want: Want = {
      id: wantDocSnapshot.id,
      creator: wantDocData.creator,
      admins: wantDocData.admins,
      title: wantDocData.title,
      description: wantDocData.description,
      visibility: {
        visibleTo: wantDocData.visibility.visibleTo,
        address: wantDocData.visibility.address,
        radiusInMeters: wantDocData.visibility.radiusInMeters,
      },
      image: wantDocData.image,
      createdAt: wantDocData.createdAt,
      updatedAt: wantDocData.updatedAt,
    };

    return want;
  }

  async updateWantById(
    wantId: string,
    updateWantOptions: UpdateWantOptions
  ): Promise<Want> {
    const wantDocRef = this.settings.firestore.client.doc(
      `${this.settings.firestore.collections.wants}/${wantId}`
    );

    const wantDocSnapshot = await wantDocRef.get();

    const wantData = wantDocSnapshot.data();

    if (!wantData) {
      throw new NotFoundError(`Want ${wantId} not found`);
    }

    if (!Object.values(updateWantOptions).some(option => option)) {
      return (await this.getWantById(wantId))!;
    }

    await this.settings.firestore.client.runTransaction(async t => {
      if (updateWantOptions.admins) {
        wantData.admins = updateWantOptions.admins;
      }

      if (updateWantOptions.title) {
        wantData.title = updateWantOptions.title;
      }

      if (updateWantOptions.description) {
        wantData.description = updateWantOptions.description;
      }

      if (updateWantOptions.visibility) {
        wantData.visibility = await this.getWantDocVisibility(
          updateWantOptions.visibility
        );
      }

      if (updateWantOptions.image) {
        const imageUrl = await this.uploadWantImage(
          wantId,
          updateWantOptions.image
        );

        const wantImage: WantImage = {
          url: imageUrl,
        };

        wantData.image = wantImage;
      }

      t.update(wantDocRef, {
        ...wantData,
        updatedAt: Timestamp.now(),
      });
    });

    return (await this.getWantById(wantId))!;
  }

  private async getWantDocVisibility(
    visibility: WantDocVisibility
  ): Promise<WantDocVisibility> {
    let wantDocVisibility: WantDocVisibility = {
      visibleTo: visibility.visibleTo,
    };

    if (visibility.address || visibility.radiusInMeters) {
      if (!visibility.address) {
        throw new RangeError('address is required when radiusInMeters is set');
      }

      if (!visibility.radiusInMeters) {
        throw new RangeError('radiusInMeters is required when address is set');
      }

      const geocodedAddress = await this.geocodeAddress(visibility.address);

      wantDocVisibility = {
        ...wantDocVisibility,
        address: visibility.address,
        radiusInMeters: visibility.radiusInMeters,
        googlePlaceId: geocodedAddress.place_id,
        location: geocodedAddress.geometry.location,
        geohash: geohashForLocation([
          geocodedAddress.geometry.location.lat,
          geocodedAddress.geometry.location.lng,
        ]),
      };
    }

    return wantDocVisibility;
  }

  private async geocodeAddress(address: string) {
    const geocodeAddressResponse =
      await this.settings.googleMapsServicesClient.geocode({
        params: {
          address,
          key: this.settings.googleApiKey,
        },
      });

    return geocodeAddressResponse.data.results[0];
  }

  private async uploadWantImage(
    wantId: string,
    // TODO(Marcus): Check mimeType from Buffer? Could use https://github.com/sindresorhus/file-type but converting this project to ESM seems a bit of a hassle at this point.
    image: {data: Buffer; mimeType: string}
  ) {
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

    const fileName = `${wantId}.${mime.extension(image.mimeType)}`;

    const gcsFile = this.settings.storage.client
      .bucket(this.settings.storage.buckets.wantsImages)
      .file(fileName);

    await gcsFile.save(image.data);

    return gcsFile.publicUrl();
  }
}

export {WantsService};
