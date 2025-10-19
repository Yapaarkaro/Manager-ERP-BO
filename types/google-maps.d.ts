// Google Maps JavaScript API types
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google.maps {
  export class Map {
    constructor(mapDiv: Element, opts?: MapOptions);
    setCenter(latlng: LatLng | LatLngLiteral): void;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }

  export class Marker {
    constructor(opts?: MarkerOptions);
    setPosition(latlng: LatLng | LatLngLiteral): void;
    getPosition(): LatLng | null;
    addListener(eventName: string, handler: Function): MapsEventListener;
  }

  export class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  export interface LatLngLiteral {
    lat: number;
    lng: number;
  }

  export interface MapOptions {
    center?: LatLng | LatLngLiteral;
    zoom?: number;
    mapTypeId?: MapTypeId;
    styles?: MapTypeStyle[];
    disableDefaultUI?: boolean;
    zoomControl?: boolean;
    streetViewControl?: boolean;
    fullscreenControl?: boolean;
    mapTypeControl?: boolean;
  }

  export interface MarkerOptions {
    position?: LatLng | LatLngLiteral;
    map?: Map;
    draggable?: boolean;
    title?: string;
    animation?: Animation;
  }

  export interface MapMouseEvent {
    latLng?: LatLng;
  }

  export interface MapsEventListener {
    remove(): void;
  }

  export enum MapTypeId {
    HYBRID = 'hybrid',
    ROADMAP = 'roadmap',
    SATELLITE = 'satellite',
    TERRAIN = 'terrain',
  }

  export enum Animation {
    BOUNCE = 1,
    DROP = 2,
  }

  export interface MapTypeStyle {
    featureType?: string;
    elementType?: string;
    stylers?: Array<{ [key: string]: any }>;
  }
}

export {};
