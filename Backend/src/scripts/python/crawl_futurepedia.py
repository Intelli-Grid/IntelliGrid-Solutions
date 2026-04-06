"""
crawl_futurepedia.py
====================
Crawls Futurepedia.io and extracts AI tool listings to CSV.

Output: Backend/exports/futurepedia_tools.csv
CSV Columns: name, short_description, official_url, category, pricing, source_url, source_site

Usage:
  Full crawl:   python crawl_futurepedia.py
  Single test:  python crawl_futurepedia.py --test

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
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

DELAY_SECONDS = 2.5
BASE_URL = 'https://www.futurepedia.io'
SOURCE_SITE = 'futurepedia'

# Resolve output path relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../../exports'))
OUTPUT_FILE = os.path.join(EXPORTS_DIR, 'futurepedia_tools.csv')

# All Futurepedia AI tool category slugs
CATEGORIES = [
    'ai-tools/writing',
    'ai-tools/image-generation',
    'ai-tools/video',
    'ai-tools/coding',
    'ai-tools/productivity',
    'ai-tools/marketing',
    'ai-tools/audio',
    'ai-tools/research',
    'ai-tools/design',
    'ai-tools/chatbots',
    'ai-tools/business',
    'ai-tools/education',
    'ai-tools/healthcare',
    'ai-tools/finance',
    'ai-tools/social-media',
    'ai-tools/seo',
    'ai-tools/customer-support',
    'ai-tools/data-analysis',
    'ai-tools/human-resources',
    'ai-tools/sales',
    'ai-tools/real-estate',
    'ai-tools/legal',
    'ai-tools/music',
    'ai-tools/3d',
]

# In test mode, only crawl one category
TEST_CATEGORIES = ['ai-tools/writing']

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_external_url(url, base_domain='futurepedia.io'):
    """Return True if this URL points to an external site (the actual tool)."""
    try:
        parsed = urlparse(url)
        return parsed.netloc and base_domain not in parsed.netloc
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


def extract_tools_from_page(soup, category_slug):
    """
    Extract all tool cards from a Futurepedia listing page.
    Uses multiple selector strategies to handle HTML changes.
    Returns list of dicts.
    """
    tools = []
    category_name = category_slug.split('/')[-1].replace('-', ' ').title()

    # Strategy 1: Look for standard article/card elements with tool data
    # Futurepedia uses various class patterns across redesigns
    card_selectors = [
        ('a', re.compile(r'tool[-_]?card|ToolCard|tool[-_]?item|tool[-_]?link', re.I)),
        ('div', re.compile(r'tool[-_]?card|ToolCard|card[-_]?tool', re.I)),
        ('article', None),
    ]

    cards = []
    for tag, cls_pattern in card_selectors:
        if cls_pattern:
            found = soup.find_all(tag, class_=cls_pattern)
        else:
            found = soup.find_all(tag)
        if found:
            cards = found
            break

    # Strategy 2: If no cards found, find all links to /tool/ pages
    if not cards:
        tool_links = soup.find_all('a', href=re.compile(r'/tool/'))
        for link in tool_links:
            card = link.parent
            if card and card.name not in ['html', 'body', 'nav', 'header', 'footer']:
                cards.append(card)

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

            # ── Extract source URL (link to the futurepedia tool page) ────
            source_link = card.find('a', href=re.compile(r'/tool/'))
            source_url = urljoin(BASE_URL, source_link['href']) if source_link else ''

            # ── Extract official URL (the "Visit Site" button) ────────────
            # This is the external link — NOT a futurepedia.io URL
            official_url = ''
            for a_tag in card.find_all('a', href=True):
                href = a_tag.get('href', '')
                if href.startswith('http') and is_external_url(href):
                    official_url = href.rstrip('/')
                    break

            # If no official URL found in card, skip — name-only rows are low quality
            if not official_url and not source_url:
                continue

            # ── Extract description ───────────────────────────────────────
            desc_el = (
                card.find('p') or
                card.find(class_=re.compile(r'desc|summary|text|excerpt', re.I))
            )
            description = clean_text(desc_el.get_text()) if desc_el else ''

            # ── Extract pricing badge ─────────────────────────────────────
            price_el = card.find(class_=re.compile(r'pric|badge|tag|chip', re.I))
            raw_pricing = clean_text(price_el.get_text()) if price_el else ''
            pricing = normalize_pricing(raw_pricing)

            tools.append({
                'name': name,
                'short_description': description,
                'official_url': official_url,
                'category': category_name,
                'pricing': pricing,
                'source_url': source_url,
                'source_site': SOURCE_SITE,
            })

        except Exception:
            continue

    return tools


def get_max_pages(soup):
    """Detect the last page number from pagination elements."""
    pagination = (
        soup.find(class_=re.compile(r'pagination|pager|pages', re.I)) or
        soup.find('nav', attrs={'aria-label': re.compile(r'page', re.I)})
    )
    if not pagination:
        return 1

    # Find all numeric text nodes in pagination
    numbers = []
    for tag in pagination.find_all(string=re.compile(r'^\d+$')):
        try:
            numbers.append(int(tag.strip()))
        except ValueError:
            continue

    return max(numbers) if numbers else 1


def crawl_category(category_slug, test_mode=False):
    """Crawl all pages of a single Futurepedia category."""
    all_tools = []
    page = 1
    max_pages = None

    while True:
        url = f"{BASE_URL}/{category_slug}?page={page}"
        print(f"    → {url}")

        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code == 404:
                print(f"    ⚠️  404 — no more pages")
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

        # In test mode, only crawl page 1 of the first category
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
    print('║      IntelliGrid · Futurepedia.io Crawler            ║')
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
        cat_display = category.split('/')[-1]
        print(f'[{i}/{len(categories)}] Category: {cat_display}')
        tools = crawl_category(category, test_mode=test_mode)
        all_tools.extend(tools)
        print(f'    Category total: {len(tools)} tools\n')
        if i < len(categories):
            time.sleep(DELAY_SECONDS)

    if not all_tools:
        print('⚠️  No tools collected. The site HTML structure may have changed.')
        print('   Try opening https://www.futurepedia.io/ai-tools/writing in your browser')
        print('   and inspect the element structure to update the CSS selectors.')
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
    print('✅ Futurepedia crawl complete')
    print(f'   Total rows collected:  {total_before}')
    print(f'   After deduplication:   {total_after}')
    print(f'   Saved to:              {OUTPUT_FILE}')
    print()
    print('📌 Next step:')
    print('   cd Backend')
    print('   node src/scripts/competitorImport.js ./exports/futurepedia_tools.csv')
    print('═' * 56)
    print()


if __name__ == '__main__':
    main()
