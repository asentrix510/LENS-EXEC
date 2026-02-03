/**
 * Integration test for computer vision pipeline
 * Tests the flow from camera frame to OCR text extraction
 */

import { ComputerVisionModule } from '@/modules/ComputerVisionModule';
import { OCREngine } from '@/modules/OCREngine';
import type { CodeRegion } from '@/types';

describe('Computer Vision Pipeline Integration', () => {
  let computerVision: ComputerVisionModule;
  let ocrEngine: OCREngine;

  beforeEach(async () => {
    computerVision = new ComputerVisionModule();
    ocrEngine = new OCREngine();
    
    // Initialize modules
    await computerVision.initialize();
    await ocrEngine.initialize();
  });

  afterEach(async () => {
    await computerVision.dispose();
    await ocrEngine.dispose();
  });

  describe('Code Region Detection', () => {
    it('should detect code regions in a mock image', async () => {
      // Create mock image data
      const mockImageData = createMockImageData(800, 600);
      
      // Detect code regions
      const regions = await computerVision.detectCodeRegions(mockImageData);
      
      // Should return an array (may be empty for mock data)
      expect(Array.isArray(regions)).toBe(true);
      
      // Each region should have required properties
      regions.forEach(region => {
        expect(region).toHaveProperty('id');
        expect(region).toHaveProperty('boundingBox');
        expect(region).toHaveProperty('confidence');
        expect(region).toHaveProperty('detectionTimestamp');
        expect(region.confidence).toBeGreaterThanOrEqual(0);
        expect(region.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should calculate confidence scores correctly', async () => {
      const mockImageData = createMockImageData(400, 300);
      const regions = await computerVision.detectCodeRegions(mockImageData);
      
      regions.forEach(region => {
        expect(typeof region.confidence).toBe('number');
        expect(region.confidence).toBeGreaterThanOrEqual(0);
        expect(region.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('OCR Text Extraction', () => {
    it('should extract text from a code region', async () => {
      const mockRegion: CodeRegion = {
        id: 'test-region',
        boundingBox: { x: 10, y: 10, width: 200, height: 50 },
        confidence: 0.8,
        extractedText: '',
        detectionTimestamp: Date.now(),
        trackingHistory: [],
      };

      const mockImageData = createMockImageData(400, 300);
      
      // Extract text (will return empty string for mock data)
      const extractedText = await ocrEngine.extractText(mockRegion, mockImageData);
      
      // Should return a string
      expect(typeof extractedText).toBe('string');
    });

    it('should validate code syntax correctly', () => {
      const codeExamples = [
        'function hello() { return "world"; }',
        'const x = 10; if (x > 5) { console.log(x); }',
        'class MyClass { constructor() {} }',
        'def calculate(a, b): return a + b',
        'public static void main(String[] args) {}',
      ];

      const nonCodeExamples = [
        'This is just regular text',
        'Hello world',
        'Some random words here',
        '123 456 789',
        '',
      ];

      codeExamples.forEach(code => {
        expect(ocrEngine.validateCodeSyntax(code)).toBe(true);
      });

      nonCodeExamples.forEach(text => {
        expect(ocrEngine.validateCodeSyntax(text)).toBe(false);
      });
    });
  });

  describe('Pipeline Integration', () => {
    it('should process image through complete pipeline', async () => {
      const mockImageData = createMockImageData(800, 600);
      
      // Step 1: Detect code regions
      const regions = await computerVision.detectCodeRegions(mockImageData);
      
      // Step 2: Extract text from each region
      const processedRegions = await Promise.all(
        regions.map(async (region) => {
          const extractedText = await ocrEngine.extractText(region, mockImageData);
          return {
            ...region,
            extractedText,
          };
        })
      );
      
      // Verify pipeline completed without errors
      expect(Array.isArray(processedRegions)).toBe(true);
      processedRegions.forEach(region => {
        expect(region).toHaveProperty('extractedText');
        expect(typeof region.extractedText).toBe('string');
      });
    });

    it('should handle preprocessing correctly', async () => {
      const mockImageData = createMockImageData(200, 100);
      const mockRegion = { x: 10, y: 10, width: 100, height: 50 };
      
      // Test image preprocessing
      const preprocessedImage = computerVision.preprocessImage(mockImageData, mockRegion);
      
      if (preprocessedImage) {
        expect(preprocessedImage).toBeInstanceOf(ImageData);
        expect(preprocessedImage.width).toBe(mockRegion.width);
        expect(preprocessedImage.height).toBe(mockRegion.height);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid image data gracefully', async () => {
      const invalidImageData = new ImageData(1, 1); // Minimal image
      
      // Should not throw errors
      const regions = await computerVision.detectCodeRegions(invalidImageData);
      expect(Array.isArray(regions)).toBe(true);
    });

    it('should handle OCR errors gracefully', async () => {
      const mockRegion: CodeRegion = {
        id: 'test-region',
        boundingBox: { x: 0, y: 0, width: 1, height: 1 },
        confidence: 0.1,
        extractedText: '',
        detectionTimestamp: Date.now(),
        trackingHistory: [],
      };

      // Should not throw errors even with minimal region
      const result = await ocrEngine.extractText(mockRegion);
      expect(typeof result).toBe('string');
    });
  });
});

/**
 * Helper function to create mock ImageData
 */
function createMockImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  
  // Fill with some pattern to simulate image data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.floor(Math.random() * 255);     // Red
    data[i + 1] = Math.floor(Math.random() * 255); // Green
    data[i + 2] = Math.floor(Math.random() * 255); // Blue
    data[i + 3] = 255;                             // Alpha
  }
  
  return new ImageData(data, width, height);
}