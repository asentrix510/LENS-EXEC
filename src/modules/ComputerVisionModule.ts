import { Logger } from '@/utils/Logger';
import type { CodeRegion, Rectangle } from '@/types';

/**
 * Computer Vision Module
 * Processes camera frames to detect regions containing code
 * Uses OpenCV.js for image processing and custom algorithms for code detection
 */
export class ComputerVisionModule {
  private logger: Logger;
  private isInitialized = false;
  private cv: any = null; // OpenCV.js instance

  constructor() {
    this.logger = new Logger('ComputerVisionModule');
  }

  /**
   * Initialize the computer vision module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing Computer Vision Module...');
      
      // Load OpenCV.js
      await this.loadOpenCV();
      
      this.isInitialized = true;
      this.logger.info('Computer Vision Module initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize Computer Vision Module:', error);
      throw error;
    }
  }

  /**
   * Load OpenCV.js library
   */
  private async loadOpenCV(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if OpenCV is already loaded
      if (typeof window !== 'undefined' && (window as any).cv) {
        this.cv = (window as any).cv;
        resolve();
        return;
      }

      // Create script element to load OpenCV.js
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      
      script.onload = () => {
        // Wait for OpenCV to be ready
        const checkOpenCV = () => {
          if (typeof (window as any).cv !== 'undefined' && (window as any).cv.Mat) {
            this.cv = (window as any).cv;
            this.logger.info('OpenCV.js loaded successfully');
            resolve();
          } else {
            setTimeout(checkOpenCV, 100);
          }
        };
        checkOpenCV();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load OpenCV.js'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Detect code regions in a camera frame
   */
  async detectCodeRegions(imageData: ImageData): Promise<CodeRegion[]> {
    if (!this.isInitialized || !this.cv) {
      throw new Error('Computer Vision Module not initialized');
    }

    try {
      const regions: CodeRegion[] = [];
      
      // Convert ImageData to OpenCV Mat
      const src = this.cv.matFromImageData(imageData);
      const gray = new this.cv.Mat();
      const binary = new this.cv.Mat();
      const contours = new this.cv.MatVector();
      const hierarchy = new this.cv.Mat();
      
      // Convert to grayscale
      this.cv.cvtColor(src, gray, this.cv.COLOR_RGBA2GRAY);
      
      // Apply adaptive threshold to create binary image
      this.cv.adaptiveThreshold(
        gray, binary,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        11, 2
      );
      
      // Find contours
      this.cv.findContours(
        binary, contours, hierarchy,
        this.cv.RETR_EXTERNAL,
        this.cv.CHAIN_APPROX_SIMPLE
      );
      
      // Process each contour
      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const rect = this.cv.boundingRect(contour);
        
        // Filter contours by size and aspect ratio (typical for code blocks)
        if (this.isLikelyCodeRegion(rect, imageData.width, imageData.height)) {
          const confidence = this.calculateConfidence(contour, rect);
          
          const codeRegion: CodeRegion = {
            id: this.generateRegionId(),
            boundingBox: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
            },
            confidence,
            extractedText: '',
            detectionTimestamp: Date.now(),
            trackingHistory: [],
          };
          
          regions.push(codeRegion);
        }
        
        contour.delete();
      }
      
      // Clean up OpenCV objects
      src.delete();
      gray.delete();
      binary.delete();
      contours.delete();
      hierarchy.delete();
      
      this.logger.debug(`Detected ${regions.length} potential code regions`);
      return regions;
      
    } catch (error) {
      this.logger.error('Error detecting code regions:', error);
      return [];
    }
  }

  /**
   * Preprocess image region for better OCR results
   */
  preprocessImage(imageData: ImageData, region: Rectangle): ImageData | null {
    if (!this.isInitialized || !this.cv) {
      return null;
    }

    try {
      // Convert ImageData to OpenCV Mat
      const src = this.cv.matFromImageData(imageData);
      
      // Extract region of interest
      const roi = src.roi(new this.cv.Rect(
        region.x, region.y, region.width, region.height
      ));
      
      const gray = new this.cv.Mat();
      const enhanced = new this.cv.Mat();
      
      // Convert to grayscale
      this.cv.cvtColor(roi, gray, this.cv.COLOR_RGBA2GRAY);
      
      // Apply Gaussian blur to reduce noise
      this.cv.GaussianBlur(gray, enhanced, new this.cv.Size(3, 3), 0);
      
      // Apply adaptive threshold for better text contrast
      this.cv.adaptiveThreshold(
        enhanced, enhanced,
        255,
        this.cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        this.cv.THRESH_BINARY,
        11, 2
      );
      
      // Convert back to RGBA for consistency
      const rgba = new this.cv.Mat();
      this.cv.cvtColor(enhanced, rgba, this.cv.COLOR_GRAY2RGBA);
      
      // Convert to ImageData
      const processedImageData = new ImageData(
        new Uint8ClampedArray(rgba.data),
        rgba.cols,
        rgba.rows
      );
      
      // Clean up
      src.delete();
      roi.delete();
      gray.delete();
      enhanced.delete();
      rgba.delete();
      
      return processedImageData;
      
    } catch (error) {
      this.logger.error('Error preprocessing image:', error);
      return null;
    }
  }

  /**
   * Calculate confidence score for detected region
   */
  calculateConfidence(contour: any, rect: any): number {
    try {
      // Calculate contour area and bounding rectangle area
      const contourArea = this.cv.contourArea(contour);
      const rectArea = rect.width * rect.height;
      
      // Ratio of contour area to bounding rectangle area
      const fillRatio = contourArea / rectArea;
      
      // Aspect ratio (width/height) - code blocks are typically wider than tall
      const aspectRatio = rect.width / rect.height;
      
      // Base confidence on fill ratio and aspect ratio
      let confidence = fillRatio * 0.6; // 60% weight for fill ratio
      
      // Bonus for good aspect ratios (between 1.5 and 8.0)
      if (aspectRatio >= 1.5 && aspectRatio <= 8.0) {
        confidence += 0.3;
      }
      
      // Bonus for reasonable size
      if (rect.width > 100 && rect.height > 20) {
        confidence += 0.1;
      }
      
      return Math.min(confidence, 1.0);
      
    } catch (error) {
      this.logger.error('Error calculating confidence:', error);
      return 0.5; // Default confidence
    }
  }

  /**
   * Check if a rectangle is likely to contain code
   */
  private isLikelyCodeRegion(rect: any, imageWidth: number, imageHeight: number): boolean {
    // Minimum size requirements
    if (rect.width < 80 || rect.height < 15) {
      return false;
    }
    
    // Maximum size requirements (shouldn't be the entire image)
    if (rect.width > imageWidth * 0.9 || rect.height > imageHeight * 0.9) {
      return false;
    }
    
    // Aspect ratio check (code blocks are typically wider than tall)
    const aspectRatio = rect.width / rect.height;
    if (aspectRatio < 1.2 || aspectRatio > 15) {
      return false;
    }
    
    // Area check (reasonable size for code)
    const area = rect.width * rect.height;
    const imageArea = imageWidth * imageHeight;
    const areaRatio = area / imageArea;
    
    if (areaRatio < 0.001 || areaRatio > 0.5) {
      return false;
    }
    
    return true;
  }

  /**
   * Track region movement across frames
   */
  trackRegionMovement(region: CodeRegion, _previousFrame: ImageData): CodeRegion {
    // Simple tracking implementation - in a full implementation,
    // this would use optical flow or template matching
    
    // Add current position to tracking history
    region.trackingHistory.push({
      x: region.boundingBox.x + region.boundingBox.width / 2,
      y: region.boundingBox.y + region.boundingBox.height / 2,
      timestamp: Date.now(),
    });
    
    // Keep only recent history (last 10 positions)
    if (region.trackingHistory.length > 10) {
      region.trackingHistory = region.trackingHistory.slice(-10);
    }
    
    return region;
  }

  /**
   * Generate unique region ID
   */
  private generateRegionId(): string {
    return `region_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing Computer Vision Module...');
    
    this.isInitialized = false;
    this.cv = null;
    
    this.logger.info('Computer Vision Module disposed');
  }
}