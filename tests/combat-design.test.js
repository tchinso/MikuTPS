import { describe, expect, it } from 'vitest';
import { characterById } from '../src/data/characters.js';
import { enemyArchetypes, resolveEnemyArchetype } from '../src/data/enemies.js';
import { starterLoadout } from '../src/data/equipment.js';
import { resolveCombatModifiers, resolveIncomingDamage, resolveShotModifiers } from '../src/game/CombatModifiers.js';
import { stageMechanicRules } from '../src/game/StageMechanicDirector.js';

describe('first chapter runtime differentiation', () => {
  it('maps all ten stages to ten distinct mechanic behaviors', () => {
    expect(Object.keys(stageMechanicRules)).toHaveLength(10);
    expect(new Set(Object.values(stageMechanicRules).map((rule) => rule.type)).size).toBe(10);
    for (let stage = 1; stage <= 10; stage += 1) expect(stageMechanicRules[`1-${stage}`]).toBeTruthy();
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
});
