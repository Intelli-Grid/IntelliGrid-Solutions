# 🛒 E-COMMERCE STYLE TOOL PAGE DESIGN SPEC

**Objective:** Redesign the tool page to follow standard "Product Detail Page" (PDP) UX patterns, increasing trust and click-through rates.

---

## 1. LAYOUT GRID (Standard E-commerce)

The top section is a **50/50 Split** (on desktop).

### A. LEFT COLUMN: Media Gallery (The "Product Image")
- **Main View:** Large, high-resolution preview of the tool (Browser Frame style).
- **Thumbnails:** (Future) Row of small screenshots below the main image.
- **Visual Style:** Clean, high-quality container. No distractions.

### B. RIGHT COLUMN: Product Info (The "Buy Box")
This is the decision-making center.
1.  **Breadcrumbs:** `Home > Tools > Video Generators > Sora`
2.  **Header:**
    -   **Title:** H1, Bold, Clean.
    -   **Badges:** verified, trending (pill styles).
3.  **Social Proof:**
    -   ⭐⭐⭐⭐⭐ (4.8) • 120 Reviews • 5k Views
4.  **Pricing (The "Price Tag"):**
    -   Large Typography (e.g., "Free" or "$20/mo").
5.  **Description:**
    -   2-3 lines summarizing value.
6.  **Action Area (Sticky on mobile):**
    -   **Primary Button:** "Visit Website" (Full width, distinctive color).
    -   **Secondary Button:** "Save to Favorites" (Heart icon).
    -   **Share:** Simple icon.
7.  **Meta:** Categories, Tags, Updated Date.

---

## 2. SECONDARY CONTENT (Full Width or 2/3 Split)

Located *below* the main fold.

### A. Tabs Navigation
- **Overview:** Full description.
- **Features:** Checklist of capabilities.
- **Reviews:** User feedback.
- **Alternatives:** Quick comparison.

### B. "Related Products" (Carousel)
- "Customers also viewed..." section at the very bottom.

---

## 3. UI THEME ADAPTATION

- **Background:** Dark/Clean (Gray-900).
- **Cards:** Subtle borders (`border-white/10`), minimal background (`bg-white/5`).
- **Typography:** Inter/San Francisco (Professional, readable).
- **Colors:**
    -   *Primary Action:* Brand Purple/Blue Gradient.
    -   *Text:* White (High contrast).
    -   *Muted:* Gray-400 for labels.

---

## 4. ASCII MOCKUP

```text
+-------------------------------------------------------------+
|  Home > Category > Tool Name                                |
|                                                             |
|  +------------------------+  +---------------------------+  |
|  |                        |  | [Badge] [Trending]        |  |
|  |                        |  |                           |  |
|  |                        |  | Tool Name                 |  |
|  |     MEDIA/IMAGE        |  | ⭐⭐⭐⭐⭐ (4.5)           |  |
|  |     (Browser Frame)    |  |                           |  |
|  |                        |  | FREE / $29 mo             |  |
|  |                        |  |                           |  |
|  |                        |  | Description text...       |  |
|  +------------------------+  |                           |  |
|                              | [ VISIT WEBSITE ]  [ ♥ ]  |  |
|                              |                           |  |
|                              | Category: Video           |  |
|                              +---------------------------+  |
+-------------------------------------------------------------+
|  [ Overview ] [ Features ] [ Reviews ]                      |
|  -------------------------------------                      |
|  Detailed description text goes here...                     |
|  ...                                                        |
+-------------------------------------------------------------+
|  YOU MIGHT ALSO LIKE                                        |
|  [Card] [Card] [Card] [Card]                                |
+-------------------------------------------------------------+
```
