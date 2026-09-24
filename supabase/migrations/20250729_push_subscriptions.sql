create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create unique index if not exists push_subscriptions_client_endpoint_key
  on push_subscriptions (client_id, (subscription->>'endpoint'));
alter table push_subscriptions enable row level security;
create policy "clients manage own subscriptions" on push_subscriptions
  for all using (client_id = (select id from clients where user_id = auth.uid()));
