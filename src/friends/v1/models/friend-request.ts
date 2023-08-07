interface FriendRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export {FriendRequest};
