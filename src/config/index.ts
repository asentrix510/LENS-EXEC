/**
 * Configuration management for LENS-EXEC
 * Handles environment variables and default settings
 */

import type { SystemConfig } from '@/types';

/**
 * Get configuration from environment variables or defaults
 * Uses Vite's import.meta.env for browser compatibility
 */
export function getConfig(): SystemConfig {
  return {
    camera: {
      width: parseInt(import.meta.env.VITE_CAMERA_WIDTH || '1280'),
      height: parseInt(import.meta.env.VITE_CAMERA_HEIGHT || '720'),
      frameRate: parseInt(import.meta.env.VITE_CAMERA_FRAME_RATE || '30'),
      facingMode: (import.meta.env.VITE_CAMERA_FACING_MODE as 'user' | 'environment') || 'environment',
    },
    llm: {
      apiKey: import.meta.env.VITE_LLM_API_KEY || '',
      model: import.meta.env.VITE_LLM_MODEL || 'gemini-1.5-pro',
      maxTokens: parseInt(import.meta.env.VITE_LLM_MAX_TOKENS || '2048'),
      temperature: parseFloat(import.meta.env.VITE_LLM_TEMPERATURE || '0.1'),
      timeout: parseInt(import.meta.env.VITE_LLM_TIMEOUT || '30000'),
    },
    enableSimulation: import.meta.env.VITE_ENABLE_SIMULATION === 'true',
    debugMode: import.meta.env.DEV || import.meta.env.VITE_DEBUG_MODE === 'true',
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: SystemConfig): string[] {
  const errors: string[] = [];

  // Validate camera config
  if (config.camera.width <= 0 || config.camera.height <= 0) {
    errors.push('Camera dimensions must be positive');
  }

  if (config.camera.frameRate <= 0 || config.camera.frameRate > 60) {
    errors.push('Camera frame rate must be between 1 and 60');
  }

  // Validate LLM config
  if (!config.llm.apiKey && !config.debugMode) {
    errors.push('LLM API key is required for production use');
  }

  if (config.llm.maxTokens <= 0 || config.llm.maxTokens > 4000) {
    errors.push('LLM max tokens must be between 1 and 4000');
  }

  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    errors.push('LLM temperature must be between 0 and 2');
  }

  if (config.llm.timeout <= 0) {
    errors.push('LLM timeout must be positive');
  }

  return errors;
}

/**
 * Get supported LLM models
 */
export function getSupportedModels(): Record<string, string> {
  return {
    'gpt-4-vision-preview': 'OpenAI GPT-4 Vision (Recommended)',
    'gpt-4o': 'OpenAI GPT-4 Omni',
    'claude-3-5-sonnet-20241022': 'Anthropic Claude 3.5 Sonnet',
    'claude-3-opus-20240229': 'Anthropic Claude 3 Opus',
    'gemini-1.5-pro': 'Google Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Google Gemini 1.5 Flash',
  };
}

/**
 * Detect model provider from model name
 */
export function getModelProvider(model: string): 'openai' | 'anthropic' | 'google' | 'unknown' {
  if (model.includes('gpt')) return 'openai';
  if (model.includes('claude')) return 'anthropic';
  if (model.includes('gemini')) return 'google';
  return 'unknown';
}