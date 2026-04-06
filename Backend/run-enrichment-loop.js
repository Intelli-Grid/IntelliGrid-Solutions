import { spawn } from 'child_process';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCRIPT_TO_RUN = 'src/scripts/bulkEnrich.js';
const WAIT_HOURS = 24;

async function getRemainingToolsCount() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Tool = (await import('./src/models/Tool.js')).default;
    await import('./src/models/Category.js');
    
    const count = await Tool.countDocuments({
        status: { $in: ['active', 'pending'] },
        $or: [
            { lastEnrichedAt: { $exists: false } },
            { lastEnrichedAt: null },
            { enrichmentScore: { $lt: 30 } },
            { dataQualityFlags: 'groq_failed' }
        ]
    });
    
    await mongoose.disconnect();
    return count;
}

function runEnrichmentScript() {
    return new Promise((resolve) => {
        const proc = spawn('node', [SCRIPT_TO_RUN], { stdio: 'inherit' });
        proc.on('close', (code) => {
            resolve(code);
        });
    });
}

function sleepWait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startLoop() {
    console.log(`\n======================================================`);
    console.log(`  IntelliGrid Bulk Enrichment Loop (Node.js)`);
    console.log(`  Started: ${new Date().toLocaleString()}`);
    console.log(`  Wait: ${WAIT_HOURS} hours between runs (Groq daily reset)`);
    console.log(`  Stop: Press Ctrl+C safely at any time.`);
    console.log(`======================================================\n`);

    let runNumber = 0;

    while (true) {
        runNumber++;
        console.log(`\n──────────────────────────────────────────────────────`);
        console.log(`  RUN #${runNumber} — Started: ${new Date().toLocaleString()}`);
        console.log(`──────────────────────────────────────────────────────\n`);

        const exitCode = await runEnrichmentScript();

        console.log(`\n──────────────────────────────────────────────────────`);
        console.log(`  RUN #${runNumber} FINISHED — Exit code: ${exitCode}`);
        console.log(`  Finished: ${new Date().toLocaleString()}`);
        console.log(`──────────────────────────────────────────────────────\n`);

        const remaining = await getRemainingToolsCount();
        console.log(`  Tools still needing enrichment: ${remaining}`);

        if (remaining === 0) {
            console.log(`\n  🎉 ALL TOOLS ENRICHED! Nothing left to process.`);
            console.log(`  Loop complete. Exiting cleanly.\n`);
            break;
        }

        console.log(`\n  ⏳ Groq limits hit or run finished. Waiting ${WAIT_HOURS} hours for reset...`);
        const nextRun = new Date(Date.now() + WAIT_HOURS * 3600 * 1000);
        console.log(`  Next run scheduled at: ${nextRun.toLocaleString()}`);
        console.log(`  (Press Ctrl+C to stop the loop at any time)\n`);

        // Wait in 1-minute intervals to show countdown
        const totalMinutes = WAIT_HOURS * 60;
        for (let i = 0; i < totalMinutes; i++) {
            const secondsLeft = (totalMinutes - i) * 60;
            const h = Math.floor(secondsLeft / 3600);
            const m = Math.floor((secondsLeft % 3600) / 60);
            process.stdout.write(`\r  Next run in: ${h}h ${m}m   `);
            await sleepWait(60000);
        }
        
        console.log(`\n\n  🔄 Groq limits reset. Starting next enrichment run...`);
    }
}

startLoop().catch(err => {
    console.error(`Fatal error in loop:`, err);
    process.exit(1);
});
