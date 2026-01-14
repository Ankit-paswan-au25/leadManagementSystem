/**
 * Global Alert System
 * Allows interceptors and non-React code to trigger alerts
 * Components can subscribe to show alerts
 */

export type AlertType = 'error' | 'info' | 'success';

export interface AlertMessage {
  type: AlertType;
  message: string;
  id?: string;
}

type AlertCallback = (alert: AlertMessage) => void;

class GlobalAlertManager {
  private listeners: Set<AlertCallback> = new Set();

  /**
   * Subscribe to alert events
   */
  subscribe(callback: AlertCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Show an error alert
   */
  showError(message: string): void {
    this.notify({ type: 'error', message, id: Date.now().toString() });
  }

  /**
   * Show an info alert
   */
  showInfo(message: string): void {
    this.notify({ type: 'info', message, id: Date.now().toString() });
  }

  /**
   * Show a success alert
   */
  showSuccess(message: string): void {
    this.notify({ type: 'success', message, id: Date.now().toString() });
  }

  private notify(alert: AlertMessage): void {
    this.listeners.forEach((callback) => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }
}

// Export singleton instance
export const globalAlerts = new GlobalAlertManager();

