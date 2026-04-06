"""
crawl_aixploria.py
==================
Crawls AIXploria.com alphabetical listings (A–Z) and extracts AI tool data.

AIXploria is the largest free AI tools directory (~15,000+ tools).
It organises tools alphabetically — we crawl each letter page by page.

Output: Backend/exports/aixploria_tools.csv
CSV Columns: name, short_description, official_url, category, pricing, source_url, source_site

Usage:
  Full crawl:  python crawl_aixploria.py
  Test (A only): python crawl_aixploria.py --test

Rate limiting: 2.0 second delay between every request (respectful crawling).
"""

import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
import re
import sys
import os
import string
from urllib.parse import urlparse

# ── Config ────────────────────────────────────────────────────────────────────
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
}

DELAY_SECONDS = 2.0
SOURCE_SITE = 'aixploria'

# Primary listing URL for AIXploria's ultimate AI list
BASE_LISTING_URL = 'https://www.aixploria.com/en/ultimate-list-ai'

# Resolve output path relative to this script's location
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
EXPORTS_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, '../../../../exports'))
OUTPUT_FILE = os.path.join(EXPORTS_DIR, 'aixploria_tools.csv')
PROGRESS_FILE = os.path.join(EXPORTS_DIR, 'aixploria_progress.txt')

# ── Helpers ───────────────────────────────────────────────────────────────────

def is_external_url(url, base_domain='aixploria.com'):
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


def crawl_letter_page(letter, page=1, session=None):
    """
    Crawl a single letter page (and page number) from AIXploria.
    Returns (list_of_tools, has_next_page).
    """
    req = session or requests

    if page == 1:
        url = f"{BASE_LISTING_URL}/?lettre={letter}"
    else:
        url = f"{BASE_LISTING_URL}/?lettre={letter}&paged={page}"

    try:
        response = req.get(url, headers=HEADERS, timeout=20)
        if response.status_code == 404:
            return [], False
        if response.status_code != 200:
            print(f"      ⚠️  HTTP {response.status_code} for {url}")
            return [], False

        soup = BeautifulSoup(response.content, 'html.parser')

        tools = []

        # AIXploria listing: typically article elements or divs with tool data
        # Try multiple selector strategies
        item_selectors = [
            ('article', None),
            ('div', re.compile(r'ai[-_]?tool|tool[-_]?item|listing[-_]?item|entry', re.I)),
            ('li', re.compile(r'tool|item|entry', re.I)),
        ]

        items = []
        for tag, cls_pattern in item_selectors:
            if cls_pattern:
                found = soup.find_all(tag, class_=cls_pattern)
            else:
                found = soup.find_all(tag)
            # Filter out very large containers (likely wrappers)
            found = [el for el in found if len(el.get_text()) < 2000]
            if found:
                items = found
                break

        seen_names = set()

        for item in items:
            try:
                # ── Name ──────────────────────────────────────────────────
                name_el = (
                    item.find(['h2', 'h3', 'h4', 'h5']) or
                    item.find(class_=re.compile(r'name|title|heading', re.I)) or
                    item.find('strong')
                )
                name = clean_text(name_el.get_text()) if name_el else ''
                if not name or len(name) > 150 or name in seen_names:
                    continue
                seen_names.add(name)

                # ── Official URL ───────────────────────────────────────────
                official_url = ''
                for a_tag in item.find_all('a', href=True):
                    href = a_tag.get('href', '').strip()
                    if href.startswith('http') and is_external_url(href):
                        official_url = href.rstrip('/')
                        break

                if not official_url:
                    continue

                # ── Source URL (the AIXploria listing page) ────────────────
                source_url = url

                # ── Description ────────────────────────────────────────────
                desc_el = (
                    item.find('p') or
                    item.find(class_=re.compile(r'desc|summary|excerpt|content', re.I))
                )
                description = clean_text(desc_el.get_text()) if desc_el else ''

                # ── Category ───────────────────────────────────────────────
                cat_el = item.find(class_=re.compile(r'cat|tag|badge|label', re.I))
                category = clean_text(cat_el.get_text()) if cat_el else 'General'
                if len(category) > 60:
                    category = 'General'

                tools.append({
                    'name': name,
                    'short_description': description,
                    'official_url': official_url,
                    'category': category,
                    'pricing': 'Unknown',
                    'source_url': source_url,
                    'source_site': SOURCE_SITE,
                })

            except Exception:
                continue

        # ── Detect next page ───────────────────────────────────────────────
        has_next = bool(
            soup.find('a', string=re.compile(r'next|›|»|→', re.I)) or
            soup.find('a', class_=re.compile(r'next|pagination[-_]?next', re.I))
        )

        return tools, has_next

    except requests.RequestException as e:
        print(f"      ⚠️  Request error: {e}")
        return [], False
    except Exception as e:
        print(f"      ⚠️  Parse error: {e}")
        return [], False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    test_mode = '--test' in sys.argv
    letters = ['A'] if test_mode else list(string.ascii_uppercase)

    print()
    print('╔══════════════════════════════════════════════════════╗')
    print('║      IntelliGrid · AIXploria.com Crawler             ║')
    print('╚══════════════════════════════════════════════════════╝')
    print(f'  Mode:        {"TEST (letter A only)" if test_mode else "FULL (A–Z)"}')
    print(f'  Letters:     {len(letters)}')
    print(f'  Delay:       {DELAY_SECONDS}s between requests')
    print(f'  Output:      {OUTPUT_FILE}')
    print()

    # Ensure exports directory exists
    os.makedirs(EXPORTS_DIR, exist_ok=True)

    finished_letters = set()
    if os.path.exists(PROGRESS_FILE) and not test_mode:
        with open(PROGRESS_FILE, 'r') as f:
            finished_letters = set(f.read().splitlines())

    # Use a requests.Session for connection reuse
    session = requests.Session()
    session.headers.update(HEADERS)

    total_collected_this_run = 0

    for i, letter in enumerate(letters, 1):
        if letter in finished_letters:
            print(f'[{i}/{len(letters)}] Letter: {letter} (already completed \u2705)')
            continue

        print(f'[{i}/{len(letters)}] Letter: {letter}')
        page = 1
        letter_total = 0

        while True:
            tools, has_next = crawl_letter_page(letter, page, session=session)
            letter_total += len(tools)
            total_collected_this_run += len(tools)

            if tools:
                page_df = pd.DataFrame(tools)
                page_df.to_csv(OUTPUT_FILE, mode='a', header=not os.path.exists(OUTPUT_FILE), index=False, encoding='utf-8-sig')

            print(f'    \u2192 Page {page}: {len(tools)} tools found (letter total: {letter_total})')

            if not tools or not has_next:
                break

            page += 1
            time.sleep(DELAY_SECONDS)

        print(f'    \u2705 Letter {letter} done: {letter_total} tools\n')
        if not test_mode:
            with open(PROGRESS_FILE, 'a') as f:
                f.write(letter + '\n')

        if i < len(letters):
            time.sleep(DELAY_SECONDS)

    if total_collected_this_run == 0 and not finished_letters:
        print('\u26a0\ufe0f  No tools collected. The site HTML structure may have changed.')
        print('   Try opening https://www.aixploria.com/en/ultimate-list-ai/?lettre=A')
        print('   in your browser and inspect the HTML element structure.')
        return

    # Deduplicate final CSV
    if os.path.exists(OUTPUT_FILE):
        df = pd.read_csv(OUTPUT_FILE)
        total_before = len(df)
        df = df.drop_duplicates(subset=['official_url'], keep='first')
        df = df.drop_duplicates(subset=['name'], keep='first')
        total_after = len(df)
        df.to_csv(OUTPUT_FILE, index=False, encoding='utf-8-sig')
    else:
        total_before = 0
        total_after = 0

    print('\u2550' * 56)
    print('\u2705 AIXploria crawl complete')
    print(f'   Total rows in CSV:     {total_before}')
    print(f'   After deduplication:   {total_after}')
    print(f'   Saved to:              {OUTPUT_FILE}')
    print()
    print('📌 Next step:')
    print('   cd Backend')
    print('   node src/scripts/competitorImport.js ./exports/aixploria_tools.csv')
    print('═' * 56)
    print()


if __name__ == '__main__':
    main()
