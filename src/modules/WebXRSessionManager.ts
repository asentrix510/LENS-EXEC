import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';
import type { Vector3 } from '@/types';

/**
 * WebXR Session Manager
 * Manages AR session lifecycle, pose tracking, and coordinate systems
 */
export class WebXRSessionManager extends EventEmitter {
  private logger: Logger;
  private xrSession: XRSession | null = null;
  private xrReferenceSpace: XRReferenceSpace | null = null;
  private animationFrameId: number | null = null;
  private sessionActive = false;

  constructor() {
    super();
    this.logger = new Logger('WebXRSessionManager');
  }

  /**
   * Initialize the WebXR session manager
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing WebXR Session Manager...');
    
    // Check WebXR support
    if (!this.isWebXRSupported()) {
      this.logger.warn('WebXR not supported in this browser');
      return;
    }
    
    this.logger.info('WebXR Session Manager initialized');
  }

  /**
   * Check if WebXR is supported in the current browser
   */
  async isWebXRSupported(): Promise<boolean> {
    if (!navigator.xr) {
      return false;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      return supported;
    } catch (error) {
      this.logger.error('Error checking WebXR support:', error);
      return false;
    }
  }

  /**
   * Start an AR session
   */
  async startARSession(): Promise<void> {
    if (this.sessionActive) {
      this.logger.warn('AR session already active');
      return;
    }

    if (!navigator.xr) {
      throw new Error('WebXR not supported');
    }

    try {
      this.logger.info('Starting AR session...');
      
      // Request AR session
      this.xrSession = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local'],
        optionalFeatures: ['dom-overlay', 'hit-test', 'anchors'],
      });
      
      // Set up reference space
      this.xrReferenceSpace = await this.xrSession.requestReferenceSpace('local');
      
      // Set up session event handlers
      this.xrSession.addEventListener('end', this.onSessionEnd.bind(this));
      this.xrSession.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
      
      this.sessionActive = true;
      this.emit('session-started');
      
      // Start render loop
      this.startRenderLoop();
      
      this.logger.info('AR session started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start AR session:', error);
      throw error;
    }
  }

  /**
   * End the current AR session
   */
  async endARSession(): Promise<void> {
    if (!this.sessionActive || !this.xrSession) {
      return;
    }

    try {
      this.logger.info('Ending AR session...');
      
      // Stop render loop
      if (this.animationFrameId) {
        this.xrSession.cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      
      // End session
      await this.xrSession.end();
      
    } catch (error) {
      this.logger.error('Error ending AR session:', error);
    }
  }

  /**
   * Get current viewer pose in world coordinates
   */
  getViewerPose(frame: XRFrame): XRViewerPose | null {
    if (!this.xrReferenceSpace) {
      return null;
    }

    try {
      return frame.getViewerPose(this.xrReferenceSpace) || null;
    } catch (error) {
      this.logger.error('Error getting viewer pose:', error);
      return null;
    }
  }

  /**
   * Transform screen coordinates to world space
   */
  transformToWorldSpace(screenCoords: { x: number; y: number }): Vector3 | null {
    // This is a simplified implementation
    // In a full implementation, this would use the camera projection matrix
    // and current viewer pose to transform 2D screen coordinates to 3D world space
    
    if (!this.xrReferenceSpace) {
      return null;
    }

    // For now, return a basic transformation
    // This would need to be implemented based on the specific AR tracking system
    return {
      x: (screenCoords.x - 0.5) * 2, // Normalize to [-1, 1]
      y: (screenCoords.y - 0.5) * 2,
      z: -1, // Default depth
    };
  }

  /**
   * Check if session is currently active
   */
  get isSessionActive(): boolean {
    return this.sessionActive;
  }

  /**
   * Get current XR session
   */
  getCurrentSession(): XRSession | null {
    return this.xrSession;
  }

  /**
   * Get current reference space
   */
  getReferenceSpace(): XRReferenceSpace | null {
    return this.xrReferenceSpace;
  }

  /**
   * Start the WebXR render loop
   */
  private startRenderLoop(): void {
    if (!this.xrSession) {
      return;
    }

    const renderFrame = (_time: number, frame: XRFrame) => {
      if (!this.sessionActive) {
        return;
      }

      try {
        // Get viewer pose
        const pose = this.getViewerPose(frame);
        
        if (pose) {
          // Emit pose update for other components
          this.emit('pose-updated', pose);
        }
        
        // Continue render loop
        if (this.xrSession) {
          this.animationFrameId = this.xrSession.requestAnimationFrame(renderFrame);
        }
        
      } catch (error) {
        this.logger.error('Error in render loop:', error);
      }
    };

    this.animationFrameId = this.xrSession.requestAnimationFrame(renderFrame);
  }

  /**
   * Handle session end event
   */
  private onSessionEnd(): void {
    this.logger.info('AR session ended');
    
    this.sessionActive = false;
    this.xrSession = null;
    this.xrReferenceSpace = null;
    this.animationFrameId = null;
    
    this.emit('session-ended');
  }

  /**
   * Handle session visibility change
   */
  private onVisibilityChange(): void {
    if (!this.xrSession) {
      return;
    }

    this.logger.debug('AR session visibility changed:', this.xrSession.visibilityState);
    this.emit('visibility-changed', this.xrSession.visibilityState);
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing WebXR Session Manager...');
    
    await this.endARSession();
    this.removeAllListeners();
    
    this.logger.info('WebXR Session Manager disposed');
  }
}