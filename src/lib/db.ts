import "server-only";
import postgres from "postgres";

// Veritabanı bağlantısı. Tek gereken ayar DATABASE_URL (Supabase'den kopyalanır).

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL ayarlanmamış. Kurulum rehberindeki (KURULUM.md) adımları takip et.",
    );
  }
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
  return postgres(url, {
    ssl: local ? false : "require",
    // Supabase'in "transaction pooler" bağlantısı hazır sorguları desteklemez.
    prepare: false,
    max: 3,
    idle_timeout: 20,
    // Veritabanına ulaşılamazsa sonsuza dek bekleme
    connect_timeout: 10,
    onnotice: () => {},
  });
}

const globalForDb = globalThis as unknown as { __sql?: postgres.Sql; __schema?: Promise<void> };

function client(): postgres.Sql {
  return (globalForDb.__sql ??= createClient());
}

/** `sql\`select ...\`` şeklinde kullanılır; bağlantı ilk sorguda kurulur. */
export const sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply: (_t, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_t, prop) => {
    const c = client() as unknown as Record<string | symbol, unknown>;
    const v = c[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});

const SCHEMA = /* sql */ `
create table if not exists profiles (
  id serial primary key,
  name text not null,
  emoji text not null default '😀',
  color text not null default 'clay',
  pin_hash text not null,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  streak int not null default 0,
  best_streak int not null default 0,
  freezes int not null default 2,
  freezes_month text not null default '',
  streak_through text not null,
  created_at timestamptz not null default now()
);

create table if not exists app_config (
  key text primary key,
  value text not null
);

create table if not exists tasks (
  id serial primary key,
  title text not null,
  emoji text not null default '✅',
  notes text not null default '',
  kind text not null check (kind in ('once', 'recurring', 'habit')),
  creator_id int not null references profiles(id),
  assignee_id int references profiles(id),
  xp int not null default 10,
  requires_approval boolean not null default false,
  due_date text,
  repeat text check (repeat in ('daily', 'weekly', 'monthly')),
  repeat_days int[] not null default '{}',
  repeat_dom int,
  remind_time text,
  start_date text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists completions (
  id serial primary key,
  task_id int not null references tasks(id) on delete cascade,
  profile_id int not null references profiles(id),
  occ_date text not null,
  status text not null check (status in ('pending', 'approved')),
  xp int not null,
  completed_at timestamptz not null default now(),
  decided_by int references profiles(id),
  decided_at timestamptz,
  unique (task_id, occ_date)
);

create table if not exists xp_events (
  id serial primary key,
  profile_id int not null references profiles(id),
  amount int not null,
  kind text not null,
  completion_id int references completions(id) on delete cascade,
  note text not null default '',
  day text not null,
  created_at timestamptz not null default now()
);
create index if not exists xp_events_day on xp_events (day);

create table if not exists profile_badges (
  profile_id int not null references profiles(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (profile_id, badge_id)
);

create table if not exists goal_weeks (
  week_start text primary key,
  target int not null,
  achieved_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  endpoint text primary key,
  profile_id int not null references profiles(id) on delete cascade,
  keys jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists sent_log (
  key text primary key,
  created_at timestamptz not null default now()
);

create table if not exists subtasks (
  id serial primary key,
  task_id int not null references tasks(id) on delete cascade,
  title text not null,
  xp int not null default 5 check (xp >= 0),
  position int not null default 0,
  archived boolean not null default false
);
create index if not exists subtasks_task on subtasks (task_id);

create table if not exists subtask_completions (
  id serial primary key,
  subtask_id int not null references subtasks(id) on delete cascade,
  task_id int not null references tasks(id) on delete cascade,
  profile_id int not null references profiles(id),
  occ_date text not null,
  status text not null check (status in ('pending', 'approved')),
  xp int not null,
  completed_at timestamptz not null default now(),
  unique (subtask_id, occ_date)
);

alter table xp_events add column if not exists
  subtask_completion_id int references subtask_completions(id) on delete cascade;

create table if not exists objections (
  id serial primary key,
  task_id int not null references tasks(id) on delete cascade,
  by_id int not null references profiles(id),
  kind text not null check (kind in ('task', 'amount')),
  reason text not null default '',
  proposed_xp int,
  old_xp int,
  status text not null default 'acik' check (status in ('acik', 'kabul', 'red', 'geri')),
  response text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists objections_task on objections (task_id);
-- İtiraz belirli bir alt göreve (adıma) yapılabilir; boşsa ana göreve/bonusa
alter table objections add column if not exists
  subtask_id int references subtasks(id) on delete cascade;

create table if not exists rewards (
  id serial primary key,
  title text not null,
  emoji text not null default '🎁',
  cost int not null check (cost > 0),
  creator_id int not null references profiles(id),
  buyer_id int not null references profiles(id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id serial primary key,
  reward_id int references rewards(id) on delete set null,
  buyer_id int not null references profiles(id),
  giver_id int not null references profiles(id),
  title text not null,
  emoji text not null,
  cost int not null,
  status text not null default 'bekliyor' check (status in ('bekliyor', 'teslim')),
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

-- Widget bağlantısı: değiştirilince eski widget bağlantıları geçersiz olur
alter table profiles add column if not exists widget_nonce text;

create table if not exists streak_log (
  profile_id int not null references profiles(id) on delete cascade,
  day text not null,
  outcome text not null,
  primary key (profile_id, day)
);
`;

/**
 * Şema sürümü: tablo/sütun eklendiğinde bir artır. Sürüm veritabanındakiyle aynıysa açılışta
 * HİÇ şema komutu (ALTER TABLE vb.) çalışmaz. ALTER TABLE tabloyu tamamen kilitler; her açılışta
 * çalıştırmak, yarım kalmış bir bağlantı kilit tutarken bütün uygulamayı kilitleyebiliyordu.
 */
const SCHEMA_VERSION = "7";

/** Bir işlemin (transaction) asla sonsuza dek beklememesi için sınırlar */
export async function txGuard(tx: { unsafe: postgres.Sql["unsafe"] }, statementSec = 15) {
  await tx
    .unsafe(
      `set local lock_timeout = '5s';
       set local statement_timeout = '${statementSec}s';
       set local idle_in_transaction_session_timeout = '15s'`,
    )
    .simple();
}

async function migrate(): Promise<void> {
  try {
    const rows = await sql<{ value: string }[]>`select value from app_config where key = 'schema_version'`;
    if (rows[0]?.value === SCHEMA_VERSION) return;
  } catch (e) {
    // 42P01: tablo yok (ilk kurulum) → aşağıda oluşturulur
    if ((e as { code?: string }).code !== "42P01") throw e;
  }
  await sql.begin(async (tx) => {
    await txGuard(tx, 30);
    await tx.unsafe(SCHEMA).simple();
    await tx`insert into app_config (key, value) values ('schema_version', ${SCHEMA_VERSION})
             on conflict (key) do update set value = excluded.value`;
  });
}

/** Tabloları gerekiyorsa oluşturur/günceller. Her sunucu işleminde bir kez kontrol edilir. */
export function ensureSchema(): Promise<void> {
  globalForDb.__schema ??= migrate().catch((e) => {
    globalForDb.__schema = undefined;
    throw e;
  });
  return globalForDb.__schema;
}

export async function getConfig(key: string): Promise<string | null> {
  await ensureSchema();
  const rows = await sql<{ value: string }[]>`select value from app_config where key = ${key}`;
  return rows[0]?.value ?? null;
}

/** Değer yoksa üretir ve kaydeder; iki istek aynı anda gelse bile tek değer kalır. */
export async function getOrCreateConfig(key: string, make: () => string): Promise<string> {
  const existing = await getConfig(key);
  if (existing !== null) return existing;
  await sql`insert into app_config (key, value) values (${key}, ${make()}) on conflict (key) do nothing`;
  return (await getConfig(key))!;
}

export async function setConfig(key: string, value: string): Promise<void> {
  await ensureSchema();
  await sql`insert into app_config (key, value) values (${key}, ${value})
            on conflict (key) do update set value = excluded.value`;
}
