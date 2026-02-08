# ⚡ IMMEDIATE ACTION CHECKLIST

## 🎯 Step 1: Update Railway FRONTEND_URL (5 minutes)

**Why:** Backend needs to know the correct frontend URL for CORS and redirects.

**Steps:**
1. Go to: https://railway.app/dashboard
2. Select: **Intelligrid-solutions** project
3. Click: **Variables** tab
4. Find: `FRONTEND_URL`
5. Update value to: `https://www.intelligrid.online`
6. Click: **Deploy** (or it auto-deploys)
7. Wait 1-2 minutes for redeployment

**Verify:**
```bash
# Test health check still works
curl https://api.intelligrid.online/health
```

Expected: `{"status":"success",...}`

---

## 🎯 Step 2: Test Your Website (10 minutes)

**Open in browser:** https://www.intelligrid.online

### Check These:
- [ ] Homepage loads
- [ ] No errors in browser console (Press F12 → Console tab)
- [ ] Navigation works
- [ ] Search bar appears
- [ ] "Sign Up" button works
- [ ] Can see AI tools listed

### If you see errors:
- Check browser console
- Check if API calls are going to `https://api.intelligrid.online`
- Verify environment variables in Vercel

---

## 🎯 Step 3: Configure Clerk Webhook (10 minutes)

**Why:** Syncs user data when users sign up.

**Steps:**
1. Go to: https://dashboard.clerk.com
2. Select your **production** app
3. Navigate to: **Webhooks** → **Add Endpoint**
4. Enter URL: `https://api.intelligrid.online/api/v1/auth/webhooks/clerk`
5. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
6. Click: **Create**
7. **Copy the Signing Secret** (starts with `whsec_...`)
8. Go to Railway: https://railway.app/dashboard
9. Variables → Add new variable:
   - Name: `CLERK_WEBHOOK_SECRET`
   - Value: `whsec_...` (paste the secret)
10. Deploy

**Test:**
- In Clerk dashboard, click **Test** on the webhook
- Send a `user.created` test event
- Should return "200 OK"

---

## 🎯 Step 4: Configure PayPal Webhook (10 minutes)

**Why:** Receives payment notifications.

**⚠️ IMPORTANT:** Use **Live** mode, not Sandbox!

**Steps:**
1. Go to: https://developer.paypal.com/dashboard
2. Navigate to: **Apps & Credentials** → **Live** (NOT Sandbox!)
3. Select your app (or create one)
4. Click: **Webhooks** → **Add Webhook**
5. Enter URL: `https://api.intelligrid.online/api/v1/payment/webhooks/paypal`
6. Subscribe to events:
   - ✅ `PAYMENT.CAPTURE.COMPLETED`
   - ✅ `PAYMENT.CAPTURE.DENIED`
   - ✅ `PAYMENT.CAPTURE.REFUNDED`
   - ✅ `BILLING.SUBSCRIPTION.CREATED`
   - ✅ `BILLING.SUBSCRIPTION.CANCELLED`
7. Click: **Save**

**Test:**
- Click on the webhook → **Simulator**
- Send `PAYMENT.CAPTURE.COMPLETED` test
- Should return "200 OK"

---

## 🎯 Step 5: Configure Cashfree Webhook (10 minutes)

**Why:** Receives payment notifications for Indian payments.

**⚠️ IMPORTANT:** Use **Production** environment!

**Steps:**
1. Go to: https://merchant.cashfree.com
2. Navigate to: **Developers** → **Webhooks**
3. Click: **Add Webhook URL**
4. Enter URL: `https://api.intelligrid.online/api/v1/payment/webhooks/cashfree`
5. Subscribe to events:
   - ✅ `PAYMENT_SUCCESS_WEBHOOK`
   - ✅ `PAYMENT_FAILED_WEBHOOK`
   - ✅ `REFUND_STATUS_WEBHOOK`
6. Click: **Save**

**Test:**
- Use Cashfree test payment (if available)
- Or wait for real payment to test

---

## 🎯 Step 6: Set Up UptimeRobot (15 minutes)

**Why:** Get alerted if your site goes down.

**Steps:**
1. Sign up: https://uptimerobot.com (Free)
2. Create **Monitor #1:**
   - Type: HTTP(s)
   - Name: IntelliGrid Frontend
   - URL: `https://www.intelligrid.online`
   - Interval: 5 minutes
3. Create **Monitor #2:**
   - Type: HTTP(s)
   - Name: IntelliGrid Backend
   - URL: `https://api.intelligrid.online/health`
   - Interval: 5 minutes
4. Create **Monitor #3:**
   - Type: HTTP(s)
   - Name: IntelliGrid API
   - URL: `https://api.intelligrid.online/api/v1/tools?limit=1`
   - Interval: 5 minutes
5. Add alert contact:
   - Email: `marketing@intelligrid.store`
   - Verify email

**Done!** You'll get emails if site goes down.

---

## 🎯 Step 7: Enable MongoDB Backups (5 minutes)

**Why:** Protect your data!

**Steps:**
1. Go to: https://cloud.mongodb.com
2. Select: **IntelliGridSolutions** cluster
3. Click: **Backup** tab
4. Enable: **Cloud Backups**
5. Set retention: **30 days**
6. Frequency: **Continuous** (or Every 6 hours)
7. Click: **Save**

**Test restore:**
- Find latest snapshot
- Click: **Restore** → **Download**
- Verify it works

---

## ✅ COMPLETION CHECKLIST

After completing all steps above:

- [ ] Railway FRONTEND_URL updated
- [ ] Website tested and working
- [ ] Clerk webhook configured
- [ ] PayPal webhook configured (Live mode)
- [ ] Cashfree webhook configured (Production)
- [ ] UptimeRobot monitoring active (3 monitors)
- [ ] MongoDB backups enabled

---

## 🎉 WHAT'S NEXT?

Once all above is done:

1. **Test end-to-end payment flow**
   - Make a real PayPal payment (small amount)
   - Verify webhook received
   - Verify subscription activated
   - Verify email sent

2. **Create legal documents**
   - Privacy Policy (use generator)
   - Terms of Service (use generator)
   - Refund Policy (30-day guarantee)
   - Add to website

3. **Final testing**
   - Test all user flows
   - Mobile testing
   - Performance testing

4. **GO LIVE!** 🚀
   - Announce on social media
   - Email beta users
   - Monitor closely

---

## ⏱️ TOTAL TIME ESTIMATE

- Step 1: 5 minutes
- Step 2: 10 minutes
- Step 3: 10 minutes
- Step 4: 10 minutes
- Step 5: 10 minutes
- Step 6: 15 minutes
- Step 7: 5 minutes

**Total: ~65 minutes (about 1 hour)**

---

## 📞 NEED HELP?

If you get stuck:
1. Check the detailed guides in the project folder
2. Check Railway/Vercel logs for errors
3. Let me know what error you're seeing

---

**Ready to start? Begin with Step 1! 🚀**
