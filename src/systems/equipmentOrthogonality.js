import { characters } from '../data/characters.js';
import { equipment, EQUIPMENT_SLOTS, getEquipmentFit } from '../data/equipment.js';

export function auditEquipmentOrthogonality() {
  const issues = [];
  const matrix = {};
  const slotCounts = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot, equipment.filter((item) => item.slot === slot).length]));

  for (const [slot, count] of Object.entries(slotCounts)) {
    if (count < 8) issues.push(`${slot}: 장비가 8개 미만입니다.`);
  }
  for (const item of equipment) {
    if (item.affinity.strong.length < 3) issues.push(`${item.id}: 최적 캐릭터가 3명 미만입니다.`);
    if (item.affinity.weak.length < 3) issues.push(`${item.id}: 역상성 캐릭터가 3명 미만입니다.`);
    if (item.affinity.strong.some((id) => item.affinity.weak.includes(id))) issues.push(`${item.id}: 최적·역상성 목록이 겹칩니다.`);
    if (item.affinity.strong.length / characters.length > 0.4) issues.push(`${item.id}: 너무 많은 캐릭터에게 최적입니다.`);
  }

  for (const character of characters) {
    matrix[character.id] = {};
    for (const slot of EQUIPMENT_SLOTS) {
      const fits = equipment.filter((item) => item.slot === slot).map((item) => getEquipmentFit(item, character.id).tier);
      const strong = fits.filter((fit) => fit === 'strong').length;
      const weak = fits.filter((fit) => fit === 'weak').length;
      matrix[character.id][slot] = { strong, weak };
      if (!strong) issues.push(`${character.id}/${slot}: 최적 장비가 없습니다.`);
      if (!weak) issues.push(`${character.id}/${slot}: 역상성 장비가 없습니다.`);
    }
  }
  return { ok: issues.length === 0, issues, matrix, slotCounts };
}
