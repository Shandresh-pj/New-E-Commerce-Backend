import dataSource from "./config/database";

async function syncDatabase() {
    try {
        console.log("Initializing database connection...");
        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }
        console.log("Synchronizing database schema...");
        await dataSource.synchronize(false);
        console.log("✅ Database synchronized successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error synchronizing database:", error);
        process.exit(1);
    }
}

syncDatabase();
