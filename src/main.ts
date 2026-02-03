import { ARSystem } from '@/core/ARSystem';
import { ErrorHandler } from '@/utils/ErrorHandler';
import { Logger } from '@/utils/Logger';

/**
 * Main application entry point
 * Initializes the LENS-EXEC AR Code Analysis System
 */
async function main() {
  const logger = new Logger('Main');
  const errorHandler = new ErrorHandler();
  
  try {
    logger.info('Starting LENS-EXEC AR Code Analysis System...');
    
    // Check for required browser features
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera access not supported in this browser');
    }
    
    // Check for HTTPS requirement
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      throw new Error('HTTPS is required for camera access and WebXR features');
    }
    
    // Initialize the AR System
    const arSystem = new ARSystem();
    await arSystem.initialize();
    
    logger.info('LENS-EXEC initialized successfully');
    
  } catch (error) {
    logger.error('Failed to initialize LENS-EXEC:', error);
    errorHandler.handleCriticalError(error as Error);
  }
}

// Start the application
main().catch(console.error);