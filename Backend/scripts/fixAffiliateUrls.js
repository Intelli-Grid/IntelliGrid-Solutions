import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import Tool from '../src/models/Tool.js';

dotenv.config();

const cleanUrls = async () => {
    try {
        await connectDB();
        console.log('Connected to DB');
        
        // Find tools with futurepedia UTM params
        const toolsToUpdate = await Tool.find({ officialUrl: /futurepedia/i });
        console.log(`Found ${toolsToUpdate.length} tools with futurepedia params.`);
        
        let updatedCount = 0;
        for (const tool of toolsToUpdate) {
            try {
                const urlObj = new URL(tool.officialUrl);
                
                // Delete Futurepedia UTMs
                const paramsToDelete = [];
                for (const key of urlObj.searchParams.keys()) {
                    if (urlObj.searchParams.get(key).toLowerCase().includes('futurepedia')) {
                        paramsToDelete.push(key);
                    }
                }
                
                // Also check if they're standard UTM params just in case
                ['utm_source', 'utm_medium', 'utm_campaign'].forEach(key => {
                     const val = urlObj.searchParams.get(key);
                     if (val?.toLowerCase() === 'futurepedia') {
                         if (!paramsToDelete.includes(key)) paramsToDelete.push(key);
                     }
                });
                
                paramsToDelete.forEach(key => urlObj.searchParams.delete(key));
                
                // Append IntelliGrid UTMs
                urlObj.searchParams.set('utm_source', 'intelligrid');
                urlObj.searchParams.set('utm_medium', 'marketplace');
                
                tool.officialUrl = urlObj.toString();
                await tool.save();
                updatedCount++;
                
                if (updatedCount % 100 === 0) {
                    console.log(`Processed ${updatedCount}...`);
                }
            } catch (err) {
                // If URL parsing fails, ignore and skip
                continue;
            }
        }
        
        console.log(`Successfully updated ${updatedCount} tools.`);
        process.exit(0);
    } catch (error) {
        console.error('Error cleaning URLs', error);
        process.exit(1);
    }
};

cleanUrls();
