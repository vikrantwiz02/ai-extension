// Content script that injects the clickable dot and handles user interaction
import { ExtensionHealth } from '../utils/extensionHealth';

interface ResponseMessage {
  type: 'SCREENSHOT_RESULT';
  success: boolean;
  answer?: string;
  error?: string;
}

class AIAssistantDot {
  private dotElement: HTMLElement | null = null;
  private answerBox: HTMLElement | null = null;
  private isProcessing = false;
  private isDragging = false;

  constructor() {
    console.log('🤖 AI Screenshot Assistant - Content script initializing');
    this.init();
    this.setupDisconnectionHandler();
  }

  private isExtensionContextValid(): boolean {
    return ExtensionHealth.isContextValid();
  }

  private setupDisconnectionHandler(): void {
    // Listen for extension context invalidation
    if (chrome.runtime && chrome.runtime.onConnect) {
      try {
        const port = chrome.runtime.connect({ name: 'content-script' });
        port.onDisconnect.addListener(() => {
          console.log('🔌 Extension context disconnected');
          if (this.dotElement) {
            ExtensionHealth.markElementAsInvalid(this.dotElement);
          }
        });
      } catch (error) {
        console.log('⚠️ Could not establish connection port (extension may be reloading)');
      }
    }
  }

  private init(): void {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createDot());
    } else {
      this.createDot();
    }
  }

  private createDot(): void {
    // Avoid creating multiple dots
    if (this.dotElement) return;

    console.log('🎯 AI Screenshot Assistant - Creating purple dot');
    this.dotElement = document.createElement('div');
    this.dotElement.id = 'ai-assistant-dot';
    this.dotElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      background: rgba(245, 245, 245, 0.8);
      border-radius: 50%;
      cursor: pointer;
      z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(220, 220, 220, 0.6);
      backdrop-filter: blur(10px);
    `;

    // No icon - just plain button

    // No hover effects - keep same color always

    // Handle click (prevent click during drag)
    this.dotElement.addEventListener('click', () => {
      if (!this.isDragging) {
        this.handleClick();
      }
    });

    // Add drag functionality
    this.setupDragFunctionality();

    // Append to document
    document.body.appendChild(this.dotElement);
    console.log('✅ AI Screenshot Assistant - Purple dot added to page');
  }

  private setupDragFunctionality(): void {
    if (!this.dotElement) return;

    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;
    let hasMoved = false;

    const onMouseDown = (e: MouseEvent) => {
      if (this.isProcessing) return;
      
      startX = e.clientX;
      startY = e.clientY;
      hasMoved = false;
      
      const rect = this.dotElement!.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      // Add smooth transition during drag
      this.dotElement!.style.transition = 'none';

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Only start dragging if moved more than 3px (more sensitive)
      if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
        this.isDragging = true;
        hasMoved = true;
      }

      if (this.isDragging) {
        const newX = Math.max(20, Math.min(window.innerWidth - 60, initialX + deltaX));
        const newY = Math.max(20, Math.min(window.innerHeight - 60, initialY + deltaY));

        // Override all positioning to use absolute positioning during drag
        this.dotElement!.style.left = newX + 'px';
        this.dotElement!.style.top = newY + 'px';
        this.dotElement!.style.bottom = 'auto';
        this.dotElement!.style.transform = 'none';
        this.dotElement!.style.position = 'fixed';
      }
    };

    const onMouseUp = () => {
      // Re-enable smooth transitions
      this.dotElement!.style.transition = 'all 0.3s ease';
      
      // Reset drag state after a short delay to prevent click
      setTimeout(() => {
        this.isDragging = false;
      }, hasMoved ? 150 : 0);
      
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    this.dotElement.addEventListener('mousedown', onMouseDown);
  }

  private async handleClick(): Promise<void> {
    if (this.isProcessing) return;

    // Check extension context before processing
    if (!this.isExtensionContextValid()) {
      this.showError(ExtensionHealth.getContextInvalidMessage());
      return;
    }

    this.isProcessing = true;
    this.setLoadingState();
    this.hideAnswerBox();

    try {
      const response = await this.sendScreenshotRequest();
      
      if (response.success && response.answer) {
        this.showAnswer(response.answer);
      } else {
        this.showError(response.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error in handleClick:', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Extension has been reloaded') || errorMessage.includes('context invalidated')) {
        this.showError(ExtensionHealth.getContextInvalidMessage());
      } else {
        this.showError('Failed to process request: ' + errorMessage);
      }
    } finally {
      this.isProcessing = false;
      this.resetDotState();
    }
  }

  private setLoadingState(): void {
    if (!this.dotElement) return;

    // Keep original color and size - no visual changes
    this.dotElement.innerHTML = `
      <div style="
        width: 16px; 
        height: 16px; 
        border: 2px solid rgba(120, 120, 120, 0.6); 
        border-top: 2px solid transparent; 
        border-radius: 50%; 
        animation: spin 1s linear infinite;
      "></div>
    `;

    // Add keyframe animation for spinner
    if (!document.getElementById('ai-assistant-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'ai-assistant-spinner-style';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private resetDotState(): void {
    if (!this.dotElement) return;

    // Keep original styling - no changes to background or transform
    this.dotElement.innerHTML = '';
    // No icon - keep it plain
  }

  private sendScreenshotRequest(): Promise<ResponseMessage> {
    return new Promise((resolve, reject) => {
      // Check if extension context is still valid
      if (!ExtensionHealth.isContextValid()) {
        reject(new Error(ExtensionHealth.getContextInvalidMessage()));
        return;
      }

      try {
        chrome.runtime.sendMessage(
          { type: 'CAPTURE_SCREENSHOT' },
          (response: ResponseMessage) => {
            if (chrome.runtime.lastError) {
              // Check for specific context invalidation errors
              const error = chrome.runtime.lastError.message;
              if (error?.includes('context invalidated') || error?.includes('Extension context')) {
                reject(new Error(ExtensionHealth.getContextInvalidMessage()));
              } else {
                reject(new Error(error || 'Unknown extension error'));
              }
            } else if (!response) {
              reject(new Error('No response received from extension'));
            } else {
              resolve(response);
            }
          }
        );
      } catch (error) {
        reject(new Error('Failed to communicate with extension: ' + (error as Error).message));
      }
    });
  }

  private showAnswer(answer: string): void {
    this.hideAnswerBox();

    // Get the current position of the dot
    const dotRect = this.dotElement!.getBoundingClientRect();
    
    this.answerBox = document.createElement('div');
    this.answerBox.id = 'ai-assistant-answer-box';
    this.answerBox.style.cssText = `
      position: fixed;
      left: ${Math.min(dotRect.left, window.innerWidth - 300)}px;
      top: ${dotRect.bottom + 10}px;
      max-width: 280px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #333;
      z-index: 2147483646;
      word-wrap: break-word;
      background: rgba(0, 0, 0, 0);
      border: none;
      border-radius: 0;
      padding: 4px 6px;
      margin: 0;
      box-shadow: none;
      animation: fadeIn 0.3s ease-out;
      cursor: pointer;
    `;

    this.answerBox.textContent = answer;
    
    // Click to hide
    this.answerBox.addEventListener('click', () => this.hideAnswerBox());

    // Add animation keyframes
    if (!document.getElementById('ai-assistant-animation-style')) {
      const style = document.createElement('style');
      style.id = 'ai-assistant-animation-style';
      style.textContent = `
        @keyframes fadeIn {
          0% { 
            opacity: 0; 
            transform: translateY(-5px); 
          }
          100% { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.answerBox);

    // Auto-hide after 10 seconds
    setTimeout(() => this.hideAnswerBox(), 10000);
  }

  private showError(error: string): void {
    this.showAnswer(`Error: ${error}`);
  }

  private hideAnswerBox(): void {
    if (this.answerBox) {
      this.answerBox.remove();
      this.answerBox = null;
    }
  }
}

new AIAssistantDot();

export {};
