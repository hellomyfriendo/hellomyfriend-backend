import {WantVisibleTo} from './want-visible-to';

interface WantVisibility {
  visibleTo: WantVisibleTo | string[];
  location?: {
    address: string;
    radiusInMeters: number;
  };
}

export {WantVisibility};
