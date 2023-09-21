import {GeolocationCoordinates} from './geolocation-coordinates';
import {WantVisibility} from './want-visibility';

interface Want {
  id: string;
  creatorId: string;
  administratorsIds: string[];
  membersIds: string[];
  title: string;
  description?: string;
  imageURL?: string;
  visibility: WantVisibility;
  visibleTo?: string[];
  address: string;
  coordinates: GeolocationCoordinates;
  radiusInMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

export {Want};
