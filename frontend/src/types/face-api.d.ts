declare module 'face-api.js' {
  export const nets: {
    tinyFaceDetector: {
      loadFromUri(url: string): Promise<void>;
    };
    faceLandmark68Net: {
      loadFromUri(url: string): Promise<void>;
    };
    faceRecognitionNet: {
      loadFromUri(url: string): Promise<void>;
    };
  };

  export class TinyFaceDetectorOptions {
    constructor(options: { inputSize?: number; scoreThreshold?: number });
  }

  export function detectSingleFace(
    input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    options: TinyFaceDetectorOptions
  ): Promise<any>;
}
