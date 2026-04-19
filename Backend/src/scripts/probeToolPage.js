import 'dotenv/config'
import axios from 'axios'
import * as cheerio from 'cheerio'

const http = axios.create({
    timeout: 20000,
    headers: {
        // Googlebot UA often gets better SSR responses
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
    }
})

const url = 'https://www.futurepedia.io/tool/replika'
console.log(`Fetching: ${url}`)

const { data: html } = await http.get(url)
const $ = cheerio.load(html)

console.log('\n── Meta tags ───────────────────────────')
console.log('og:title:      ', $('meta[property="og:title"]').attr('content'))
console.log('og:description:', $('meta[property="og:description"]').attr('content'))
console.log('og:image:      ', $('meta[property="og:image"]').attr('content'))
console.log('description:   ', $('meta[name="description"]').attr('content'))
console.log('title tag:     ', $('title').text())
console.log('h1:            ', $('h1').first().text().trim())

console.log('\n── External links ──────────────────────')
const seen = new Set()
$('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (
        href.startsWith('http') &&
        !href.includes('futurepedia') &&
        !href.includes('twitter') &&
        !href.includes('t.co') &&
        !href.includes('linkedin') &&
        !href.includes('youtube') &&
        !href.includes('instagram') &&
        !href.includes('facebook') &&
        !seen.has(href) &&
        seen.size < 8
    ) {
        console.log(' ', href)
        seen.add(href)
    }
})

console.log('\n── JSON-LD structured data ─────────────')
const jsonLd = $('script[type="application/ld+json"]').html()
if (jsonLd) {
    try {
        const data = JSON.parse(jsonLd)
        console.log(JSON.stringify(data, null, 2).substring(0, 800))
    } catch { console.log('Could not parse JSON-LD') }
} else {
    console.log('No JSON-LD found')
}
