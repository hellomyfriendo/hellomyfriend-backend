import {
  FieldValue,
  Filter,
  Firestore,
  FirestoreDataConverter,
} from '@google-cloud/firestore';
import {UsersService} from '../../../../users/v1';
import {Friendship} from '../../models';
import {AlreadyExistsError, NotFoundError} from '../../../../errors';

const friendshipConverter: FirestoreDataConverter<Friendship> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toFirestore: function (_want) {
    throw new Error('Function not implemented.');
  },

  fromFirestore: function (snapshot) {
    const data = snapshot.data();

    return {
      id: snapshot.id,
      userId1: data.userId1,
      userId2: data.userId2,
      createdAt: data.createdAt.toDate(),
      deletedAt: data.deletedAt?.toDate(),
    };
  },
};

interface FriendsServiceSettings {
  firestore: {
    client: Firestore;
    collections: {
      friendships: string;
    };
  };
  usersService: UsersService;
}

interface ListFriendshipsOptions {
  userId?: string;
}

class FriendsService {
  constructor(private settings: FriendsServiceSettings) {}

  async createFriendship(
    userId1: string,
    userId2: string
  ): Promise<Friendship> {
    if (await this.areFriends(userId1, userId2)) {
      throw new AlreadyExistsError(
        `Users ${userId1} and ${userId2} are already friends`
      );
    }

    const user1 = await this.settings.usersService.getUserById(userId1);

    if (!user1) {
      throw new NotFoundError(`User ${userId1} not found`);
    }

    const user2 = await this.settings.usersService.getUserById(userId2);

    if (!user2) {
      throw new NotFoundError(`User ${userId2} not found`);
    }

    const friendshipDocRef = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.friendships)
      .add({
        userId1: user1.id,
        userId2: user2.id,
        createdAt: FieldValue.serverTimestamp(),
        deletedAt: null,
      });

    const friendship = await this.getFriendshipById(friendshipDocRef.id);

    if (!friendship) {
      throw new Error(
        `Friendship ${friendshipDocRef.id} not found. This should never happen`
      );
    }

    return friendship;
  }

  async getFriendshipById(
    friendshipId: string
  ): Promise<Friendship | undefined> {
    const friendshipDocSnapshot = await this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.friendships}/${friendshipId}`)
      .withConverter(friendshipConverter)
      .get();

    const friendship = friendshipDocSnapshot.data();

    if (!friendship) {
      return;
    }

    if (friendship.deletedAt) {
      return;
    }

    return friendship;
  }

  async listFriendships(
    options: ListFriendshipsOptions
  ): Promise<Friendship[]> {
    let listFriendshipsQuery = this.settings.firestore.client
      .collection(this.settings.firestore.collections.friendships)
      .withConverter(friendshipConverter)
      .where('deletedAt', '==', null);

    if (options.userId) {
      listFriendshipsQuery = listFriendshipsQuery.where(
        Filter.or(
          Filter.where('userId1', '==', options.userId),
          Filter.where('userId2', '==', options.userId)
        )
      );
    }

    const listFriendshipsQuerySnapshot = await listFriendshipsQuery.get();

    return listFriendshipsQuerySnapshot.docs.map(doc => doc.data());
  }

  async listFriendsByUserId(userId: string): Promise<string[]> {
    const userFriendships = await this.listFriendships({
      userId,
    });

    return userFriendships.map(friendship => {
      if (friendship.userId1 === userId) {
        return friendship.userId2;
      }

      if (friendship.userId2 === userId) {
        return friendship.userId1;
      }

      throw new Error(
        `User ${userId} was not found in neither userId1 or userId2 of Friendship ${friendship.id}. This should never happen`
      );
    });
  }

  async deleteFriendship(friendshipId: string) {
    const friendshipDocRef = this.settings.firestore.client
      .doc(`${this.settings.firestore.collections.friendships}/${friendshipId}`)
      .withConverter(friendshipConverter);

    const friendshipDoc = await friendshipDocRef.get();

    const friendship = friendshipDoc.data();

    if (!friendship) {
      throw new NotFoundError(`Friendship ${friendshipId} not found`);
    }

    if (friendship.deletedAt) {
      throw new NotFoundError(`Friendship ${friendshipId} not found`);
    }

    await friendshipDocRef.update({
      deletedAt: FieldValue.serverTimestamp(),
    });
  }

  async areFriends(userId1: string, userId2: string) {
    const areFriendsQuery = await this.settings.firestore.client
      .collection(this.settings.firestore.collections.friendships)
      .where('deletedAt', '==', null)
      .where('userId1', 'in', [userId1, userId2])
      .where('userId2', 'in', [userId1, userId2])
      .limit(1)
      .get();

    if (areFriendsQuery.empty) {
      return false;
    }

    return true;
  }
}

export {FriendsService};