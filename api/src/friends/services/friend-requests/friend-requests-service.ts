import {
  FieldValue,
  Firestore,
  FirestoreDataConverter,
} from '@google-cloud/firestore';
import {UsersService} from '../../../users';
import {FriendRequest} from '../../models';
import {FriendsService} from '../friends';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

const friendRequestConverter: FirestoreDataConverter<FriendRequest> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toFirestore: function (_want) {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (snapshot) {
    const data = snapshot.data();

    return {
      id: snapshot.id,
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      createdAt: data.createdAt.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    };
  },
};

interface FriendRequestsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      friendRequests: string;
    };
  };
  friendsService: FriendsService;
  usersService: UsersService;
}

interface ListFriendRequestsOptions {
  fromUserId?: string;
  toUserId?: string;
}

class FriendRequestsService {
  constructor(private settings: FriendRequestsServiceSettings) {}

  async createFriendRequest(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest> {
    if (fromUserId === toUserId) {
      throw new RangeError('Cannot send a Friend Request to own self');
    }

    if (await this.settings.friendsService.areFriends(fromUserId, toUserId)) {
      throw new AlreadyExistsError(
        `Users ${fromUserId} and ${toUserId} are already friends`
      );
    }

    if (await this.getFriendRequestByUserFromAndUserTo(fromUserId, toUserId)) {
      throw new AlreadyExistsError(
        `Friend Request from user ${fromUserId} to user ${toUserId} already exists`
      );
    }

    const fromUser = await this.settings.usersService.getUserById(fromUserId);

    if (!fromUser) {
      throw new NotFoundError(`From User ${fromUserId} not found`);
    }

    const toUser = await this.settings.usersService.getUserById(toUserId);

    if (!toUser) {
      throw new NotFoundError(`To User ${toUserId} not found`);
    }

    const friendRequestsCollection = this.settings.firestore.client.collection(
      this.settings.firestore.collections.friendRequests
    );

    const friendRequestDocRef = await friendRequestsCollection.add({
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      createdAt: FieldValue.serverTimestamp(),
      deletedAt: null,
    });

    const friendRequest = await this.getFriendRequestById(
      friendRequestDocRef.id
    );

    if (!friendRequest) {
      throw new Error(
        `Friend Request ${friendRequestDocRef.id} not found. This should never happen.`
      );
    }

    return friendRequest;
  }

  async getFriendRequestById(
    friendRequestId: string
  ): Promise<FriendRequest | undefined> {
    const friendRequestDocSnapshot = await this.settings.firestore.client
      .doc(
        `${this.settings.firestore.collections.friendRequests}/${friendRequestId}`
      )
      .withConverter(friendRequestConverter)
      .get();

    const friendRequest = friendRequestDocSnapshot.data();

    if (!friendRequest) {
      return;
    }

    if (friendRequest.deletedAt) {
      return;
    }

    return friendRequest;
  }

  async getFriendRequestByUserFromAndUserTo(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest | undefined> {
    const friendRequests = await this.listFriendRequests({
      fromUserId,
      toUserId,
    });

    if (friendRequests.length === 0) {
      return;
    }

    if (friendRequests.length !== 1) {
      throw new Error(
        `More than one friend request from user ${fromUserId} to user ${toUserId} were found. This should never happen.`
      );
    }

    return friendRequests[0];
  }

  async listFriendRequests(
    options: ListFriendRequestsOptions
  ): Promise<FriendRequest[]> {
    let listFriendRequestsQuery = this.settings.firestore.client
      .collection(this.settings.firestore.collections.friendRequests)
      .withConverter(friendRequestConverter)
      .where('deletedAt', '==', null);

    if (options.fromUserId) {
      listFriendRequestsQuery = listFriendRequestsQuery.where(
        'fromUserId',
        '==',
        options.fromUserId
      );
    }

    if (options.toUserId) {
      listFriendRequestsQuery = listFriendRequestsQuery.where(
        'toUserId',
        '==',
        options.toUserId
      );
    }

    const listFriendRequestsQuerySnapshot = await listFriendRequestsQuery.get();

    return listFriendRequestsQuerySnapshot.docs.map(doc => doc.data());
  }

  async deleteFriendRequest(friendRequestId: string) {
    const friendRequestDocRef = this.settings.firestore.client.doc(
      `${this.settings.firestore.collections.friendRequests}/${friendRequestId}`
    );

    const friendRequestDocRefSnapshot = await friendRequestDocRef.get();

    if (!friendRequestDocRefSnapshot.exists) {
      throw new NotFoundError(`Friend Request ${friendRequestId} not found`);
    }

    await friendRequestDocRef.update({
      deletedAt: FieldValue.serverTimestamp(),
    });
  }
}

export {FriendRequestsService};
