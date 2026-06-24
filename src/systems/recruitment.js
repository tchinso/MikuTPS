import { characters } from '../data/characters.js';
import { equipment, EQUIPMENT_SLOTS } from '../data/equipment.js';

export const CHARACTER_RECRUIT_COST = 2800;
export const EQUIPMENT_DRAW_COST = 900;

function pick(candidates, random) {
  if (!candidates.length) return null;
  const value = Math.max(0, Math.min(0.999999, Number(random()) || 0));
  return candidates[Math.floor(value * candidates.length)];
}

function appendHistory(save, entry) {
  return [...(save.recruitmentHistory ?? []), { ...entry, obtainedAt: Date.now() }].slice(-100);
}

export function recruitCharacter(save, random = Math.random) {
  const owned = new Set(save.unlockedCharacters ?? ['miku']);
  const candidates = characters.filter((character) => character.id !== 'miku' && !owned.has(character.id));
  if (!candidates.length) return { ok: false, reason: 'empty', save };
  if (save.credits < CHARACTER_RECRUIT_COST) return { ok: false, reason: 'credits', save };
  const character = pick(candidates, random);
  return {
    ok: true,
    character,
    save: {
      ...save,
      credits: save.credits - CHARACTER_RECRUIT_COST,
      unlockedCharacters: [...owned, character.id],
      recruitmentHistory: appendHistory(save, { kind: 'character', id: character.id, cost: CHARACTER_RECRUIT_COST })
    }
  };
}

export function drawEquipment(save, slot, random = Math.random) {
  if (!EQUIPMENT_SLOTS.includes(slot)) return { ok: false, reason: 'slot', save };
  const candidates = equipment.filter((item) => item.slot === slot && !save.ownedEquipment[item.id]);
  if (!candidates.length) return { ok: false, reason: 'empty', save };
  if (save.credits < EQUIPMENT_DRAW_COST) return { ok: false, reason: 'credits', save };
  const item = pick(candidates, random);
  return {
    ok: true,
    item,
    save: {
      ...save,
      credits: save.credits - EQUIPMENT_DRAW_COST,
      ownedEquipment: { ...save.ownedEquipment, [item.id]: { level: 0, locked: false } },
      recruitmentHistory: appendHistory(save, { kind: 'equipment', slot, id: item.id, cost: EQUIPMENT_DRAW_COST })
    }
  };
}
