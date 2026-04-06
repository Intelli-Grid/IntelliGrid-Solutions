"""
crawl_futuretools.py
====================
Crawls FutureTools.io and extracts AI tool listings to CSV.

FutureTools uses category-based pages with pagination.
Also captures the "saves count" (social proof) into the saves_count column —
which maps to the taaftSavesCount field in your MongoDB Tool model.

Output: Backend/exports/futuretools_tools.csv
CSV Columns: name, short_description, official_url, category, pricing, source_url, source_site, saves_count

Usage:
  Full crawl:  python crawl_futuretools.py
  Test only:   python crawl_futuretools.py --test

Rate limiting: 2.5 second delay between every request (respectful crawling).
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import sys
import os
from urllib.parse import urljoin, urlparse

# ── Config ────────────────────────────────────────────────────────────────────
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
}

DELAY_SECONDS = 2.5
BASE_URL = 'https://www.futuretools.io'
SOURCE_SITE = 'futuretools'

# Resolve output path relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../../exports'))
OUTPUT_FILE = os.path.join(EXPORTS_DIR, 'futuretools_tools.csv')

# FutureTools category slugs
CATEGORIES = [
    'text',
    'image',
    'video',
    'music',
    'code',
    'marketing',
    'social-media',
    'productivity',
    'research',
    'design',
    'fun-and-humor',
    'gaming',
    '3d',
    'avatars-and-characters',
    'finance',
    'customer-service',
    'education',
    'healthcare',
    'legal',
    'sales',
]

# In test mode, only crawl first category
TEST_CATEGORIES = ['text']

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_external_url(url, base_domain='futuretools.io'):
    """Return True if this URL points to an external site (the actual tool)."""
    try:
        parsed = urlparse(url)
        return bool(parsed.netloc) and base_domain not in parsed.netloc
    except Exception:
        return False


def clean_text(text, max_len=500):
    """Strip whitespace and truncate."""
    if not text:
        return ''
    return ' '.join(text.split())[:max_len]


def normalize_pricing(raw):
    """Map raw pricing text to standard enum values."""
    p = (raw or '').lower().strip()
    if not p:
        return 'Unknown'
    if 'freemium' in p:
        return 'Freemium'
    if 'free' in p and ('paid' in p or '+' in p):
        return 'Freemium'
    if 'free' in p:
        return 'Free'
    if 'trial' in p or 'try it' in p:
        return 'Trial'
    if 'paid' in p or 'premium' in p or '$' in p:
        return 'Paid'
    return 'Unknown'


def parse_saves_count(raw):
    """
    Parse FutureTools saves count string to integer.
    '1.2k saves' → 1200, '842 saves' → 842, '' → 0
    """
    if not raw:
        return 0
    raw = raw.lower().strip()
    match = re.search(r'([\d,.]+)\s*k', raw)
    if match:
        try:
            return int(float(match.group(1).replace(',', '')) * 1000)
        except ValueError:
            return 0
    match = re.search(r'[\d,]+', raw)
    if match:
        try:
            return int(match.group(0).replace(',', ''))
        except ValueError:
            return 0
    return 0


def extract_tools_from_page(soup, category_slug):
    """
    Extract all tool cards from a FutureTools listing page.
    Returns list of tool dicts.
    """
    tools = []
    category_name = category_slug.replace('-', ' ').title()

    # FutureTools card selectors — multiple strategies
    card_selectors = [
        ('div', re.compile(r'tool[-_]?card|ToolCard|grid[-_]?item|tool[-_]?item', re.I)),
        ('article', None),
        ('li', re.compile(r'tool|item', re.I)),
    ]

    cards = []
    for tag, cls_pattern in card_selectors:
        if cls_pattern:
            found = soup.find_all(tag, class_=cls_pattern)
        else:
            found = soup.find_all(tag)
        found = [el for el in found if 50 < len(el.get_text()) < 3000]
        if len(found) > 2:
            cards = found
            break

    # Fallback: find all tool links and use their parent
    if not cards:
        seen_parents = set()
        for a in soup.find_all('a', href=re.compile(r'/tool[s]?/', re.I)):
            parent = a.parent
            pid = id(parent)
            if pid not in seen_parents and parent.name not in ['html', 'body', 'nav']:
                seen_parents.add(pid)
                cards.append(parent)

    seen_names = set()

    for card in cards:
        try:
            # ── Name ──────────────────────────────────────────────────────
            name_el = (
                card.find(['h2', 'h3', 'h4']) or
                card.find(class_=re.compile(r'name|title|heading|label', re.I)) or
                card.find('strong')
            )
            name = clean_text(name_el.get_text()) if name_el else ''
            if not name or len(name) > 120 or name in seen_names:
                continue
            seen_names.add(name)

            # ── Source URL (FutureTools page URL for this tool) ────────────
            source_link = card.find('a', href=re.compile(r'/tool[s]?/', re.I))
            source_url = urljoin(BASE_URL, source_link['href']) if source_link else ''

            # ── Official URL ───────────────────────────────────────────────
            official_url = ''
            for a_tag in card.find_all('a', href=True):
                href = a_tag.get('href', '').strip()
                if href.startswith('http') and is_external_url(href):
                    official_url = href.rstrip('/')
                    break

            if not official_url and not source_url:
                continue

            # ── Description ────────────────────────────────────────────────
            desc_el = (
                card.find('p') or
                card.find(class_=re.compile(r'desc|summary|excerpt|text', re.I))
            )
            description = clean_text(desc_el.get_text()) if desc_el else ''

            # ── Pricing ─────────────────────────────────────────────────────
            price_el = card.find(class_=re.compile(r'pric|badge|tag|chip|label', re.I))
            raw_pricing = clean_text(price_el.get_text()) if price_el else ''
            pricing = normalize_pricing(raw_pricing)

            # ── Saves count (FutureTools social proof) ─────────────────────
            saves_el = card.find(string=re.compile(r'save', re.I))
            saves_count = parse_saves_count(saves_el) if saves_el else 0
            if saves_count == 0:
                saves_el2 = card.find(class_=re.compile(r'save|bookmark|count', re.I))
                if saves_el2:
                    saves_count = parse_saves_count(saves_el2.get_text())

            tools.append({
                'name': name,
                'short_description': description,
                'official_url': official_url,
                'category': category_name,
                'pricing': pricing,
                'source_url': source_url,
                'source_site': SOURCE_SITE,
                'saves_count': saves_count,
            })

        except Exception:
            continue

    return tools


def get_max_pages(soup):
    """Detect the last page number from pagination."""
    pagination = soup.find(class_=re.compile(r'pagination|pager', re.I))
    if not pagination:
        return 1
    numbers = []
    for tag in pagination.find_all(string=re.compile(r'^\d+$')):
        try:
            numbers.append(int(tag.strip()))
        except ValueError:
            continue
    return max(numbers) if numbers else 1


def crawl_category(category_slug, test_mode=False):
    """Crawl all pages of a single FutureTools category."""
    all_tools = []
    page = 1
    max_pages = None

    while True:
        url = f"{BASE_URL}/tools?tags={category_slug}&page={page}"
        # Try alternate URL pattern
        if page == 1:
            alt_url = f"{BASE_URL}/tools?tags={category_slug}"
        else:
            alt_url = url

        print(f"    → {alt_url}")

        try:
            response = requests.get(alt_url, headers=HEADERS, timeout=20)
            if response.status_code == 404:
                print(f"    ⚠️  404 — trying alternate URL pattern")
                # Try category as path
                url2 = f"{BASE_URL}/category/{category_slug}?page={page}"
                response = requests.get(url2, headers=HEADERS, timeout=20)
                if response.status_code == 404:
                    break
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"    ⚠️  Request failed: {e}")
            break

        soup = BeautifulSoup(response.content, 'html.parser')
        tools = extract_tools_from_page(soup, category_slug)

        if not tools and page > 1:
            print(f"    ℹ️  No tools on page {page} — stopping")
            break

        all_tools.extend(tools)

        if max_pages is None:
            max_pages = get_max_pages(soup)

        print(f"    ✅ Page {page}/{max_pages}: {len(tools)} tools found ({len(all_tools)} total)")

        if test_mode or page >= max_pages:
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
    print('║      IntelliGrid · FutureTools.io Crawler            ║')
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
        print(f'[{i}/{len(categories)}] Category: {category}')
        tools = crawl_category(category, test_mode=test_mode)
        all_tools.extend(tools)
        print(f'    Category total: {len(tools)} tools\n')
        if i < len(categories):
            time.sleep(DELAY_SECONDS)

    if not all_tools:
        print('⚠️  No tools collected. The site HTML structure may have changed.')
        print('   Try opening https://www.futuretools.io/tools?tags=text')
        print('   in your browser and inspect the HTML element structure.')
        return

    # Deduplicate
    df = pd.DataFrame(all_tools)
    total_before = len(df)
    df = df.drop_duplicates(subset=['official_url'], keep='first')
    df = df.drop_duplicates(subset=['name'], keep='first')
    total_after = len(df)

    # Save (utf-8-sig for Excel BOM compatibility)
    df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')

    print('═' * 56)
    print('✅ FutureTools crawl complete')
    print(f'   Total rows collected:  {total_before}')
    print(f'   After deduplication:   {total_after}')
    print(f'   Saved to:              {OUTPUT_FILE}')
    print()
    print('📌 Next step:')
    print('   cd Backend')
    print('   node src/scripts/competitorImport.js ./exports/futuretools_tools.csv')
    print('═' * 56)
    print()


if __name__ == '__main__':
    main()
