
# IntelliGrid Admin Workspace

This is the standalone Admin Dashboard for IntelliGrid, designed to run on `admin.intelligrid.online`.

## 🚀 Deployment Instructions (Vercel)

This app must be deployed as a **separate Project** in Vercel.

1. **Go to Vercel Dashboard** → "Add New..." → "Project"
2. **Import the IntelliGrid Repo**: `IntelliGrid-Solutions`
3. **Configure Project**:
   - **Project Name**: `intelligrid-admin`
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/admin` (Click "Edit" next to Root Directory)
4. **Environment Variables**:
   Copy these from `.env.production`:
   - `VITE_API_URL`
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_ENV`
5. **Deploy**

## 🌐 Domain Setup

1. Go to the new `intelligrid-admin` project in Vercel.
2. Settings → Domains.
3. Add `admin.intelligrid.online`.
4. Vercel will provide the DNS records (CNAME). Add them to your domain registrar (GoDaddy/Namecheap).

## 🛠️ Local Development

```bash
cd apps/admin
npm install
npm run dev
```
Runs on `http://localhost:5174`.
