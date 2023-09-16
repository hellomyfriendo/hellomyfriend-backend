import {Sql} from 'postgres';

exports.up = async (client: Sql) => {
  await client`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,

      CONSTRAINT from_user_id_to_user_id_unique UNIQUE(from_user_id, to_user_id, deleted_at)
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS friends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      user2_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE,

      CONSTRAINT user1_id_user2_id_unique UNIQUE(user1_id, user2_id, deleted_at)
    )
  `;
};

exports.down = async (client: Sql) => {
  await client`
    DROP TABLE IF EXISTS friends
  `;

  await client`
    DROP TABLE IF EXISTS friend_requests
  `;

  await client`
    DROP TABLE IF EXISTS users
  `;
};
