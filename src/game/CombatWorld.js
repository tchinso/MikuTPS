import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { resolveEnemyArchetype } from '../data/enemies.js';
import { resolveCombatModifiers, resolveIncomingDamage, resolveShotModifiers } from './CombatModifiers.js';
import { CombatAudio } from './CombatAudio.js';
import { InputController } from './InputController.js';
import { StageMechanicDirector } from './StageMechanicDirector.js';

const FIXED_DT = 1 / 60;
const ARENA_LIMIT = 15;

export class CombatWorld {
  constructor({ root, stage, character, settings, loadout, ownedEquipment, onHud, onComplete, onExit }) {
    this.root = root;
    this.stage = stage;
    this.character = character;
    this.settings = settings;
    this.modifiers = resolveCombatModifiers(character, loadout, ownedEquipment);
    this.onHud = onHud;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.clock = new THREE.Clock();
    this.accumulator = 0;
    this.elapsed = 0;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.lastShot = 0;
    this.skillReadyAt = 0;
    this.dodgeReadyAt = 0;
    this.running = true;
    this.audio = new CombatAudio(settings.audio);
    this.renderFreezeFrames = 0;
    this.cameraShake = 0;
    this.projectiles = [];
    this.enemies = [];
    this.effects = [];
    this.telegraphs = [];
    this.currentWave = 0;
    this.wavePending = false;
    this.stats = { shots: 0, hits: 0, damageTaken: 0, breaks: 0 };
    this.characterState = { shotCounter: 0, cleanseUntil: 0 };
  }

  async mount() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#07131a');
    this.scene.fog = new THREE.FogExp2('#07131a', 0.022);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 90);
    this.camera.position.set(0, 15, 13);
    this.camera.lookAt(0, 0, 0);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    const dpr = this.settings.quality === 'low' ? 1 : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = this.settings.quality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'combat-canvas';
    this.root.prepend(this.renderer.domElement);

    this.buildArena();
    await this.buildPlayer();
    this.mechanics = new StageMechanicDirector(this);
    this.spawnWave();
    this.input = new InputController(this.root, {
      dodge: () => this.dodge(),
      skill: () => this.castSkill(),
      pause: () => this.onExit?.(),
      activity: () => this.audio.unlock()
    });
    this.input.mount();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.root);
    this.resize();
    this.animate();
  }

  buildArena() {
    this.scene.add(new THREE.HemisphereLight('#9fffee', '#07131a', 2.1));
    const key = new THREE.DirectionalLight('#b9e8ff', 2.4);
    key.position.set(-7, 13, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ARENA_LIMIT + 1, 64),
      new THREE.MeshStandardMaterial({ color: '#0d2630', roughness: 0.86, metalness: 0.15 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const grid = new THREE.GridHelper(ARENA_LIMIT * 2, 30, this.stage.color, '#16343b');
    grid.position.y = 0.012;
    this.scene.add(grid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(ARENA_LIMIT - 0.14, ARENA_LIMIT, 80),
      new THREE.MeshBasicMaterial({ color: this.stage.color, transparent: true, opacity: 0.68, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    this.scene.add(ring);

    this.hazard = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.46, 48),
      new THREE.MeshBasicMaterial({ color: '#ff4f86', transparent: true, opacity: 0.0, side: THREE.DoubleSide })
    );
    this.hazard.rotation.x = -Math.PI / 2;
    this.hazard.position.set(5, 0.04, -2);
    this.scene.add(this.hazard);

    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * Math.PI * 2 + 0.35;
      const obstacle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.95, 2.2, 6),
        new THREE.MeshStandardMaterial({ color: '#183e48', emissive: '#0a242c', metalness: 0.6, roughness: 0.4 })
      );
      obstacle.position.set(Math.cos(angle) * 9.5, 1.1, Math.sin(angle) * 9.5);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      this.scene.add(obstacle);
    }
  }

  async buildPlayer() {
    this.player = {
      position: new THREE.Vector3(0, 0, 5),
      hp: this.modifiers.maxHp,
      maxHp: this.modifiers.maxHp,
      invulnerableUntil: 0,
      model: new THREE.Group()
    };
    this.scene.add(this.player.model);
    const loader = new GLTFLoader();
    try {
      const gltf = await loader.loadAsync(this.character.asset);
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.4 / Math.max(0.01, size.y);
      model.scale.setScalar(scale);
      box.setFromObject(model);
      model.position.y -= box.min.y;
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.frustumCulled = true;
        }
      });
      this.player.model.add(model);
      this.player.visual = model;
      this.player.visualBaseY = model.position.y;
      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }
    } catch (error) {
      console.warn('Character asset fallback:', error);
      const fallback = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 1.1, 6, 12),
        new THREE.MeshStandardMaterial({ color: '#53f6d6', emissive: '#153f3c' })
      );
      fallback.position.y = 1;
      this.player.model.add(fallback);
      this.player.visual = fallback;
      this.player.visualBaseY = fallback.position.y;
    }
    this.player.model.position.copy(this.player.position);

    const aimRing = new THREE.Mesh(
      new THREE.RingGeometry(0.58, 0.7, 32),
      new THREE.MeshBasicMaterial({ color: '#53f6d6', transparent: true, opacity: 0.8, side: THREE.DoubleSide })
    );
    aimRing.rotation.x = -Math.PI / 2;
    aimRing.position.y = 0.035;
    this.player.model.add(aimRing);
  }

  spawnWave() {
    this.currentWave += 1;
    this.wavePending = false;
    const finalBossWave = this.stage.boss && this.currentWave === this.stage.waves;
    const count = finalBossWave ? 3 : Math.min(10, this.stage.enemyCount + Math.floor(this.currentWave / 2));
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + 0.5;
      const radius = 8.5 + (i % 3) * 1.7;
      this.createEnemy(Math.cos(angle) * radius, Math.sin(angle) * radius, finalBossWave && i === 0, i);
    }
  }

  createEnemy(x, z, boss = false, seed = 0) {
    const archetype = resolveEnemyArchetype(this.stage.enemyTheme, seed, boss);
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      this.createEnemyGeometry(archetype),
      new THREE.MeshStandardMaterial({ color: archetype.color, emissive: archetype.emissive, metalness: 0.45, roughness: 0.32, transparent: archetype.trait === 'cloak' })
    );
    body.position.y = boss ? 1.6 : 0.85;
    body.castShadow = true;
    group.add(body);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(boss ? 0.35 : 0.2, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#fff2a6' })
    );
    core.position.set(0, boss ? 1.6 : 0.85, boss ? 1.18 : 0.55);
    group.add(core);
    group.position.set(x, 0, z);
    this.scene.add(group);
    const baseHp = boss ? 130 + this.stage.index * 5 : 86 + this.stage.chapter * 18 + this.currentWave * 8;
    const hp = baseHp * archetype.hp;
    const breakValue = (boss ? 58 : 55) * archetype.break;
    this.enemies.push({
      group, body, core, archetype, hp, maxHp: hp, break: breakValue, maxBreak: breakValue,
      brokenUntil: 0, speed: (boss ? 1.7 : 2.05) * archetype.speed,
      nextShot: this.elapsed + (this.stage.chapter === 1 ? 3.4 : 2.2) + (seed % 5) * 0.42 + Math.random() * 0.35,
      nextSpecial: boss ? this.elapsed + 4.5 : Infinity, dead: false, boss, targetable: true, orbit: Math.random() > 0.5 ? 1 : -1
    });
  }

  createEnemyGeometry(archetype) {
    const size = archetype.id === 'boss' ? 1.3 : archetype.id === 'brute' ? 0.82 : 0.62;
    if (archetype.shape === 'box') return new THREE.BoxGeometry(size * 1.45, size * 1.45, size * 1.2);
    if (archetype.shape === 'tetrahedron') return new THREE.TetrahedronGeometry(size, 0);
    if (archetype.shape === 'octahedron' || archetype.shape === 'boss') return new THREE.OctahedronGeometry(size, archetype.shape === 'boss' ? 1 : 0);
    if (archetype.shape === 'dodecahedron') return new THREE.DodecahedronGeometry(size, 0);
    if (archetype.shape === 'cylinder') return new THREE.CylinderGeometry(size * 0.75, size, size * 1.6, 8);
    if (archetype.shape === 'cone') return new THREE.ConeGeometry(size, size * 1.7, 7);
    if (archetype.shape === 'capsule') return new THREE.CapsuleGeometry(size * 0.52, size, 4, 8);
    return new THREE.IcosahedronGeometry(size, 1);
  }

  animate = () => {
    if (!this.running) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT) {
      this.simulate(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    this.mixer?.update(dt);
    if (this.renderFreezeFrames > 0) this.renderFreezeFrames -= 1;
    else this.render(dt);
  };

  simulate(dt) {
    this.elapsed += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.movePlayer(dt);
    this.mechanics.update(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateTelegraphs(dt);
    this.updateHazard(dt);
    if ((this.settings.autoFire || this.input.firing || this.input.keys.has('KeyJ')) && this.elapsed >= this.lastShot) this.shoot();
    if (this.enemies.every((enemy) => enemy.dead) && this.mechanics.isObjectiveComplete()) {
      if (this.currentWave < this.stage.waves) {
        if (!this.wavePending) {
          this.wavePending = true;
          this.waveReadyAt = this.elapsed + 2.4;
          this.score += 350;
        } else if (this.elapsed >= this.waveReadyAt) this.spawnWave();
      } else this.finish();
    }
  }

  movePlayer(dt) {
    const move = this.input.move;
    const speed = this.modifiers.moveSpeed * (this.elapsed < this.player.dodgeUntil ? 2.5 : 1);
    this.player.position.x += move.x * speed * dt;
    this.player.position.z += move.y * speed * dt;
    const radius = Math.hypot(this.player.position.x, this.player.position.z);
    if (radius > ARENA_LIMIT - 0.7) this.player.position.multiplyScalar((ARENA_LIMIT - 0.7) / radius);
    this.player.model.position.copy(this.player.position);
    if (Math.hypot(move.x, move.y) > 0.1) this.player.model.rotation.y = Math.atan2(move.x, move.y);
  }

  nearestEnemy() {
    let nearest = null;
    let distance = Infinity;
    for (const enemy of this.enemies) {
      if (enemy.dead || !enemy.targetable) continue;
      const current = enemy.group.position.distanceToSquared(this.player.position);
      if (current < distance) {
        nearest = enemy;
        distance = current;
      }
    }
    return nearest;
  }

  shoot() {
    const autoOnly = this.settings.autoFire && !this.input.firing && !this.input.keys.has('KeyJ');
    this.lastShot = this.elapsed + 1 / (this.modifiers.fireRate * (autoOnly ? 0.55 : 1));
    const target = this.nearestEnemy();
    if (!target) return;
    this.stats.shots += 1;
    const distance = target.group.position.distanceTo(this.player.position);
    if (distance > this.modifiers.range) return;
    const aimDirection = new THREE.Vector3(this.input.aim.x, 0, this.input.aim.y).normalize();
    const targetDirection = target.group.position.clone().sub(this.player.position).setY(0).normalize();
    const manual = this.input.aimActive;
    const alignment = manual ? aimDirection.dot(targetDirection) : 1;
    if (alignment < 0.2 - this.settings.aimAssist * 0.35) return;

    const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const end = target.group.position.clone().add(new THREE.Vector3(0, target.boss ? 1.6 : 0.85, 0));
    this.createTracer(origin, end);
    this.audio.play('shot');
    const weakPoint = manual && alignment > 0.92;
    const broken = target.brokenUntil > this.elapsed;
    const gearHit = resolveShotModifiers(this.modifiers, this.elapsed, manual);
    const mechanicHit = this.mechanics.modifyHit(target, { weakPoint, manual });
    const armorDamage = target.archetype.trait === 'frontArmor' && !weakPoint ? 0.34 : 1;
    const armorBreak = target.archetype.trait === 'frontArmor' && !weakPoint ? 1.28 : 1;
    const markMultiplier = target.markedUntil > this.elapsed ? 1.12 : 1;
    const damage = this.modifiers.damage * (weakPoint ? 1.35 : 1) * (broken ? 2.2 : 1) * gearHit.damageMultiplier * mechanicHit.hpMultiplier * armorDamage * markMultiplier;
    const breakDamage = this.modifiers.breakDamage * (weakPoint ? 1.2 : 1) * gearHit.breakMultiplier * mechanicHit.breakMultiplier * armorBreak;
    target.hp -= damage;
    target.break -= breakDamage;
    this.applyCharacterShotEffect(target, { damage, breakDamage, weakPoint });
    this.stats.hits += 1;
    this.combo += 1;
    this.comboTimer = 1.4;
    this.score += Math.round(damage * 8 + this.combo * 2 + (weakPoint ? 50 : 0));
    this.flashEnemy(target, weakPoint ? '#fff2a6' : '#ffffff');
    this.audio.play(weakPoint ? 'weak' : 'hit');
    if (weakPoint) {
      this.renderFreezeFrames = Math.max(this.renderFreezeFrames, 1);
      this.cameraShake = Math.max(this.cameraShake, 0.08);
    }
    if (target.break <= 0 && target.brokenUntil <= this.elapsed) {
      target.brokenUntil = this.elapsed + 3.6;
      target.break = target.maxBreak;
      this.stats.breaks += 1;
      this.score += 500;
      this.pulse(target.group.position, '#53f6d6', 2.6);
      this.root.classList.add('break-hit');
      this.audio.play('break');
      this.renderFreezeFrames = Math.max(this.renderFreezeFrames, 2);
      this.cameraShake = Math.max(this.cameraShake, 0.3);
      setTimeout(() => this.root.classList.remove('break-hit'), 90);
      if (this.settings.haptics) navigator.vibrate?.(35);
    }
    if (target.hp <= 0) this.killEnemy(target);
  }

  applyCharacterShotEffect(target, hit) {
    this.characterState.shotCounter += 1;
    if (this.character.id === 'miku' && this.characterState.shotCounter % 8 === 0) {
      let chainTarget = null;
      let distance = Infinity;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy === target || !enemy.targetable) continue;
        const nextDistance = enemy.group.position.distanceToSquared(target.group.position);
        if (nextDistance < distance && nextDistance < 36) {
          chainTarget = enemy;
          distance = nextDistance;
        }
      }
      if (chainTarget) {
        const chainDamage = hit.damage * 0.55;
        chainTarget.hp -= chainDamage;
        chainTarget.break -= hit.breakDamage * 0.35;
        this.createTracer(target.group.position.clone().setY(0.9), chainTarget.group.position.clone().setY(0.9));
        this.score += Math.round(chainDamage * 5);
        if (chainTarget.hp <= 0) this.killEnemy(chainTarget);
      }
    }
    if (this.character.id === 'nari') {
      target.markedUntil = this.elapsed + 5;
      target.core.material.color.set('#53f6d6');
    }
    if (this.character.id === 'bibi') {
      this.pulse(target.group.position, '#ffd166', 2.4);
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy === target || enemy.group.position.distanceTo(target.group.position) > 2.8) continue;
        enemy.hp -= hit.damage * 0.58;
        enemy.break -= hit.breakDamage * 0.42;
        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }
    if (this.character.id === 'serin' && this.characterState.shotCounter % 12 === 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2.5);
    }
  }

  createTracer(start, end) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#9ffff1', transparent: true, opacity: 0.9 }));
    this.scene.add(line);
    this.effects.push({ object: line, life: 0.08, maxLife: 0.08 });
  }

  flashEnemy(enemy, color) {
    const original = enemy.body.material.emissive.getHex();
    enemy.body.material.emissive.set(color);
    setTimeout(() => enemy.body?.material?.emissive?.setHex(original), 55);
  }

  pulse(position, color, size = 1.8) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.33, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(0.08);
    ring.userData.targetScale = size;
    this.scene.add(ring);
    this.effects.push({ object: ring, life: 0.45, maxLife: 0.45, pulse: true });
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    this.score += enemy.boss ? 2200 : 220;
    this.pulse(enemy.group.position, enemy.boss ? '#ff4f86' : '#ffb26b', enemy.boss ? 4 : 1.8);
    this.audio.play('kill');
    enemy.group.visible = false;
    this.mechanics.onEnemyKilled(enemy);
  }

  updateEnemies(dt) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.group.rotation.y += dt * enemy.orbit;
      if (enemy.archetype.trait === 'cloak') {
        const visible = (this.elapsed + enemy.group.id * 0.07) % 3.6 < 1.55 || enemy.brokenUntil > this.elapsed;
        enemy.targetable = visible;
        enemy.body.material.opacity += ((visible ? 0.92 : 0.12) - enemy.body.material.opacity) * Math.min(1, dt * 7);
        enemy.core.visible = visible;
      }
      if (enemy.brokenUntil > this.elapsed) {
        enemy.group.position.y = Math.sin(this.elapsed * 18) * 0.08;
        continue;
      }
      enemy.group.position.y = 0;
      const toPlayer = this.player.position.clone().sub(enemy.group.position).setY(0);
      const distance = toPlayer.length();
      const ideal = enemy.archetype.preferredRange;
      if (enemy.archetype.trait === 'stationary') {
        // Turrets trade mobility for pressure.
      } else if (enemy.archetype.trait === 'kite' && distance < ideal) {
        enemy.group.position.addScaledVector(toPlayer.normalize(), -enemy.speed * dt);
      } else if (distance > ideal) enemy.group.position.addScaledVector(toPlayer.normalize(), enemy.speed * dt);
      else {
        const tangent = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        enemy.group.position.addScaledVector(tangent, enemy.speed * 0.5 * enemy.orbit * dt);
      }
      const projectileBudget = 2 + this.stage.chapter;
      if (this.elapsed >= enemy.nextShot && distance < 15 && this.projectiles.length < projectileBudget) {
        this.enemyShoot(enemy);
        enemy.nextShot = this.elapsed + enemy.archetype.fireInterval + Math.random() * 0.65;
      }
      if (enemy.boss && this.elapsed >= enemy.nextSpecial) {
        this.startBossTelegraph(enemy);
        enemy.nextSpecial = this.elapsed + 6.2;
      }
    }
  }

  enemyShoot(enemy) {
    const start = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.boss ? 1.6 : 0.8, 0));
    const direction = this.player.position.clone().sub(enemy.group.position).setY(0.1).normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(enemy.boss ? 0.2 : 0.13, 10, 8),
      new THREE.MeshBasicMaterial({ color: enemy.archetype.color })
    );
    mesh.position.copy(start);
    this.scene.add(mesh);
    const baseDamage = (3 + this.stage.chapter) * enemy.archetype.damage;
    this.projectiles.push({ mesh, velocity: direction.multiplyScalar(enemy.archetype.projectileSpeed), life: 4, damage: baseDamage });
  }

  startBossTelegraph(enemy) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.28, 48),
      new THREE.MeshBasicMaterial({ color: '#ff4f86', transparent: true, opacity: 0.72, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(this.player.position).setY(0.07);
    this.scene.add(mesh);
    this.telegraphs.push({ mesh, enemy, remaining: 1.35, duration: 1.35, radius: 2.7 });
  }

  updateTelegraphs(dt) {
    for (let index = this.telegraphs.length - 1; index >= 0; index -= 1) {
      const telegraph = this.telegraphs[index];
      telegraph.remaining -= dt;
      const progress = 1 - telegraph.remaining / telegraph.duration;
      telegraph.mesh.scale.setScalar(1 + progress * telegraph.radius * 3.2);
      telegraph.mesh.material.opacity = 0.25 + Math.sin(this.elapsed * 18) * 0.18;
      if (telegraph.remaining > 0) continue;
      const interrupted = telegraph.enemy.dead || telegraph.enemy.brokenUntil > this.elapsed;
      if (!interrupted) {
        this.pulse(telegraph.mesh.position, '#ff4f86', telegraph.radius * 1.6);
        if (telegraph.mesh.position.distanceTo(this.player.position) < telegraph.radius) this.damagePlayer(22, 'hazard');
      } else this.score += 240;
      this.scene.remove(telegraph.mesh);
      telegraph.mesh.geometry.dispose();
      telegraph.mesh.material.dispose();
      this.telegraphs.splice(index, 1);
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.life -= dt;
      if (projectile.mesh.position.distanceToSquared(this.player.position.clone().setY(0.7)) < 0.55 && this.elapsed > this.player.invulnerableUntil) {
        this.damagePlayer(projectile.damage, 'projectile');
        this.removeProjectile(i);
      } else if (projectile.life <= 0) this.removeProjectile(i);
    }
  }

  removeProjectile(index) {
    const [projectile] = this.projectiles.splice(index, 1);
    this.scene.remove(projectile.mesh);
    projectile.mesh.geometry.dispose();
    projectile.mesh.material.dispose();
  }

  updateHazard(dt) {
    if (this.stage.chapter === 1) {
      this.hazard.material.opacity = 0;
      return;
    }
    const cycle = this.elapsed % 8;
    const warning = cycle > 5;
    const active = cycle > 7;
    const radius = 1.2 + Math.max(0, cycle - 5) * 1.6;
    this.hazard.scale.setScalar(radius);
    this.hazard.material.opacity = warning ? (active ? 0.75 : 0.22 + Math.sin(this.elapsed * 10) * 0.12) : 0;
    if (active && this.player.position.distanceTo(this.hazard.position) < radius * 0.45 && this.elapsed > this.player.invulnerableUntil) {
      this.damagePlayer(16 * dt, 'hazard', 0.08);
    }
  }

  damagePlayer(amount, type = 'projectile', invulnerability = 0.35) {
    if (!this.running || this.elapsed <= this.player.invulnerableUntil) return 0;
    const cleanseMultiplier = type === 'hazard' && this.characterState.cleanseUntil > this.elapsed ? 0.4 : 1;
    const damage = resolveIncomingDamage(amount * cleanseMultiplier, this.modifiers, {
      type,
      moveStrength: Math.hypot(this.input?.move.x ?? 0, this.input?.move.y ?? 0)
    });
    this.player.hp = Math.max(0, this.player.hp - damage);
    this.stats.damageTaken += damage;
    this.player.invulnerableUntil = this.elapsed + invulnerability;
    this.root.classList.add('player-hit');
    this.audio.play('hurt');
    this.cameraShake = Math.max(this.cameraShake, 0.22);
    setTimeout(() => this.root.classList.remove('player-hit'), 110);
    if (this.player.hp <= 0) this.finish(false);
    return damage;
  }

  render(dt) {
    const target = this.player.position.clone();
    const desiredCamera = target.clone().add(new THREE.Vector3(0, 14.5, 12.5));
    if (this.cameraShake > 0.002 && this.settings.screenShake > 0) {
      const strength = this.cameraShake * this.settings.screenShake;
      desiredCamera.x += (Math.random() - 0.5) * strength;
      desiredCamera.y += (Math.random() - 0.5) * strength * 0.5;
      desiredCamera.z += (Math.random() - 0.5) * strength;
      this.cameraShake *= Math.pow(0.02, dt);
    }
    this.camera.position.lerp(desiredCamera, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(target.x, 0.4, target.z - 1.5);
    if (this.player.visual) {
      const moving = Math.hypot(this.input.move.x, this.input.move.y);
      const bob = moving > 0.08 ? Math.sin(this.elapsed * 10) * 0.045 : Math.sin(this.elapsed * 2.5) * 0.018;
      this.player.visual.position.y += (this.player.visualBaseY + bob - this.player.visual.position.y) * Math.min(1, dt * 12);
      this.player.visual.rotation.z += ((-this.input.move.x * 0.08) - this.player.visual.rotation.z) * Math.min(1, dt * 10);
    }
    for (let i = this.effects.length - 1; i >= 0; i -= 1) {
      const effect = this.effects[i];
      effect.life -= dt;
      effect.object.material.opacity = Math.max(0, effect.life / effect.maxLife);
      if (effect.pulse) effect.object.scale.setScalar(1 + (1 - effect.life / effect.maxLife) * effect.object.userData.targetScale);
      if (effect.life <= 0) {
        this.scene.remove(effect.object);
        effect.object.geometry.dispose();
        effect.object.material.dispose();
        this.effects.splice(i, 1);
      }
    }
    this.renderer.render(this.scene, this.camera);
    this.onHud?.({
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      score: this.score,
      combo: this.combo,
      elapsed: this.elapsed,
      remaining: this.enemies.filter((enemy) => !enemy.dead).length,
      wave: this.currentWave,
      totalWaves: this.stage.waves,
      mechanic: this.mechanics.hud(),
      skillCooldown: Math.max(0, this.skillReadyAt - this.elapsed),
      dodgeCooldown: Math.max(0, this.dodgeReadyAt - this.elapsed)
    });
  }

  dodge() {
    if (this.elapsed < this.dodgeReadyAt) return;
    this.dodgeReadyAt = this.elapsed + 2.4 * this.modifiers.dodgeCooldown;
    this.player.invulnerableUntil = this.elapsed + (this.modifiers.perfectDodge ? 0.48 : 0.38);
    this.player.dodgeUntil = this.elapsed + 0.24 * this.modifiers.dodgeDistance;
    this.pulse(this.player.position, '#a1fbe8', 1.2);
    this.audio.play('dodge');
    if (this.modifiers.dodgeKnockback) {
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.group.position.distanceTo(this.player.position) > 3) continue;
        const away = enemy.group.position.clone().sub(this.player.position).setY(0).normalize();
        enemy.group.position.addScaledVector(away, 1.5);
      }
    }
  }

  castSkill() {
    if (this.elapsed < this.skillReadyAt) return;
    this.skillReadyAt = this.elapsed + this.character.skill.cooldown * (1 + (this.modifiers.normalCooldown ?? 0));
    this.audio.play('skill');
    if (this.character.id === 'nari') {
      this.mechanics.assistObjective();
      this.pulse(this.player.position, '#5fb8ff', 7);
      for (const enemy of this.enemies) if (!enemy.dead) enemy.markedUntil = this.elapsed + 6;
      this.score += 360;
      return;
    }
    if (this.character.id === 'serin') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 36 * this.modifiers.skillPower);
      this.characterState.cleanseUntil = this.elapsed + 5.5;
      this.pulse(this.player.position, '#8dffc2', 5.2);
      this.score += 220;
      return;
    }
    const bibi = this.character.id === 'bibi';
    this.pulse(this.player.position, bibi ? '#ffd166' : '#53f6d6', bibi ? 7.5 : 5.5);
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.group.position.distanceTo(this.player.position) > (bibi ? 8 : 7)) continue;
      enemy.break -= (bibi ? 46 : 32) * this.modifiers.skillPower;
      enemy.hp -= (bibi ? 30 : 18) * this.modifiers.skillPower;
      if (bibi) {
        const towardPlayer = this.player.position.clone().sub(enemy.group.position).setY(0).normalize();
        enemy.group.position.addScaledVector(towardPlayer, 1.6);
      }
      this.score += 120;
      if (enemy.break <= 0) {
        enemy.break = enemy.maxBreak;
        enemy.brokenUntil = this.elapsed + 3.6;
        this.stats.breaks += 1;
      }
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  calculateRank() {
    if (this.score >= this.stage.scoreTargets.gold) return 'gold';
    if (this.score >= this.stage.scoreTargets.silver) return 'silver';
    return 'bronze';
  }

  finish(success = true) {
    if (!this.running) return;
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    const accuracy = this.stats.shots ? this.stats.hits / this.stats.shots : 0;
    if (success) this.score += Math.max(0, Math.round((this.stage.targetSeconds - this.elapsed) * 25)) + Math.round(accuracy * 800);
    this.onComplete?.({
      success,
      score: Math.max(0, Math.round(this.score)),
      rank: success ? this.calculateRank() : 'failed',
      elapsed: this.elapsed,
      characterId: this.character.id,
      stats: { ...this.stats, accuracy }
    });
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.root;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.input?.destroy();
    this.audio?.destroy();
    this.resizeObserver?.disconnect();
    this.scene?.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
