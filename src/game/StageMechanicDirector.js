import * as THREE from 'three';

export const stageMechanicRules = {
  '1-1': { type: 'capture', count: 3, label: '공명 게이트', damageBuff: 0.12 },
  '1-2': { type: 'rhythmShield', beatSeconds: 1.6, openSeconds: 0.62, label: '방패 개방 박자' },
  '1-3': { type: 'forkRoute', label: '좌·우 경로 선택' },
  '1-4': { type: 'hiddenBeacons', count: 3, pulseSeconds: 3.2, label: '안개 비콘' },
  '1-5': { type: 'conveyor', force: 2.1, swapSeconds: 4.5, label: '컨베이어 흐름' },
  '1-6': { type: 'splitNodes', count: 2, holdSeconds: 2.6, label: '과부하 억제기' },
  '1-7': { type: 'fragileFloor', interval: 4.8, warning: 1.1, label: '붕괴 발판' },
  '1-8': { type: 'chainBreak', radius: 3.8, damage: 34, label: '연쇄 코어' },
  '1-9': { type: 'checkpoints', count: 4, label: '추격 체크포인트' },
  '1-10': { type: 'commandLinks', label: '지휘 연결망' }
};

export class StageMechanicDirector {
  constructor(world) {
    this.world = world;
    this.rule = stageMechanicRules[world.stage.id] ?? { type: 'generic', label: world.stage.primaryMechanic };
    this.nodes = [];
    this.zones = [];
    this.progress = 0;
    this.total = this.rule.count ?? 1;
    this.route = null;
    this.damageBuffUntil = 0;
    this.nextEventAt = this.rule.interval ?? Infinity;
    this.build();
  }

  build() {
    const { type } = this.rule;
    if (['capture', 'hiddenBeacons', 'splitNodes', 'checkpoints'].includes(type)) {
      const count = this.rule.count;
      for (let index = 0; index < count; index += 1) {
        const angle = type === 'splitNodes' ? index * Math.PI : (index / count) * Math.PI * 2 - Math.PI / 2;
        const radius = type === 'checkpoints' ? 7 + index * 1.2 : type === 'splitNodes' ? 7 : 8;
        this.nodes.push(this.createNode(Math.cos(angle) * radius, Math.sin(angle) * radius, index));
      }
      if (type === 'hiddenBeacons') this.world.scene.fog.density = 0.052;
    }
    if (type === 'forkRoute') {
      this.nodes.push(this.createNode(-7, -1, 0, '#5fb8ff'), this.createNode(7, -1, 1, '#ff7fb7'));
    }
  }

  createNode(x, z, index, color = this.world.stage.color) {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 0.92, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.16, 2.8, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    );
    beam.position.y = 1.4;
    group.add(beam);
    group.position.set(x, 0, z);
    group.userData = { index, ring, beam, captured: false, hold: 0, color };
    this.world.scene.add(group);
    return group;
  }

  update(dt) {
    const { type } = this.rule;
    if (type === 'capture') this.updateCapture(dt, false);
    if (type === 'hiddenBeacons') this.updateHiddenBeacons(dt);
    if (type === 'splitNodes') this.updateSplitNodes(dt);
    if (type === 'checkpoints') this.updateCheckpoints(dt);
    if (type === 'forkRoute') this.updateForkRoute();
    if (type === 'conveyor') this.updateConveyor(dt);
    if (type === 'fragileFloor') this.updateFragileFloor(dt);
    this.updateZones(dt);
    this.animateNodes(dt);
  }

  updateCapture(dt, requiresHold) {
    for (const node of this.nodes) {
      if (node.userData.captured) continue;
      const close = node.position.distanceTo(this.world.player.position) < 1.45;
      if (!close) {
        if (requiresHold) node.userData.hold = Math.max(0, node.userData.hold - dt * 0.45);
        continue;
      }
      node.userData.hold += dt;
      const characterScale = this.world.character.id === 'nari' ? 0.55 : 1;
      if (!requiresHold || node.userData.hold >= (this.rule.holdSeconds ?? 0) * characterScale) this.captureNode(node);
    }
  }

  captureNode(node) {
    node.userData.captured = true;
    node.userData.ring.material.color.set('#ffffff');
    node.userData.beam.material.opacity = 0.38;
    this.progress += 1;
    this.world.score += 420;
    this.damageBuffUntil = this.world.elapsed + 5;
    this.world.pulse(node.position, node.userData.color, 2.1);
  }

  updateHiddenBeacons(dt) {
    const visible = (this.world.elapsed % this.rule.pulseSeconds) < 0.72;
    for (const node of this.nodes) {
      node.visible = node.userData.captured || visible || node.position.distanceTo(this.world.player.position) < 2.2;
    }
    this.updateCapture(dt, true);
  }

  updateSplitNodes(dt) {
    this.updateCapture(dt, true);
    for (const node of this.nodes) {
      if (!node.userData.captured) continue;
      node.userData.hold += dt;
      node.userData.ring.material.opacity = 0.55 + Math.sin(this.world.elapsed * 6) * 0.2;
    }
  }

  updateCheckpoints(dt) {
    const current = this.nodes[this.progress];
    for (const node of this.nodes) node.visible = node === current || node.userData.captured;
    if (current && current.position.distanceTo(this.world.player.position) < 1.65) this.captureNode(current);
  }

  updateForkRoute() {
    if (this.route) return;
    const chosen = this.nodes.find((node) => node.position.distanceTo(this.world.player.position) < 1.8);
    if (!chosen) return;
    this.route = chosen.userData.index === 0 ? 'left' : 'right';
    this.progress = 1;
    chosen.userData.captured = true;
    this.world.score += 500;
    const rearX = this.route === 'left' ? 8 : -8;
    this.world.createEnemy(rearX, 7, false, 91);
    this.world.createEnemy(rearX, -7, false, 92);
  }

  updateConveyor(dt) {
    const direction = Math.floor(this.world.elapsed / this.rule.swapSeconds) % 2 === 0 ? 1 : -1;
    const grip = this.world.modifiers.terrainGrip ? 0.15 : 1;
    this.world.player.position.x += direction * this.rule.force * grip * dt;
  }

  updateFragileFloor(dt) {
    if (this.world.elapsed >= this.nextEventAt) {
      this.nextEventAt = this.world.elapsed + this.rule.interval;
      this.createFragileZone(this.world.player.position.clone());
    }
  }

  createFragileZone(position) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 32),
      new THREE.MeshBasicMaterial({ color: '#ff4f86', transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position).setY(0.05);
    this.world.scene.add(mesh);
    this.zones.push({ mesh, warning: this.rule.warning, active: 1.3, hit: false });
  }

  updateZones(dt) {
    for (let index = this.zones.length - 1; index >= 0; index -= 1) {
      const zone = this.zones[index];
      if (zone.warning > 0) {
        zone.warning -= dt;
        zone.mesh.material.opacity = 0.13 + Math.sin(this.world.elapsed * 15) * 0.08;
      } else {
        zone.active -= dt;
        zone.mesh.material.opacity = 0.64;
        if (!zone.hit && zone.mesh.position.distanceTo(this.world.player.position) < 1.8) {
          zone.hit = true;
          this.world.damagePlayer(18, 'hazard');
          const away = this.world.player.position.clone().sub(zone.mesh.position).setY(0).normalize();
          this.world.player.position.addScaledVector(away, 1.8 * (1 - (this.world.modifiers.knockbackResist ?? 0)));
        }
      }
      if (zone.active <= 0) {
        this.world.scene.remove(zone.mesh);
        zone.mesh.geometry.dispose();
        zone.mesh.material.dispose();
        this.zones.splice(index, 1);
      }
    }
  }

  animateNodes(dt) {
    for (const node of this.nodes) {
      node.rotation.y += dt * 0.8;
      if (!node.userData.captured) node.userData.beam.scale.y = 0.8 + Math.sin(this.world.elapsed * 3 + node.userData.index) * 0.16;
    }
  }

  modifyHit(enemy, hit) {
    const result = { hpMultiplier: 1, breakMultiplier: 1 };
    if (this.rule.type === 'rhythmShield') {
      const open = this.forcedOpenUntil > this.world.elapsed || (this.world.elapsed % this.rule.beatSeconds) < this.rule.openSeconds;
      if (!open) {
        result.hpMultiplier *= 0.18;
        result.breakMultiplier *= 1.45;
      }
    }
    if (this.rule.type === 'conveyor' && enemy.archetype.trait === 'frontArmor' && !hit.weakPoint) result.hpMultiplier *= 0.3;
    if (this.rule.type === 'commandLinks' && enemy.boss && this.world.enemies.some((candidate) => !candidate.dead && !candidate.boss)) result.hpMultiplier *= 0.24;
    if (this.damageBuffUntil > this.world.elapsed) result.hpMultiplier *= 1 + (this.rule.damageBuff ?? 0.1);
    return result;
  }

  onEnemyKilled(enemy) {
    if (this.rule.type !== 'chainBreak') return;
    this.world.pulse(enemy.group.position, '#ffd166', this.rule.radius);
    for (const target of this.world.enemies) {
      if (target.dead || target === enemy || target.group.position.distanceTo(enemy.group.position) > this.rule.radius) continue;
      target.hp -= this.rule.damage;
      target.break -= this.rule.damage * 0.55;
      if (target.hp <= 0) this.world.killEnemy(target);
    }
  }

  isObjectiveComplete() {
    if (['capture', 'hiddenBeacons', 'splitNodes', 'checkpoints'].includes(this.rule.type)) return this.progress >= this.total;
    if (this.rule.type === 'forkRoute') return Boolean(this.route);
    return true;
  }

  assistObjective() {
    const pending = this.nodes.filter((node) => !node.userData.captured);
    if (pending.length) {
      let nearest = pending[0];
      let distance = nearest.position.distanceToSquared(this.world.player.position);
      for (const node of pending.slice(1)) {
        const nextDistance = node.position.distanceToSquared(this.world.player.position);
        if (nextDistance < distance) {
          nearest = node;
          distance = nextDistance;
        }
      }
      this.captureNode(nearest);
      return true;
    }
    if (this.rule.type === 'rhythmShield') {
      this.forcedOpenUntil = this.world.elapsed + 3.5;
      return true;
    }
    return false;
  }

  hud() {
    if (this.total > 1) return { label: this.rule.label, value: `${this.progress}/${this.total}`, complete: this.isObjectiveComplete() };
    if (this.rule.type === 'rhythmShield') {
      const open = this.forcedOpenUntil > this.world.elapsed || (this.world.elapsed % this.rule.beatSeconds) < this.rule.openSeconds;
      return { label: this.rule.label, value: open ? 'OPEN' : 'BREAK', complete: true };
    }
    if (this.rule.type === 'forkRoute') return { label: this.rule.label, value: this.route?.toUpperCase() ?? '선택', complete: Boolean(this.route) };
    if (this.rule.type === 'conveyor') return { label: this.rule.label, value: Math.floor(this.world.elapsed / this.rule.swapSeconds) % 2 === 0 ? '→' : '←', complete: true };
    return { label: this.rule.label, value: 'ACTIVE', complete: true };
  }
}
