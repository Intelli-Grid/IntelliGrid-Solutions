# IntelliGrid: Management Architecture Strategy
## How to Run Your Website + AI Growth Agent Like a Professional — Without Chaos

> **The core question answered upfront:** Neither fully merged nor fully separate. The professional answer is **Logical Separation within Physical Proximity** — one login, one codebase, three clearly isolated workspaces, each with a distinct purpose and audience. Here's exactly how, why, and how to build it on your existing Vercel + Railway stack.

---

## Table of Contents

1. [The Decision: Why Neither Extreme Works](#1-the-decision-why-neither-extreme-works)
2. [The Professional Pattern: Unified Hub with Separated Workspaces](#2-the-professional-pattern-unified-hub-with-separated-workspaces)
3. [Your Current Infrastructure & How It Maps](#3-your-current-infrastructure--how-it-maps)
4. [The Three Workspace Architecture — Deep Spec](#4-the-three-workspace-architecture--deep-spec)
5. [Subdomain Strategy & Routing Architecture](#5-subdomain-strategy--routing-architecture)
6. [Single Sign-On Across All Workspaces](#6-single-sign-on-across-all-workspaces)
7. [The Monorepo Structure](#7-the-monorepo-structure)
8. [Backend Service Separation on Railway](#8-backend-service-separation-on-railway)
9. [Cognitive Load Design — The Most Overlooked Factor](#9-cognitive-load-design--the-most-overlooked-factor)
10. [The Notification & Alert Architecture](#10-the-notification--alert-architecture)
11. [Deployment Pipeline Strategy](#11-deployment-pipeline-strategy)
12. [Scaling Path: What Changes as You Grow](#12-scaling-path-what-changes-as-you-grow)
13. [What Professionals Get Wrong (And How to Avoid It)](#13-what-professionals-get-wrong-and-how-to-avoid-it)
14. [Implementation Priority Order](#14-implementation-priority-order)
15. [Final Architecture Diagram](#15-final-architecture-diagram)

---

## 1. The Decision: Why Neither Extreme Works

Before giving you the answer, understand why both obvious options fail at your stage.

---

### Option A: Everything in One Admin Dashboard (The Tempting Choice)

**What it looks like:** One dashboard at `intelligrid.com/admin` with tabs for platform management, AI agent control, content queues, revenue, user management, system health — all together.

**Why founders choose this:** Feels simpler. One place to look. Faster to build initially.

**Why it breaks down:**

**The cognitive overload problem.** When you open your admin to approve a flagged user review, you don't want to see your AI agent's content queue, performance graphs, and API rate limits. These are completely different mental modes — one is reactive (fixing something), the other is strategic (growing something). Mixing them forces constant context-switching, which degrades decision quality on both.

**The team access problem.** When you eventually bring in a content moderator or VA to help manage the platform, you now have to give them access to a dashboard that also shows your revenue data, your growth agent's intelligence, and your system internals. You'd have to build a second, stripped-down view anyway.

**The deployment coupling problem.** If your AI agent dashboard needs a major update (new analytics module, new content queue UI), deploying it risks breaking the admin interface your live platform depends on for day-to-day operations. Coupled deployments mean coupled risk.

**The audit trail problem.** When something goes wrong — and it will — you need to know: was this a platform issue or an agent issue? A merged dashboard makes that diagnosis harder because everything shares the same interface and event log.

---

### Option B: Completely Separate Applications (The Overcorrection)

**What it looks like:** Three entirely separate React apps, three separate backends, three separate deployments, three separate logins.

**Why some teams do this:** Maximum isolation. True separation of concerns. What large enterprises do.

**Why it's wrong for IntelliGrid right now:**

**The login fatigue problem.** You'd be logging into three different apps multiple times a day. Different sessions, different tokens, different password management. At your scale, this is pure friction with zero benefit.

**The engineering overhead problem.** Three separate codebases means three separate CI/CD pipelines, three sets of dependencies to maintain, three places to update shared components (like your design system, your auth logic, your API client). You'd spend more time maintaining infrastructure than building product.

**The data duplication problem.** The agent dashboard needs to show user counts (from platform data). The admin needs to show content performance (from agent data). With fully separate systems, you're now syncing data between two completely independent backends — that's an entire engineering problem that doesn't need to exist.

**The overkill problem.** This architecture is what Notion, Linear, or Vercel uses — companies with 50+ engineers. You're a founding team. The overhead will kill your velocity.

---

### The Right Mental Model

Think about how Stripe manages this. They have:
- `dashboard.stripe.com` — merchant account management (their "admin")
- `stripe.com/radar` — fraud intelligence tool (their "agent equivalent")
- `stripe.com/billing` — subscription management

Same company. Same login. Same underlying auth. But **completely separate workspaces** with different URLs, different nav structures, different color schemes, different purposes. You switch between them intentionally, not accidentally.

That's the model. **Logical separation. Physical proximity. Single identity.**

---

## 2. The Professional Pattern: Unified Hub with Separated Workspaces

The architecture used by professional SaaS teams at your stage:

```
ONE LOGIN (Clerk)
    │
    ├── intelligrid.com              ← User-facing product
    ├── admin.intelligrid.com        ← Platform operations workspace  
    └── agent.intelligrid.com        ← Growth intelligence workspace
```

**One codebase** (monorepo with three apps)
**One auth system** (Clerk, session spans all subdomains)
**One backend** on Railway (with logical service separation)
**Three distinct workspaces** with no UI overlap

### Why This Works

**Mental mode clarity.** When you navigate to `agent.intelligrid.com`, your brain is in "growth mode." When you're at `admin.intelligrid.com`, you're in "operations mode." The URL itself is a context signal. This sounds small but has a massive effect on decision quality and focus.

**Access control precision.** You can give a VA access to `admin.intelligrid.com` only, without ever exposing `agent.intelligrid.com`. The subdomains become natural permission boundaries.

**Deployment independence.** You can update the agent workspace without touching the admin workspace. They deploy from the same repo but are independent Vercel projects — a deploy to one cannot break the other.

**Shared infrastructure efficiency.** They share Clerk auth, MongoDB, Redis, and the Railway backend. No data duplication, no sync issues, no redundant infrastructure costs.

**Professional appearance.** When you eventually bring on a team member or investor and show them how you run the platform, having `admin.intelligrid.com` and `agent.intelligrid.com` as distinct professional tools signals operational maturity.

---

## 3. Your Current Infrastructure & How It Maps

Here's exactly how your existing stack maps to this architecture — and what needs to change (very little):

```
CURRENT STACK                      HOW IT MAPS
─────────────────────────────────────────────────────────────────────

Frontend: Vercel                   → Becomes THREE Vercel projects
  intelligrid-app (main site)        intelligrid-app      (unchanged)
                                     intelligrid-admin    (new project)
                                     intelligrid-agent    (new project)

Backend: Railway                   → ONE Railway project, TWO services
  Node.js + Express                  api-server (existing, unchanged)
                                     agent-worker (new Railway service)

Database: MongoDB                  → UNCHANGED (shared, same cluster)
  (same cluster, new collections     + new agent collections added
   for agent data)

Cache: Redis                       → UNCHANGED (shared)
  (existing instance)                + new Bull queue data for agent

Auth: Clerk                        → UNCHANGED, but:
  (existing integration)             + subdomain cookie config added
                                     + role metadata expanded

Email: Brevo                       → UNCHANGED (already integrated)
  (existing integration)             + agent uses it for newsletters
```

### What You Actually Need to Build (Net New)

| Component | Effort | Where |
|---|---|---|
| `admin.intelligrid.com` Vercel project | Medium — new React app, existing backend routes | Vercel |
| `agent.intelligrid.com` Vercel project | Large — new React app, new backend routes | Vercel |
| `agent-worker` Railway service | Large — new Node.js service | Railway |
| Clerk subdomain session config | Small — config change | Clerk dashboard |
| MongoDB new collections | Small — schema additions | MongoDB Atlas |
| Subdomain DNS config | Trivial — 3 CNAME records | Your DNS provider |

**Nothing in your existing `intelligrid-app` or `api-server` needs to be torn down or significantly changed.** You're adding, not replacing.

---

## 4. The Three Workspace Architecture — Deep Spec

### Workspace 1: The Product (`intelligrid.com`)
**Purpose:** User-facing experience — finding, comparing, and managing AI tools
**Users:** All registered users, anonymous visitors
**Owns:** Tool discovery, search, reviews, favorites, collections, Pro subscription
**Does NOT contain:** Any admin controls, any agent controls, any backend health data

This workspace is already built. It doesn't change.

---

### Workspace 2: Platform Operations (`admin.intelligrid.com`)
**Purpose:** Managing the platform's health, content quality, users, and revenue
**Users:** SUPERADMIN, MODERATOR
**Mental mode:** Reactive — responding to what's happening on the platform

**What it contains:**

**Section: Overview**
The first thing you see when you open admin. A clean status board — not a chart-heavy dashboard, a *status board*. At a glance: is everything healthy? Are there urgent tasks? Are key numbers moving in the right direction?

```
PLATFORM STATUS                                    Last updated: 2 min ago

URGENT (3)                     TODAY
├── 4 tools pending approval   Users:        +12 new registrations
├── 2 reviews flagged          Revenue:      ₹4,450 / $53.40
└── 1 failed payment           Active Pro:   147 subscribers

SYSTEM                         PLATFORM HEALTH
├── API:      ✅ 98ms avg      Tools in DB:     3,692
├── MongoDB:  ✅ Connected     Pending approval: 4
├── Redis:    ✅ Hit rate 94%  Avg review score: 4.2★
└── Sentry:   0 errors today  Search results:   ✅ Algolia synced
```

This is a *status board*, not a metrics dashboard. You look at it, see if anything needs action, act, and move on. It is not a place to spend 20 minutes analyzing charts. Charts live in the agent workspace.

**Section: Tool Queue**
Every user-submitted tool, sorted by submission date. One table. Each row has: tool name, category, submitter, date, and three action buttons: Approve, Reject, Request Changes. Bulk actions available. Filters by category and status. Nothing else.

**Section: Review Moderation**
Flagged user reviews. Same philosophy: one table, clear actions, fast processing. Flag reason shown. One click to approve, delete, or warn user. No charts, no analysis — just a queue to clear.

**Section: User Management**
Search by email or name. View user profile, subscription status, recent activity, submitted tools, reviews written. Actions: upgrade/downgrade subscription manually, suspend, ban, reset password link. Log of all actions taken on each user.

**Section: Revenue**
Simple financial summary. Not a full analytics suite — just what matters for operations: current MRR, new subscribers today/this week/this month, failed payments (requiring action), upcoming renewals. One table of recent transactions. A button to view full Stripe/PayPal dashboard for anything deeper.

**Section: System Health**
MongoDB, Redis, Railway API latency, Sentry error feed, Clerk authentication status, Algolia index status. This is for diagnosing problems, not monitoring growth. When something breaks, this is where you look first.

**Section: Access Log**
Every attempt to access admin or agent routes by unauthorized users. Timestamp, user ID, route attempted, outcome. This is your security monitor.

---

### Workspace 3: Growth Intelligence (`agent.intelligrid.com`)
**Purpose:** Running, monitoring, and learning from the AI growth agent
**Users:** SUPERADMIN, TRUSTED_OPERATOR
**Mental mode:** Proactive — directing what's going to happen for IntelliGrid's growth

This workspace is where all agent functionality lives. Covered in full in the previous blueprint document — the key addition here is how it sits *separately* from admin while sharing the same underlying data.

**Critical distinction from Admin:** The agent workspace is about the *future* — what content is being created, what's being planned, what's going to post. The admin workspace is about the *present* — what needs attention right now on the live platform.

---

### The Navigation Relationship Between Workspaces

On `admin.intelligrid.com`, a small persistent element in the top-right corner (only visible to SUPERADMIN):

```
[← Product]  [Admin]  [→ Agent]     🔔 3 alerts    [Your Name ▼]
```

Simple workspace switcher. One click to move between the three workspaces. The active workspace is highlighted. This is how Stripe, Linear, and Notion handle multi-workspace navigation — it's always visible but never dominant.

The switcher is **invisible to MODERATOR role** — they only see the Admin workspace, so there's no confusion about where they are or what they have access to.

---

## 5. Subdomain Strategy & Routing Architecture

### DNS Configuration (3 records to add)

In your DNS provider (wherever you manage intelligrid.com):

```
Type    Name     Value                          TTL
──────────────────────────────────────────────────────
CNAME   admin    cname.vercel-dns.com           Auto
CNAME   agent    cname.vercel-dns.com           Auto
A       @        76.76.21.21 (Vercel IP)        Auto   ← already exists
```

### Vercel Project Configuration

Three separate Vercel projects, each pointing to a different subdirectory of your monorepo:

```
Project: intelligrid-app
  Domain: intelligrid.com
  Root Directory: apps/web
  Build Command: vite build
  
Project: intelligrid-admin  
  Domain: admin.intelligrid.com
  Root Directory: apps/admin
  Build Command: vite build
  
Project: intelligrid-agent
  Domain: agent.intelligrid.com
  Root Directory: apps/agent
  Build Command: vite build
```

### Frontend Routing Within Each App

Since each app is a standalone Vite+React project, there's no route collision. Each app has its own `router.jsx`:

```javascript
// apps/admin/src/router.jsx
const adminRoutes = [
  { path: '/', element: <AdminOverview /> },
  { path: '/tools', element: <ToolQueue /> },
  { path: '/reviews', element: <ReviewModeration /> },
  { path: '/users', element: <UserManagement /> },
  { path: '/revenue', element: <RevenueView /> },
  { path: '/system', element: <SystemHealth /> },
  { path: '/access-logs', element: <AccessLog /> },
];

// apps/agent/src/router.jsx  
const agentRoutes = [
  { path: '/', element: <AgentOverview /> },
  { path: '/queue', element: <ContentQueue /> },
  { path: '/research', element: <ResearchFeed /> },
  { path: '/performance', element: <PerformanceDashboard /> },
  { path: '/config', element: <AgentConfig /> },
  { path: '/logs', element: <AuditLog /> },
];
```

No collision. No shared routing logic to maintain. Each app is independently deployable.

---

## 6. Single Sign-On Across All Workspaces

This is the linchpin of the architecture. One Clerk login that works across all three subdomains.

### Clerk Configuration for Subdomain Sessions

In your Clerk Dashboard → Sessions → Cookie settings:

```
Cookie Domain: .intelligrid.com    ← Note the leading dot
```

This single setting makes Clerk's session cookie valid across:
- `intelligrid.com`
- `admin.intelligrid.com`
- `agent.intelligrid.com`

No separate logins. No token passing between apps. When you log in at `intelligrid.com`, you're authenticated everywhere.

### How It Works in Practice

```
User logs into intelligrid.com
    │
    ▼
Clerk sets cookie on .intelligrid.com domain
    │
    ▼
User navigates to admin.intelligrid.com
    │
    ▼
Clerk middleware reads the cookie (same domain, same session)
    │
    ├── Role check: SUPERADMIN → Load Admin Dashboard
    ├── Role check: MODERATOR → Load Admin Dashboard (limited sections)
    └── Role check: USER → Redirect to intelligrid.com/dashboard
```

### Session Security

Each workspace app independently validates the role on every page load and every API call. A valid Clerk session is not enough — the role in `publicMetadata` must match what that workspace requires.

```javascript
// Shared auth hook used in both admin and agent apps
// packages/auth/useWorkspaceAuth.js

export const useWorkspaceAuth = (requiredRole) => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      // Not logged in — redirect to main login
      window.location.href = 'https://intelligrid.com/login';
      return;
    }
    
    const role = user.publicMetadata?.role;
    const roleLevel = { SUPERADMIN: 4, TRUSTED_OPERATOR: 3, MODERATOR: 2, USER: 1 };
    
    if ((roleLevel[role] || 0) < (roleLevel[requiredRole] || 99)) {
      // Logged in but wrong role — silent redirect to product
      window.location.href = 'https://intelligrid.com/dashboard';
      return;
    }
  }, [user, isLoaded, requiredRole]);
  
  return { user, role: user?.publicMetadata?.role, isAuthorized: true };
};
```

---

## 7. The Monorepo Structure

This is how you keep everything in one codebase without everything becoming entangled.

```
intelligrid/                          ← Your Git repository root
│
├── apps/
│   ├── web/                          ← intelligrid.com (existing product)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── ...
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   ├── admin/                        ← admin.intelligrid.com (NEW)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Overview.jsx
│   │   │   │   ├── ToolQueue.jsx
│   │   │   │   ├── Reviews.jsx
│   │   │   │   ├── Users.jsx
│   │   │   │   ├── Revenue.jsx
│   │   │   │   └── SystemHealth.jsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── router.jsx
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   └── agent/                        ← agent.intelligrid.com (NEW)
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Overview.jsx
│       │   │   ├── ContentQueue.jsx
│       │   │   ├── Research.jsx
│       │   │   ├── Performance.jsx
│       │   │   ├── Config.jsx
│       │   │   └── AuditLog.jsx
│       │   ├── components/
│       │   ├── hooks/
│       │   └── router.jsx
│       ├── vite.config.js
│       └── package.json
│
├── packages/                         ← Shared code (the DRY principle)
│   ├── auth/                         ← Shared Clerk auth hooks
│   │   ├── useWorkspaceAuth.js
│   │   ├── useRole.js
│   │   └── package.json
│   │
│   ├── api-client/                   ← Shared API client for all apps
│   │   ├── admin.js                  ← API calls to /api/v1/admin/*
│   │   ├── agent.js                  ← API calls to /api/v1/agent/*
│   │   ├── user.js                   ← API calls to /api/v1/user/*
│   │   └── package.json
│   │
│   ├── ui/                           ← Shared design components
│   │   ├── WorkspaceSwitcher.jsx     ← The [Admin] [Agent] nav element
│   │   ├── StatusBadge.jsx
│   │   ├── DataTable.jsx
│   │   └── package.json
│   │
│   └── config/                       ← Shared constants
│       ├── roles.js
│       ├── routes.js
│       └── package.json
│
├── services/                         ← Backend (Railway)
│   ├── api/                          ← Existing Express API server
│   │   ├── routes/
│   │   │   ├── v1/
│   │   │   │   ├── admin/            ← Admin API routes (existing)
│   │   │   │   ├── agent/            ← Agent API routes (NEW)
│   │   │   │   └── user/             ← User API routes (existing)
│   │   │   └── ...
│   │   └── ...
│   │
│   └── agent-worker/                 ← NEW: Agent background service
│       ├── modules/
│       │   ├── research/
│       │   ├── planner/
│       │   ├── writers/
│       │   ├── quality/
│       │   ├── scheduler/
│       │   ├── publisher/
│       │   └── analytics/
│       ├── jobs/                     ← Cron job definitions
│       │   ├── dailyResearch.js
│       │   ├── contentGeneration.js
│       │   └── analyticsCollection.js
│       └── index.js                  ← Worker entry point
│
├── package.json                      ← Root package.json (pnpm workspace)
└── pnpm-workspace.yaml               ← Defines workspace packages
```

### Why pnpm Workspaces

`pnpm` (or `npm workspaces` / `turborepo`) lets you:
- Share code in `packages/` across all apps without copy-pasting
- Run all apps with a single command from the root: `pnpm dev`
- Update a shared component once and have it reflected in all three apps
- Keep the monorepo efficient — no duplicate `node_modules`

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

---

## 8. Backend Service Separation on Railway

This is the most critical technical decision: **the agent-worker must be a separate Railway service from the API server.**

### Why They Must Be Separate Railway Services

**The fundamental problem with Vercel + long-running jobs:** Vercel is serverless — functions time out after 10–60 seconds. The AI agent needs to run processes for minutes at a time (content generation, API calls, analytics collection). This means the agent cannot live in any Vercel function.

**The fundamental problem with mixing agent and API in one Railway service:** Your API server handles user requests — it must be fast, always available, and focused on serving HTTP requests. The agent worker handles long-running background jobs — it consumes significant CPU/memory during generation runs and can tolerate brief unavailability without affecting users. Mixing them means an agent crash takes down your user-facing API, and a spike in user traffic starves the agent.

**The professional solution: Two Railway services, same Railway project.**

```
Railway Project: intelligrid-backend
    │
    ├── Service: api-server
    │   ├── Purpose: Serve HTTP requests to all frontends
    │   ├── Scaling: Auto-scale on request volume
    │   ├── Uptime: 99.9% required (user-facing)
    │   ├── Memory: 512MB–1GB
    │   ├── Entry: services/api/index.js
    │   └── Environment: PORT, MONGODB_URI, REDIS_URL, CLERK_SECRET, ...
    │
    └── Service: agent-worker
        ├── Purpose: Run background jobs (research, generate, publish)
        ├── Scaling: Fixed single instance (no need to scale)
        ├── Uptime: Can restart without user impact
        ├── Memory: 1GB–2GB (AI generation is memory-intensive)
        ├── Entry: services/agent-worker/index.js
        └── Environment: MONGODB_URI, REDIS_URL, OPENAI_API_KEY, 
                          TWITTER_BEARER_TOKEN, LINKEDIN_ACCESS_TOKEN, ...
```

### How They Communicate

The API server and agent worker communicate via the **shared MongoDB database and Redis queue** — not via direct HTTP calls between services. This is the professional pattern for decoupled services.

```
User action in Agent Dashboard:
"Approve content piece ID: content_abc"

    ↓

Agent Dashboard frontend → POST /api/v1/agent/content/content_abc/approve
                           (goes to API server on Railway)

    ↓

API Server:
1. Validates Clerk session and SUPERADMIN role
2. Updates MongoDB: GeneratedContent.status = 'approved'
3. Pushes job to Redis queue: { type: 'SCHEDULE_CONTENT', contentId: 'content_abc' }
4. Returns 200 OK to frontend immediately

    ↓

Agent Worker:
1. Bull queue listener picks up 'SCHEDULE_CONTENT' job from Redis
2. Reads content from MongoDB
3. Calculates optimal posting time
4. Schedules posting job in Bull queue
5. Updates MongoDB: GeneratedContent.status = 'scheduled', scheduledTime: ...

    ↓

At scheduled time:
Agent Worker posts to platform API → Updates MongoDB with results
```

The API server **never** directly calls the agent worker, and the agent worker **never** exposes HTTP endpoints to the frontend. They are decoupled through the queue and database. If one crashes, the other keeps running.

### Environment Variable Separation

This is important for security: platform API tokens (Twitter, LinkedIn, Reddit) should only exist in the agent-worker's environment, never in the API server. The API server only needs Clerk, MongoDB, Redis, and Brevo.

```
api-server environment variables:
  MONGODB_URI, REDIS_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY
  BREVO_API_KEY, ALGOLIA_APP_ID, ALGOLIA_API_KEY
  PAYPAL_CLIENT_ID, CASHFREE_APP_ID

agent-worker environment variables:
  MONGODB_URI, REDIS_URL                    ← shared infrastructure
  OPENAI_API_KEY (or ANTHROPIC_API_KEY)     ← AI generation
  TWITTER_BEARER_TOKEN, TWITTER_API_KEY     ← platform posting
  LINKEDIN_ACCESS_TOKEN                      ← platform posting
  REDDIT_CLIENT_ID, REDDIT_SECRET           ← platform posting
  BREVO_API_KEY                              ← newsletter sending
  TELEGRAM_BOT_TOKEN                         ← owner notifications
  GOOGLE_SA_KEY                              ← GA4 + Search Console
```

If the agent-worker is ever compromised (unlikely but possible), an attacker cannot access your Clerk auth, your PayPal integration, or your user data — because those keys don't exist in that service's environment.

---

## 9. Cognitive Load Design — The Most Overlooked Factor

Professional teams don't just build separate dashboards. They design each one to match the **cognitive mode** of the person using it. This is the difference between a tool you *use* and a tool you *endure*.

### Admin Dashboard: "Triage Mode"

Design principle: **Get you in and out as fast as possible.**

The admin dashboard is for reactive work. You have a problem (flagged review, pending tool, failed payment) and you need to resolve it quickly. The UI should:

- Lead with urgency: unresolved items shown first, always
- Make actions obvious and irreversible-confirmation-quick: one click to approve, two clicks for destructive actions (delete, ban)
- Use **red/amber/green status signals** — not charts. At a glance, is there a problem?
- Default to **table views** — lists of items to process, not visualizations to study
- Minimize navigation: everything accessible in 2 clicks maximum
- Show only what needs attention, hide what's fine

**Anti-patterns to avoid in Admin:**
- Large analytics charts (that's the Agent workspace's job)
- Long onboarding flows or wizard-style interfaces
- Anything that requires reading before acting
- Multiple confirmation dialogs for low-stakes actions

### Agent Dashboard: "Strategy Mode"

Design principle: **Help you make one good decision per day.**

The agent dashboard is for proactive work. You're reviewing content, understanding what's working, adjusting the strategy. The UI should:

- Lead with the **content review queue** — the one daily decision that moves the business
- Use **data visualizations** — charts for trends, graphs for performance over time
- Make the agent's reasoning visible: why did it create this content? what signal triggered it?
- Support **deep reading** — more text, more context per item, because you're making editorial decisions not operational ones
- Allow **configuration** that shapes what happens tomorrow

**Anti-patterns to avoid in Agent:**
- Urgent red alerts for operational problems (that belongs in Admin)
- Dense tables of user data
- Anything that makes you feel reactive rather than strategic

### The Practical Difference

When you open `admin.intelligrid.com` at 10 AM:
> You see 3 tools to approve, 1 flagged review, and yesterday's revenue. You process them in 7 minutes and close the tab.

When you open `agent.intelligrid.com` at 9:30 AM:
> You see today's content queue, read the 3 pieces flagged for review, approve 2, edit 1, and look at last week's performance graph to decide if you want to shift focus to LinkedIn. You close after 12 minutes with a clear picture of IntelliGrid's growth trajectory.

These are different mental states. The interface should serve each one, not try to serve both simultaneously.

---

## 10. The Notification & Alert Architecture

With three workspaces and an autonomous agent, you need a single, unified notification system that doesn't spam you. The professional approach: **one Telegram bot as the nerve center.**

### Why Telegram (Not Email, Not In-App)

Email is too slow (you might see it hours later) and gets lost in inbox noise. In-app notifications only work when you're already in the dashboard. Telegram is instant, persistent, and available on your phone — and the bot API is free.

### Alert Taxonomy: Three Priority Levels

**Level 1 — Critical (immediate notification, any time of day):**
- Platform is down or API server returning 5xx errors
- Payment processing failure
- Agent posted something before it should have (bug)
- Security: multiple failed admin login attempts
- Twitter/LinkedIn account flagged or suspended

**Level 2 — Important (notification within 1 hour, batched):**
- Content review queue ready (daily at 9:30 AM)
- A piece of content performed exceptionally well (CPS > 90)
- New Pro subscriber
- Reddit post gaining unusual traction (potential viral moment to engage)
- Tool submission spike (10+ in one hour)

**Level 3 — FYI (daily digest, 8 PM):**
- Daily summary: posts published, impressions, new users, revenue
- Agent performance: content CPS averages
- Platform health: all-green summary

### Telegram Bot Command Interface

The owner can control the agent from Telegram without opening a browser:

```
/status          → Agent status + today's summary
/queue           → Show today's content queue (how many pending)
/approve [id]    → Approve a specific content piece
/pause           → Pause the agent (stops all posting)
/resume          → Resume the agent
/stop            → Emergency stop (stops AND clears queue)
/report          → Get the weekly performance report
/health          → System health check (all services)
```

This means if you're traveling, in a meeting, or away from your computer, you can still manage critical agent decisions from your phone in seconds.

### Batching Rules (Preventing Notification Fatigue)

```javascript
// Notification rules the bot follows:

// CRITICAL alerts: Send immediately, no batching
if (alert.level === 'CRITICAL') {
  sendTelegramNow(alert);
}

// IMPORTANT alerts: Batch into 3 windows per day
// 9:30 AM, 2:00 PM, 6:00 PM IST
if (alert.level === 'IMPORTANT') {
  addToNextBatch(alert);
}

// FYI: Single 8 PM digest
if (alert.level === 'FYI') {
  addToDailyDigest(alert);
}

// Never send between 11 PM – 7 AM IST (quiet hours)
// Exception: CRITICAL alerts always go through
```

### The Daily 9:30 AM Message (Your Most Important Notification)

```
🤖 IntelliGrid Agent — Morning Briefing

TODAY'S CONTENT (8 pieces total)
✅ Auto-approved & scheduled: 5
⏳ Needs your review: 3

REVIEW QUEUE:
1. Blog: "Cursor AI Alternatives 2026" — High SEO value
   Keyword: 5,400 searches/mo | Competition: Low
   → agent.intelligrid.com/queue/review/content_abc

2. Reddit: r/Entrepreneur — First post to this subreddit
   Topic: "How we indexed 3,690 AI tools"
   → agent.intelligrid.com/queue/review/content_def

3. Twitter: Comparison thread (mentions competitor)
   Extra review: touches Futurepedia.io directly
   → agent.intelligrid.com/queue/review/content_ghi

PLATFORM SNAPSHOT
↑ 34 new users yesterday | ↑ 2 new Pro subscribers
Top traffic: Google (47%) Twitter (23%) Direct (18%)

Review all 3: agent.intelligrid.com/queue
```

You click the link, review the 3 pieces in the agent dashboard, approve or reject, and you're done for the day.

---

## 11. Deployment Pipeline Strategy

With three frontend apps and two backend services, a clean deployment pipeline prevents chaos.

### The Two-Environment Rule

Every professional SaaS runs at minimum two environments. No exceptions.

```
PRODUCTION                          STAGING
──────────────────────────────────────────────────────────────
intelligrid.com                     staging.intelligrid.com
admin.intelligrid.com               staging-admin.intelligrid.com
agent.intelligrid.com               staging-agent.intelligrid.com
Railway api-server (prod)           Railway api-server (staging)
Railway agent-worker (prod)         Railway agent-worker (staging)
MongoDB Atlas (prod cluster)        MongoDB Atlas (staging cluster)
```

### Branch Strategy

```
main branch     → Production deployments (auto-deploy via Vercel + Railway)
staging branch  → Staging deployments (auto-deploy)
feature/*       → Local development only (never auto-deploys)
```

Workflow:
1. Build a feature on `feature/my-feature` branch
2. Open PR to `staging`
3. Staging auto-deploys (Vercel detects branch push, Railway detects Dockerfile change)
4. Test on staging environment
5. Merge `staging` → `main`
6. Production auto-deploys

### Vercel Configuration Per App

Each Vercel project has this in its settings:

```
Production Branch: main
Preview Branch: staging
Root Directory: apps/admin  (different per project)
Build Command: pnpm build
Install Command: pnpm install --frozen-lockfile
```

### Railway Configuration Per Service

Railway detects changes via GitHub push. Each service has a `railway.toml` that specifies which directory it watches:

```toml
# services/api/railway.toml
[build]
  builder = "nixpacks"
  buildCommand = "pnpm install --frozen-lockfile"

[deploy]
  startCommand = "node index.js"
  healthcheckPath = "/health"
  healthcheckTimeout = 10
  restartPolicyType = "on_failure"
  restartPolicyMaxRetries = 3
```

```toml
# services/agent-worker/railway.toml
[build]
  builder = "nixpacks"
  buildCommand = "pnpm install --frozen-lockfile"

[deploy]
  startCommand = "node index.js"
  restartPolicyType = "always"     ← Worker should always restart on crash
  restartPolicyMaxRetries = 10
```

The critical difference: the API server has `healthcheckPath` (Railway monitors its health and alerts if it goes down), while the agent worker has `restartPolicyType = "always"` (it silently restarts itself if it crashes, since a brief gap in agent operation is non-critical).

---

## 12. Scaling Path: What Changes as You Grow

This architecture is designed to evolve without rebuilding. Here's exactly what changes at each growth stage:

### Stage 1: Solo Founder (Now — ~1,000 users)
**What you have:** Everything as described in this document.
**Cost:** ~$20–50/month (Railway + MongoDB Atlas free tier + AI API usage)
**Bottlenecks:** None yet. The architecture is intentionally over-engineered for this stage to avoid rebuilding later.

### Stage 2: Adding a VA or Content Manager (~1,000–10,000 users)
**What changes:**
- Create a `TRUSTED_OPERATOR` role in Clerk for the VA
- Give VA access to `agent.intelligrid.com` (for content review) only
- Create a `MODERATOR` role for a content moderator
- Give moderator access to `admin.intelligrid.com` (for tool approval, review moderation) only
- Add a simple "Notes" field to content pieces so VA can leave context for you before you approve

**What doesn't change:** Everything else. The architecture was designed with this in mind.

### Stage 3: Small Team (~10,000–50,000 users)
**What changes:**
- `api-server` on Railway may need vertical scaling (bump to 2GB RAM)
- MongoDB Atlas may need to upgrade from free tier (M0) to M10
- Agent worker may need to process jobs in parallel (Bull concurrency setting, not architectural change)
- Add a `CONTENT_WRITER` role who can generate content suggestions but not approve them

**What doesn't change:** The three-workspace architecture. The subdomain structure. The Railway service split.

### Stage 4: Significant Scale (~50,000+ users)
**What changes:**
- Consider migrating agent-worker from Railway to a dedicated queue service (AWS SQS + Lambda) for cost efficiency at volume
- `api-server` may need horizontal scaling (Railway supports this)
- Consider a dedicated CDN for the admin and agent apps (they're currently just Vercel static sites, which is already CDN-backed)
- The agent may need to be split into separate workers per module for parallelism

**What doesn't change:** The conceptual architecture. The workspaces. The auth model.

---

## 13. What Professionals Get Wrong (And How to Avoid It)

These are the specific mistakes teams make when building this kind of system. Each one is a month of wasted engineering:

### Mistake 1: Building the Admin Dashboard First

Most founders build admin first because it feels essential. It isn't. Your platform is functional without an admin dashboard — you can approve tools and manage users directly in MongoDB at first. The agent, however, needs its infrastructure early because it takes 30–60 days to generate meaningful data.

**Do instead:** Build agent infrastructure first (the Railway worker, the research engine, the data collection). Let it run and gather data for 4 weeks before building the frontend dashboards. By then you have real data to display and real patterns to design around.

### Mistake 2: Putting the Agent Cron Jobs in the API Server

Tempting because the API server already exists. But cron jobs in an HTTP server create:
- Race conditions if Railway restarts the server
- Memory leaks that degrade API performance over hours
- No way to scale the API independently of the jobs

**Do instead:** Agent worker is always a separate service. No exceptions.

### Mistake 3: Building Custom Analytics When GA4 + Search Console Are Free

Teams spend weeks building custom analytics dashboards showing pageviews, sessions, bounce rates. All of this data is already in GA4 and Search Console for free.

**Do instead:** The agent workspace only shows data that GA4 *doesn't* give you: content performance scores, platform-specific attribution, signup conversions by content piece, agent decision logs. For everything else, link to GA4.

### Mistake 4: Over-Notifying the Owner

A system that sends 20 Telegram messages a day trains you to ignore all of them. Within 2 weeks you'll have muted the bot.

**Do instead:** The batching rules in Section 10 are non-negotiable. Critical alerts only for critical things. Everything else is batched or in the daily digest.

### Mistake 5: Making the Agent Fully Autonomous Too Quickly

The temptation is to set `autoApprove = true` for everything and let the agent run completely hands-off. This always ends in an embarrassing post, a factual error, or a Reddit ban.

**Do instead:** Start with human review on everything. After 4 weeks of data, enable auto-approval only for the content types that have a consistent quality score above 85. Reddit should *always* require human review — Reddit bans are permanent and catastrophic for your organic growth strategy.

### Mistake 6: Mixing the Agent's API Tokens with the Main API

If your main API server ever has a security vulnerability (even a minor one), an attacker could potentially read environment variables. If your Twitter/LinkedIn/Reddit tokens are in the same service, they're compromised.

**Do instead:** Agent tokens only live in the agent-worker service. The API server never touches platform posting tokens. This is enforced by the service separation in Railway.

### Mistake 7: Not Logging Agent Decisions

When the agent produces a low-quality post or makes a bad decision, you need to understand *why* — what research signal triggered it, what prompt generated it, what quality score it received. Without this, debugging the agent is impossible.

**Do instead:** Every agent decision is logged to the `AgentLog` collection with full context. The audit log in the agent dashboard is not optional — it's essential for improving the system over time.

---

## 14. Implementation Priority Order

Given your existing Vercel + Railway stack, here's the exact order to build this:

### Sprint 1: Foundation (Week 1)
1. Set up monorepo with pnpm workspaces — migrate existing code into `apps/web/` and `services/api/`
2. Add Railway service: `agent-worker` (empty Node.js service that just logs "agent worker running" on cron)
3. Configure Clerk for subdomain sessions (`.intelligrid.com` cookie domain)
4. Add RBAC middleware to all existing API routes
5. Create DNS records for `admin.intelligrid.com` and `agent.intelligrid.com`
6. Create empty Vercel projects pointing to `apps/admin` and `apps/agent` directories
7. Create Telegram bot and connect to Railway agent-worker

**End of Sprint 1:** The infrastructure shell is live. Subdomains resolve. Auth works across all three. The agent worker is running (doing nothing yet).

### Sprint 2: Admin Workspace (Week 2)
8. Build `apps/admin` — the four core pages: Overview, Tool Queue, Review Moderation, User Management
9. Connect to existing backend routes (these mostly already exist)
10. Add the Workspace Switcher component to admin (visible to SUPERADMIN only)
11. Add access log collection to backend

**End of Sprint 2:** `admin.intelligrid.com` is live and functional. You can now stop using MongoDB directly for platform management.

### Sprint 3: Agent Research + Planning (Week 3)
12. Build Research Engine in agent-worker (RSS, Reddit, Search Console)
13. Build Content Planner module
14. Build `apps/agent` — Research Feed and Content Plan views (read-only first)
15. Connect agent-worker to MongoDB with new collections

**End of Sprint 3:** Every morning at 6 AM, a research brief is generated and visible at `agent.intelligrid.com/research`. You can see what the agent is thinking before it can act.

### Sprint 4: Content Generation + Review Queue (Week 4–5)
16. Integrate AI API (Claude or OpenAI) into agent-worker
17. Build Twitter, LinkedIn, Blog writers
18. Build Quality Checker
19. Build content review queue UI in agent workspace
20. Wire up Telegram notifications for the morning briefing

**End of Sprint 4:** The agent generates content every day, notifies you at 9:30 AM, and you review/approve from the agent workspace. Nothing posts yet.

### Sprint 5: Publishing + Analytics (Week 6–7)
21. Build Publisher module (Twitter API, LinkedIn API, WordPress REST API, Brevo newsletter)
22. Build Analytics Collector
23. Build Performance Dashboard in agent workspace
24. Enable auto-approval for appropriate content types (after 1 week of manual review data)

**End of Sprint 5:** The full loop is running. Agent researches → generates → you review → agent publishes → agent measures → data informs next day's content.

### Sprint 6: Polish + Reddit (Week 8)
25. Build RedditWriter and PRAW integration
26. Build A/B testing module
27. Build Emergency Stop system
28. Performance optimization and monitoring
29. Full end-to-end testing on staging

**End of Sprint 6:** System is complete and battle-tested.

---

## 15. Final Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                        INTELLIGRID — FULL ARCHITECTURE                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│  DNS: intelligrid.com  →  Vercel CDN  →  Three Independent Deployments     │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐
│ intelligrid.com  │  │admin.intelligrid │  │  agent.intelligrid.com       │
│                  │  │.com              │  │                              │
│ React + Vite     │  │ React + Vite     │  │  React + Vite                │
│ apps/web/        │  │ apps/admin/      │  │  apps/agent/                 │
│                  │  │                  │  │                              │
│ All users        │  │ SUPERADMIN       │  │  SUPERADMIN                  │
│                  │  │ MODERATOR        │  │  TRUSTED_OPERATOR            │
│ Tool discovery   │  │                  │  │                              │
│ Comparisons      │  │ Tool approval    │  │  Content queue               │
│ Reviews          │  │ User mgmt        │  │  Research feed               │
│ Collections      │  │ Revenue          │  │  Performance graphs          │
│ Pro subscription │  │ System health    │  │  Agent config                │
│                  │  │ Access logs      │  │  Audit log                   │
└────────┬─────────┘  └────────┬─────────┘  └──────────────┬───────────────┘
         │                     │                            │
         └─────────────────────┴────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   CLERK AUTH        │
                    │                     │
                    │ Cookie: .intelligrid│
                    │ .com (all subdomains│
                    │ share one session)  │
                    │                     │
                    │ Roles:              │
                    │  SUPERADMIN         │
                    │  TRUSTED_OPERATOR   │
                    │  MODERATOR          │
                    │  USER               │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────▼──────────────────────┐
         │          RAILWAY: intelligrid-backend       │
         │                                            │
         │  ┌─────────────────────────────────────┐  │
         │  │  Service: api-server                │  │
         │  │  Node.js + Express                  │  │
         │  │                                     │  │
         │  │  /api/v1/user/*    (all users)      │  │
         │  │  /api/v1/admin/*   (admin roles)    │  │
         │  │  /api/v1/agent/*   (agent roles)    │  │
         │  │                                     │  │
         │  │  Env: CLERK, MONGODB, REDIS,        │  │
         │  │       BREVO, ALGOLIA, PAYPAL        │  │
         │  └──────────────────┬──────────────────┘  │
         │                     │ Reads/Writes         │
         │  ┌──────────────────▼──────────────────┐  │
         │  │  Shared Infrastructure               │  │
         │  │                                     │  │
         │  │  MongoDB Atlas                      │  │
         │  │  ├── Users, Tools, Reviews          │  │
         │  │  ├── Orders, Collections            │  │
         │  │  └── AgentContent, AgentLogs,       │  │
         │  │       ResearchBrief, ContentIntel   │  │
         │  │                                     │  │
         │  │  Redis                              │  │
         │  │  ├── API response cache             │  │
         │  │  └── Bull job queues                │  │
         │  │       ├── content-generation        │  │
         │  │       ├── publishing                │  │
         │  │       └── analytics                 │  │
         │  └──────────────────▲──────────────────┘  │
         │                     │ Reads/Writes         │
         │  ┌──────────────────┴──────────────────┐  │
         │  │  Service: agent-worker              │  │
         │  │  Node.js + Bull + Cron              │  │
         │  │                                     │  │
         │  │  6:00 AM  Research Engine           │  │
         │  │  7:00 AM  Content Planner           │  │
         │  │  8:00 AM  Writers (parallel)        │  │
         │  │  9:00 AM  Quality Checker           │  │
         │  │  All day  Publisher (scheduled)     │  │
         │  │  Every 6h Analytics Collector       │  │
         │  │  8:00 PM  Daily Summary             │  │
         │  │                                     │  │
         │  │  Env: MONGODB, REDIS,               │  │
         │  │       OPENAI/ANTHROPIC,             │  │
         │  │       TWITTER, LINKEDIN,            │  │
         │  │       REDDIT, TELEGRAM,             │  │
         │  │       GOOGLE_SA (Analytics)         │  │
         │  └──────────────────┬──────────────────┘  │
         └─────────────────────┼──────────────────────┘
                               │
         ┌─────────────────────▼──────────────────────┐
         │         EXTERNAL PLATFORMS                  │
         │                                            │
         │  Twitter/X API   LinkedIn API              │
         │  Reddit (PRAW)   WordPress REST            │
         │  Brevo Email     Telegram Bot              │
         │  Google GA4      Search Console            │
         │  Algolia Search  Google Trends (Pytrends)  │
         └────────────────────────────────────────────┘

OWNER'S DAILY FLOW:
9:30 AM → Telegram notification: "3 pieces need review"
9:35 AM → Opens agent.intelligrid.com/queue on phone/laptop
9:45 AM → Reviews 3 pieces, approves 2, edits 1
9:47 AM → Done. Agent handles the rest automatically.
8:00 PM → Telegram digest: "8 posts published, 2,340 impressions, 4 signups"
```

---

## Summary: The Decision, Restated

| Question | Answer |
|---|---|
| **All in one admin dashboard?** | No — cognitive overload, team access problems, deployment coupling |
| **Completely separate apps?** | No — login fatigue, engineering overhead, data duplication |
| **The right approach?** | Three workspaces, one codebase, one login, two Railway services |
| **Admin and agent together?** | Never — different purposes, different users, different mental modes |
| **Agent in Vercel?** | Never — serverless can't run persistent background jobs |
| **Agent in the API server?** | Never — mixing HTTP serving with background jobs degrades both |
| **How does auth work?** | Clerk cookie on `.intelligrid.com` spans all subdomains, one login |
| **How do services communicate?** | Via shared MongoDB + Redis queue — never direct HTTP between services |
| **When to start building?** | Agent infrastructure first, admin dashboard second |

---

*Document Version 1.0 | IntelliGrid Management Architecture Strategy | February 2026*
*Designed for: Vercel (Frontend) + Railway (Backend) + MongoDB + Redis + Clerk*
