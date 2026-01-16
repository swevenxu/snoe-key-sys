import pg from 'pg';
import { config } from '../config/index.js';
const { Pool } = pg;
// Create a connection pool
export const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if no connection
});
// Test database connection
export async function testConnection() {
    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Database connected successfully');
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}
// Helper function for queries
export async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (config.nodeEnv === 'development') {
        console.log('Executed query', { text: text.substring(0, 50), duration, rows: result.rowCount });
    }
    return result;
}
// Graceful shutdown
export async function closePool() {
    await pool.end();
    console.log('Database pool closed');
}
//# sourceMappingURL=index.js.map