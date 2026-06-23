import { characters, characterById } from '../data/characters.js';
import { chapters, stages, stageById } from '../data/stages.js';
import { equipment, equipmentById, EQUIPMENT_SLOTS } from '../data/equipment.js';
import { auditOrthogonality } from '../systems/orthogonality.js';
import { auditSimulatedBalance } from '../systems/balanceSimulator.js';
import { applyStageResult, createDefaultSave, exportSave, importSave, loadSave, persistSave, SAVE_KEY } from '../systems/storage.js';

const slotNames = { weapon: '무기', armor: '보호구', shoes: '신발', accessory: '장신구' };
const rankNames = { bronze: 'B', silver: 'A', gold: 'S', failed: '실패' };

export class GameApp {
  constructor(root) {
    this.root = root;
    this.save = this.refreshUnlocks(loadSave());
    this.screen = 'home';
    this.selectedChapter = 1;
    this.audit = auditOrthogonality();
    this.balanceAudit = auditSimulatedBalance();
    this.onClick = (event) => this.handleClick(event);
    this.onChange = (event) => this.handleChange(event);
  }

  mount() {
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('change', this.onChange);
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
    if (screen === 'workshop') target.innerHTML = this.workshopTemplate();
    if (screen === 'settings') target.innerHTML = this.settingsTemplate();
    if (screen === 'combat') this.startCombat(options.stageId);
    this.updateResources();
  }

  homeTemplate() {
    const nextStage = stages.find((stage) => this.isStageUnlocked(stage) && !this.save.stages[stage.id]?.cleared) ?? stages.at(-1);
    const selected = characterById[this.save.selectedCharacter] ?? characters[0];
    const cleared = Object.values(this.save.stages).filter((result) => result.cleared).length;
    return `
      <section class="home-grid">
        <article class="hero-panel" style="--hero:${nextStage.color}">
          <div class="hero-copy">
            <p class="eyebrow">NEXT OPERATION · ${nextStage.id}</p>
            <h1>${nextStage.title}</h1>
            <p>${nextStage.objective}</p>
            <div class="mechanic-tags"><span>${nextStage.primaryMechanic}</span><span>${nextStage.secondaryMechanic}</span></div>
            <button class="primary-action" data-stage-start="${nextStage.id}"><span>출격</span><small>${selected.name} · 예상 ${Math.ceil(nextStage.targetSeconds / 60)}분</small></button>
          </div>
          <div class="hero-orbit" aria-hidden="true"><i></i><i></i><i></i><b>${nextStage.id}</b></div>
        </article>
        <article class="status-card">
          <div class="section-heading"><div><span>CAMPAIGN</span><h2>공명 진행도</h2></div><b>${cleared}<small>/50</small></b></div>
          <div class="progress-track"><i style="width:${cleared * 2}%"></i></div>
          <div class="chapter-pips">${chapters.map((chapter) => `<span class="${cleared >= chapter.id * 10 ? 'complete' : cleared >= (chapter.id - 1) * 10 ? 'current' : ''}" style="--pip:${chapter.color}">${chapter.id}</span>`).join('')}</div>
          <p>모든 스테이지는 서로 다른 규칙을 시험합니다. 추천은 정답이 아니라, 문제를 읽는 첫 단서입니다.</p>
          <button class="ghost-action" data-nav="stages">전체 작전 보기 →</button>
        </article>
        <article class="character-card">
          <div class="card-label">ACTIVE OPERATOR</div>
          <div class="character-sigil">${selected.codename.slice(0, 1)}</div>
          <div><h2>${selected.name}</h2><p>${selected.codename} · ${selected.role}</p><small>${selected.strengths.join(' / ')}</small></div>
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
    const unlock = character.unlock;
    if (unlock.type === 'stage') return `${unlock.stage} 클리어`;
    if (unlock.type === 'stageScore') return `${unlock.stage} ${unlock.score.toLocaleString()}점`;
    if (unlock.type === 'challenge') return `${unlock.stage} 특수 도전`;
    return '기본 캐릭터';
  }

  workshopTemplate() {
    return `
      <section class="content-page workshop-page">
        <div class="page-heading"><div><p class="eyebrow">SIDEGRADES, NOT POWER CREEP</p><h1>공명 공방</h1><p>장비는 문제를 바꾸는 대신 새로운 대가를 만듭니다. 최대 강화는 5단계입니다.</p></div><div class="loadout-mini">${EQUIPMENT_SLOTS.map((slot) => `<span><small>${slotNames[slot]}</small><b>${equipmentById[this.save.loadout[slot]].name}</b></span>`).join('')}</div></div>
        ${EQUIPMENT_SLOTS.map((slot) => `<section class="equipment-section"><div class="section-heading"><div><span>${slot.toUpperCase()}</span><h2>${slotNames[slot]}</h2></div><small>${equipment.filter((item) => item.slot === slot).length}개 설계</small></div><div class="equipment-grid">${equipment.filter((item) => item.slot === slot).map((item) => this.equipmentCard(item)).join('')}</div></section>`).join('')}
      </section>`;
  }

  equipmentCard(item) {
    const owned = this.save.ownedEquipment[item.id];
    const equipped = this.save.loadout[item.slot] === item.id;
    const level = owned?.level ?? 0;
    const cost = Math.round(item.enhancement.baseCost * item.enhancement.growth ** level);
    return `<article class="equipment-card ${equipped ? 'equipped' : ''}">
      <div class="equipment-icon">${item.slot === 'weapon' ? '⌁' : item.slot === 'armor' ? '⬡' : item.slot === 'shoes' ? '≫' : '◈'}</div>
      <div><small>${equipped ? 'EQUIPPED' : owned ? `LEVEL ${level}` : 'BLUEPRINT'}</small><h3>${item.name}</h3><p>${item.description}</p></div>
      <dl><dt>효과</dt><dd>${Object.entries(item.effect).map(([key, value]) => `${key} ${typeof value === 'number' && value < 1 ? `+${Math.round(value * 100)}%` : value}`).join(' · ')}</dd><dt>대가</dt><dd>${Object.entries(item.drawback).map(([key, value]) => `${key} ${Math.round(value * 100)}%`).join(' · ')}</dd></dl>
      <div class="equipment-actions">${owned ? `<button data-equip="${item.id}" ${equipped ? 'disabled' : ''}>${equipped ? '장착 중' : '장착'}</button><button data-upgrade="${item.id}" ${level >= item.enhancement.max ? 'disabled' : ''}>${level >= item.enhancement.max ? 'MAX' : `강화 ${cost} C`}</button>` : `<button data-buy="${item.id}">설계 구매 ${cost} C</button>`}</div>
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
          <article><h2>직교성 검사</h2><strong class="${this.audit.ok && this.balanceAudit.ok ? 'audit-ok' : 'audit-fail'}">${this.audit.ok && this.balanceAudit.ok ? '정적·모의 밸런스 규칙 통과' : '검사 필요'}</strong><p>추천 채용 횟수: ${Object.values(this.audit.usage).join(' · ')}</p><p>모의 최적 비율: ${Object.entries(this.balanceAudit.winnerShare).filter(([, share]) => share > 0).map(([id, share]) => `${id} ${Math.round(share * 100)}%`).join(' · ') || '공동 최적 분산'}</p>${[...this.audit.issues, ...this.balanceAudit.issues].length ? `<ul>${[...this.audit.issues, ...this.balanceAudit.issues].map((issue) => `<li>${issue}</li>`).join('')}</ul>` : '<p>모든 스테이지에 두 가지 이상의 모의 해법이 있고, 미쿠 대체 공략과 30% 최적해 상한을 만족합니다.</p>'}</article>
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
          <div class="hud-left"><button data-combat-action="pause" aria-label="작전 나가기">Ⅱ</button><div><span>${stage.id} · ${stage.title}</span><b>${stage.objective}</b></div></div>
          <div class="hud-center"><span>SCORE</span><b data-hud-score>000000</b><em data-hud-combo></em></div>
          <div class="hud-right"><span title="남은 적"><i class="enemy-dot"></i><b data-hud-enemies>0</b></span><span class="wave-readout">W <b data-hud-wave>1/${stage.waves}</b></span><b data-hud-time>00:00</b></div>
        </div>
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
      onExit: () => this.showScreen('stages')
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
    set('[data-hud-hp-text]', `${Math.ceil(hud.hp)} / ${hud.maxHp}`);
    set('[data-skill-cooldown]', hud.skillCooldown > 0 ? hud.skillCooldown.toFixed(1) : 'READY');
    set('[data-dodge-cooldown]', hud.dodgeCooldown > 0 ? hud.dodgeCooldown.toFixed(1) : 'READY');
    const hp = this.root.querySelector('[data-hud-hp]');
    if (hp) hp.style.width = `${Math.max(0, (hud.hp / hud.maxHp) * 100)}%`;
  }

  showResult(stage, result) {
    result.loadout = { ...this.save.loadout };
    this.save = applyStageResult(this.save, stage, result);
    if (result.success) this.save = this.refreshUnlocks(this.save);
    const overlay = document.createElement('div');
    overlay.className = 'result-overlay';
    overlay.innerHTML = `<div class="result-card ${result.success ? '' : 'failed'}"><p class="eyebrow">${result.success ? 'OPERATION COMPLETE' : 'SIGNAL LOST'}</p><div class="result-rank rank-${result.rank}">${rankNames[result.rank]}</div><h2>${stage.id} ${stage.title}</h2><b class="result-score">${result.score.toLocaleString()}</b><div class="result-stats"><span><small>TIME</small>${this.formatTime(result.elapsed)}</span><span><small>ACCURACY</small>${Math.round(result.stats.accuracy * 100)}%</span><span><small>BREAK</small>${result.stats.breaks}</span><span><small>DAMAGE</small>${Math.round(result.stats.damageTaken)}</span></div><div class="result-actions"><button data-result-action="stages">작전 지도</button><button class="primary-action" data-result-action="retry">다시 출격</button></div></div>`;
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
    if (stageId) return this.showScreen('combat', { stageId });
    const characterId = event.target.closest('[data-character-select]')?.dataset.characterSelect;
    if (characterId) {
      this.save = persistSave({ ...this.save, selectedCharacter: characterId });
      this.toast(`${characterById[characterId].name} 선택`);
      return this.showScreen('roster');
    }
    const buyId = event.target.closest('[data-buy]')?.dataset.buy;
    if (buyId) return this.buyEquipment(buyId);
    const equipId = event.target.closest('[data-equip]')?.dataset.equip;
    if (equipId) return this.equipItem(equipId);
    const upgradeId = event.target.closest('[data-upgrade]')?.dataset.upgrade;
    if (upgradeId) return this.upgradeItem(upgradeId);
    const resultAction = event.target.closest('[data-result-action]')?.dataset.resultAction;
    if (resultAction) {
      const currentStage = event.target.closest('.result-overlay')?.dataset.stageId;
      return resultAction === 'retry' ? this.showScreen('combat', { stageId: currentStage }) : this.showScreen('stages');
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
    const setting = event.target.dataset.setting;
    if (!setting) return;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'range' ? Number(event.target.value) : event.target.value;
    this.save = persistSave({ ...this.save, settings: { ...this.save.settings, [setting]: value } });
    if (event.target.type === 'range') this.showScreen('settings');
  }

  buyEquipment(id) {
    const item = equipmentById[id];
    const cost = item.enhancement.baseCost;
    if (this.save.credits < cost) return this.toast('크레딧이 부족합니다. 작전을 먼저 완료하세요.');
    this.save = persistSave({ ...this.save, credits: this.save.credits - cost, ownedEquipment: { ...this.save.ownedEquipment, [id]: { level: 0, locked: false } } });
    this.toast(`${item.name} 설계를 완성했습니다.`);
    this.showScreen('workshop');
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
    const cost = Math.round(item.enhancement.baseCost * item.enhancement.growth ** owned.level);
    if (this.save.credits < cost) return this.toast('크레딧이 부족합니다.');
    this.save = persistSave({ ...this.save, credits: this.save.credits - cost, ownedEquipment: { ...this.save.ownedEquipment, [id]: { ...owned, level: owned.level + 1 } } });
    this.toast(`${item.name} ${owned.level + 1}단계 강화`);
    this.showScreen('workshop');
  }

  refreshUnlocks(save) {
    const unlocked = new Set(save.unlockedCharacters ?? ['miku']);
    for (const character of characters) {
      const rule = character.unlock;
      if (rule.type === 'starter') unlocked.add(character.id);
      if (rule.type === 'stage' && save.stages[rule.stage]?.cleared) unlocked.add(character.id);
      if (rule.type === 'stageScore' && (save.stages[rule.stage]?.bestScore ?? 0) >= rule.score) unlocked.add(character.id);
      if (rule.type === 'challenge' && save.stages[rule.stage]?.rank === 'gold') unlocked.add(character.id);
    }
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

  destroy() {
    this.combat?.destroy();
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('change', this.onChange);
    this.root.innerHTML = '';
  }
}
