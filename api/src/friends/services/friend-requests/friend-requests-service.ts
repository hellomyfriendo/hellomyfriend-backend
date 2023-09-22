import {Knex} from 'knex';
import {UsersService} from '../../../users';
import {FriendRequest} from '../../models';
import {FriendsService} from '../friends';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

interface FriendRequestsServiceSettings {
  knex: Knex;
  friendsService: FriendsService;
  usersService: UsersService;
}

interface ListFriendRequestsOptions {
  fromUserId?: string;
  toUserId?: string;
  orderBy?: {
    column: 'createdAt';
    order: 'asc' | 'desc';
  }[];
}

class FriendRequestsService {
  private readonly friendRequestsTable = 'friend_requests';

  constructor(private settings: FriendRequestsServiceSettings) {}

  async createFriendRequest(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest> {
    if (fromUserId === toUserId) {
      throw new RangeError('Cannot send a Friend Request to self');
    }

    if (await this.settings.friendsService.areFriends(fromUserId, toUserId)) {
      throw new AlreadyExistsError(
        `Users ${fromUserId} and ${toUserId} are already friends`
      );
    }

    if (
      await this.getFriendRequestByFromUserIdAndToUserId(toUserId, fromUserId)
    ) {
      throw new AlreadyExistsError(
        `A Friend Request from ${toUserId} to ${fromUserId} already exists`
      );
    }

    const fromUser = await this.settings.usersService.getUserById(fromUserId);

    if (!fromUser) {
      throw new NotFoundError(`From user ${fromUserId} not found`);
    }

    const toUser = await this.settings.usersService.getUserById(toUserId);

    if (!toUser) {
      throw new NotFoundError(`To user ${toUserId} not found`);
    }

    const {knex} = this.settings;

    const [friendRequest] = await knex<FriendRequest>(this.friendRequestsTable)
      .insert({fromUserId, toUserId})
      .onConflict(['fromUserId', 'toUserId'])
      .merge()
      .returning('*');

    return friendRequest;
  }

  async getFriendRequestById(
    friendRequestId: string
  ): Promise<FriendRequest | undefined> {
    const {knex} = this.settings;

    const [friendRequest] = await knex<FriendRequest>(
      this.friendRequestsTable
    ).where({id: friendRequestId});

    return friendRequest;
  }

  async getFriendRequestByFromUserIdAndToUserId(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest | undefined> {
    const {knex} = this.settings;

    const [friendRequest] = await knex<FriendRequest>(
      this.friendRequestsTable
    ).where({fromUserId, toUserId});

    return friendRequest;
  }

  async listFriendRequests(
    options: ListFriendRequestsOptions
  ): Promise<FriendRequest[]> {
    const {knex} = this.settings;

    const friendRequests = await knex<FriendRequest>(
      this.friendRequestsTable
    ).modify(queryBuilder => {
      if (options.fromUserId) {
        queryBuilder.where('fromUserId', options.fromUserId);
      }

      if (options.toUserId) {
        queryBuilder.where('toUserId', options.toUserId);
      }

      if (options.orderBy) {
        queryBuilder.orderBy(options.orderBy);
      }

      return queryBuilder;
    });

    return friendRequests;
  }

  async deleteFriendRequest(friendRequestId: string): Promise<void> {
    const {knex} = this.settings;

    const rowCount = await knex(this.friendRequestsTable)
      .where({id: friendRequestId})
      .delete();

    if (rowCount === 0) {
      throw new NotFoundError(`Friend Request ${friendRequestId} not found`);
    }
  }
}

export {FriendRequestsService};
