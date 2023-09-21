exports.up = async client => {
  await client`
    CREATE EXTENSION IF NOT EXISTS postgis
  `;

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
      visibility TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      google_place_id TEXT NOT NULL,
      radius_in_meters INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      deleted_at TIMESTAMP WITH TIME ZONE
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

  await client`
    CREATE TABLE IF NOT EXISTS wants_images(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      want_id UUID REFERENCES wants(id),
      google_storage_bucket TEXT NOT NULL,
      google_storage_file TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

      CONSTRAINT wants_images_want_id_unique UNIQUE(want_id)
    )
  `;
};

exports.down = async client => {
  await client`
    DROP TABLE IF EXISTS wants_images
  `;

  await client`
    DROP TABLE IF EXISTS wants_visible_to;
  `;

  await client`
    DROP TABLE IF EXISTS wants_members;
  `;

  await client`
    DROP TABLE IF EXISTS wants;
  `;

  await client`
    DROP TABLE IF EXISTS friends
  `;

  await client`
    DROP TABLE IF EXISTS friend_requests;
  `;

  await client`
    DROP TABLE IF EXISTS users;
  `;
};
