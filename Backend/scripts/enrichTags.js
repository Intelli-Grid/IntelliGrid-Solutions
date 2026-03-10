import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import Tool from '../src/models/Tool.js';
import https from 'https';

dotenv.config();

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const fetchGroqTags = async (toolName, description) => {
    const prompt = `You are an AI directory categorization expert. Please analyze this AI tool and return a JSON array of exactly 3 relevant tags (e.g. "writing", "audio generators", "productivity"). Only output the strict JSON array of strings, no other text or explanation. Note that all elements must be strictly relevant.

Tool Name: ${toolName}
Description: ${description}`;

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens: 50,
            response_format: { type: "json_object" } // Using standard response parsing due to array
        });

        // Some models on Groq support json_object. Wait, instead of json_object, I'll just ask for the raw array.
        const reqData = JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1,
        });

        const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(reqData)
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.error) return reject(new Error(result.error.message));
                    
                    const content = result.choices[0].message.content.trim();
                    // Extract array
                    const jsonMatch = content.match(/\[(.*?)\]/s);
                    if (jsonMatch) {
                        const arr = JSON.parse(jsonMatch[0]);
                        resolve(arr);
                    } else {
                        resolve([]);
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.write(reqData);
        req.end();
    });
};

const enrichTags = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');

        // Number of tools to process in this batch
        const BATCH_SIZE = 25; 

        // Find tools with 0 tags
        const toolsToEnrich = await Tool.find({ 
            $or: [{ tags: { $size: 0 } }, { tags: { $exists: false } }],
            // Ensure we only process tools with some description available for context
            shortDescription: { $exists: true, $ne: '' }
        }).limit(BATCH_SIZE);

        console.log(`Found ${toolsToEnrich.length} tools to enrich in this batch.`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < toolsToEnrich.length; i++) {
            const tool = toolsToEnrich[i];
            try {
                const tags = await fetchGroqTags(tool.name, tool.shortDescription);
                if (tags && Array.isArray(tags) && tags.length > 0) {
                    const newTags = tags.map(t => t.toLowerCase().trim()).slice(0, 4);
                    await Tool.updateOne({ _id: tool._id }, { $set: { tags: newTags } });
                    successCount++;
                    console.log(`[${i+1}/${toolsToEnrich.length}] ✅ Enriched ${tool.name} with tags: ${newTags.join(', ')}`);
                } else {
                    failCount++;
                    console.log(`[${i+1}/${toolsToEnrich.length}] ❌ Failed to parse tags for ${tool.name}`);
                }
            } catch (err) {
                failCount++;
                console.error(`[${i+1}/${toolsToEnrich.length}] ❌ Error on ${tool.name}: ${err.message}`);
                
                // If rate limited (code 429 usually inside err message), we should break
                if (err.message && err.message.includes('429')) {
                    console.log('Hit rate limit! Stopping batch.');
                    break;
                }
            }
            
            // Wait 2s to respect Groq free tier limit of 30 RPM
            await delay(2000);
        }

        console.log(`\nBatch Complete! ✅ ${successCount} successful | ❌ ${failCount} failed.`);
        console.log(`Note: To enrich all 3.5k tools, run this script via cron or a continuous loop processing batches of 25.`);
        
        process.exit(0);
    } catch (error) {
        console.error('Enrichment failed:', error);
        process.exit(1);
    }
};

enrichTags();
