import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

try {
  await pool.query(`
    ALTER TABLE ratings
      DROP CONSTRAINT IF EXISTS ratings_rating_check;

    ALTER TABLE ratings
      ADD CONSTRAINT ratings_rating_check
      CHECK (
        rating >= 0.5
        AND rating <= 5
        AND rating * 2 = FLOOR(rating * 2)
      );
  `);

  console.log("ratings_rating_check now allows half-star ratings.");
} finally {
  await pool.end();
}
