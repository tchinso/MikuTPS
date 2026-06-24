export const BOSS_PHASES = Object.freeze([
  Object.freeze({
    id: 1, label: '탐색 압박', threshold: 2 / 3, color: '#ff7a9f',
    moveMultiplier: 1, fireIntervalMultiplier: 1, projectileSpeedMultiplier: 1,
    volley: 1, spread: 0, telegraphCount: 1, telegraphRadius: 2.7,
    telegraphDuration: 1.35, specialCooldown: 6.2, specialDamage: 22
  }),
  Object.freeze({
    id: 2, label: '교차 포위', threshold: 1 / 3, color: '#ffb45e',
    moveMultiplier: 1.12, fireIntervalMultiplier: 0.86, projectileSpeedMultiplier: 1.1,
    volley: 3, spread: 0.17, telegraphCount: 2, telegraphRadius: 2.45,
    telegraphDuration: 1.18, specialCooldown: 5.25, specialDamage: 25
  }),
  Object.freeze({
    id: 3, label: '공명 폭주', threshold: 0, color: '#c987ff',
    moveMultiplier: 1.24, fireIntervalMultiplier: 0.72, projectileSpeedMultiplier: 1.2,
    volley: 5, spread: 0.14, telegraphCount: 3, telegraphRadius: 2.2,
    telegraphDuration: 1.05, specialCooldown: 4.55, specialDamage: 28
  })
]);

export function resolveBossPhase(hp, maxHp) {
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  if (ratio > BOSS_PHASES[0].threshold) return BOSS_PHASES[0];
  if (ratio > BOSS_PHASES[1].threshold) return BOSS_PHASES[1];
  return BOSS_PHASES[2];
}

export function resolveBossVolleyAngles(phase) {
  if (phase.volley <= 1) return [0];
  const center = (phase.volley - 1) / 2;
  return Array.from({ length: phase.volley }, (_, index) => (index - center) * phase.spread);
}

export function resolveBossTelegraphOffsets(phase) {
  if (phase.telegraphCount === 1) return [0];
  if (phase.telegraphCount === 2) return [-1, 1];
  return [-1, 0, 1];
}
