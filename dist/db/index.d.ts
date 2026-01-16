import pg, { QueryResultRow } from 'pg';
export declare const pool: import("pg").Pool;
export declare function testConnection(): Promise<boolean>;
export declare function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>>;
export declare function closePool(): Promise<void>;
//# sourceMappingURL=index.d.ts.map