import { CameraManager } from '@/modules/CameraManager';
import { ComputerVisionModule } from '@/modules/ComputerVisionModule';
import { OCREngine } from '@/modules/OCREngine';
import { LLMIntegration } from '@/modules/LLMIntegration';
import { WebXRSessionManager } from '@/modules/WebXRSessionManager';
import { OverlayRenderer } from '@/modules/OverlayRenderer';
import { UIController } from '@/modules/UIController';
import { ErrorHandler } from '@/utils/ErrorHandler';
import { Logger } from '@/utils/Logger';
import { EventEmitter } from '@/utils/EventEmitter';
import { getConfig, validateConfig } from '@/config';
import type { SystemConfig } from '@/types';

/**
 * Main AR System Controller
 * Orchestrates all components and manages the application lifecycle
 */
export class ARSystem extends EventEmitter {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: SystemConfig;
  
  // Core modules
  private cameraManager: CameraManager;
  private computerVision: ComputerVisionModule;
  private ocrEngine: OCREngine;
  private llmIntegration: LLMIntegration;
  private webxrManager: WebXRSessionManager;
  private overlayRenderer: OverlayRenderer;
  private uiController: UIController;
  
  private isInitialized = false;
  private isScanning = false;
  private performanceStats = {
    frameCount: 0,
    lastFpsUpdate: 0,
    currentFps: 0,
    memoryUsage: 0,
  };

  constructor(config?: Partial<SystemConfig>) {
    super();
    
    this.logger = new Logger('ARSystem');
    this.errorHandler = new ErrorHandler();
    
    // Get default configuration and merge with provided config
    const defaultConfig = getConfig();
    this.config = { ...defaultConfig, ...config };
    
    // Validate configuration
    const configErrors = validateConfig(this.config);
    if (configErrors.length > 0) {
      this.logger.warn('Configuration issues:', configErrors);
    }
    
    // Initialize modules
    this.cameraManager = new CameraManager(this.config.camera);
    this.computerVision = new ComputerVisionModule();
    this.ocrEngine = new OCREngine();
    this.llmIntegration = new LLMIntegration(this.config.llm);
    this.webxrManager = new WebXRSessionManager();
    this.overlayRenderer = new OverlayRenderer();
    this.uiController = new UIController();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the AR System and all its components
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('AR System already initialized');
      return;
    }

    try {
      this.logger.info('Initializing AR System...');
      
      // Initialize modules in dependency order
      await this.uiController.initialize();
      await this.cameraManager.initialize();
      await this.computerVision.initialize();
      await this.ocrEngine.initialize();
      await this.llmIntegration.initialize();
      await this.webxrManager.initialize();
      await this.overlayRenderer.initialize();
      
      this.isInitialized = true;
      this.emit('system-initialized');
      
      this.logger.info('AR System initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize AR System:', error);
      this.errorHandler.handleError(error as Error, 'ARSystem', true);
      throw error;
    }
  }

  /**
   * Start code scanning and analysis
   */
  async startScanning(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('AR System not initialized');
    }
    
    if (this.isScanning) {
      this.logger.warn('Scanning already active');
      return;
    }

    try {
      this.logger.info('Starting code scanning...');
      
      // Start camera feed
      await this.cameraManager.startCamera();
      
      // Initialize WebXR session if available
      if (await this.webxrManager.isWebXRSupported()) {
        await this.webxrManager.startARSession();
      }
      
      this.isScanning = true;
      this.emit('scanning-started');
      
      // Start the main processing loop
      this.startProcessingLoop();
      
      this.logger.info('Code scanning started successfully');
      
    } catch (error) {
      this.logger.error('Failed to start scanning:', error);
      this.errorHandler.handleError(error as Error, 'ARSystem', true);
      throw error;
    }
  }

  /**
   * Stop code scanning and analysis
   */
  async stopScanning(): Promise<void> {
    if (!this.isScanning) {
      return;
    }

    try {
      this.logger.info('Stopping code scanning...');
      
      this.isScanning = false;
      
      // Stop camera feed
      await this.cameraManager.stopCamera();
      
      // End WebXR session
      await this.webxrManager.endARSession();
      
      // Clear overlays
      this.overlayRenderer.clearAllOverlays();
      
      this.emit('scanning-stopped');
      
      this.logger.info('Code scanning stopped');
      
    } catch (error) {
      this.logger.error('Error stopping scanning:', error);
      this.errorHandler.handleError(error as Error, 'ARSystem', false);
    }
  }

  /**
   * Main processing loop for code detection and analysis
   */
  private startProcessingLoop(): void {
    let lastFrameTime = 0;
    const targetFrameRate = 30; // Target 30 FPS
    const frameInterval = 1000 / targetFrameRate;
    
    const processFrame = async (currentTime: number) => {
      if (!this.isScanning) {
        return;
      }

      // Throttle frame processing to maintain target frame rate
      if (currentTime - lastFrameTime < frameInterval) {
        requestAnimationFrame(processFrame);
        return;
      }
      
      lastFrameTime = currentTime;

      // Update performance stats
      this.updatePerformanceStats(currentTime);

      try {
        // Get current camera frame
        const frame = this.cameraManager.getCurrentFrame();
        if (!frame) {
          requestAnimationFrame(processFrame);
          return;
        }

        // Detect code regions (limit to 3 regions max for performance)
        const codeRegions = await this.computerVision.detectCodeRegions(frame);
        const limitedRegions = codeRegions.slice(0, 3);
        
        // Process each detected region
        for (const region of limitedRegions) {
          // Skip processing if region confidence is too low
          if (region.confidence < 0.7) {
            continue;
          }
          
          // Extract text using OCR
          const extractedText = await this.ocrEngine.extractText(region);
          region.extractedText = extractedText;
          
          // Only analyze if text is substantial enough
          if (extractedText.trim().length > 10) {
            // Analyze code with LLM (async, don't block frame processing)
            this.llmIntegration.analyzeCode(extractedText, region)
              .then(async (analysisResult) => {
                // Create overlays for analysis results
                await this.overlayRenderer.createOverlaysForAnalysis(region, analysisResult);
              })
              .catch((error) => {
                this.logger.error('Analysis error:', error);
              });
          }
        }
        
      } catch (error) {
        this.logger.error('Error in processing loop:', error);
        this.errorHandler.handleError(error as Error, 'ARSystem', false);
      }
      
      // Continue processing
      requestAnimationFrame(processFrame);
    };

    requestAnimationFrame(processFrame);
  }

  /**
   * Set up event handlers for inter-module communication
   */
  private setupEventHandlers(): void {
    // Camera events
    this.cameraManager.on('permission-granted', () => {
      this.emit('camera-permission-granted');
    });
    
    this.cameraManager.on('permission-denied', () => {
      this.emit('camera-permission-denied');
    });
    
    this.cameraManager.on('error', (error: Error) => {
      this.emit('camera-error', error);
      this.errorHandler.handleError(error, 'CameraManager', true);
    });
    
    // LLM events
    this.llmIntegration.on('analysis-completed', (result: any) => {
      this.emit('analysis-completed', result);
    });
    
    this.llmIntegration.on('analysis-failed', (error: any) => {
      this.emit('analysis-failed', error);
    });
    
    // UI events
    this.uiController.on('start-scanning', () => {
      this.startScanning().catch(console.error);
    });
    
    this.uiController.on('stop-scanning', () => {
      this.stopScanning().catch(console.error);
    });
    
    // Configuration events
    this.uiController.on('open-settings', () => {
      this.uiController.showConfigurationModal(this.config.llm, (newConfig) => {
        this.updateLLMConfig(newConfig);
      });
    });
  }

  /**
   * Update LLM configuration
   */
  private updateLLMConfig(newConfig: Partial<typeof this.config.llm>): void {
    this.config.llm = { ...this.config.llm, ...newConfig };
    
    // Reinitialize LLM integration with new config
    this.llmIntegration.dispose();
    this.llmIntegration = new LLMIntegration(this.config.llm);
    
    // Re-setup LLM event handlers
    this.llmIntegration.on('analysis-completed', (result: any) => {
      this.emit('analysis-completed', result);
    });
    
    this.llmIntegration.on('analysis-failed', (error: any) => {
      this.emit('analysis-failed', error);
    });
    
    this.logger.info('LLM configuration updated');
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(currentTime: number): void {
    this.performanceStats.frameCount++;
    
    // Update FPS every second
    if (currentTime - this.performanceStats.lastFpsUpdate >= 1000) {
      this.performanceStats.currentFps = this.performanceStats.frameCount;
      this.performanceStats.frameCount = 0;
      this.performanceStats.lastFpsUpdate = currentTime;
      
      // Update memory usage if available
      if ((performance as any).memory) {
        this.performanceStats.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }
      
      // Log performance stats in debug mode
      if (this.config.debugMode) {
        this.logger.debug(`Performance: ${this.performanceStats.currentFps} FPS, ${this.performanceStats.memoryUsage.toFixed(1)} MB`);
      }
      
      // Emit performance stats
      this.emit('performance-stats', this.performanceStats);
    }
  }

  /**
   * Get current system status including performance metrics
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      scanning: this.isScanning,
      cameraActive: this.cameraManager.isActive,
      webxrActive: this.webxrManager.isSessionActive,
      performance: { ...this.performanceStats },
      llmQueue: this.llmIntegration.getQueueStatus(),
      overlayStats: this.overlayRenderer.getOverlayStats(),
    };
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing AR System...');
    
    await this.stopScanning();
    
    // Dispose all modules
    await this.overlayRenderer.dispose();
    await this.webxrManager.dispose();
    await this.llmIntegration.dispose();
    await this.ocrEngine.dispose();
    await this.computerVision.dispose();
    await this.cameraManager.dispose();
    await this.uiController.dispose();
    
    this.isInitialized = false;
    this.emit('system-disposed');
    
    this.logger.info('AR System disposed');
  }
}