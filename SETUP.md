# Vercel Blob Setup Instructions

## ✅ Installation Complete!

Vercel Blob has been installed and configured. Now you just need to add your environment variable.

---

## 🔑 Get Your Vercel Blob Token

### Step 1: Go to Vercel Dashboard
Visit: https://vercel.com/dashboard/stores

### Step 2: Create a Blob Store
1. Click **"Create Database"**
2. Select **"Blob"**
3. Name it: `tshirt-designs`
4. Click **"Create"**

### Step 3: Copy the Token
1. Click on your new blob store
2. Go to **".env.local"** tab
3. Copy the `BLOB_READ_WRITE_TOKEN` value

### Step 4: Add to Vercel Project
1. Go to your project settings: https://vercel.com/irs1jc-nu/tshirt-api/settings/environment-variables
2. Add new variable:
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** (paste your token)
   - **Environments:** Production, Preview, Development
3. Click **"Save"**

### Step 5: Redeploy
```bash
git add .
git commit -m "Add Vercel Blob storage"
git push
```

Or click **"Redeploy"** in Vercel dashboard.

---

## 📊 What You Get

### Free Hobby Plan:
- **Storage:** 1 GB (~2,222 designs)
- **Bandwidth:** 100 GB/month (~222,222 downloads)
- **Cost:** $0

### When to Upgrade:
- **2,000+ orders/month:** Upgrade to Pro ($20/month)
- **10,000+ orders/month:** Consider migrating to S3

---

## 🧪 Testing Locally

### Add to your `.env` file:
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxx
```

### Restart your server:
```bash
npm start
```

### Test the upload:
1. Create a design in the editor
2. Click "Add to Cart"
3. Check console - should see:
   ```
   ✅ Design uploaded to Vercel Blob: https://xxxxx.blob.vercel-storage.com/designs/123.jpeg
   ```

---

## 📦 Storage Limits

| Metric | Free Tier | Pro Tier |
|--------|-----------|----------|
| Storage | 1 GB | 100 GB |
| Bandwidth | 100 GB/month | 1 TB/month |
| Orders/month | ~2,000 | ~200,000 |
| Cost | $0 | $20/month |

---

## 🔍 View Your Designs

Visit: https://vercel.com/dashboard/stores/YOUR_STORE_ID/data

You'll see all uploaded designs with:
- Filename
- Size
- Upload date
- CDN URL

---

## ✅ What Changed

### Before (localStorage):
```
Customer design → Saved in browser → Lost if cleared
```

### After (Vercel Blob):
```
Customer design → Uploaded to cloud → Persistent forever ✅
```

**Designs are now accessible from anywhere for order fulfillment!** 🎉

