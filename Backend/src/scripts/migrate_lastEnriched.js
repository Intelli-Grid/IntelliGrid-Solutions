import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrate() {
    if (!MONGODB_URI) {
        console.error('No MONGODB_URI found.');
        process.exit(1);
    }
    
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB. Starting migration...');

    const db = mongoose.connection.db;
    const toolsCollection = db.collection('tools');

    // 1. Copy lastEnriched to lastEnrichedAt where lastEnriched exists and lastEnrichedAt is null/missing
    const resultUpdate = await toolsCollection.updateMany(
        { 
            lastEnriched: { $exists: true, $ne: null },
            $or: [
                { lastEnrichedAt: { $exists: false } },
                { lastEnrichedAt: null }
            ]
        },
        [
            { $set: { lastEnrichedAt: "$lastEnriched" } }
        ]
    );
    console.log(`Updated ${resultUpdate.modifiedCount} tools by copying lastEnriched to lastEnrichedAt.`);

    // 2. Unset lastEnriched from all documents
    const resultUnset = await toolsCollection.updateMany(
        { lastEnriched: { $exists: true } },
        { $unset: { lastEnriched: "" } }
    );
    console.log(`Unset 'lastEnriched' from ${resultUnset.modifiedCount} tools.`);

    console.log('Migration complete.');
    process.exit(0);
}

migrate().catch(console.error);
