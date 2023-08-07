class GeolocationCoordinates {
  constructor(public latitude: number, public longitude: number) {}

  static minLatitude = 0;
  static maxLatitude = 90;
  static minLongitude = -180;
  static maxLongitude = 180;
}

export {GeolocationCoordinates};
