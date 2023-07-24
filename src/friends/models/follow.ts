interface Follow {
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export {Follow};
