import { equipmentById, getEquipmentFit } from '../data/equipment.js';

const additiveKeys = new Set([
  'fireRate', 'breakDamage', 'range', 'weakPoint', 'crowdDamage', 'singleTarget', 'moveSpeedWhileFiring',
  'armorDamage', 'unmarkedDamage', 'maxHp', 'damage', 'moveSpeed', 'directDamageTaken', 'skillPower',
  'movingDamageReduction', 'stationaryDamageTaken', 'hazardReduction', 'lowHpHealing', 'dodgeDistance',
  'turnRate', 'sprintSpeed', 'dodgeCooldown', 'combatMoveSpeed', 'sustainedFire', 'critRate', 'normalCooldown',
  'selfHealing', 'shieldEfficiency', 'noShieldDamage', 'objectiveSpeed', 'knockbackResist'
]);
const binaryKeys = new Set([
  'resonance', 'spread', 'pierce', 'homing', 'terrainGrip', 'perfectDodge', 'dodgeKnockback',
  'reflectPreview', 'hiddenWeakPoint'
]);

export function resolveCombatModifiers(character, loadoutIds, ownedEquipment = {}) {
  const modifiers = {
    maxHp: character.stats.hp,
    moveSpeed: character.stats.speed,
    damage: character.stats.damage,
    fireRate: character.stats.fireRate,
    range: character.stats.range,
    breakDamage: character.stats.break,
    dodgeDistance: 1,
    dodgeCooldown: 1,
    skillPower: 1,
    effects: [],
    drawbacks: [],
    equipmentFit: []
  };

  for (const id of Object.values(loadoutIds ?? {})) {
    const item = equipmentById[id];
    if (!item) continue;
    const level = ownedEquipment[id]?.level ?? 0;
    const enhancementScale = 1 + level * 0.06;
    const fit = getEquipmentFit(item, character.id);
    applyMap(modifiers, item.effect, fit.effectScale * enhancementScale, false);
    applyMap(modifiers, item.drawback, fit.drawbackScale, true);
    if (fit.tier === 'weak') {
      modifiers.damageRate = (modifiers.damageRate ?? 0) - 0.15;
      modifiers.moveSpeedRate = (modifiers.moveSpeedRate ?? 0) - 0.08;
      modifiers.normalCooldown = (modifiers.normalCooldown ?? 0) + 0.18;
    }
    modifiers.equipmentFit.push({ id, tier: fit.tier, effectScale: fit.effectScale, drawbackScale: fit.drawbackScale });
    modifiers.effects.push(...Object.keys(item.effect));
    modifiers.drawbacks.push(...Object.keys(item.drawback));
  }

  modifiers.maxHp *= Math.max(0.35, 1 + (modifiers.maxHpRate ?? 0));
  modifiers.moveSpeed *= Math.max(0.35, 1 + (modifiers.moveSpeedRate ?? 0));
  modifiers.damage *= Math.max(0.25, 1 + (modifiers.damageRate ?? 0));
  modifiers.affinitySummary = modifiers.equipmentFit.reduce((summary, fit) => {
    summary[fit.tier] += 1;
    return summary;
  }, { strong: 0, neutral: 0, weak: 0 });
  return modifiers;
}

function applyMap(target, values, scale, drawback) {
  for (const [key, raw] of Object.entries(values)) {
    if (typeof raw !== 'number') continue;
    if (binaryKeys.has(key)) {
      if (scale >= 0.5 && raw > 0) target[key] = Math.max(target[key] ?? 0, raw);
      continue;
    }
    const value = raw * scale;
    if (key === 'maxHp') target.maxHpRate = (target.maxHpRate ?? 0) + value;
    else if (key === 'damage') target.damageRate = (target.damageRate ?? 0) + value;
    else if (key === 'moveSpeed') target.moveSpeedRate = (target.moveSpeedRate ?? 0) + value;
    else if (['fireRate', 'range', 'breakDamage', 'skillPower', 'dodgeDistance'].includes(key) && Math.abs(value) < 1) target[key] *= 1 + value;
    else if (key === 'dodgeCooldown' && Math.abs(value) < 1) target.dodgeCooldown *= 1 + value;
    else if (additiveKeys.has(key)) target[key] = (target[key] ?? 0) + value;
    else target[key] = (target[key] ?? 0) + value;
    if (drawback && value > 0 && ['directDamageTaken', 'stationaryDamageTaken', 'normalCooldown'].includes(key)) target[key] = Math.max(0, target[key]);
  }
}

export function resolveIncomingDamage(baseDamage, modifiers, context) {
  let damage = baseDamage;
  const moving = context.moveStrength > 0.2;
  if (moving && modifiers.movingDamageReduction) damage *= 1 - modifiers.movingDamageReduction;
  if (!moving && modifiers.stationaryDamageTaken) damage *= 1 + modifiers.stationaryDamageTaken;
  if (context.type === 'hazard' && modifiers.hazardReduction) damage *= 1 - modifiers.hazardReduction;
  if (context.type !== 'hazard' && modifiers.directDamageTaken) damage *= 1 + modifiers.directDamageTaken;
  return Math.max(1, damage);
}

export function resolveShotModifiers(modifiers, elapsed, manualAim) {
  let damageMultiplier = 1;
  let breakMultiplier = 1;
  if (modifiers.burstDamage) damageMultiplier *= 1 + modifiers.burstDamage;
  if (manualAim && modifiers.weakPoint) damageMultiplier *= 1 + modifiers.weakPoint;
  if (modifiers.timedBreak) {
    const beatDistance = Math.min(elapsed % 0.75, 0.75 - (elapsed % 0.75));
    if (beatDistance < 0.12) breakMultiplier *= 1 + modifiers.timedBreak;
    else if (modifiers.mistimedDamage) damageMultiplier *= 1 + modifiers.mistimedDamage;
  }
  return { damageMultiplier, breakMultiplier };
}
