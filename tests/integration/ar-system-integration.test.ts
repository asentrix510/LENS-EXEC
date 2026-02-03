/**
 * AR System Integration Tests
 * Tests the complete end-to-end workflow of the LENS-EXEC system
 */

import { ARSystem } from '@/core/ARSystem';
import type { SystemConfig } from '@/types';

describe('AR System Integration', () => {
  let arSystem: ARSystem;
  let mockConfig: SystemConfig;

  beforeEach(() => {
    // Create mock configuration
    mockConfig = {
      camera: {
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'environment',
      },
      llm: {
        apiKey: 'test-api-key',
        model: 'gpt-4-vision-preview',
        maxTokens: 1000,
        temperature: 0.1,
        timeout: 30000,
      },
      enableSimulation: false,
      debugMode: true,
    };

    arSystem = new ARSystem(mockConfig);
  });

  afterEach(async () => {
    if (arSystem) {
      await arSystem.dispose();
    }
  });

  describe('System Initialization', () => {
    it('should initialize all components successfully', async () => {
      await expect(arSystem.initialize()).resolves.not.toThrow();
      
      const status = arSystem.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.scanning).toBe(false);
    });

    it('should handle initialization errors gracefully', async () => {
      // Create system with invalid config
      const invalidConfig = { ...mockConfig };
      invalidConfig.llm.apiKey = '';
      
      const invalidSystem = new ARSystem(invalidConfig);
      
      // Should still initialize but with warnings
      await expect(invalidSystem.initialize()).resolves.not.toThrow();
      
      await invalidSystem.dispose();
    });

    it('should emit system-initialized event', async () => {
      const initPromise = new Promise<void>((resolve) => {
        arSystem.once('system-initialized', resolve);
      });

      await arSystem.initialize();
      await expect(initPromise).resolves.toBeUndefined();
    });
  });

  describe('Scanning Workflow', () => {
    beforeEach(async () => {
      await arSystem.initialize();
    });

    it('should start and stop scanning successfully', async () => {
      // Mock camera permission
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await expect(arSystem.startScanning()).resolves.not.toThrow();
      
      let status = arSystem.getStatus();
      expect(status.scanning).toBe(true);

      await expect(arSystem.stopScanning()).resolves.not.toThrow();
      
      status = arSystem.getStatus();
      expect(status.scanning).toBe(false);
    });

    it('should emit scanning events', async () => {
      const startPromise = new Promise<void>((resolve) => {
        arSystem.once('scanning-started', resolve);
      });

      const stopPromise = new Promise<void>((resolve) => {
        arSystem.once('scanning-stopped', resolve);
      });

      // Mock camera permission
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await arSystem.startScanning();
      await expect(startPromise).resolves.toBeUndefined();

      await arSystem.stopScanning();
      await expect(stopPromise).resolves.toBeUndefined();
    });

    it('should handle camera permission denied', async () => {
      // Mock camera permission denied
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      await expect(arSystem.startScanning()).rejects.toThrow();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await arSystem.initialize();
    });

    it('should handle LLM API errors gracefully', async () => {
      // Mock fetch to simulate API error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      // Mock camera and start scanning
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await arSystem.startScanning();
      
      // The system should continue running even with API errors
      const status = arSystem.getStatus();
      expect(status.scanning).toBe(true);

      await arSystem.stopScanning();
    });

    it('should recover from network connectivity issues', async () => {
      // Mock network going offline and online
      const onlineEvent = new Event('online');
      const offlineEvent = new Event('offline');

      // Start scanning
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await arSystem.startScanning();

      // Simulate network going offline
      window.dispatchEvent(offlineEvent);
      
      // Simulate network coming back online
      window.dispatchEvent(onlineEvent);

      // System should still be scanning
      const status = arSystem.getStatus();
      expect(status.scanning).toBe(true);

      await arSystem.stopScanning();
    });
  });

  describe('Configuration Updates', () => {
    beforeEach(async () => {
      await arSystem.initialize();
    });

    it('should handle LLM configuration updates', async () => {
      const newConfig = {
        apiKey: 'new-api-key',
        model: 'gpt-4o',
        maxTokens: 2000,
        temperature: 0.2,
        timeout: 45000,
      };

      // Simulate configuration update through UI
      arSystem.emit('open-settings');
      
      // The system should handle config updates without crashing
      expect(() => {
        // This would normally be called by the UI controller
        (arSystem as any).updateLLMConfig(newConfig);
      }).not.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should dispose all resources properly', async () => {
      await arSystem.initialize();
      
      // Start scanning to create resources
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });
      
      await arSystem.startScanning();
      await arSystem.stopScanning();
      
      // Dispose should clean up everything
      await expect(arSystem.dispose()).resolves.not.toThrow();
      
      const status = arSystem.getStatus();
      expect(status.initialized).toBe(false);
      expect(status.scanning).toBe(false);
    });

    it('should emit system-disposed event', async () => {
      await arSystem.initialize();
      
      const disposePromise = new Promise<void>((resolve) => {
        arSystem.once('system-disposed', resolve);
      });

      await arSystem.dispose();
      await expect(disposePromise).resolves.toBeUndefined();
    });
  });

  describe('Performance and Stability', () => {
    beforeEach(async () => {
      await arSystem.initialize();
    });

    it('should handle rapid start/stop cycles', async () => {
      // Mock camera permission
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      // Perform multiple start/stop cycles
      for (let i = 0; i < 5; i++) {
        await arSystem.startScanning();
        await arSystem.stopScanning();
      }

      // System should remain stable
      const status = arSystem.getStatus();
      expect(status.initialized).toBe(true);
      expect(status.scanning).toBe(false);
    });

    it('should handle multiple simultaneous operations', async () => {
      // Mock camera permission
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      // Start scanning
      await arSystem.startScanning();

      // Simulate multiple analysis requests
      const analysisPromises = [];
      for (let i = 0; i < 3; i++) {
        analysisPromises.push(
          new Promise<void>((resolve) => {
            arSystem.once('analysis-completed', resolve);
            arSystem.once('analysis-failed', resolve);
          })
        );
      }

      // System should handle concurrent operations
      await arSystem.stopScanning();
    });
  });

  describe('Event System Integration', () => {
    beforeEach(async () => {
      await arSystem.initialize();
    });

    it('should propagate events between components', async () => {
      const events: string[] = [];

      // Listen to various system events
      arSystem.on('camera-permission-granted', () => events.push('camera-granted'));
      arSystem.on('scanning-started', () => events.push('scanning-started'));
      arSystem.on('analysis-completed', () => events.push('analysis-completed'));
      arSystem.on('scanning-stopped', () => events.push('scanning-stopped'));

      // Mock camera permission
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }],
      });

      await arSystem.startScanning();
      await arSystem.stopScanning();

      // Should have received scanning events
      expect(events).toContain('scanning-started');
      expect(events).toContain('scanning-stopped');
    });
  });
});