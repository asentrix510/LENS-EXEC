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
    
    // Check for required browser features with mobile browser compatibility
    const hasMediaDevices = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    const hasGetUserMedia = (navigator as any).getUserMedia || 
                           (navigator as any).webkitGetUserMedia || 
                           (navigator as any).mozGetUserMedia || 
                           (navigator as any).msGetUserMedia;
    
    if (!hasMediaDevices && !hasGetUserMedia) {
      // For mobile browsers, we'll try to initialize anyway and handle camera errors gracefully
      logger.warn('Camera API not detected, but continuing for mobile compatibility');
    }
    
    // Check for HTTPS requirement (allow localhost and local network IPs)
    const isLocalNetwork = location.hostname === 'localhost' || 
                          location.hostname.startsWith('192.168.') || 
                          location.hostname.startsWith('10.') || 
                          location.hostname.startsWith('172.');
    
    if (location.protocol !== 'https:' && !isLocalNetwork) {
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