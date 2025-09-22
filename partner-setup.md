# Hash Thumbnail Generator - Partner Setup

## 🎯 Overview
This setup allows your business partner to automatically generate thumbnails for Hash events from anywhere in the world.

## 📋 Prerequisites

Your business partner needs:
- Node.js 18+ installed
- Python 3.8+ installed
- Internet connection
- Firebase service account key

## 🚀 Setup Instructions

### Step 1: Get the Files
Send your business partner these files:
```
📁 hash-thumbnail-partner/
├── 📄 generate_thumbnails.py
├── 📄 webhook-thumbnail-server.js
├── 📄 serviceAccountKey.json
├── 📄 package.json
└── 📄 requirements.txt
```

### Step 2: Install Dependencies

**Node.js dependencies:**
```bash
npm install express firebase-admin
```

**Python dependencies:**
```bash
pip install firebase-admin pillow
```

### Step 3: Configure Firebase

1. Place `serviceAccountKey.json` in the project root
2. Make sure it has the correct permissions

### Step 4: Run the Webhook Server

```bash
node webhook-thumbnail-server.js
```

The server will start on `http://localhost:3001`

### Step 5: Set Up Public Access (Optional)

For remote access, your business partner can:

**Option A: Use ngrok (Recommended)**
```bash
# Install ngrok
npm install -g ngrok

# In another terminal, expose the local server
ngrok http 3001
```

**Option B: Deploy to cloud service**
- Deploy to Heroku, Railway, or Vercel
- Update the webhook URL in the Hash website settings

### Step 6: Configure Webhook URL

In the Hash website:
1. Open browser console (F12)
2. Set the webhook URL:
```javascript
localStorage.setItem('thumbnailWebhookUrl', 'https://your-partner-ngrok-url.ngrok.io/generate-thumbnail');
```

## 🔧 How It Works

1. **Event Created**: When someone creates an event on Hash website
2. **Webhook Sent**: Firebase sends a webhook to your partner's server
3. **Thumbnail Generated**: Partner's server runs Python script
4. **Upload Complete**: Thumbnail uploaded to Firebase Storage

## 📊 Monitoring

Your business partner can monitor:
- **Server Status**: `http://localhost:3001/status`
- **Health Check**: `http://localhost:3001/health`
- **Console Logs**: Real-time processing logs

## 🔍 Testing

Test the setup:
```bash
curl -X POST http://localhost:3001/generate-thumbnail \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "test123",
    "collection": "testEvents",
    "action": "generate_thumbnail"
  }'
```

## 🛠️ Troubleshooting

### Common Issues:

**1. "Python script not found"**
- Make sure `generate_thumbnails.py` is in the same directory
- Check Python path: `which python3`

**2. "Firebase permission denied"**
- Verify `serviceAccountKey.json` has Storage Admin permissions
- Check file path and permissions

**3. "Webhook not receiving requests"**
- Make sure ngrok/server is publicly accessible
- Check firewall settings
- Verify webhook URL is correct

**4. "Module not found"**
```bash
npm install express firebase-admin
pip install firebase-admin pillow
```

## 🚀 Production Setup

For permanent setup:

1. **Use PM2** for process management:
```bash
npm install -g pm2
pm2 start webhook-thumbnail-server.js --name "hash-thumbnails"
pm2 startup
pm2 save
```

2. **Use stable tunnel service**:
- Set up dedicated server (VPS)
- Use domain name instead of ngrok
- Configure SSL certificate

## 📞 Support

If your business partner needs help:
1. Check the console logs for errors
2. Verify all dependencies are installed
3. Test with the curl command above
4. Make sure webhook URL is accessible from internet

## 🎉 Success

When working correctly, you'll see:
- ✅ Webhook server running on port 3001
- ✅ Thumbnails generated automatically
- ✅ Files uploaded to Firebase Storage
- ✅ Real-time processing logs

Your business partner can now handle thumbnail generation remotely! 🚀