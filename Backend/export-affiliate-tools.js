import mongoose from 'mongoose'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { join, resolve } from 'path'

// Load environment variables from backend directory
dotenv.config({ path: resolve(process.cwd(), '.env') })

import Tool from './src/models/Tool.js'

async function exportAffiliateList() {
    try {
        console.log('Connecting to database...')
        await mongoose.connect(process.env.MONGODB_URI)
        console.log('Connected!')

        // We fetch only the fields we need to keep the process fast and memory-light
        const tools = await Tool.find({}, 'name officialUrl affiliateUrl affiliateStatus').lean()
        console.log(`Found ${tools.length} total tools.`)

        let csvContent = 'Tool Name,Official URL,Affiliate URL,Affiliate Status\n'

        tools.forEach(tool => {
            // Escape double quotes inside the tool name by doubling them, then wrap in double quotes
            const cleanName = tool.name ? tool.name.replace(/"/g, '""') : 'Unnamed'
            const officialUrl = tool.officialUrl || ''
            const affiliateUrl = tool.affiliateUrl || ''
            const affiliateStatus = tool.affiliateStatus || 'not_started'

            csvContent += `"${cleanName}","${officialUrl}","${affiliateUrl}","${affiliateStatus}"\n`
        })

        const outputPath = join(process.cwd(), 'tools-affiliate-export.csv')
        fs.writeFileSync(outputPath, csvContent)
        
        console.log(`\n✅ SUCCCESS! Export saved to:`)
        console.log(outputPath)
        console.log(`\nYou can now open this file in Excel or upload it to Google Sheets.`)
        
    } catch (error) {
        console.error('Export failed:', error)
    } finally {
        await mongoose.disconnect()
        process.exit(0)
    }
}

exportAffiliateList()
