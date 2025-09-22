# Mai Tai Day 2025 - Image Upload Instructions

## 📸 **Save the Image First**

You need to save the bartender image (the one with the yellow cap making cocktails) to this folder.

### Steps:
1. **Save the image** from your message/browser as: `mai-tai-bartender.jpg`
2. **Place it in**: `/Users/user/Desktop/hash/scripts/`
3. **Run the script**: `node uploadMaiTaiImage.js`

## 🔧 **What the Script Will Do:**

- Upload image as: `events/jhwJ06px3cJMPXWVaCxf/event_image.jpg`
- Upload image as: `events/jhwJ06px3cJMPXWVaCxf/event_thumbnail.jpg`
- Update Firestore document with both URLs
- Make images publicly accessible

## 📁 **Expected File Structure:**
```
/Users/user/Desktop/hash/scripts/
├── mai-tai-bartender.jpg          ← Your image goes here
├── uploadMaiTaiImage.js           ← The script to run
├── uploadEventImage.js            ← Utility functions
└── README-ImageUpload.md          ← This file
```

## 🚀 **After Saving the Image:**
```bash
cd /Users/user/Desktop/hash/scripts
node uploadMaiTaiImage.js
```

The script will handle the rest automatically!