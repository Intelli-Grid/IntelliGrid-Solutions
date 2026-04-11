import json
import time
import sys
from curl_cffi import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

BASE_URL = 'https://www.aixploria.com'

def extract_official_url(soup):
    for a in soup.find_all('a', href=True):
        href = a['href']
        text = a.text.lower().strip()
        if ('visit' in text or 'try' in text or 'access' in text or 'open' in text or 'go to' in text) and href.startswith('http') and 'aixploria.com' not in href:
            return href.split('?')[0]
            
    for a in soup.find_all('a', href=True):
        href = a['href']
        if href.startswith('http') and 'aixploria.com' not in href and 'twitter.com' not in href and 'facebook.com' not in href and 'wp-content' not in href:
            return href.split('?')[0]
            
    return None

def fetch_sitemap_urls():
    try:
        res = requests.get(f"{BASE_URL}/sitemap.xml", impersonate="chrome120")
        soup = BeautifulSoup(res.text, 'xml')
        sitemaps = [loc.text for loc in soup.find_all('loc') if 'sitemap-posttype-post' in loc.text]
        if not sitemaps:
            return []
            
        # Get the latest month
        latest_sitemap = sitemaps[0]
        
        res = requests.get(latest_sitemap, impersonate="chrome120")
        soup = BeautifulSoup(res.text, 'xml')
        
        urls = [loc.text for loc in soup.find_all('loc')]
        return urls
    except Exception as e:
        print(f"Error fetching sitemap: {e}", file=sys.stderr)
        return []

def scrape_tool_page(url):
    try:
        res = requests.get(url, impersonate="chrome120")
        soup = BeautifulSoup(res.text, 'html.parser')
        
        name_tag = soup.find('h1')
        if not name_tag: return None
        name = name_tag.text.strip()
        
        desc_meta = soup.find('meta', {'name': 'description'})
        desc = desc_meta['content'] if desc_meta else ''
        
        official_url = extract_official_url(soup)
        if not official_url: return None
        
        logo = None
        logo_meta = soup.find('meta', property='og:image')
        if logo_meta:
            logo = logo_meta['content']
            
        tags = []
        for cat in soup.find_all(class_='post-categories'):
            tags.extend([a.text.strip() for a in cat.find_all('a')])
            
        category = tags[0] if tags else ''
        
        return {
            'name': name,
            'officialUrl': official_url,
            'shortDescription': desc[:499],
            'category': category,
            'tags': list(dict.fromkeys(tags))[:10],
            'pricing': 'Unknown',
            'logo': logo,
            'source': 'aixploria',
            'sourceUrl': url
        }
    except Exception as e:
        return None

def main():
    urls = fetch_sitemap_urls()
    results = []
    
    # Process up to 100 URLs to avoid timeouts but fetch a deep batch
    for url in urls[:100]:
        data = scrape_tool_page(url)
        if data:
            results.append(data)
        time.sleep(1)
        
    print(json.dumps(results))

if __name__ == '__main__':
    main()
