import {Knex} from 'knex';
import {UsersService} from '../../../users';
import {Friendship} from '../../models';
import {AlreadyExistsError, NotFoundError} from '../../../errors';

interface FriendsServiceSettings {
  knex: Knex;
  usersService: UsersService;
}

interface ListFriendshipsOptions {
  userId?: string;
  orderBy?: {
    column: 'createdAt';
    order: 'asc' | 'desc';
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

    const {knex} = this.settings;

    const [friendship] = await knex<Friendship>(this.friendsTable)
      .insert([
        {user1Id: user1Id, user2Id: user2Id},
        {user1Id: user2Id, user2Id: user1Id},
      ])
      .returning('*');

    return friendship;
  }

  async getFriendshipById(
    friendshipId: string
  ): Promise<Friendship | undefined> {
    const {knex} = this.settings;

    const [friendship] = await knex<Friendship>(this.friendsTable).where({
      id: friendshipId,
    });

    return friendship;
  }

  async listFriendships(
    options: ListFriendshipsOptions
  ): Promise<Friendship[]> {
    const {knex} = this.settings;

    const friendships = await knex<Friendship>(this.friendsTable).modify(
      queryBuilder => {
        if (options.userId) {
          queryBuilder.where('user1Id', options.userId);
        }

        if (options.orderBy) {
          queryBuilder.orderBy(options.orderBy);
        }

        return queryBuilder;
      }
    );

    return friendships;
  }

  async deleteFriendship(friendshipId: string) {
    const {knex} = this.settings;

    const friendship = await this.getFriendshipById(friendshipId);

    if (!friendship) {
      throw new NotFoundError(`Friendship ${friendshipId} not found`);
    }

    await knex(this.friendsTable)
      .where({user1Id: friendship.user1Id, user2Id: friendship.user2Id})
      .orWhere({user1Id: friendship.user2Id, user2Id: friendship.user1Id})
      .delete();
  }

  async areFriends(user1Id: string, user2Id: string) {
    const {knex} = this.settings;

    const [result] = await knex<boolean>(this.friendsTable).whereExists(
      knex.select('id').from(this.friendsTable).where({
        user1Id,
        user2Id,
      })
    );

    return result;
  }
}

export {FriendsService};
