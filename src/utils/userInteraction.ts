// Track user interaction to handle autoplay restrictions
class UserInteractionTracker {
  private hasInteracted = false;
  private listeners: (() => void)[] = [];

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    const handleInteraction = () => {
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.notifyListeners();
        this.removeListeners();
      }
    };

    // Listen for various types of user interaction
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('mousedown', handleInteraction, { once: true });
  }

  private removeListeners() {
    // Event listeners are already set with { once: true }, so they remove themselves
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback());
    this.listeners = [];
  }

  get hasUserInteracted(): boolean {
    return this.hasInteracted;
  }

  onFirstInteraction(callback: () => void) {
    if (this.hasInteracted) {
      callback();
    } else {
      this.listeners.push(callback);
    }
  }
}

// Create global instance
export const userInteractionTracker = new UserInteractionTracker();

// Export convenient function
export const hasUserInteracted = () => userInteractionTracker.hasUserInteracted;