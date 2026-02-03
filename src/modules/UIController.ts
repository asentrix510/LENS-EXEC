import { EventEmitter } from '@/utils/EventEmitter';
import { Logger } from '@/utils/Logger';
import { ConfigurationModal } from '@/components/ConfigurationModal';
import type { LLMConfig } from '@/types';

/**
 * UI Controller
 * Manages user interface components and user interactions
 */
export class UIController extends EventEmitter {
  private logger: Logger;
  private uiContainer: HTMLElement | null = null;
  private configModal: ConfigurationModal;
  private isInitialized = false;
  private isScanning = false;
  private analysisInProgress = false;

  constructor() {
    super();
    this.logger = new Logger('UIController');
    this.configModal = new ConfigurationModal();
  }

  /**
   * Initialize the UI controller
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing UI Controller...');
      
      // Create UI container
      this.createUIContainer();
      
      // Create UI components
      this.createControlPanel();
      this.createStatusIndicators();
      this.createLoadingIndicators();
      
      this.isInitialized = true;
      this.logger.info('UI Controller initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize UI Controller:', error);
      throw error;
    }
  }

  /**
   * Create main UI container
   */
  private createUIContainer(): void {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'lens-exec-ui';
    this.uiContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    `;
    
    document.body.appendChild(this.uiContainer);
  }

  /**
   * Create control panel with start/stop buttons
   */
  private createControlPanel(): void {
    if (!this.uiContainer) return;

    const controlPanel = document.createElement('div');
    controlPanel.id = 'control-panel';
    controlPanel.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      pointer-events: auto;
    `;

    // Start/Stop scanning button
    const scanButton = document.createElement('button');
    scanButton.id = 'scan-button';
    scanButton.textContent = 'Start Scanning';
    scanButton.style.cssText = `
      background: #007acc;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 122, 204, 0.3);
      transition: all 0.3s ease;
      min-width: 140px;
    `;

    scanButton.addEventListener('mouseenter', () => {
      scanButton.style.background = '#005a9e';
      scanButton.style.transform = 'translateY(-2px)';
      scanButton.style.boxShadow = '0 6px 16px rgba(0, 122, 204, 0.4)';
    });

    scanButton.addEventListener('mouseleave', () => {
      scanButton.style.background = '#007acc';
      scanButton.style.transform = 'translateY(0)';
      scanButton.style.boxShadow = '0 4px 12px rgba(0, 122, 204, 0.3)';
    });

    scanButton.addEventListener('click', () => {
      if (this.isScanning) {
        this.stopScanning();
      } else {
        this.startScanning();
      }
    });

    // Manual code input button
    const manualButton = document.createElement('button');
    manualButton.id = 'manual-button';
    manualButton.textContent = '📝 Manual Input';
    manualButton.style.cssText = `
      background: #28a745;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
      transition: all 0.3s ease;
      min-width: 140px;
    `;

    manualButton.addEventListener('mouseenter', () => {
      manualButton.style.background = '#218838';
      manualButton.style.transform = 'translateY(-2px)';
      manualButton.style.boxShadow = '0 6px 16px rgba(40, 167, 69, 0.4)';
    });

    manualButton.addEventListener('mouseleave', () => {
      manualButton.style.background = '#28a745';
      manualButton.style.transform = 'translateY(0)';
      manualButton.style.boxShadow = '0 4px 12px rgba(40, 167, 69, 0.3)';
    });

    manualButton.addEventListener('click', () => {
      this.showManualCodeInput();
    });

    // Settings button
    const settingsButton = document.createElement('button');
    settingsButton.id = 'settings-button';
    settingsButton.textContent = '⚙️';
    settingsButton.style.cssText = `
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 12px;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      backdrop-filter: blur(10px);
      transition: all 0.3s ease;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    settingsButton.addEventListener('click', () => {
      this.emit('open-settings');
    });

    controlPanel.appendChild(scanButton);
    controlPanel.appendChild(manualButton);
    controlPanel.appendChild(settingsButton);
    this.uiContainer.appendChild(controlPanel);
  }

  /**
   * Create status indicators
   */
  private createStatusIndicators(): void {
    if (!this.uiContainer) return;

    const statusPanel = document.createElement('div');
    statusPanel.id = 'status-panel';
    statusPanel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: auto;
    `;

    // Scanning status indicator
    const scanStatus = document.createElement('div');
    scanStatus.id = 'scan-status';
    scanStatus.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      gap: 8px;
    `;

    const scanStatusDot = document.createElement('div');
    scanStatusDot.id = 'scan-status-dot';
    scanStatusDot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #4CAF50;
      animation: pulse 2s infinite;
    `;

    const scanStatusText = document.createElement('span');
    scanStatusText.textContent = 'Scanning for code...';

    scanStatus.appendChild(scanStatusDot);
    scanStatus.appendChild(scanStatusText);

    // Analysis status indicator
    const analysisStatus = document.createElement('div');
    analysisStatus.id = 'analysis-status';
    analysisStatus.style.cssText = `
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      gap: 8px;
    `;

    const analysisStatusSpinner = document.createElement('div');
    analysisStatusSpinner.id = 'analysis-spinner';
    analysisStatusSpinner.style.cssText = `
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const analysisStatusText = document.createElement('span');
    analysisStatusText.textContent = 'Analyzing code...';

    analysisStatus.appendChild(analysisStatusSpinner);
    analysisStatus.appendChild(analysisStatusText);

    statusPanel.appendChild(scanStatus);
    statusPanel.appendChild(analysisStatus);
    this.uiContainer.appendChild(statusPanel);

    // Add CSS animations
    this.addAnimationStyles();
  }

  /**
   * Create loading indicators
   */
  private createLoadingIndicators(): void {
    if (!this.uiContainer) return;

    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 20px;
      pointer-events: auto;
    `;

    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top: 4px solid #007acc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;

    const loadingText = document.createElement('div');
    loadingText.id = 'loading-text';
    loadingText.textContent = 'Initializing LENS-EXEC...';
    loadingText.style.cssText = `
      color: white;
      font-size: 18px;
      font-weight: 500;
    `;

    loadingOverlay.appendChild(spinner);
    loadingOverlay.appendChild(loadingText);
    this.uiContainer.appendChild(loadingOverlay);
  }

  /**
   * Add CSS animation styles
   */
  private addAnimationStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Start scanning
   */
  private startScanning(): void {
    this.isScanning = true;
    this.updateScanButton();
    this.showScanningStatus(true);
    this.emit('start-scanning');
    this.logger.info('User started scanning');
  }

  /**
   * Stop scanning
   */
  private stopScanning(): void {
    this.isScanning = false;
    this.updateScanButton();
    this.showScanningStatus(false);
    this.showAnalysisProgress(false);
    this.emit('stop-scanning');
    this.logger.info('User stopped scanning');
  }

  /**
   * Update scan button appearance
   */
  private updateScanButton(): void {
    const scanButton = document.getElementById('scan-button');
    if (scanButton) {
      if (this.isScanning) {
        scanButton.textContent = 'Stop Scanning';
        scanButton.style.background = '#f44336';
      } else {
        scanButton.textContent = 'Start Scanning';
        scanButton.style.background = '#007acc';
      }
    }
  }

  /**
   * Show/hide scanning status indicator
   */
  showScanningStatus(show: boolean): void {
    const scanStatus = document.getElementById('scan-status');
    if (scanStatus) {
      scanStatus.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show/hide analysis progress indicator
   */
  showAnalysisProgress(show: boolean): void {
    this.analysisInProgress = show;
    const analysisStatus = document.getElementById('analysis-status');
    if (analysisStatus) {
      analysisStatus.style.display = show ? 'flex' : 'none';
    }
  }

  /**
   * Show loading overlay
   */
  showLoadingOverlay(show: boolean, text?: string): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingOverlay) {
      loadingOverlay.style.display = show ? 'flex' : 'none';
    }
    
    if (loadingText && text) {
      loadingText.textContent = text;
    }
  }

  /**
   * Show configuration modal
   */
  showConfigurationModal(currentConfig: LLMConfig, onSave: (config: Partial<LLMConfig>) => void): void {
    this.configModal.show(currentConfig, onSave);
  }

  /**
   * Create settings panel
   */
  createSettingsPanel(): HTMLElement {
    if (!this.uiContainer) {
      throw new Error('UI container not initialized');
    }

    const settingsPanel = document.createElement('div');
    settingsPanel.id = 'settings-panel';
    settingsPanel.style.cssText = `
      position: absolute;
      bottom: 100px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      min-width: 250px;
      display: none;
      pointer-events: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Settings';
    title.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 18px;
      font-weight: 600;
    `;

    // Feedback toggles
    const feedbackSection = document.createElement('div');
    feedbackSection.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; opacity: 0.8;">Feedback Types</h4>
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
          <input type="checkbox" id="show-errors" checked style="margin: 0;">
          <span>Show Errors</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
          <input type="checkbox" id="show-suggestions" checked style="margin: 0;">
          <span>Show Suggestions</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
          <input type="checkbox" id="show-simulation" style="margin: 0;">
          <span>Show Simulation</span>
        </label>
      </div>
    `;

    settingsPanel.appendChild(title);
    settingsPanel.appendChild(feedbackSection);
    this.uiContainer.appendChild(settingsPanel);

    // Add event listeners for checkboxes
    this.setupSettingsEventListeners();

    return settingsPanel;
  }

  /**
   * Setup event listeners for settings
   */
  private setupSettingsEventListeners(): void {
    const showErrors = document.getElementById('show-errors') as HTMLInputElement;
    const showSuggestions = document.getElementById('show-suggestions') as HTMLInputElement;
    const showSimulation = document.getElementById('show-simulation') as HTMLInputElement;

    if (showErrors) {
      showErrors.addEventListener('change', () => {
        this.emit('toggle-feedback', 'errors', showErrors.checked);
      });
    }

    if (showSuggestions) {
      showSuggestions.addEventListener('change', () => {
        this.emit('toggle-feedback', 'suggestions', showSuggestions.checked);
      });
    }

    if (showSimulation) {
      showSimulation.addEventListener('change', () => {
        this.emit('toggle-feedback', 'simulation', showSimulation.checked);
      });
    }
  }

  /**
   * Show notification message
   */
  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      pointer-events: auto;
      animation: slideDown 0.3s ease;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'slideUp 0.3s ease';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, 5000);
  }

  /**
   * Get notification color based on type
   */
  private getNotificationColor(type: string): string {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#f44336';
      default:
        return '#2196F3';
    }
  }

  /**
   * Show manual code input modal
   */
  showManualCodeInput(): void {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'manual-input-modal';
    modalOverlay.style.cssText = `
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
      pointer-events: auto;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    modalContent.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">Manual Code Input</h2>
      <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
        Paste your code below for AI analysis with Gemini. This is perfect when camera quality is poor or you want to analyze code from your clipboard.
      </p>
      <textarea 
        id="manual-code-input" 
        placeholder="Paste your code here..."
        style="
          width: 100%;
          height: 200px;
          padding: 15px;
          border: 2px solid #ddd;
          border-radius: 8px;
          font-family: 'Courier New', monospace;
          font-size: 14px;
          resize: vertical;
          box-sizing: border-box;
        "
      ></textarea>
      <div style="display: flex; gap: 10px; margin-top: 20px; justify-content: flex-end;">
        <button 
          id="cancel-manual-input"
          style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          "
        >Cancel</button>
        <button 
          id="analyze-manual-input"
          style="
            background: #007acc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
          "
        >Analyze Code</button>
      </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Focus on textarea
    const textarea = document.getElementById('manual-code-input') as HTMLTextAreaElement;
    setTimeout(() => textarea.focus(), 100);

    // Handle cancel
    const cancelButton = document.getElementById('cancel-manual-input');
    cancelButton?.addEventListener('click', () => {
      modalOverlay.remove();
    });

    // Handle analyze
    const analyzeButton = document.getElementById('analyze-manual-input');
    analyzeButton?.addEventListener('click', () => {
      const code = textarea.value.trim();
      if (code) {
        this.emit('manual-code-analysis', code);
        modalOverlay.remove();
        this.showNotification('Analyzing code with Gemini AI...', 'info');
      } else {
        this.showNotification('Please enter some code to analyze', 'warning');
      }
    });

    // Handle click outside modal
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.remove();
      }
    });

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        modalOverlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  /**
   * Get current UI state
   */
  getUIState() {
    return {
      isScanning: this.isScanning,
      analysisInProgress: this.analysisInProgress,
      initialized: this.isInitialized,
    };
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.logger.info('Disposing UI Controller...');
    
    if (this.uiContainer && this.uiContainer.parentElement) {
      this.uiContainer.parentElement.removeChild(this.uiContainer);
    }
    
    this.configModal.dispose();
    this.uiContainer = null;
    this.isInitialized = false;
    this.removeAllListeners();
    
    this.logger.info('UI Controller disposed');
  }
}