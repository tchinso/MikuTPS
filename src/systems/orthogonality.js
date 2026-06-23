import { characters, AXES } from '../data/characters.js';
import { stages } from '../data/stages.js';

export function auditOrthogonality(characterList = characters, stageList = stages) {
  const issues = [];
  const usage = Object.fromEntries(characterList.map(({ id }) => [id, 0]));

  for (const character of characterList) {
    const strongAxes = AXES.filter((axis) => (character.axes[axis] ?? 0) >= 4);
    if (strongAxes.length < 2) issues.push(`${character.id}: 강점 축이 2개 미만입니다.`);
    if (!character.weakness) issues.push(`${character.id}: 약점 설명이 없습니다.`);
  }

  for (const stage of stageList) {
    const unique = new Set(stage.recommendedCharacters);
    if (unique.size < 2) issues.push(`${stage.id}: 실전 가능한 추천 캐릭터가 2명 미만입니다.`);
    if (stage.tactics.length < 2) issues.push(`${stage.id}: 공략 전술이 2개 미만입니다.`);
    if (!stage.primaryMechanic || !stage.secondaryMechanic) issues.push(`${stage.id}: 주/보조 기믹이 누락되었습니다.`);
    for (const id of unique) usage[id] = (usage[id] ?? 0) + 1;
  }

  for (const character of characterList) {
    if ((usage[character.id] ?? 0) < 3) issues.push(`${character.id}: 유력 스테이지가 3개 미만입니다.`);
  }

  const soloOptimal = stageList.filter((stage) => new Set(stage.recommendedCharacters).size === 1);
  const soloShare = Object.fromEntries(characterList.map(({ id }) => [
    id,
    soloOptimal.filter((stage) => stage.recommendedCharacters[0] === id).length / Math.max(1, stageList.length)
  ]));
  for (const [id, share] of Object.entries(soloShare)) {
    if (share > 0.3) issues.push(`${id}: 단독 최적 비율이 30%를 초과합니다.`);
  }

  return { ok: issues.length === 0, issues, usage, soloShare };
}
