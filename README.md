# MikuTPS — Resonance Protocol

모바일 가로모드에 맞춘 three.js 싱글플레이 TPS입니다. 한 캐릭터의 전투력으로 모든 규칙을 지우는 구조 대신, 13명의 서로 다른 능력과 50개 스테이지 기믹을 맞춰 가는 직교성 중심 캠페인을 목표로 합니다.

## 실행

```powershell
pnpm install
pnpm dev
```

키보드에서는 `WASD` 이동, `J` 사격, `Space` 회피, `E` 스킬을 사용합니다. 모바일에서는 좌측 이동 패드와 우측 조준/사격 패드를 동시에 조작합니다.

모바일의 출격 탭은 Fullscreen API 진입을 함께 시도하며, 전투 HUD의 `⛶` 버튼(키보드 `F`)으로 언제든 전체화면을 전환할 수 있습니다. 브라우저가 Fullscreen API를 막는 경우 홈 화면에 추가해 실행하면 웹앱 매니페스트의 가로 `fullscreen` 모드로 열립니다.

## 장비 직교성

무기·보호구·신발·장신구는 슬롯별 8개, 총 32개입니다. 새 세이브와 이전 세이브 모두 슬롯별 3개를 즉시 보유해 비교할 수 있습니다. 캐릭터 궁합은 최적 공명(효과 180%·대가 70%), 중립, 역상성(효과 15%·대가 200%·추가 페널티)으로 나뉘며, 모든 캐릭터가 각 슬롯에서 최적 장비와 역상성 장비를 최소 하나씩 갖도록 자동 검사합니다.

## 중복 없는 영입

새 세이브는 미쿠 한 명으로 시작합니다. 오퍼레이터 영입은 `2,800 C`, 장비 랜덤 조달은 슬롯별 `900 C`이며 이미 보유한 결과는 풀에서 제거됩니다. 장비는 직접 설계 구매 대신 원하는 슬롯을 선택해 미보유 장비를 하나씩 조달합니다. 실제 결제·유료 재화·서버는 없습니다.

## 보스와 모바일 성능

보스는 체력 2/3·1/3을 경계로 `탐색 압박 → 교차 포위 → 공명 폭주`의 3단계 상태를 전환합니다. 단계별 탄막과 장판은 개수 상한과 1초 이상의 예고 시간을 가지며, 브레이크로 위험기를 취소하면 3.6초 동안 피해 2.2배 폭딜 창이 열립니다. 보스 단계·체력·브레이크 남은 시간은 전투 HUD에서 확인할 수 있습니다.

트레이서, 충격파, 적·플레이어 투사체, 보스 예고 장판은 상한이 있는 오브젝트 풀로 재사용합니다. 렌더링은 고정 60Hz 전투 시뮬레이션과 분리되며, 자동 품질은 DPR·그림자·렌더 FPS를 단계적으로 낮춰 저사양 모바일의 30fps 경로를 제공합니다.

## 검사

```powershell
pnpm test
pnpm build
pnpm verify:deploy
pnpm audit:release
```

정적 콘텐츠 검사는 50개 스테이지의 고유 기믹 조합, 캐릭터별 강점과 약점, 추천 분포, 장비의 효과와 대가, 강화 상한, 영문 GLB 파일명과 SHA-256 보존 여부를 검증합니다.

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 다음 순서로 실행됩니다.

1. 잠금 파일 기준 의존성 설치
2. 콘텐츠·직교성 자동검사
3. 자산 권리 기록·파일 해시 감사
4. Vite 정적 빌드와 Pages 상대 URL 검증
5. `dist`를 GitHub Pages 아티팩트로 배포

저장소의 **Settings → Pages → Source**는 `GitHub Actions`로 설정합니다. 빌드는 상대 URL을 사용하므로 `https://사용자.github.io/MikuTPS/`, 다른 저장소 이름, 커스텀 도메인에서 동일한 `dist`를 호스팅할 수 있습니다.

## Cloudflare Pages 배포

Cloudflare Pages에서 GitHub 저장소를 연결한 뒤 다음 값으로 프로젝트를 생성합니다.

- 프로덕션 브랜치: `main`
- 프레임워크 프리셋: `Vite` (목록에 없으면 `None`)
- 빌드 명령: `pnpm build:pages`
- 빌드 출력 디렉터리: `dist`
- 루트 디렉터리: 비워 둠 (저장소 루트)
- 환경 변수: `PNPM_VERSION=11.7.0` (Production과 Preview 모두)

Node.js는 저장소의 `.node-version`으로 `22.16.0`을 사용합니다. 별도의 API 키나 런타임 환경 변수는 필요하지 않습니다. `base: './'`과 상대 웹앱 매니페스트 경로 덕분에 GitHub Pages의 `/MikuTPS/` 하위 경로와 Cloudflare Pages의 루트 경로에서 같은 `dist`가 작동합니다.

## 자산

- `assets-source/characters`: 공개 빌드에서 격리된 SHA-256 보존 영문 원본
- `public/assets/models/characters/runtime`: 게임에서 읽는 런타임 사본
- `src/data/assets.js`: 캐릭터 ID, 경로, 해시, 리그·라이선스 조사 상태

모든 제공 GLB는 사용자가 Copyright-free 자산임을 확인했으며, 이 확인과 SHA-256은 `assets-source/asset-provenance.json`에 기록됩니다. 모델별 출처 URL은 사용자가 추후 이 README에 보완합니다. `pnpm audit:release`로 권리 기록과 파일 무결성을 검사할 수 있습니다.
