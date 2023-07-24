import {
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {Storage} from '@google-cloud/storage';
import {Client} from '@googlemaps/google-maps-services-js';
import dayjs from 'dayjs';
import {geohashForLocation, distanceBetween} from 'geofire-common';
import {orderBy} from 'lodash';
import mime from 'mime-types';
import {
  GeolocationCoordinates,
  Want,
  WantImage,
  WantVisibility,
  WantVisibleTo,
} from '../../models';
import {NotFoundError} from '../../../errors';
import {UsersService} from '../../../users';
import {FriendsService} from '../../../friends';

interface WantDocVisibility {
  visibleTo: WantVisibleTo | string[];
  location?: {
    address: string;
    radiusInMeters: number;
    googlePlaceId: string;
    geometry: {
      coordinates: GeolocationCoordinates;
      geohash: string;
    };
  };
}

interface WantDoc {
  id: string;
  creator: string;
  admins: string[];
  members: string[];
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
      id: snapshot.id,
      creator: data.creator,
      admins: data.admins,
      members: data.members,
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
  friendsService: FriendsService;
  usersService: UsersService;
}

interface CreateWantOptions {
  creator: string;
  title: string;
  description?: string;
  visibility: WantVisibility;
}

interface GetHomeWantsFeedOptions {
  userId: string;
  geolocationCoordinates?: GeolocationCoordinates;
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

    return this.toWant(wantDocData);
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
    visibility: WantVisibility
  ): Promise<WantDocVisibility> {
    let wantDocVisibility: WantDocVisibility = {
      visibleTo: visibility.visibleTo,
    };

    if (visibility.location) {
      const geocodedAddress = await this.geocodeAddress(
        visibility.location.address
      );

      wantDocVisibility = {
        ...wantDocVisibility,
        location: {
          address: visibility.location.address,
          radiusInMeters: visibility.location.radiusInMeters,
          googlePlaceId: geocodedAddress.place_id,
          geometry: {
            coordinates: {
              latitude: geocodedAddress.geometry.location.lat,
              longitude: geocodedAddress.geometry.location.lng,
            },
            geohash: geohashForLocation([
              geocodedAddress.geometry.location.lat,
              geocodedAddress.geometry.location.lng,
            ]),
          },
        },
      };
    }

    return wantDocVisibility;
  }

  async getHomeWantsFeed(options: GetHomeWantsFeedOptions): Promise<Want[]> {
    // TODO(Marcus): iterate and optimize this, performance and user experience wise.

    const listFriendsWantsDocs = async (userId: string) => {
      const userFriends =
        await this.settings.friendsService.listFriendsByUserId(userId);

      const wantsDocsSnapshots = await this.settings.firestore.client
        .collection(this.settings.firestore.collections.wants)
        .where('creator', 'in', userFriends)
        .where('visibility', '==', 'friends')
        .withConverter(wantDocConverter)
        .get();

      return wantsDocsSnapshots.docs.map(wantSnapshot => wantSnapshot.data());
    };

    const listUserTargetedWantsDocs = async (userId: string) => {
      const wantsSnapshot = await this.settings.firestore.client
        .collection(this.settings.firestore.collections.wants)
        .where('visibility', 'array-contains', userId)
        .withConverter(wantDocConverter)
        .get();

      return wantsSnapshot.docs.map(wantSnapshot => wantSnapshot.data());
    };

    const listPublicWantsDocs = async () => {
      const wantsSnapshot = await this.settings.firestore.client
        .collection(this.settings.firestore.collections.wants)
        .where('visibility', '==', 'public')
        .withConverter(wantDocConverter)
        .get();

      return wantsSnapshot.docs.map(wantSnapshot => wantSnapshot.data());
    };

    interface CalculateFeedScoreOptions {
      wantDoc: WantDoc;
      userGeolocationCoordinates?: GeolocationCoordinates;
    }

    // TODO(Marcus): This could be an interesting place to use machine learning. Maybe have it receive the userId too so the feed can be tailored.
    const calculateFeedScore = (options: CalculateFeedScoreOptions): number => {
      const calculateVisibilityScore = (wantDoc: WantDoc) => {
        switch (wantDoc.visibility.visibleTo) {
          case WantVisibleTo.Friends:
            return -0.25;
          case WantVisibleTo.Public:
            return -0.15;
          default:
            return -0.2;
        }
      };

      const calculateCreatedAtScore = (want: WantDoc) => {
        const today = dayjs();
        const createdAtDate = dayjs(want.createdAt);

        switch (today.diff(createdAtDate, 'day')) {
          case 0:
          case 1:
            return -0.25;
          case 2:
          case 3:
            return -0.2;
          default:
            return -0.15;
        }
      };

      const calculateMembersCountScore = (want: WantDoc) => {
        const membersCount = want.members.length;

        if (membersCount > 4) {
          return -0.25;
        } else if (membersCount > 2) {
          return -0.2;
        } else {
          return -0.15;
        }
      };

      const calculateLocationScore = (
        wantDoc: WantDoc,
        userGeolocationCoordinates?: GeolocationCoordinates
      ) => {
        if (!wantDoc.visibility.location) {
          return 0;
        }

        if (!userGeolocationCoordinates) {
          return 0;
        }

        const distanceInKm = distanceBetween(
          [
            wantDoc.visibility.location.geometry.coordinates.latitude,
            wantDoc.visibility.location.geometry.coordinates.longitude,
          ],
          [
            userGeolocationCoordinates.latitude,
            userGeolocationCoordinates.longitude,
          ]
        );

        if (distanceInKm < 4) {
          return -0.25;
        } else if (distanceInKm < 8) {
          return -0.2;
        } else {
          return -0.15;
        }
      };

      const score =
        calculateVisibilityScore(options.wantDoc) +
        calculateCreatedAtScore(options.wantDoc) +
        calculateMembersCountScore(options.wantDoc) +
        calculateLocationScore(
          options.wantDoc,
          options.userGeolocationCoordinates
        );

      return score;
    };

    const user = await this.settings.usersService.getUserById(options.userId);

    if (!user) {
      throw new NotFoundError(`User ${options.userId} not found`);
    }

    const [userFriendsWants, userTargetedWants, publicWants] =
      await Promise.all([
        listFriendsWantsDocs(user.id),
        listUserTargetedWantsDocs(user.id),
        listPublicWantsDocs(),
      ]);

    const relevantWants = [
      ...userFriendsWants,
      ...userTargetedWants,
      ...publicWants,
    ];

    const wantsFeed = orderBy(relevantWants, wantDoc =>
      calculateFeedScore({
        wantDoc,
        userGeolocationCoordinates: options.geolocationCoordinates,
      })
    ).map(this.toWant);

    return wantsFeed;
  }

  private toWant(wantDoc: WantDoc) {
    const want: Want = {
      id: wantDoc.id,
      creator: wantDoc.creator,
      admins: wantDoc.admins,
      members: wantDoc.members,
      title: wantDoc.title,
      description: wantDoc.description,
      visibility: {
        visibleTo: wantDoc.visibility.visibleTo,
      },
      image: wantDoc.image,
      createdAt: wantDoc.createdAt,
      updatedAt: wantDoc.updatedAt,
    };

    if (wantDoc.visibility.location) {
      want.visibility.location = {
        address: wantDoc.visibility.location.address,
        radiusInMeters: wantDoc.visibility.location.radiusInMeters,
      };
    }

    return want;
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
