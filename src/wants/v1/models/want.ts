import {WantImage} from './want-image';
import {WantVisibility} from './want-visibility';

interface Want {
  id: string;
  creatorId: string;
  adminsIds: string[];
  membersIds: string[];
  title: string;
  description: string | null;
  visibility: WantVisibility;
  image: WantImage | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export {Want};
