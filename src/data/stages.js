import { characters } from './characters.js';
import { stageDemands } from './stage-demands.js';

const blueprints = [
  ['1-1', '첫 박자', 'resonance-gates', 'slow-drones', '공명 게이트 3개를 통과하며 드론을 소탕한다.', 'neon-rooftop', 'drone'],
  ['1-2', '엇박자 사격장', 'rhythm-shields', 'moving-cover', '방패가 열리는 박자에만 코어를 타격한다.', 'training-deck', 'guard'],
  ['1-3', '갈라지는 골목', 'forked-route', 'rear-spawns', '좌우 경로 중 하나를 택해 증폭기를 파괴한다.', 'city-alley', 'swarm'],
  ['1-4', '신호 속의 길', 'hidden-beacons', 'fog-pulses', '신호 펄스로 안개 속 비콘을 찾아 활성화한다.', 'mist-plaza', 'stalker'],
  ['1-5', '컨베이어 블루스', 'conveyor-floor', 'armored-fronts', '이동 바닥에서 적의 측후면을 공격한다.', 'cargo-line', 'guard'],
  ['1-6', '두 개의 템포', 'split-objectives', 'alternating-buffs', '두 증폭기의 과부하를 번갈아 억제한다.', 'power-yard', 'drone'],
  ['1-7', '유리 다리', 'fragile-floor', 'knockback-waves', '무너지는 발판과 충격파를 피해 건넌다.', 'skybridge', 'brute'],
  ['1-8', '밀집 신호', 'cluster-break', 'chain-explosions', '군집 코어를 연쇄 폭발로 정리한다.', 'signal-vault', 'swarm'],
  ['1-9', '푸른 추격선', 'moving-target', 'checkpoint-combo', '도주 드론을 체크포인트 전에 저지한다.', 'highway', 'runner'],
  ['1-10', '지휘 드론 아리아', 'boss-command-links', 'break-interrupt', '지휘 연결을 끊고 합창 드론을 브레이크한다.', 'concert-dome', 'boss-conductor'],

  ['2-1', '빗속의 잔향', 'rain-visibility', 'conductive-puddles', '번개가 치기 전 물웅덩이에서 벗어난다.', 'rain-port', 'shooter'],
  ['2-2', '반사 회랑', 'reflective-walls', 'ricochet-shots', '벽 반사를 이용해 엄폐한 코어를 맞힌다.', 'mirror-hall', 'guard'],
  ['2-3', '오염 제로', 'toxin-zones', 'cleanse-stations', '오염도를 관리하며 정화 장치를 지킨다.', 'bio-lab', 'spore'],
  ['2-4', '잠긴 수문', 'water-level', 'floating-mines', '수위를 바꿔 길을 열고 기뢰를 제거한다.', 'floodgate', 'mine'],
  ['2-5', '붉은 탐조등', 'stealth-cones', 'alarm-reinforcements', '탐조등을 피해 제어기를 무력화한다.', 'warehouse', 'sentinel'],
  ['2-6', '자기 폭풍', 'magnetic-pull', 'metal-projectiles', '자기장 방향을 읽어 투사체를 흘린다.', 'magnet-core', 'shooter'],
  ['2-7', '역류하는 탄막', 'projectile-reversal', 'timed-safe-lanes', '반전 펄스에 맞춰 안전선을 이동한다.', 'turbine-room', 'turret'],
  ['2-8', '바닥 없는 정원', 'aerial-gaps', 'ground-shock', '공중 발판을 건너며 지상 충격파를 피한다.', 'hanging-garden', 'brute'],
  ['2-9', '과열 임계점', 'weapon-overheat', 'coolant-nodes', '사격 열을 냉각 노드와 교대로 관리한다.', 'furnace', 'armor'],
  ['2-10', '철갑 미노타우로스', 'boss-directional-armor', 'charge-walls', '돌진을 벽에 유도해 후방 코어를 노출한다.', 'foundry-ring', 'boss-minotaur'],

  ['3-1', '백색 소음', 'audio-cues', 'invisible-shots', '소리와 파동으로 보이지 않는 사격을 판독한다.', 'silent-grid', 'stalker'],
  ['3-2', '마리오네트 망', 'enemy-links', 'shared-damage', '강화 연결 순서를 끊어 적 네트워크를 해체한다.', 'thread-theater', 'linked'],
  ['3-3', '압축실', 'shrinking-arena', 'expanding-enemies', '좁아지는 공간에서 팽창 적을 우선 제거한다.', 'compressor', 'swarm'],
  ['3-4', '세 개의 열쇠', 'ordered-switches', 'false-switches', '적 표식 순서대로 스위치를 작동한다.', 'cipher-vault', 'guard'],
  ['3-5', '얼어붙은 박자', 'ice-inertia', 'falling-icicles', '미끄러짐을 이용해 낙빙 구간을 통과한다.', 'ice-cavern', 'shooter'],
  ['3-6', '먼 곳의 점', 'sequential-weakpoints', 'range-falloff', '거리별 약점을 순서대로 저격한다.', 'long-causeway', 'sniper'],
  ['3-7', '그림자 복제', 'enemy-clones', 'true-core-flash', '순간 점멸로 진짜 적을 찾아낸다.', 'holo-stage', 'clone'],
  ['3-8', '운반자', 'carry-core', 'one-hand-fire', '에너지 코어를 운반하며 제한 사격으로 버틴다.', 'relay-tunnel', 'runner'],
  ['3-9', '시간의 틈', 'slow-fast-zones', 'desynced-telegraphs', '시간대별 서로 다른 텔레그래프 속도를 읽는다.', 'chrono-lab', 'shooter'],
  ['3-10', '조수의 여왕', 'boss-tide-cycles', 'floating-platforms', '밀물과 썰물에 맞춰 약점 높이를 바꾼다.', 'tidal-arena', 'boss-tide'],

  ['4-1', '깨진 중력', 'gravity-rotation', 'falling-debris', '중력 방향 전환마다 새로운 엄폐를 이용한다.', 'gravity-spire', 'brute'],
  ['4-2', '살아 있는 벽', 'maze-mutation', 'crush-corridors', '변형 미로의 호흡을 읽고 탈출한다.', 'living-maze', 'swarm'],
  ['4-3', '에너지 세금', 'skill-tax', 'refund-targets', '스킬 에너지를 소모해 문을 열고 환급 적을 처치한다.', 'bank-core', 'armor'],
  ['4-4', '패치워크 시티', 'rewire-nodes', 'hostile-turrets', '모든 노드를 재배선해 포탑을 아군으로 전환한다.', 'circuit-city', 'turret'],
  ['4-5', '역풍', 'directional-wind', 'curved-projectiles', '바람에 휘는 탄도를 이용해 엄폐 뒤를 공격한다.', 'wind-farm', 'shooter'],
  ['4-6', '깨지지 않는 행렬', 'formation-armor', 'captain-swaps', '대형의 지휘자를 찾아 방어 진형을 붕괴시킨다.', 'parade-ground', 'linked'],
  ['4-7', '빛을 밟는 법', 'light-platforms', 'shadow-damage', '움직이는 빛 안에서만 안전하게 전진한다.', 'eclipse-hall', 'stalker'],
  ['4-8', '꼬리를 잡아라', 'rear-core-only', 'homing-salvos', '추적탄을 교란하며 고속 적의 후방을 노린다.', 'spiral-track', 'runner'],
  ['4-9', '취약한 동맹', 'escort-drone', 'repair-or-shoot', '수리와 사격을 선택하며 드론을 호위한다.', 'service-rail', 'swarm'],
  ['4-10', '천공의 심판자', 'boss-air-ground-shift', 'lightning-rods', '비행·지상 형태에 맞춰 피뢰침을 활용한다.', 'storm-altar', 'boss-angel'],

  ['5-1', '기억의 잔상', 'replay-ghosts', 'delayed-hazards', '이전 이동 경로를 복제하는 위험을 피한다.', 'memory-lane', 'clone'],
  ['5-2', '잠들지 않는 방', 'endless-defense', 'sleep-zones', '안전 수면장을 옮기며 제한 시간 방어한다.', 'dream-vault', 'swarm'],
  ['5-3', '탄환 한 줌', 'limited-ammo', 'melee-refill', '제한 탄약을 약점 처치로 회수한다.', 'dry-magazine', 'armor'],
  ['5-4', '두 세계', 'phase-toggle', 'phase-specific-enemies', '현실과 공명상을 전환해 서로 다른 적을 처리한다.', 'phase-bridge', 'specter'],
  ['5-5', '무너지는 도시', 'destruction-chain', 'civilian-zones', '연쇄 붕괴를 민간 구역 밖으로 유도한다.', 'collapse-city', 'brute'],
  ['5-6', '마지막 구호선', 'multi-escort', 'split-pressure', '두 구조정을 번갈아 보호해 모두 탈출시킨다.', 'evacuation-port', 'shooter'],
  ['5-7', '역상성 실험', 'damage-type-rotation', 'weapon-lock', '변하는 내성에 맞춰 환경 장치를 무기로 쓴다.', 'spectrum-lab', 'adaptive'],
  ['5-8', '제로 시야', 'total-darkness', 'muzzle-reveal', '사격 순간만 드러나는 길과 적을 기억한다.', 'blackout-core', 'stalker'],
  ['5-9', '멈추면 잡힌다', 'permanent-pursuit', 'combo-checkpoints', '추격자를 따돌리며 모든 체크포인트를 잇는다.', 'escape-line', 'runner'],
  ['5-10', '공명 종결 프로토콜', 'boss-rule-remix', 'character-swap-windows', '학습한 규칙을 조합해 코어의 세 형태를 공략한다.', 'resonance-core', 'boss-finale']
];

const chapterNames = ['신호의 시작', '폭풍의 항구', '뒤틀린 박자', '규칙의 바깥', '종결 프로토콜'];
const palette = ['#53f6d6', '#5fb8ff', '#b68cff', '#ff7fb7', '#ffd166'];
const stageSolutions = {
  '1-1': ['miku', 'nari', 'neko'], '1-2': ['miku', 'roa', 'bibi'], '1-3': ['neko', 'yura', 'noir'],
  '1-4': ['nari', 'roa', 'mora'], '1-5': ['marin', 'neko', 'yura'], '1-6': ['nari', 'mora', 'jigsaw'],
  '1-7': ['miku', 'sora', 'serin'], '1-8': ['bibi', 'mora', 'miku'], '1-9': ['neko', 'noir', 'yura'],
  '1-10': ['mora', 'bibi', 'sora'],
  '2-1': ['serin', 'marin', 'lumi'], '2-2': ['roa', 'yura', 'jigsaw'], '2-3': ['serin', 'lumi', 'nari'],
  '2-4': ['marin', 'jigsaw', 'bibi'], '2-5': ['yura', 'marin', 'neko'], '2-6': ['sora', 'bibi', 'mora'],
  '2-7': ['marin', 'serin', 'miku'], '2-8': ['noir', 'neko', 'marin'], '2-9': ['serin', 'jigsaw', 'miku'],
  '2-10': ['yura', 'sora', 'bibi'],
  '3-1': ['nari', 'roa', 'lumi'], '3-2': ['mora', 'jigsaw', 'bibi'], '3-3': ['lumi', 'bibi', 'sora'],
  '3-4': ['roa', 'jigsaw', 'miku'], '3-5': ['marin', 'neko', 'miku'], '3-6': ['roa', 'noir', 'nari'],
  '3-7': ['marin', 'yura', 'mora'], '3-8': ['sora', 'serin', 'neko'], '3-9': ['miku', 'roa', 'lumi'],
  '3-10': ['marin', 'noir', 'sora'],
  '4-1': ['noir', 'sora', 'bibi'], '4-2': ['nari', 'neko', 'jigsaw'], '4-3': ['jigsaw', 'serin', 'miku'],
  '4-4': ['jigsaw', 'nari', 'mora'], '4-5': ['roa', 'bibi', 'noir'], '4-6': ['mora', 'bibi', 'roa'],
  '4-7': ['lumi', 'noir', 'neko'], '4-8': ['yura', 'neko', 'noir'], '4-9': ['sora', 'serin', 'nari'],
  '4-10': ['noir', 'marin', 'roa'],
  '5-1': ['neko', 'yura', 'miku'], '5-2': ['lumi', 'serin', 'sora'], '5-3': ['roa', 'yura', 'bibi'],
  '5-4': ['lumi', 'mora', 'jigsaw'], '5-5': ['bibi', 'sora', 'jigsaw'], '5-6': ['sora', 'serin', 'nari'],
  '5-7': ['jigsaw', 'miku', 'mora'], '5-8': ['nari', 'roa', 'lumi'], '5-9': ['neko', 'noir', 'yura'],
  '5-10': ['miku', 'mora', 'sora']
};

export const stages = blueprints.map((entry, index) => {
  const [id, title, primaryMechanic, secondaryMechanic, objective, arena, enemyTheme] = entry;
  const chapterIndex = Math.floor(index / 10);
  const [first, second, third] = stageSolutions[id].map((characterId) => characters.find((character) => character.id === characterId));
  const isBoss = id.endsWith('-10');
  return {
    id,
    index: index + 1,
    chapter: chapterIndex + 1,
    chapterName: chapterNames[chapterIndex],
    title,
    primaryMechanic,
    secondaryMechanic,
    objective,
    arena,
    enemyTheme,
    demands: stageDemands[id],
    color: palette[chapterIndex],
    targetSeconds: Math.min(180, 95 + chapterIndex * 14 + (index % 10) * 4),
    difficultyBudget: 10 + index * 2 + (isBoss ? 8 : 0),
    waves: isBoss ? 3 : 2 + Math.floor((index % 10) / 3),
    enemyCount: isBoss ? 1 : 5 + chapterIndex * 2 + (index % 5),
    recommendedCharacters: [first.id, second.id, third.id],
    discouragedAxes: index % 2 === 0 ? ['low-mobility'] : ['short-range'],
    tactics: [
      { characterId: first.id, label: `${first.name}의 ${first.strengths[0]} 활용` },
      { characterId: second.id, label: `${second.name}의 ${second.strengths[1]} 활용` }
    ],
    fallback: `미쿠의 공명 표식을 ${primaryMechanic} 타이밍에 모아 저효율 대체 공략`,
    reward: { credits: 140 + index * 18, parts: 1 + Math.floor(index / 8), firstClear: 220 + index * 24 },
    scoreTargets: { bronze: 3500 + index * 80, silver: 5200 + index * 95, gold: 7000 + index * 110 },
    unlockRequirement: index === 0 ? null : { stage: blueprints[index - 1][0], minRank: 'bronze' },
    boss: isBoss
  };
});

export const stageById = Object.fromEntries(stages.map((stage) => [stage.id, stage]));
export const chapters = chapterNames.map((name, index) => ({
  id: index + 1,
  name,
  color: palette[index],
  stages: stages.filter((stage) => stage.chapter === index + 1)
}));
