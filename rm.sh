#!/bin/bash

echo "=== Cursor vs VSCode 확장 프로그램 점검 ==="

# Cursor 설치 확인
if command -v cursor &> /dev/null; then
    echo "✅ Cursor 설치됨"
    CURSOR_AVAILABLE=true
else
    echo "❌ Cursor 설치되지 않음"
    CURSOR_AVAILABLE=false
fi

# VSCode 설치 확인
if command -v code &> /dev/null; then
    echo "✅ VSCode 설치됨"
    VSCODE_AVAILABLE=true
else
    echo "❌ VSCode 설치되지 않음"
    VSCODE_AVAILABLE=false
fi

echo ""

# Cursor 확장 프로그램 목록 추출
if [ "$CURSOR_AVAILABLE" = true ]; then
    echo "=== Cursor 설치된 확장 프로그램 ==="
    cursor --list-extensions --show-versions > cursor_extensions.txt
    echo "📄 cursor_extensions.txt 파일에 저장됨"
    
    echo ""
    echo "=== Cursor 포맷팅 관련 확장 프로그램 ==="
    cursor --list-extensions | grep -E "(prettier|eslint|format|import|beautify)" || echo "포맷팅 관련 확장 없음"
    
    echo ""
    echo "=== Cursor 충돌 가능성 확장 프로그램 검사 ==="
    
    # Prettier 관련 충돌 검사
    echo "🔍 Prettier 관련:"
    cursor --list-extensions | grep -i prettier || echo "  - Prettier 확장 없음"
    
    # ESLint 관련 충돌 검사  
    echo "🔍 ESLint 관련:"
    cursor --list-extensions | grep -i eslint || echo "  - ESLint 확장 없음"
    
    # 자동 임포트 관련 충돌 검사
    echo "🔍 자동 임포트 관련:"
    cursor --list-extensions | grep -E "(import|autoimport)" || echo "  - 자동 임포트 확장 없음"
    
    # TypeScript 관련 확장
    echo "🔍 TypeScript 관련:"
    cursor --list-extensions | grep -E "(typescript|ts)" || echo "  - TypeScript 확장 없음"
fi

# VSCode와 비교
if [ "$VSCODE_AVAILABLE" = true ] && [ "$CURSOR_AVAILABLE" = true ]; then
    echo ""
    echo "=== VSCode vs Cursor 확장 프로그램 비교 ==="
    
    # 임시 파일들 생성
    code --list-extensions | sort > vscode_ext_temp.txt
    cursor --list-extensions | sort > cursor_ext_temp.txt
    
    echo "📊 VSCode에만 있는 확장:"
    comm -23 vscode_ext_temp.txt cursor_ext_temp.txt || echo "  - 없음"
    
    echo ""
    echo "📊 Cursor에만 있는 확장:"
    comm -13 vscode_ext_temp.txt cursor_ext_temp.txt || echo "  - 없음"
    
    echo ""
    echo "📊 공통 확장:"
    comm -12 vscode_ext_temp.txt cursor_ext_temp.txt | head -10
    echo "  ... (처음 10개만 표시)"
    
    # 임시 파일 정리
    rm -f vscode_ext_temp.txt cursor_ext_temp.txt
fi

echo ""
echo "=== Cursor 충돌 확장 제거 명령어 ==="
if [ "$CURSOR_AVAILABLE" = true ]; then
    echo "# 주요 충돌 확장 제거:"
    echo "cursor --uninstall-extension rvest.vs-code-prettier-eslint"
    echo "cursor --uninstall-extension nucllear.vscode-extension-auto-import"
    echo ""
    echo "# 선택적 제거 (성능 최적화):"
    echo "cursor --uninstall-extension wix.vscode-import-cost"
    echo "cursor --uninstall-extension yoavbls.pretty-ts-errors"
    echo ""
    echo "# Cursor 재시작:"
    echo "cursor -r"
else
    echo "Cursor가 설치되지 않아 명령어를 실행할 수 없습니다."
fi

echo ""
echo "=== 설정 파일 위치 정보 ==="
echo "🔧 Cursor 설정 위치:"
case "$OSTYPE" in
  darwin*)  echo "  - macOS: ~/Library/Application Support/Cursor/User/" ;;
  linux*)   echo "  - Linux: ~/.config/Cursor/User/" ;;
  msys*)    echo "  - Windows: %APPDATA%/Cursor/User/" ;;
  *)        echo "  - 운영체제 감지 실패" ;;
esac

echo ""
echo "=== 완료 ==="
echo "📋 cursor_extensions.txt 파일을 확인하여 상세한 확장 목록을 볼 수 있습니다."