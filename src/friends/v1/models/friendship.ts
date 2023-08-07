interface Friendship {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export {Friendship};
