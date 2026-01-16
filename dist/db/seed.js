import { createKey, createKeys } from '../services/keyService.js';
import { closePool } from './index.js';
async function seed() {
    console.log('🌱 Seeding database with sample keys...\n');
    try {
        // Create a lifetime key
        const lifetimeKey = await createKey({
            note: 'Lifetime test key',
            durationDays: null,
            maxHwidResets: 3,
        });
        console.log(`✅ Lifetime key: ${lifetimeKey.key}`);
        // Create a 30-day key
        const monthlyKey = await createKey({
            note: '30-day test key',
            durationDays: 30,
            maxHwidResets: 1,
        });
        console.log(`✅ 30-day key: ${monthlyKey.key}`);
        // Create a limited uses key
        const limitedKey = await createKey({
            note: 'Limited to 10 uses',
            maxUses: 10,
        });
        console.log(`✅ Limited key (10 uses): ${limitedKey.key}`);
        // Create a batch of 5 weekly keys
        const weeklyKeys = await createKeys(5, {
            note: 'Weekly batch key',
            durationDays: 7,
            maxHwidResets: 0,
        });
        console.log(`\n✅ Created ${weeklyKeys.length} weekly keys:`);
        weeklyKeys.forEach(k => console.log(`   - ${k.key}`));
        console.log('\n✨ Seeding complete!');
        console.log('\nYou can use these keys to test the API.');
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
    finally {
        await closePool();
    }
}
seed();
//# sourceMappingURL=seed.js.map