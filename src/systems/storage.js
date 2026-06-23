import { starterEquipmentIds, starterLoadout } from '../data/equipment.js';

export const SAVE_KEY = 'mikutps.save';
export const SAVE_VERSION = 3;

export function createDefaultSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    credits: 0,
    parts: 0,
    selectedCharacter: 'miku',
    unlockedCharacters: ['miku'],
    ownedEquipment: Object.fromEntries(starterEquipmentIds.map((id) => [id, { level: 0, locked: true }])),
    loadout: { ...starterLoadout },
    stages: {},
    settings: { quality: 'auto', aimAssist: 0.55, autoFire: true, screenShake: 0.7, audio: 0.8, haptics: true },
    telemetry: { characterRuns: {}, equipmentRuns: {}, stageRuns: {} }
  };
}

export function migrateSave(value) {
  if (!value || typeof value !== 'object') return createDefaultSave();
  if (!value.version || value.version > SAVE_VERSION) return createDefaultSave();
  const telemetry = value.telemetry ?? {};
  return {
    ...createDefaultSave(),
    ...value,
    version: SAVE_VERSION,
    ownedEquipment: { ...createDefaultSave().ownedEquipment, ...value.ownedEquipment },
    loadout: { ...starterLoadout, ...value.loadout },
    settings: { ...createDefaultSave().settings, ...value.settings },
    telemetry: {
      characterRuns: normalizeRunMap(telemetry.characterRuns),
      equipmentRuns: normalizeRunMap(telemetry.equipmentRuns),
      stageRuns: normalizeRunMap(telemetry.stageRuns)
    }
  };
}

function normalizeRunMap(map = {}) {
  return Object.fromEntries(Object.entries(map).map(([id, value]) => [
    id,
    typeof value === 'number'
      ? { runs: value, clears: value, totalScore: 0, totalTime: 0, totalDamageTaken: 0, totalBreaks: 0 }
      : { runs: 0, clears: 0, totalScore: 0, totalTime: 0, totalDamageTaken: 0, totalBreaks: 0, ...value }
  ]));
}

export function loadSave(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    return raw ? migrateSave(JSON.parse(raw)) : createDefaultSave();
  } catch {
    return createDefaultSave();
  }
}

export function persistSave(save, storage = globalThis.localStorage) {
  const next = { ...save, updatedAt: Date.now() };
  storage?.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

export function exportSave(save) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(save))));
}

export function importSave(encoded) {
  const decoded = decodeURIComponent(escape(atob(encoded.trim())));
  return migrateSave(JSON.parse(decoded));
}

export function applyStageResult(save, stage, result) {
  const previous = save.stages[stage.id];
  const success = result.success !== false;
  const firstClear = success && !previous?.cleared;
  const credits = success
    ? stage.reward.credits + (firstClear ? stage.reward.firstClear : 0) + Math.floor(result.score / 100)
    : Math.max(15, Math.floor(stage.reward.credits * 0.22 + result.score / 250));
  const telemetry = {
    characterRuns: { ...save.telemetry.characterRuns },
    equipmentRuns: { ...save.telemetry.equipmentRuns },
    stageRuns: { ...save.telemetry.stageRuns }
  };
  telemetry.characterRuns[result.characterId] = accumulateRun(telemetry.characterRuns[result.characterId], result, success);
  telemetry.stageRuns[stage.id] = accumulateRun(telemetry.stageRuns[stage.id], result, success);
  for (const equipmentId of Object.values(result.loadout ?? {})) {
    telemetry.equipmentRuns[equipmentId] = accumulateRun(telemetry.equipmentRuns[equipmentId], result, success);
  }

  const stageRecord = {
    ...previous,
    cleared: Boolean(previous?.cleared || success),
    attempts: (previous?.attempts ?? 0) + 1,
    lastScore: result.score,
    lastSuccess: success
  };
  if (success) {
    stageRecord.bestScore = Math.max(previous?.bestScore ?? 0, result.score);
    stageRecord.bestTime = Math.min(previous?.bestTime ?? Number.MAX_SAFE_INTEGER, result.elapsed);
    stageRecord.rank = betterRank(previous?.rank, result.rank);
  }
  return persistSave({
    ...save,
    credits: save.credits + credits,
    parts: save.parts + (success ? stage.reward.parts : 0),
    stages: {
      ...save.stages,
      [stage.id]: stageRecord
    },
    telemetry
  });
}

function accumulateRun(current, result, success) {
  const normalized = typeof current === 'number'
    ? { runs: current, clears: current, totalScore: 0, totalTime: 0, totalDamageTaken: 0, totalBreaks: 0 }
    : { runs: 0, clears: 0, totalScore: 0, totalTime: 0, totalDamageTaken: 0, totalBreaks: 0, ...current };
  return {
    runs: normalized.runs + 1,
    clears: normalized.clears + Number(success),
    totalScore: normalized.totalScore + result.score,
    totalTime: normalized.totalTime + result.elapsed,
    totalDamageTaken: normalized.totalDamageTaken + (result.stats?.damageTaken ?? 0),
    totalBreaks: normalized.totalBreaks + (result.stats?.breaks ?? 0)
  };
}

function betterRank(previous, next) {
  const order = { bronze: 1, silver: 2, gold: 3 };
  return (order[next] ?? 0) > (order[previous] ?? 0) ? next : previous ?? next;
}
