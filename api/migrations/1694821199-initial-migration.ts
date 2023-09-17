import {Sql} from 'postgres';

exports.up = async (client: Sql) => {
  await client`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS friends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      user2_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS wants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      creator_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      visibility TEXT NOT NULL,
      address TEXT NOT NULL,
      coordinates POINT NOT NULL,
      google_place_id TEXT NOT NULL,
      radius_in_meters INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE,

      CONSTRAINT wants_creator_id_title_unique UNIQUE(creator_id, title)
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS wants_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      want_id UUID REFERENCES wants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `;

  await client`
    CREATE TABLE IF NOT EXISTS wants_visible_to(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      want_id UUID REFERENCES wants(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE
    )
  `;
};

exports.down = async (client: Sql) => {
  await client`
    DROP TABLE IF EXISTS wants_visible_to
  `;

  await client`
    DROP TABLE IF EXISTS wants_members
  `;

  await client`
    DROP TABLE IF EXISTS wants
  `;

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
