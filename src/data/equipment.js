export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'shoes', 'accessory'];

const define = (slot, id, name, description, effect, drawback, cost = 180) => ({
  slot, id, name, description, effect, drawback, enhancement: { max: 5, baseCost: cost, growth: 1.65 }
});

export const equipment = [
  define('weapon', 'pulse-carbine', '공명 카빈', '안정적인 연속 명중으로 표식을 쌓는다.', { fireRate: 0.12, resonance: 1 }, { burstDamage: -0.08 }, 120),
  define('weapon', 'breaker-shot', '해머 셸', '근거리에서 브레이크를 크게 깎는다.', { breakDamage: 0.35, spread: 1 }, { range: -0.22 }),
  define('weapon', 'needle-rail', '니들 레일', '정지 조준 시 약점을 관통한다.', { weakPoint: 0.28, pierce: 1 }, { moveSpeedWhileFiring: -0.2 }),
  define('weapon', 'arc-launcher', '아크 런처', '군집에 튕기는 느린 투사체를 쏜다.', { chainTargets: 2, crowdDamage: 0.2 }, { singleTarget: -0.16 }),
  define('weapon', 'coolant-smg', '쿨런트 SMG', '과열과 화염 장치를 빠르게 식힌다.', { heatControl: 0.45, fireRate: 0.18 }, { armorDamage: -0.12 }),
  define('weapon', 'signal-bow', '시그널 보우', '표식이 있는 적에게 유도되는 충전탄.', { homing: 1, markedDamage: 0.25 }, { unmarkedDamage: -0.14 }),

  define('armor', 'kinetic-weave', '키네틱 위브', '이동 중 받는 탄환 피해를 줄인다.', { movingDamageReduction: 0.18 }, { stationaryDamageTaken: 0.08 }, 140),
  define('armor', 'anchor-plate', '앵커 플레이트', '정지 시 방벽을 생성한다.', { stationaryShield: 24, knockbackResist: 0.5 }, { moveSpeed: -0.1 }),
  define('armor', 'hazard-skin', '해저드 스킨', '장판과 날씨 피해를 줄인다.', { hazardReduction: 0.32 }, { directDamageTaken: 0.08 }),
  define('armor', 'echo-mesh', '에코 메시', '브레이크 직후 짧은 보호막을 얻는다.', { breakShield: 30 }, { maxHp: -0.08 }),
  define('armor', 'triage-vest', '트리아지 베스트', '낮은 체력에서 회복 효율이 오른다.', { lowHpHealing: 0.4 }, { damage: -0.06 }),
  define('armor', 'glass-circuit', '글라스 서킷', '스킬 위력을 크게 올리는 위험한 회로.', { skillPower: 0.3 }, { maxHp: -0.18 }),

  define('shoes', 'vector-boots', '벡터 부츠', '직선 회피 거리를 늘린다.', { dodgeDistance: 0.25 }, { turnRate: -0.12 }, 110),
  define('shoes', 'grip-soles', '그립 솔', '빙판·컨베이어 감속을 무시한다.', { terrainGrip: 1 }, { sprintSpeed: -0.08 }),
  define('shoes', 'phase-step', '페이즈 스텝', '정확한 회피가 투사체를 통과한다.', { perfectDodge: 1 }, { dodgeCooldown: 0.22 }),
  define('shoes', 'relay-runners', '릴레이 러너', '목표물 운반 중 빨라진다.', { objectiveSpeed: 0.3 }, { combatMoveSpeed: -0.07 }),
  define('shoes', 'backdraft-heels', '백드래프트 힐', '회피 자리에 적을 미는 파동을 남긴다.', { dodgeKnockback: 1 }, { dodgeCharges: -1 }),
  define('shoes', 'quiet-tread', '콰이어트 트레드', '탐지되기 전 첫 공격을 강화한다.', { ambushDamage: 0.45 }, { sustainedFire: -0.1 }),

  define('accessory', 'break-metronome', '브레이크 메트로놈', '리듬에 맞춘 사격이 브레이크를 더 준다.', { timedBreak: 0.3 }, { mistimedDamage: -0.08 }, 160),
  define('accessory', 'prism-lens', '프리즘 렌즈', '반사 실드의 방향을 미리 보여준다.', { reflectPreview: 1 }, { critRate: -0.05 }),
  define('accessory', 'rescue-charm', '구조 부적', '호위 대상과 피해를 나누어 받는다.', { escortShare: 0.35 }, { selfHealing: -0.15 }),
  define('accessory', 'storm-dial', '스톰 다이얼', '날씨 변화 직후 스킬이 충전된다.', { weatherCooldown: 0.35 }, { normalCooldown: 0.08 }),
  define('accessory', 'core-compass', '코어 컴퍼스', '보이지 않는 약점의 방향을 표시한다.', { hiddenWeakPoint: 1 }, { bodyDamage: -0.1 }),
  define('accessory', 'risk-battery', '리스크 배터리', '보호막이 없을 때 공격력이 오른다.', { noShieldDamage: 0.26 }, { shieldEfficiency: -0.25 })
];

export const equipmentById = Object.fromEntries(equipment.map((item) => [item.id, item]));

export const starterLoadout = {
  weapon: 'pulse-carbine',
  armor: 'kinetic-weave',
  shoes: 'vector-boots',
  accessory: 'break-metronome'
};
