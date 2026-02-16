# 🎨 UI/UX DESIGN SPEC: TOOL DETAILS PAGE ENHANCEMENT

**Objective:** Transform the functional tool detail page into a high-conversion, visually stunning product showcase.

---

## 1. LAYOUT STRUCTURE

### A. The Hero Header (Glassmorphism)
**Background:** Dark abstract gradient or blurred version of tool logo.
**Elements:**
- **Logo Area:** 128x128px Floating Card with shadow.
- **Title Block:**
  - H1: Tool Name (Bold, 4xl)
  - Badges: `Featured` (Gold), `Verified` (Blue), `Trending` (Orange)
  - Subtitle: The "One-line description" in gray-300.
- **Primary Action (Floating Right):**
  - Large "Visit Website" button with `ExternalLink` icon.
  - Gradient border or glow effect.

### B. The "Media Showcase"
**Location:** Immediately below Header.
**Design:**
- **Main Preview:** A "Browser Window" frame container wrapping the `metadata.logo` or `og:image`.
- **Reasoning:** Makes the tool look like a real software product, not just text.

---

## 2. MAIN CONTENT AREA (2-Column Grid)

### Left Column (66% Width) - "The Information"
**1. About Section:**
- Enhanced typography (Inter font).
- **Pros & Cons** (Future AI feature) placeholder structure.

**2. Key Features Grid:**
- 2x2 Grid of icons representing features (e.g., "Text-to-Image", "Real-time").
- *Implementation:* Map `category` to specific icons until real feature data is scraped.

**3. "Similar Tools" Carousel:**
- "More like {ToolName}..."
- Horizontal scroll of 3-4 cards from the same Category.

### Right Column (33% Width) - "The Decision Engine"
**1. Sticky Action Card:**
- **Pricing:** Large display (e.g., "Free / $20/mo").
- **Visit Button:** Primary CTA.
- **Bookmark:** "Save to Favorites" (Heart icon).
- **Share:** Copy Link / Twitter share.

**2. Tool Stats:**
- Rating (Stars)
- Date Added
- Views count
- Category (Clickable)

---

## 3. COMPONENT IMPLEMENTATION GUIDE

### New Components Needed:

1.  `ToolHero.jsx`
    - Handles the glass background and layout.
2.  `ToolScreenshots.jsx`
    - Displays the main image in a "Device Frame".
3.  `SimilarTools.jsx`
    - Fetches 3 tools `where category == current.category AND _id != current._id`.
4.  `ShareButton.jsx`
    - Simple clipboard copy functionality.

### Data Requirements:

- **Similar Tools:** Need a new API endpoint or filter logic in `ToolDetailsPage`.
- **Screenshots:** Currently using `metadata.logo` as the main image. Future: scrape multiple images.

---

## 4. VISUAL REFERENCE (ASCII Mockup)

```text
+---------------------------------------------------------------+
|  [ BACK ]                                                     |
|                                                               |
|  +-------+  Title of Tool   [TRENDING]                        |
|  | LOGO  |  "The best AI for X..."                            |
|  +-------+  ⭐⭐⭐⭐⭐ (4.5)                                   |
|                                         [ VISIT WEBSITE > ]   |
+---------------------------------------------------------------+
|                                                               |
|  +---------------------------------------------------------+  |
|  |                                                         |  |
|  |             BROWSER FRAME / PREVIEW IMAGE               |  |
|  |                                                         |  |
|  +---------------------------------------------------------+  |
|                                                               |
+---------------------------+-----------------------------------+
|  ABOUT                    |  PRICING                          |
|  -----------              |  +-----------------------------+  |
|  Full details here...     |  |  FREE / PAID                |  |
|                           |  |  [ Visit ]  [ Save ]        |  |
|  KEY FEATURES             |  +-----------------------------+  |
|  [x] Feature A            |                                   |
|  [x] Feature B            |  JUMP TO CATEGORY                 |
|                           |  ( > ) Text Generators            |
|  SIMILAR TOOLS            |                                   |
|  [Card] [Card] [Card]     |  TAGS                             |
|                           |  #AI #Chat #GPT                   |
+---------------------------+-----------------------------------+
```
