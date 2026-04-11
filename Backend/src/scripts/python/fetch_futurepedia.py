import json
import time
import sys
import asyncio
from bs4 import BeautifulSoup
try:
    import nodriver as uc
except ImportError:
    uc = None

BASE_URL = 'https://www.futurepedia.io'

async def get_page_html(browser, url):
    page = await browser.get(url)
    await asyncio.sleep(5)  # Wait for Cloudflare/SPA to render
    
    # Try to scroll a bit to trigger lazy loading
    await page.evaluate("window.scrollBy(0, 1000);")
    await asyncio.sleep(2)
    
    html = await page.get_content()
    return html

def parse_listing_page(html):
    soup = BeautifulSoup(html, 'html.parser')
    links = []
    # Identify tool detail links
    for a in soup.find_all('a', href=True):
        href = a['href']
        if '/tool/' in href and href not in links:
            links.append(href)
    return links

def parse_tool_page(html, url):
    soup = BeautifulSoup(html, 'html.parser')
    
    name_tag = soup.find('h1')
    if not name_tag: return None
    name = name_tag.text.strip()
    
    desc_tag = soup.find('meta', {'name': 'description'})
    desc = desc_tag['content'] if desc_tag else ''
    
    # official url
    official_url = None
    for a in soup.find_all('a', href=True):
        href = a['href']
        text = a.text.lower().strip()
        if ('visit' in text or 'website' in text or 'try' in text) and 'http' in href and 'futurepedia.io' not in href:
            official_url = href.split('?')[0]
            break
            
    if not official_url:
        # any external link
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.startswith('http') and 'futurepedia.io' not in href and 'twitter.com' not in href:
                official_url = href.split('?')[0]
                break
                
    if not official_url:
        return None
        
    return {
        'name': name,
        'officialUrl': official_url,
        'shortDescription': desc[:499],
        'category': '',
        'tags': [],
        'pricing': 'Unknown',
        'logo': None,
        'source': 'futurepedia',
        'sourceUrl': url
    }

async def main_async():
    if not uc:
        print("{}", file=sys.stderr)
        return
        
    browser = await uc.start(headless=True)
    results = []
    
    try:
        html = await get_page_html(browser, f"{BASE_URL}/ai-tools?page=1")
        links = parse_listing_page(html)
        
        # We only do 1 page in this fallback SPA crawler because of RAM limits on Railway
        # and because traversing an SPA page by page is expensive
        for href in links[:20]:  # limit to 20 per nightly run to prevent timeout/OOM
            full_url = f"{BASE_URL}{href}" if href.startswith('/') else href
            tool_html = await get_page_html(browser, full_url)
            data = parse_tool_page(tool_html, full_url)
            if data:
                results.append(data)
                
    except Exception as e:
        print(f"Error during crawl: {str(e)}", file=sys.stderr)
    finally:
        browser.stop()
        
    print(json.dumps(results))

def main():
    asyncio.run(main_async())

if __name__ == '__main__':
    main()
