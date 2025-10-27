# ✅ Vercel Blob Store Configuration

## 🔑 Your Store Details

**Store ID:** `store_I1BJJyLG9GcpWSS2`
**Base URL:** `https://i1bjjylg9gcpwss2.public.blob.vercel-storage.com`
**Region:** Washington, D.C., USA (IAD1)

---

## 📝 Next Step: Get Your Token

### Click "Getting Started" in the left sidebar

You should see a code snippet like:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXX
```

---

## 🔧 Add Token to Vercel Project

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/patricks-projects-9c6d1e21/tshirt-api-xi/settings/environment-variables

2. Click **"Add New"**

3. Enter:
   ```
   Key: BLOB_READ_WRITE_TOKEN
   Value: vercel_blob_rw_XXXXXXXXXXXXX (paste from Getting Started page)
   Environments: ✅ Production, ✅ Preview, ✅ Development
   ```

4. Click **"Save"**

5. **Redeploy** your project (Vercel will auto-redeploy)

---

### Method 2: Via Command Line

```bash
# In your project directory
vercel env add BLOB_READ_WRITE_TOKEN

# Paste the token when prompted
# Select all environments (Production, Preview, Development)
```

---

## 🧪 Test Locally (Optional)

Add to your `.env` file:

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXX
```

Then restart your server:
```bash
npm start
```

---

## ✅ Verify It's Working

After deploying:

1. Go to your design editor: https://tshirt-api-xi.vercel.app/test
2. Create a design
3. Click "Add to Cart"
4. Check console - you should see:
   ```
   ✅ Design uploaded to Vercel Blob: https://i1bjjylg9gcpwss2.public.blob.vercel-storage.com/designs/123.jpeg
   ```

5. Go back to Storage → Browser tab - you'll see your uploaded designs! 🎉

---

## 📊 Current Usage

**Storage:** 0 B / 1 GB (Free tier)
**Simple Operations:** 0 / 10k
**Advanced Operations:** 0 / 2k
**Data Transfer:** 0 B / 10 GB

You can handle ~2,000 orders/month on the free tier! 🚀

---

## 🎯 What Happens Now

When customers add to cart:
1. ✅ Design uploaded to `https://i1bjjylg9gcpwss2.public.blob.vercel-storage.com/designs/TIMESTAMP.jpeg`
2. ✅ URL stored in Shopify cart properties
3. ✅ You can access designs from anywhere (no more localStorage!)
4. ✅ Designs persist forever (never deleted unless you manually remove them)

---

## 📝 Next Steps

1. Click **"Getting Started"** in left sidebar
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. Add to Vercel project environment variables
4. Deploy and test!

