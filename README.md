# MikuTPS — Resonance Protocol

모바일 가로모드에 맞춘 three.js 싱글플레이 TPS입니다. 한 캐릭터의 전투력으로 모든 규칙을 지우는 구조 대신, 13명의 서로 다른 능력과 50개 스테이지 기믹을 맞춰 가는 직교성 중심 캠페인을 목표로 합니다.

## 실행

```powershell
pnpm install
pnpm dev
```

키보드에서는 `WASD` 이동, `J` 사격, `Space` 회피, `E` 스킬을 사용합니다. 모바일에서는 좌측 이동 패드와 우측 조준/사격 패드를 동시에 조작합니다.

모바일의 출격 탭은 Fullscreen API 진입을 함께 시도하며, 전투 HUD의 `⛶` 버튼(키보드 `F`)으로 언제든 전체화면을 전환할 수 있습니다. 브라우저가 Fullscreen API를 막는 경우 홈 화면에 추가해 실행하면 웹앱 매니페스트의 가로 `fullscreen` 모드로 열립니다.

## 검사

```powershell
pnpm test
pnpm build
pnpm verify:pages
```

정적 콘텐츠 검사는 50개 스테이지의 고유 기믹 조합, 캐릭터별 강점과 약점, 추천 분포, 장비의 효과와 대가, 강화 상한, 영문 GLB 파일명과 SHA-256 보존 여부를 검증합니다.

## GitHub Pages 배포

`main` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml`이 다음 순서로 실행됩니다.

1. 잠금 파일 기준 의존성 설치
2. 콘텐츠·직교성 자동검사
3. Vite 정적 빌드
4. `dist`를 GitHub Pages 아티팩트로 배포

저장소의 **Settings → Pages → Source**는 `GitHub Actions`로 설정합니다. 빌드는 상대 URL을 사용하므로 `https://사용자.github.io/MikuTPS/`, 다른 저장소 이름, 커스텀 도메인에서 동일한 `dist`를 호스팅할 수 있습니다.

## 자산

- `assets-source/characters`: 공개 빌드에서 격리된 SHA-256 보존 영문 원본
- `public/assets/models/characters/runtime`: 게임에서 읽는 런타임 사본
- `src/data/assets.js`: 캐릭터 ID, 경로, 해시, 리그·라이선스 조사 상태

모든 제공 GLB의 배포 라이선스 상태는 현재 `unverified`입니다. 공개 배포 전 확인하거나 교체해야 합니다.
