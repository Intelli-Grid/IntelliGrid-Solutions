"""
crawl_taaft.py
==============
Crawls There's An AI For That (theresanaiforthat.com) and extracts AI tool
listings to CSV.

Output: Backend/exports/taaft_tools.csv
CSV Columns: name, short_description, official_url, category, pricing, source_url, source_site

Usage:
  Full crawl:   python crawl_taaft.py
  Single test:  python crawl_taaft.py --test

Rate limiting: 3 second delay between every request (respectful crawling).
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import sys
import os
import signal
from urllib.parse import urljoin, urlparse

is_shutting_down = False

def sigterm_handler(signum, frame):
    global is_shutting_down
    print("\n🛑 SIGTERM received — gracefully stopping and saving collected data...", flush=True)
    is_shutting_down = True

signal.signal(signal.SIGTERM, sigterm_handler)

# ── Config ────────────────────────────────────────────────────────────────────
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

DELAY_SECONDS = 3.0
BASE_URL = 'https://theresanaiforthat.com'
SOURCE_SITE = 'taaft'

# Resolve output path relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../../exports'))
OUTPUT_FILE = os.path.join(EXPORTS_DIR, 'taaft_tools.csv')

# TAAFT categories to crawl
CATEGORIES = [
    'writing',
    'image-generation',
    'video',
    'code',
    'productivity',
    'marketing',
    'music',
    'research',
    'design',
    'chatbots',
    'business',
    'education',
    'healthcare',
    'finance',
    'social-media',
    'seo',
    'customer-support',
    'data',
    'hr',
    'sales',
    'legal',
    'audio',
    '3d',
    'gaming',
]

TEST_CATEGORIES = ['writing']

# ── Helpers ───────────────────────────────────────────────────────────────────

def clean_text(text, max_len=500):
    """Strip whitespace and truncate."""
    if not text:
        return ''
    return ' '.join(text.split())[:max_len]


def normalize_pricing(raw):
    """Map raw pricing text to standard enum values."""
    p = (raw or '').lower().strip()
    if not p or p == 'unknown':
        return 'Unknown'
    if 'freemium' in p:
        return 'Freemium'
    if 'free' in p and ('paid' in p or 'premium' in p or '+' in p):
        return 'Freemium'
    if 'free' in p:
        return 'Free'
    if 'trial' in p:
        return 'Trial'
    if 'paid' in p or 'premium' in p or '$' in p:
        return 'Paid'
    return 'Unknown'


def is_external_url(url):
    """Return True if URL points outside theresanaiforthat.com."""
    try:
        parsed = urlparse(url)
        return parsed.netloc and 'theresanaiforthat.com' not in parsed.netloc
    except Exception:
        return False


def extract_tools_from_page(soup, category_name):
    """
    Extract all tool cards from a TAAFT listing page.
    TAAFT renders each tool as an <article> or a div with class containing 'ai-'.
    Returns list of dicts.
    """
    tools = []

    # Primary strategy: find article tags that contain tool info
    cards = soup.find_all('article')

    # Fallback: any div with a link to an AI tool page
    if not cards:
        cards = [
            a.parent for a in soup.find_all('a', href=re.compile(r'/ai/'))
            if a.parent and a.parent.name not in ['html', 'body', 'nav', 'header', 'footer']
        ]

    seen_names = set()

    for card in cards:
        try:
            # ── Extract name ──────────────────────────────────────────────
            name_el = (
                card.find(['h2', 'h3', 'h4']) or
                card.find(class_=re.compile(r'name|title|heading', re.I)) or
                card.find('strong')
            )
            name = clean_text(name_el.get_text()) if name_el else ''
            if not name or name in seen_names:
                continue
            seen_names.add(name)

            # ── Extract source URL (TAAFT detail page) ─────────────────────
            source_link = card.find('a', href=re.compile(r'/ai/'))
            source_url = urljoin(BASE_URL, source_link['href']) if source_link else ''

            # ── Extract official URL (external "Visit" button) ─────────────
            official_url = ''
            for a_tag in card.find_all('a', href=True):
                href = a_tag.get('href', '')
                if href.startswith('http') and is_external_url(href):
                    official_url = href.rstrip('/')
                    break

            # Skip cards with no usable URL at all
            if not official_url and not source_url:
                continue

            # ── Extract description ───────────────────────────────────────
            desc_el = (
                card.find('p') or
                card.find(class_=re.compile(r'desc|summary|text|excerpt', re.I))
            )
            description = clean_text(desc_el.get_text()) if desc_el else ''

            # ── Extract pricing badge ─────────────────────────────────────
            price_el = card.find(class_=re.compile(r'pric|badge|tag|chip|plan', re.I))
            raw_pricing = clean_text(price_el.get_text()) if price_el else ''
            pricing = normalize_pricing(raw_pricing)

            tools.append({
                'name': name,
                'short_description': description,
                'official_url': official_url,
                'category': category_name.replace('-', ' ').title(),
                'pricing': pricing,
                'source_url': source_url,
                'source_site': SOURCE_SITE,
            })

        except Exception:
            continue

    return tools


def has_next_page(soup):
    """Check if a 'next page' link exists in the pagination."""
    next_link = soup.find('a', attrs={'rel': 'next'})
    if next_link:
        return True
    next_link = soup.find('a', string=re.compile(r'next|›|»', re.I))
    return next_link is not None


def crawl_category(category_slug, test_mode=False):
    """Crawl all pages of a single TAAFT category."""
    all_tools = []
    page = 1
    category_name = category_slug.replace('-', ' ').title()

    while True:
        if is_shutting_down:
            print("    🛑 Stopping run due to SIGTERM", flush=True)
            break

        url = f"{BASE_URL}/category/{category_slug}/?p={page}"
        print(f"    → {url}", flush=True)

        try:
            response = requests.get(url, headers=HEADERS, timeout=25)
            if response.status_code == 404:
                print(f"    ⚠️  404 — no more pages", flush=True)
                break
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"    ⚠️  Request failed: {e}", flush=True)
            break

        soup = BeautifulSoup(response.content, 'html.parser')
        tools = extract_tools_from_page(soup, category_name)

        if not tools and page > 1:
            print(f"    ℹ️  No tools on page {page} — stopping", flush=True)
            break

        all_tools.extend(tools)
        print(f"    ✅ Page {page}: {len(tools)} tools found ({len(all_tools)} total)", flush=True)

        if test_mode or not has_next_page(soup):
            break

        page += 1
        time.sleep(DELAY_SECONDS)

    return all_tools


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    test_mode = '--test' in sys.argv
    categories = TEST_CATEGORIES if test_mode else CATEGORIES

    print()
    print('╔══════════════════════════════════════════════════════╗')
    print('║     IntelliGrid · TAAFT (TheresAnAIForThat) Crawler  ║')
    print('╚══════════════════════════════════════════════════════╝')
    print(f'  Mode:        {"TEST (1 category, 1 page)" if test_mode else "FULL"}')
    print(f'  Categories:  {len(categories)}')
    print(f'  Delay:       {DELAY_SECONDS}s between requests')
    print(f'  Output:      {OUTPUT_FILE}')
    print()

    # Ensure exports directory exists
    os.makedirs(EXPORTS_DIR, exist_ok=True)

    all_tools = []

    for i, category in enumerate(categories, 1):
        if is_shutting_down:
            break

        print(f'[{i}/{len(categories)}] Category: {category}', flush=True)
        tools = crawl_category(category, test_mode=test_mode)
        all_tools.extend(tools)
        print(f'    Category total: {len(tools)} tools\n', flush=True)

        # Emit structured progress line for JobManager.js to parse
        print(f'PROGRESS:processed:{i}:total:{len(categories)}', flush=True)

        if i < len(categories):
            time.sleep(DELAY_SECONDS)

    if not all_tools:
        print('⚠️  No tools collected. The site HTML structure may have changed.')
        print('   Try opening https://theresanaiforthat.com/category/writing/?p=1')
        print('   in your browser and inspect the HTML element structure.')
        return

    # Deduplicate
    df = pd.DataFrame(all_tools)
    total_before = len(df)
    df = df.drop_duplicates(subset=['official_url'], keep='first')
    df = df.drop_duplicates(subset=['name'], keep='first')
    total_after = len(df)

    # Save
    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')

    print('═' * 56)
    print('✅ TAAFT crawl complete')
    print(f'   Total rows collected:  {total_before}')
    print(f'   After deduplication:   {total_after}')
    print(f'   Saved to:              {OUTPUT_FILE}')
    print()
    print('📌 Next step:')
    print('   cd Backend')
    print('   node src/scripts/importAll.js')
    print('═' * 56)
    print()


if __name__ == '__main__':
    main()
