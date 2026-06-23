import { describe, expect, it } from 'vitest';
import { characterById } from '../src/data/characters.js';
import { enemyArchetypes, resolveEnemyArchetype } from '../src/data/enemies.js';
import { starterLoadout } from '../src/data/equipment.js';
import { resolveCombatModifiers, resolveIncomingDamage, resolveShotModifiers } from '../src/game/CombatModifiers.js';
import { createQualityState, resolveQualityConfig, sampleAdaptiveQuality } from '../src/game/AdaptiveQuality.js';
import { stageMechanicRules } from '../src/game/StageMechanicDirector.js';
import { canFullscreen, enterFullscreen, getFullscreenElement, leaveFullscreen } from '../src/systems/fullscreen.js';

describe('first chapter runtime differentiation', () => {
  it('maps all fifty stages to distinct runtime mechanic identities', () => {
    expect(Object.keys(stageMechanicRules)).toHaveLength(50);
    expect(new Set(Object.values(stageMechanicRules).map((rule) => rule.type)).size).toBe(50);
    for (let chapter = 1; chapter <= 5; chapter += 1) {
      for (let stage = 1; stage <= 10; stage += 1) expect(stageMechanicRules[`${chapter}-${stage}`]).toBeTruthy();
    }
    const behaviors = new Set(Object.values(stageMechanicRules).flatMap((rule) => rule.behaviors ?? []));
    expect([...behaviors]).toEqual(expect.arrayContaining(['fog', 'hazard', 'overheat', 'limitedAmmo', 'phase', 'safeZone', 'links', 'shrink']));
  });

  it('defines enemies with tactical traits instead of health-only variants', () => {
    expect(Object.keys(enemyArchetypes).length).toBeGreaterThanOrEqual(9);
    expect(new Set(Object.values(enemyArchetypes).map((enemy) => enemy.trait)).size).toBeGreaterThanOrEqual(8);
    expect(resolveEnemyArchetype('guard', 0).trait).toBe('frontArmor');
    expect(resolveEnemyArchetype('runner', 0).trait).toBe('kite');
    expect(resolveEnemyArchetype('drone', 0, true).trait).toBe('boss');
  });

  it('unlocks four mechanically distinct operators during chapter one', () => {
    const ids = ['miku', 'nari', 'bibi', 'serin'];
    const operators = ids.map((id) => characterById[id]);
    expect(new Set(operators.map((operator) => operator.weaponType)).size).toBe(4);
    expect(new Set(operators.map((operator) => operator.skill.id)).size).toBe(4);
    expect(operators[0].unlock.type).toBe('starter');
    for (const operator of operators.slice(1)) expect(operator.unlock.stage.startsWith('1-')).toBe(true);
  });

  it('assigns every operator a distinct tactical hook across all required fire families', () => {
    const operators = Object.values(characterById);
    expect(operators).toHaveLength(13);
    expect(new Set(operators.map((operator) => operator.combatProfile.tacticalHook)).size).toBe(13);
    const fireModels = new Set(operators.map((operator) => operator.combatProfile.fireModel));
    expect([...fireModels]).toEqual(expect.arrayContaining(['hitscan', 'projectile', 'shotgun', 'fieldProjectile']));
    expect(fireModels.size).toBeGreaterThanOrEqual(9);
  });
});

describe('equipment changes combat rules', () => {
  const owned = Object.fromEntries(Object.values(starterLoadout).map((id) => [id, { level: 0 }]));
  const modifiers = resolveCombatModifiers(characterById.miku, starterLoadout, owned);

  it('applies starter sidegrade strengths and drawbacks', () => {
    expect(modifiers.fireRate).toBeGreaterThan(characterById.miku.stats.fireRate);
    expect(modifiers.dodgeDistance).toBeGreaterThan(1);
    expect(modifiers.movingDamageReduction).toBeGreaterThan(0);
    expect(modifiers.stationaryDamageTaken).toBeGreaterThan(0);
    expect(modifiers.mistimedDamage).toBeLessThan(0);
  });

  it('makes moving defense meaningfully different from stationary defense', () => {
    const moving = resolveIncomingDamage(100, modifiers, { type: 'projectile', moveStrength: 1 });
    const stationary = resolveIncomingDamage(100, modifiers, { type: 'projectile', moveStrength: 0 });
    expect(moving).toBeLessThan(100);
    expect(stationary).toBeGreaterThan(100);
  });

  it('rewards timed break shots while preserving mistimed damage cost', () => {
    const onBeat = resolveShotModifiers(modifiers, 0.03, true);
    const offBeat = resolveShotModifiers(modifiers, 0.36, true);
    expect(onBeat.breakMultiplier).toBeGreaterThan(offBeat.breakMultiplier);
    expect(offBeat.damageMultiplier).toBeLessThan(1);
  });

  it('makes a strong pairing dramatically better than an anti-synergy pairing', () => {
    const strong = resolveCombatModifiers(characterById.roa, { weapon: 'tempo-lance' });
    const weak = resolveCombatModifiers(characterById.miku, { weapon: 'tempo-lance' });
    const strongDamageRatio = strong.damage / characterById.roa.stats.damage;
    const weakDamageRatio = weak.damage / characterById.miku.stats.damage;
    expect(strong.affinitySummary).toMatchObject({ strong: 1, weak: 0 });
    expect(weak.affinitySummary).toMatchObject({ strong: 0, weak: 1 });
    expect(strongDamageRatio).toBeGreaterThan(weakDamageRatio * 1.7);
    expect(weak.normalCooldown).toBeGreaterThan(0);
  });

  it('withholds binary mechanics from an incompatible operator', () => {
    const strong = resolveCombatModifiers(characterById.roa, { weapon: 'needle-rail' });
    const weak = resolveCombatModifiers(characterById.marin, { weapon: 'needle-rail' });
    expect(strong.pierce).toBe(1);
    expect(weak.pierce).toBeUndefined();
    expect(weak.moveSpeedWhileFiring).toBeLessThan(strong.moveSpeedWhileFiring);
  });
});

describe('mobile adaptive quality', () => {
  it('caps low mode at DPR 1 and a 30fps render target', () => {
    const config = resolveQualityConfig(createQualityState('low'), 3);
    expect(config).toMatchObject({ dpr: 1, shadows: false, renderFps: 30 });
  });

  it('degrades auto quality in measured stages without changing the fixed simulation tick', () => {
    let state = createQualityState('auto');
    ({ state } = sampleAdaptiveQuality(state, 4, true));
    expect(state.tier).toBe('balanced');
    expect(resolveQualityConfig(state, 2)).toMatchObject({ dpr: 1.15, shadows: false, renderFps: 60 });
    ({ state } = sampleAdaptiveQuality(state, 4, true));
    expect(state.tier).toBe('low');
    expect(resolveQualityConfig(state, 2).renderFps).toBe(30);
  });
});

describe('mobile fullscreen bridge', () => {
  it('enters and leaves the standards-based Fullscreen API', async () => {
    const doc = { fullscreenElement: null };
    const element = {
      ownerDocument: doc,
      requestFullscreen: async () => { doc.fullscreenElement = element; }
    };
    doc.exitFullscreen = async () => { doc.fullscreenElement = null; };
    expect(canFullscreen(element)).toBe(true);
    expect(await enterFullscreen(element)).toBe(true);
    expect(getFullscreenElement(doc)).toBe(element);
    expect(await leaveFullscreen(doc)).toBe(true);
    expect(getFullscreenElement(doc)).toBeNull();
  });

  it('fails safely when an embedded browser blocks fullscreen', async () => {
    const element = { ownerDocument: {}, requestFullscreen: async () => { throw new Error('denied'); } };
    expect(await enterFullscreen(element)).toBe(false);
    expect(canFullscreen({})).toBe(false);
  });
});
