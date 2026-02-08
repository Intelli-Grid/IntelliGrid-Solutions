# 🔧 Clerk Webhook Troubleshooting

## What Error Did You See?

Please check what error message Clerk showed when the test failed. Common errors:

### 1. **Connection Timeout / Cannot Reach Endpoint**
**Error:** "Failed to connect" or "Timeout"

**Cause:** Webhook URL is incorrect or backend is not accessible

**Fix:**
- Verify URL is exactly: `https://api.intelligrid.online/api/v1/auth/webhooks/clerk`
- Test backend is accessible: Open https://api.intelligrid.online/health in browser
- Should return: `{"status":"success",...}`

### 2. **401 Unauthorized**
**Error:** "401 Unauthorized" or "Invalid signature"

**Cause:** Signing secret not set or incorrect in Railway

**Fix:**
- Verify you added `CLERK_WEBHOOK_SECRET` to Railway
- Make sure you copied the FULL secret (starts with `whsec_`)
- Wait 1-2 minutes for Railway to redeploy after adding variable

### 3. **404 Not Found**
**Error:** "404 Not Found"

**Cause:** Webhook route doesn't exist or URL is wrong

**Fix:**
- Check the webhook route exists in backend
- Verify URL has no typos
- Should be: `/api/v1/auth/webhooks/clerk` (not `/webhooks/clerk`)

### 4. **500 Internal Server Error**
**Error:** "500 Internal Server Error"

**Cause:** Backend error processing the webhook

**Fix:**
- Check Railway logs for error details
- Look for errors after the webhook test

---

## 🔍 Debug Steps

### Step 1: Verify Backend is Running

Open in browser:
```
https://api.intelligrid.online/health
```

Expected response:
```json
{"status":"success","message":"IntelliGrid API is running",...}
```

### Step 2: Check Webhook Route Exists

Let me verify the webhook route is properly configured in your backend.

### Step 3: Check Railway Environment Variables

1. Go to: https://railway.app/dashboard
2. Select: Intelligrid-solutions
3. Click: Variables
4. Verify `CLERK_WEBHOOK_SECRET` exists
5. Value should start with `whsec_`

### Step 4: Check Railway Logs

The logs should show the webhook attempt. Look for:
- `POST /api/v1/auth/webhooks/clerk`
- Any error messages

---

## 🧪 Manual Test

You can test the webhook endpoint manually:

```bash
# Test if endpoint is accessible
curl -X POST https://api.intelligrid.online/api/v1/auth/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type":"user.created","data":{"id":"test"}}'
```

Expected: Should return 401 (because no valid signature), but proves endpoint exists.

---

## ✅ Checklist Before Retrying

- [ ] Backend health check works (https://api.intelligrid.online/health)
- [ ] Webhook URL is exactly: `https://api.intelligrid.online/api/v1/auth/webhooks/clerk`
- [ ] `CLERK_WEBHOOK_SECRET` added to Railway
- [ ] Railway redeployed (wait 1-2 minutes after adding variable)
- [ ] Signing secret copied correctly (starts with `whsec_`)

---

## 📝 What to Tell Me

Please provide:

1. **What error message did Clerk show?** (screenshot or exact text)
2. **Did you add `CLERK_WEBHOOK_SECRET` to Railway?** (Yes/No)
3. **What does this URL show in browser?** https://api.intelligrid.online/health
4. **Can you see `CLERK_WEBHOOK_SECRET` in Railway Variables tab?** (Yes/No)

With this information, I can help you fix the specific issue!

---

## 🔄 Alternative: Skip Webhook Test for Now

If the webhook test keeps failing, we can:
1. Skip the test for now
2. Move on to PayPal webhook
3. Come back to test Clerk webhook after a real user signup

The webhook will work in production even if the test fails, as long as:
- URL is correct
- Secret is set in Railway
- Backend is running

**Would you like to:**
- **Option A:** Debug the Clerk webhook test
- **Option B:** Skip test and move to PayPal webhook
- **Option C:** Test with a real user signup instead

Let me know!
