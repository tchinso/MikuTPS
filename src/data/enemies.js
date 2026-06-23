export const enemyArchetypes = {
  drone: {
    id: 'drone', name: '펄스 드론', shape: 'icosahedron', color: '#ff9a70', emissive: '#3b1b17',
    hp: 1, break: 1, speed: 1, preferredRange: 6, fireInterval: 2.8, projectileSpeed: 6, damage: 1,
    trait: 'balanced'
  },
  guard: {
    id: 'guard', name: '벡터 가드', shape: 'box', color: '#ffcf6b', emissive: '#3b2e12',
    hp: 1.65, break: 1.35, speed: 0.68, preferredRange: 5, fireInterval: 3.3, projectileSpeed: 5.5, damage: 1.25,
    trait: 'frontArmor'
  },
  swarm: {
    id: 'swarm', name: '스파크 스웜', shape: 'tetrahedron', color: '#ff6e9f', emissive: '#3c1023',
    hp: 0.52, break: 0.58, speed: 1.55, preferredRange: 2.5, fireInterval: 4.2, projectileSpeed: 5, damage: 0.72,
    trait: 'rush'
  },
  shooter: {
    id: 'shooter', name: '라인 슈터', shape: 'octahedron', color: '#8ea7ff', emissive: '#18234b',
    hp: 0.86, break: 0.9, speed: 0.78, preferredRange: 10.5, fireInterval: 2.15, projectileSpeed: 8.5, damage: 1.18,
    trait: 'ranged'
  },
  brute: {
    id: 'brute', name: '임팩트 브루트', shape: 'dodecahedron', color: '#ff725d', emissive: '#4a1510',
    hp: 2.2, break: 1.7, speed: 0.76, preferredRange: 1.8, fireInterval: 5.5, projectileSpeed: 4.5, damage: 1.7,
    trait: 'charge'
  },
  turret: {
    id: 'turret', name: '앵커 터렛', shape: 'cylinder', color: '#bd83ff', emissive: '#2b1545',
    hp: 1.3, break: 1.1, speed: 0, preferredRange: 12, fireInterval: 1.85, projectileSpeed: 7.2, damage: 0.9,
    trait: 'stationary'
  },
  stalker: {
    id: 'stalker', name: '미라지 스토커', shape: 'cone', color: '#71e8ff', emissive: '#113a44',
    hp: 0.82, break: 0.72, speed: 1.22, preferredRange: 4.5, fireInterval: 3.6, projectileSpeed: 7, damage: 1.32,
    trait: 'cloak'
  },
  runner: {
    id: 'runner', name: '릴레이 러너', shape: 'capsule', color: '#6dffb2', emissive: '#123c29',
    hp: 0.7, break: 0.78, speed: 1.72, preferredRange: 8, fireInterval: 4.5, projectileSpeed: 6.8, damage: 0.72,
    trait: 'kite'
  },
  boss: {
    id: 'boss', name: '프로토콜 코어', shape: 'boss', color: '#ff4f86', emissive: '#56142c',
    hp: 5.4, break: 3.2, speed: 0.62, preferredRange: 8, fireInterval: 1.15, projectileSpeed: 7.5, damage: 2.7,
    trait: 'boss'
  }
};

const themeMap = {
  drone: 'drone', guard: 'guard', swarm: 'swarm', shooter: 'shooter', sniper: 'shooter', brute: 'brute',
  turret: 'turret', stalker: 'stalker', runner: 'runner', linked: 'guard', armor: 'guard', mine: 'turret',
  spore: 'swarm', clone: 'stalker', specter: 'stalker', adaptive: 'guard'
};

export function resolveEnemyArchetype(theme, index, boss = false) {
  if (boss) return enemyArchetypes.boss;
  const primary = themeMap[theme] ?? 'drone';
  if (index % 4 === 3 && primary !== 'drone') return enemyArchetypes.drone;
  if (index % 5 === 4 && !['swarm', 'runner'].includes(primary)) return enemyArchetypes.shooter;
  return enemyArchetypes[primary];
}
