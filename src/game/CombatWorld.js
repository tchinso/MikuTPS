import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { resolveEnemyArchetype } from '../data/enemies.js';
import { resolveCombatModifiers, resolveIncomingDamage, resolveShotModifiers } from './CombatModifiers.js';
import { CombatAudio } from './CombatAudio.js';
import { createQualityState, resolveQualityConfig, sampleAdaptiveQuality } from './AdaptiveQuality.js';
import { BOSS_PHASES, resolveBossPhase, resolveBossTelegraphOffsets, resolveBossVolleyAngles } from './BossStateMachine.js';
import { InputController } from './InputController.js';
import { ObjectPool } from './ObjectPool.js';
import { StageMechanicDirector } from './StageMechanicDirector.js';

const FIXED_DT = 1 / 60;
const ARENA_LIMIT = 15;

export class CombatWorld {
  constructor({ root, stage, character, settings, loadout, ownedEquipment, onHud, onComplete, onExit, onFullscreen }) {
    this.root = root;
    this.stage = stage;
    this.character = character;
    this.settings = settings;
    this.modifiers = resolveCombatModifiers(character, loadout, ownedEquipment);
    this.onHud = onHud;
    this.onComplete = onComplete;
    this.onExit = onExit;
    this.onFullscreen = onFullscreen;
    this.clock = new THREE.Clock();
    this.accumulator = 0;
    this.renderAccumulator = 0;
    this.qualityState = createQualityState(settings.quality);
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
    this.activeArenaLimit = ARENA_LIMIT;
    this.enemyTimeScale = 1;
    this.mechanicMoveMultiplier = 1;
    this.projectiles = [];
    this.playerProjectiles = [];
    this.playerFields = [];
    this.enemies = [];
    this.effects = [];
    this.telegraphs = [];
    this.bossCastCounter = 0;
    this.currentWave = 0;
    this.wavePending = false;
    this.stats = { shots: 0, hits: 0, damageTaken: 0, breaks: 0, mechanicActions: 0 };
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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.applyRendererQuality(false);
    this.renderer.domElement.className = 'combat-canvas';
    this.root.prepend(this.renderer.domElement);

    this.setupRuntimePools();
    this.buildArena();
    await this.buildPlayer();
    this.mechanics = new StageMechanicDirector(this);
    this.spawnWave();
    this.input = new InputController(this.root, {
      dodge: () => this.dodge(),
      skill: () => this.castSkill(),
      pause: () => this.onExit?.(),
      fullscreen: () => this.onFullscreen?.(),
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

  setupRuntimePools() {
    const disposeObject = (object) => {
      this.scene?.remove(object);
      object.geometry?.dispose?.();
      object.material?.dispose?.();
    };
    const meshPool = ({ geometry, material, maxRetained }) => new ObjectPool({
      create: () => {
        const mesh = new THREE.Mesh(geometry(), material());
        mesh.userData.pooled = true;
        return mesh;
      },
      activate: (mesh) => {
        mesh.visible = true;
        this.scene.add(mesh);
      },
      reset: (mesh) => {
        this.scene.remove(mesh);
        mesh.visible = false;
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.setScalar(1);
      },
      dispose: disposeObject,
      maxRetained
    });
    this.pools = {
      tracer: new ObjectPool({
        create: () => {
          const positions = new Float32Array(6);
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#9ffff1', transparent: true, opacity: 0.9 }));
          line.frustumCulled = false;
          line.userData.pooled = true;
          return line;
        },
        activate: (line) => {
          line.visible = true;
          line.material.opacity = 0.9;
          this.scene.add(line);
        },
        reset: (line) => {
          this.scene.remove(line);
          line.visible = false;
        },
        dispose: disposeObject,
        maxRetained: 24
      }),
      pulse: meshPool({
        geometry: () => new THREE.RingGeometry(0.2, 0.33, 32),
        material: () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
        maxRetained: 24
      }),
      enemyProjectile: meshPool({
        geometry: () => new THREE.SphereGeometry(0.2, 10, 8),
        material: () => new THREE.MeshBasicMaterial(),
        maxRetained: 16
      }),
      playerProjectile: meshPool({
        geometry: () => new THREE.SphereGeometry(0.22, 12, 8),
        material: () => new THREE.MeshBasicMaterial(),
        maxRetained: 10
      }),
      telegraph: meshPool({
        geometry: () => new THREE.RingGeometry(0.15, 0.28, 48),
        material: () => new THREE.MeshBasicMaterial({ color: '#ff4f86', transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
        maxRetained: 10
      })
    };
  }

  async buildPlayer() {
    this.player = {
      position: new THREE.Vector3(0, 0, 5),
      hp: this.modifiers.maxHp,
      maxHp: this.modifiers.maxHp,
      shield: 0,
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
      nextSpecial: boss ? this.elapsed + 4.5 : Infinity, phase: boss ? 1 : seed % 2,
      dead: false, boss, targetable: true, orbit: Math.random() > 0.5 ? 1 : -1
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
    const renderInterval = this.qualityConfig.renderFps === 30 ? 1 / 30 : 0;
    this.renderAccumulator += dt;
    const renderDue = renderInterval === 0 || this.renderAccumulator + 1 / 240 >= renderInterval;
    let rendered = false;
    if (this.renderFreezeFrames > 0) this.renderFreezeFrames -= 1;
    else if (renderDue) {
      this.render(dt);
      rendered = true;
      this.renderAccumulator = renderInterval ? this.renderAccumulator % renderInterval : 0;
    }
    const qualitySample = sampleAdaptiveQuality(this.qualityState, dt, rendered);
    this.qualityState = qualitySample.state;
    if (qualitySample.changed) this.applyRendererQuality();
  };

  simulate(dt) {
    this.elapsed += dt;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) this.combo = 0;
    this.movePlayer(dt);
    this.updateEquipmentShield(dt);
    this.mechanics.update(dt);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updatePlayerProjectiles(dt);
    this.updatePlayerFields(dt);
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
    const moveStrength = Math.hypot(move.x, move.y);
    let gearMove = 1 + (this.modifiers.combatMoveSpeed ?? 0) + (this.modifiers.sprintSpeed ?? 0);
    if (this.input.firing || this.input.keys.has('KeyJ')) gearMove += this.modifiers.moveSpeedWhileFiring ?? 0;
    const speed = this.modifiers.moveSpeed * Math.max(0.3, gearMove) * this.mechanicMoveMultiplier * (this.elapsed < this.player.dodgeUntil ? 2.5 : 1);
    this.player.position.x += move.x * speed * dt;
    this.player.position.z += move.y * speed * dt;
    const radius = Math.hypot(this.player.position.x, this.player.position.z);
    if (radius > this.activeArenaLimit - 0.7) this.player.position.multiplyScalar((this.activeArenaLimit - 0.7) / radius);
    this.player.model.position.copy(this.player.position);
    if (moveStrength > 0.1) this.player.model.rotation.y = Math.atan2(move.x, move.y);
  }

  updateEquipmentShield(dt) {
    if (!this.modifiers.stationaryShield) return;
    const stationary = Math.hypot(this.input.move.x, this.input.move.y) < 0.1;
    const target = stationary ? this.modifiers.stationaryShield : 0;
    const rate = stationary ? Math.max(5, this.modifiers.stationaryShield * 0.32) : 15;
    this.player.shield += Math.sign(target - this.player.shield) * Math.min(Math.abs(target - this.player.shield), rate * dt);
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
    if (!this.mechanics.canShoot()) {
      this.lastShot = this.elapsed + 0.12;
      return;
    }
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
    const homingAllowance = this.modifiers.homing ? 0.55 : 0;
    if (alignment < 0.2 - this.settings.aimAssist * 0.35 - homingAllowance) return;

    const origin = this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    const end = target.group.position.clone().add(new THREE.Vector3(0, target.boss ? 1.6 : 0.85, 0));
    this.mechanics.onPlayerShot();
    this.audio.play('shot');
    const hit = this.calculatePlayerHit(target, manual, alignment);
    if (['projectile', 'fieldProjectile'].includes(this.character.combatProfile.fireModel)) {
      this.launchPlayerProjectile(origin, target, hit);
      return;
    }
    this.createTracer(origin, end);
    this.applyResolvedHit(target, hit, true);
  }

  calculatePlayerHit(target, manual, alignment = 1) {
    let weakPoint = manual && alignment > 0.92;
    if (this.character.id === 'roa' && target.surveyUntil > this.elapsed) weakPoint = true;
    const broken = target.brokenUntil > this.elapsed;
    const gearHit = resolveShotModifiers(this.modifiers, this.elapsed, manual);
    const mechanicHit = this.mechanics.modifyHit(target, { weakPoint, manual });
    const armorDamage = target.archetype.trait === 'frontArmor' && !weakPoint ? 0.34 * Math.max(0.1, 1 + (this.modifiers.armorDamage ?? 0)) : 1;
    const armorBreak = target.archetype.trait === 'frontArmor' && !weakPoint ? 1.28 : 1;
    const marked = target.markedUntil > this.elapsed;
    const markMultiplier = marked ? 1.12 * (1 + (this.modifiers.markedDamage ?? 0)) : 1 + (this.modifiers.unmarkedDamage ?? 0);
    const nearbyTargets = this.enemies.filter((enemy) => !enemy.dead && enemy.group.position.distanceTo(target.group.position) < 3.8).length;
    const targetPatternMultiplier = nearbyTargets > 1 ? 1 + (this.modifiers.crowdDamage ?? 0) : 1 + (this.modifiers.singleTarget ?? 0);
    const bodyMultiplier = weakPoint ? 1 : 1 + (this.modifiers.bodyDamage ?? 0);
    const shieldMultiplier = this.player.shield <= 0.1 ? 1 + (this.modifiers.noShieldDamage ?? 0) : 1;
    const ambushMultiplier = (target.receivedHits ?? 0) === 0 ? 1 + (this.modifiers.ambushDamage ?? 0) : 1;
    const sustainedMultiplier = this.combo >= 6 ? 1 + (this.modifiers.sustainedFire ?? 0) : 1;
    let characterDamage = 1;
    let characterBreak = 1;
    const moving = Math.hypot(this.input.move.x, this.input.move.y) > 0.2;
    if (this.character.id === 'noir' && moving) characterDamage *= 1.22;
    if (this.character.id === 'noir' && this.characterState.wingChargeUntil > this.elapsed) {
      characterDamage *= 1.55;
      this.characterState.wingChargeUntil = 0;
    }
    if (this.character.id === 'jigsaw' && this.characterState.droneDamageUntil > this.elapsed) characterDamage *= 1.18;
    if (this.character.id === 'yura' && this.characterState.ambushUntil > this.elapsed) characterDamage *= 1.5;
    if (this.character.id === 'neko' && moving) characterDamage *= this.characterState.rushUntil > this.elapsed ? 1.34 : 1.2;
    if (this.character.id === 'mora' && target.controlUntil > this.elapsed) characterBreak *= 1.35;
    const damage = this.modifiers.damage * (weakPoint ? 1.35 : 1) * (broken ? 2.2 : 1) * gearHit.damageMultiplier * mechanicHit.hpMultiplier * armorDamage * markMultiplier * targetPatternMultiplier * bodyMultiplier * shieldMultiplier * ambushMultiplier * sustainedMultiplier * characterDamage;
    const breakDamage = this.modifiers.breakDamage * (weakPoint ? 1.2 : 1) * gearHit.breakMultiplier * mechanicHit.breakMultiplier * armorBreak * characterBreak;
    return { damage, breakDamage, weakPoint, manual };
  }

  applyResolvedHit(target, hit, primary = false) {
    if (!target || target.dead) return;
    target.hp -= hit.damage;
    target.break -= hit.breakDamage;
    target.receivedHits = (target.receivedHits ?? 0) + 1;
    this.applyCharacterShotEffect(target, hit);
    if (primary) this.applyEquipmentShotEffects(target, hit);
    if (primary) this.stats.hits += 1;
    this.combo += 1;
    this.comboTimer = 1.4;
    this.score += Math.round(hit.damage * 8 + this.combo * 2 + (hit.weakPoint ? 50 : 0));
    this.flashEnemy(target, hit.weakPoint ? '#fff2a6' : '#ffffff');
    this.audio.play(hit.weakPoint ? 'weak' : 'hit');
    if (hit.weakPoint) {
      this.renderFreezeFrames = Math.max(this.renderFreezeFrames, 1);
      this.cameraShake = Math.max(this.cameraShake, 0.08);
    }
    if (target.break <= 0 && target.brokenUntil <= this.elapsed) {
      target.brokenUntil = this.elapsed + 3.6;
      target.break = target.maxBreak;
      this.stats.breaks += 1;
      if (this.modifiers.breakShield) {
        const shieldCap = Math.max(this.modifiers.breakShield, this.modifiers.stationaryShield ?? 0);
        this.player.shield = Math.min(shieldCap, this.player.shield + this.modifiers.breakShield);
      }
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
    const resonanceInterval = this.modifiers.resonance ? 6 : 8;
    if (this.character.id === 'miku' && this.characterState.shotCounter % resonanceInterval === 0) {
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
    if (this.character.id === 'serin' && this.characterState.shotCounter % 12 === 0) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2.5 * this.healingMultiplier());
    }
    if (this.character.id === 'mora') {
      target.controlUntil = Math.max(target.controlUntil ?? 0, this.elapsed + 0.45);
      target.threadStacks = (target.threadStacks ?? 0) + 1;
      if (target.threadStacks % 5 === 0) target.break -= hit.breakDamage * 1.2;
    }
    if (this.character.id === 'marin') {
      this.pulse(target.group.position, '#6ee7ff', 2.1);
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy === target || enemy.group.position.distanceTo(target.group.position) > 3.4) continue;
        enemy.break -= hit.breakDamage * 0.5;
        enemy.hp -= hit.damage * 0.28;
        if (enemy.hp <= 0) this.killEnemy(enemy);
      }
    }
    if (this.character.id === 'jigsaw' && this.characterState.shotCounter % 10 === 0) {
      target.hp -= 18;
      target.break -= 12;
      this.pulse(target.group.position, '#b68cff', 1.5);
    }
    if (this.character.id === 'yura') {
      target.foxMarks = (target.foxMarks ?? 0) + 1;
      if (target.foxMarks >= 3) {
        target.foxMarks = 0;
        target.hp -= hit.damage * 0.85;
        this.pulse(target.group.position, '#ff7fb7', 2.2);
      }
    }
    if (this.character.id === 'sora') {
      const away = target.group.position.clone().sub(this.player.position).setY(0).normalize();
      target.group.position.addScaledVector(away, target.boss ? 0.15 : 0.42);
    }
  }

  applyEquipmentShotEffects(target, hit) {
    const candidates = this.enemies
      .filter((enemy) => !enemy.dead && enemy !== target && enemy.targetable)
      .sort((a, b) => a.group.position.distanceToSquared(target.group.position) - b.group.position.distanceToSquared(target.group.position));
    const secondaryHits = [];
    if (this.modifiers.spread) secondaryHits.push(...candidates.filter((enemy) => enemy.group.position.distanceTo(target.group.position) <= 3.6).slice(0, 3));
    if (this.modifiers.pierce && candidates[0]) secondaryHits.push(candidates[0]);
    if (this.modifiers.chainTargets) secondaryHits.push(...candidates.slice(0, Math.max(1, Math.round(this.modifiers.chainTargets))));
    for (const enemy of [...new Set(secondaryHits)]) {
      const chainScale = this.modifiers.chainTargets ? 0.48 : this.modifiers.pierce ? 0.62 : 0.34;
      enemy.hp -= hit.damage * chainScale;
      enemy.break -= hit.breakDamage * (this.modifiers.spread ? 0.52 : 0.34);
      this.createTracer(target.group.position.clone().setY(0.9), enemy.group.position.clone().setY(0.9));
      if (enemy.hp <= 0) this.killEnemy(enemy);
    }
  }

  healingMultiplier() {
    const lowHp = this.player.hp / this.player.maxHp < 0.5;
    return Math.max(0.1, 1 + (this.modifiers.selfHealing ?? 0) + (lowHp ? this.modifiers.lowHpHealing ?? 0 : 0));
  }

  launchPlayerProjectile(origin, target, hit) {
    const mortar = this.character.id === 'lumi';
    const mesh = this.pools.playerProjectile.acquire();
    mesh.material.color.set(mortar ? '#b68cff' : '#ffd166');
    mesh.scale.setScalar(mortar ? 1 : 0.77);
    mesh.position.copy(origin);
    const targetPosition = target.group.position.clone().setY(0.8);
    const velocity = targetPosition.clone().sub(origin).normalize().multiplyScalar(mortar ? 8 : 10.5);
    this.playerProjectiles.push({ mesh, velocity, target, targetPosition, hit, life: 2.6, radius: mortar ? 3.5 : 2.8, mortar });
  }

  updatePlayerProjectiles(dt) {
    for (let index = this.playerProjectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.playerProjectiles[index];
      if (!projectile.target.dead) projectile.targetPosition.copy(projectile.target.group.position).setY(0.8);
      const desired = projectile.targetPosition.clone().sub(projectile.mesh.position).normalize();
      projectile.velocity.lerp(desired.multiplyScalar(projectile.mortar ? 8 : 10.5), Math.min(1, dt * 4));
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.life -= dt;
      if (projectile.mesh.position.distanceTo(projectile.targetPosition) < 0.65 || projectile.life <= 0) {
        this.detonatePlayerProjectile(projectile);
        this.pools.playerProjectile.release(projectile.mesh);
        this.playerProjectiles.splice(index, 1);
      }
    }
  }

  detonatePlayerProjectile(projectile) {
    const position = projectile.targetPosition.clone().setY(0);
    this.pulse(position, projectile.mortar ? '#b68cff' : '#ffd166', projectile.radius);
    let primaryApplied = false;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.group.position.distanceTo(position) > projectile.radius) continue;
      const primary = enemy === projectile.target && !primaryApplied;
      this.applyResolvedHit(enemy, {
        ...projectile.hit,
        damage: projectile.hit.damage * (primary ? 1 : 0.52),
        breakDamage: projectile.hit.breakDamage * (primary ? 1 : 0.44),
        weakPoint: primary ? projectile.hit.weakPoint : false
      }, primary);
      if (primary) primaryApplied = true;
    }
    if (projectile.mortar) this.createPlayerField(position, 5.2, 3.5);
  }

  createPlayerField(position, duration = 5, radius = 3.5) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 40),
      new THREE.MeshBasicMaterial({ color: '#9e82ff', transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position).setY(0.045);
    this.scene.add(mesh);
    this.playerFields.push({ mesh, duration, radius, nextTick: this.elapsed });
  }

  updatePlayerFields(dt) {
    for (let index = this.playerFields.length - 1; index >= 0; index -= 1) {
      const field = this.playerFields[index];
      field.duration -= dt;
      field.mesh.material.opacity = 0.12 + Math.sin(this.elapsed * 4) * 0.05;
      for (const enemy of this.enemies) {
        if (!enemy.dead && enemy.group.position.distanceTo(field.mesh.position) <= field.radius) enemy.fieldSlowUntil = this.elapsed + 0.18;
      }
      if (this.elapsed >= field.nextTick) {
        field.nextTick = this.elapsed + 0.65;
        for (const enemy of this.enemies) {
          if (enemy.dead || enemy.group.position.distanceTo(field.mesh.position) > field.radius) continue;
          enemy.hp -= 3.5 * this.modifiers.skillPower;
          enemy.break -= 2;
          if (enemy.hp <= 0) this.killEnemy(enemy);
        }
      }
      if (field.duration <= 0) {
        this.scene.remove(field.mesh);
        field.mesh.geometry.dispose();
        field.mesh.material.dispose();
        this.playerFields.splice(index, 1);
      }
    }
  }

  createTracer(start, end) {
    const line = this.pools.tracer.acquire();
    const positions = line.geometry.attributes.position.array;
    positions[0] = start.x;
    positions[1] = start.y;
    positions[2] = start.z;
    positions[3] = end.x;
    positions[4] = end.y;
    positions[5] = end.z;
    line.geometry.attributes.position.needsUpdate = true;
    this.effects.push({ object: line, life: 0.08, maxLife: 0.08, pool: this.pools.tracer });
  }

  flashEnemy(enemy, color) {
    const original = enemy.body.material.emissive.getHex();
    enemy.body.material.emissive.set(color);
    setTimeout(() => enemy.body?.material?.emissive?.setHex(original), 55);
  }

  pulse(position, color, size = 1.8) {
    const ring = this.pools.pulse.acquire();
    ring.material.color.set(color);
    ring.material.opacity = 0.9;
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position).setY(0.08);
    ring.userData.targetScale = size;
    this.effects.push({ object: ring, life: 0.45, maxLife: 0.45, pulse: true, pool: this.pools.pulse });
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
      const bossPhase = enemy.boss ? this.updateBossPhase(enemy) : null;
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
      if ((enemy.controlUntil ?? 0) > this.elapsed) {
        enemy.group.position.y = Math.sin(this.elapsed * 12) * 0.035;
        continue;
      }
      enemy.group.position.y = 0;
      const toPlayer = this.player.position.clone().sub(enemy.group.position).setY(0);
      const distance = toPlayer.length();
      const ideal = enemy.archetype.preferredRange;
      const fieldSlow = (enemy.fieldSlowUntil ?? 0) > this.elapsed ? 0.52 : 1;
      const motionScale = this.enemyTimeScale * fieldSlow;
      const speed = enemy.speed * (bossPhase?.moveMultiplier ?? 1);
      if (enemy.archetype.trait === 'stationary') {
        // Turrets trade mobility for pressure.
      } else if (enemy.archetype.trait === 'kite' && distance < ideal) {
        enemy.group.position.addScaledVector(toPlayer.normalize(), -speed * dt * motionScale);
      } else if (distance > ideal) enemy.group.position.addScaledVector(toPlayer.normalize(), speed * dt * motionScale);
      else {
        const tangent = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x).normalize();
        enemy.group.position.addScaledVector(tangent, speed * 0.5 * enemy.orbit * dt * motionScale);
      }
      const projectileBudget = Math.min(9, 2 + this.stage.chapter + (bossPhase?.id ?? 0));
      if (this.elapsed >= enemy.nextShot && distance < 15 && this.projectiles.length < projectileBudget) {
        this.enemyShoot(enemy, projectileBudget);
        enemy.nextShot = this.elapsed + enemy.archetype.fireInterval * (bossPhase?.fireIntervalMultiplier ?? 1) + Math.random() * 0.65;
      }
      const hasActiveSpecial = this.telegraphs.some((telegraph) => telegraph.enemy === enemy);
      if (enemy.boss && this.elapsed >= enemy.nextSpecial && !hasActiveSpecial) {
        this.startBossTelegraph(enemy);
        enemy.nextSpecial = this.elapsed + bossPhase.specialCooldown;
      }
    }
  }

  updateBossPhase(enemy) {
    const nextPhase = resolveBossPhase(enemy.hp, enemy.maxHp);
    if (enemy.phase !== nextPhase.id) {
      enemy.phase = nextPhase.id;
      enemy.body.material.emissive.set(nextPhase.color);
      enemy.core.material.color.set(nextPhase.color);
      enemy.nextSpecial = Math.max(enemy.nextSpecial, this.elapsed + 1.15);
      this.pulse(enemy.group.position, nextPhase.color, 4.6 + nextPhase.id);
      this.root.classList.add('boss-phase-shift');
      setTimeout(() => this.root.classList.remove('boss-phase-shift'), 180);
    }
    return nextPhase;
  }

  enemyShoot(enemy, projectileBudget = 9) {
    const start = enemy.group.position.clone().add(new THREE.Vector3(0, enemy.boss ? 1.6 : 0.8, 0));
    const baseDirection = this.player.position.clone().sub(enemy.group.position).setY(0.1).normalize();
    const phase = enemy.boss ? BOSS_PHASES[enemy.phase - 1] : null;
    const capacity = Math.max(0, projectileBudget - this.projectiles.length);
    const angles = (phase ? resolveBossVolleyAngles(phase) : [0]).slice(0, capacity);
    const baseDamage = (3 + this.stage.chapter) * enemy.archetype.damage;
    for (const angle of angles) {
      const mesh = this.pools.enemyProjectile.acquire();
      mesh.material.color.set(phase?.color ?? enemy.archetype.color);
      mesh.scale.setScalar(enemy.boss ? 1 : 0.65);
      mesh.position.copy(start);
      const direction = baseDirection.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const speed = enemy.archetype.projectileSpeed * (phase?.projectileSpeedMultiplier ?? 1);
      this.projectiles.push({ mesh, velocity: direction.multiplyScalar(speed), life: 4, damage: baseDamage });
    }
  }

  startBossTelegraph(enemy) {
    const phase = BOSS_PHASES[enemy.phase - 1];
    const offsets = resolveBossTelegraphOffsets(phase);
    const towardPlayer = this.player.position.clone().sub(enemy.group.position).setY(0).normalize();
    const side = new THREE.Vector3(-towardPlayer.z, 0, towardPlayer.x);
    const spacing = phase.telegraphRadius * (phase.id === 2 ? 1.15 : 1.75);
    const castId = ++this.bossCastCounter;
    for (const offset of offsets) {
      const mesh = this.pools.telegraph.acquire();
      mesh.material.color.set(phase.color);
      mesh.material.opacity = 0.72;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(this.player.position).addScaledVector(side, offset * spacing).setY(0.07);
      this.telegraphs.push({
        mesh, enemy, castId, remaining: phase.telegraphDuration, duration: phase.telegraphDuration,
        radius: phase.telegraphRadius, damage: phase.specialDamage
      });
    }
  }

  updateTelegraphs(dt) {
    for (let index = this.telegraphs.length - 1; index >= 0; index -= 1) {
      const telegraph = this.telegraphs[index];
      const interrupted = telegraph.enemy.dead || telegraph.enemy.brokenUntil > this.elapsed;
      if (interrupted) {
        this.removeTelegraph(index, true);
        continue;
      }
      telegraph.remaining -= dt;
      const progress = 1 - telegraph.remaining / telegraph.duration;
      telegraph.mesh.scale.setScalar(1 + progress * telegraph.radius * 3.2);
      telegraph.mesh.material.opacity = 0.25 + Math.sin(this.elapsed * 18) * 0.18;
      if (telegraph.remaining > 0) continue;
      this.pulse(telegraph.mesh.position, telegraph.mesh.material.color, telegraph.radius * 1.6);
      if (telegraph.mesh.position.distanceTo(this.player.position) < telegraph.radius) this.damagePlayer(telegraph.damage, 'hazard');
      this.removeTelegraph(index, false);
    }
  }

  removeTelegraph(index, interrupted) {
    const [telegraph] = this.telegraphs.splice(index, 1);
    if (!telegraph) return;
    if (interrupted && telegraph.enemy.lastInterruptedCast !== telegraph.castId) {
      telegraph.enemy.lastInterruptedCast = telegraph.castId;
      this.score += 360;
      this.stats.mechanicActions += 1;
    }
    this.pools.telegraph.release(telegraph.mesh);
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
    if (projectile) this.pools.enemyProjectile.release(projectile.mesh);
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
    const guardMultiplier = this.character.id === 'sora' && this.characterState.guardUntil > this.elapsed ? 0.34 : 1;
    let damage = resolveIncomingDamage(amount * cleanseMultiplier * guardMultiplier, this.modifiers, {
      type,
      moveStrength: Math.hypot(this.input?.move.x ?? 0, this.input?.move.y ?? 0)
    });
    if (this.player.shield > 0) {
      const efficiency = Math.max(0.25, 1 + (this.modifiers.shieldEfficiency ?? 0));
      const absorbed = Math.min(damage, this.player.shield * efficiency);
      this.player.shield = Math.max(0, this.player.shield - absorbed / efficiency);
      damage -= absorbed;
    }
    if (damage <= 0.01) {
      this.player.invulnerableUntil = this.elapsed + Math.min(0.18, invulnerability);
      return 0;
    }
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
        effect.pool.release(effect.object);
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
      boss: this.getBossHud(),
      shield: this.player.shield,
      skillCooldown: Math.max(0, this.skillReadyAt - this.elapsed),
      dodgeCooldown: Math.max(0, this.dodgeReadyAt - this.elapsed)
    });
  }

  getBossHud() {
    const boss = this.enemies.find((enemy) => enemy.boss && !enemy.dead);
    if (!boss) return null;
    const phase = BOSS_PHASES[boss.phase - 1];
    const breakRemaining = Math.max(0, boss.brokenUntil - this.elapsed);
    return {
      phase: phase.id,
      label: phase.label,
      color: phase.color,
      hp: boss.hp,
      maxHp: boss.maxHp,
      breakRemaining,
      state: breakRemaining > 0 ? `BREAK ${breakRemaining.toFixed(1)}s · 폭딜 ×2.2` : `위험기 ${phase.telegraphDuration.toFixed(1)}초 예고 · 브레이크로 취소`
    };
  }

  dodge() {
    if (this.elapsed < this.dodgeReadyAt) return;
    const chargePenalty = this.modifiers.dodgeCharges < 0 ? 1 + Math.abs(this.modifiers.dodgeCharges) * 0.45 : 1;
    this.dodgeReadyAt = this.elapsed + 2.4 * this.modifiers.dodgeCooldown * chargePenalty;
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
    const environmentActive = ['hazard', 'force', 'safeZone', 'phase'].some((behavior) => this.mechanics.behaviors.has(behavior));
    const weatherScale = environmentActive ? Math.max(0.35, 1 - (this.modifiers.weatherCooldown ?? 0)) : 1;
    this.skillReadyAt = this.elapsed + this.character.skill.cooldown * (1 + (this.modifiers.normalCooldown ?? 0)) * weatherScale * this.mechanics.skillCooldownMultiplier();
    this.audio.play('skill');
    if (this.character.id === 'nari') {
      this.mechanics.assistObjective();
      this.pulse(this.player.position, '#5fb8ff', 7);
      for (const enemy of this.enemies) if (!enemy.dead) enemy.markedUntil = this.elapsed + 6;
      this.score += 360;
      return;
    }
    if (this.character.id === 'serin') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 36 * this.modifiers.skillPower * this.healingMultiplier());
      this.characterState.cleanseUntil = this.elapsed + 5.5;
      this.pulse(this.player.position, '#8dffc2', 5.2);
      this.score += 220;
      return;
    }
    if (this.character.id === 'noir') {
      const direction = new THREE.Vector3(this.input.aim.x, 0, this.input.aim.y).normalize();
      this.player.position.addScaledVector(direction, 4.2);
      this.player.invulnerableUntil = this.elapsed + 0.7;
      this.characterState.wingChargeUntil = this.elapsed + 5;
      this.pulse(this.player.position, '#9d7dff', 4.2);
      return;
    }
    if (this.character.id === 'mora') {
      this.pulse(this.player.position, '#b68cff', 8.5);
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.group.position.distanceTo(this.player.position) > 9) continue;
        enemy.controlUntil = this.elapsed + 4;
        enemy.break -= 16 * this.modifiers.skillPower;
      }
      return;
    }
    if (this.character.id === 'roa') {
      const target = this.nearestEnemy();
      if (target) {
        target.surveyUntil = this.elapsed + 8;
        target.core.material.color.set('#ffef9d');
        this.pulse(target.group.position, '#ffef9d', 2.8);
      }
      return;
    }
    if (this.character.id === 'marin') {
      for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
        if (this.projectiles[index].mesh.position.distanceTo(this.player.position) <= 8) this.removeProjectile(index);
      }
      const direction = new THREE.Vector3(this.input.aim.x, 0, this.input.aim.y).normalize();
      this.player.position.addScaledVector(direction, 3.2);
      this.player.invulnerableUntil = this.elapsed + 0.48;
      this.pulse(this.player.position, '#6ee7ff', 6.2);
      return;
    }
    if (this.character.id === 'jigsaw') {
      this.mechanics.assistObjective();
      this.mechanics.assistObjective();
      this.characterState.droneDamageUntil = this.elapsed + 7;
      this.pulse(this.player.position, '#b68cff', 6);
      this.score += 320;
      return;
    }
    if (this.character.id === 'yura') {
      const target = this.nearestEnemy();
      if (target) {
        const through = target.group.position.clone().sub(this.player.position).setY(0).normalize();
        this.player.position.copy(target.group.position).addScaledVector(through, 1.8).setY(0);
        this.player.invulnerableUntil = this.elapsed + 0.55;
        this.characterState.ambushUntil = this.elapsed + 3.2;
        this.pulse(this.player.position, '#ff7fb7', 3.2);
      }
      return;
    }
    if (this.character.id === 'lumi') {
      const target = this.nearestEnemy();
      this.createPlayerField(target?.group.position ?? this.player.position, 7, 5.2);
      this.pulse(target?.group.position ?? this.player.position, '#9e82ff', 5.2);
      return;
    }
    if (this.character.id === 'sora') {
      this.characterState.guardUntil = this.elapsed + 6;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 18 * this.healingMultiplier());
      this.pulse(this.player.position, '#5fb8ff', 5.5);
      return;
    }
    if (this.character.id === 'neko') {
      this.mechanics.assistObjective();
      this.characterState.rushUntil = this.elapsed + 6;
      this.player.dodgeUntil = this.elapsed + 0.8;
      this.player.invulnerableUntil = this.elapsed + 0.6;
      this.pulse(this.player.position, '#6dffb2', 4.5);
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
      stats: { ...this.stats, accuracy, maxHp: this.player.maxHp }
    });
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.root;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  applyRendererQuality(resize = true) {
    this.qualityConfig = resolveQualityConfig(this.qualityState, window.devicePixelRatio);
    this.renderer.setPixelRatio(this.qualityConfig.dpr);
    this.renderer.shadowMap.enabled = this.qualityConfig.shadows;
    if (resize && this.camera) this.resize();
  }

  disposeRuntimePools() {
    for (const pool of Object.values(this.pools ?? {})) pool.dispose();
    this.effects.length = 0;
    this.projectiles.length = 0;
    this.playerProjectiles.length = 0;
    this.telegraphs.length = 0;
  }

  destroy() {
    this.running = false;
    cancelAnimationFrame(this.animationFrame);
    this.input?.destroy();
    this.audio?.destroy();
    this.resizeObserver?.disconnect();
    this.disposeRuntimePools();
    this.scene?.traverse((object) => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.());
      else object.material?.dispose?.();
    });
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
