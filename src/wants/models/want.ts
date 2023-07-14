import {WantLocation} from './want-location';
import {WantVisibility} from './want-visibility';

interface Want {
  id: string;
  creatorId: string;
  title: string;
  visibility: WantVisibility;
  location: WantLocation;
  createdAt: Date;
  updatedAt: Date;
}

export {Want};
