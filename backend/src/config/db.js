import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase için gerekli
});

pool.on("error", (error) => {
  console.error("Unexpected idle database connection error:", error.message);
});

console.log("DB URL:", process.env.DATABASE_URL);

export default pool;
