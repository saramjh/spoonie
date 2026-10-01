---
name: Spoonie
description: 집밥 기록가의 레시피를 냉장고 문에 붙인 종이처럼 보여 주는 레시피 공유 앱
colors:
  door: "#dde7e1"
  paper: "#ffffff"
  ink: "#23282b"
  ink-soft: "#5b6469"
  brand-orange: "#ff6900"
  orange-ink: "#b34700"
  rule-line: "#d5ddd8"
  paper-tint: "#eef2ef"
  changed-mark: "#c9dfd2"
  selection: "#ffd2b0"
  magnet-red: "#d6453d"
  magnet-orange: "#ff6900"
  magnet-yellow: "#f2c230"
  magnet-green: "#3e9b5f"
  magnet-blue: "#2e6fba"
  magnet-purple: "#7a5cc2"
  magnet-gray: "#8a9296"
typography:
  display:
    fontFamily: "Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  step-display:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.55
  headline:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.55
  title:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.65
  amount:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  meta:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Pretendard Variable, Pretendard, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.45
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
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 16px"
  button-step-next:
    backgroundColor: "{colors.brand-orange}"
    textColor: "{colors.ink}"
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

레시피는 냉장고 문에 자석으로 붙여 둔 흰 종이 한 장이다. 옅은 민트 회색 법랑 문 판이 화면의 바닥이 되고, 그 위에 모서리가 거의 각진 흰 종이가 짧고 부드러운 그림자로 살짝 떠 있다. 글자는 흑연 잉크 한 가지 농도와 그보다 옅은 보조 잉크 두 단계로만 쓴다. 인용한 레시피는 그 종이 뒤로 겹쳐 붙은 다른 종이의 가장자리로 보이고, 색상 라벨은 종이 머리를 누르는 둥근 자석이 된다.

밀도는 부엌에서 휴대폰을 세워 두고 한 손으로 읽는 거리에 맞춘다. 본문과 재료·단계 줄은 17px, 누르는 곳은 모두 44px 이상, 재료 한 줄은 48px 이상이다. 장식은 종이·자석·구분선 세 가지 물성에서만 나온다. 카드 안의 카드, 회색 탭, 슬라이더, 주황 원 번호는 이 세계에서 쓰지 않는다(방향 계약에서 거부한 기본값이며 빌드에서도 쓰이지 않는다).

**적용 범위(정직한 현재 상태).** 이 세계는 지금 레시피·레시피드 상세 화면(`/recipes/[id]`, `/posts/[id]`)과 그 안의 요리 모드에만 적용되어 있다. 피드, 레시피북, 프로필, 인증, 작성 폼, 상단 전역 헤더, 하단 탭바는 아직 이전의 shadcn/Tailwind 회색 + orange-500 강조 모습 그대로다. 이것은 이 문서의 규칙이 아니라 아직 옮기지 않은 화면이다. 새 화면은 이 문서를 따르고, 옛 화면을 근거로 삼지 않는다.

**Key Characteristics:**
- 법랑 문 판(door) 위에 흰 종이(paper) 한 장, 종이 그림자는 하나뿐
- 흑연 잉크 단색 계층: ink 와 ink-soft
- 주황은 로고와 주요 동작 면에만, 그 위 글자는 흑연
- 1px 구분선 하나로 영역을 나눈다
- Pretendard 한 가족, 숫자는 tabular, 세는 분량은 1/2·1/3 같은 부엌 분수
- 바뀐 분량은 연한 문 판 빛 표시를 잠시 유지한다

## Colors

차가운 민트 회색 법랑과 흰 종이, 흑연 잉크로 된 거의 무채색 팔레트에 브랜드 주황 한 점을 얹는다.

### Primary
- **브랜드 주황** (brand-orange): 로고와 화면당 하나의 주요 동작 면("요리 시작", "다음 단계", "로그인하고 만드는 법 보기")에만 칠한다. 이 면 위의 글자는 반드시 흑연(ink)이다. 흰 글자는 이 주황 위에서 대비가 모자라므로 얹지 않는다.
- **주황 잉크** (orange-ink): 종이 위에서 글자·아이콘 대비가 필요한 주황의 어두운 형태. 저장된 북마크 아이콘 선과 포커스 링(`--ring`)에 쓴다. 주황을 글자색으로 써야 한다면 brand-orange가 아니라 이것을 쓴다.

### Neutral
- **법랑 문 판** (door): 상세 화면과 요리 모드의 바닥. 종이가 놓이는 면이며 그 자체에 내용이 올라가지 않는다. 요리 모드 단계 레일의 빈 칸 뒤 배경이기도 하다.
- **종이** (paper): 레시피 본문, 댓글, 참고 레시피 가장자리, 요리 모드 단계 카드, 상세 상단 막대의 면.
- **흑연** (ink): 제목, 본문, 재료 이름, 분량, 체크된 상자 면.
- **옅은 흑연** (ink-soft): 메타 줄, 단위, 개수, 끝낸 단계와 지운 재료, 비활성 아이콘. 종이 위에서 약 6:1.
- **구분선** (rule-line): `--border`. 재료 줄 사이, 단계 사이, 섹션 머리 위의 1px 선, 인분 조절기 테두리.
- **종이 그늘** (paper-tint): `--muted`. 단계 사진이 로드되기 전 자리.
- **선택 영역** (selection): 텍스트를 드래그 선택했을 때의 연한 주황 배경, 글자는 ink.

### Tertiary
- **바뀐 분량 표시** (changed-mark): 인분을 바꾸거나 가진 재료 양에 맞출 때 값이 바뀐 분량 숫자 뒤에 2.5초 동안 깔린다. 문 판과 같은 색 계열이라 종이 위에서 조용히 보인다.
- **자석 색** (magnet-red ~ magnet-gray): 레시피 색상 라벨이 있을 때만 종이 왼쪽 위를 누르는 32px 원형 자석의 색. 라벨 값(red, orange, yellow, green, blue, purple, gray)과 1:1로 대응한다. 자석 외의 장식에는 쓰지 않는다.

### Named Rules
**The 흑연 위 주황 Rule.** 주황 면 위의 글자는 언제나 ink다. 주황 면에 흰 글자를 올리지 않는다.

**The 주황 한 점 Rule.** 한 화면에서 brand-orange로 칠한 면은 지금 해야 할 주요 동작 하나뿐이다. 나머지 강조는 ink의 굵기와 ink-soft의 대비로 만든다.

**The 라벨 있을 때만 Rule.** 자석은 색상 라벨이 지정된 레시피에만 나타난다. 라벨이 없으면 자석 자리를 비워 둔다.

## Typography

**Display Font:** Pretendard Variable (with Pretendard, -apple-system, system-ui, Apple SD Gothic Neo, Noto Sans KR)
**Body Font:** Pretendard Variable (같은 가족)

**Character:** 한글을 위해 고른 한 가족으로 모든 계층을 굵기와 크기만으로 나눈다. 자체 호스팅한 가변 동적 서브셋(`/fonts/pretendard`, weight 45–920, `font-display: swap`)이며, 본문 전체에 `word-break: keep-all`을 걸어 한국어가 어절 단위로 줄을 바꾼다.

### Hierarchy
- **Display** (700, 26px, 1.25, -0.01em, `text-wrap: balance`): 레시피 제목. 종이 한 장에 하나.
- **Step Display** (500, 26px, 1.55): 요리 모드에서 지금 단계 설명. 팔 길이 거리에서 읽히는 크기.
- **Headline** (700, 18px): "재료", "만드는 법", "이 레시피를 참고한 글" 같은 섹션 머리. 머리 옆 개수는 500 굵기 ink-soft tabular 숫자로 붙인다.
- **Title** (400, 17px, 1.65): 재료 이름, 단계 설명, 요리 모드 다음 단계 미리보기. 요리 중에 읽는 줄은 모두 이 크기다.
- **Amount** (600, 17px, tabular): 분량 숫자. 단위는 15px ink-soft로 뒤에 붙는다.
- **Body** (400, 16px, 1.65): 레시피 소개, 레시피드 본문(행간 1.7).
- **Meta** (400, 15px): 제목 아래 한 줄 메타(인분 · 조리 시간 · 재료 수 · 작성 시각), 태그, 참고 목록 줄. 주요 버튼 글자도 15px 600.
- **Label** (500, 14px): 개수, 보조 안내, 요리 모드 "다음 · N단계".

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
- **자석 그림자** (`box-shadow: 0 2px 4px rgba(35, 40, 43, 0.35)`): 색상 라벨 자석에만.

### Named Rules
**The 한 겹 Rule.** 종이 위에 다시 그림자 진 카드를 올리지 않는다. 종이 안의 구획은 1px 구분선으로만 나눈다.

## Shapes

종이는 거의 각진 3px 모서리다. 손으로 다루는 조작부(주요 버튼, 인분 조절기, 요리 모드 이전/다음)는 8px로 조금 더 둥글고, 분량 입력칸은 6px, 체크 상자는 4px에 1.5px 선이다. 원은 자석과 요리 모드 단계 레일의 끝 처리에만 쓴다. 사진은 종이 위쪽 모서리를 따라 잘린다(위 3px).

## Components

### Buttons
손에 밀가루가 묻어도 누를 수 있는, 크고 평평한 면.
- **Shape:** 살짝 둥근 모서리 (8px)
- **Primary:** brand-orange 면에 ink 글자, 15px 600, 높이 44px, 좌우 16px. 누르는 동안 밝기를 95%로 낮춘다.
- **Step Next / Prev (요리 모드):** 높이 56px, 17px. 다음은 주황 면 700 굵기로 폭의 2/3, 이전은 종이 면에 흑연 20% 선으로 1/3. 첫 단계에서 이전은 ink-soft 40%로 비활성.
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
지름 32px 원, 종이 왼쪽 위(왼쪽 16px)에서 위로 12px 튀어나와 종이 머리를 누른다. 라벨 이름을 aria-label로 갖는다.

### Cited Peek (참고한 레시피 가장자리)
본문 종이 뒤로 겹친 종이 가장자리 한 줄. 14px로 "참고한 레시피"(ink-soft) + "작성자의 제목"(600 ink), 두 장을 넘으면 마지막 줄 끝에 "외 N개". 줄 전체가 그 레시피로 가는 링크다.

### Inputs / Fields
- **Style:** 종이 면, 1px 구분선 테두리, 6px 모서리, 높이 44px, 폭 80px, 17px 600 tabular 오른쪽 정렬. 지금은 "가진 재료 양에 맞추기" 분량 입력에만 쓰인다.
- **Focus:** 외곽선 대신 2px orange-ink 링.

### Navigation
- **상세 상단 막대:** 종이 면, 아래 1px 구분선, 높이 56px, 스크롤해도 위에 붙어 있다. 왼쪽 뒤로(44px), 가운데 32px 아바타 + 작성자 이름(600 ink) + 글 종류(14px ink-soft), 오른쪽 작성자 본인이면 더보기 메뉴, 아니면 팔로우.
- **요리 모드 막대:** 문 판 위 닫기(44px) · "N / M단계"(16px 600 tabular, 분모는 400 ink-soft) · 재료 열기(밑줄 텍스트). 그 아래 4px 단계 레일: 지난 단계와 지금 단계는 ink, 남은 단계는 paper.

## Do's and Don'ts

### Do:
- **Do** 상세·요리 화면의 바닥을 door로 칠하고, 내용은 그 위에 놓인 paper 종이에만 올린다.
- **Do** 모든 종이에 같은 종이 그림자(`--sheet-shadow`)와 3px 모서리를 쓴다.
- **Do** 주황 면 위 글자는 ink로, 종이 위 주황 글자·아이콘은 orange-ink로 쓴다.
- **Do** 숫자는 tabular로, 세는 분량은 부엌 분수로 쓴다(`src/lib/recipe-amount.ts`의 formatAmount).
- **Do** 누르는 곳은 44px, 재료·목록 줄은 48px 이상으로 만들고 아이콘 버튼마다 aria-label을 단다.
- **Do** 바뀐 값은 changed-mark로 잠시 표시를 유지하고, 감속 동작 설정에서는 전환을 끈다.
- **Do** 아직 옮기지 않은 화면(피드, 레시피북, 프로필, 인증, 폼)을 새로 손볼 때 이 문서를 따르고, 그 화면의 gray/orange-500 모습을 근거로 삼지 않는다.

### Don't:
- **Don't** 종이 안에 다시 그림자 진 카드를 넣지 않는다. 구획은 1px 구분선 하나로 나눈다.
- **Don't** 주황(brand-orange) 면에 흰 글자를 올리지 않는다.
- **Don't** 단계 번호를 주황 원에 넣지 않는다. 번호는 ink 맨 숫자다.
- **Don't** 인분 조절에 슬라이더를 쓰지 않는다. −/+ 조절기와 직접 맞춤 입력을 쓴다.
- **Don't** 섹션을 회색 탭으로 전환하지 않는다. 재료와 만드는 법은 한 종이 위에 차례로 놓는다.
- **Don't** 색상 라벨이 없는 레시피에 자석을 그리거나, 자석 색을 다른 장식에 쓰지 않는다.
- **Don't** 기울기를 참고 레시피 가장자리 밖의 요소에 쓰지 않는다.
