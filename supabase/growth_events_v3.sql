-- Partner acquisition activation measurement.
-- Preserve the existing event model and extend only the allowlist.
alter table public.events
  drop constraint if exists events_type_check;

alter table public.events
  add constraint events_type_check check (
    type in (
      'detail_open',
      'cook_start',
      'cook_complete',
      'save',
      'recipeed_create',
      'derived_create',
      'profile_open',
      'follow',
      'unfollow',
      'share',
      'recipeed_start',
      'related_open',
      'signup_submitted',
      'partner_auth_complete',
      'recipe_create'
    )
  );
