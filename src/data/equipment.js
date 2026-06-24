export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'shoes', 'accessory'];

export const EQUIPMENT_FIT = {
  strong: { label: '최적 공명', effectScale: 1.8, drawbackScale: 0.7 },
  neutral: { label: '중립', effectScale: 1, drawbackScale: 1 },
  weak: { label: '역상성', effectScale: 0.15, drawbackScale: 2 }
};

const affinity = (strong, weak, strongReason, weakReason) => ({ strong, weak, strongReason, weakReason });
const define = (slot, id, name, description, effect, drawback, characterAffinity, cost = 180) => ({
  slot, id, name, description, effect, drawback, affinity: characterAffinity,
  enhancement: { max: 5, baseCost: cost, growth: 1.65 }
});

export const equipment = [
  define('weapon', 'pulse-carbine', '공명 카빈', '연속 명중과 이동 사격에 특화된 고속 카빈.', { fireRate: 0.12, resonance: 1 }, { burstDamage: -0.08 },
    affinity(['miku', 'serin', 'jigsaw', 'neko'], ['roa', 'lumi', 'sora'], '연속 명중 패시브를 빠르게 순환시킨다.', '느린 단발 구조라 연사 이득은 작고 순간 화력만 잃는다.'), 120),
  define('weapon', 'breaker-shot', '해머 셸', '근거리에서 브레이크를 크게 깎는 확산탄.', { breakDamage: 0.35, spread: 1 }, { range: -0.22 },
    affinity(['bibi', 'marin', 'sora'], ['roa', 'noir', 'nari'], '근접 폭발·산탄·중화기 브레이크를 증폭한다.', '거리와 정밀 운용을 망가뜨려 핵심 장점을 잃는다.')),
  define('weapon', 'needle-rail', '니들 레일', '정지 조준 시 약점을 관통하는 정밀 레일.', { weakPoint: 0.28, pierce: 1 }, { moveSpeedWhileFiring: -0.2 },
    affinity(['roa', 'noir', 'yura'], ['bibi', 'marin', 'neko'], '약점·후방·충전 사격을 한 발에 겹친다.', '이동·확산 사격 캐릭터에게 정지 페널티만 남는다.')),
  define('weapon', 'arc-launcher', '아크 런처', '군집 사이를 연쇄하는 느린 공명탄.', { chainTargets: 2, crowdDamage: 0.2 }, { singleTarget: -0.16 },
    affinity(['bibi', 'miku', 'mora', 'lumi'], ['roa', 'noir', 'yura'], '폭발·연쇄·제어 필드가 군집에서 중첩된다.', '단일 약점 처형의 피해 집중을 크게 훼손한다.')),
  define('weapon', 'coolant-smg', '쿨런트 SMG', '과열을 억제하며 쏟아붓는 냉각 기관단총.', { heatControl: 0.45, fireRate: 0.18 }, { armorDamage: -0.12 },
    affinity(['neko', 'serin', 'miku', 'jigsaw'], ['roa', 'lumi', 'sora'], '고연사 패시브와 과열 제한을 동시에 해결한다.', '중화기와 정밀 단발은 냉각 이득 없이 장갑 피해만 잃는다.')),
  define('weapon', 'signal-bow', '시그널 보우', '표식이 있는 적을 추적하는 유도 충전탄.', { homing: 1, markedDamage: 0.25 }, { unmarkedDamage: -0.14 },
    affinity(['nari', 'yura', 'mora'], ['marin', 'sora', 'serin'], '자체 표식과 제어 상태를 유도 피해로 환산한다.', '표식을 안정적으로 만들지 못해 상시 피해 감소를 받는다.')),
  define('weapon', 'tempo-lance', '템포 랜스', '연사력을 버리고 한 발의 사거리와 파괴력을 극대화한다.', { damage: 0.42, range: 0.18 }, { fireRate: -0.35 },
    affinity(['roa', 'noir', 'lumi'], ['miku', 'mora', 'jigsaw', 'neko', 'serin', 'marin'], '느린 단발의 기본 계수와 충전 창을 폭발적으로 키운다.', '연속 명중·제어 누적·산탄 캐릭터의 핵심 발사 횟수를 붕괴시킨다.'), 220),
  define('weapon', 'orbit-sprayer', '오비트 스프레이어', '사거리 대신 끊임없는 탄막과 군집 압박을 만든다.', { fireRate: 0.38, crowdDamage: 0.22 }, { range: -0.3, breakDamage: -0.15 },
    affinity(['miku', 'neko', 'serin', 'jigsaw'], ['roa', 'noir', 'lumi', 'sora'], '연속 적중·드론·회복 탄환 발동 횟수를 급격히 늘린다.', '긴 사거리와 한 발 브레이크를 모두 희생한다.'), 220),

  define('armor', 'kinetic-weave', '키네틱 위브', '계속 움직일 때 탄환 충격을 흘리는 경량 위브.', { movingDamageReduction: 0.18 }, { stationaryDamageTaken: 0.08 },
    affinity(['miku', 'neko', 'marin', 'yura'], ['lumi', 'sora', 'roa'], '이동 패시브를 유지하는 동안 생존력이 크게 오른다.', '정지 사격과 거점 방어에서는 오히려 피해가 증가한다.'), 140),
  define('armor', 'anchor-plate', '앵커 플레이트', '정지 시 보호막과 넉백 저항을 얻는 중장갑.', { stationaryShield: 24, knockbackResist: 0.5 }, { moveSpeed: -0.1 },
    affinity(['sora', 'lumi', 'roa', 'jigsaw'], ['neko', 'noir', 'yura', 'marin'], '정지 방어·정밀 사격의 안전 시간을 만든다.', '기동 패시브가 끊기고 회피 거리가 사실상 무력화된다.')),
  define('armor', 'hazard-skin', '해저드 스킨', '장판과 날씨 피해를 흡수하는 환경 대응 외피.', { hazardReduction: 0.32 }, { directDamageTaken: 0.08 },
    affinity(['serin', 'lumi', 'nari'], ['noir', 'yura', 'neko'], '정화·지역 방어와 결합해 위험 지대를 거점으로 바꾼다.', '빠른 암살자는 장판을 피하고 직접탄 페널티만 받는다.')),
  define('armor', 'echo-mesh', '에코 메시', '브레이크 직후 임시 보호막을 생성한다.', { breakShield: 30 }, { maxHp: -0.08 },
    affinity(['bibi', 'marin', 'sora', 'mora'], ['serin', 'nari', 'noir'], '높은 브레이크 빈도를 즉시 생존 자원으로 바꾼다.', '브레이크가 느려 최대 체력 감소를 회수하지 못한다.')),
  define('armor', 'triage-vest', '트리아지 베스트', '위기 상태의 자가 회복을 크게 증폭한다.', { lowHpHealing: 0.4 }, { damage: -0.06 },
    affinity(['serin', 'sora', 'lumi'], ['noir', 'bibi', 'yura'], '회복과 높은 체력으로 저체력 구간을 안정적으로 이용한다.', '낮은 체력의 공격형 캐릭터는 회복 전에 화력만 잃는다.')),
  define('armor', 'glass-circuit', '글라스 서킷', '체력을 태워 액티브 스킬 출력을 증폭한다.', { skillPower: 0.3 }, { maxHp: -0.18 },
    affinity(['nari', 'mora', 'lumi', 'jigsaw'], ['sora', 'marin', 'neko'], '제어·지원·필드 스킬의 범용 가치를 크게 키운다.', '근접전과 체력 탱킹에서 치명적인 최대 체력 손실만 남는다.')),
  define('armor', 'aegis-reactor', '이지스 리액터', '기동성을 희생해 체력과 충격 저항을 극대화한다.', { maxHp: 0.25, knockbackResist: 0.6 }, { moveSpeed: -0.18, skillPower: -0.1 },
    affinity(['sora', 'lumi', 'mora'], ['miku', 'noir', 'yura', 'neko'], '저기동 탱커와 거점형의 버티기 축을 완성한다.', '속도 기반 캐릭터의 패시브와 스킬 회전을 동시에 망친다.'), 230),
  define('armor', 'overclock-shell', '오버클록 셸', '피격 위험을 감수하고 공격과 스킬을 과충전한다.', { damage: 0.2, skillPower: 0.18 }, { directDamageTaken: 0.25, maxHp: -0.15 },
    affinity(['bibi', 'yura', 'noir'], ['serin', 'sora', 'lumi', 'mora', 'jigsaw'], '짧은 폭딜 창에 모든 보너스를 몰아 넣는다.', '장기 생존·제어 준비·회복 효율을 무너뜨려 역할 자체와 충돌한다.'), 230),

  define('shoes', 'vector-boots', '벡터 부츠', '직선 회피 거리를 늘리는 가속 부츠.', { dodgeDistance: 0.25 }, { turnRate: -0.12 },
    affinity(['miku', 'noir', 'yura', 'neko'], ['lumi', 'sora', 'mora'], '대시·추격·이동 사격의 간극을 넓힌다.', '저기동 제어형은 방향 전환 손해를 감당하지 못한다.'), 110),
  define('shoes', 'grip-soles', '그립 솔', '빙판·컨베이어·중력 이동을 붙잡는다.', { terrainGrip: 1 }, { sprintSpeed: -0.08 },
    affinity(['marin', 'nari', 'jigsaw'], ['noir', 'yura', 'neko'], '지형 기믹과 상호작용 경로를 안정화한다.', '지형을 속도로 넘기는 캐릭터에게 가속 손실만 남는다.')),
  define('shoes', 'phase-step', '페이즈 스텝', '정확한 회피가 투사체를 통과한다.', { perfectDodge: 1 }, { dodgeCooldown: 0.22 },
    affinity(['roa', 'noir', 'yura'], ['bibi', 'sora', 'lumi', 'serin'], '한 번의 정밀 회피로 취약한 사격 창을 보존한다.', '폭파·버티기형은 긴 회피 재사용 때문에 생존 리듬이 끊긴다.')),
  define('shoes', 'relay-runners', '릴레이 러너', '목표물 운반과 점령 속도를 끌어올린다.', { objectiveSpeed: 0.3 }, { combatMoveSpeed: -0.07 },
    affinity(['nari', 'serin', 'neko', 'miku'], ['sora', 'lumi', 'roa'], '기동·지원 능력을 곧바로 목표 진행 속도로 전환한다.', '정지 사격·방어 캐릭터는 교전 이동만 느려진다.')),
  define('shoes', 'backdraft-heels', '백드래프트 힐', '회피 자리에 적을 밀치는 파동을 남긴다.', { dodgeKnockback: 1 }, { dodgeCharges: -1 },
    affinity(['marin', 'sora', 'bibi'], ['roa', 'nari', 'lumi'], '근접 브레이크와 넉백 제어를 회피에 겹친다.', '거리 유지형은 적을 흩뜨리고 회피 여유까지 잃는다.')),
  define('shoes', 'quiet-tread', '콰이어트 트레드', '첫 타격과 후방 기습을 증폭한다.', { ambushDamage: 0.45 }, { sustainedFire: -0.1 },
    affinity(['yura', 'noir', 'roa'], ['serin', 'sora', 'mora', 'jigsaw'], '첫 약점·후방 일격을 처형기로 바꾼다.', '지속 사격과 제어·장치 누적이 필요한 캐릭터의 화력이 감소한다.')),
  define('shoes', 'hover-fins', '호버 핀', '정지 방어를 포기하고 이동과 회피를 과가속한다.', { moveSpeed: 0.18, dodgeDistance: 0.18 }, { stationaryDamageTaken: 0.2 },
    affinity(['marin', 'neko', 'noir', 'yura'], ['lumi', 'sora', 'mora'], '기동 패시브와 회피 공격을 상시 강화한다.', '거점에 서는 순간 큰 추가 피해를 받아 역할이 붕괴한다.'), 210),
  define('shoes', 'root-spikes', '루트 스파이크', '발을 고정해 방벽과 충격 저항을 만든다.', { stationaryShield: 36, knockbackResist: 0.6 }, { moveSpeed: -0.22, dodgeCooldown: 0.2 },
    affinity(['sora', 'lumi', 'roa', 'mora', 'jigsaw'], ['miku', 'neko', 'marin', 'noir'], '정지 포격·제어·장치 운용·호위 방벽을 완성한다.', '속도와 회피를 모두 요구하는 캐릭터에게 최악의 족쇄다.'), 210),

  define('accessory', 'break-metronome', '브레이크 메트로놈', '박자에 맞춘 사격의 브레이크를 증폭한다.', { timedBreak: 0.3 }, { mistimedDamage: -0.08 },
    affinity(['miku', 'bibi', 'marin', 'sora', 'mora'], ['neko', 'serin', 'nari'], '공명 리듬·느린 강타·제어 사격은 박자를 안정적으로 맞춘다.', '고연사는 박자를 통제하지 못해 피해 감소가 누적된다.'), 160),
  define('accessory', 'prism-lens', '프리즘 렌즈', '반사 방향과 정밀 타격 창을 미리 보여준다.', { reflectPreview: 1, weakPoint: 0.16 }, { critRate: -0.05 },
    affinity(['roa', 'noir', 'jigsaw'], ['bibi', 'marin', 'neko'], '정밀 사격과 장치 해석에 약점 창을 더한다.', '확산·고연사 캐릭터는 약점 창을 활용하지 못한다.')),
  define('accessory', 'rescue-charm', '구조 부적', '호위·방어 중 피해를 분담한다.', { escortShare: 0.35 }, { selfHealing: -0.15 },
    affinity(['serin', 'sora', 'nari'], ['yura', 'noir', 'neko'], '지원과 탱킹을 목표물 생존으로 직접 변환한다.', '단독 기습·추격에서는 자가 회복만 잃는다.')),
  define('accessory', 'storm-dial', '스톰 다이얼', '날씨·위험장 변화 직후 스킬을 앞당긴다.', { weatherCooldown: 0.35 }, { normalCooldown: 0.08 },
    affinity(['nari', 'lumi', 'jigsaw', 'mora'], ['roa', 'marin', 'neko'], '환경 기믹이 잦을수록 제어 스킬을 반복한다.', '환경 연계가 없는 공격형은 재사용 대기시간만 길어진다.')),
  define('accessory', 'core-compass', '코어 컴퍼스', '숨은 약점과 순서를 드러낸다.', { hiddenWeakPoint: 1, weakPoint: 0.14 }, { bodyDamage: -0.1 },
    affinity(['roa', 'nari', 'noir'], ['bibi', 'marin', 'sora'], '탐지와 정밀 약점 사격을 확정적인 해법으로 만든다.', '몸통·광역 공격은 약점을 못 맞혀 피해만 감소한다.')),
  define('accessory', 'risk-battery', '리스크 배터리', '보호막이 없을 때 공격 출력을 높인다.', { noShieldDamage: 0.26 }, { shieldEfficiency: -0.25 },
    affinity(['yura', 'noir', 'bibi', 'neko'], ['serin', 'sora', 'lumi', 'mora', 'jigsaw'], '피격 전에 끝내는 폭딜과 기동전에 어울린다.', '보호막·제어 준비·회복으로 버티는 역할의 생존 구조를 파괴한다.')),
  define('accessory', 'echo-prism', '에코 프리즘', '기본 사격을 희생해 스킬 출력을 집중시킨다.', { skillPower: 0.45 }, { damage: -0.15, normalCooldown: 0.08 },
    affinity(['lumi', 'mora', 'nari', 'serin'], ['neko', 'marin', 'roa'], '필드·제어·회복 스킬을 주력 무기로 바꾼다.', '사격 중심 캐릭터는 기본 화력과 회전율을 함께 잃는다.'), 220),
  define('accessory', 'execution-seal', '집행 인장', '약점과 브레이크 창에만 화력을 집중한다.', { weakPoint: 0.45, breakDamage: 0.15 }, { unmarkedDamage: -0.25 },
    affinity(['roa', 'yura', 'noir'], ['miku', 'bibi', 'serin', 'marin', 'sora'], '정밀 처형 캐릭터의 짧은 창을 극단적으로 증폭한다.', '광역·몸통·지속 사격은 대부분의 공격이 감산된다.'), 220)
];

export const equipmentById = Object.fromEntries(equipment.map((item) => [item.id, item]));

export function equipmentUpgradeCost(item, level) {
  return {
    credits: Math.round(item.enhancement.baseCost * item.enhancement.growth ** level),
    parts: 1 + Math.floor(level / 2)
  };
}

export function getEquipmentFit(item, characterId) {
  const tier = item.affinity.strong.includes(characterId) ? 'strong' : item.affinity.weak.includes(characterId) ? 'weak' : 'neutral';
  const reason = tier === 'strong' ? item.affinity.strongReason : tier === 'weak' ? item.affinity.weakReason : '핵심 패시브를 증폭하지도, 방해하지도 않는다.';
  return { tier, reason, ...EQUIPMENT_FIT[tier] };
}

export const starterLoadout = {
  weapon: 'pulse-carbine',
  armor: 'kinetic-weave',
  shoes: 'vector-boots',
  accessory: 'break-metronome'
};

export const starterEquipmentIds = [
  'pulse-carbine', 'breaker-shot', 'needle-rail',
  'kinetic-weave', 'anchor-plate', 'glass-circuit',
  'vector-boots', 'grip-soles', 'relay-runners',
  'break-metronome', 'core-compass', 'risk-battery'
];
