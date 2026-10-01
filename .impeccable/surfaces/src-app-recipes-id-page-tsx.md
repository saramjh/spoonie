---
version: 1
slug: "src-app-recipes-id-page-tsx"
primary_target: "src/app/recipes/[id]/page.tsx"
related_targets: ["src/components/common/ItemDetailView.tsx","src/components/recipe/RecipeContentView.tsx"]
---

# 레시피 상세 (recipes/[id])

Scope: 레시피 상세 화면. Mode: Operate (요리하면서 따라 하기), 공유 링크로 들어온 비로그인 방문자는 Read.
Audience/job: 집밥 기록가가 휴대폰을 세워 두고 한 손으로 재료를 챙기고 단계를 따라간다. 비로그인 방문자는 재료까지 보고 가입 여부를 판단한다.
Constraints: 조리 단계는 비로그인에게 서버(RLS)에서 보내지 않는다. 광고 자리 유지. 기존 좋아요/북마크/댓글/실시간 동작 보존.
Memorable moment: 인분을 바꾸면 모든 분량이 분수로 다시 쓰이고 바뀐 분량이 표시를 유지한다. 단계 모드에서 화면이 꺼지지 않고 지금 단계만 떠오른다.
Unresolved: 피드·레시피북·프로필로의 확장은 이 빌드 이후.

## Direction contract

THESIS: 레시피는 냉장고 문에 자석으로 붙여 둔 흰 종이 한 장이다. 인용한 레시피는 그 종이 뒤로 겹쳐 붙어 가장자리가 보인다. 거부하는 기본값: 흰 카드 더미, 회색 탭, 슬라이더, 주황 원 번호.
OWN-WORLD: 옅은 민트 회색 법랑 문 판(#DDE7E1) 위에 흰 종이(#FFFFFF, 모서리 2px, 짧고 부드러운 그림자). 잉크는 흑연(#23282B). 색상 라벨은 종이 머리를 누르는 원형 자석이 된다(라벨이 있을 때만). 주황(#FF6900)은 로고와 주요 동작 면에만, 그 위 글자는 흑연. 구분선은 1px 하나. 글꼴은 Pretendard, 숫자는 tabular. 분량은 1/2, 1/3 분수.
STORY: 방문자는 사진과 제목, 한 줄 메타(인분·시간·재료 수)로 무엇을 만드는지 안다. 재료 줄을 눌러 챙긴 것을 지우고, 인분을 바꾸고, 단계 모드로 요리한다. 위로는 참고한 레시피, 아래로는 이어 만든 레시피로 넘어간다.
FIRST VIEWPORT: 위 막대(뒤로, 작성자, 더보기) 아래, 문 판 위 12px 여백을 두고 종이 한 장. 참고 레시피가 있으면 종이 위로 다른 종이 가장자리 한 줄이 보인다. 종이 안: 필터 없는 사진, 왼쪽 위 모서리 자석, 제목 26px 굵게, 한 줄 메타, 좋아요·댓글·저장·공유 44px 줄. 스크롤하면 바로 재료 머리와 오른쪽 끝 인분 조절기.
FORM: 냉장고 문, 근거 목록 4번째, seed key 38d4b716 (re-roll 1). 시그니처 상호작용: 인분 조절기가 모든 분량을 다시 쓰고 바뀐 값은 표시 유지, 단계 모드(화면 켜짐 유지, 현재 단계만 떠오름, 엄지 위치의 큰 이전/다음).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
