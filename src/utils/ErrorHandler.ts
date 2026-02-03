import type { SystemError } from '@/types';

/**
 * Centralized error handling for LENS-EXEC
 * Manages error logging, user notifications, and recovery strategies
 */
export class ErrorHandler {
  private errorLog: SystemError[] = [];

  /**
   * Handle a system error with appropriate logging and user feedback
   */
  handleError(error: Error, component: string, recoverable: boolean): void {
    const systemError: SystemError = {
      ...error,
      code: this.generateErrorCode(error, component),
      component,
      recoverable,
      timestamp: Date.now(),
    };

    this.errorLog.push(systemError);
    this.logError(systemError);
    this.showUserNotification(systemError);

    if (!recoverable) {
      this.handleCriticalError(systemError);
    }
  }

  /**
   * Handle critical errors that require application shutdown or major recovery
   */
  handleCriticalError(error: Error | SystemError): void {
    console.error('Critical error occurred:', error);
    
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div class="error">
          <h1>System Error</h1>
          <p>LENS-EXEC encountered a critical error and cannot continue.</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please refresh the page to restart the application.</p>
          <button onclick="location.reload()" style="
            background: #007acc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
          ">Refresh Page</button>
        </div>
      `;
    }
  }

  /**
   * Show user-friendly error notification
   */
  private showUserNotification(error: SystemError): void {
    const message = this.getUserFriendlyMessage(error);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">Error</div>
      <div style="font-size: 14px; opacity: 0.9;">${message}</div>
      <button onclick="this.parentElement.remove()" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 8px;
      ">Dismiss</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  /**
   * Generate a unique error code for tracking
   */
  private generateErrorCode(error: Error, component: string): string {
    const timestamp = Date.now().toString(36);
    const hash = this.simpleHash(error.message + component).toString(36);
    return `${component.toUpperCase()}-${hash}-${timestamp}`;
  }

  /**
   * Simple hash function for error codes
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private getUserFriendlyMessage(error: SystemError): string {
    const messageMap: Record<string, string> = {
      'NotAllowedError': 'Camera permission was denied. Please enable camera access in your browser settings.',
      'NotFoundError': 'No camera was found on your device.',
      'NotSupportedError': 'Your browser does not support the required camera features.',
      'OverconstrainedError': 'Camera settings are not supported by your device.',
      'SecurityError': 'Camera access is blocked due to security restrictions. Please ensure you are using HTTPS.',
      'AbortError': 'Camera access was interrupted.',
      'NetworkError': 'Network connection failed. Please check your internet connection.',
      'TimeoutError': 'Request timed out. Please try again.',
    };

    // Check for specific error types
    for (const [errorType, message] of Object.entries(messageMap)) {
      if (error.name === errorType || (error.message && error.message.includes(errorType))) {
        return message;
      }
    }

    // Component-specific messages
    switch (error.component) {
      case 'CameraManager':
        return 'Camera access failed. Please check your camera permissions and try again.';
      case 'LLMIntegration':
        return 'AI analysis service is temporarily unavailable. Please try again later.';
      case 'WebXRSessionManager':
        return 'AR features are not available on this device or browser.';
      case 'OCREngine':
        return 'Text recognition failed. Please ensure the code is clearly visible.';
      default:
        return error.recoverable 
          ? 'A temporary error occurred. The system will attempt to recover automatically.'
          : 'A system error occurred. Please refresh the page to continue.';
    }
  }

  /**
   * Log error details for debugging
   */
  private logError(error: SystemError): void {
    console.group(`🚨 System Error [${error.code}]`);
    console.error('Component:', error.component);
    console.error('Recoverable:', error.recoverable);
    console.error('Timestamp:', new Date(error.timestamp).toISOString());
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.groupEnd();
  }

  /**
   * Get error statistics for monitoring
   */
  getErrorStats() {
    const now = Date.now();
    const last24Hours = this.errorLog.filter(e => now - e.timestamp < 24 * 60 * 60 * 1000);
    
    return {
      total: this.errorLog.length,
      last24Hours: last24Hours.length,
      byComponent: this.groupBy(last24Hours, 'component'),
      criticalErrors: last24Hours.filter(e => !e.recoverable).length,
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Utility function to group array by property
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}