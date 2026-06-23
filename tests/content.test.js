import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assetManifest, duplicateAssets } from '../src/data/assets.js';
import { AXES, characters } from '../src/data/characters.js';
import { equipment, EQUIPMENT_SLOTS, getEquipmentFit, starterEquipmentIds, starterLoadout } from '../src/data/equipment.js';
import { stages } from '../src/data/stages.js';
import { auditOrthogonality } from '../src/systems/orthogonality.js';
import { auditSimulatedBalance } from '../src/systems/balanceSimulator.js';
import { auditEquipmentOrthogonality } from '../src/systems/equipmentOrthogonality.js';
import { applyStageResult, createDefaultSave, exportSave, importSave, migrateSave } from '../src/systems/storage.js';

describe('campaign content', () => {
  it('defines 50 distinct stages across five chapters', () => {
    expect(stages).toHaveLength(50);
    expect(new Set(stages.map((stage) => stage.id)).size).toBe(50);
    expect(new Set(stages.map((stage) => stage.chapter)).size).toBe(5);
    expect(new Set(stages.map((stage) => `${stage.primaryMechanic}:${stage.secondaryMechanic}`)).size).toBe(50);
  });

  it('gives every stage two mechanics, two tactics and a fair fallback', () => {
    for (const stage of stages) {
      expect(stage.primaryMechanic).toBeTruthy();
      expect(stage.secondaryMechanic).toBeTruthy();
      expect(stage.tactics.length).toBeGreaterThanOrEqual(2);
      expect(new Set(stage.recommendedCharacters).size).toBeGreaterThanOrEqual(2);
      expect(stage.fallback).toContain('미쿠');
      expect(stage.targetSeconds).toBeGreaterThanOrEqual(90);
      expect(stage.targetSeconds).toBeLessThanOrEqual(180);
    }
  });

  it('uses an explicit sequential campaign gate', () => {
    expect(stages[0].unlockRequirement).toBeNull();
    for (let index = 1; index < stages.length; index += 1) {
      expect(stages[index].unlockRequirement.stage).toBe(stages[index - 1].id);
    }
  });
});

describe('orthogonality contract', () => {
  it('gives each character at least two strong axes and one weakness', () => {
    for (const character of characters) {
      const strongAxes = AXES.filter((axis) => character.axes[axis] >= 4);
      expect(strongAxes.length, character.id).toBeGreaterThanOrEqual(2);
      expect(character.weakness.length, character.id).toBeGreaterThan(8);
    }
  });

  it('passes the no-universal-best static audit', () => {
    const result = auditOrthogonality();
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    for (const uses of Object.values(result.usage)) expect(uses).toBeGreaterThanOrEqual(3);
    for (const share of Object.values(result.soloShare)) expect(share).toBeLessThanOrEqual(0.3);
  });

  it('ties signature mechanics to operators whose abilities answer them', () => {
    const byId = Object.fromEntries(stages.map((stage) => [stage.id, stage]));
    expect(byId['1-4'].recommendedCharacters).toContain('nari');
    expect(byId['1-8'].recommendedCharacters).toContain('bibi');
    expect(byId['2-3'].recommendedCharacters).toContain('serin');
    expect(byId['3-6'].recommendedCharacters).toContain('roa');
    expect(byId['4-4'].recommendedCharacters).toContain('jigsaw');
    expect(byId['5-9'].recommendedCharacters).toContain('neko');
  });

  it('keeps all 50 simulated stages multi-solution without a universal winner', () => {
    const result = auditSimulatedBalance();
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
    for (const share of Object.values(result.winnerShare)) expect(share).toBeLessThanOrEqual(0.3);
  });

  it('keeps equipment as bounded tradeoffs in all four slots', () => {
    expect(new Set(equipment.map((item) => item.slot))).toEqual(new Set(EQUIPMENT_SLOTS));
    for (const slot of EQUIPMENT_SLOTS) expect(equipment.filter((item) => item.slot === slot).length).toBeGreaterThanOrEqual(8);
    for (const item of equipment) {
      expect(Object.keys(item.effect).length).toBeGreaterThan(0);
      expect(Object.keys(item.drawback).length).toBeGreaterThan(0);
      expect(item.enhancement.max).toBeLessThanOrEqual(5);
      expect(item.affinity.strong.length).toBeGreaterThanOrEqual(3);
      expect(item.affinity.weak.length).toBeGreaterThanOrEqual(3);
      expect(item.affinity.strong.some((id) => item.affinity.weak.includes(id))).toBe(false);
    }
  });

  it('gives every operator both a best-fit and a truly bad choice in every slot', () => {
    for (const character of characters) {
      for (const slot of EQUIPMENT_SLOTS) {
        const slotItems = equipment.filter((item) => item.slot === slot);
        expect(slotItems.some((item) => getEquipmentFit(item, character.id).tier === 'strong'), `${character.id}/${slot} strong`).toBe(true);
        expect(slotItems.some((item) => getEquipmentFit(item, character.id).tier === 'weak'), `${character.id}/${slot} weak`).toBe(true);
      }
    }
  });

  it('passes the equipment orthogonality audit without a universal best item', () => {
    const audit = auditEquipmentOrthogonality();
    expect(audit.ok).toBe(true);
    expect(audit.issues).toEqual([]);
    expect(Object.values(audit.slotCounts)).toEqual([8, 8, 8, 8]);
  });
});

describe('asset preservation', () => {
  it('uses English-only GLB filenames and matches preserved hashes', () => {
    expect(assetManifest).toHaveLength(13);
    for (const asset of assetManifest) {
      expect(asset.fileName).toMatch(/^[a-z0-9-]+\.glb$/);
      expect(asset.rigProfile).toBe('static-mesh-unrigged');
      expect(asset.requiresRigging).toBe(true);
      const path = resolve('assets-source/characters', asset.fileName);
      const hash = createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
      expect(hash, asset.fileName).toBe(asset.sha256);
      expect(readFileSync(resolve('public/assets/models/characters/runtime', asset.fileName)).byteLength).toBeGreaterThan(0);
    }
    for (const duplicate of duplicateAssets) {
      expect(duplicate.fileName).toMatch(/^[a-z0-9-]+\.glb$/);
      const duplicateHash = createHash('sha256').update(readFileSync(resolve('assets-source/characters', duplicate.fileName))).digest('hex').toUpperCase();
      expect(duplicateHash).toBe(duplicate.sha256);
    }
  });
});

describe('save progression', () => {
  it('round-trips an exported save and fills missing defaults', () => {
    const save = createDefaultSave();
    save.credits = 321;
    expect(importSave(exportSave(save)).credits).toBe(321);
    expect(migrateSave({ version: 1 }).loadout.weapon).toBeTruthy();
    expect(migrateSave({ version: 1, telemetry: { characterRuns: { miku: 3 } } }).telemetry.characterRuns.miku.runs).toBe(3);
  });

  it('starts and migrates with three tactical choices in every equipment slot', () => {
    expect(starterEquipmentIds).toHaveLength(12);
    for (const candidate of [createDefaultSave(), migrateSave({ version: 2, ownedEquipment: {} })]) {
      for (const slot of EQUIPMENT_SLOTS) {
        const ownedInSlot = equipment.filter((item) => item.slot === slot && candidate.ownedEquipment[item.id]);
        expect(ownedInSlot, slot).toHaveLength(3);
      }
    }
  });

  it('grants first-clear rewards once and records telemetry', () => {
    const stage = stages[0];
    const result = { success: true, score: 5000, elapsed: 90, rank: 'silver', characterId: 'miku', loadout: starterLoadout, stats: { damageTaken: 22, breaks: 3 } };
    const first = applyStageResult(createDefaultSave(), stage, result);
    const repeat = applyStageResult(first, stage, result);
    expect(first.credits).toBe(stage.reward.credits + stage.reward.firstClear + 50);
    expect(repeat.credits - first.credits).toBe(stage.reward.credits + 50);
    expect(repeat.telemetry.characterRuns.miku.runs).toBe(2);
    expect(repeat.telemetry.characterRuns.miku.totalBreaks).toBe(6);
    expect(repeat.telemetry.equipmentRuns['pulse-carbine'].runs).toBe(2);
    expect(repeat.telemetry.stageRuns[stage.id].totalDamageTaken).toBe(44);
  });

  it('records failures and grants learning currency without clear rewards', () => {
    const stage = stages[0];
    const result = { success: false, score: 800, elapsed: 32, rank: 'failed', characterId: 'miku', loadout: starterLoadout, stats: { damageTaken: 100, breaks: 1 } };
    const failed = applyStageResult(createDefaultSave(), stage, result);
    expect(failed.credits).toBeGreaterThan(0);
    expect(failed.credits).toBeLessThan(stage.reward.credits);
    expect(failed.parts).toBe(0);
    expect(failed.stages[stage.id].cleared).toBe(false);
    expect(failed.telemetry.stageRuns[stage.id].runs).toBe(1);
    expect(failed.telemetry.stageRuns[stage.id].clears).toBe(0);
  });
});
