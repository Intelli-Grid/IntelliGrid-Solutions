/**
 * migrate-mongo-config.js
 *
 * IMPORTANT: This project uses ESM ("type": "module" in package.json).
 * migrate-mongo v10+ supports ESM. Use `export default` here.
 *
 * Run migrations:
 *   npm run migrate:up      — apply pending migrations
 *   npm run migrate:down    — roll back the last applied migration
 *   npm run migrate:status  — show which migrations have run
 *
 * RULE: Always run migrate:up on STAGING before running on PRODUCTION.
 * RULE: Always take a MongoDB Atlas Snapshot before running on PRODUCTION.
 */

const config = {
    mongodb: {
        url: process.env.MONGODB_URI || 'mongodb://localhost:27017',
        databaseName: process.env.DB_NAME || 'intelligrid',
    },

    // Directory where your migration files live
    migrationsDir: 'migrations',

    // Collection name to track which migrations have run
    changelogCollectionName: 'changelog',

    // Extension for new migration files
    migrationFileExtension: '.js',

    // Hash each migration file to detect tampering
    useFileHash: true,

    // Tell migrate-mongo to use ESM module loading
    moduleSystem: 'esm',
}

export default config
