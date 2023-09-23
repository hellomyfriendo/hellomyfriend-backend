/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS postgis');

  await knex.schema.createTable('wants', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('creator_id').notNullable();
    table.string('title').notNullable();
    table.text('description');
    table
      .enu('visibility', ['public', 'friends', 'specific'], {
        useNative: true,
        enumName: 'want_visibility',
      })
      .notNullable();
    table.string('address').notNullable();
    table.double('latitude').notNullable();
    table.double('longitude').notNullable();
    table.string('google_place_id').notNullable();
    table.integer('radius_in_meters').notNullable();
    table.timestamps({defaultToNow: true});
  });

  await knex.schema.createTable('wants_members', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('want_id').references('id').inTable('wants').onDelete('CASCADE');
    table.string('user_id').notNullable();
    table.enum('role', ['administrator', 'member'], {
      useNative: true,
      enumName: 'want_member_role',
    });
    table.timestamps({defaultToNow: true});

    table.unique(['want_id', 'user_id']);
  });

  await knex.schema.createTable('wants_visible_to', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('want_id').references('id').inTable('wants').onDelete('CASCADE');
    table.string('user_id').notNullable();
    table.timestamps({defaultToNow: true});

    table.unique(['want_id', 'user_id']);
  });

  await knex.schema.createTable('wants_images', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('want_id').references('id').inTable('wants').onDelete('CASCADE');
    table.string('google_storage_bucket');
    table.string('google_storage_file');
    table.timestamps({defaultToNow: true});

    table.unique('want_id');
    table.unique(['google_storage_bucket', 'google_storage_file']);
  });

  await knex.schema.createTable('friend_requests', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('from_user_id').notNullable();
    table.string('to_user_id').notNullable();
    table.timestamps({defaultToNow: true});

    table.unique(['from_user_id', 'to_user_id']);
  });

  await knex.schema.createTable('friends', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('user1_id').notNullable();
    table.string('user2_id').notNullable();
    table.timestamps({defaultToNow: true});

    table.unique(['user1_id', 'user2_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('friends');
  await knex.schema.dropTableIfExists('friend_requests');
  await knex.schema.dropTableIfExists('wants_images');
  await knex.schema.dropTableIfExists('wants_visible_to');
  await knex.schema.dropTableIfExists('wants_members');
  await knex.schema.raw('DROP TYPE want_member_role');
  await knex.schema.dropTableIfExists('wants');
  await knex.schema.raw('DROP TYPE want_visibility');
  await knex.schema.raw('DROP EXTENSION postgis CASCADE');
};
