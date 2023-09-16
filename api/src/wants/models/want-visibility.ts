interface WantVisibility {
  visibleTo: string[];
  location: {
    address: string;
    radiusInMeters: number;
  };
}

export {WantVisibility};
