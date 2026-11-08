---
name: Spoonie
description: 큰 음식 사진과 여유로운 소셜 피드, 개인 레시피북을 결합한 따뜻한 음식 커뮤니티
colors:
  door: "#f2ece5"
  paper: "#fffcf8"
  ink: "#38251c"
  ink-soft: "#65554a"
  brand-orange: "#a64524"
  orange-ink: "#a64524"
  rule-line: "#e7d9cc"
  paper-tint: "#f7ebde"
  changed-mark: "#eddbc9"
  selection: "#ffd2b0"
  magnet-red: "#c4553f"
  magnet-orange: "#e07a2e"
  magnet-yellow: "#d9a93a"
  magnet-green: "#5e8c64"
  magnet-blue: "#3f6e9e"
  magnet-purple: "#7b63a6"
  magnet-gray: "#8f8a82"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  step:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.55
  title:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "-0.015em"
  heading:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  read:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  micro:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  sheet: "14px"
  check: "4px"
  field: "8px"
  control: "8px"
  magnet: "9999px"
spacing:
  door-gutter: "12px"
  sheet-gap: "12px"
  sheet-inset: "16px"
  section-y: "20px"
  row-min: "48px"
  target: "44px"
components:
  button-primary:
    backgroundColor: "{colors.orange-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-step-next:
    backgroundColor: "{colors.orange-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    height: "56px"
  button-step-prev:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "56px"
  servings-stepper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
  ingredient-row:
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    height: "48px"
  amount-changed:
    backgroundColor: "{colors.changed-mark}"
    textColor: "{colors.ink}"
    typography: "{typography.amount}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "16px"
  magnet:
    rounded: "{rounded.magnet}"
    size: "32px"
  amount-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    height: "44px"
    width: "80px"
---

# Design System: Spoonie

## Overview

**Creative North Star: "냉장고 문"**

레시피는 다시 꺼내 요리하는 개인 레시피북의 한 장이고, 레시피드는 그 위에 이어지는 실제 요리 기록이다. 승인된 전체 화면 목업 리비전 20261107-3은 크림빛 종이 면·코코아 잉크·테라코타 주요 행동·음식 사진이 중심인 소셜 피드다. 레시피와 레시피드의 관계가 서비스의 핵심이다. 색상 라벨은 개인 레시피북을 구분하는 작은 자석으로만 사용한다.

밀도는 부엌에서 휴대폰을 세워 두고 한 손으로 읽는 거리에 맞춘다. 재료·단계 줄은 17px, 누르는 곳은 44px 이상, 재료 한 줄은 48px 이상이다. 재료와 만드는 법은 승인된 실제 내용 전환이 있는 밑줄 탭으로 나눈다. 장식성 회색 탭·슬라이더·주황 원 번호는 쓰지 않는다. 읽기부터 요리 완료까지 같은 크림색 면과 구분선의 규칙을 따른다.

**적용 범위.** 홈 피드, 레시피·레시피드 상세와 요리 모드, 레시피북, 프로필, 검색, 로그인·가입·비밀번호 화면, 상단 막대와 하단 탭, 스플래시, 공통 버튼과 입력이 이 세계를 따른다. 레시피·레시피드 작성 폼(쓰는 순서 = 읽는 순서), 알림, 프로필 수정, 저장한 글, 법적 고지, 오프라인·오류 화면, 공통 모달·시트·토스트까지 모든 화면이 이 세계를 따른다. 새 화면은 이 문서와 아래 Interface Grammar를 따르고, 옛 화면을 근거로 삼지 않는다.

**Key Characteristics:**
- 따뜻한 door 배경과 cream paper 내용 면, 일반 카드 그림자 없음
- 코코아 ink · ink-soft 계층과 테라코타 강조
- 테라코타는 주요 동작 면에만, 그 위 글자는 밝은 paper
- 1px 구분선 하나로 영역을 나눈다
- Pretendard 한 가족, 숫자는 tabular, 세는 분량은 1/2·1/3 같은 부엌 분수
- 바뀐 분량은 연한 문 판 빛 표시를 잠시 유지한다

## Colors

승인된 목업의 크림색 바탕·종이색 내용 면·테라코타 주요 동작을 사용한다. 본문은 갈색 잉크, 보조 정보는 #65554a로 표시한다. 음식 사진이 정보의 중심이다.

### Primary
- **주요 동작 면** (primary): 승인된 목업의 테라코타 #a64524와 밝은 글자색을 사용한다.
- **테라코타 강조** (brand-orange): 로고·선택 상태·주요 행동에 공통 사용한다. 개별 컴포넌트에 색상을 다시 정의하지 않는다.
- **테라코타 잉크** (orange-ink): 링크, 활성 탭과 포커스 링에 사용하는 #a64524.

### Neutral
- **법랑 문 판** (door): 상세 화면과 요리 모드의 바닥. 종이가 놓이는 면이며 그 자체에 내용이 올라가지 않는다. 요리 모드 단계 레일의 빈 칸 뒤 배경이기도 하다.
- **종이** (paper): 레시피 본문, 댓글, 참고 레시피 가장자리, 요리 모드 단계 카드, 상세 상단 막대의 면.
- **흑연** (ink): 제목, 본문, 재료 이름, 분량, 체크된 상자 면.
- **옅은 흑연** (ink-soft): 메타 줄, 단위, 개수, 끝낸 단계와 지운 재료, 비활성 아이콘. 종이 위 5.6:1, 문 판 위 4.7:1.
- **구분선** (rule-line): `--border`. 재료 줄 사이, 단계 사이, 섹션 머리 위의 1px 선, 인분 조절기 테두리.
- **종이 그늘** (paper-tint): `--muted`. 단계 사진이 로드되기 전 자리.
- **선택 영역** (selection): 텍스트를 드래그 선택했을 때의 연한 주황 배경, 글자는 ink.

### Tertiary
- **바뀐 분량 표시** (changed-mark): 인분을 바꾸거나 가진 재료 양에 맞출 때 값이 바뀐 분량 숫자 뒤에 2.5초 동안 깔린다. 옅은 살구색이라 종이 위에서 조용히 보인다.
- **자석 색** (magnet-red ~ magnet-gray): 레시피 색상 라벨이 있을 때만 종이 왼쪽 위를 누르는 20px 납작한 단추 자석의 색(목록 16px). 라벨 값(red, orange, yellow, green, blue, purple, gray)과 1:1로 대응한다. 돌빛 문 판에 맞춰 채도를 낮춘 흙빛 계열이다. 자석 외의 장식에는 쓰지 않는다.

### Tokens in code
- 색의 유일한 출처는 `src/app/globals.css`의 `:root` RGB 변수다. `tailwind.config.ts`는 그 변수만 가리키고, 컴포넌트는 hex나 Tailwind 기본 팔레트(gray-500 등)를 쓰지 않는다.
- 팔레트 이름(door, paper, ink, ink-soft, orange-ink, changed-mark, like)과 shadcn 역할 이름(primary, muted, accent, border, ring, destructive)은 같은 변수를 가리킨다. 역할 이름: muted·accent·secondary = paper-tint, border·input = rule-line, ring = orange-ink, destructive = danger.
- 그 밖의 색: **좋아요** (like) #d6453d, 채운 하트와 하트 hover. **지우기·오류** (danger) #a82c26, 종이 위 5:1.
- 그림자 색도 `rgb(var(--ink) / a)`로 쓴다. 자석 색은 `src/features/recipe/domain/color-options.ts` 한 곳에 있다.

### Named Rules
**The 테라코타 행동 Rule.** 주요 버튼 면은 테라코타, 글자는 밝은 종이색으로 표현한다. 선택 탭은 크림색 면과 테라코타 밑줄이다.

**The 주요 행동 하나 Rule.** 화면에서 가장 중요한 행동 하나만 강한 테라코타 면으로 강조한다.

**The 라벨 있을 때만 Rule.** 자석은 색상 라벨이 지정된 레시피에만 나타난다. 라벨이 없으면 자석 자리를 비워 둔다.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, -apple-system, system-ui, Apple SD Gothic Neo, Noto Sans KR)
**Body Font:** Pretendard Variable (같은 가족)

**Character:** 한글을 위해 고른 한 가족으로 모든 계층을 굵기와 크기만으로 나눈다. 자체 호스팅한 가변 동적 서브셋(`/fonts/pretendard`, weight 45–920, `font-display: swap`)이며, 본문 전체에 `word-break: keep-all`을 걸어 한국어가 어절 단위로 줄을 바꾼다.

### Hierarchy
글자는 크기 값이 아니라 **역할 이름**으로 쓴다 (`tailwind.config.ts` fontSize, 클래스 `text-<역할>`). 역할마다 굵기·줄 간격·자간이 함께 정해져 있어 같은 역할은 어느 화면에서나 같은 모양이다. 아래 9개 밖의 크기는 쓰지 않는다.

| 역할 | 크기 / 줄 간격 | 굵기 | 쓰는 곳 |
|---|---|---|---|
| `display` | 25 / 1.3, -0.02em | 700 | 레시피 상세 제목, 요리 완료 제목. 화면에 하나 |
| `step` | 26 / 1.55 | 500 | 요리 모드의 지금 단계 설명 (팔 길이 거리) |
| `title` | 20 / 1.35, -0.015em | 700 | 페이지 제목, 피드의 레시피 제목, 프로필 이름 |
| `heading` | 17 / 1.4, -0.01em | 600 | 섹션 머리("재료 5"), 목록·빈 상태 제목, 분량 숫자 |
| `read` | 17 / 1.65 | 400 | 재료 이름, 조리 단계. 부엌에서 거리를 두고 읽는 줄 |
| `body` | 16 / 1.6 | 400 | 소개, 레시피드 본문, 안내 문단 |
| `label` | 15 / 1.4 | 500 | 버튼, 탭, 입력, 이름, 한 줄 메타 |
| `caption` | 14 / 1.5 | 400 | 사진 이름, 입력 안내, 보조 정보 |
| `meta` | 13 / 1.45 | 400 | 시각, 개수, 보조 설명, 오류 문구 |
| `micro` | 11 / 1.2 | 600 | 숫자 배지에만 |

**굵기는 역할을 따른다.** 700은 display·title, 600은 heading과 강조(이름, 고른 수), 500은 조작부(label), 400은 읽는 글. display·title·heading에는 `font-bold` 같은 굵기 클래스를 붙이지 않는다(역할이 정한다).

### Named Rules
**The Tabular Rule.** 개수·분량·단계 번호·좋아요 수 같은 숫자는 모두 tabular 숫자로 쓴다.

**The 부엌 분수 Rule.** 컵·큰술·개처럼 세는 단위의 분량은 1/4, 1/3, 1/2, 2/3, 3/4 분수로 쓰고, g·ml 같은 무게·부피는 정수로 반올림한다(10 미만은 소수 한 자리). "1.0 개" 같은 소수 꼬리를 남기지 않는다.

## Layout

레시피 상세는 54px 상단 헤더, 3:2 대표 사진, 제목/메타/설명/태그/반응, 53px 탭, 재료 및 조리 방법의 순서다. 하단에는 71px 요리 시작 바와 64px 네비게이션을 분리한다. 기기 상태 표시줄과 홈 인디케이터는 OS가 담당한다.

참고 레시피가 있으면 본문 종이 위에 최대 두 장의 종이 가장자리가 좌우 8px 안쪽으로 들어가 겹치고, 각각 -0.6deg, 0.4deg 기울어 아래 종이에 6px 정도 묻힌다. 기울기는 이 겹친 가장자리에만 있다.

재료 줄은 최소 48px, 누르는 것은 모두 44×44px 이상이다. 행동 줄(좋아요·댓글 / 저장·공유)은 종이 안에서 양 끝으로 나뉜다.

레시피 댓글은 재료·만드는 법 아래, 레시피드 댓글은 반응 버튼 아래에 놓는다. 입력창과 최근 댓글 세 묶음을 먼저 보여 주고 이전 댓글은 같은 자리에서 펼친다. 반응 줄의 댓글 아이콘은 이 섹션으로 이동한다.

요리 모드는 문 판 전체 화면이다. 위에 닫기·진행(“N / M단계”)·재료 열기, 그 아래 단계 수만큼 나뉜 4px 레일, 가운데 지금 단계 종이 한 장(최소 45dvh), 그 아래 다음 단계 미리보기, 맨 아래 엄지 자리에 1:2 비율의 이전/다음 버튼이 놓인다. 안전 영역(safe-area) 여백을 위아래에 둔다. 좌우로 60px 이상 밀면 단계를 넘긴다.

## Elevation & Depth

내용 면은 간격과 구분선으로 나눈다. 일반 카드의 `--sheet-shadow`는 none이며, 다이얼로그와 메뉴처럼 떠 있는 조작에만 그림자를 사용한다.

### Shadow Vocabulary
- **내용 면:** 그림자 없음. 다이얼로그의 그림자는 내용 면과 분리한다.
- **자석 그림자**: 위에서 비치는 빛 한 점(왼쪽 위 흰 방사형), 아래쪽 옆면 두께(안쪽 아래 2px 그늘), 종이 위에 뜬 짧은 두 겹 그림자. 색상 라벨 자석에만.

### Named Rules
**The 한 겹 Rule.** 장식 카드와 그림자를 중첩하지 않는다. 스크롤 본문은 공통 종이색과 구분선만으로 조합한다.

## Shapes

카드는 14px, 입력과 일반 조작부는 8px, 단계 사진은 11px, 다이얼로그는 20px 모서리를 쓴다. 상세의 연속된 읽기 면과 작성 폼은 별도 카드 겹침 없이 평평한 종이색 면을 사용한다.

## Components

### Buttons
손에 밀가루가 묻어도 누를 수 있는, 크고 평평한 면.
- **Shape:** 살짝 둥근 모서리 (8px)
- **Size:** 높이 44px 하나(화면 아래 고정된 주요 버튼만 48px). 작은 버튼(sm)도 40px 아래로 내리지 않는다. 글자는 `label`.
- **Primary:** 테라코타 면에 종이색 글자 600, 좌우 16px. hover 90%, 누르는 동안 80% 농도. 화면당 하나.
- **Outline:** 종이 면에 흑연 20% 선, hover에서 35%와 종이 그늘. 입력칸과 같은 선.
- **Ghost:** 선 없이 글자만, hover에 흑연 5% 면. 도구 줄 아이콘, "선택"·"완료", 카드 머리의 팔로우 아이콘(사람+ 주황 잉크 / 사람✓ 옅은 흑연, 상태는 aria-label)처럼 같은 줄에 여럿 놓이는 동작.
- **Step Next / Prev (요리 모드):** 높이 56px, 17px. 다음은 테라코타 면에 밝은 글자로 폭의 2/3, 이전은 종이 면에 흑연 20% 선으로 1/3. 첫 단계에서 이전은 ink-soft 40%로 비활성.
- **Icon:** 44×44px 투명 버튼, 아이콘 20–24px, 색은 ink-soft. 각 아이콘 버튼은 aria-label을 갖는다.
- **Text link:** ink 글자에 밑줄(4px 띄움). "원래대로" 같은 보조 동작.
- **Focus:** 2px orange-ink 링(`--ring`).

### Servings Stepper (인분 조절기)
재료 머리 오른쪽 끝에 붙는 1px 구분선 테두리의 8px 상자. 양쪽 44×44px −/+ 버튼 사이에 16px 600 tabular "N인분" 출력(최소 4.5rem)이 있다. 값을 바꾸면 아래에 "원래 N인분 기준에서 바꾼 양이에요. 원래대로" 안내가 나타난다. 직접 맞춘 상태에서는 "직접 맞춤"으로 표시한다.

보유량 조절 진입은 인분 조절기 아래에 폭 전체를 쓰는 44px 이상 outline 버튼으로 둔다. 버튼은 저울 아이콘, "보유량으로 재료량 맞추기" 제목, 오른쪽 화살표를 가지며, 설명 "한 재료의 양만 입력하면 / 나머지도 자동 계산돼요."를 같은 버튼 안에서 제목 아래에 15px 본문 크기로 두 줄 배치한다. 버튼 좌우 패딩과 설명 텍스트 시작선을 맞추고, 위아래 간격은 12px 기준으로 정렬한다. 일반 재료 수량은 계속 정보로만 표시한다.

보유량 조절 모드에서 선택된 재료는 채워진 라디오 아이콘과 옅은 종이 그늘, 둥근 외곽선으로 표현한다. 선택 행 오른쪽에 "기준" 같은 상태 문구를 붙이지 않는다. 선택 재료의 보유량 입력은 재료명 아래에 들여써서 표시하고, 나머지 재료는 기존 분량을 오른쪽에 유지한다.

### Ingredient Checklist Row
줄 전체가 체크 버튼(최소 48px). 왼쪽 20px 체크 상자(4px, 1.5px ink-soft 선 / 체크 시 ink 면에 종이색 체크), 가운데 17px 이름, 오른쪽 분량+단위. 체크하면 이름이 ink-soft로 바뀌고 취소선이 그어진다. 분량이 바뀌면 숫자 뒤에 changed-mark가 2.5초 깔렸다가 500ms에 걸쳐 사라진다(감속 동작 설정 시 즉시).

### Step Row
단계 번호는 원이 아닌 18px 700 tabular 맨 숫자이며 그 자체가 44px "끝냄 표시" 토글이다. 끝낸 단계는 번호가 체크 아이콘으로 바뀌고 설명이 ink-soft로 옅어진다. 단계 사진은 설명의 들여쓰기 밖에서 본문 가로폭 전체를 쓰는 3:2 프레임과 11px 모서리다. 요리 모드에서는 contain으로 사진 전체를 보존한다.

### Cards / Containers (종이)
- **Corner Style:** 카드 14px, 연속된 상세·작성 면 0px
- **Background:** paper, 문 판(door) 위에만 놓는다
- **Shadow Strategy:** 종이 그림자 하나 (Elevation 참조)
- **Border:** 없음. 내부 구획은 위쪽 1px 구분선
- **Internal Padding:** 좌우 16px, 섹션 위아래 20px

### Magnet (색상 라벨)
납작한 단추 자석. 격자 카드는 지름 20px로 종이 왼쪽 위(왼쪽 14px)에서 위로 8px 걸쳐 종이 머리를 누르고, 목록 줄은 16px로 종이 왼쪽 가장자리 가운데에 걸친다. 고르기 칸(작성 폼·필터)도 같은 자석을 쓴다. 라벨 이름을 aria-label로 갖는다. 레시피 상세에는 그리지 않는다(색상 라벨은 레시피북 정리 도구).

### Cited Peek (참고한 레시피 가장자리)
본문 종이 뒤로 겹친 종이 가장자리 한 줄. 14px로 "참고한 레시피"(ink-soft) + "작성자의 제목"(600 ink), 두 장을 넘으면 마지막 줄 끝에 "외 N개". 줄 전체가 그 레시피로 가는 링크다.

### Inputs / Fields
- **Style:** 버튼과 같은 규격. 높이 44px, 8px 모서리, 종이 면에 흑연 20% 선(hover 35%), 좌우 14px, 글자 `body`, 자리 안내 글자는 ink-soft 80%. 검색칸은 왼쪽 18px 돋보기에 맞춰 안쪽 36px.
- **Focus:** 테두리가 흑연으로 진해진다(링을 겹치지 않는다). 여러 줄 입력도 같다.
- **분량 입력:** 6px 모서리, 폭 80px, `heading` tabular 오른쪽 정렬 ("가진 재료 양에 맞추기").

### Tool Row (도구 줄)
목록 화면 위의 한 줄(높이 44px): 검색칸이 남은 폭을 다 쓰고, 오른쪽에 선 없는 아이콘 버튼과 글자 버튼. 고르는 모드에서는 같은 높이·같은 자리에서 "N개 골랐어요 · 지우기 · 완료"로 바뀌어 아래 목록이 움직이지 않는다. 켜는 "선택"과 끄는 "완료"는 같은 오른쪽 끝에 있다.

### Navigation
- **레시피 상세 상단 막대:** 높이 54px, 왼쪽 뒤로 가기, 가운데 작성자 프로필(사진·이름), 오른쪽 더보기. 기존 팔로우·수정·공유 행동은 유지한다.
- **요리 모드 막대:** 문 판 위 닫기(44px) · "N / M단계"(16px 600 tabular, 분모는 400 ink-soft) · 재료 열기(밑줄 텍스트). 그 아래 4px 단계 레일: 지난 단계와 지금 단계는 ink, 남은 단계는 paper.

## Interface Grammar

화면이 바뀌어도 같은 뜻은 같은 모양으로 보인다. 새 화면은 아래 문법에서 고르고, 새 모양을 만들지 않는다.

### 1. 두 가지 대상, 한 가지 관계 (성장 고리를 화면에 그린다)
레시피 → 실제로 만듦 → 레시피드 → 작성자 발견 → 그 사람의 다른 레시피. 화면은 이 고리의 연결점을 가장 잘 보이게 둔다.
- **피드는 음식 사진이 먼저다.** 작성자 줄 → 3:2 사진 → 제목·메타·설명 → 태그 → 반응 버튼 순서다. 피드에서 태그 세 개를 먼저 보여 주고, 나머지는 반응 버튼 위의 +N 링크를 눌러 상세에서 볼 수 있다. 게시물은 문 판 색 바탕에 놓고 사이를 32px 띄운다.
- **레시피드(활동)는 출처가 먼저, 그다음 사진이다.** 출처가 있으면 사진 위에 출처 행(`SourceRow`)을 둔다: 레시피 썸네일, 관계 동사("○○의 레시피로 만들었어요" / "참고한 레시피 · ○○"), 레시피 제목, 화살표. 행 전체가 레시피로 가는 링크다. 카드 안의 카드가 아니라 1px 선으로 나뉜 행이다.
- **레시피의 신뢰는 "만든 사람"으로 보인다.** 다른 사람이 실제로 만든 기록이 있으면 피드 카드와 상세 제목 아래에 `MadeProof`: 만든 사진 동그라미(최대 3)와 "N명이 만들어 봤어요 · 이어진 레시피 N". 작성자 본인의 기록은 세지 않고, 0이면 그리지 않는다. 좋아요 수보다 앞에 둔다.
- **상세 화면은 고리의 허브다.** 레시피: 참고한 레시피(종이 뒤 가장자리) → 본문 → 만들어 본 기록(+ "이 레시피로 만들었어요") → 이어진 레시피(+ "참고해서 내 레시피 만들기") → 작성자의 다른 레시피. 레시피드: 출처 행 → 사진·글 → 같은 레시피로 만든 다른 기록 → 작성자의 레시피.
- **레시피 카드에는 핵심 재료가 보인다.** 피드 카드의 메타 아래에 "재료 N가지 · 앞 3개 외". 사진을 가려도 무엇을 만드는 글인지 읽혀야 레시피다.
- **찾기 화면은 레시피가 중심이다.** 탐색: 레시피 목록(다른 사람이 만든 수 → 좋아요 → 최신) 다음에 "요즘 만들어 본 기록"(사진 아래에 만든 레시피 제목). 검색 결과 탭 순서는 레시피 / 레시피드 / 사람이고, 레시피는 글이 먼저인 목록, 레시피드는 사진 격자로 둔다. 두 종류를 한 격자에 섞지 않는다.
- **출처는 기억에 맡기지 않는다.** 레시피 화면에서 들어온 레시피드는 출처가 자동으로 붙는다. "+"로 들어온 레시피드는 첫 질문이 "어떤 레시피로 만들었나요?"다(선택).
- **알림도 관계 동사를 쓴다.** "○○님이 회원님의 레시피로 만들어 봤어요" / "참고해 레시피드를 남겼어요" / "참고해 새 레시피를 썼어요".
- **관계는 세 단어만 쓴다.** "○○의 레시피로 만들었어요"(cooked), "참고한 레시피"(referenced), "이어진 레시피 · 고친 버전"(adapted). 문형과 위치를 바꾸지 않는다.

### 2. 보기를 나누는 기준은 "무엇"이지 "어떻게"가 아니다
- 레시피 상세는 재료 / 만드는 법 탭으로 전환하며 인분·체크·단계 상태를 보존한다. 목록과 검색에서는 대상 종류 또는 범위별 탭을 사용한다.
- 레시피 상세 탭은 53px 높이에 크림 배경과 테라코타 3px 밑줄을 사용하고 화살표 키·Home·End·ARIA 전환을 지원한다.

### 3. 색상 라벨은 주인의 정리 도구다
- 레시피북의 "나의 레시피"와 작성·수정 폼, 필터에서만 보인다(자석).
- 레시피 상세, 피드, 프로필, 검색에서는 보이지 않는다. 다른 사람에게는 뜻이 없는 표시다.

### 4. 이미지 프레임
- 레시피 상세 대표 사진은 위와 양옆에 12px 여백을 두고, 모서리를 둥글게 처리한다. 3:2 cover 프레임과 장수 카운터를 사용한다. 레시피드·목록·단계 사진은 실제 해당 목업과 비교한다.
- 피드와 목록은 `object-cover`로 프레임을 채운다. 요리 모드에서는 `object-contain`으로 사진 전체를 보여 준다. 요리 중에는 잘린 부분이 정보다.
- 원본 사진과 cover_focal 위치를 보존한다. 레시피 상세는 3:2 cover를 사용하고, 요리 모드 단계 사진은 contain으로 전체 조리 정보를 보여 준다.
- 올릴 때 브라우저에서 줄인다. 사진은 긴 변 1280px JPEG(품질 0.8)와 함께 400px·800px 버전(`이름.w400.jpg`, `이름.w800.jpg`)을 올리고, 화면은 `Photo`(srcset)로 크기에 맞는 것 하나만 받는다. 프로필 사진은 320px. 첫 화면의 사진만 우선 로드하고 나머지는 지연 로드한다.
- 사진이 여러 장이면 알린다: 넘겨 보는 사진은 오른쪽 위에 "1/3", 격자·카드 썸네일은 오른쪽 위에 겹친 사진 아이콘과 장수(`PhotoCount`).

### 5. 숫자와 빈 상태
- 숫자는 tabular. 값이 0인 지표와 비어 있는 관계 영역은 숨긴다. 빈 화면에는 다음 행동 하나를 둔다.
- 지표는 서비스 고유의 말로 쓴다: 레시피 N, N번 만들어짐, N번 참고됨. 팔로워 수는 보조 줄로 내린다.

### 6. 행동의 무게
- 화면당 주황 면 하나. 그 화면의 다음 행동이다(레시피 상세는 "요리 시작", 요리 모드 끝은 "사진으로 남기기").
- 두 번째 행동은 테두리 버튼, 세 번째부터는 밑줄 글자 버튼.

### 7. 코드로 옮긴 문법: 화면 키트 (`src/components/kit`)
새 화면은 아래 부품을 조합해 만든다. 같은 모양을 클래스로 다시 쓰지 않는다.
- `Sheet`: 종이색 내용 면(기본 카드 모서리 14px, 그림자 없음). `pad="md" | "lg"`.
- `PageHeader`: 하위 화면 머리 막대(뒤로/취소, 제목, 오른쪽 행동 하나).
- `SectionHeading`: 종이 안 섹션 제목과 옅은 개수.
- `StateSheet`: 빈 상태·오류·안내(제목, 이유, 다음 행동 하나).
- `UnderlineTabs`: 대상 종류·범위로 나누는 밑줄 탭.
- `Magnet`, `ColorLabelPicker`: 색상 라벨(주인의 정리 표시).
- `CheckBox`: 체크 표시 모양(역할은 감싸는 버튼이 맡는다).
- 브랜드: `SpoonieLogo`(`src/components/brand`). 숟가락이 손잡이 축을 따라 들어갔다 나오는 "한 스푼 뜨기" 움직임 하나만 쓴다. 스플래시는 `intro`, 불러오는 중은 `stir`.

### 8. 문 판과 리듬
- 바닥은 `door-surface`: 법랑 문 판에 위에서 빛이 비쳐 위쪽이 조금 밝다. 무늬·얼룩·장식 그라데이션은 넣지 않는다.
- 단조로움은 바닥이 아니라 내용의 리듬으로 깬다. 피드는 시간 덩어리(오늘 / 어제 / 이번 주 / 이번 달 / 년월) 이름으로 나누고, 레시피(종이)와 레시피드(사진)가 다른 모양으로 섞인다.

## 홈 정보 구조 — 소유자 명시 승인 필수 (2026-10-20)

- 홈페이지(`src/app/page.tsx`)의 기존 피드 위·사이에 홍보 배너, 전환 CTA, 캠페인 카드, 별도 최신 기록 목록 등 새 섹션을 추가하려면 **그 화면 변경 자체에 대한 소유자의 명시적 승인**이 필요하다. 홍보 실적 목표, SEO 링크 개선, 일반적인 실행 위임, 0원 운영 지시, 가입자 확보 목표는 홈 화면 변경 허가가 아니다.
- 기존에 소유자가 두 차례 반려한 `최근 요리 기록` 목록과 `첫 요리기록 시작하기`/`오늘 만든 한 끼, 사진으로 남겨보세요.` 배너는 재구현·유사 문구 우회·재발행하지 않는다. 별도 `/early-cooks` 안내 페이지 자체와 피드/검색/SEO 구조화 데이터는 유지한다.
- 성장 캠페인은 기존 외부 채널과 승인된 유입 페이지를 이용한다. 홈 화면 변경을 제안하려면 배포 전에 실제 모바일 UI와 영향 범위를 소유자에게 제시한다.

## Do's and Don'ts

### Do:
- **Do** 상세·요리 화면의 바닥을 door로 칠하고, 내용은 그 위에 놓인 paper 종이에만 올린다.
- **Do** 최신 목업처럼 단일 크림빛 스크롤 면을 우선하고 불필요한 그림자 카드 중첩 없이 여백과 구분선으로 정보의 깊이를 준다.
- **Do** 테라코타 주요 행동 면에는 paper 글자를, 밝은 바탕의 활성 요소에는 orange-ink를 쓴다.
- **Do** 숫자는 tabular로, 세는 분량은 부엌 분수로 쓴다(`src/features/recipe/domain/recipe-amount.ts`의 formatAmount).
- **Do** 누르는 곳은 44px, 재료·목록 줄은 48px 이상으로 만들고 아이콘 버튼마다 aria-label을 단다.
- **Do** 바뀐 값은 changed-mark로 잠시 표시를 유지하고, 감속 동작 설정에서는 전환을 끈다.
- **Do** 새·기존 화면 모두 승인된 20261107-3 목업과 실제 서비스 동작 계약을 기준으로 수정한다. 이전 회색/주황 레거시 화면을 기준으로 되돌리지 않는다.

### Don't:
- **Don't** 종이 안에 다시 그림자 진 카드를 넣지 않는다. 구획은 1px 구분선 하나로 나눈다.
- **Don't** 테라코타를 단순 장식 카드·배너에 반복 사용하지 않는다. 주요 행동과 활성 상태에만 사용한다.
- **Don't** 단계 번호를 주황 원에 넣지 않는다. 번호는 ink 맨 숫자다.
- **Don't** 인분 조절에 슬라이더를 쓰지 않는다. −/+ 조절기와 직접 맞춤 입력을 쓴다.
- **Don't** 레시피 상세의 재료/만드는 법 탭을 이전의 연속 섹션이나 별도 라우트로 되돌리지 않는다.
- **Don't** 색상 라벨이 없는 레시피에 자석을 그리거나, 자석 색을 다른 장식에 쓰지 않는다.
- **Don't** 기울기를 참고 레시피 가장자리 밖의 요소에 쓰지 않는다.
