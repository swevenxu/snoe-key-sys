export declare const config: {
    port: number;
    nodeEnv: string;
    databaseUrl: string;
    adminApiKey: string;
    keyPrefix: string;
    rateLimit: {
        windowMs: number;
        max: number;
    };
    validateRateLimit: {
        windowMs: number;
        max: number;
    };
    requiredCheckpoints: number;
    checkpointKeyDuration: number;
    antiAbuse: {
        maxKeysPerIpPerDay: number;
        maxKeysPerFingerprintPerDay: number;
        maxKeysPerHwidPerDay: number;
        cooldownHours: number;
        enabled: boolean;
    };
};
//# sourceMappingURL=index.d.ts.map