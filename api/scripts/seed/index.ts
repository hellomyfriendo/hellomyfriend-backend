import axios from 'axios';
import {faker} from '@faker-js/faker';
import {friendsServiceV1, wantsServiceV1} from '../../src/app';
import {WantVisibleTo} from '../../src/wants/v1/models';

interface Users {
  regularQuebecStFoy1: {
    id: string;
    friends?: string[];
  };
  regularQuebecStFoy2: {
    id: string;
    friends?: string[];
  };
}

async function run() {
  if (!process.env.TEST_USER_REGULAR_QUEBEC_ST_FOY_1_ID) {
    throw new Error(
      'TEST_USER_REGULAR_QUEBEC_ST_FOY_1_ID environment variable is required'
    );
  }

  if (!process.env.TEST_USER_REGULAR_QUEBEC_ST_FOY_2_ID) {
    throw new Error(
      'TEST_USER_REGULAR_QUEBEC_ST_FOY_2_ID environment variable is required'
    );
  }

  // Users
  const users: Users = {
    regularQuebecStFoy1: {
      id: process.env.TEST_USER_REGULAR_QUEBEC_ST_FOY_1_ID,
    },
    regularQuebecStFoy2: {
      id: process.env.TEST_USER_REGULAR_QUEBEC_ST_FOY_2_ID,
    },
  };

  // Friends
  users.regularQuebecStFoy1.friends = [users.regularQuebecStFoy2.id];
  users.regularQuebecStFoy2.friends = [users.regularQuebecStFoy1.id];

  for (const friend of users.regularQuebecStFoy1.friends) {
    await createFriendshipIfNotExist(users.regularQuebecStFoy1.id, friend);
  }

  for (const friend of users.regularQuebecStFoy2.friends) {
    await createFriendshipIfNotExist(users.regularQuebecStFoy2.id, friend);
  }

  // Wants
  await createRegularQuebecStFoy1Wants(users);

  await createRegularQuebecStFoy2Wants(users);
}

async function createFriendshipIfNotExist(userId1: string, userId2: string) {
  if (!(await friendsServiceV1.areFriends(userId1, userId2))) {
    await friendsServiceV1.createFriendship(userId1, userId2);
  }
}

async function createRegularQuebecStFoy1Wants(users: Users) {
  const publicWant = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy1 - Public',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: WantVisibleTo.Public,
    },
  });

  await uploadWantImage(publicWant.id);

  const friendsWant = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy1 - Friends',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: WantVisibleTo.Friends,
    },
  });

  await uploadWantImage(friendsWant.id);

  const regularQuebecStFoy2Want = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy1 - [regularQuebecStFoy2]',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: [users.regularQuebecStFoy2.id!],
    },
  });

  await uploadWantImage(regularQuebecStFoy2Want.id);
}

async function createRegularQuebecStFoy2Wants(users: Users) {
  const publicWant = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy2 - Public',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: WantVisibleTo.Public,
    },
  });

  await uploadWantImage(publicWant.id);

  const friendsWant = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy2 - Friends',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: WantVisibleTo.Friends,
    },
  });

  await uploadWantImage(friendsWant.id);

  const regularQuebecStFoy1Want = await wantsServiceV1.createWant({
    creator: users.regularQuebecStFoy1.id!,
    title: 'regularQuebecStFoy2 - [regularQuebecStFoy1]',
    description: faker.lorem.paragraphs(),
    visibility: {
      visibleTo: [users.regularQuebecStFoy1.id!],
    },
  });

  await uploadWantImage(regularQuebecStFoy1Want.id);
}

async function uploadWantImage(wantId: string) {
  const getImageUrl = 'https://picsum.photos/200.jpg';

  const getImageResponse = await axios.get(getImageUrl);

  const imageData = Buffer.from(getImageResponse.data, 'binary');

  await wantsServiceV1.updateWantById(wantId, {
    image: {
      data: imageData,
      mimeType: 'image/jpeg',
    },
  });
}

run().catch(console.error);
