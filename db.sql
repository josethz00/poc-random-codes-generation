CREATE TABLE IF NOT EXISTS codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0
);