# 🔄 AUTO-UPDATING AI TOOL DATABASE: BEST PRACTICES

**Objective:** Maintain a fresh, high-quality database of AI tools with minimal manual effort.

---

## 🏗️ THE AUTOMATION STRATEGY

Instead of directly inserting scraped tools into your live website, follow this **Ingest \> Enrich \> Verify \> Publish** pipeline.

### 1. The Pipeline Architecture

```mermaid
graph LR
    Sources[Sources: Product Hunt, GitHub, Reddit] -->|Scraper Script| Ingest[Ingestion Layer]
    Ingest -->|Raw Data| LLM[AI Enrichment (OpenAI/Anthropic)]
    LLM -->|Clean Data| DB[(Database - 'Pending' Status)]
    DB -->|Admin Dashboard| Review[Manual Review]
    Review -->|Approve| Live[Live Database ('Active')]
    Live -->|Sync| Algolia[Search Index]
```

---

## 🚀 PHASE 1: INTELLIGENT INGESTION

Your current scripts (`updateToolsEnhanced.js`) are a great start. Here is how to upgrade them:

### ✅ Best Practice 1: "Pending" by Default
**Never** auto-publish scraped content. It leads to spam, broken links, and non-tools (like news articles) polluting your high-quality directory.

**Implementation:**
Modify your scraper to save new tools with `status: 'pending'` instead of `active`.
```javascript
const newTool = new Tool({
    ...toolData,
    status: 'pending', // <--- CRITICAL CHANGE
    slug
})
```

### ✅ Best Practice 2: AI Agent Classification
Scrapers are dumb. They don't know if a tool is "Image Generator" or "Coding Assistant".

**Implementation:**
Add an **AI Processing Step** before saving. Pass the scraped title/description to OpenAI API (gpt-3.5-turbo is cheap and fast).

**Prompt Example:**
> "Analyze this item: '{Title} - {Description}'.
> 1. Is this actually an AI software tool? (Yes/No)
> 2. Which category fits best? (Text, Image, Code, Audio, Video, 3D, Business)
> 3. What is the pricing model? (Free, Paid, Freemium)
> Return JSON."

### ✅ Best Practice 3: Deduplication
Simple name matching isn't enough. "Chat GPT" and "ChatGPT" are the same.

**Implementation:**
- Normalize names (lowercase, remove spaces/dashes) before comparing.
- Check domain names (e.g., `openai.com` exists?) to catch duplicates with different names.

---

## 🛠️ PHASE 2: ADMIN REVIEW WORKFLOW

You need a fast interface to process the "Pending" queue.

### ✅ Best Practice 4: The "Tinder for Tools" UI
In your Admin Dashboard, create a **Review Queue** page.
- **Show:** Name, Description, Source URL.
- **Actions:**
  - ✅ **Approve:** Sets status to `active`, syncs to Algolia.
  - ❌ **Reject:** Deletes document.
  - ✏️ **Edit:** Fix typo then Approve.

**Efficiency Tip:** With AI classification (Phase 1), 90% of tools will categorised correctly. You just need to click "Approve".

---

## ⚙️ PHASE 3: SCHEDULING & INFRASTRUCTURE

### ✅ Best Practice 5: Run on Schedule (Cron)
Don't run scripts manually. Automate it.

**Option A: GitHub Actions (Free & Easy)**
Create `.github/workflows/daily-scrape.yml`:
```yaml
name: Daily Tool Scrape
on:
  schedule:
    - cron: '0 8 * * *' # Every day at 8am
jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: node Backend/scripts/updateToolsEnhanced.js
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
```

**Option B: Railway Cron**
Configure a separate service in Railway to run the script command `node scripts/autoUpdateTools.js` on a schedule.

---

## 📈 SUMMARY OF RECOMMENDED UPGRADES

| Current State | Recommended Upgrade | Benefit |
| :--- | :--- | :--- |
| Direct Scrape → Live Site | Scrape → **Pending** → **Admin Review** → Live | Zero spam/garbage on live site. |
| Hardcoded Generic Categories | **AI-Powered Classification** (OpenAI API) | Accurate categorization automatically. |
| Manual Run | **GitHub Actions / Cron Job** | Set and forget. Daily fresh content. |
| Basic Deduplication | **Domain-based Deduplication** | Prevents re-adding existing tools. |

---

### 🏁 IMMEDIATE ACTION PLAN

1.  **Modify `updateToolsEnhanced.js`** to set `status: 'pending'`.
2.  **Add `isTool: Boolean`** logic to your schema to filter out news/blogs.
3.  **Set up GitHub Action** to run the script daily.
4.  **Build "Pending Tools" view** in your Admin Panel.
