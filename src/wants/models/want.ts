import {WantImage} from './want-image';
import {WantLocation} from './want-location';
import {WantVisibility} from './want-visibility';

interface Want {
  id: string;
  creator: string;
  admins: string[];
  title: string;
  description?: string;
  visibility: WantVisibility;
  location: WantLocation;
  image?: WantImage;
  createdAt: Date;
  updatedAt: Date;
}

export {Want};
