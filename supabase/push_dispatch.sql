-- 알림이 저장되면 서버가 푸시를 보낸다.
-- notifications에 행이 추가되고 수신자가 푸시를 켜 두었으면, pg_net이 Netlify 함수
-- /.netlify/functions/push-dispatch 를 비동기로 호출한다 (트랜잭션을 지연시키지 않음).
-- 함수는 공유 비밀값으로 호출을 검증하고, 서버용 비밀 키로 구독 정보를 읽어 발송한다.
--
-- notifications_triggers.sql을 먼저 적용한 뒤 실행한다. 여러 번 실행해도 안전하다.
-- 실행 후 아래 쿼리로 비밀값을 확인해 Netlify 환경변수 PUSH_WEBHOOK_SECRET에 넣는다.
--   select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret';

create extension if not exists pg_net with schema extensions;

-- 공유 비밀값 (없을 때만 생성)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_webhook_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'push_webhook_secret',
      'Netlify push-dispatch 함수 호출 검증용'
    );
  end if;
end $$;

create or replace function public.dispatch_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  webhook_secret text;
begin
  -- 푸시를 켜 둔 사용자에게만 호출해 불필요한 요청을 만들지 않는다
  if not exists (
    select 1 from public.user_push_settings where user_id = new.user_id and enabled
  ) then
    return new;
  end if;

  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'push_webhook_secret';
  if webhook_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://spoonie.kr/.netlify/functions/push-dispatch',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.dispatch_push_on_notification() from public, anon, authenticated;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push after insert on public.notifications
  for each row execute function public.dispatch_push_on_notification();
