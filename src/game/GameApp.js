import { characters, characterById } from '../data/characters.js';
import { chapters, stages, stageById } from '../data/stages.js';
import { equipment, equipmentById, EQUIPMENT_SLOTS, equipmentUpgradeCost, getEquipmentFit } from '../data/equipment.js';
import { auditOrthogonality } from '../systems/orthogonality.js';
import { auditSimulatedBalance } from '../systems/balanceSimulator.js';
import { auditEquipmentOrthogonality } from '../systems/equipmentOrthogonality.js';
import { canFullscreen, enterFullscreen, getFullscreenElement, leaveFullscreen } from '../systems/fullscreen.js';
import { CHARACTER_RECRUIT_COST, drawEquipment, EQUIPMENT_DRAW_COST, recruitCharacter } from '../systems/recruitment.js';
import { applyStageResult, calculateStageRewards, createDefaultSave, exportSave, importSave, loadSave, persistSave, SAVE_KEY } from '../systems/storage.js';

const slotNames = { weapon: '무기', armor: '보호구', shoes: '신발', accessory: '장신구' };
const rankNames = { bronze: 'B', silver: 'A', gold: 'S', failed: '실패' };

export class GameApp {
  constructor(root) {
    this.root = root;
    this.save = this.refreshUnlocks(loadSave());
    this.screen = 'home';
    this.selectedChapter = 1;
    this.equipmentFilter = 'all';
    this.equipmentSort = 'fit';
    this.lastRecruitment = null;
    this.audit = auditOrthogonality();
    this.balanceAudit = auditSimulatedBalance();
    this.equipmentAudit = auditEquipmentOrthogonality();
    this.onClick = (event) => this.handleClick(event);
    this.onChange = (event) => this.handleChange(event);
    this.onFullscreenChange = () => this.syncFullscreenButton();
  }

  mount() {
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
    document.addEventListener('fullscreenchange', this.onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.onFullscreenChange);
    this.renderShell();
    this.showScreen('home');
  }

  renderShell() {
    this.root.innerHTML = `
      <div class="app-shell">
        <header class="topbar">
          <button class="brand" data-nav="home" aria-label="홈으로 이동">
            <span class="brand-mark">M</span>
            <span><b>MIKU<span>TPS</span></b><small>RESONANCE PROTOCOL</small></span>
          </button>
          <div class="resources" aria-label="보유 재화">
            <span><i class="resource-credit"></i><b data-credits>0</b></span>
            <span><i class="resource-part"></i><b data-parts>0</b></span>
          </div>
        </header>
        <main id="screen" class="screen"></main>
        <nav class="bottom-nav" aria-label="주 메뉴">
          <button data-nav="home"><span>⌂</span>허브</button>
          <button data-nav="stages"><span>⌖</span>작전</button>
          <button data-nav="roster"><span>♙</span>로스터</button>
          <button data-nav="recruit"><span>✦</span>영입</button>
          <button data-nav="workshop"><span>◇</span>공방</button>
          <button data-nav="settings"><span>⚙</span>설정</button>
        </nav>
        <div class="portrait-guard" role="status">
          <div class="rotate-icon">↻</div>
          <strong>기기를 가로로 돌려주세요</strong>
          <span>MikuTPS는 가로 화면에서 가장 잘 작동합니다.</span>
        </div>
        <div id="toast" class="toast" aria-live="polite"></div>
      </div>`;
    this.updateResources();
  }

  showScreen(screen, options = {}) {
    this.combat?.destroy();
    this.combat = null;
    this.screen = screen;
    const target = this.root.querySelector('#screen');
    this.root.querySelector('.app-shell').classList.toggle('in-combat', screen === 'combat');
    this.root.querySelectorAll('[data-nav]').forEach((button) => button.classList.toggle('active', button.dataset.nav === screen));

    if (screen === 'home') target.innerHTML = this.homeTemplate();
    if (screen === 'stages') target.innerHTML = this.stagesTemplate();
    if (screen === 'roster') target.innerHTML = this.rosterTemplate();
    if (screen === 'recruit') target.innerHTML = this.recruitmentTemplate();
    if (screen === 'workshop') target.innerHTML = this.workshopTemplate();
    if (screen === 'settings') target.innerHTML = this.settingsTemplate();
    if (screen === 'combat') this.startCombat(options.stageId);
    this.updateResources();
  }

  homeTemplate() {
    const selected = characterById[this.save.selectedCharacter] ?? characters[0];
    const loadoutFit = this.loadoutAffinity(selected.id);
    const cleared = Object.values(this.save.stages).filter((result) => result.cleared).length;
    const campaignComplete = cleared >= stages.length;
    const nextStage = stages.find((stage) => this.isStageUnlocked(stage) && !this.save.stages[stage.id]?.cleared) ?? stages.at(-1);
    return `
      <section class="home-grid">
        <article class="hero-panel" style="--hero:${nextStage.color}">
          <div class="hero-copy">
            <p class="eyebrow">${campaignComplete ? 'RESONANCE RESTORED · ENDING' : `NEXT OPERATION · ${nextStage.id}`}</p>
            <h1>${campaignComplete ? '우리의 서로 다른 박자' : nextStage.title}</h1>
            <p>${campaignComplete ? '하나의 최강이 아니라 서로 다른 해법으로 종결 프로토콜을 완주했습니다. 모든 작전을 다른 조합으로 다시 탐색할 수 있습니다.' : nextStage.objective}</p>
            <div class="mechanic-tags"><span>${nextStage.primaryMechanic}</span><span>${nextStage.secondaryMechanic}</span></div>
            <button class="primary-action" data-stage-start="${nextStage.id}"><span>${campaignComplete ? '피날레 재도전' : '출격'}</span><small>${selected.name} · ${campaignComplete ? '엔딩 기록' : `예상 ${Math.ceil(nextStage.targetSeconds / 60)}분`}</small></button>
          </div>
          <div class="hero-orbit" aria-hidden="true"><i></i><i></i><i></i><b>${campaignComplete ? 'END' : nextStage.id}</b></div>
        </article>
        <article class="status-card">
          <div class="section-heading"><div><span>CAMPAIGN</span><h2>공명 진행도</h2></div><b>${cleared}<small>/50</small></b></div>
          <div class="progress-track"><i style="width:${cleared * 2}%"></i></div>
          <div class="chapter-pips">${chapters.map((chapter) => `<span class="${cleared >= chapter.id * 10 ? 'complete' : cleared >= (chapter.id - 1) * 10 ? 'current' : ''}" style="--pip:${chapter.color}">${chapter.id}</span>`).join('')}</div>
          <p>${campaignComplete ? '캠페인 완료. 기록된 텔레메트리로 미사용 캐릭터와 지배 조합을 계속 감시합니다.' : '모든 스테이지는 서로 다른 규칙을 시험합니다. 추천은 정답이 아니라, 문제를 읽는 첫 단서입니다.'}</p>
          <button class="ghost-action" data-nav="stages">전체 작전 보기 →</button>
        </article>
        <article class="character-card">
          <div class="card-label">ACTIVE OPERATOR</div>
          <div class="character-sigil">${selected.codename.slice(0, 1)}</div>
          <div><h2>${selected.name}</h2><p>${selected.codename} · ${selected.role}</p><small>${selected.strengths.join(' / ')}</small><em class="loadout-affinity ${loadoutFit.weak ? 'has-conflict' : ''}">장비 최적 ${loadoutFit.strong} · 역상성 ${loadoutFit.weak}</em></div>
          <button data-nav="roster" aria-label="캐릭터 변경">변경</button>
        </article>
        <article class="orthogonality-card">
          <div class="card-label">ORTHOGONALITY AUDIT</div>
          <strong class="${this.audit.ok ? 'audit-ok' : 'audit-fail'}">${this.audit.ok ? '설계 규칙 통과' : `${this.audit.issues.length}개 경고`}</strong>
          <p>13명의 역할과 50개 작전 추천 분포를 검사했습니다.</p>
          <div class="axis-bars">${Object.entries(selected.axes).map(([axis, value]) => `<span title="${axis}: ${value}"><i style="height:${value * 20}%"></i></span>`).join('')}</div>
        </article>
      </section>`;
  }

  stagesTemplate() {
    const chapter = chapters.find(({ id }) => id === this.selectedChapter) ?? chapters[0];
    return `
      <section class="content-page operations-page">
        <div class="page-heading"><div><p class="eyebrow">50 DISTINCT OPERATIONS</p><h1>작전 지도</h1><p>기믹을 읽고 도구를 고르세요. 전투력만으로는 규칙을 지울 수 없습니다.</p></div><div class="campaign-count"><b>${Object.keys(this.save.stages).length}</b><span>완료 작전</span></div></div>
        <div class="chapter-tabs">${chapters.map(({ id, name, color }) => `<button data-chapter="${id}" class="${id === this.selectedChapter ? 'active' : ''}" style="--chapter:${color}"><b>0${id}</b><span>${name}</span></button>`).join('')}</div>
        <div class="stage-list">${chapter.stages.map((stage) => this.stageCard(stage)).join('')}</div>
      </section>`;
  }

  stageCard(stage) {
    const unlocked = this.isStageUnlocked(stage);
    const result = this.save.stages[stage.id];
    const recommended = stage.recommendedCharacters.map((id) => characterById[id]);
    return `
      <article class="stage-card ${unlocked ? '' : 'locked'} ${result?.cleared ? 'cleared' : ''}" style="--stage:${stage.color}">
        <div class="stage-number">${stage.id}<i></i></div>
        <div class="stage-main">
          <div><span>${stage.boss ? 'BOSS PROTOCOL' : 'FIELD OPERATION'}</span><h2>${stage.title}</h2></div>
          <p>${stage.objective}</p>
          <div class="mechanic-tags"><span>${stage.primaryMechanic}</span><span>${stage.secondaryMechanic}</span></div>
        </div>
        <div class="recommended"><small>추천 해법</small><div>${recommended.map((character) => `<span title="${character.name}">${character.codename.slice(0, 1)}</span>`).join('')}</div><em>대체: 미쿠</em></div>
        <div class="stage-result">${result ? `<b class="rank-${result.rank}">${rankNames[result.rank]}</b><small>${result.bestScore.toLocaleString()}</small>` : `<b>—</b><small>미완료</small>`}</div>
        <button class="stage-launch" data-stage-start="${stage.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? '출격' : '잠김'}</button>
      </article>`;
  }

  rosterTemplate() {
    const selected = characterById[this.save.selectedCharacter];
    const loadoutFit = this.loadoutAffinity(selected.id);
    return `
      <section class="content-page roster-page">
        <div class="page-heading"><div><p class="eyebrow">TOOLS, NOT TIERS</p><h1>오퍼레이터 로스터</h1><p>각 캐릭터는 다른 문제를 풉니다. 강점과 약점은 강화해도 사라지지 않습니다.</p></div><div class="campaign-count"><b>${this.save.unlockedCharacters.length}</b><span>/ 13 해금</span></div></div>
        <div class="roster-layout">
          <div class="roster-list">${characters.map((character) => this.characterTile(character)).join('')}</div>
          <aside class="operator-detail">
            <div class="detail-sigil">${selected.codename.slice(0, 1)}</div>
            <p class="eyebrow">${selected.codename} · ${selected.role}</p>
            <h2>${selected.name}</h2>
            <p>${selected.passive}</p>
            <div class="strengths"><span>강점</span>${selected.strengths.map((value) => `<b>${value}</b>`).join('')}<span>약점</span><em>${selected.weakness}</em></div>
            <div class="skill-callout"><i>ACTIVE</i><div><b>${selected.skill.name}</b><p>${selected.skill.description}</p></div><span>${selected.skill.cooldown}s</span></div>
            <div class="loadout-affinity-summary ${loadoutFit.weak ? 'has-conflict' : ''}"><b>현재 장비 궁합</b><span>최적 ${loadoutFit.strong} · 중립 ${loadoutFit.neutral} · 역상성 ${loadoutFit.weak}</span>${loadoutFit.weak ? '<em>공방에서 붉은 장비를 교체해야 역할 성능이 회복됩니다.</em>' : ''}</div>
            <div class="axis-detail">${Object.entries(selected.axes).map(([axis, value]) => `<div><span>${axis}</span><i><b style="width:${value * 20}%"></b></i><em>${value}</em></div>`).join('')}</div>
          </aside>
        </div>
      </section>`;
  }

  characterTile(character) {
    const unlocked = this.save.unlockedCharacters.includes(character.id);
    const selected = this.save.selectedCharacter === character.id;
    return `<button class="operator-tile ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-character-select="${character.id}" ${unlocked ? '' : 'disabled'}>
      <span class="tile-sigil">${unlocked ? character.codename.slice(0, 1) : '×'}</span>
      <span><small>${character.role}</small><b>${unlocked ? character.name : '미확인 신호'}</b><em>${unlocked ? character.strengths[0] : this.unlockText(character)}</em></span>
      ${selected ? '<i>ACTIVE</i>' : ''}
    </button>`;
  }

  unlockText(character) {
    return character.id === 'miku' ? '기본 캐릭터' : '리크루트에서 중복 없이 영입';
  }

  recruitmentTemplate() {
    const remainingCharacters = characters.filter((character) => character.id !== 'miku' && !this.save.unlockedCharacters.includes(character.id));
    const recent = (this.save.recruitmentHistory ?? []).slice(-5).reverse();
    const reveal = this.lastRecruitment
      ? `<div class="recruit-reveal"><small>${this.lastRecruitment.kind === 'character' ? 'NEW OPERATOR' : `NEW ${slotNames[this.lastRecruitment.slot].toUpperCase()}`}</small><strong>${this.lastRecruitment.name}</strong><span>${this.lastRecruitment.detail}</span></div>`
      : '';
    return `
      <section class="content-page recruitment-page">
        <div class="page-heading"><div><p class="eyebrow">NO DUPLICATES · LOCAL RECRUITMENT</p><h1>공명 리크루트</h1><p>유료 재화나 서버 없이 저장된 크레딧만 사용합니다. 이미 보유한 캐릭터와 장비는 다시 나오지 않습니다.</p></div><div class="campaign-count"><b>${this.save.unlockedCharacters.length}</b><span>/ 13 영입</span></div></div>
        ${reveal}
        <div class="recruit-grid">
          <article class="operator-draw"><div class="draw-heading"><span>OPERATOR SIGNAL</span><h2>오퍼레이터 영입</h2><p>미보유 오퍼레이터 한 명을 균등 확률로 영입합니다.</p></div><div class="draw-pool"><b>${remainingCharacters.length}</b><span>남은 신호</span></div><div class="pool-tags">${remainingCharacters.length ? remainingCharacters.map((character) => `<span>${character.codename}</span>`).join('') : '<span>전원 영입 완료</span>'}</div><button class="primary-action" data-recruit-character ${remainingCharacters.length ? '' : 'disabled'}><span>${remainingCharacters.length ? '랜덤 영입' : 'COMPLETE'}</span><small>${remainingCharacters.length ? `${CHARACTER_RECRUIT_COST.toLocaleString()} C` : '중복 없음'}</small></button></article>
          <article class="equipment-draw"><div class="draw-heading"><span>EQUIPMENT SUPPLY</span><h2>장비 랜덤 조달</h2><p>원하는 슬롯을 고르고, 그 슬롯의 미보유 장비 하나를 중복 없이 얻습니다.</p></div><div class="slot-draws">${EQUIPMENT_SLOTS.map((slot) => { const remaining = equipment.filter((item) => item.slot === slot && !this.save.ownedEquipment[item.id]).length; return `<button data-draw-equipment="${slot}" ${remaining ? '' : 'disabled'}><span>${slotNames[slot]}</span><b>${remaining ? `${EQUIPMENT_DRAW_COST.toLocaleString()} C` : 'COMPLETE'}</b><small>${remaining}개 남음</small></button>`; }).join('')}</div></article>
        </div>
        <section class="recruit-history"><div class="section-heading"><div><span>LOCAL RECORD</span><h2>최근 영입</h2></div></div>${recent.length ? recent.map((entry) => { const name = entry.kind === 'character' ? characterById[entry.id]?.name : equipmentById[entry.id]?.name; return `<span><b>${entry.kind === 'character' ? 'OPERATOR' : slotNames[entry.slot]}</b>${name ?? entry.id}<em>-${entry.cost.toLocaleString()} C</em></span>`; }).join('') : '<p>아직 영입 기록이 없습니다.</p>'}</section>
      </section>`;
  }

  workshopTemplate() {
    const selected = characterById[this.save.selectedCharacter] ?? characters[0];
    return `
      <section class="content-page workshop-page">
        <div class="page-heading"><div><p class="eyebrow">EXTREME ORTHOGONAL LOADOUTS</p><h1>공명 공방</h1><p>${selected.name} 기준 궁합입니다. 최적 공명은 효과 180%·대가 70%, 역상성은 효과 15%·대가 200%와 추가 페널티를 받습니다.</p></div><div class="loadout-mini">${EQUIPMENT_SLOTS.map((slot) => { const item = equipmentById[this.save.loadout[slot]]; const fit = getEquipmentFit(item, selected.id); return `<span class="fit-${fit.tier}"><small>${slotNames[slot]} · ${fit.label}</small><b>${item.name}</b></span>`; }).join('')}</div></div>
        <div class="inventory-tools"><div><button data-equipment-filter="all" class="${this.equipmentFilter === 'all' ? 'active' : ''}">전체</button><button data-equipment-filter="owned" class="${this.equipmentFilter === 'owned' ? 'active' : ''}">보유</button><button data-equipment-filter="blueprint" class="${this.equipmentFilter === 'blueprint' ? 'active' : ''}">미보유 설계</button></div><label>정렬 <select data-equipment-sort><option value="fit" ${this.equipmentSort === 'fit' ? 'selected' : ''}>${selected.name} 궁합</option><option value="name" ${this.equipmentSort === 'name' ? 'selected' : ''}>이름</option><option value="level" ${this.equipmentSort === 'level' ? 'selected' : ''}>강화 단계</option><option value="cost" ${this.equipmentSort === 'cost' ? 'selected' : ''}>기본 비용</option></select></label></div>
        ${EQUIPMENT_SLOTS.map((slot) => { const items = this.filteredEquipment(slot); return `<section class="equipment-section"><div class="section-heading"><div><span>${slot.toUpperCase()}</span><h2>${slotNames[slot]}</h2></div><small>${items.length}개 표시</small></div><div class="equipment-grid">${items.length ? items.map((item) => this.equipmentCard(item)).join('') : '<p class="empty-equipment">이 조건에 맞는 장비가 없습니다.</p>'}</div></section>`; }).join('')}
      </section>`;
  }

  filteredEquipment(slot) {
    const items = equipment.filter((item) => {
      if (item.slot !== slot) return false;
      const owned = Boolean(this.save.ownedEquipment[item.id]);
      return this.equipmentFilter === 'all' || (this.equipmentFilter === 'owned' ? owned : !owned);
    });
    return items.sort((a, b) => {
      if (this.equipmentSort === 'fit') {
        const rank = { strong: 2, neutral: 1, weak: 0 };
        return rank[getEquipmentFit(b, this.save.selectedCharacter).tier] - rank[getEquipmentFit(a, this.save.selectedCharacter).tier] || a.name.localeCompare(b.name, 'ko');
      }
      if (this.equipmentSort === 'level') return (this.save.ownedEquipment[b.id]?.level ?? -1) - (this.save.ownedEquipment[a.id]?.level ?? -1) || a.name.localeCompare(b.name, 'ko');
      if (this.equipmentSort === 'cost') return a.enhancement.baseCost - b.enhancement.baseCost || a.name.localeCompare(b.name, 'ko');
      return a.name.localeCompare(b.name, 'ko');
    });
  }

  equipmentCard(item) {
    const owned = this.save.ownedEquipment[item.id];
    const equipped = this.save.loadout[item.slot] === item.id;
    const level = owned?.level ?? 0;
    const upgradeCost = equipmentUpgradeCost(item, level);
    const fit = getEquipmentFit(item, this.save.selectedCharacter);
    const strongNames = item.affinity.strong.map((id) => characterById[id].name).join(' · ');
    const weakNames = item.affinity.weak.map((id) => characterById[id].name).join(' · ');
    return `<article class="equipment-card fit-${fit.tier} ${equipped ? 'equipped' : ''}">
      <div class="equipment-icon">${item.slot === 'weapon' ? '⌁' : item.slot === 'armor' ? '⬡' : item.slot === 'shoes' ? '≫' : '◈'}</div>
      <div><small>${equipped ? 'EQUIPPED' : owned ? `LEVEL ${level}` : 'BLUEPRINT'}</small><h3>${item.name}</h3><p>${item.description}</p></div>
      <div class="fit-callout"><strong>${fit.label} · 효과 ×${fit.effectScale} / 대가 ×${fit.drawbackScale}</strong><span>${fit.reason}</span></div>
      <dl><dt>효과</dt><dd>${Object.entries(item.effect).map(([key, value]) => `${key} ${typeof value === 'number' && Math.abs(value) < 1 ? `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%` : value}`).join(' · ')}</dd><dt>대가</dt><dd>${Object.entries(item.drawback).map(([key, value]) => `${key} ${Math.round(value * 100)}%`).join(' · ')}</dd></dl>
      <div class="affinity-map"><b>◎ ${strongNames}</b><em>× ${weakNames}</em></div>
      <div class="equipment-actions">${owned ? `<button data-equip="${item.id}" ${equipped ? 'disabled' : ''}>${equipped ? '장착 중' : '장착'}</button><button data-upgrade="${item.id}" ${level >= item.enhancement.max ? 'disabled' : ''}>${level >= item.enhancement.max ? 'MAX' : `강화 ${upgradeCost.credits} C · ${upgradeCost.parts} P`}</button><button data-lock-equipment="${item.id}" aria-label="${item.name} ${owned.locked ? '잠금 해제' : '잠금'}">${owned.locked ? '◆' : '◇'}</button>` : `<button data-nav="recruit">랜덤 조달 풀에서 획득</button>`}</div>
    </article>`;
  }

  settingsTemplate() {
    return `
      <section class="content-page settings-page">
        <div class="page-heading"><div><p class="eyebrow">LOCAL FIRST</p><h1>설정과 저장</h1><p>진행 데이터는 이 브라우저에 저장됩니다. 내보내기로 백업할 수 있습니다.</p></div></div>
        <div class="settings-grid">
          <article><h2>조작 및 성능</h2>
            <label><span>품질</span><select data-setting="quality"><option value="auto" ${this.save.settings.quality === 'auto' ? 'selected' : ''}>자동</option><option value="high" ${this.save.settings.quality === 'high' ? 'selected' : ''}>높음</option><option value="low" ${this.save.settings.quality === 'low' ? 'selected' : ''}>저사양 30fps</option></select></label>
            <label><span>조준 보정 <b>${Math.round(this.save.settings.aimAssist * 100)}%</b></span><input data-setting="aimAssist" type="range" min="0" max="1" step="0.05" value="${this.save.settings.aimAssist}"></label>
            <label class="toggle"><span>자동사격 <b>수동 조준 시 약점 보너스</b></span><input data-setting="autoFire" type="checkbox" ${this.save.settings.autoFire ? 'checked' : ''}></label>
            <label><span>화면 흔들림 <b>${Math.round(this.save.settings.screenShake * 100)}%</b></span><input data-setting="screenShake" type="range" min="0" max="1" step="0.1" value="${this.save.settings.screenShake}"></label>
            <label class="toggle"><span>지원 기기 햅틱</span><input data-setting="haptics" type="checkbox" ${this.save.settings.haptics ? 'checked' : ''}></label>
          </article>
          <article><h2>진행 데이터</h2><p>세이브 버전 ${this.save.version} · 마지막 저장 ${new Date(this.save.updatedAt).toLocaleString('ko-KR')}</p><textarea id="save-transfer" placeholder="내보낸 세이브 문자열을 붙여넣으세요."></textarea><div class="settings-actions"><button data-save-export>내보내기</button><button data-save-import>가져오기</button><button class="danger" data-save-reset>진행 초기화</button></div></article>
          <article><h2>직교성 검사</h2><strong class="${this.audit.ok && this.balanceAudit.ok && this.equipmentAudit.ok ? 'audit-ok' : 'audit-fail'}">${this.audit.ok && this.balanceAudit.ok && this.equipmentAudit.ok ? '캐릭터·스테이지·장비 규칙 통과' : '검사 필요'}</strong><p>추천 채용 횟수: ${Object.values(this.audit.usage).join(' · ')}</p><p>모의 최적 비율: ${Object.entries(this.balanceAudit.winnerShare).filter(([, share]) => share > 0).map(([id, share]) => `${id} ${Math.round(share * 100)}%`).join(' · ') || '공동 최적 분산'}</p><p>장비 수: ${EQUIPMENT_SLOTS.map((slot) => `${slotNames[slot]} ${this.equipmentAudit.slotCounts[slot]}`).join(' · ')} · 모든 캐릭터/슬롯에 최적·역상성 존재</p>${[...this.audit.issues, ...this.balanceAudit.issues, ...this.equipmentAudit.issues].length ? `<ul>${[...this.audit.issues, ...this.balanceAudit.issues, ...this.equipmentAudit.issues].map((issue) => `<li>${issue}</li>`).join('')}</ul>` : '<p>모든 스테이지에 복수 해법이 있고, 어느 장비도 모든 캐릭터의 범용 최적해가 될 수 없습니다.</p>'}</article>
        </div>
      </section>`;
  }

  async startCombat(stageId) {
    const stage = stageById[stageId] ?? stages[0];
    const character = characterById[this.save.selectedCharacter] ?? characters[0];
    const target = this.root.querySelector('#screen');
    target.innerHTML = `
      <section class="combat-root" id="combat-root">
        <div class="combat-hud">
          <div class="hud-left"><button data-combat-action="pause" aria-label="작전 나가기">Ⅱ</button><button class="fullscreen-button" data-combat-action="fullscreen" aria-label="${getFullscreenElement() ? '전체화면 종료' : '전체화면으로 플레이'}" title="전체화면 전환">${getFullscreenElement() ? '×' : '⛶'}</button><div><span>${stage.id} · ${stage.title}</span><b>${stage.objective}</b></div></div>
          <div class="hud-center"><span>SCORE</span><b data-hud-score>000000</b><em data-hud-combo></em></div>
          <div class="hud-right"><span title="남은 적"><i class="enemy-dot"></i><b data-hud-enemies>0</b></span><span class="wave-readout">W <b data-hud-wave>1/${stage.waves}</b></span><b data-hud-time>00:00</b></div>
        </div>
        <div class="boss-status" data-hud-boss hidden><span data-hud-boss-phase></span><div><i data-hud-boss-hp></i></div><b data-hud-boss-state></b></div>
        <div class="hp-cluster"><span>${character.name}</span><div><i data-hud-hp></i></div><b data-hud-hp-text></b></div>
        <div class="mission-callout"><small>TACTICAL NOTE</small><span>${stage.tactics[0].label}</span><b><i data-hud-objective-label>${stage.primaryMechanic}</i><em data-hud-objective>ACTIVE</em></b></div>
        <div class="touch-pad move-pad" data-pad="move"><i></i><b data-knob="move"></b><span>MOVE</span></div>
        <div class="touch-pad aim-pad" data-pad="aim"><i></i><b data-knob="aim"></b><span>AIM / FIRE</span></div>
        <div class="combat-actions"><button data-combat-action="skill"><span>SKILL</span><b data-skill-cooldown>${character.skill.name}</b></button><button data-combat-action="dodge"><span>DODGE</span><b data-dodge-cooldown>회피</b></button></div>
        <div class="desktop-hint">WASD 이동 · J 사격 · SPACE 회피 · E 스킬</div>
      </section>`;
    const combatRoot = target.querySelector('#combat-root');
    const { CombatWorld } = await import('./CombatWorld.js');
    if (this.screen !== 'combat' || !combatRoot.isConnected) return;
    this.combat = new CombatWorld({
      root: combatRoot,
      stage,
      character,
      settings: this.save.settings,
      loadout: this.save.loadout,
      ownedEquipment: this.save.ownedEquipment,
      onHud: (hud) => this.updateHud(hud),
      onComplete: (result) => this.showResult(stage, result),
      onExit: () => this.showScreen('stages'),
      onFullscreen: () => this.toggleFullscreen()
    });
    this.combat.mount();
  }

  updateHud(hud) {
    const set = (selector, value) => { const element = this.root.querySelector(selector); if (element) element.textContent = value; };
    set('[data-hud-score]', String(Math.round(hud.score)).padStart(6, '0'));
    set('[data-hud-combo]', hud.combo > 1 ? `${hud.combo} CHAIN` : '');
    set('[data-hud-enemies]', hud.remaining);
    set('[data-hud-wave]', `${hud.wave}/${hud.totalWaves}`);
    set('[data-hud-objective-label]', hud.mechanic.label);
    set('[data-hud-objective]', hud.mechanic.value);
    set('[data-hud-time]', this.formatTime(hud.elapsed));
    set('[data-hud-hp-text]', `${Math.ceil(hud.hp)} / ${Math.ceil(hud.maxHp)}${hud.shield > 0.5 ? ` + ${Math.ceil(hud.shield)} SHIELD` : ''}`);
    set('[data-skill-cooldown]', hud.skillCooldown > 0 ? hud.skillCooldown.toFixed(1) : 'READY');
    set('[data-dodge-cooldown]', hud.dodgeCooldown > 0 ? hud.dodgeCooldown.toFixed(1) : 'READY');
    const hp = this.root.querySelector('[data-hud-hp]');
    if (hp) hp.style.width = `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%`;
    const boss = this.root.querySelector('[data-hud-boss]');
    if (boss) {
      boss.hidden = !hud.boss;
      if (hud.boss) {
        boss.style.setProperty('--boss-color', hud.boss.color);
        set('[data-hud-boss-phase]', `PHASE ${hud.boss.phase} · ${hud.boss.label}`);
        set('[data-hud-boss-state]', hud.boss.state);
        const bossHp = this.root.querySelector('[data-hud-boss-hp]');
        if (bossHp) bossHp.style.width = `${Math.max(0, (hud.boss.hp / hud.boss.maxHp) * 100)}%`;
      }
    }
  }

  showResult(stage, result) {
    result.loadout = { ...this.save.loadout };
    const rewards = calculateStageRewards(stage, result, this.save.stages[stage.id]);
    this.save = applyStageResult(this.save, stage, result);
    const finale = result.success && stage.id === '5-10';
    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    const rewardDetails = result.success
      ? [['기본', rewards.base], ['최초', rewards.firstClear], ['성적', rewards.score], ['시간', rewards.time], ['저피격', rewards.survival], ['기믹', rewards.mechanic]].filter(([, value]) => value > 0).map(([label, value]) => `${label} +${value}`).join(' · ')
      : '실패 학습 보상';
    overlay.innerHTML = `<div class="result-card ${result.success ? '' : 'failed'}"><p class="eyebrow">${finale ? 'RESONANCE PROTOCOL COMPLETE' : result.success ? 'OPERATION COMPLETE' : 'SIGNAL LOST'}</p><div class="result-rank rank-${result.rank}">${rankNames[result.rank]}</div><h2>${finale ? '우리의 서로 다른 박자 · END' : `${stage.id} ${stage.title}`}</h2><b class="result-score">${result.score.toLocaleString()}</b><div class="result-stats"><span><small>TIME</small>${this.formatTime(result.elapsed)}</span><span><small>ACCURACY</small>${Math.round(result.stats.accuracy * 100)}%</span><span><small>BREAK</small>${result.stats.breaks}</span><span><small>DAMAGE</small>${Math.round(result.stats.damageTaken)}</span></div><div class="result-rewards"><b>+${rewards.credits.toLocaleString()} C · +${rewards.parts} P</b><span>${rewardDetails}</span></div><div class="result-actions"><button data-result-action="${finale ? 'home' : 'stages'}">${finale ? '엔딩 허브' : '작전 지도'}</button><button class="primary-action" data-result-action="retry">다시 출격</button></div></div>`;
    overlay.dataset.stageId = stage.id;
    this.root.querySelector('#combat-root').append(overlay);
    this.updateResources();
  }

  handleClick(event) {
    const nav = event.target.closest('[data-nav]')?.dataset.nav;
    if (nav) return this.showScreen(nav);
    const chapter = event.target.closest('[data-chapter]')?.dataset.chapter;
    if (chapter) {
      this.selectedChapter = Number(chapter);
      return this.showScreen('stages');
    }
    const stageId = event.target.closest('[data-stage-start]')?.dataset.stageStart;
    if (stageId) {
      this.requestCombatFullscreen();
      return this.showScreen('combat', { stageId });
    }
    if (event.target.closest('[data-recruit-character]')) return this.performCharacterRecruit();
    const drawSlot = event.target.closest('[data-draw-equipment]')?.dataset.drawEquipment;
    if (drawSlot) return this.performEquipmentDraw(drawSlot);
    const characterId = event.target.closest('[data-character-select]')?.dataset.characterSelect;
    if (characterId) {
      this.save = persistSave({ ...this.save, selectedCharacter: characterId });
      const fit = this.loadoutAffinity(characterId);
      this.toast(`${characterById[characterId].name} 선택 · 최적 ${fit.strong} / 역상성 ${fit.weak}`);
      return this.showScreen('roster');
    }
    const equipId = event.target.closest('[data-equip]')?.dataset.equip;
    if (equipId) return this.equipItem(equipId);
    const upgradeId = event.target.closest('[data-upgrade]')?.dataset.upgrade;
    if (upgradeId) return this.upgradeItem(upgradeId);
    const lockId = event.target.closest('[data-lock-equipment]')?.dataset.lockEquipment;
    if (lockId) {
      const owned = this.save.ownedEquipment[lockId];
      this.save = persistSave({ ...this.save, ownedEquipment: { ...this.save.ownedEquipment, [lockId]: { ...owned, locked: !owned.locked } } });
      this.toast(`${equipmentById[lockId].name} ${owned.locked ? '잠금 해제' : '잠금'}`);
      return this.showScreen('workshop');
    }
    const filter = event.target.closest('[data-equipment-filter]')?.dataset.equipmentFilter;
    if (filter) {
      this.equipmentFilter = filter;
      return this.showScreen('workshop');
    }
    const resultAction = event.target.closest('[data-result-action]')?.dataset.resultAction;
    if (resultAction) {
      const currentStage = event.target.closest('.result-overlay')?.dataset.stageId;
      if (resultAction === 'retry') {
        this.requestCombatFullscreen();
        return this.showScreen('combat', { stageId: currentStage });
      }
      return this.showScreen(resultAction === 'home' ? 'home' : 'stages');
    }
    if (event.target.closest('[data-save-export]')) {
      const area = this.root.querySelector('#save-transfer');
      area.value = exportSave(this.save);
      area.select();
      navigator.clipboard?.writeText(area.value).catch(() => {});
      return this.toast('세이브 문자열을 내보냈습니다.');
    }
    if (event.target.closest('[data-save-import]')) {
      try {
        this.save = persistSave(importSave(this.root.querySelector('#save-transfer').value));
        this.toast('세이브를 가져왔습니다.');
        return this.showScreen('settings');
      } catch { return this.toast('올바른 세이브 문자열이 아닙니다.'); }
    }
    if (event.target.closest('[data-save-reset]') && window.confirm('모든 진행과 설정을 초기화할까요?')) {
      localStorage.removeItem(SAVE_KEY);
      this.save = persistSave(createDefaultSave());
      this.toast('진행을 초기화했습니다.');
      return this.showScreen('home');
    }
  }

  handleChange(event) {
    if ('equipmentSort' in event.target.dataset) {
      this.equipmentSort = event.target.value;
      return this.showScreen('workshop');
    }
    const setting = event.target.dataset.setting;
    if (!setting) return;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    this.save = persistSave({ ...this.save, settings: { ...this.save.settings, [setting]: value } });
    if (event.target.type === 'range') this.showScreen('settings');
  }

  performCharacterRecruit() {
    const result = recruitCharacter(this.save);
    if (!result.ok) return this.toast(result.reason === 'empty' ? '모든 오퍼레이터를 이미 영입했습니다.' : `${CHARACTER_RECRUIT_COST.toLocaleString()} 크레딧이 필요합니다.`);
    this.save = persistSave(result.save);
    this.lastRecruitment = { kind: 'character', name: result.character.name, detail: `${result.character.role} · ${result.character.strengths.join(' / ')}` };
    this.showScreen('recruit');
    this.toast(`${result.character.name} 영입 완료 · 중복 없음`);
  }

  performEquipmentDraw(slot) {
    const result = drawEquipment(this.save, slot);
    if (!result.ok) return this.toast(result.reason === 'empty' ? `${slotNames[slot]} 조달 풀을 모두 획득했습니다.` : `${EQUIPMENT_DRAW_COST.toLocaleString()} 크레딧이 필요합니다.`);
    this.save = persistSave(result.save);
    const fit = getEquipmentFit(result.item, this.save.selectedCharacter);
    this.lastRecruitment = { kind: 'equipment', slot, name: result.item.name, detail: `${characterById[this.save.selectedCharacter].name} 기준 ${fit.label}` };
    this.showScreen('recruit');
    this.toast(`${result.item.name} 조달 완료 · 중복 없음`);
  }

  equipItem(id) {
    const item = equipmentById[id];
    this.save = persistSave({ ...this.save, loadout: { ...this.save.loadout, [item.slot]: id } });
    this.toast(`${item.name} 장착`);
    this.showScreen('workshop');
  }

  upgradeItem(id) {
    const item = equipmentById[id];
    const owned = this.save.ownedEquipment[id];
    if (!owned || owned.level >= item.enhancement.max) return;
    const cost = equipmentUpgradeCost(item, owned.level);
    if (this.save.credits < cost.credits) return this.toast('강화 크레딧이 부족합니다.');
    if (this.save.parts < cost.parts) return this.toast(`강화 부품이 ${cost.parts - this.save.parts}개 부족합니다.`);
    this.save = persistSave({ ...this.save, credits: this.save.credits - cost.credits, parts: this.save.parts - cost.parts, ownedEquipment: { ...this.save.ownedEquipment, [id]: { ...owned, level: owned.level + 1 } } });
    this.toast(`${item.name} ${owned.level + 1}단계 강화`);
    this.showScreen('workshop');
  }

  refreshUnlocks(save) {
    const unlocked = new Set(save.unlockedCharacters ?? ['miku']);
    unlocked.add('miku');
    const next = { ...save, unlockedCharacters: [...unlocked] };
    return JSON.stringify(next.unlockedCharacters) === JSON.stringify(save.unlockedCharacters) ? save : persistSave(next);
  }

  isStageUnlocked(stage) {
    if (!stage.unlockRequirement) return true;
    return Boolean(this.save.stages[stage.unlockRequirement.stage]?.cleared);
  }

  updateResources() {
    const credits = this.root.querySelector('[data-credits]');
    const parts = this.root.querySelector('[data-parts]');
    if (credits) credits.textContent = this.save.credits.toLocaleString();
    if (parts) parts.textContent = this.save.parts.toLocaleString();
  }

  loadoutAffinity(characterId) {
    return Object.values(this.save.loadout).reduce((summary, id) => {
      const item = equipmentById[id];
      if (item) summary[getEquipmentFit(item, characterId).tier] += 1;
      return summary;
    }, { strong: 0, neutral: 0, weak: 0 });
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }

  toast(message) {
    const toast = this.root.querySelector('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  isTouchDevice() {
    return navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches;
  }

  async requestCombatFullscreen() {
    if (!this.isTouchDevice() || getFullscreenElement() || !canFullscreen()) return false;
    const entered = await enterFullscreen(document.documentElement);
    if (entered) screen.orientation?.lock?.('landscape').catch(() => {});
    this.syncFullscreenButton();
    return entered;
  }

  async toggleFullscreen() {
    const active = Boolean(getFullscreenElement());
    const changed = active ? await leaveFullscreen() : await enterFullscreen(document.documentElement);
    if (!active && changed) screen.orientation?.lock?.('landscape').catch(() => {});
    if (!changed) this.toast('이 브라우저에서는 자동 전체화면을 지원하지 않습니다. 홈 화면에 추가해 실행해 주세요.');
    this.syncFullscreenButton();
  }

  syncFullscreenButton() {
    const button = this.root.querySelector('[data-combat-action="fullscreen"]');
    if (!button) return;
    const active = Boolean(getFullscreenElement());
    button.textContent = active ? '×' : '⛶';
    button.setAttribute('aria-label', active ? '전체화면 종료' : '전체화면으로 플레이');
  }

  destroy() {
    this.combat?.destroy();
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('change', this.onChange);
    document.removeEventListener('fullscreenchange', this.onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.onFullscreenChange);
    this.root.innerHTML = '';
  }
}
