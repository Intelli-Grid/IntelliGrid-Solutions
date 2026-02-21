# IntelliGrid — Master Reference & Operations Guide
> Generated: 2026-02-21 · Version: 3.0 · Status: **🟢 LIVE IN PRODUCTION**
> 
> **Live URL:** https://www.intelligrid.online  
> **Backend API:** https://intelligrid-solutions-production.up.railway.app  
> **GitHub:** https://github.com/Intelli-Grid/IntelliGrid-Solutions

---

## TABLE OF CONTENTS

1. [Platform Overview](#1-platform-overview)
2. [What's Fully Completed](#2-whats-fully-completed)
3. [How to Operate — Blog System](#3-how-to-operate--blog-system)
4. [How to Operate — Admin Dashboard](#4-how-to-operate--admin-dashboard)
5. [How to Operate — User Dashboard](#5-how-to-operate--user-dashboard)
6. [Complete Feature Breakdown](#6-complete-feature-breakdown)
7. [Backend Architecture](#7-backend-architecture)
8. [Payment & Subscription System](#8-payment--subscription-system)
9. [Known Issues & Edge Cases](#9-known-issues--edge-cases)
10. [Future Roadmap (Planned Features)](#10-future-roadmap-planned-features)
11. [Deployment & Environment Guide](#11-deployment--environment-guide)

---

## 1. Platform Overview

**IntelliGrid** is a subscription-based AI tools discovery and comparison platform. Users can browse, search, compare, favourite, review, and submit 3,690+ AI tools across 19+ categories. Revenue is generated through paid subscription tiers (Basic / Premium / Enterprise) that unlock premium features.

### Core Value Proposition
- **For Casual Users (Free):** Browse + search all tools, save 10 favourites, basic comparisons
- **For Power Users (Paid):** Unlimited favourites, full comparison verdicts, comparison exports, priority support
- **For Tool Makers:** Submit their AI tool for review and listing (community-driven growth)
- **For Admins:** Full CMS for tools, blog, coupons, user management, revenue analytics

### Platform Architecture (High Level)
```
User Browser
    ↓ HTTPS
Vercel (React + Vite SPA)
    ↓ /api/v1/* (Axios with Clerk JWT)
Railway (Express.js API)
    ↓
MongoDB Atlas ← → Redis Cache (Upstash)
    ↓
Algolia (Search Index)  +  Brevo (Email)  +  Clerk (Auth)
    ↓
PayPal / Cashfree (Payments)
```

---

## 2. What's Fully Completed

### ✅ Frontend Pages (21 Pages)

| Page | Route | Status | Notes |
|---|---|---|---|
| Home | `/` | ✅ Complete | Hero, trending tools, featured tools, categories grid, newsletter |
| Tools Directory | `/tools` | ✅ Complete | Paginated, filtered by category/pricing/rating |
| Tool Details | `/tools/:slug` | ✅ Complete | E-commerce layout, media gallery, pricing card, reviews, comparisons |
| Search | `/search` | ✅ Complete | Algolia-powered live search with filters |
| Category | `/category/:slug` | ✅ Complete | Tools filtered by category with counts |
| Compare | `/compare/:slugs` | ✅ Complete | Side-by-side comparison. Verdict feature gated to paid users |
| Collection Detail | `/collections/:id` | ✅ Complete | Public curated tool lists |
| Pricing | `/pricing` | ✅ Complete | Plan cards, coupon code input, PayPal + Cashfree payment buttons |
| **Blog Listing** | `/blog` | ✅ Complete | Category filter, featured post, paginated grid, empty state |
| **Blog Post** | `/blog/:slug` | ✅ Complete | Full article, author info, share button, related posts sidebar, tags, CTA |
| **Submit a Tool** | `/submit` | ✅ Complete | Community tool submission form with email confirmation |
| Dashboard | `/dashboard` | ✅ Complete | Overview, My Submissions tab, Profile tab, Privacy/GDPR tab |
| Admin Panel | `/admin` | ✅ Complete | 11 tabs: Overview, Tools, Claims, Submissions, Blog, Coupons, Users, Reviews, Payments, Analytics, Settings |
| Payment Success | `/payment/success` | ✅ Complete | Post-payment confirmation with subscription details |
| Payment Cancel | `/payment/cancel` | ✅ Complete | Graceful cancel with retry option |
| FAQ | `/faq` | ✅ Complete | Accordion FAQ |
| Privacy Policy | `/privacy-policy` | ✅ Complete | Full GDPR-compliant policy |
| Terms of Service | `/terms-of-service` | ✅ Complete | Full legal terms |
| Refund Policy | `/refund-policy` | ✅ Complete | Refund policy page |
| Unsubscribe | `/unsubscribe` | ✅ Complete | Newsletter opt-out with token-based verification |
| 404 Not Found | `*` | ✅ Complete | Branded not-found page |

### ✅ Backend API (15 Route Groups)

| Route Group | Status | Key Functions |
|---|---|---|
| `/api/v1/tools` | ✅ Complete | Full CRUD, Algolia sync, Redis cache, trending/featured |
| `/api/v1/categories` | ✅ Complete | CRUD, toolCount denormalization |
| `/api/v1/user` | ✅ Complete | Profile, stats, favourites (with paid tier limit) |
| `/api/v1/auth` | ✅ Complete | Clerk JWT verification, webhook handler |
| `/api/v1/reviews` | ✅ Complete | Create/update/delete, helpful votes, rating recalculation |
| `/api/v1/payment` | ✅ Complete | PayPal + Cashfree order flow, webhook verification |
| `/api/v1/analytics` | ✅ Complete | Revenue metrics, user growth, tool analytics |
| `/api/v1/gdpr` | ✅ Complete | Data export (JSON download), data deletion |
| `/api/v1/admin` | ✅ Complete | Full entity management, user admin, stats dashboard |
| `/api/v1/collections` | ✅ Complete | User-curated lists, public/private toggle |
| `/api/v1/newsletter` | ✅ Complete | Subscribe/unsubscribe with Brevo integration |
| `/api/v1/submissions` | ✅ Complete | Submit tool, view own submissions, admin review workflow |
| `/api/v1/coupons` | ✅ Complete | Validate at checkout, admin CRUD, usage tracking |
| `/api/v1/blog` | ✅ Complete | Public posts, admin CMS (create/publish/edit/delete) |
| `/sitemap.xml` + `/robots.txt` | ✅ Complete | Dynamic sitemap with tools + categories + blog posts |

### ✅ Infrastructure & Third-Party

| System | Status | Details |
|---|---|---|
| Authentication | ✅ Live | Clerk (`pk_live_*`) — JWT verified on every protected route |
| Search | ✅ Live | Algolia — 3,690+ tools indexed |
| Payments | ✅ Live | PayPal `live` mode + Cashfree `PROD` mode |
| Email | ✅ Live | Brevo — 8 automated email types |
| Error Monitoring | ✅ Live | Sentry — both frontend and backend |
| Analytics | ✅ Live | Google Analytics 4 (GA only fires after cookie consent) |
| SEO | ✅ Live | Dynamic sitemap, robots.txt, Open Graph, JSON-LD schema |
| GDPR | ✅ Live | Cookie consent, data export, data deletion |
| Rate Limiting | ✅ Live | 100 req / 15 min per IP on all `/api/` routes |
| Cache | ✅ Live | Redis on Upstash — sitemap cache (1hr), tool responses |
| Auto-Deploy | ✅ Live | Push to `main` → Vercel (frontend) + Railway (backend) deploys simultaneously |

---

## 3. How to Operate — Blog System

The blog is a **full CMS** built into the Admin Panel. No external CMS is needed.

### 3.1 Writing Your First Blog Post (Admin)

1. **Navigate to:** `https://www.intelligrid.online/admin`
2. **Click** the **"Blog"** tab in the left sidebar
3. **Click** the **"New Post"** button (top right)
4. **Fill in the form:**

| Field | Required | Notes |
|---|---|---|
| **Title** | ✅ Yes | Keep it under 70 chars for SEO |
| **Slug** | Auto-generated | URL-friendly version of title. You can customize (e.g., `best-ai-writing-tools-2025`) |
| **Excerpt** | Recommended | 1-2 sentence summary. Shows on blog listing cards |
| **Content** | ✅ Yes | Full HTML supported. Use `<h2>`, `<p>`, `<ul>`, `<img>`, `<code>` tags |
| **Category** | Recommended | e.g., `AI Guides`, `Tool Reviews`, `Industry News` |
| **Tags** | Optional | Comma-separated: `writing, productivity, GPT` |
| **Featured Image URL** | Optional | Paste a public image URL (hosted on Cloudinary, imgur, etc.) |
| **Status** | Required | `draft` or `published` |

5. **Click Save.** If status = `published`, the post immediately appears at `/blog`

### 3.2 Writing Content (HTML Guide)

The blog content field accepts **raw HTML**. Here's a quick reference:

```html
<!-- Main heading (don't use h1 — that's the title) -->
<h2>Section Title</h2>
<h3>Sub-section</h3>

<!-- Paragraphs -->
<p>Your text here with <strong>bold</strong> and <em>italic</em> words.</p>

<!-- Lists -->
<ul>
  <li>Feature one</li>
  <li>Feature two</li>
</ul>

<!-- Ordered list -->
<ol>
  <li>Step one</li>
  <li>Step two</li>
</ol>

<!-- Links -->
<a href="https://example.com">Link text</a>

<!-- Image (use a hosted URL) -->
<img src="https://your-image-url.com/photo.jpg" alt="Description" />

<!-- Code block -->
<pre><code>const x = 1</code></pre>

<!-- Inline code -->
<code>npm install</code>

<!-- Blockquote -->
<blockquote>This is a quote.</blockquote>
```

### 3.3 Managing Existing Posts

In the Admin → Blog tab, each post row has:
- **Publish / Unpublish toggle** — instantly makes post live or hidden
- **Edit button** — opens the same form pre-filled
- **Delete button** — permanent, with confirmation prompt

### 3.4 Public Blog URLs

| What | URL |
|---|---|
| Blog listing | `https://www.intelligrid.online/blog` |
| Individual post | `https://www.intelligrid.online/blog/{slug}` |
| Example | `https://www.intelligrid.online/blog/top-10-ai-tools-for-writers-2025` |

### 3.5 Blog SEO (Automatic)

Every published post automatically gets:
- Dynamic `<title>` tag: `"{Post Title} — IntelliGrid Blog"`
- Meta description from `excerpt`
- Canonical URL
- Included in `/sitemap.xml` with `publishedAt` lastmod date
- Open Graph tags for social sharing

---

## 4. How to Operate — Admin Dashboard

### 4.1 Accessing the Admin Panel

**Who can access:** Users with role `ADMIN`, `SUPERADMIN`, or `MODERATOR` in Clerk `publicMetadata.role`

**URL:** `https://www.intelligrid.online/admin`

To grant admin access to a user:
1. Go to your **Clerk Dashboard** → Users → find the user
2. Click the user → **Public Metadata** → Edit
3. Set: `{ "role": "ADMIN" }`
4. Save. The user can now access `/admin` immediately.

### 4.2 Admin Tabs — Full Guide

#### 📊 Overview Tab
- Total tools, users, reviews, revenue at a glance
- Recent activity feed
- Quick action shortcuts

#### 🔧 Tools Tab
- **List all tools** with status (`active` / `pending` / `inactive`)
- **Edit any tool** — modify name, description, URLs, category, pricing, features, images
- **Approve pending tools** — tools submitted by community admins
- **Delete tools** — removes from DB + Algolia index automatically
- **Filter** by status, category, or search by name

#### 🛡️ Claims Tab
- View **tool ownership claim requests** from businesses
- See claimant's name, email, proof details
- **Approve** — marks tool as claimed, sends notification
- **Reject** — dismisses claim with reason
- **Send Invitation** — manually send claim verification link

#### 📥 Submissions Tab
- Community tool submissions from `/submit` page
- Each submission shows: tool name, URL, description, submitter email/name, date
- **Approve** → creates a new Tool record from the submission data
- **Reject** → marks as rejected; reviewer notes are stored and shown to submitter in their dashboard
- **Pending** badge count shows on tab

#### ✍️ Blog Tab *(New)*
- Create, edit, publish/unpublish, delete blog posts
- See post status (Draft / Published), category, slug, views, and created date
- All changes are immediate — no rebuild required

#### 🏷️ Coupons Tab *(New)*
When creating a coupon, fill in:

| Field | Required | Notes |
|---|---|---|
| **Code** | ✅ Yes | Auto-uppercased, e.g., `SAVE20` |
| **Discount Type** | ✅ Yes | `percentage` or `fixed` ($) |
| **Discount Value** | ✅ Yes | e.g., `20` = 20% off, or `5` = $5 off |
| **Max Discount** | No | For %, cap the savings (e.g., max $15 off even at 50%) |
| **Max Uses** | No | Leave blank for unlimited |
| **Expires At** | No | Leave blank to never expire |
| **Applicable Plans** | No | Leave blank to apply to all plans |
| **Description** | No | Shown to user when coupon is applied (e.g., "Welcome discount") |

- **Activate / Deactivate** toggle on each coupon row
- **Delete** permanently removes the coupon
- Users apply coupons on the `/pricing` page — works automatically

#### 👥 Users Tab
- Search users by name or email
- View subscription tier, join date, review count
- **Manage roles** — promote to admin/moderator
- **View user details** — expand to see their activity

#### ⭐ Reviews Tab
- All reviews across all tools
- **Approve / Reject** reviews (moderation queue)
- **Delete** inappropriate reviews
- Approved reviews are visible on tool detail pages

#### 💳 Payments Tab
- Transaction history: amount, gateway, status, date, user
- Filter by gateway (PayPal / Cashfree) or status
- View order IDs for reference with payment provider dashboards

#### 📈 Analytics Tab
- Revenue over time (30-day chart)
- User growth curve
- Top performing tools by views / favorites
- Subscription tier distribution

#### ⚙️ Settings Tab
- Platform configuration options
- Contact email, platform name settings

---

## 5. How to Operate — User Dashboard

### 5.1 Accessing the Dashboard

**Who can access:** Any signed-in user  
**URL:** `https://www.intelligrid.online/dashboard`

Users get to the dashboard via:
- Header → "Dashboard" link (when signed in)
- Footer → "My Dashboard" link
- After completing payment → redirect

### 5.2 Dashboard Tabs

#### 🏠 Overview Tab (Default)
Shows the user's activity summary:
- **Stats bar:** Total favourites saved, collections created, tools reviewed, subscription tier badge
- **Recent Activity:** Latest favourited tools, recent reviews written
- **Your Collections:** Quick preview of the user's lists

#### 📥 My Submissions Tab *(New)*
Shows all tool submissions the user has made via `/submit`:
- **Tool name, URL, short description**
- **Status badge:** 
  - 🟡 `pending` — Awaiting admin review
  - 🟢 `approved` — Tool is now live on the platform
  - 🔴 `rejected` — Not approved; shows reviewer's notes so user knows why
- **Submit Another Tool** CTA button → links to `/submit`
- **Empty state:** Friendly message with a button to submit their first tool

#### 👤 Profile Tab
- Edit display name, bio, website
- View email (from Clerk, not editable here)
- Link to Clerk account settings for password changes

#### 🔒 Privacy Tab
- **Data Summary:** See all data IntelliGrid holds about the user
- **Export My Data:** Downloads a JSON file with all user data (GDPR compliant)
- **Delete My Account:** Permanently deletes the DB record + Clerk account + all associated data (reviews, favourites, collections)

---

## 6. Complete Feature Breakdown

### 6.1 Tool Discovery Features

| Feature | How It Works | Access Level |
|---|---|---|
| **Browse Tools** | Paginated grid at `/tools` with sort/filter | Free |
| **Search** | Algolia instant search at `/search` | Free |
| **Category Filter** | `/category/:slug` pages, also filter on `/tools` | Free |
| **Tool Details** | `/tools/:slug` — full info, pricing, reviews, links | Free |
| **Trending Tools** | Computed from view count + recent favorites | Free |
| **Featured Tools** | Manually flagged by admin in Tool record | Free |
| **Save Favourites** | Up to 10 tools for Free, unlimited for Paid | Free (limited) |
| **Compare Tools** | `/compare/:slugs` — side-by-side feature table | Free |
| **Compare Verdict** | AI-style verdict box on comparison page | **Paid only** |
| **Export Favourites** | Download CSV of saved tools | **Paid only** |

### 6.2 Community Features

| Feature | How It Works |
|---|---|
| **Submit a Tool** | `/submit` form → email confirmation → admin review → if approved, tool goes live |
| **Write Reviews** | On any tool's detail page — requires sign-in |
| **Mark Review Helpful** | Upvote other users' reviews |
| **Create Collections** | Curated lists of tools; can be public or private |
| **Share Collections** | Public collections get a slug-based URL |

### 6.3 Blog Features

| Feature | Status | Details |
|---|---|---|
| Blog listing at `/blog` | ✅ | Category filter, featured first post, pagination |
| Individual posts at `/blog/:slug` | ✅ | Full content, author, tags, share, related posts |
| Admin blog CMS | ✅ | Full CRUD in Admin → Blog tab |
| Auto-slug generation | ✅ | Title → slug on save, customizable |
| View counter | ✅ | Each page visit increments `views` field |
| SEO per post | ✅ | Dynamic title, description, canonical, sitemap |
| Related posts | ✅ | Same-category posts shown in sidebar |

### 6.4 Payment & Subscription Features

| Feature | Status | Details |
|---|---|---|
| Free plan (default) | ✅ | All new users start here |
| Pro Monthly ($9.99) | ✅ | 30-day subscription |
| Pro Yearly ($99.99) | ✅ | 365-day subscription, saves 17% |
| Coupon codes | ✅ | Apply on pricing page; % or fixed; optional expiry + usage limit |
| PayPal checkout | ✅ | International users — live mode |
| Cashfree checkout | ✅ | Indian users (INR) — PROD mode |
| Subscription activation | ✅ | Auto-activates on payment capture / webhook |
| Renewal reminders | ✅ | Email 7 days before expiry (daily cron) |
| Subscription expiry | ✅ | Auto-downgrades to Free when endDate passes |
| Payment receipts | ✅ | Email sent on every successful payment |
| Refund policy | ✅ | Policy page at `/refund-policy` |

### 6.5 Email Automation (8 Types via Brevo)

| Trigger | Email Sent |
|---|---|
| New user signs up (Clerk webhook) | Welcome email |
| Subscription activated | Subscription confirmation |
| Payment captured | Payment receipt with amount + plan |
| 7 days before expiry (daily cron) | Renewal reminder |
| Subscription expired | Downgrade notification |
| Newsletter subscribe | Newsletter welcome |
| Newsletter unsubscribe | Unsubscribe confirmation |
| User requests data export | GDPR export email with download link |
| Tool submission received | Submission confirmation with tool details |

### 6.6 GDPR & Privacy Features

| Feature | Implementation |
|---|---|
| Cookie consent banner | Shows on first visit; GA4 only fires after acceptance |
| Privacy policy | Comprehensive page at `/privacy-policy` |
| Data export | `GET /api/v1/gdpr/export` — generates JSON of all user data |
| Account deletion | `DELETE /api/v1/gdpr/delete` — removes user from DB + Clerk |
| Newsletter opt-out | Token-based unsubscribe via `/unsubscribe?token=...` |

### 6.7 SEO Features

| Feature | Implementation |
|---|---|
| Dynamic page titles | `react-helmet-async` — every page has a unique title |
| Meta descriptions | Set per page with keywords |
| Open Graph tags | For social sharing (Facebook, Twitter, LinkedIn) |
| Canonical URLs | Prevents duplicate content penalties |
| Dynamic sitemap | `/sitemap.xml` — includes all tools, categories, blog posts, static pages |
| robots.txt | Blocks `/admin`, `/dashboard`, `/payment/` from indexing |
| JSON-LD Structured Data | `Organization` + `WebSite` with `SearchAction` in `index.html` |
| Blog post SEO | Dynamic title/description/canonical per post |

---

## 7. Backend Architecture

### 7.1 Authentication Flow
```
User signs in via Clerk (Google/Email)
    → Clerk issues JWT
    → Frontend stores session in Clerk SDK
    → On every API call: Clerk.session.getToken() → added as Bearer token
    → Backend requireAuth middleware: clerkClient.verifyToken(token)
    → Attaches req.user (from MongoDB) to the request
    → Route handlers use req.user for user-specific logic
```

### 7.2 Role Hierarchy
```
SUPERADMIN → ADMIN → MODERATOR → user (default)
```
- **user** — All authenticated users (default role)
- **MODERATOR** — Can access Admin panel; moderate reviews/claims
- **ADMIN** — Full admin panel access; manage tools, users, coupons, blog
- **SUPERADMIN** — All ADMIN capabilities + irreversible operations

Roles are set in **Clerk → User → Public Metadata → `{ "role": "ADMIN" }`**

### 7.3 Data Models Summary

| Model | Purpose | Key Fields |
|---|---|---|
| `User` | User accounts | `clerkId`, `email`, `role`, `subscription{tier, status, endDate}` |
| `Tool` | AI tool records | `name`, `slug`, `category`, `pricing`, `ratings`, `status`, `isFeatured` |
| `Category` | Tool categories | `name`, `slug`, `icon`, `toolCount` |
| `Review` | User reviews | `tool`, `user`, `rating`, `content`, `status` |
| `Favorite` | Saved tools | `user`, `tool` (10 limit for Free tier) |
| `Order` | Payment records | `user`, `amount`, `paymentGateway`, `status` |
| `Collection` | Curated lists | `user`, `name`, `tools[]`, `isPublic`, `slug` |
| `Coupon` | Discount codes | `code`, `discountType`, `discountValue`, `expiresAt`, `maxUses`, `isActive` |
| `Subscriber` | Newsletter list | `email`, `status`, `unsubscribeToken` |
| `ClaimRequest` | Tool claims | `tool`, `user`, `status`, `proof` |
| `Submission` | Tool submissions | `toolName`, `officialUrl`, `submittedBy`, `status`, `reviewNotes` |
| `BlogPost` | Blog content | `title`, `slug`, `content`, `author`, `status`, `views` |
| `WebhookLog` | Webhook dedup | `source`, `eventType`, `payload`, `status` |
| `SearchLog` | Search analytics | `query`, `results`, `user` |
| `AnalyticsEvent` | Custom events | `event`, `user`, `metadata` |

---

## 8. Payment & Subscription System

### 8.1 Checkout Flow (PayPal)
```
User clicks "Subscribe" on /pricing
    → POST /api/v1/payment/paypal/create-order { plan: 'pro_monthly' }
    → Backend creates PayPal order → returns approvalUrl
    → User redirects to PayPal.com to complete payment
    → PayPal redirects back to /payment/success?paymentId=...
    → Frontend calls POST /api/v1/payment/paypal/capture
    → Backend captures payment → calls activateSubscription()
    → User's subscription.tier set to 'Premium', endDate = +30 days
    → Payment receipt email sent
```

### 8.2 Checkout Flow (Cashfree — Indian users)
```
User clicks "Subscribe" → selects Cashfree
    → POST /api/v1/payment/cashfree/create-order { plan }
    → Backend creates Cashfree order → returns payment_link
    → User completes payment on Cashfree
    → Cashfree webhook fires → POST /api/v1/payment/cashfree/webhook
    → Webhook verified by HMAC-SHA256 → activateSubscription()
    → OR: user returns to /payment/success → POST /cashfree/verify
```

### 8.3 Coupon Usage Flow
```
User enters code on /pricing → "Apply"
    → POST /api/v1/coupons/validate { code, planId }
    → Backend checks: isActive, not expired, usedCount < maxUses, plan matches
    → Returns discount info to frontend
    → Frontend recalculates displayed price
    → Coupon code is included in payment metadata
    → On successful payment: coupon.usedCount incremented
```

### 8.4 Subscription Plans

| Plan ID | Price | Duration | DB Tier |
|---|---|---|---|
| `free` | $0 | Forever | `Free` |
| `pro_monthly` | $9.99 | 30 days | `Premium` |
| `pro_yearly` | $99.99 | 365 days | `Premium` |

---

## 9. Known Issues & Edge Cases

### 9.1 Active Issues (Need Attention)
| Issue | Severity | Description | Status |
|---|---|---|---|
| **Duplicate categories** | Medium | DB has both `'Writing'` and `'Writing & Content'` | ⚠️ Needs one-time DB migration to merge — run `db.categories.deleteOne({name: 'Writing'})` after verifying no tools reference the old one |
| **Tool pricing field** | Low | Many tools have `pricing: "Unknown"` (string) instead of structured object | Low priority data quality task — does not break anything |
| **Admin subdomain** | Low | Header links to `https://admin.intelligrid.online` but admin is at `/admin` | Either unify or set up the subdomain redirect |

### 9.2 Resolved Issues (Fixed)
| Issue | Fix Applied |
|---|---|
| **`ProtectedRoute` missing `'ADMIN'` role** | Added `'ADMIN': 4` to `ROLE_LEVELS` — users with Clerk `{ "role": "ADMIN" }` can now access `/admin` |
| **`requireAdmin` missing uppercase ADMIN** | Added `'ADMIN'` to backend `adminRoles` array in `auth.js` |
| **Submission approval crashes with validation error** | `Tool.js`: `sourceUrl` and `fullDescription` no longer required. `submissionRoutes.js`: Added `sourceUrl` fallback, `fullDescription` fallback, slug collision handling, category ObjectId lookup, pricing enum normalization |
| **Coupon discount not applied to payment** | Full pipeline wired: `PricingPage` → `paymentService` → `paymentController` (`resolveCoupon`) → `paymentService.createPayPalOrder/createCashfreeOrder` with `couponMeta` |
| **Blog posts not editable** | Added `editId` state, `handleEdit` function, and edit mode to `BlogAdminTab` in `AdminPage.jsx` |
| **Double `.data` unwrap in payment service** | `paymentService` in `index.js` now returns raw `apiClient` promise; `PricingPage` correctly reads `response?.data` |
| **`applyCoupon()` using wrong schema fields** | Fixed to use `expiresAt`, `maxUses`, `usedCount` matching actual `Coupon` schema |

### 9.3 Design Decisions to Be Aware Of
| Decision | Reason |
|---|---|
| **Blog content is raw HTML** | Flexible — but sanitization should be added before launch if user-generated blogs are ever supported |
| **Coupon now bound to order at gateway level** | ✅ Fixed — discount is applied when creating the PayPal/Cashfree order, not just shown on the frontend |
| **Free users are not blocked from `/submit`** | By design — anyone can submit a tool. The tool still goes through admin review |
| **Reviews require sign-in** | Prevents fake reviews |
| **Collection verdict feature is paid-only** | Encourage upgrades; implemented via `ProtectedFeature` component check |

### 9.3 Security Notes
| Area | Status |
|---|---|
| JWT verification on all protected routes | ✅ Active |
| Rate limiting (100 req/15 min) | ✅ Active |
| Webhook signature verification | ✅ Active (all 3 providers) |
| CORS allowed origins locked | ✅ Active |
| Blog HTML sanitization | ⚠️ Admin-only input, acceptable for now. Add DOMPurify if user-submitted content ever added |
| Input validation | ✅ Mongoose schema-level |

---

## 10. Future Roadmap (Planned Features)

### 🔴 Priority 1 — Immediate / High Value (1-4 weeks)

#### 1.1 Coupon → Payment Integration Tightening
**What:** Currently the coupon discount is shown visually but the actual payment order is still created at full price. The discount should be applied at the payment creation level.  
**How:** Pass `couponCode` in the `createPayPalOrder` / `createCashfreeOrder` API call; backend applies discount to the amount before creating the order.  
**File:** `paymentController.js`, `PricingPage.jsx`

#### 1.2 Blog Content — Rich Text Editor
**What:** Replace the raw HTML textarea in Admin → Blog with a proper rich text editor (e.g., Quill.js or TipTap).  
**Why:** Non-technical admins struggle with raw HTML.  
**How:** Install `react-quill` or `@tiptap/react`, render its output as HTML (which it already produces).

#### 1.3 Tool Submission → Auto-Populate Admin Review
**What:** When admin approves a submission, auto-create a `Tool` record pre-filled with submission data (currently admin must manually re-enter all fields).  
**File:** `submissionRoutes.js` (the `/review` endpoint)

#### 1.4 Image Upload Support
**What:** Blog posts and tool covers currently need externally hosted image URLs. Add native upload to Cloudinary/AWS S3.  
**How:** Add a `POST /api/v1/upload` route using `multer` + Cloudinary SDK; update Admin forms to have "Upload" buttons.

---

### 🟡 Priority 2 — Growth Features (1-3 months)

#### 2.1 Tool Comparison Request System
**What:** Let users "request a comparison" between two tools — adds engagement and SEO content.

#### 2.2 User-Submitted Reviews with Moderation Queue
**What:** Currently reviews are immediately visible. Add a `pending` state requiring admin approval for new reviewers.

#### 2.3 Newsletter Campaigns via Admin
**What:** Let admin compose and send newsletters to all subscribers directly from the Admin panel.  
**How:** Add `POST /api/v1/newsletter/send-campaign` with Brevo bulk send.

#### 2.4 Tool Bookmark / Reading List
**What:** A secondary list for tools users want to "check out later" (distinct from favourites).

#### 2.5 Featured Banner / Announcement System
**What:** Admin can set live announcement banners (e.g., "New: Compare 5 tools at once!") that appear site-wide for defined durations.

#### 2.6 Search Autocomplete & Suggestions
**What:** Upgrade Algolia search to show autocomplete suggestions as user types.

#### 2.7 Tool Rating Filters
**What:** Allow users to filter tools by minimum rating (e.g., "Only show 4+ stars").

---

### 🟢 Priority 3 — Platform Expansion (3-6 months)

#### 3.1 Affiliate / Referral System
**What:** Users get a unique referral link; earn credits when referrals subscribe.  
**Models:** `AffiliatePayout` model already exists in DB (pre-built placeholder).

#### 3.2 Achievements & Gamification
**What:** Unlock badges for milestones: "Submitted 5 tools", "Wrote 10 reviews", "Pro member for 1 year".  
**Model:** `Achievement` model already exists in DB (pre-built placeholder).

#### 3.3 A/B Testing Framework
**What:** Test different CTAs, pricing page layouts, etc.  
**Models:** `AbTestExposure` + `AbTestConversion` already exist in DB (pre-built placeholder).

#### 3.4 AI-Powered Tool Recommendations
**What:** Personalized "You might also like" based on user's favourites using vector similarity or Algolia's Recommend API.

#### 3.5 Tool API Access (Enterprise Tier)
**What:** Let Enterprise subscribers query IntelliGrid's tool data via API for their own apps.

#### 3.6 Multi-Language Support (i18n)
**What:** Support Hindi, Spanish, French for international growth (especially relevant for Indian user base via Cashfree).

#### 3.7 Mobile App (React Native)
**What:** Core tool discovery features as a mobile app.

#### 3.8 Tool Comparison Embed Widget
**What:** Let tool makers embed an IntelliGrid comparison widget on their own website (shows their tool vs competitors with a link back to IntelliGrid).

---

### 🔵 Priority 4 — Platform Maturity (6+ months)

#### 4.1 Tool Claiming Self-Service Portal
**What:** Full self-service flow for tool makers — claim tool, verify via DNS/email, then manage their tool listing without admin intervention.

#### 4.2 Sponsored / Featured Tool Listings
**What:** Tool makers pay to appear in "Sponsored" spots on category pages and search results.

#### 4.3 IntelliGrid Pro API
**What:** Rate-limited API for developers to build on top of the IntelliGrid tool index.

#### 4.4 Community Forums / Comments
**What:** Threaded discussions on tool pages; community Q&A for specific use cases.

#### 4.5 Data Quality Pipeline
**What:** Weekly automated checks to detect broken tool URLs, update pricing info, remove deprecated tools.

---

## 11. Deployment & Environment Guide

### 11.1 How to Deploy Changes

**Every push to `main` triggers automatic deployment:**
```bash
git add .
git commit -m "feat: your change description"
git push origin main
# → Vercel builds frontend (~2 min)
# → Railway builds backend (~3 min)
```

**To check deployment status:**
- Vercel: https://vercel.com/intelli-grid/intelligrid-solutions
- Railway: https://railway.app → your project → Deployments tab
- Backend health: https://intelligrid-solutions-production.up.railway.app/health

### 11.2 Environment Variables

#### Vercel (Frontend) — Set in Vercel Dashboard
```
VITE_API_URL           = https://intelligrid-solutions-production.up.railway.app/api/v1
VITE_API_BASE_URL      = https://intelligrid-solutions-production.up.railway.app
VITE_CLERK_PUBLISHABLE_KEY = pk_live_Y2xlcmsuaW50ZWxsaWdyaWQub25saW5lJA
VITE_ALGOLIA_APP_ID    = GFV3ZCJR86
VITE_ALGOLIA_SEARCH_KEY = 9159e189dd4cc15fc66a2f01ef4a1a05
VITE_GA_MEASUREMENT_ID = G-G9CSXJD7BS
VITE_SENTRY_DSN        = https://ea8b4be3...sentry.io/4510822667517952
VITE_ENV               = production
```

#### Railway (Backend) — Set in Railway Dashboard → Variables
```
NODE_ENV               = production
MONGODB_URI            = <Atlas connection string>
REDIS_URL              = <Redis connection string>
CLERK_SECRET_KEY       = sk_live_...
CLERK_WEBHOOK_SECRET   = whsec_...
ALGOLIA_APP_ID         = GFV3ZCJR86
ALGOLIA_ADMIN_KEY      = <admin key>
PAYPAL_MODE            = live
PAYPAL_CLIENT_ID       = <live client id>
PAYPAL_CLIENT_SECRET   = <live secret>
PAYPAL_WEBHOOK_ID      = <webhook id>
CASHFREE_ENV           = PROD
CASHFREE_APP_ID        = <prod app id>
CASHFREE_SECRET_KEY    = <prod secret>
CASHFREE_WEBHOOK_SECRET = <webhook secret>
BREVO_API_KEY          = <api key>
SENTRY_DSN             = <backend sentry dsn>
FRONTEND_URL           = https://www.intelligrid.online
```

### 11.3 Production Health Checks

```bash
# Backend health
curl https://intelligrid-solutions-production.up.railway.app/health

# API index
curl https://intelligrid-solutions-production.up.railway.app/api/v1

# Sitemap (should list your live domain)
curl https://www.intelligrid.online/sitemap.xml

# robots.txt
curl https://www.intelligrid.online/robots.txt
```

### 11.4 How to Grant Admin Access

1. Go to https://dashboard.clerk.com
2. Navigate to **Users** → find the target user
3. Click user → **Public Metadata** → Edit JSON
4. Set value to: `{ "role": "ADMIN" }`
5. Save. No restart needed — takes effect on next page load.

---

## Summary Table — Current Completion Status

| Area | Status | Completion |
|---|---|---|
| Frontend Pages | ✅ All 21 pages built | 100% |
| Backend Routes | ✅ All 15 route groups live | 100% |
| Authentication (Clerk) | ✅ Live JWT, RBAC, webhooks | 100% |
| Search (Algolia) | ✅ 3,690+ tools indexed | 100% |
| Payments (PayPal + Cashfree) | ✅ Live mode both gateways | 100% |
| Coupon System | ✅ Admin CRUD + pricing page validation | 95% (payment amount binding pending) |
| Blog CMS | ✅ Admin create/publish, public viewing | 100% |
| Tool Submissions | ✅ Public form + admin review workflow | 100% |
| Email Automation | ✅ 9 email types via Brevo | 100% |
| GDPR / Privacy | ✅ Export, delete, consent | 100% |
| SEO / Sitemap | ✅ Dynamic, includes blog posts | 100% |
| User Dashboard | ✅ 4 tabs including My Submissions | 100% |
| Admin Dashboard | ✅ 11 tabs, full management | 100% |
| Error Monitoring | ✅ Sentry frontend + backend | 100% |
| Analytics | ✅ GA4 + custom events | 100% |
| Affiliate System | ⬜ Model exists, not wired | 0% |
| Achievements | ⬜ Model exists, not wired | 0% |
| A/B Testing | ⬜ Models exist, not wired | 0% |
| Rich Text Blog Editor | ⬜ Not implemented | 0% |
| Image Upload (native) | ⬜ Not implemented | 0% |
| Newsletter Campaigns | ⬜ Not implemented | 0% |

---

*Document maintained by Antigravity AI · IntelliGrid · Last Updated: 2026-02-21*
