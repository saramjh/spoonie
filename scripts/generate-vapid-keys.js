/**
 * 🆓 VAPID 키 생성 스크립트
 * 한 번만 실행하면 됩니다
 */

const webpush = require('web-push');

console.log('🔑 VAPID 키 생성 중...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID 키가 생성되었습니다!\n');

console.log('📋 환경변수에 다음을 추가하세요:');
console.log('='.repeat(60));
console.log('\n# Netlify 환경변수 (.env)');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);

console.log('\n# Next.js 환경변수 (.env.local)');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);

console.log('\n='.repeat(60));
console.log('\n🎯 설정 방법:');
console.log('1. .env.local 파일에 NEXT_PUBLIC_VAPID_PUBLIC_KEY 추가');
console.log('2. Netlify 대시보드 → Settings → Environment variables에 VAPID 키들 추가');
console.log('3. 이메일 주소를 send-push.js 파일에서 수정');
console.log('\n💡 이 키들은 안전하게 보관하세요!');