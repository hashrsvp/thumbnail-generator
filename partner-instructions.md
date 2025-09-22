# Hash Thumbnail Generator - Business Partner Instructions

## 🌐 Simple Web Access (Recommended)

Your business partner can access the thumbnail generator from anywhere using this simple web link:

**🔗 Partner Portal:** https://hash-836eb.web.app/partner.html

### How to Use:
1. **Open the link** on any device (phone, tablet, computer)
2. **Enter access key:** `hash-partner-2025`
3. **Click "Generate Thumbnails"** to process all missing thumbnails
4. **Monitor progress** in real-time on the screen

That's it! No technical setup required.

---

## ✨ Features for Your Partner

### 🎯 Simple Interface
- **One-click thumbnail generation** for all events
- **Real-time progress tracking** with live updates
- **Mobile-friendly design** works on any device
- **No downloads or installations** needed

### 🔒 Secure Access
- **Password-protected** with unique partner key
- **Encrypted connections** (HTTPS)
- **Activity logging** for audit trails
- **No sensitive data exposed**

### 📊 Smart Processing
- **Automatic detection** of events needing thumbnails
- **Batch processing** handles multiple events efficiently
- **Error handling** with clear status messages
- **Progress tracking** shows completion status

---

## 📱 Instructions to Share with Your Partner

**Subject: Hash Thumbnail Generator Access**

Hi [Partner Name],

You now have access to the Hash thumbnail generator! Here's how to use it:

### Quick Start:
1. **Go to:** https://hash-836eb.web.app/partner.html
2. **Enter password:** `hash-partner-2025`
3. **Click "Generate Thumbnails"**
4. **Wait for completion** (usually takes 1-2 minutes)

### When to Use:
- After uploading new events through the Hash system
- If you notice events missing thumbnails
- For routine maintenance (weekly/monthly)

### What It Does:
- Finds events without thumbnails automatically
- Creates optimized thumbnails (under 60KB)
- Works with all Hash event images
- Updates Firebase storage instantly

### Support:
- The interface shows real-time progress
- Green messages = success
- Red messages = contact Hash team
- All processing is logged for troubleshooting

**Bookmark this page for easy access!**

---

## 🔧 Advanced Options (Optional)

Your partner can also:

### Process Specific Events:
1. Click "Advanced Options" 
2. Enter specific event ID
3. Choose "Process Specific Event"

### Test Mode (Dry Run):
1. Check "Dry run" option
2. Click generate to see what would be processed
3. No actual changes made

### Check System Status:
- Click "Check Status" to verify service health
- View recent processing history
- Monitor system performance

---

## 🛡️ Security & Access Management

### Access Key Management:
- **Current key:** `hash-partner-2025`
- **Change key:** Update in both the web interface and Cloud Function
- **Revoke access:** Change the key when needed

### Usage Monitoring:
- All requests are logged in Firebase Console
- Track who uses the system and when
- Monitor processing success/failure rates

### Best Practices:
- Share the access key securely (not in plain text emails)
- Use the system during business hours for best performance  
- Bookmark the link for easy access
- Contact Hash team for any issues

---

## 🚀 Technical Details (For Hash Team)

### Cloud Function:
- **Endpoint:** `https://us-central1-hash-836eb.cloudfunctions.net/triggerThumbnailGeneration`
- **Authentication:** Bearer token `hash-partner-2025`
- **Method:** POST for generation, GET for status

### Web Interface:
- **URL:** https://hash-836eb.web.app/partner.html
- **Hosting:** Firebase Hosting
- **Mobile-responsive:** Works on all devices

### Processing:
- Uses Firebase Admin SDK for thumbnail generation
- Sharp library for image optimization
- Maintains aspect ratio, optimizes for 60KB limit
- Processes events in batches to avoid timeouts

### Monitoring:
- All requests logged to Firestore `thumbnailRequests` collection
- Function execution logs in Firebase Console
- Real-time status updates via API polling

---

**🎉 Your partner now has simple, secure access to generate thumbnails from anywhere!**