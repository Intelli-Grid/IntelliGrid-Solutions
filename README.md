# IntelliGrid

> **The AI Tools Discovery Platform** — Browse, compare, and find the right AI tool for any workflow.

**Production:** [intelligrid.online](https://www.intelligrid.online)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS |
| Backend | Node.js · Express.js (ESM) |
| Database | MongoDB Atlas (Mongoose) |
| Cache | Redis (Upstash) |
| Search | Algolia |
| Auth | Clerk |
| Payments | PayPal · Cashfree |
| Email | Brevo |
| Monitoring | Sentry |
| Analytics | Google Analytics 4 |

## Deployment

| Service | Platform | Trigger |
|---|---|---|
| Frontend | Vercel | Push to `main` |
| Backend | Railway | Push to `main` |

CI/CD is fully automated — every commit to `main` deploys both services simultaneously.

## Repository Structure

```
IntelliGrid/
├── Frontend/          # React + Vite SPA (deployed to Vercel)
│   ├── src/
│   │   ├── pages/     # 23 routes
│   │   ├── components/
│   │   ├── services/  # API client + service layer
│   │   └── utils/
│   └── package.json
│
├── Backend/           # Express.js REST API (deployed to Railway)
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/    # 21 Mongoose models
│   │   ├── routes/    # 15 route groups
│   │   ├── services/
│   │   ├── middleware/
│   │   └── config/
│   └── package.json
│
├── nixpacks.toml      # Railway build configuration
└── railway.json       # Railway deployment configuration
```

## Environment

Environment variables are managed via Vercel (frontend) and Railway (backend) dashboards.  
Reference the internal operations guide for variable names and values.

---

© 2026 IntelliGrid. All rights reserved. Proprietary and confidential.
