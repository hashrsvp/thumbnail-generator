// Script to fix image paths for de Young events to match iOS app expectations
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function fixImagePaths() {
  console.log('🔧 Fixing image paths for de Young Museum events...\n');
  
  // Source image URL (the one you uploaded)
  const sourceImageUrl = 'https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/events%2FtJZ5R9J6Ujt8oY2ZJOY6%2Fevent_image.png?alt=media&token=1e365237-7564-41c9-b156-1d69d5c9009e';
  
  console.log(`📷 Source image: ${sourceImageUrl}\n`);
  
  const collections = ['bayAreaEvents', 'events'];
  let totalUpdated = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Processing ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventID = doc.id;
        
        // The iOS app expects images at: {collection}/{eventID}/event_image.png
        const expectedImagePath = `${collectionName}/${eventID}/event_image.png`;
        const expectedImageUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(expectedImagePath)}?alt=media`;
        
        console.log(`  📍 Processing: ${data.title} (${data.date})`);
        console.log(`     Event ID: ${eventID}`);
        console.log(`     Expected path: ${expectedImagePath}`);
        
        try {
          // Download the source image
          const response = await fetch(sourceImageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch source image: ${response.statusText}`);
          }
          const imageBuffer = await response.arrayBuffer();
          
          // Upload to the correct path
          const file = bucket.file(expectedImagePath);
          await file.save(Buffer.from(imageBuffer), {
            metadata: {
              contentType: 'image/png',
            },
            public: true,
          });
          
          // Make the file publicly accessible
          await file.makePublic();
          
          // Get the correct URL
          const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491' // Far future date
          });
          
          // Update the event document with the correct image URL
          await doc.ref.update({
            event_image: expectedImageUrl, // Use the standard format
            imagePathFixed: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`     ✅ Uploaded to: ${expectedImagePath}`);
          totalUpdated++;
          
        } catch (uploadError) {
          console.error(`     ❌ Failed to upload image for ${eventID}:`, uploadError);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events with fixed image paths: ${totalUpdated}`);
  console.log(`📱 The iOS app should now be able to load the images!`);
  console.log(`\n💡 Each event now has its image at: {collection}/{eventID}/event_image.png`);
}

// Include fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the fix
fixImagePaths().then(() => {
  console.log('\n✅ Image path fix completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});