const { Client } = require('pg');
require('dotenv').config();

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add country and region columns
    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "country" text NOT NULL DEFAULT 'Ukraine';
    `);
    console.log('Added country column');

    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "region" text;
    `);
    console.log('Added region column');

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await client.end();
  }
}

applyMigration(); 