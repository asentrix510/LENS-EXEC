import { Logger } from '@/utils/Logger';
import type { CodeRegion, Rectangle } from '@/types';
import { createWorker, Worker } from 'tesseract.js';

/**
 * OCR Engine
 * Extracts text content from detected code regions using Tesseract.js
 */
export class OCREngine {
  private logger: Logger;
  private worker: Worker | null = null;
  private isInitialized = false;

  constructor() {
    this.logger = new Logger('OCREngine');
  }

  /**
   * Initialize the OCR engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing OCR Engine...');
      
      // Create Tesseract worker
      this.worker = await createWorker();
      
      // Load language data (English)
      await (this.worker as any).loadLanguage('eng');
      await (this.worker as any).initialize('eng');
      
      // Configure for code recognition
      await (this.worker as any).setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~`" \n\t',
        tessedit_pageseg_mode: 6 as any, // Uniform block of text
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: 1 as any, // Neural nets LSTM engine only
      });
      
      this.isInitialized = true;
      this.logger.info('OCR Engine initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize OCR Engine:', error);
      throw error;
    }
  }

  /**
   * Extract text from a code region
   */
  async extractText(region: CodeRegion | Rectangle, imageData?: ImageData): Promise<string> {
    if (!this.isInitialized || !this.worker) {
      throw new Error('OCR Engine not initialized');
    }

    try {
      let targetRegion: Rectangle;
      
      if ('boundingBox' in region) {
        targetRegion = region.boundingBox;
      } else {
        targetRegion = region;
      }
      
      // If no image data provided, we need to get it from the current camera frame
      if (!imageData) {
        this.logger.warn('No image data provided for OCR extraction');
        return '';
      }
      
      // Extract region from image data
      const regionImageData = this.extractRegionFromImage(imageData, targetRegion);
      if (!regionImageData) {
        return '';
      }
      
      // Preprocess image for better OCR results
      const preprocessedImage = this.preprocessForOCR(regionImageData);
      
      // Perform OCR
      const result = await this.worker.recognize(preprocessedImage);
      
      // Validate and clean extracted text
      const extractedText = this.validateAndCleanText(result.data.text);
      
      this.logger.debug(`OCR extracted text (confidence: ${result.data.confidence}%):`, extractedText);
      
      return extractedText;
      
    } catch (error) {
      this.logger.error('Error extracting text:', error);
      return '';
    }
  }

  /**
   * Extract a specific region from image data
   */
  private extractRegionFromImage(imageData: ImageData, region: Rectangle): ImageData | null {
    try {
      // Create canvas to extract region
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return null;
      }
      
      // Set canvas size to region size
      canvas.width = region.width;
      canvas.height = region.height;
      
      // Create temporary canvas with full image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        return null;
      }
      
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      
      // Put image data on temporary canvas
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw region to main canvas
      ctx.drawImage(
        tempCanvas,
        region.x, region.y, region.width, region.height,
        0, 0, region.width, region.height
      );
      
      // Get image data for the region
      return ctx.getImageData(0, 0, region.width, region.height);
      
    } catch (error) {
      this.logger.error('Error extracting region from image:', error);
      return null;
    }
  }

  /**
   * Preprocess image for better OCR accuracy
   */
  private preprocessForOCR(imageData: ImageData): ImageData {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return imageData;
      }
      
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      
      // Put original image data
      ctx.putImageData(imageData, 0, 0);
      
      // Apply preprocessing filters
      
      // 1. Increase contrast
      ctx.filter = 'contrast(150%) brightness(110%)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
      
      // 2. Convert to grayscale for better text recognition
      const processedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = processedImageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Calculate grayscale value
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        
        // Apply threshold for better text contrast
        const threshold = gray > 128 ? 255 : 0;
        
        data[i] = threshold;     // Red
        data[i + 1] = threshold; // Green
        data[i + 2] = threshold; // Blue
        // Alpha channel (data[i + 3]) remains unchanged
      }
      
      ctx.putImageData(processedImageData, 0, 0);
      
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
      
    } catch (error) {
      this.logger.error('Error preprocessing image:', error);
      return imageData;
    }
  }

  /**
   * Validate extracted text and check if it looks like code
   */
  validateCodeSyntax(text: string): boolean {
    if (!text || text.trim().length === 0) {
      return false;
    }
    
    // Basic heuristics to identify code-like text
    const codeIndicators = [
      /[{}();]/,                    // Common code punctuation
      /\b(function|class|if|else|for|while|return|import|export|const|let|var|def|public|private|static|void|int|string|bool|true|false)\b/i, // Keywords
      /[=<>!]+/,                    // Operators
      /\b\w+\s*\(/,                 // Function calls
      /\/\/|\/\*|\*\/|#|<!--/,      // Comments
      /\b\d+\.\d+\b/,               // Decimal numbers
      /["'`][^"'`]*["'`]/,          // String literals
      /\b0x[0-9a-fA-F]+\b/,         // Hex numbers
      /\$\w+/,                      // Variables (PHP, shell)
      /\w+\.\w+/,                   // Object properties
    ];
    
    // Count matches
    let matches = 0;
    for (const pattern of codeIndicators) {
      if (pattern.test(text)) {
        matches++;
      }
    }
    
    // Additional checks for code structure
    const lines = text.split('\n');
    let indentedLines = 0;
    let bracketBalance = 0;
    
    for (const line of lines) {
      // Check for indentation (common in code)
      if (line.match(/^\s{2,}/)) {
        indentedLines++;
      }
      
      // Check bracket balance
      const openBrackets = (line.match(/[{[(]/g) || []).length;
      const closeBrackets = (line.match(/[}\])]/g) || []).length;
      bracketBalance += openBrackets - closeBrackets;
    }
    
    // Bonus points for code structure
    if (indentedLines > lines.length * 0.3) {
      matches += 1; // Good indentation
    }
    
    if (Math.abs(bracketBalance) <= 2) {
      matches += 1; // Reasonable bracket balance
    }
    
    // Consider it code if it has at least 2 code indicators
    return matches >= 2;
  }

  /**
   * Clean and validate extracted text
   */
  private validateAndCleanText(text: string): string {
    if (!text) {
      return '';
    }
    
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();
    
    // Remove common OCR artifacts
    cleaned = cleaned.replace(/[|]/g, 'l'); // Common misreading of 'l'
    cleaned = cleaned.replace(/[0O]/g, (_match, offset, string) => {
      // Context-based correction of 0/O confusion
      const before = string[offset - 1];
      const after = string[offset + 1];
      
      if (before && /[a-zA-Z]/.test(before) || after && /[a-zA-Z]/.test(after)) {
        return 'O';
      }
      return '0';
    });
    
    // Only return text that has reasonable length and content
    if (cleaned.length < 3) {
      return '';
    }
    
    return cleaned;
  }

  /**
   * Get extraction confidence for the last operation
   */
  getExtractionConfidence(): number {
    // This would be set by the last extraction operation
    // For now, return a default value
    return 0.8;
  }

  /**
   * Batch process multiple regions
   */
  async extractTextFromMultipleRegions(regions: CodeRegion[], imageData: ImageData): Promise<CodeRegion[]> {
    const processedRegions: CodeRegion[] = [];
    
    for (const region of regions) {
      try {
        const extractedText = await this.extractText(region, imageData);
        
        // Only include regions with successfully extracted text
        if (extractedText && this.validateCodeSyntax(extractedText)) {
          processedRegions.push({
            ...region,
            extractedText,
          });
        }
        
      } catch (error) {
        this.logger.error(`Error processing region ${region.id}:`, error);
      }
    }
    
    return processedRegions;
  }

  /**
   * Set OCR parameters for specific use cases
   */
  async setOCRParameters(params: Record<string, string>): Promise<void> {
    if (!this.worker) {
      throw new Error('OCR Engine not initialized');
    }
    
    try {
      await this.worker.setParameters(params);
      this.logger.debug('OCR parameters updated:', params);
    } catch (error) {
      this.logger.error('Error setting OCR parameters:', error);
      throw error;
    }
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing OCR Engine...');
    
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    
    this.isInitialized = false;
    
    this.logger.info('OCR Engine disposed');
  }
}