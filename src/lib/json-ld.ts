/**
 * JSON-LD를 <script type="application/ld+json">에 안전하게 넣기 위한 직렬화.
 * JSON.stringify는 "</script>"를 이스케이프하지 않으므로, 사용자 입력(제목, 설명 등)이
 * 스크립트 태그를 닫고 임의 코드를 실행할 수 있다. <, >, & 및 줄 구분자를 유니코드 이스케이프로 치환한다.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
