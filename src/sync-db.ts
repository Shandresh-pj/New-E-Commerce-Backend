/**
 * One-shot database synchronization script.
 * Run:  npx ts-node src/sync-db.ts
 *
 * This imports dataSource which now uses ALL_ENTITIES from global.ts,
 * so every entity defined in the entities/ folder will have its table
 * created or altered to match the current schema.
 */
import "reflect-metadata";
import dataSource from "./config/database";

async function syncDatabase() {
    console.log("🔄 Initializing database connection...");

    try {
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
            console.log("✅ Connected to database.");
        }

        console.log("🔄 Synchronizing all entity tables...");
        await dataSource.synchronize(false); // false = keep existing data
        console.log("✅ All tables created / updated successfully.");

        // Print the list of entity tables that were checked
        const entityNames = dataSource.entityMetadatas.map(m => m.tableName);
        console.log(`\n📋 Managed tables (${entityNames.length}):`);
        entityNames.sort().forEach(t => console.log("   •", t));

        process.exit(0);
    } catch (error) {
        console.error("❌ Error during database sync:", error);
        process.exit(1);
    }
}

syncDatabase();
