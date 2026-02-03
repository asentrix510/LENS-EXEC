import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';
import type { CameraConfig } from '@/types';

/**
 * Camera Manager
 * Handles device camera access, permissions, and video stream management
 */
export class CameraManager extends EventEmitter {
  private logger: Logger;
  private config: CameraConfig;
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private cameraActive = false;

  constructor(config: CameraConfig) {
    super();
    this.logger = new Logger('CameraManager');
    this.config = config;
  }

  /**
   * Initialize the camera manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Camera Manager...');
    
    // Create video element for camera feed
    this.videoElement = document.createElement('video');
    this.videoElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    `;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    
    // Create canvas for frame capture
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d');
    
    // Add video to DOM
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.appendChild(this.videoElement);
    }
    
    this.logger.info('Camera Manager initialized');
  }

  /**
   * Request camera permissions and start video stream
   */
  async startCamera(): Promise<void> {
    if (this.cameraActive) {
      this.logger.warn('Camera already active');
      return;
    }

    try {
      this.logger.info('Requesting camera access...');
      
      // Check for HTTPS requirement
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('HTTPS is required for camera access');
      }
      
      // Request camera access
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.frameRate },
          facingMode: this.config.facingMode,
        },
        audio: false,
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!this.videoElement) {
        throw new Error('Video element not initialized');
      }
      
      // Set up video stream
      this.videoElement.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.videoElement) {
          reject(new Error('Video element not available'));
          return;
        }
        
        this.videoElement.onloadedmetadata = () => {
          resolve();
        };
        
        this.videoElement.onerror = () => {
          reject(new Error('Failed to load video stream'));
        };
      });
      
      // Update canvas size to match video
      if (this.canvas && this.videoElement) {
        this.canvas.width = this.videoElement.videoWidth;
        this.canvas.height = this.videoElement.videoHeight;
      }
      
      this.cameraActive = true;
      this.emit('permission-granted');
      this.emit('camera-ready');
      
      this.logger.info('Camera started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start camera:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          this.emit('permission-denied');
        } else {
          this.emit('error', error);
        }
      }
      
      throw error;
    }
  }

  /**
   * Stop camera stream
   */
  async stopCamera(): Promise<void> {
    if (!this.cameraActive) {
      return;
    }

    try {
      this.logger.info('Stopping camera...');
      
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      
      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }
      
      this.cameraActive = false;
      this.emit('camera-stopped');
      
      this.logger.info('Camera stopped');
      
    } catch (error) {
      this.logger.error('Error stopping camera:', error);
      this.emit('error', error as Error);
    }
  }

  /**
   * Capture current frame from video stream
   */
  getCurrentFrame(): ImageData | null {
    if (!this.cameraActive || !this.videoElement || !this.canvas || !this.context) {
      return null;
    }

    try {
      // Draw current video frame to canvas
      this.context.drawImage(
        this.videoElement,
        0, 0,
        this.canvas.width,
        this.canvas.height
      );
      
      // Get image data
      return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
    } catch (error) {
      this.logger.error('Failed to capture frame:', error);
      return null;
    }
  }

  /**
   * Get current frame as blob for API requests
   */
  async getCurrentFrameAsBlob(format = 'image/jpeg', quality = 0.8): Promise<Blob | null> {
    if (!this.cameraActive || !this.videoElement || !this.canvas || !this.context) {
      return null;
    }

    try {
      // Draw current video frame to canvas
      this.context.drawImage(
        this.videoElement,
        0, 0,
        this.canvas.width,
        this.canvas.height
      );
      
      // Convert to blob
      return new Promise<Blob | null>((resolve) => {
        this.canvas!.toBlob(resolve, format, quality);
      });
      
    } catch (error) {
      this.logger.error('Failed to capture frame as blob:', error);
      return null;
    }
  }

  /**
   * Check if camera is currently active
   */
  get isActive(): boolean {
    return this.cameraActive;
  }

  /**
   * Get current video dimensions
   */
  getVideoDimensions(): { width: number; height: number } | null {
    if (!this.videoElement) {
      return null;
    }
    
    return {
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
    };
  }

  /**
   * Get available camera devices
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      this.logger.error('Failed to enumerate camera devices:', error);
      return [];
    }
  }

  /**
   * Switch to a different camera
   */
  async switchCamera(_deviceId: string): Promise<void> {
    if (!this.cameraActive) {
      throw new Error('Camera not active');
    }

    // Stop current camera
    await this.stopCamera();
    
    // Update config with new device
    this.config = {
      ...this.config,
      // Add deviceId constraint
    };
    
    // Restart with new camera
    await this.startCamera();
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Camera Manager...');
    
    await this.stopCamera();
    
    if (this.videoElement && this.videoElement.parentElement) {
      this.videoElement.parentElement.removeChild(this.videoElement);
    }
    
    this.videoElement = null;
    this.canvas = null;
    this.context = null;
    
    this.removeAllListeners();
    
    this.logger.info('Camera Manager disposed');
  }
}