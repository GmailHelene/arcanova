// Ordered, append-only database migrations.
//
// Rules:
// - Never edit a migration once it has shipped — add a new one instead.
// - Each migration runs exactly once, tracked in the schema_migrations table.
// - Migrations here are written idempotently (IF NOT EXISTS) so the switch
//   from the old "apply whole schema on startup" approach is safe on a
//   database that already has these tables.

export interface Migration {
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    name: "0001_core",
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        username      TEXT UNIQUE NOT NULL,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS games (
        id          SERIAL PRIMARY KEY,
        creator_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        definition  JSONB NOT NULL DEFAULT '{}'::jsonb,
        plays       INTEGER NOT NULL DEFAULT 0,
        published   BOOLEAN NOT NULL DEFAULT false,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS scores (
        id         SERIAL PRIMARY KEY,
        game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score      INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_games_published ON games(published);
      CREATE INDEX IF NOT EXISTS idx_scores_game ON scores(game_id, score DESC);
    `,
  },
  {
    name: "0002_likes",
    sql: `
      CREATE TABLE IF NOT EXISTS likes (
        game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (game_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_likes_game ON likes(game_id);
    `,
  },
  {
    name: "0003_moderation",
    sql: `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE games ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

      CREATE TABLE IF NOT EXISTS reports (
        id          SERIAL PRIMARY KEY,
        game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason      TEXT NOT NULL DEFAULT '',
        status      TEXT NOT NULL DEFAULT 'open',
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    `,
  },
  {
    name: "0004_reactions",
    sql: `
      CREATE TABLE IF NOT EXISTS reactions (
        game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        phrase     TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (game_id, user_id)
      );
    `,
  },
];
