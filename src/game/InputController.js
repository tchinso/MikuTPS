export class InputController {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.callbacks = callbacks;
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: -1 };
    this.aimActive = false;
    this.firing = false;
    this.keys = new Set();
    this.activePointers = new Map();
    this.onKeyDown = (event) => this.handleKey(event, true);
    this.onKeyUp = (event) => this.handleKey(event, false);
    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
  }

  mount() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.root.addEventListener('pointerdown', this.onPointerDown);
    this.root.addEventListener('pointermove', this.onPointerMove);
    this.root.addEventListener('pointerup', this.onPointerUp);
    this.root.addEventListener('pointercancel', this.onPointerUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerUp);
  }

  handleKey(event, pressed) {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyF'].includes(event.code)) {
      event.preventDefault();
    }
    pressed ? this.keys.add(event.code) : this.keys.delete(event.code);
    if (pressed) this.callbacks.activity?.();
    if (pressed && event.code === 'Space') this.callbacks.dodge?.();
    if (pressed && (event.code === 'KeyE' || event.code === 'ShiftLeft')) this.callbacks.skill?.();
    if (pressed && event.code === 'KeyF') this.callbacks.fullscreen?.();
    this.firing = this.keys.has('KeyJ') || this.keys.has('Enter');
    this.updateKeyboardMove();
  }

  updateKeyboardMove() {
    const x = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    const y = Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - Number(this.keys.has('KeyW') || this.keys.has('ArrowUp'));
    const length = Math.hypot(x, y) || 1;
    this.move.x = x / length;
    this.move.y = y / length;
  }

  handlePointerDown(event) {
    const action = event.target.closest('[data-combat-action]')?.dataset.combatAction;
    this.callbacks.activity?.();
    if (action) {
      event.preventDefault();
      this.callbacks[action]?.();
      return;
    }
    const pad = event.target.closest('[data-pad]')?.dataset.pad;
    if (!pad && event.pointerType === 'mouse' && event.button === 0) {
      event.preventDefault();
      this.activePointers.set(event.pointerId, { pad: 'mouseAim' });
      this.firing = true;
      this.aimActive = true;
      this.updateMouseAim(event);
      return;
    }
    if (!pad) return;
    event.preventDefault();
    event.target.setPointerCapture?.(event.pointerId);
    this.activePointers.set(event.pointerId, { pad, startX: event.clientX, startY: event.clientY });
    if (pad === 'aim') {
      this.firing = true;
      this.aimActive = true;
    }
    this.updatePointer(event);
  }

  handlePointerMove(event) {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;
    event.preventDefault();
    if (pointer.pad === 'mouseAim') {
      this.updateMouseAim(event);
      return;
    }
    this.updatePointer(event);
  }

  handlePointerUp(event) {
    const pointer = this.activePointers.get(event.pointerId);
    if (!pointer) return;
    if (pointer.pad === 'move') {
      this.move.x = 0;
      this.move.y = 0;
      this.setKnob('move', 0, 0);
    } else {
      this.firing = false;
      this.aimActive = false;
      this.setKnob('aim', 0, 0);
    }
    this.activePointers.delete(event.pointerId);
  }

  updateMouseAim(event) {
    const bounds = this.root.getBoundingClientRect();
    const x = event.clientX - (bounds.left + bounds.width / 2);
    const y = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(x, y) || 1;
    this.aim.x = x / length;
    this.aim.y = y / length;
  }

  updatePointer(event) {
    const pointer = this.activePointers.get(event.pointerId);
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    const length = Math.hypot(dx, dy);
    const capped = Math.min(44, length);
    const nx = length ? dx / length : 0;
    const ny = length ? dy / length : 0;
    this.setKnob(pointer.pad, nx * capped, ny * capped);
    if (pointer.pad === 'move') {
      const strength = Math.min(1, length / 36);
      this.move.x = nx * strength;
      this.move.y = ny * strength;
    } else if (length > 8) {
      this.aim.x = nx;
      this.aim.y = ny;
    }
  }

  setKnob(pad, x, y) {
    const knob = this.root.querySelector(`[data-knob="${pad}"]`);
    if (knob) knob.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }
}
