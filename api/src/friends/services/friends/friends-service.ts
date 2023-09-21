import {Sql} from 'postgres';
import {UsersService} from '../../../users';
import {Friendship} from '../../models';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

interface FriendsServiceSettings {
  sql: Sql;
  usersService: UsersService;
}

interface ListFriendshipsOptions {
  userId?: string;
  orderBy?: {
    column: 'createdAt';
    direction: 'asc' | 'desc';
  }[];
}

class FriendsService {
  private readonly friendsTable = 'friends';

  constructor(private settings: FriendsServiceSettings) {}

  async createFriendship(
    user1Id: string,
    user2Id: string
  ): Promise<Friendship> {
    if (await this.areFriends(user1Id, user2Id)) {
      throw new AlreadyExistsError(
        `Users ${user1Id} and ${user2Id} are already friends`
      );
    }

    const user1 = await this.settings.usersService.getUserById(user1Id);

    if (!user1) {
      throw new NotFoundError(`User ${user1Id} not found`);
    }

    const user2 = await this.settings.usersService.getUserById(user2Id);

    if (!user2) {
      throw new NotFoundError(`User ${user2Id} not found`);
    }

    const {sql} = this.settings;

    const [friendship] = await sql<Friendship[]>`
      INSERT INTO ${sql(this.friendsTable)} ${sql([
      {user1Id, user2Id},
      {user1Id: user2Id, user2Id: user1Id},
    ])}
      RETURNING *
    `;

    return friendship;
  }

  async getFriendshipById(
    friendshipId: string
  ): Promise<Friendship | undefined> {
    const {sql} = this.settings;

    const [friendship]: [Friendship?] = await sql`
      SELECT *
      FROM ${sql(this.friendsTable)}
      WHERE ${sql('deletedAt')} IS NULL
      AND id = ${friendshipId}
    `;

    return friendship;
  }

  async listFriendships(
    options: ListFriendshipsOptions
  ): Promise<Friendship[]> {
    const {sql} = this.settings;

    const friendships = await sql<Friendship[]>`
      SELECT * 
      FROM ${sql(this.friendsTable)}
      WHERE ${sql('deletedAt')} IS NULL
      ${options.userId ? sql`AND ${sql('user1Id')} = ${options.userId}` : sql``}
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

    return friendships;
  }

  async deleteFriendship(friendshipId: string) {
    const {sql} = this.settings;

    const friendship = await this.getFriendshipById(friendshipId);

    if (!friendship) {
      throw new NotFoundError(`Friendship ${friendshipId} not found`);
    }

    await sql`
      UPDATE ${sql(this.friendsTable)}
      SET ${sql('deletedAt')} = NOW()
      WHERE ${sql('deletedAt')} IS NULL
      AND (
        (${sql('user1Id')} = ${friendship.user1Id} AND ${sql('user2Id')} = ${
      friendship.user2Id
    }) OR (${sql('user1Id')} = ${friendship.user2Id}  AND ${sql('user2Id')} = ${
      friendship.user1Id
    })
      )
    `;
  }

  async areFriends(user1Id: string, user2Id: string) {
    const {sql} = this.settings;

    const [{exists}]: [{exists: boolean}] = await sql`
      SELECT EXISTS(
        SELECT 1 FROM ${sql(this.friendsTable)}
        WHERE ${sql('deletedAt')} IS NULL
        AND ${sql('user1Id')} = ${user1Id}
        AND ${sql('user2Id')} = ${user2Id}
      );
    `;

    return exists;
  }
}

export {FriendsService};
