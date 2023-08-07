interface Friendship {
  id: string;
  userIds: string[];
  createdAt: Date;
  deletedAt: Date | null;
}

export {Friendship};
