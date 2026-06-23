import * as THREE from 'three';

const chapterOneRules = {
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

const extendedRules = {
  '2-1': { type: 'rainVisibility', label: '빗속 전도', behaviors: ['fog', 'hazard', 'force'], interval: 6.4, force: 0.8, warning: 1.35 },
  '2-2': { type: 'reflectiveWalls', label: '반사 각도', behaviors: ['shieldCycle', 'ricochet'], cycle: 2.4, open: 0.8 },
  '2-3': { type: 'toxinCleanse', label: '오염 정화', behaviors: ['hazard', 'capture'], objective: 'capture', count: 2, holdSeconds: 2.4, interval: 5.8, warning: 1.2 },
  '2-4': { type: 'waterLevel', label: '수문 제어', behaviors: ['force', 'ordered'], objective: 'ordered', count: 3, force: 1.15 },
  '2-5': { type: 'stealthCones', label: '탐조등 침투', behaviors: ['fog', 'ordered'], objective: 'ordered', count: 3, fog: 0.046 },
  '2-6': { type: 'magneticStorm', label: '자기장 극성', behaviors: ['force', 'projectileCurve'], force: 1.45, cycle: 3.8 },
  '2-7': { type: 'projectileReversal', label: '탄막 반전', behaviors: ['reverse', 'safeZone'], cycle: 4.2 },
  '2-8': { type: 'aerialGaps', label: '공중 발판', behaviors: ['ordered', 'hazard'], objective: 'ordered', count: 4, interval: 5.2, warning: 1.05 },
  '2-9': { type: 'weaponOverheat', label: '무기 과열', behaviors: ['overheat', 'capture'], objective: 'capture', count: 2, holdSeconds: 1.8, coolRate: 0.16 },
  '2-10': { type: 'directionalArmorBoss', label: '후방 장갑 코어', behaviors: ['rearArmor', 'hazard'], interval: 5.6, warning: 1.3 },
  '3-1': { type: 'whiteNoise', label: '음향 탐지', behaviors: ['fog', 'revealOnShot'], fog: 0.06 },
  '3-2': { type: 'marionetteNetwork', label: '강화 연결망', behaviors: ['links'] },
  '3-3': { type: 'compressionRoom', label: '압축 구역', behaviors: ['shrink', 'hazard'], interval: 5.4, warning: 1.15, minArena: 7.5 },
  '3-4': { type: 'orderedKeys', label: '순차 스위치', behaviors: ['ordered'], objective: 'ordered', count: 3 },
  '3-5': { type: 'iceInertia', label: '빙판 관성', behaviors: ['force', 'hazard'], force: 1.65, interval: 5.1, warning: 0.95 },
  '3-6': { type: 'sequentialWeakpoints', label: '약점 순서', behaviors: ['weakpointSequence'], cycle: 3.2 },
  '3-7': { type: 'shadowClones', label: '진짜 코어 점멸', behaviors: ['enemyCloak'], cycle: 3.6 },
  '3-8': { type: 'carryCore', label: '코어 운반', behaviors: ['ordered', 'slowCarrier'], objective: 'ordered', count: 4 },
  '3-9': { type: 'timeRifts', label: '시간대 전환', behaviors: ['timeCycle', 'hazard'], cycle: 4.5, interval: 6.2, warning: 1.3 },
  '3-10': { type: 'tideCycles', label: '조수 안전지대', behaviors: ['force', 'safeZone'], force: 1.3, cycle: 5.2 },
  '4-1': { type: 'gravityRotation', label: '회전 중력', behaviors: ['force', 'hazard'], force: 1.8, cycle: 4, interval: 5.6, warning: 1.05 },
  '4-2': { type: 'livingMaze', label: '변형 미로', behaviors: ['ordered', 'shrink'], objective: 'ordered', count: 4, minArena: 9 },
  '4-3': { type: 'skillTax', label: '스킬 에너지 세금', behaviors: ['skillTax', 'capture'], objective: 'capture', count: 2, holdSeconds: 2.2 },
  '4-4': { type: 'rewireNodes', label: '장치 재배선', behaviors: ['capture', 'deviceBoost'], objective: 'capture', count: 4, holdSeconds: 2 },
  '4-5': { type: 'directionalWind', label: '탄도 역풍', behaviors: ['force', 'projectileCurve'], force: 1.7, cycle: 3.4 },
  '4-6': { type: 'formationArmor', label: '방어 진형', behaviors: ['links', 'rearArmor'] },
  '4-7': { type: 'lightPlatforms', label: '이동 광원', behaviors: ['safeZone', 'fog'], fog: 0.05 },
  '4-8': { type: 'rearCoreOnly', label: '후방 코어', behaviors: ['rearArmor', 'enemyCloak'], cycle: 3.1 },
  '4-9': { type: 'escortDrone', label: '호위 드론', behaviors: ['ordered', 'slowCarrier'], objective: 'ordered', count: 4 },
  '4-10': { type: 'airGroundShift', label: '비행·지상 변환', behaviors: ['phase', 'hazard'], cycle: 5.5, interval: 6, warning: 1.15 },
  '5-1': { type: 'replayGhosts', label: '이동 잔상', behaviors: ['delayedHazard'], interval: 3.8, warning: 1.8 },
  '5-2': { type: 'endlessDefense', label: '수면장 방어', behaviors: ['defense', 'safeZone'], duration: 28 },
  '5-3': { type: 'limitedAmmo', label: '제한 탄약', behaviors: ['limitedAmmo'], ammo: 22 },
  '5-4': { type: 'phaseToggle', label: '현실·공명상', behaviors: ['phase'], cycle: 4.4 },
  '5-5': { type: 'destructionChain', label: '연쇄 붕괴', behaviors: ['chain', 'hazard'], radius: 4.2, damage: 38, interval: 5.2, warning: 1.05 },
  '5-6': { type: 'multiEscort', label: '쌍둥이 구조선', behaviors: ['ordered', 'safeZone'], objective: 'ordered', count: 5 },
  '5-7': { type: 'damageTypeRotation', label: '내성 순환', behaviors: ['damageRotation'], cycle: 3.8 },
  '5-8': { type: 'totalDarkness', label: '총구 섬광 시야', behaviors: ['fog', 'revealOnShot'], fog: 0.082 },
  '5-9': { type: 'permanentPursuit', label: '연속 체크포인트', behaviors: ['ordered', 'hazard'], objective: 'ordered', count: 5, interval: 4.2, warning: 0.9 },
  '5-10': { type: 'finalRuleRemix', label: '종결 규칙 혼합', behaviors: ['phase', 'links', 'shrink', 'hazard'], cycle: 4.8, interval: 5, warning: 1, minArena: 8 }
};

export const stageMechanicRules = { ...chapterOneRules, ...extendedRules };

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
    this.behaviors = new Set(this.rule.behaviors ?? []);
    this.activeArenaLimit = 15;
    this.heat = 0;
    this.ammo = this.rule.ammo ?? Infinity;
    this.revealUntil = 0;
    this.lastCycle = -1;
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
    if (this.behaviors.has('fog')) this.world.scene.fog.density = this.rule.fog ?? 0.052;
    if (this.rule.objective && this.nodes.length === 0) {
      const count = this.rule.count ?? 3;
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        const radius = 7.2 + (index % 2) * 1.6;
        this.nodes.push(this.createNode(Math.cos(angle) * radius, Math.sin(angle) * radius, index));
      }
      this.total = count;
    }
    if (this.behaviors.has('safeZone') && this.nodes.length === 0) {
      this.nodes.push(this.createNode(0, 0, 0, '#8dffc2'));
      this.nodes[0].userData.safeZone = true;
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
    this.updateExtended(dt);
    this.updateZones(dt);
    this.animateNodes(dt);
  }

  updateExtended(dt) {
    if (this.rule.objective === 'capture') this.updateCapture(dt, true);
    if (this.rule.objective === 'ordered') this.updateCheckpoints(dt);

    if ((this.behaviors.has('hazard') || this.behaviors.has('delayedHazard')) && this.world.elapsed >= this.nextEventAt) {
      this.nextEventAt = this.world.elapsed + (this.rule.interval ?? 5.5);
      this.createFragileZone(this.world.player.position.clone());
    }

    if (this.behaviors.has('force')) {
      const cycle = this.rule.cycle ?? 4.5;
      const angle = this.rule.type.includes('gravity')
        ? (this.world.elapsed / cycle) * Math.PI * 2
        : Math.floor(this.world.elapsed / cycle) % 2 === 0 ? 0 : Math.PI;
      const grip = this.world.modifiers.terrainGrip ? 0.18 : 1;
      this.world.player.position.x += Math.cos(angle) * (this.rule.force ?? 1) * grip * dt;
      this.world.player.position.z += Math.sin(angle) * (this.rule.force ?? 1) * grip * dt;
    }

    if (this.behaviors.has('projectileCurve')) {
      const direction = Math.floor(this.world.elapsed / (this.rule.cycle ?? 4)) % 2 === 0 ? 1 : -1;
      for (const projectile of this.world.projectiles) {
        const x = projectile.velocity.x;
        projectile.velocity.x += -projectile.velocity.z * direction * dt * 0.42;
        projectile.velocity.z += x * direction * dt * 0.42;
      }
    }

    if (this.behaviors.has('reverse')) {
      const cycle = Math.floor(this.world.elapsed / (this.rule.cycle ?? 4.2));
      if (cycle !== this.lastCycle) {
        if (this.lastCycle >= 0) for (const projectile of this.world.projectiles) projectile.velocity.multiplyScalar(-0.78);
        this.lastCycle = cycle;
      }
    }

    if (this.behaviors.has('shrink')) {
      const progress = Math.min(1, this.world.elapsed / Math.max(30, this.world.stage.targetSeconds * 0.55));
      this.activeArenaLimit = 15 - (15 - (this.rule.minArena ?? 8)) * progress;
      this.world.activeArenaLimit = this.activeArenaLimit;
    }

    if (this.behaviors.has('safeZone')) this.updateSafeZone(dt);

    if (this.behaviors.has('overheat')) this.heat = Math.max(0, this.heat - (this.rule.coolRate ?? 0.14) * dt);
    if (this.behaviors.has('limitedAmmo') && this.ammo < 4) {
      this.nextAmmoAt ??= this.world.elapsed + 2.6;
      if (this.world.elapsed >= this.nextAmmoAt) {
        this.ammo += 1;
        this.nextAmmoAt = this.world.elapsed + 2.6;
      }
    }

    if (this.behaviors.has('revealOnShot')) {
      this.world.scene.fog.density += (((this.revealUntil > this.world.elapsed) ? 0.018 : (this.rule.fog ?? 0.065)) - this.world.scene.fog.density) * Math.min(1, dt * 4);
    }

    if (this.behaviors.has('phase')) {
      const phase = Math.floor(this.world.elapsed / (this.rule.cycle ?? 4.5)) % 2;
      for (const enemy of this.world.enemies) {
        if (enemy.dead || enemy.boss) continue;
        enemy.targetable = enemy.phase === phase;
        enemy.group.visible = enemy.targetable;
      }
    }

    if (this.behaviors.has('enemyCloak')) {
      const visibleBand = (this.world.elapsed % (this.rule.cycle ?? 3.4)) < 1.25;
      for (const enemy of this.world.enemies) {
        if (enemy.dead || enemy.boss) continue;
        enemy.targetable = visibleBand || enemy.brokenUntil > this.world.elapsed;
        enemy.body.material.transparent = true;
        enemy.body.material.opacity = enemy.targetable ? 0.9 : 0.12;
        enemy.core.visible = enemy.targetable;
      }
    }

    if (this.behaviors.has('timeCycle')) {
      const fast = Math.floor(this.world.elapsed / (this.rule.cycle ?? 4.5)) % 2 === 0;
      this.world.enemyTimeScale = fast ? 1.35 : 0.62;
    } else this.world.enemyTimeScale = 1;

    if (this.behaviors.has('slowCarrier')) {
      const nextNode = this.nodes[this.progress];
      this.world.mechanicMoveMultiplier = nextNode && nextNode.position.distanceTo(this.world.player.position) < 2.2 ? 0.72 : 1;
    } else this.world.mechanicMoveMultiplier = 1;
  }

  updateSafeZone(dt) {
    const node = this.nodes[0];
    if (!node) return;
    const radius = 5.8;
    const speed = 0.22 + this.world.stage.chapter * 0.025;
    node.position.x = Math.cos(this.world.elapsed * speed) * radius;
    node.position.z = Math.sin(this.world.elapsed * speed * 0.83) * radius;
    node.userData.ring.scale.setScalar(2.5);
    node.userData.beam.scale.y = 1.8;
    if (node.position.distanceTo(this.world.player.position) > 3.1) {
      this.safeDamageAt ??= 0;
      if (this.world.elapsed >= this.safeDamageAt) {
        this.world.damagePlayer(5 + this.world.stage.chapter, 'hazard', 0.45);
        this.safeDamageAt = this.world.elapsed + 0.55;
      }
    }
  }

  updateCapture(dt, requiresHold) {
    for (const node of this.nodes) {
      if (node.userData.captured) continue;
      const close = node.position.distanceTo(this.world.player.position) < 1.45;
      if (!close) {
        if (requiresHold) node.userData.hold = Math.max(0, node.userData.hold - dt * 0.45);
        continue;
      }
      node.userData.hold += dt * (1 + (this.world.modifiers.objectiveSpeed ?? 0));
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
    if (this.behaviors.has('shieldCycle')) {
      const open = (this.world.elapsed % (this.rule.cycle ?? 2.5)) < (this.rule.open ?? 0.8);
      if (!open) {
        result.hpMultiplier *= 0.22;
        result.breakMultiplier *= 1.35;
      }
    }
    if (this.behaviors.has('rearArmor') && !hit.weakPoint) result.hpMultiplier *= 0.28;
    if (this.behaviors.has('links') && this.world.enemies.some((candidate) => !candidate.dead && candidate !== enemy)) result.hpMultiplier *= enemy.boss ? 0.28 : 0.62;
    if (this.behaviors.has('weakpointSequence') && !hit.weakPoint) {
      result.hpMultiplier *= 0.18;
      result.breakMultiplier *= 1.28;
    }
    if (this.behaviors.has('ricochet') && hit.manual) result.hpMultiplier *= 1.3;
    if (this.behaviors.has('damageRotation')) {
      const damagePhase = Math.floor(this.world.elapsed / (this.rule.cycle ?? 3.8)) % 2 === 0;
      result.hpMultiplier *= damagePhase ? 1.3 : 0.42;
      result.breakMultiplier *= damagePhase ? 0.55 : 1.45;
    }
    if (this.damageBuffUntil > this.world.elapsed) result.hpMultiplier *= 1 + (this.rule.damageBuff ?? 0.1);
    return result;
  }

  onEnemyKilled(enemy) {
    if (this.behaviors.has('limitedAmmo')) this.ammo = Math.min(this.rule.ammo ?? 22, this.ammo + 4);
    if (this.rule.type === 'chainBreak' || this.behaviors.has('chain')) {
      this.world.pulse(enemy.group.position, '#ffd166', this.rule.radius);
      for (const target of this.world.enemies) {
        if (target.dead || target === enemy || target.group.position.distanceTo(enemy.group.position) > this.rule.radius) continue;
        target.hp -= this.rule.damage;
        target.break -= this.rule.damage * 0.55;
        if (target.hp <= 0) this.world.killEnemy(target);
      }
    }
  }

  isObjectiveComplete() {
    if (['capture', 'hiddenBeacons', 'splitNodes', 'checkpoints'].includes(this.rule.type)) return this.progress >= this.total;
    if (this.rule.type === 'forkRoute') return Boolean(this.route);
    if (this.rule.objective) return this.progress >= this.total;
    if (this.behaviors.has('defense')) return this.world.elapsed >= (this.rule.duration ?? 28);
    return true;
  }

  canShoot() {
    if (this.behaviors.has('overheat') && this.heat >= 0.98) return false;
    if (this.behaviors.has('limitedAmmo') && this.ammo <= 0) return false;
    return true;
  }

  onPlayerShot() {
    if (this.behaviors.has('overheat')) this.heat = Math.min(1.1, this.heat + 0.085 * (1 - (this.world.modifiers.heatControl ?? 0)));
    if (this.behaviors.has('limitedAmmo')) this.ammo = Math.max(0, this.ammo - 1);
    if (this.behaviors.has('revealOnShot')) this.revealUntil = this.world.elapsed + 0.34;
  }

  skillCooldownMultiplier() {
    return this.behaviors.has('skillTax') ? 1.35 : 1;
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
    if (this.rule.objective) return { label: this.rule.label, value: `${this.progress}/${this.total}`, complete: this.isObjectiveComplete() };
    if (this.behaviors.has('overheat')) return { label: this.rule.label, value: `${Math.round(this.heat * 100)}%`, complete: true };
    if (this.behaviors.has('limitedAmmo')) return { label: this.rule.label, value: `${this.ammo} AMMO`, complete: true };
    if (this.behaviors.has('defense')) return { label: this.rule.label, value: `${Math.min(this.rule.duration, Math.floor(this.world.elapsed))}/${this.rule.duration}s`, complete: this.isObjectiveComplete() };
    if (this.behaviors.has('phase')) return { label: this.rule.label, value: `PHASE ${Math.floor(this.world.elapsed / (this.rule.cycle ?? 4.5)) % 2 + 1}`, complete: true };
    if (this.behaviors.has('shrink')) return { label: this.rule.label, value: `${this.activeArenaLimit.toFixed(1)}m`, complete: true };
    return { label: this.rule.label, value: 'ACTIVE', complete: true };
  }
}
