import {
  FieldValue,
  Firestore,
  FirestoreDataConverter,
  Timestamp,
} from '@google-cloud/firestore';
import {UsersService} from '../../../users';
import {FriendRequest, Follow} from '../../models';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

const followConverter: FirestoreDataConverter<Follow> = {
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
      status: data.status,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    };
  },
};

interface FriendsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      friendRequests: string;
      follows: string;
    };
  };
  usersService: UsersService;
}

interface ListFriendRequestsOptions {
  fromUserId?: string;
  toUserId?: string;
}

interface ListFollowsOptions {
  fromUserId?: string;
  toUserId?: string;
}

class FriendsService {
  constructor(private settings: FriendsServiceSettings) {}

  async createFriendship(friendRequestId: string) {
    const friendRequest = await this.getFriendRequestById(friendRequestId);

    if (!friendRequest) {
      throw new NotFoundError(`Friend Request ${friendRequestId} not found`);
    }

    const now = new Date();

    await this.settings.firestore.client.runTransaction(async t => {
      const fromUserFollowDocRef = this.settings.firestore.client
        .collection(this.settings.firestore.collections.follows)
        .doc();

      t.set(fromUserFollowDocRef, {
        fromUserId: friendRequest.fromUserId,
        toUserId: friendRequest.toUserId,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        deletedAt: null,
      });

      const toUserFollowDocRef = this.settings.firestore.client
        .collection(this.settings.firestore.collections.follows)
        .doc();

      t.set(toUserFollowDocRef, {
        fromUserId: friendRequest.toUserId,
        toUserId: friendRequest.fromUserId,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
        deletedAt: null,
      });

      const friendRequestDocRef = this.settings.firestore.client.doc(
        `${this.settings.firestore.collections.friendRequests}/${friendRequest.id}`
      );

      t.set(friendRequestDocRef, {
        deletedAt: Timestamp.fromDate(now),
      });
    });
  }

  async listFriendsByUserId(userId: string) {
    const [followsFromUser, followsToUser] = await Promise.all([
      this.listFollows({
        fromUserId: userId,
      }),
      this.listFollows({
        toUserId: userId,
      }),
    ]);

    return followsFromUser
      .filter(followFrom =>
        followsToUser.some(
          followTo => followTo.fromUserId === followFrom.toUserId
        )
      )
      .map(followFrom => followFrom.toUserId);
  }

  async deleteFriendship(userId1: string, userId2: string) {
    if (!(await this.areFriends(userId1, userId2))) {
      return;
    }

    const now = new Date();

    await this.settings.firestore.client.runTransaction(async t => {
      const fromUserFollowDocRef = this.settings.firestore.client
        .collection(this.settings.firestore.collections.follows)
        .doc();

      t.set(fromUserFollowDocRef, {
        deletedAt: Timestamp.fromDate(now),
      });

      const toUserFollowDocRef = this.settings.firestore.client
        .collection(this.settings.firestore.collections.follows)
        .doc();

      t.set(toUserFollowDocRef, {
        deletedAt: Timestamp.fromDate(now),
      });
    });
  }

  async areFriends(userId1: string, userId2: string) {
    return (
      await Promise.all([
        this.isFollowing(userId1, userId2),
        this.isFollowing(userId2, userId1),
      ])
    ).every(Boolean);
  }

  async createFriendRequest(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new RangeError('Cannot send a Friend Request to own self');
    }

    if (await this.areFriends(fromUserId, toUserId)) {
      throw new AlreadyExistsError(
        `Users ${fromUserId} and ${toUserId} are already friends`
      );
    }

    if (
      await this.getFriendRequestByFromUserIdAndToUserId(fromUserId, toUserId)
    ) {
      throw new AlreadyExistsError(
        `Friend Request from ${fromUserId} to ${toUserId} already exists`
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

    const friendshipRequestsCollection =
      this.settings.firestore.client.collection(
        this.settings.firestore.collections.friendRequests
      );

    const friendshipRequestDocRef = await friendshipRequestsCollection.add({
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      deletedAt: null,
    });

    return (await this.getFriendRequestById(friendshipRequestDocRef.id))!;
  }

  async getFriendRequestById(friendRequestId: string) {
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

  async getFriendRequestByFromUserIdAndToUserId(
    fromUserId: string,
    toUserId: string
  ) {
    const getFriendRequestByFromUserIdAndToUserIdQuerySnapshot =
      await this.settings.firestore.client
        .collection(this.settings.firestore.collections.friendRequests)
        .where('deletedAt', '==', null)
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .limit(1)
        .withConverter(friendRequestConverter)
        .get();

    if (getFriendRequestByFromUserIdAndToUserIdQuerySnapshot.empty) {
      return;
    }

    return getFriendRequestByFromUserIdAndToUserIdQuerySnapshot.docs[0].data();
  }

  async listFriendRequests(options: ListFriendRequestsOptions) {
    let listFriendRequestsQuery = this.settings.firestore.client
      .collection(this.settings.firestore.collections.friendRequests)
      .where('deletedAt', '==', null)
      .withConverter(friendRequestConverter);

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

    return listFriendRequestsQuerySnapshot.docs.map(snapshot =>
      snapshot.data()
    );
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

  private async getFollowByFromUserIdAndToUserId(
    fromUserId: string,
    toUserId: string
  ) {
    const getFollowByFromUserIdAndToUserIdQuerySnapshot =
      await this.settings.firestore.client
        .collection(this.settings.firestore.collections.follows)
        .where('deletedAt', '==', null)
        .where('fromUserId', '==', fromUserId)
        .where('toUserId', '==', toUserId)
        .limit(1)
        .withConverter(followConverter)
        .get();

    if (getFollowByFromUserIdAndToUserIdQuerySnapshot.empty) {
      return;
    }

    return getFollowByFromUserIdAndToUserIdQuerySnapshot.docs[0].data();
  }

  private async listFollows(options: ListFollowsOptions) {
    let listFollowsQuery = this.settings.firestore.client
      .collection(this.settings.firestore.collections.follows)
      .where('deletedAt', '==', null)
      .withConverter(followConverter);

    if (options.fromUserId) {
      listFollowsQuery = listFollowsQuery.where(
        'fromUserId',
        '==',
        options.fromUserId
      );
    }

    if (options.toUserId) {
      listFollowsQuery = listFollowsQuery.where(
        'toUserId',
        '==',
        options.toUserId
      );
    }

    const listFollowsQuerySnapshot = await listFollowsQuery.get();

    return listFollowsQuerySnapshot.docs.map(snapshot => snapshot.data());
  }

  private async isFollowing(fromUserId: string, toUserId: string) {
    const follow = await this.getFollowByFromUserIdAndToUserId(
      fromUserId,
      toUserId
    );

    if (!follow) {
      return false;
    }

    return true;
  }
}

export {FriendsService};
