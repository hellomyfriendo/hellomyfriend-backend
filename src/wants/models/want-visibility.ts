import {WantVisibleTo} from './want-visible-to';

interface WantVisibility {
  visibleTo: WantVisibleTo | string[];
  address?: string;
  radiusInMeters?: number;
}

export {WantVisibility};
