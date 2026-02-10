# 🚀 Live Deployment Testing Guide

**Date:** February 10, 2026
**Environment:** Production (Vercel & Railway)

---

## ✅ **Step 1: Verify Deployment Health**

Run the automated verification script to check if your backend is live and configure correctly.

**Command:**
```bash
# Replace with your actual Railway URL if different
node Backend/scripts/verifyDeployment.js https://intelligrid-solutions-production.up.railway.app
```

**What to look for:**
- ✅ Health Check: OK
- ✅ API Root: OK
- ✅ Configuration Check: All "Present"

---

## 📧 **Step 2: Test Email Automation**

Send test emails to your own inbox to verify the Brevo integration.

**Command:**
```bash
# Replace with your email address
node Backend/scripts/testEmails.js yourname@example.com
```

**Expected Result:**
1. You should see logs: "Sending Welcome Email...", "Sending Subscription Confirmation...", etc.
2. **Check your inbox:** You should receive 3-4 test emails from "IntelliGrid".
3. If successful, Brevo is correctly configured! 🚀

---

## 💳 **Step 3: Verification Checklist**

### **Frontend (Vercel)**
- [ ] Visit `https://intelligrid.online` (or your Vercel URL)
- [ ] Ensure the homepage loads without errors.
- [ ] Go to `/pricing` page.
- [ ] **Verify:** Cashfree option should be **hidden**.
- [ ] **Verify:** PayPal option should be **visible**.

### **Backend (Railway)**
- [ ] Check Railway Logs for any startup errors.
- [ ] Confirm `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` (support@intelligrid.store), and `SENTRY_DSN` are set.
- [ ] **Critical:** ensure `FRONTEND_URL` is set to `https://intelligrid.online` (avoids CORS errors).

### **Monitoring (Sentry)**
- [ ] Log in to [Sentry.io](https://sentry.io).
- [ ] Check if the project is creating "Issues" or "Transactions".
- [ ] If no errors are listed, your app is stable! 🎉

---

### **Step 4: Data Initialization (Search)**

Run the Algolia sync script to make tools searchable.

**Command:**
```bash
node Backend/scripts/syncAlgolia.js
```

---

## 🆘 **Troubleshooting**

**Issue: Emails not arriving?**
- Check Spam folder.
- Verify `BREVO_SENDER_EMAIL` in Railway matches your verified sender in Brevo.

**Issue: Backend 500 Error?**
- Check Railway logs for detailed error messages.
- Ensure MongoDB IP Whitelist allows access from anywhere (`0.0.0.0/0`) or Railway's IP.

**Issue: Frontend White Screen?**
- Check Browser Console (F12).
- Verify `VITE_SENTRY_DSN` is set in Vercel.
