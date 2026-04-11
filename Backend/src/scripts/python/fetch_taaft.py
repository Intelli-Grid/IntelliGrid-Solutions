import json
import time
import sys
import re
from curl_cffi import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse

BASE_URL = 'https://theresanaiforthat.com'

CATEGORIES = [
    'writing',
    'image-generation',
    'video',
    'code',
    'productivity',
    'marketing'
]

def clean_text(text, max_len=500):
    if not text:
        return ''
    return ' '.join(text.split())[:max_len]

def extract_tools_from_category(category):
    url = f"{BASE_URL}/category/{category}/?p=1"
    
    try:
        res = requests.get(url, impersonate="chrome120")
        soup = BeautifulSoup(res.text, 'html.parser')
        
        tools = []
        cards = soup.find_all('li', class_='li')
        if not cards:
            cards = soup.find_all('article')
            
        for card in cards:
            name_tag = card.find('h2') or card.find('h3')
            # Fallback for name: the link itself
            if not name_tag:
                name_tag = card.find('a', href=re.compile(r'/ai/'))
            if not name_tag:
                continue
                
            name = name_tag.text.strip()
            
            # Remove any trailing " pricing" or " alternatives" if accidentally grabbed
            if '\n' in name:
                name = name.split('\n')[0].strip()
            
            desc_tag = card.find(class_=re.compile(r'description|desc'))
            desc = desc_tag.text.strip() if desc_tag else ''
            
            official_url = ''
            for a in card.find_all('a', href=True):
                href = a['href']
                if '/r?u=' in href or '/r/?u=' in href or ('http' in href and 'theresanaiforthat.com' not in href):
                    official_url = href.split('?')[0]
                    break
                    
            if not official_url:
                continue
                
            pricing = 'Unknown'
            price_badge = card.find(class_=re.compile(r'price|pricing'))
            if price_badge:
                pt = price_badge.text.lower()
                if 'free' in pt and 'freemium' not in pt: pricing = 'Free'
                elif 'freemium' in pt: pricing = 'Freemium'
                elif 'paid' in pt or 'premium' in pt: pricing = 'Paid'
                elif 'trial' in pt: pricing = 'Trial'
                
            tools.append({
                'name': name,
                'officialUrl': official_url,
                'shortDescription': clean_text(desc),
                'category': category.capitalize(),
                'tags': [category],
                'pricing': pricing,
                'logo': None,
                'source': 'taaft',
                'sourceUrl': url
            })
            
        return tools
    except Exception as e:
        print(f"Error fetching {category}: {e}", file=sys.stderr)
        return []

def main():
    results = []
    
    for cat in CATEGORIES:
        tools = extract_tools_from_category(cat)
        results.extend(tools)
        time.sleep(1)
        
    print(json.dumps(results))

if __name__ == '__main__':
    main()
