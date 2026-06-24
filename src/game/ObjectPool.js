export class ObjectPool {
  constructor({ create, activate = () => {}, reset = () => {}, dispose = () => {}, maxRetained = 24 }) {
    if (typeof create !== 'function') throw new TypeError('ObjectPool requires a create function.');
    this.create = create;
    this.activate = activate;
    this.reset = reset;
    this.disposeValue = dispose;
    this.maxRetained = Math.max(0, maxRetained);
    this.available = [];
    this.active = new Set();
    this.created = new Set();
  }

  acquire(context) {
    const value = this.available.pop() ?? this.track(this.create(context));
    this.active.add(value);
    this.activate(value, context);
    return value;
  }

  release(value) {
    if (!this.active.delete(value)) return false;
    this.reset(value);
    if (this.available.length < this.maxRetained) this.available.push(value);
    else {
      this.created.delete(value);
      this.disposeValue(value);
    }
    return true;
  }

  track(value) {
    this.created.add(value);
    return value;
  }

  stats() {
    return { created: this.created.size, active: this.active.size, available: this.available.length };
  }

  dispose() {
    for (const value of this.created) this.disposeValue(value);
    this.available.length = 0;
    this.active.clear();
    this.created.clear();
  }
}
