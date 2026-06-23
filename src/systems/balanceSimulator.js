import { characters } from '../data/characters.js';
import { stages } from '../data/stages.js';

export function simulateMatchup(character, stage) {
  const demands = stage.demands ?? {};
  const entries = Object.entries(demands);
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1;
  const weightedFit = entries.reduce((sum, [axis, weight]) => sum + ((character.axes[axis] ?? 0) / 5) * weight, 0) / totalWeight;
  const demandedValues = entries.map(([axis]) => character.axes[axis] ?? 0);
  const weakLink = demandedValues.length ? Math.min(...demandedValues) / 5 : 0.5;
  const statTempo = Math.min(1, (character.stats.damage * character.stats.fireRate * 0.018 + character.stats.break * 0.025) / 2);
  let fit = weightedFit * 0.72 + weakLink * 0.18 + statTempo * 0.1;
  // Miku is the deliberately less-efficient universal fallback: always viable, never guaranteed optimal.
  if (character.id === 'miku') fit = Math.max(0.53, fit);
  fit = Math.max(0.35, Math.min(0.96, fit));
  return {
    characterId: character.id,
    stageId: stage.id,
    fit,
    estimatedClearSeconds: Math.round(stage.targetSeconds * (1.42 - fit * 0.63)),
    estimatedRisk: Math.max(0.06, Math.min(0.78, 0.78 - fit * 0.72)),
    viable: fit >= 0.52
  };
}

export function auditSimulatedBalance(characterList = characters, stageList = stages) {
  const winnerCounts = Object.fromEntries(characterList.map((character) => [character.id, 0]));
  const issues = [];
  const stageResults = {};
  for (const stage of stageList) {
    const results = characterList.map((character) => simulateMatchup(character, stage)).sort((a, b) => b.fit - a.fit);
    stageResults[stage.id] = results;
    const bestFit = results[0].fit;
    const leading = results.filter((result) => bestFit - result.fit <= 0.035);
    for (const result of leading) winnerCounts[result.characterId] += 1 / leading.length;
    const viableRecommended = results.filter((result) => stage.recommendedCharacters.includes(result.characterId) && result.viable);
    if (viableRecommended.length < 2) issues.push(`${stage.id}: 추천 캐릭터 중 모의 공략 가능 캐릭터가 2명 미만입니다.`);
    const miku = results.find((result) => result.characterId === 'miku');
    if (!miku?.viable) issues.push(`${stage.id}: 기본 캐릭터 미쿠의 대체 공략이 막혔습니다.`);
  }
  const winnerShare = Object.fromEntries(Object.entries(winnerCounts).map(([id, count]) => [id, count / stageList.length]));
  for (const [id, share] of Object.entries(winnerShare)) {
    if (share > 0.3) issues.push(`${id}: 모의 최적해 비율이 30%를 초과합니다 (${Math.round(share * 100)}%).`);
  }
  return { ok: issues.length === 0, issues, winnerCounts, winnerShare, stageResults };
}
