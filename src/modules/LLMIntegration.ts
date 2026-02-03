import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';
import { NetworkMonitor } from '@/utils/NetworkMonitor';
import { getModelProvider } from '@/config';
import type { AnalysisResult, CodeRegion, LLMConfig, CodeIssue, CodeSuggestion } from '@/types';

/**
 * LLM Integration Module
 * Interfaces with multimodal language models for code analysis
 */
export class LLMIntegration extends EventEmitter {
  private logger: Logger;
  private config: LLMConfig;
  private networkMonitor: NetworkMonitor;
  private requestQueue: AnalysisRequest[] = [];
  private isProcessing = false;
  private abortController: AbortController | null = null;

  constructor(config: LLMConfig) {
    super();
    this.logger = new Logger('LLMIntegration');
    this.config = config;
    this.networkMonitor = new NetworkMonitor();
    
    // Setup network event handlers
    this.networkMonitor.on('online', () => {
      this.logger.info('Network restored - resuming analysis processing');
      this.processQueue();
    });
    
    this.networkMonitor.on('offline', () => {
      this.logger.warn('Network lost - analysis requests will be queued');
    });
  }

  /**
   * Initialize the LLM integration
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing LLM Integration...');
    
    // Validate configuration
    if (!this.config.apiKey) {
      this.logger.warn('No API key provided - LLM analysis will be disabled');
      return;
    }
    
    this.logger.info(`LLM Integration initialized with model: ${this.config.model}`);
  }

  /**
   * Analyze code using multimodal LLM
   */
  async analyzeCode(codeText: string, region: CodeRegion, imageBlob?: Blob): Promise<AnalysisResult> {
    if (!this.config.apiKey) {
      throw new Error('LLM API key not configured');
    }

    const request: AnalysisRequest = {
      id: this.generateRequestId(),
      codeText,
      region,
      imageBlob,
      timestamp: Date.now(),
    };

    // Add to queue
    this.requestQueue.push(request);
    
    // Process queue
    this.processQueue();
    
    // Return promise that resolves when this request is processed
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Analysis request timed out'));
      }, this.config.timeout);

      const onComplete = (result: AnalysisResult) => {
        if (result.codeRegionId === region.id) {
          clearTimeout(timeout);
          this.off('analysis-completed', onComplete);
          this.off('analysis-failed', onFailed);
          resolve(result);
        }
      };

      const onFailed = (error: Error, regionId: string) => {
        if (regionId === region.id) {
          clearTimeout(timeout);
          this.off('analysis-completed', onComplete);
          this.off('analysis-failed', onFailed);
          reject(error);
        }
      };

      this.on('analysis-completed', onComplete);
      this.on('analysis-failed', onFailed);
    });
  }

  /**
   * Process the analysis request queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      try {
        const result = await this.processAnalysisRequest(request);
        this.emit('analysis-completed', result);
      } catch (error) {
        this.logger.error(`Analysis failed for region ${request.region.id}:`, error);
        this.emit('analysis-failed', error, request.region.id);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single analysis request
   */
  private async processAnalysisRequest(request: AnalysisRequest): Promise<AnalysisResult> {
    this.logger.debug(`Processing analysis request for region ${request.region.id}`);

    // Create abort controller for this request
    this.abortController = new AbortController();

    try {
      // Prepare the analysis prompt
      const prompt = this.createAnalysisPrompt(request.codeText);
      
      // Make API request based on configured model
      let response: any;
      const provider = getModelProvider(this.config.model);
      
      switch (provider) {
        case 'openai':
          response = await this.callOpenAIAPI(prompt, request.imageBlob);
          break;
        case 'anthropic':
          response = await this.callAnthropicAPI(prompt, request.imageBlob);
          break;
        case 'google':
          response = await this.callGoogleAPI(prompt, request.imageBlob);
          break;
        default:
          throw new Error(`Unsupported model provider: ${provider} for model: ${this.config.model}`);
      }

      // Parse the response
      const analysisResult = this.parseAnalysisResponse(response, request.region.id);
      
      this.logger.debug(`Analysis completed for region ${request.region.id}`);
      return analysisResult;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Analysis request was cancelled');
      }
      
      // Handle API-specific errors
      this.handleAPIErrors(error as Error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Create analysis prompt for the LLM
   */
  private createAnalysisPrompt(codeText: string): string {
    return `Please analyze the following code and provide:

1. Programming language identification
2. Potential errors or issues (syntax, logic, style, security)
3. Suggestions for improvements
4. If applicable, simulate the code execution (for simple, safe code only)

Code to analyze:
\`\`\`
${codeText}
\`\`\`

Please respond in the following JSON format:
{
  "language": "detected programming language",
  "errors": [
    {
      "type": "syntax|logic|style|security",
      "severity": "low|medium|high",
      "lineNumber": number or null,
      "description": "description of the issue",
      "suggestedFix": "suggested fix or null"
    }
  ],
  "suggestions": [
    {
      "type": "improvement|optimization|best-practice",
      "description": "description of the suggestion",
      "lineNumber": number or null,
      "suggestedCode": "suggested code or null"
    }
  ],
  "simulation": {
    "canSimulate": boolean,
    "output": "simulated output or null",
    "errors": ["any runtime errors"],
    "executionTime": number or null,
    "securityRisks": ["any security concerns"]
  }
}`;
  }

  /**
   * Call OpenAI GPT-4V API
   */
  private async callOpenAIAPI(prompt: string, imageBlob?: Blob): Promise<any> {
    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt }
        ]
      }
    ];

    // Add image if provided
    if (imageBlob) {
      const base64Image = await this.blobToBase64(imageBlob);
      messages[0].content.push({
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`
        }
      });
    }

    // Create retryable request
    return this.networkMonitor.createRetryableRequest(
      `openai-${Date.now()}`,
      async () => {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
          }),
          signal: this.abortController?.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
      },
      3 // Max retries
    );
  }

  /**
   * Call Anthropic Claude API
   */
  private async callAnthropicAPI(prompt: string, imageBlob?: Blob): Promise<any> {
    const content: any[] = [
      { type: 'text', text: prompt }
    ];

    // Add image if provided
    if (imageBlob) {
      const base64Image = await this.blobToBase64(imageBlob);
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: base64Image
        }
      });
    }

    // Create retryable request
    return this.networkMonitor.createRetryableRequest(
      `anthropic-${Date.now()}`,
      async () => {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': this.config.apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.config.model,
            max_tokens: this.config.maxTokens,
            temperature: this.config.temperature,
            messages: [
              {
                role: 'user',
                content
              }
            ]
          }),
          signal: this.abortController?.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.content[0].text;
      },
      3 // Max retries
    );
  }

  /**
   * Call Google Gemini API using the official format
   */
  private async callGoogleAPI(prompt: string, imageBlob?: Blob): Promise<any> {
    const parts: any[] = [
      { text: prompt }
    ];

    // Add image if provided
    if (imageBlob) {
      const base64Image = await this.blobToBase64(imageBlob);
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: base64Image
        }
      });
    }

    // Create retryable request
    return this.networkMonitor.createRetryableRequest(
      `google-${Date.now()}`,
      async () => {
        // Use the correct API endpoint format from Google AI docs
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent`;
        
        this.logger.debug('Making Gemini API request:', {
          model: this.config.model,
          hasApiKey: !!this.config.apiKey,
          apiKeyLength: this.config.apiKey?.length || 0,
          url: apiUrl
        });

        const requestBody = {
          contents: [
            {
              parts: parts
            }
          ],
          generationConfig: {
            temperature: this.config.temperature,
            maxOutputTokens: this.config.maxTokens,
          }
        };

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.apiKey, // Use x-goog-api-key header instead of query param
          },
          body: JSON.stringify(requestBody),
          signal: this.abortController?.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error('Gemini API error response:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          throw new Error(`Google API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        this.logger.debug('Gemini API response received:', {
          hasCandidates: !!data.candidates,
          candidatesLength: data.candidates?.length || 0,
          fullResponse: data
        });
        
        if (!data.candidates || data.candidates.length === 0) {
          this.logger.error('No candidates in Gemini response:', data);
          throw new Error('No response from Gemini API - check your API key and quota');
        }

        // Extract text from the response structure
        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
          this.logger.error('Invalid response structure from Gemini:', candidate);
          throw new Error('Invalid response structure from Gemini API');
        }

        return candidate.content.parts[0].text;
      },
      3 // Max retries
    );
  }

  /**
   * Parse LLM response into structured analysis result
   */
  parseAnalysisResponse(response: string, codeRegionId: string): AnalysisResult {
    try {
      // Try to extract JSON from the response - handle multiple formats
      let jsonText = response;
      
      // Remove markdown code blocks if present
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
      
      // Try to find JSON object in the text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      this.logger.debug('Extracted JSON text:', jsonText);
      
      const parsed = JSON.parse(jsonText);

      // Convert to our AnalysisResult format
      const analysisResult: AnalysisResult = {
        codeRegionId,
        language: parsed.language || 'unknown',
        errors: this.parseErrors(parsed.errors || []),
        suggestions: this.parseSuggestions(parsed.suggestions || []),
        analysisTimestamp: Date.now(),
      };

      // Add simulation result if available
      if (parsed.simulation && parsed.simulation.canSimulate) {
        analysisResult.simulationResult = {
          output: parsed.simulation.output || '',
          errors: parsed.simulation.errors || [],
          executionTime: parsed.simulation.executionTime || 0,
        };
      }

      this.logger.info('Successfully parsed analysis response:', analysisResult);
      return analysisResult;

    } catch (error) {
      this.logger.error('Error parsing LLM response:', error);
      this.logger.debug('Raw response that failed to parse:', response);
      
      // Try to extract useful information even if JSON parsing fails
      const language = this.extractLanguageFromText(response);
      const suggestions = this.extractSuggestionsFromText(response);
      
      return {
        codeRegionId,
        language: language || 'unknown',
        errors: [],
        suggestions: suggestions.length > 0 ? suggestions : [{
          type: 'improvement',
          description: `Analysis completed. ${response.substring(0, 200)}${response.length > 200 ? '...' : ''}`,
        }],
        analysisTimestamp: Date.now(),
      };
    }
  }

  /**
   * Extract language from text response as fallback
   */
  private extractLanguageFromText(text: string): string | null {
    const languageMatch = text.match(/"language":\s*"([^"]+)"/i);
    return languageMatch ? languageMatch[1] : null;
  }

  /**
   * Extract suggestions from text response as fallback
   */
  private extractSuggestionsFromText(text: string): CodeSuggestion[] {
    const suggestions: CodeSuggestion[] = [];
    
    // Look for common suggestion patterns
    const suggestionPatterns = [
      /suggestion[s]?[:\-]\s*([^\n]+)/gi,
      /improve[ment]*[:\-]\s*([^\n]+)/gi,
      /consider[:\-]\s*([^\n]+)/gi,
      /recommend[ation]*[:\-]\s*([^\n]+)/gi,
    ];
    
    suggestionPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        suggestions.push({
          type: 'improvement',
          description: match[1].trim(),
        });
      }
    });
    
    return suggestions;
  }

  /**
   * Parse errors from LLM response
   */
  private parseErrors(errors: any[]): CodeIssue[] {
    return errors.map(error => ({
      type: error.type || 'logic',
      severity: error.severity || 'medium',
      lineNumber: error.lineNumber || undefined,
      description: error.description || 'Unknown issue',
      suggestedFix: error.suggestedFix || undefined,
    }));
  }

  /**
   * Parse suggestions from LLM response
   */
  private parseSuggestions(suggestions: any[]): CodeSuggestion[] {
    return suggestions.map(suggestion => ({
      type: suggestion.type || 'improvement',
      description: suggestion.description || 'No description provided',
      lineNumber: suggestion.lineNumber || undefined,
      suggestedCode: suggestion.suggestedCode || undefined,
    }));
  }

  /**
   * Convert blob to base64 string
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Handle API errors with appropriate user feedback
   */
  handleAPIErrors(error: Error): void {
    this.logger.error('LLM API error:', error);
    
    let userMessage = 'Analysis service temporarily unavailable';
    
    if (error.message.includes('401')) {
      userMessage = 'API authentication failed - please check your API key';
    } else if (error.message.includes('429')) {
      userMessage = 'Rate limit exceeded - please try again later';
    } else if (error.message.includes('timeout')) {
      userMessage = 'Analysis request timed out - please try again';
    }
    
    this.emit('api-error', userMessage);
  }

  /**
   * Queue analysis request for later processing
   */
  queueAnalysisRequest(request: AnalysisRequest): void {
    this.requestQueue.push(request);
    this.logger.debug(`Queued analysis request. Queue length: ${this.requestQueue.length}`);
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests(): void {
    this.requestQueue = [];
    
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.logger.info('All analysis requests cancelled');
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing LLM Integration...');
    
    this.cancelAllRequests();
    this.removeAllListeners();
    
    this.logger.info('LLM Integration disposed');
  }
}

/**
 * Internal interface for analysis requests
 */
interface AnalysisRequest {
  id: string;
  codeText: string;
  region: CodeRegion;
  imageBlob?: Blob;
  timestamp: number;
}