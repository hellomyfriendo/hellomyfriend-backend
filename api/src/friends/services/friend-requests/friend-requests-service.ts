import {Sql} from 'postgres';
import {UsersService} from '../../../users';
import {FriendRequest} from '../../models';
import {FriendsService} from '../friends';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

interface FriendRequestsServiceSettings {
  sql: Sql;
  friendsService: FriendsService;
  usersService: UsersService;
}

interface ListFriendRequestsOptions {
  fromUserId?: string;
  toUserId?: string;
  orderBy?: {
    column: 'createdAt';
    direction: 'asc' | 'desc';
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

    const fromUser = await this.settings.usersService.getUserById(fromUserId);

    if (!fromUser) {
      throw new NotFoundError(`From user ${fromUserId} not found`);
    }

    const toUser = await this.settings.usersService.getUserById(toUserId);

    if (!toUser) {
      throw new NotFoundError(`To user ${toUserId} not found`);
    }

    const {sql} = this.settings;

    const [friendRequest]: [FriendRequest] = await sql`
      INSERT INTO ${sql(this.friendRequestsTable)} ${sql({
      fromUserId,
      toUserId,
    })}
      RETURNING *
    `;

    return friendRequest;
  }

  async getFriendRequestById(
    friendRequestId: string
  ): Promise<FriendRequest | undefined> {
    const {sql} = this.settings;

    const [friendRequest]: [FriendRequest?] = await sql`
      SELECT *
      FROM ${sql(this.friendRequestsTable)}
      WHERE deleted_at IS NULL
      AND id = ${friendRequestId}
    `;

    return friendRequest;
  }

  async getFriendRequestByFromUserIdAndToUserId(
    fromUserId: string,
    toUserId: string
  ): Promise<FriendRequest | undefined> {
    const {sql} = this.settings;

    const [friendRequest]: [FriendRequest?] = await sql`
      SELECT *
      FROM ${sql(this.friendRequestsTable)}
      WHERE ${sql('deletedAt')} IS NULL
      AND ${sql('fromUserId')} = ${fromUserId}
      AND ${sql('toUserId')} = ${toUserId}
    `;

    return friendRequest;
  }

  async listFriendRequests(
    options: ListFriendRequestsOptions
  ): Promise<FriendRequest[]> {
    const {sql} = this.settings;

    const friendRequests = await sql<FriendRequest[]>`
      SELECT *
      FROM ${sql(this.friendRequestsTable)}
      WHERE ${sql('deletedAt')} IS NULL
      ${
        options.fromUserId
          ? sql`AND ${sql('fromUserId')} = ${options.fromUserId}`
          : sql``
      }
      ${
        options.toUserId
          ? sql`AND ${sql('toUserId')} = ${options.toUserId}`
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

    return friendRequests;
  }

  async deleteFriendRequest(friendRequestId: string): Promise<void> {
    const {sql} = this.settings;

    const queryResult = await sql`
      UPDATE ${sql(this.friendRequestsTable)}
      SET ${sql('deletedAt')} = NOW()
      WHERE id = ${friendRequestId}
      AND deleted_at IS NULL
    `;

    if (queryResult.count === 0) {
      throw new NotFoundError(`Friend Request ${friendRequestId} not found`);
    }
  }
}

export {FriendRequestsService};
