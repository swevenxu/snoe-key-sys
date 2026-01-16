import fs from 'fs';
import path from 'path';
import url from 'url';
import { pool, closePool } from './index.js';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  console.log('🚀 Running database migrations...\n');
  
  try {
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute the schema
    await pool.query(schema);
    
    console.log('✅ Database migrations completed successfully!');
    console.log('\nTables created:');
    console.log('  - keys (main license keys table)');
    console.log('  - validation_logs (for tracking validations)');
    console.log('  - admin_users (for dashboard auth)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

migrate();
