export const AXES = ['damage', 'break', 'control', 'mobility', 'survival', 'support', 'range', 'mechanic'];
const runtimeAsset = (fileName) => `${import.meta.env.BASE_URL}assets/models/characters/runtime/${fileName}`;

export const characters = [
  {
    id: 'miku', name: '하츠네 미쿠', codename: 'Resonance', role: 'versatile', weaponType: 'pulseRifle',
    combatProfile: { fireModel: 'hitscan', tacticalHook: 'resonanceChain' },
    asset: runtimeAsset('miku.glb'), unlock: { type: 'starter' },
    stats: { hp: 100, speed: 6.2, damage: 12, fireRate: 7.5, range: 21, break: 7 },
    axes: { damage: 3, break: 3, control: 2, mobility: 4, survival: 2, support: 3, range: 3, mechanic: 4 },
    strengths: ['이동 사격', '공명 표식 연쇄'], weakness: '순간 화력과 중장갑 파괴가 낮다.',
    skill: { id: 'resonanceBurst', name: '리듬 버스트', cooldown: 9, description: '주변 표식을 폭발시켜 브레이크 피해를 준다.' },
    passive: '연속 명중 8회마다 다음 사격이 가까운 적에게 공명한다.'
  },
  {
    id: 'nari', name: '나리', codename: 'Wayfinder', role: 'support', weaponType: 'beaconPistol',
    combatProfile: { fireModel: 'hitscan', tacticalHook: 'objectiveAssist' },
    asset: runtimeAsset('navi-kemonomimi.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 92, speed: 6.4, damage: 9, fireRate: 5.5, range: 19, break: 6 },
    axes: { damage: 2, break: 2, control: 3, mobility: 4, survival: 2, support: 5, range: 3, mechanic: 5 },
    strengths: ['은폐 적 탐지', '목표물 가속'], weakness: '단독 교전 화력이 낮다.',
    skill: { id: 'routeBeacon', name: '길잡이 신호', cooldown: 12, description: '안전 경로와 약점을 잠시 드러낸다.' },
    passive: '호위·수집 목표 반경에서 이동 속도와 상호작용 속도가 증가한다.'
  },
  {
    id: 'bibi', name: '비비', codename: 'Pocket Nova', role: 'demolition', weaponType: 'microGrenade',
    combatProfile: { fireModel: 'projectile', tacticalHook: 'gravityExplosion' },
    asset: runtimeAsset('tiny-adventurer.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 82, speed: 6.8, damage: 18, fireRate: 2.2, range: 14, break: 10 },
    axes: { damage: 4, break: 5, control: 4, mobility: 4, survival: 1, support: 1, range: 2, mechanic: 4 },
    strengths: ['군집 폭파', '파괴물 처리'], weakness: '체력이 낮고 원거리 표적에 약하다.',
    skill: { id: 'pocketNova', name: '포켓 노바', cooldown: 11, description: '착탄 후 당겨 모으는 소형 중력탄을 던진다.' },
    passive: '파괴 가능한 물체와 실드에 브레이크 피해가 증가한다.'
  },
  {
    id: 'serin', name: '세린', codename: 'Triage', role: 'medic', weaponType: 'burstSMG',
    combatProfile: { fireModel: 'hitscanBurst', tacticalHook: 'cleanseHeal' },
    asset: runtimeAsset('nurse-twintail.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 108, speed: 5.9, damage: 8, fireRate: 9, range: 15, break: 4 },
    axes: { damage: 2, break: 1, control: 2, mobility: 3, survival: 5, support: 5, range: 2, mechanic: 4 },
    strengths: ['지속 회복', '상태이상 정화'], weakness: '브레이크와 장거리 대응력이 낮다.',
    skill: { id: 'cleanRoom', name: '클린 룸', cooldown: 14, description: '회복·정화 구역을 설치한다.' },
    passive: '위험 구역을 빠져나오면 잃은 체력 일부를 회복한다.'
  },
  {
    id: 'noir', name: '느와르', codename: 'Black Wing', role: 'aerial', weaponType: 'railLance',
    combatProfile: { fireModel: 'chargedHitscan', tacticalHook: 'aerialCharge' },
    asset: runtimeAsset('fallen-angel.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 88, speed: 7.1, damage: 21, fireRate: 1.5, range: 28, break: 5 },
    axes: { damage: 5, break: 2, control: 2, mobility: 5, survival: 1, support: 1, range: 5, mechanic: 4 },
    strengths: ['공중 간극 횡단', '장거리 약점 저격'], weakness: '근거리 포위와 지속 피해에 취약하다.',
    skill: { id: 'wingShift', name: '윙 시프트', cooldown: 8, description: '공격을 통과하며 빠르게 활공한다.' },
    passive: '이동 중 충전한 다음 사격은 약점 피해가 증가한다.'
  },
  {
    id: 'mora', name: '모라', codename: 'Marionette', role: 'controller', weaponType: 'threadCaster',
    combatProfile: { fireModel: 'tetherBeam', tacticalHook: 'networkLock' },
    asset: runtimeAsset('gothic-doll.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 94, speed: 5.6, damage: 10, fireRate: 4, range: 18, break: 6 },
    axes: { damage: 2, break: 3, control: 5, mobility: 2, survival: 3, support: 4, range: 3, mechanic: 5 },
    strengths: ['적 강화망 절단', '속박'], weakness: '빠르게 이동하는 단일 적을 마무리하기 어렵다.',
    skill: { id: 'puppetLock', name: '퍼핏 록', cooldown: 13, description: '적 연결을 끊고 범위 내 적을 속박한다.' },
    passive: '제어 중인 적이 받는 브레이크 피해가 증가한다.'
  },
  {
    id: 'roa', name: '로아', codename: 'Surveyor', role: 'sniper', weaponType: 'surveyRifle',
    combatProfile: { fireModel: 'precisionHitscan', tacticalHook: 'weakpointSequence' },
    asset: runtimeAsset('beret-scout.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 90, speed: 5.8, damage: 25, fireRate: 1.2, range: 32, break: 8 },
    axes: { damage: 5, break: 3, control: 2, mobility: 2, survival: 2, support: 3, range: 5, mechanic: 4 },
    strengths: ['순차 약점', '원거리 정밀 사격'], weakness: '탄막 속 재배치와 군집 대응이 느리다.',
    skill: { id: 'surveyMark', name: '측량 표식', cooldown: 10, description: '다음에 타격할 약점 순서를 표시한다.' },
    passive: '같은 적을 연속 약점 명중하면 사거리와 브레이크가 증가한다.'
  },
  {
    id: 'marin', name: '마린', codename: 'Riptide', role: 'skirmisher', weaponType: 'waterShotgun',
    combatProfile: { fireModel: 'shotgun', tacticalHook: 'projectileClear' },
    asset: runtimeAsset('swimsuit-runner.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 102, speed: 6.9, damage: 8, fireRate: 2.7, range: 10, break: 12 },
    axes: { damage: 3, break: 5, control: 3, mobility: 5, survival: 3, support: 1, range: 1, mechanic: 4 },
    strengths: ['수면·빙판 이동', '근접 브레이크'], weakness: '원거리와 비행 적에 거의 대응하지 못한다.',
    skill: { id: 'riptideDash', name: '립타이드', cooldown: 7, description: '물결을 남기며 돌진하고 투사체를 밀어낸다.' },
    passive: '미끄러운 지형에서 감속되지 않고 회피 거리가 늘어난다.'
  },
  {
    id: 'jigsaw', name: '지소', codename: 'Patchwork', role: 'engineer', weaponType: 'modularCarbine',
    combatProfile: { fireModel: 'droneCarbine', tacticalHook: 'deviceRewire' },
    asset: runtimeAsset('puzzle-tech.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 98, speed: 5.8, damage: 11, fireRate: 6.5, range: 20, break: 6 },
    axes: { damage: 3, break: 3, control: 4, mobility: 2, survival: 3, support: 4, range: 3, mechanic: 5 },
    strengths: ['장치 재배선', '터렛 전환'], weakness: '즉흥 교전에서 준비 시간이 길다.',
    skill: { id: 'reconfigure', name: '리컨피겨', cooldown: 12, description: '스테이지 장치를 아군 효과로 재배선한다.' },
    passive: '상호작용을 마친 장치마다 임시 드론이 생성된다.'
  },
  {
    id: 'yura', name: '유라', codename: 'Foxfire', role: 'assassin', weaponType: 'seekerKunai',
    combatProfile: { fireModel: 'seeker', tacticalHook: 'rearAmbush' },
    asset: runtimeAsset('fox-spark.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 84, speed: 7.5, damage: 16, fireRate: 4.2, range: 16, break: 4 },
    axes: { damage: 5, break: 1, control: 3, mobility: 5, survival: 2, support: 1, range: 2, mechanic: 5 },
    strengths: ['후방 핵 파괴', '유도탄 교란'], weakness: '정면 중장갑과 좁은 방어전에서 약하다.',
    skill: { id: 'foxSwap', name: '여우불 바꿔치기', cooldown: 9, description: '분신과 위치를 바꾸고 적 유도를 교란한다.' },
    passive: '적 후방 명중 시 표식을 남기며 세 번째 표식이 폭발한다.'
  },
  {
    id: 'lumi', name: '루미', codename: 'Dreamfield', role: 'zoneKeeper', weaponType: 'sleepMortar',
    combatProfile: { fireModel: 'fieldProjectile', tacticalHook: 'slowField' },
    asset: runtimeAsset('pajama-dreamer.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 112, speed: 5.2, damage: 13, fireRate: 1.8, range: 22, break: 7 },
    axes: { damage: 3, break: 3, control: 5, mobility: 1, survival: 4, support: 3, range: 4, mechanic: 4 },
    strengths: ['지역 방어', '탄막 감속'], weakness: '추격전과 빠른 위치 전환에 약하다.',
    skill: { id: 'dreamField', name: '드림 필드', cooldown: 15, description: '투사체와 적을 감속하는 넓은 영역을 만든다.' },
    passive: '한 위치를 지킬수록 보호막과 박격포 범위가 증가한다.'
  },
  {
    id: 'sora', name: '소라', codename: 'Undertow', role: 'tank', weaponType: 'anchorCannon',
    combatProfile: { fireModel: 'heavyCannon', tacticalHook: 'anchorGuard' },
    asset: runtimeAsset('school-swimmer.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 145, speed: 4.8, damage: 14, fireRate: 2.4, range: 17, break: 11 },
    axes: { damage: 3, break: 5, control: 4, mobility: 1, survival: 5, support: 3, range: 2, mechanic: 4 },
    strengths: ['넉백 저항', '호위 방벽'], weakness: '기동 목표와 시간 제한에서 불리하다.',
    skill: { id: 'anchorGuard', name: '앵커 가드', cooldown: 12, description: '전방 투사체를 막고 충격을 브레이크로 전환한다.' },
    passive: '이동하지 않을 때 넉백 면역과 전방 피해 감소를 얻는다.'
  },
  {
    id: 'neko', name: '네코', codename: 'Afterimage', role: 'runner', weaponType: 'twinSMG',
    combatProfile: { fireModel: 'rapidHitscan', tacticalHook: 'movingCombo' },
    asset: runtimeAsset('cat-street.glb'), unlock: { type: 'recruitment' },
    stats: { hp: 88, speed: 8.0, damage: 7, fireRate: 12, range: 13, break: 3 },
    axes: { damage: 3, break: 1, control: 2, mobility: 5, survival: 2, support: 2, range: 1, mechanic: 5 },
    strengths: ['추격·탈출', '콤보 스위치'], weakness: '중장갑, 장거리, 정지 방어 목표에 약하다.',
    skill: { id: 'afterimageRun', name: '애프터이미지', cooldown: 8, description: '지나간 체크포인트를 잔상으로 재활성화한다.' },
    passive: '계속 움직이는 동안 연사와 회피 재사용 속도가 오른다.'
  }
];

export const characterById = Object.fromEntries(characters.map((character) => [character.id, character]));
