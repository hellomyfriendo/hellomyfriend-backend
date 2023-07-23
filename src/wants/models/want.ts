import {WantImage} from './want-image';
import {WantVisibility} from './want-visibility';

interface Want {
  id: string;
  creator: string;
  admins: string[];
  members: string[];
  title: string;
  description?: string;
  visibility: WantVisibility;
  image?: WantImage;
  createdAt: Date;
  updatedAt: Date;
}

export {Want};
