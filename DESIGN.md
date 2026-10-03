---
name: Spoonie
description: 집밥 기록가의 레시피를 냉장고 문에 붙인 종이처럼 보여 주는 레시피 공유 앱
colors:
  door: "#eceae5"
  paper: "#ffffff"
  ink: "#1f2326"
  ink-soft: "#686a6b"
  brand-orange: "#ff6900"
  orange-ink: "#b34700"
  rule-line: "#e0ddd6"
  paper-tint: "#f4f2ee"
  changed-mark: "#f5e0c6"
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
    fontSize: "26px"
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
  sheet: "3px"
  check: "4px"
  field: "6px"
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
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-step-next:
    backgroundColor: "{colors.ink}"
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

레시피는 냉장고 문에 자석으로 붙여 둔 흰 종이 한 장이다. 따뜻한 돌빛 법랑 문 판이 화면의 바닥이 되고, 그 위에 모서리가 거의 각진 흰 종이가 짧고 부드러운 그림자로 살짝 떠 있다. 글자는 흑연 잉크 한 가지 농도와 그보다 옅은 보조 잉크 두 단계로만 쓴다. 인용한 레시피는 그 종이 뒤로 겹쳐 붙은 다른 종이의 가장자리로 보이고, 색상 라벨은 종이 머리를 누르는 둥근 자석이 된다.

밀도는 부엌에서 휴대폰을 세워 두고 한 손으로 읽는 거리에 맞춘다. 본문과 재료·단계 줄은 17px, 누르는 곳은 모두 44px 이상, 재료 한 줄은 48px 이상이다. 장식은 종이·자석·구분선 세 가지 물성에서만 나온다. 카드 안의 카드, 회색 탭, 슬라이더, 주황 원 번호는 이 세계에서 쓰지 않는다(방향 계약에서 거부한 기본값이며 빌드에서도 쓰이지 않는다).

**적용 범위.** 홈 피드, 레시피·레시피드 상세와 요리 모드, 레시피북, 프로필, 검색, 로그인·가입·비밀번호 화면, 상단 막대와 하단 탭, 스플래시, 공통 버튼과 입력이 이 세계를 따른다. 레시피·레시피드 작성 폼(쓰는 순서 = 읽는 순서), 알림, 프로필 수정, 저장한 글, 법적 고지, 오프라인·오류 화면, 공통 모달·시트·토스트까지 모든 화면이 이 세계를 따른다. 새 화면은 이 문서와 아래 Interface Grammar를 따르고, 옛 화면을 근거로 삼지 않는다.

**Key Characteristics:**
- 법랑 문 판(door) 위에 흰 종이(paper) 한 장, 종이 그림자는 하나뿐
- 흑연 잉크 단색 계층: ink 와 ink-soft
- 주황은 로고와 주요 동작 면에만, 그 위 글자는 흑연
- 1px 구분선 하나로 영역을 나눈다
- Pretendard 한 가족, 숫자는 tabular, 세는 분량은 1/2·1/3 같은 부엌 분수
- 바뀐 분량은 연한 문 판 빛 표시를 잠시 유지한다

## Colors

따뜻한 돌빛 법랑과 흰 종이, 흑연 잉크로 된 거의 무채색 팔레트. 주요 동작은 흑연 면이고, 브랜드 주황은 큰 면에 칠하지 않고 로고와 작은 신호에만 쓴다. 음식 사진이 화면에서 가장 색이 많은 것이 되게 한다.

### Primary
- **주요 동작 면** (`primary` = ink): "요리 시작", "다음 단계", "완료", 하단 + 같은 화면의 주요 동작. 흑연 면에 흰(paper) 글자. 화면당 하나.
- **브랜드 주황** (brand-orange, `brand`): 로고와 작은 신호에만. 알림 숫자 배지(글자는 ink), 이동 진행 막대, 거르기 켜짐 점. 버튼·카드 같은 큰 면에는 칠하지 않는다.
- **주황 잉크** (orange-ink): 종이 위에서 글자·아이콘 대비가 필요한 주황의 어두운 형태. 저장된 북마크 아이콘, 팔로우 아이콘, "더보기" 같은 글자 링크, 포커스 링(`--ring`)에 쓴다. 주황을 글자색으로 써야 한다면 brand-orange가 아니라 이것을 쓴다.

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
- 그 밖의 색: **좋아요** (like) #d6453d, 채운 하트와 하트 hover. **지우기·오류** (danger) #c8382d, 종이 위 5:1.
- 그림자 색도 `rgb(var(--ink) / a)`로 쓴다. 자석 색은 `src/features/recipe/domain/color-options.ts` 한 곳에 있다.

### Named Rules
**The 주황은 신호 Rule.** 주황은 면이 아니라 신호다. 로고, 숫자 배지, 진행 막대, 켜짐 점, 주황 잉크 글자·아이콘에만 쓰고 버튼 면에는 칠하지 않는다. 작은 주황 면 위의 글자는 ink다(흰 글자는 대비가 모자라다).

**The 흑연 한 면 Rule.** 한 화면에서 흑연(primary)으로 칠한 면은 지금 해야 할 주요 동작 하나뿐이다. 나머지 강조는 ink의 굵기와 ink-soft의 대비로 만든다.

**The 라벨 있을 때만 Rule.** 자석은 색상 라벨이 지정된 레시피에만 나타난다. 라벨이 없으면 자석 자리를 비워 둔다.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, -apple-system, system-ui, Apple SD Gothic Neo, Noto Sans KR)
**Body Font:** Pretendard Variable (같은 가족)

**Character:** 한글을 위해 고른 한 가족으로 모든 계층을 굵기와 크기만으로 나눈다. 자체 호스팅한 가변 동적 서브셋(`/fonts/pretendard`, weight 45–920, `font-display: swap`)이며, 본문 전체에 `word-break: keep-all`을 걸어 한국어가 어절 단위로 줄을 바꾼다.

### Hierarchy
글자는 크기 값이 아니라 **역할 이름**으로 쓴다 (`tailwind.config.ts` fontSize, 클래스 `text-<역할>`). 역할마다 굵기·줄 간격·자간이 함께 정해져 있어 같은 역할은 어느 화면에서나 같은 모양이다. 아래 9개 밖의 크기는 쓰지 않는다.

| 역할 | 크기 / 줄 간격 | 굵기 | 쓰는 곳 |
|---|---|---|---|
| `display` | 26 / 1.25, -0.02em | 700 | 레시피 상세 제목, 요리 완료 제목. 화면에 하나 |
| `step` | 26 / 1.55 | 500 | 요리 모드의 지금 단계 설명 (팔 길이 거리) |
| `title` | 20 / 1.35, -0.015em | 700 | 페이지 제목, 피드의 레시피 제목, 프로필 이름 |
| `heading` | 17 / 1.4, -0.01em | 600 | 섹션 머리("재료 5"), 목록·빈 상태 제목, 분량 숫자 |
| `read` | 17 / 1.65 | 400 | 재료 이름, 조리 단계. 부엌에서 거리를 두고 읽는 줄 |
| `body` | 16 / 1.6 | 400 | 소개, 레시피드 본문, 안내 문단 |
| `label` | 15 / 1.4 | 500 | 버튼, 탭, 입력, 이름, 한 줄 메타 |
| `meta` | 13 / 1.45 | 400 | 시각, 개수, 보조 설명, 오류 문구 |
| `micro` | 11 / 1.2 | 600 | 숫자 배지에만 |

**굵기는 역할을 따른다.** 700은 display·title, 600은 heading과 강조(이름, 고른 수), 500은 조작부(label), 400은 읽는 글. display·title·heading에는 `font-bold` 같은 굵기 클래스를 붙이지 않는다(역할이 정한다).

### Named Rules
**The Tabular Rule.** 개수·분량·단계 번호·좋아요 수 같은 숫자는 모두 tabular 숫자로 쓴다.

**The 부엌 분수 Rule.** 컵·큰술·개처럼 세는 단위의 분량은 1/4, 1/3, 1/2, 2/3, 3/4 분수로 쓰고, g·ml 같은 무게·부피는 정수로 반올림한다(10 미만은 소수 한 자리). "1.0 개" 같은 소수 꼬리를 남기지 않는다.

## Layout

상세 화면은 한 줄 기둥이다. 위에 종이 면 상단 막대(높이 56px, 뒤로·작성자·더보기)가 붙어 있고, 그 아래 문 판에 좌우 12px(door-gutter) 여백을 두고 종이가 놓인다. 종이 안의 내용은 좌우 16px(sheet-inset)이며 섹션은 위아래 20px(section-y)와 1px 구분선으로 나뉜다. 본문 종이와 댓글 종이처럼 종이끼리는 12px(sheet-gap) 떨어져 따로 붙는다.

참고 레시피가 있으면 본문 종이 위에 최대 두 장의 종이 가장자리가 좌우 8px 안쪽으로 들어가 겹치고, 각각 -0.6deg, 0.4deg 기울어 아래 종이에 6px 정도 묻힌다. 기울기는 이 겹친 가장자리에만 있다.

재료 줄은 최소 48px, 누르는 것은 모두 44×44px 이상이다. 행동 줄(좋아요·댓글 / 저장·공유)은 종이 안에서 양 끝으로 나뉜다.

요리 모드는 문 판 전체 화면이다. 위에 닫기·진행(“N / M단계”)·재료 열기, 그 아래 단계 수만큼 나뉜 4px 레일, 가운데 지금 단계 종이 한 장(최소 45dvh), 그 아래 다음 단계 미리보기, 맨 아래 엄지 자리에 1:2 비율의 이전/다음 버튼이 놓인다. 안전 영역(safe-area) 여백을 위아래에 둔다. 좌우로 60px 이상 밀면 단계를 넘긴다.

## Elevation & Depth

깊이는 종이 한 겹뿐이다. 문 판은 평평하고, 그 위에 놓인 모든 종이는 같은 그림자 하나(`--sheet-shadow`)를 받는다. 깊이 차이는 그림자 단계가 아니라 겹친 순서(참고 레시피 종이가 본문 종이 뒤)로 표현한다. 자석만 종이보다 한 층 위에 있어 별도의 작은 그림자를 받는다.

### Shadow Vocabulary
- **종이 그림자** (`box-shadow: 0 1px 1px rgba(35, 40, 43, 0.06), 0 6px 14px -8px rgba(35, 40, 43, 0.22)`): 모든 종이(본문, 댓글, 참고 가장자리, 요리 모드 단계·재료 종이).
- **자석 그림자**: 위에서 비치는 빛 한 점(왼쪽 위 흰 방사형), 아래쪽 옆면 두께(안쪽 아래 2px 그늘), 종이 위에 뜬 짧은 두 겹 그림자. 색상 라벨 자석에만.

### Named Rules
**The 한 겹 Rule.** 종이 위에 다시 그림자 진 카드를 올리지 않는다. 종이 안의 구획은 1px 구분선으로만 나눈다.

## Shapes

종이는 거의 각진 3px 모서리다. 손으로 다루는 조작부(주요 버튼, 인분 조절기, 요리 모드 이전/다음)는 8px로 조금 더 둥글고, 분량 입력칸은 6px, 체크 상자는 4px에 1.5px 선이다. 원은 자석과 요리 모드 단계 레일의 끝 처리에만 쓴다. 사진은 종이 위쪽 모서리를 따라 잘린다(위 3px).

## Components

### Buttons
손에 밀가루가 묻어도 누를 수 있는, 크고 평평한 면.
- **Shape:** 살짝 둥근 모서리 (8px)
- **Size:** 높이 44px 하나(화면 아래 고정된 주요 버튼만 48px). 작은 버튼(sm)도 40px 아래로 내리지 않는다. 글자는 `label`.
- **Primary:** 흑연 면에 흰 글자 600, 좌우 16px. hover 90%, 누르는 동안 80% 농도. 화면당 하나.
- **Outline:** 종이 면에 흑연 20% 선, hover에서 35%와 종이 그늘. 입력칸과 같은 선.
- **Ghost:** 선 없이 글자만, hover에 흑연 5% 면. 도구 줄 아이콘, "선택"·"완료", 카드 머리의 팔로우 아이콘(사람+ 주황 잉크 / 사람✓ 옅은 흑연, 상태는 aria-label)처럼 같은 줄에 여럿 놓이는 동작.
- **Step Next / Prev (요리 모드):** 높이 56px, 17px. 다음은 흑연 면에 흰 글자로 폭의 2/3, 이전은 종이 면에 흑연 20% 선으로 1/3. 첫 단계에서 이전은 ink-soft 40%로 비활성.
- **Icon:** 44×44px 투명 버튼, 아이콘 20–24px, 색은 ink-soft. 각 아이콘 버튼은 aria-label을 갖는다.
- **Text link:** ink 글자에 밑줄(4px 띄움). "원래대로", "가진 재료 양에 맞추기" 같은 보조 동작.
- **Focus:** 2px orange-ink 링(`--ring`).

### Servings Stepper (인분 조절기)
재료 머리 오른쪽 끝에 붙는 1px 구분선 테두리의 8px 상자. 양쪽 44×44px −/+ 버튼 사이에 16px 600 tabular "N인분" 출력(최소 4.5rem)이 있다. 값을 바꾸면 아래에 "원래 N인분 기준에서 바꾼 양이에요. 원래대로" 안내가 나타난다. 직접 맞춘 상태에서는 "직접 맞춤"으로 표시한다.

### Ingredient Checklist Row
줄 전체가 체크 버튼(최소 48px). 왼쪽 20px 체크 상자(4px, 1.5px ink-soft 선 / 체크 시 ink 면에 종이색 체크), 가운데 17px 이름, 오른쪽 분량+단위. 체크하면 이름이 ink-soft로 바뀌고 취소선이 그어진다. 분량이 바뀌면 숫자 뒤에 changed-mark가 2.5초 깔렸다가 500ms에 걸쳐 사라진다(감속 동작 설정 시 즉시).

### Step Row
단계 번호는 원이 아닌 18px 700 tabular 맨 숫자이며 그 자체가 44px "끝냄 표시" 토글이다. 끝낸 단계는 번호가 체크 아이콘으로 바뀌고 설명이 ink-soft로 옅어진다. 단계 사진은 본문 폭 4:3, 3px 모서리.

### Cards / Containers (종이)
- **Corner Style:** 3px
- **Background:** paper, 문 판(door) 위에만 놓는다
- **Shadow Strategy:** 종이 그림자 하나 (Elevation 참조)
- **Border:** 없음. 내부 구획은 위쪽 1px 구분선
- **Internal Padding:** 좌우 16px, 섹션 위아래 20px

### Magnet (색상 라벨)
납작한 단추 자석. 격자 카드는 지름 20px로 종이 왼쪽 위(왼쪽 14px)에서 위로 8px 걸쳐 종이 머리를 누르고, 목록 줄은 16px로 종이 왼쪽 가장자리 가운데에 걸친다. 고르기 칸(작성 폼·거르기)도 같은 자석을 쓴다. 라벨 이름을 aria-label로 갖는다. 레시피 상세에는 그리지 않는다(색상 라벨은 레시피북 정리 도구).

### Cited Peek (참고한 레시피 가장자리)
본문 종이 뒤로 겹친 종이 가장자리 한 줄. 14px로 "참고한 레시피"(ink-soft) + "작성자의 제목"(600 ink), 두 장을 넘으면 마지막 줄 끝에 "외 N개". 줄 전체가 그 레시피로 가는 링크다.

### Inputs / Fields
- **Style:** 버튼과 같은 규격. 높이 44px, 8px 모서리, 종이 면에 흑연 20% 선(hover 35%), 좌우 14px, 글자 `body`, 자리 안내 글자는 ink-soft 80%. 검색칸은 왼쪽 18px 돋보기에 맞춰 안쪽 36px.
- **Focus:** 테두리가 흑연으로 진해진다(링을 겹치지 않는다). 여러 줄 입력도 같다.
- **분량 입력:** 6px 모서리, 폭 80px, `heading` tabular 오른쪽 정렬 ("가진 재료 양에 맞추기").

### Tool Row (도구 줄)
목록 화면 위의 한 줄(높이 44px): 검색칸이 남은 폭을 다 쓰고, 오른쪽에 선 없는 아이콘 버튼과 글자 버튼. 고르는 모드에서는 같은 높이·같은 자리에서 "N개 골랐어요 · 지우기 · 완료"로 바뀌어 아래 목록이 움직이지 않는다. 켜는 "선택"과 끄는 "완료"는 같은 오른쪽 끝에 있다.

### Navigation
- **상세 상단 막대:** 종이 면, 아래 1px 구분선, 높이 56px, 스크롤해도 위에 붙어 있다. 왼쪽 뒤로(44px), 가운데 32px 아바타 + 작성자 이름(600 ink) + 글 종류(14px ink-soft), 오른쪽 작성자 본인이면 더보기 메뉴, 아니면 팔로우.
- **요리 모드 막대:** 문 판 위 닫기(44px) · "N / M단계"(16px 600 tabular, 분모는 400 ink-soft) · 재료 열기(밑줄 텍스트). 그 아래 4px 단계 레일: 지난 단계와 지금 단계는 ink, 남은 단계는 paper.

## Interface Grammar

화면이 바뀌어도 같은 뜻은 같은 모양으로 보인다. 새 화면은 아래 문법에서 고르고, 새 모양을 만들지 않는다.

### 1. 두 가지 대상, 한 가지 관계 (성장 고리를 화면에 그린다)
레시피 → 실제로 만듦 → 레시피드 → 작성자 발견 → 그 사람의 다른 레시피. 화면은 이 고리의 연결점을 가장 잘 보이게 둔다.
- **레시피(자산)는 글이 먼저다.** 피드에서도 작성자 줄 다음에 제목·한 줄 메타가 오고 그 아래 4:3 사진. 사진보다 레시피라는 정보가 먼저 읽힌다.
- **레시피드(활동)는 출처가 먼저, 그다음 사진이다.** 출처가 있으면 사진 위에 출처 행(`SourceRow`)을 둔다: 레시피 썸네일, 관계 동사("○○의 레시피로 만들었어요" / "참고한 레시피 · ○○"), 레시피 제목, 화살표. 행 전체가 레시피로 가는 링크다. 카드 안의 카드가 아니라 1px 선으로 나뉜 행이다.
- **레시피의 신뢰는 "만든 사람"으로 보인다.** 다른 사람이 실제로 만든 기록이 있으면 피드 카드와 상세 제목 아래에 `MadeProof`: 만든 사진 동그라미(최대 3)와 "N명이 만들어 봤어요 · 이어진 레시피 N". 작성자 본인의 기록은 세지 않고, 0이면 그리지 않는다. 좋아요 수보다 앞에 둔다.
- **상세 화면은 고리의 허브다.** 레시피: 참고한 레시피(종이 뒤 가장자리) → 본문 → 만들어 본 기록(+ "이 레시피로 만들었어요") → 이어진 레시피(+ "참고해서 내 레시피 만들기") → 작성자의 다른 레시피. 레시피드: 출처 행 → 사진·글 → 같은 레시피로 만든 다른 기록 → 작성자의 레시피.
- **레시피 카드에는 핵심 재료가 보인다.** 피드 카드의 메타 아래에 "재료 N가지 · 앞 3개 외". 사진을 가려도 무엇을 만드는 글인지 읽혀야 레시피다.
- **찾기 화면은 레시피가 중심이다.** 탐색: 레시피 목록(다른 사람이 만든 수 → 좋아요 → 최신) 다음에 "요즘 만들어 본 기록"(사진 아래에 만든 레시피 제목). 검색 결과 탭 순서는 레시피 / 레시피드 / 사람이고, 레시피는 글이 먼저인 목록, 레시피드는 사진 격자로 둔다. 두 종류를 한 격자에 섞지 않는다.
- **출처는 기억에 맡기지 않는다.** 레시피 화면에서 들어온 레시피드는 출처가 자동으로 붙는다. "+"로 들어온 레시피드는 첫 질문이 "어떤 레시피로 만들었나요?"다(선택).
- **알림도 관계 동사를 쓴다.** "○○님이 회원님의 레시피로 만들어 봤어요" / "참고해 레시피드를 남겼어요" / "참고해 새 레시피를 썼어요".
- **관계는 세 단어만 쓴다.** "○○의 레시피로 만들었어요"(cooked), "참고한 레시피"(referenced), "이어진 레시피 · 고친 버전"(adapted). 문형과 위치를 바꾸지 않는다.

### 2. 보기를 나누는 기준은 "무엇"이지 "어떻게"가 아니다
- 탭은 대상 종류(레시피 / 레시피드)나 범위(나의 / 모두의)로 나눈다. 같은 내용을 격자/목록으로만 바꾸는 탭은 만들지 않는다.
- 탭 모양은 하나: 흑연 2px 밑줄, 활성은 ink, 비활성은 ink-soft. 회색 세그먼트 탭은 쓰지 않는다.

### 3. 색상 라벨은 주인의 정리 도구다
- 레시피북의 "나의 레시피"와 작성·수정 폼, 거르기에서만 보인다(자석).
- 레시피 상세, 피드, 프로필, 검색에서는 보이지 않는다. 다른 사람에게는 뜻이 없는 표시다.

### 4. 이미지 프레임
- 모든 사진은 정해진 비율의 프레임 안에 놓인다. 레시피 4:3, 레시피드 1:1, 단계 사진 4:3, 목록 썸네일 1:1(72px). 프레임 바탕은 paper-tint라 로딩 중에도 자리가 흔들리지 않는다.
- 피드와 목록은 `object-cover`로 프레임을 채운다. 요리 모드에서는 `object-contain`으로 사진 전체를 보여 준다. 요리 중에는 잘린 부분이 정보다.
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
- `Sheet`: 문 판 위의 흰 종이(모서리 3px, 종이 그림자). `pad="md" | "lg"`.
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

## Do's and Don'ts

### Do:
- **Do** 상세·요리 화면의 바닥을 door로 칠하고, 내용은 그 위에 놓인 paper 종이에만 올린다.
- **Do** 모든 종이에 같은 종이 그림자(`--sheet-shadow`)와 3px 모서리를 쓴다.
- **Do** 주황 면 위 글자는 ink로, 종이 위 주황 글자·아이콘은 orange-ink로 쓴다.
- **Do** 숫자는 tabular로, 세는 분량은 부엌 분수로 쓴다(`src/features/recipe/domain/recipe-amount.ts`의 formatAmount).
- **Do** 누르는 곳은 44px, 재료·목록 줄은 48px 이상으로 만들고 아이콘 버튼마다 aria-label을 단다.
- **Do** 바뀐 값은 changed-mark로 잠시 표시를 유지하고, 감속 동작 설정에서는 전환을 끈다.
- **Do** 아직 옮기지 않은 화면(피드, 레시피북, 프로필, 인증, 폼)을 새로 손볼 때 이 문서를 따르고, 그 화면의 gray/orange-500 모습을 근거로 삼지 않는다.

### Don't:
- **Don't** 종이 안에 다시 그림자 진 카드를 넣지 않는다. 구획은 1px 구분선 하나로 나눈다.
- **Don't** 주황(brand-orange)을 버튼·카드 같은 큰 면에 칠하지 않는다. 작은 주황 면 위 글자는 ink.
- **Don't** 단계 번호를 주황 원에 넣지 않는다. 번호는 ink 맨 숫자다.
- **Don't** 인분 조절에 슬라이더를 쓰지 않는다. −/+ 조절기와 직접 맞춤 입력을 쓴다.
- **Don't** 섹션을 회색 탭으로 전환하지 않는다. 재료와 만드는 법은 한 종이 위에 차례로 놓는다.
- **Don't** 색상 라벨이 없는 레시피에 자석을 그리거나, 자석 색을 다른 장식에 쓰지 않는다.
- **Don't** 기울기를 참고 레시피 가장자리 밖의 요소에 쓰지 않는다.
