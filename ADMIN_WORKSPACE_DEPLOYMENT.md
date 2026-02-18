
# 🚀 Phase 2 Deployment Guide: Admin Workspace

You have a new, professional Admin Dashboard waiting in `apps/admin`. It needs to be deployed to Vercel as a separate project to work on `admin.intelligrid.online`.

## 1. Create New Project in Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **"Add New..."** → **"Project"**.
3. Import your repository: `IntelliGrid-Solutions`.

## 2. Configure Project Settings (Crucial!)
In the "Configure Project" screen:

- **Project Name**: `intelligrid-admin`
- **Framework Preset**: `Vite`
- **Root Directory**:
  - Click **Edit** next to Root Directory.
  - Select `apps/admin`.
  - Click **Continue**.

## 3. Add Environment Variables
Copy these values (same as your main project, but with the Production API URL):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://intelligrid-solutions-production.up.railway.app/api/v1` |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_ZGl2aW5lLWdpYmJvbi02MC5jbGVyay5hY2NvdW50cy5kZXYk` |
| `VITE_ENV` | `production` |

## 4. Deploy
- Click **Deploy**.
- Wait for the build to finish (approx 1 min).

## 5. Setup Domain (`admin.intelligrid.online`)
Once deployed:
1. Go to the project dashboard → **Settings** → **Domains**.
2. Enter `admin.intelligrid.online`.
3. Vercel will give you a **CNAME** record (likely `cname.vercel-dns.com`).
4. Go to your Domain Registrar (GoDaddy/Namecheap/etc).
5. Add a new **CNAME** record:
   - **Host**: `admin`
   - **Value**: `cname.vercel-dns.com` (or whatever Vercel says)
   - **TTL**: `1 Hour` (or default)

## 6. Configure Clerk (Cookies)
To make your login work across `intelligrid.online` and `admin.intelligrid.online`:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Sessions.
2. Find **Cookie Settings** → **Cookie Domain**.
3. Set it to `.intelligrid.online` (Note the leading dot!).
   - *This allows the session cookie to be shared between subdomains.*

---

**Done!**
You can now access your admin panel at `https://admin.intelligrid.online`.
Default login: Your SuperAdmin account (`creepyvaultai@gmail.com`).
