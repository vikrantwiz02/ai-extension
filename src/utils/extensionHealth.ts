// Utility functions for checking extension health and context validity

export class ExtensionHealth {
  /**
   * Check if the extension context is still valid
   */
  static isContextValid(): boolean {
    try {
      return !!(chrome?.runtime?.id);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a user-friendly error message for context invalidation
   */
  static getContextInvalidMessage(): string {
    return 'Extension has been reloaded. Please refresh the page to continue using the AI Screenshot Assistant.';
  }

  /**
   * Check if this is a development environment
   */
  static isDevelopment(): boolean {
    try {
      return chrome.runtime.getManifest().version_name?.includes('dev') || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a visual indicator for invalid context
   */
  static markElementAsInvalid(element: HTMLElement): void {
    element.style.opacity = '0.5';
    element.style.cursor = 'not-allowed';
    element.title = this.getContextInvalidMessage();
  }

  /**
   * Restore element to valid state
   */
  static markElementAsValid(element: HTMLElement): void {
    element.style.opacity = '1';
    element.style.cursor = 'pointer';
    element.title = '';
  }
}
