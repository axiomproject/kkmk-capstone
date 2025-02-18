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
    screenshotFormat?: 'image/webp' | 'image/png' | 'image/jpeg';
    screenshotQuality?: number;
    videoConstraints?: MediaTrackConstraints;
    className?: string;
    style?: React.CSSProperties;
  }

  export default class Webcam extends React.Component<WebcamProps> {
    getScreenshot(): string | null;
    video: HTMLVideoElement | null;
  }
}
