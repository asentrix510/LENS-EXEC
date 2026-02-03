/**
 * Network Monitor
 * Monitors network connectivity and provides retry logic
 */

import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';

export class NetworkMonitor extends EventEmitter {
  private logger: Logger;
  private isOnline = navigator.onLine;
  private retryQueue: RetryableRequest[] = [];
  private retryTimer: number | null = null;

  constructor() {
    super();
    this.logger = new Logger('NetworkMonitor');
    this.setupEventListeners();
  }

  /**
   * Setup network event listeners
   */
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.logger.info('Network connection restored');
      this.isOnline = true;
      this.emit('online');
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.logger.warn('Network connection lost');
      this.isOnline = false;
      this.emit('offline');
    });
  }

  /**
   * Check if network is online
   */
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Add request to retry queue
   */
  queueForRetry(request: RetryableRequest): void {
    this.retryQueue.push(request);
    this.logger.debug(`Queued request for retry. Queue length: ${this.retryQueue.length}`);
    
    // Start retry timer if not already running
    if (!this.retryTimer && this.isOnline) {
      this.scheduleRetry();
    }
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    if (!this.isOnline || this.retryQueue.length === 0) {
      return;
    }

    this.logger.info(`Processing retry queue with ${this.retryQueue.length} requests`);

    const requestsToRetry = [...this.retryQueue];
    this.retryQueue = [];

    for (const request of requestsToRetry) {
      try {
        // Check if request has exceeded max retries
        if (request.retryCount >= request.maxRetries) {
          this.logger.warn(`Request ${request.id} exceeded max retries`);
          request.reject(new Error('Max retries exceeded'));
          continue;
        }

        // Increment retry count
        request.retryCount++;

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(request.retryCount);
        
        // Wait for backoff delay
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // Retry the request
        this.logger.debug(`Retrying request ${request.id} (attempt ${request.retryCount})`);
        const result = await request.retryFunction();
        request.resolve(result);

      } catch (error) {
        this.logger.error(`Retry failed for request ${request.id}:`, error);
        
        // Check if we should retry again
        if (request.retryCount < request.maxRetries) {
          this.retryQueue.push(request);
        } else {
          request.reject(error);
        }
      }
    }

    // Schedule next retry if queue is not empty
    if (this.retryQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  /**
   * Schedule retry processing
   */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.processRetryQueue();
    }, 5000); // Retry every 5 seconds
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }

  /**
   * Create a retryable request wrapper
   */
  createRetryableRequest<T>(
    id: string,
    retryFunction: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: RetryableRequest = {
        id,
        retryFunction,
        maxRetries,
        retryCount: 0,
        resolve,
        reject,
      };

      // If offline, queue immediately
      if (!this.isOnline) {
        this.queueForRetry(request);
        return;
      }

      // Try the request immediately
      retryFunction()
        .then(resolve)
        .catch((error) => {
          // Check if it's a network error
          if (this.isNetworkError(error)) {
            this.queueForRetry(request);
          } else {
            reject(error);
          }
        });
    });
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const networkErrorIndicators = [
      'NetworkError',
      'fetch',
      'NETWORK_ERROR',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'timeout',
      'TIMEOUT',
    ];

    const errorString = error.toString().toLowerCase();
    return networkErrorIndicators.some(indicator => 
      errorString.includes(indicator.toLowerCase())
    );
  }

  /**
   * Get retry queue status
   */
  getRetryQueueStatus() {
    return {
      queueLength: this.retryQueue.length,
      isOnline: this.isOnline,
      hasRetryTimer: this.retryTimer !== null,
    };
  }

  /**
   * Clear retry queue
   */
  clearRetryQueue(): void {
    this.retryQueue.forEach(request => {
      request.reject(new Error('Retry queue cleared'));
    });
    this.retryQueue = [];
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearRetryQueue();
    this.removeAllListeners();
    
    window.removeEventListener('online', () => {});
    window.removeEventListener('offline', () => {});
  }
}

/**
 * Interface for retryable requests
 */
interface RetryableRequest {
  id: string;
  retryFunction: () => Promise<any>;
  maxRetries: number;
  retryCount: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}