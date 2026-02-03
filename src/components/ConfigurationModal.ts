/**
 * Configuration Modal Component
 * Allows users to configure API keys and settings
 */

import { Logger } from '@/utils/Logger';
import { getSupportedModels, getModelProvider } from '@/config';
import type { LLMConfig } from '@/types';

export class ConfigurationModal {
  private logger: Logger;
  private modal: HTMLElement | null = null;
  private isVisible = false;
  private onSave?: (config: Partial<LLMConfig>) => void;

  constructor() {
    this.logger = new Logger('ConfigurationModal');
  }

  /**
   * Show the configuration modal
   */
  show(currentConfig: LLMConfig, onSave: (config: Partial<LLMConfig>) => void): void {
    this.onSave = onSave;
    
    if (this.modal) {
      this.updateModalContent(currentConfig);
      this.modal.style.display = 'flex';
    } else {
      this.createModal(currentConfig);
    }
    
    this.isVisible = true;
  }

  /**
   * Hide the configuration modal
   */
  hide(): void {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
    this.isVisible = false;
  }

  /**
   * Create the modal element
   */
  private createModal(config: LLMConfig): void {
    this.modal = document.createElement('div');
    this.modal.className = 'config-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #1e1e1e;
      color: white;
      padding: 30px;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
    `;

    modalContent.innerHTML = this.getModalHTML(config);
    this.modal.appendChild(modalContent);
    document.body.appendChild(this.modal);

    // Add event listeners
    this.setupEventListeners();
  }

  /**
   * Update modal content with current config
   */
  private updateModalContent(config: LLMConfig): void {
    if (!this.modal) return;
    
    const content = this.modal.querySelector('div');
    if (content) {
      content.innerHTML = this.getModalHTML(config);
      this.setupEventListeners();
    }
  }

  /**
   * Generate modal HTML
   */
  private getModalHTML(config: LLMConfig): string {
    const supportedModels = getSupportedModels();
    
    return `
      <h2 style="margin: 0 0 20px 0; color: #007acc;">Configuration</h2>
      
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
          LLM Model
        </label>
        <select id="model-select" style="
          width: 100%;
          padding: 10px;
          border: 1px solid #444;
          border-radius: 6px;
          background: #2d2d2d;
          color: white;
          font-size: 14px;
        ">
          ${Object.entries(supportedModels).map(([value, label]) => 
            `<option value="${value}" ${config.model === value ? 'selected' : ''}>${label}</option>`
          ).join('')}
        </select>
      </div>

      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-weight: 500;">
          API Key
        </label>
        <input 
          type="password" 
          id="api-key-input" 
          placeholder="Enter your API key"
          value="${config.apiKey}"
          style="
            width: 100%;
            padding: 10px;
            border: 1px solid #444;
            border-radius: 6px;
            background: #2d2d2d;
            color: white;
            font-size: 14px;
            box-sizing: border-box;
          "
        />
        <div id="provider-info" style="
          margin-top: 8px;
          font-size: 12px;
          color: #888;
        "></div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">
            Max Tokens
          </label>
          <input 
            type="number" 
            id="max-tokens-input" 
            value="${config.maxTokens}"
            min="100"
            max="4000"
            style="
              width: 100%;
              padding: 10px;
              border: 1px solid #444;
              border-radius: 6px;
              background: #2d2d2d;
              color: white;
              font-size: 14px;
              box-sizing: border-box;
            "
          />
        </div>
        
        <div>
          <label style="display: block; margin-bottom: 8px; font-weight: 500;">
            Temperature
          </label>
          <input 
            type="number" 
            id="temperature-input" 
            value="${config.temperature}"
            min="0"
            max="2"
            step="0.1"
            style="
              width: 100%;
              padding: 10px;
              border: 1px solid #444;
              border-radius: 6px;
              background: #2d2d2d;
              color: white;
              font-size: 14px;
              box-sizing: border-box;
            "
          />
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="cancel-btn" style="
          padding: 10px 20px;
          border: 1px solid #444;
          border-radius: 6px;
          background: transparent;
          color: white;
          cursor: pointer;
          font-size: 14px;
        ">Cancel</button>
        
        <button id="save-btn" style="
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          background: #007acc;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Save</button>
      </div>
    `;
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    if (!this.modal) return;

    // Model selection change
    const modelSelect = this.modal.querySelector('#model-select') as HTMLSelectElement;
    const providerInfo = this.modal.querySelector('#provider-info') as HTMLElement;
    
    if (modelSelect && providerInfo) {
      const updateProviderInfo = () => {
        const provider = getModelProvider(modelSelect.value);
        const providerUrls = {
          openai: 'https://platform.openai.com/api-keys',
          anthropic: 'https://console.anthropic.com/',
          google: 'https://ai.google.dev/',
        };
        
        if (provider !== 'unknown') {
          providerInfo.innerHTML = `
            Get your API key from: 
            <a href="${providerUrls[provider as keyof typeof providerUrls]}" 
               target="_blank" 
               style="color: #007acc; text-decoration: none;">
              ${provider.charAt(0).toUpperCase() + provider.slice(1)}
            </a>
          `;
        }
      };
      
      modelSelect.addEventListener('change', updateProviderInfo);
      updateProviderInfo(); // Initial call
    }

    // Save button
    const saveBtn = this.modal.querySelector('#save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    // Cancel button
    const cancelBtn = this.modal.querySelector('#cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.hide());
    }

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }
    });
  }

  /**
   * Handle save button click
   */
  private handleSave(): void {
    if (!this.modal || !this.onSave) return;

    const modelSelect = this.modal.querySelector('#model-select') as HTMLSelectElement;
    const apiKeyInput = this.modal.querySelector('#api-key-input') as HTMLInputElement;
    const maxTokensInput = this.modal.querySelector('#max-tokens-input') as HTMLInputElement;
    const temperatureInput = this.modal.querySelector('#temperature-input') as HTMLInputElement;

    if (!modelSelect || !apiKeyInput || !maxTokensInput || !temperatureInput) {
      return;
    }

    // Validate inputs
    const apiKey = apiKeyInput.value.trim();
    const maxTokens = parseInt(maxTokensInput.value);
    const temperature = parseFloat(temperatureInput.value);

    if (!apiKey) {
      this.showError('API key is required');
      return;
    }

    if (maxTokens < 100 || maxTokens > 4000) {
      this.showError('Max tokens must be between 100 and 4000');
      return;
    }

    if (temperature < 0 || temperature > 2) {
      this.showError('Temperature must be between 0 and 2');
      return;
    }

    // Save configuration
    const config: Partial<LLMConfig> = {
      model: modelSelect.value,
      apiKey,
      maxTokens,
      temperature,
    };

    this.onSave(config);
    this.hide();
    
    this.logger.info('Configuration saved successfully');
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    // Create or update error message
    let errorDiv = this.modal?.querySelector('.error-message') as HTMLElement;
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.style.cssText = `
        background: #ff4444;
        color: white;
        padding: 10px;
        border-radius: 6px;
        margin-bottom: 15px;
        font-size: 14px;
      `;
      
      const saveBtn = this.modal?.querySelector('#save-btn');
      if (saveBtn) {
        saveBtn.parentElement?.insertBefore(errorDiv, saveBtn.parentElement);
      }
    }
    
    errorDiv.textContent = message;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv) {
        errorDiv.remove();
      }
    }, 5000);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.modal && this.modal.parentElement) {
      this.modal.parentElement.removeChild(this.modal);
    }
    this.modal = null;
    this.onSave = undefined;
  }
}