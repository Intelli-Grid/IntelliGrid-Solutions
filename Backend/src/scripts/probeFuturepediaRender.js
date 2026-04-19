/**
 * probeFuturepediaRender.js
 * Tests ScraperAPI render:true on a Futurepedia tool page.
 * Goal: can we extract the official tool URL after JS hydration?
 */
import 'dotenv/config'
import * as cheerio from 'cheerio'
import { scraperGet } from '../config/scraperClient.js'
import axios from 'axios'

const direct = axios.create({
    timeout: 20000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0 Safari/537.36',
        Accept: 'text/html,*/*',
    }
})

const testUrls = [
    'https://www.futurepedia.io/tool/replika',
    'https://www.futurepedia.io/tool/chatgpt',
]

for (const url of testUrls) {
    console.log(`\n${'─'.repeat(60)}`)
    console.log(`Testing: ${url}`)

    // Try 1: ScraperAPI render:true (JS-hydrated HTML)
    try {
        const { data: html } = await scraperGet(url, { render: true })
        const $ = cheerio.load(html)

        console.log('\n[ScraperAPI render:true]')
        console.log('  name (h1):   ', $('h1').first().text().trim())
        console.log('  description: ', $('meta[name="description"]').attr('content')?.substring(0, 100))

        // Look for any external URL that's not Futurepedia/social
        const externalUrls = new Set()
        $('a[href]').each((_, el) => {
            const href = $(el).attr('href') || ''
            if (href.startsWith('http') &&
                !href.includes('futurepedia') &&
                !href.includes('twitter') && !href.includes('t.co') &&
                !href.includes('linkedin') && !href.includes('youtube') &&
                !href.includes('instagram') && !href.includes('facebook') &&
                !href.includes('tiktok') && !href.includes('google')) {
                externalUrls.add(href.split('?')[0])
            }
        })

        if (externalUrls.size > 0) {
            console.log('  ✅ External URLs found:')
            externalUrls.forEach(u => console.log('    ', u))
        } else {
            console.log('  ❌ No external URLs — still client-rendered after ScraperAPI')

            // Check for any data attributes or button href
            const btns = []
            $('a, button').each((_, el) => {
                const text = $(el).text().toLowerCase()
                if (text.includes('visit') || text.includes('try') || text.includes('get') || text.includes('open')) {
                    btns.push({ text: $(el).text().trim(), href: $(el).attr('href'), 'data-href': $(el).attr('data-href') })
                }
            })
            if (btns.length) console.log('  CTA-like elements:', JSON.stringify(btns.slice(0, 3)))
        }

        // Extract logo from og:image
        const ogImage = $('meta[property="og:image"]').attr('content') || ''
        const logoMatch = ogImage.match(/image=([^&]+)/)
        const logo = logoMatch ? decodeURIComponent(logoMatch[1]) : ''
        if (logo) console.log('  logo: ', logo)

    } catch (err) {
        console.log(`  ❌ ScraperAPI render failed: ${err.response?.status || err.message}`)

        // Fallback: try direct
        try {
            const { data: html } = await direct.get(url)
            const $ = cheerio.load(html)
            console.log('[Direct fallback] h1:', $('h1').first().text().trim())
        } catch (e2) {
            console.log('  Direct also failed:', e2.message)
        }
    }
}

console.log('\n✅ Done')
