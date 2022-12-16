export default class EventHandler {
  private listeners: (() => void)[] = [];

  constructor() {
  }

  emit() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  on(listener: () => void) {
    this.listeners.push(listener);
  }

  off(listener: () => void) {
    this.listeners.splice(this.listeners.indexOf(listener), 1);
  }
}