# Spoonie 개발 디렉터리와 배포 기준 (2026-11-09)

> 이 문서는 **소스가 동일한 Git 저장소의 서로 다른 worktree**와 실제 배포 대상을 혼동하지 않기 위한 운영 안내다. 디렉터리가 따로 있다고 해서 별도 Netlify 사이트가 자동으로 생기는 것은 아니다.

| 역할 | Mac 경로 | 원칙 |
| --- | --- | --- |
| 프로덕션·운영 기준 저장소 | `/Users/ojihun/DEV/spoonie` | 현재 Git `main`을 기준으로 운영한다. 기존 **미커밋 파일·복구 stash·.context**가 있으므로 무조건 pull/reset/clean/checkout 금지. 본문 원본·GSC/운영 작업 기록의 기준 디렉터리 |
| **디자인 통합/실기능 QA 주 작업 공간** | `/Users/ojihun/DEV/spoonie-design-tdd-v2` | 이곳에서 기존 실제 Next.js 컴포넌트를 개선하고, 더미 로컬 프리뷰·TDD·브라우저 시각 검증을 수행한다. **실제 서비스와 혼동하지 않는다.** PR을 낼 때는 최신 `origin/main`으로부터 유효한 feature branch를 사용한다 |
| **디자인 목업 레퍼런스** | `spoonie/artifacts/design/2026-11-06-product-faithful-mockup/all-pages-v2` | 별도의 정적 인터랙티브 디자인 보드. 실제 React 앱 및 배포 결과를 대체하지 않는다. 현재 리비전 `20261109-1` |
| **일회성 통합/배포 검증** | `/Users/ojihun/DEV/spoonie-header-release-20261109` | 이번 상단바 정렬 변경을 `main` 기준으로 체리픽하여 새 PR을 만드는 **임시 worktree**. 병합 및 배포 검증 후 정리한다. 이후 재사용 금지 |
| **이전 작업 분기(종료됨)** | `feat/spoonie-design-preview-20261107` / PR #7 | 2026-11-08 이미 병합된 PR. 브랜치가 남아 있어도 신규 커밋을 push한다고 기존 Deploy Preview가 새로 만들어지지 않는다. **새 PR을 사용한다** |
| 별도 홍보/콘텐츠 운영 | `/Users/ojihun/DEV/spoonie-campaign-ops`, `/Users/ojihun/DEV/spoonie-reel-studio` 등 | 독립 운영 책임. 디자인/개발 정리를 이유로 이동·삭제·배포·스케줄 변경하지 않는다 |

## 디자인 변경 → 배포 원칙

1. 디자인 실제 코드는 `spoonie-design-tdd-v2`의 기존 Next.js 컴포넌트에 구현한다. 목업 파일만 수정한 것은 배포 가능한 앱 변경이 아니다.
2. **최근 `origin/main` 기준 새 작업 브랜치**에서 해당 변경만 반영하고 테스트한다. 더티 `spoonie` 기본 디렉터리를 덮어쓰지 않는다.
3. **새 GitHub PR → Netlify Deploy Preview → 시각/기능 QA → PR 병합 → Netlify 운영 주소 확인** 순으로 배포한다. 종료된 PR #7/기존 프리뷰 URL을 새로운 변경의 배포 완료 증거로 재사용하지 않는다.
4. GitHub push·PR 생성·PR 병합·Netlify Preview 준비·실제 서비스 반영은 **서로 다른 단계**다. 매 단계 실제 SHA·URL·HTTP 동작을 확인한다.
5. 기능 테스트 통과만으로 실제 기기·인증·계정 데이터·권한 등 모든 디자인 QA가 완료됐다고 주장하지 않는다. 중대한 사용자 데이터나 외부 게시, 서비스 제어 변경은 별도 승인 범위를 확인한다.

## 안전한 정리 규칙

- 작업이 완료된 임시 worktree는 **`git status --porcelain`이 비고, PR/커밋/배포를 확인한 다음** 등록된 worktree를 `git worktree remove <path>`로 제거한다.
- 임시 worktree 안에 미추적 또는 미커밋 파일이 있으면 중단하고 소유자를 확인한다. 원본 저장소·디자인 주 작업 공간·SNS 작업 디렉터리는 삭제·이동하지 않는다.
- `git worktree prune --dry-run`에서 지적된 **실제 디렉터리가 이미 없는** 임시 worktree의 Git 메타데이터만 정리할 수 있다. 실제 파일이나 브랜치를 무조건 삭제하지 않는다.
- 추적 종료 브랜치/복구 stash는 명시적인 점검 없이 삭제하지 않는다.

## 작업 시작할 때의 체크

```sh
cd /Users/ojihun/DEV/spoonie
git worktree list
git ls-remote origin refs/heads/main
git status --short

cd /Users/ojihun/DEV/spoonie-design-tdd-v2
git branch --show-current
git status --short
```

완료 판정은 작업 시점의 브랜치와 원격 배포를 실제로 확인한 기록에 따른다. 이 문서의 경로는 2026-11-09의 로컬 환경에 대한 기록이다.
