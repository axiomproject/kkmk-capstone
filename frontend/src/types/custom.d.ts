
declare module 'react-webcam' {
  import React from 'react';
  export interface WebcamProps {
    audio?: boolean;
    audioConstraints?: MediaTrackConstraints;
    imageSmoothing?: boolean;
    mirrored?: boolean;
    minScreenshotHeight?: number;
    minScreenshotWidth?: number;
    onUserMedia?: (stream: MediaStream) => void;
    onUserMediaError?: (error: string | DOMException) => void;
    screenshotFormat?: string;
    screenshotQuality?: number;
    videoConstraints?: MediaTrackConstraints;
  }
  const Webcam: React.FC<WebcamProps>;
  export default Webcam;
}

declare module 'react-leaflet' {
  import { FC, ReactNode } from 'react';
  import L from 'leaflet';

  export interface MapContainerProps {
    center: L.LatLngExpression;
    zoom: number;
    children?: ReactNode;
    [key: string]: any;
  }

  export const MapContainer: FC<MapContainerProps>;
  export const TileLayer: FC<any>;
  export const Marker: FC<any>;
  export const Popup: FC<any>;
}