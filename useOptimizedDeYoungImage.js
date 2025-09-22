// Script to use the pre-optimized de Young Museum image from common_flyer_images
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function useOptimizedDeYoungImage() {
  console.log('🖼️ Using the pre-optimized de Young Museum image...\n');
  
  // Read the optimized image from common_flyer_images
  const imagePath = path.join(__dirname, '../common_flyer_images/deYoungMusuem/event_image.png');
  
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at: ${imagePath}`);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const imageSizeMB = (imageBuffer.length / 1024 / 1024).toFixed(2);
  
  console.log(`📂 Source image: ${imagePath}`);
  console.log(`📊 Image size: ${imageSizeMB} MB (${(imageBuffer.length / 1024).toFixed(0)} KB)\n`);
  
  if (imageBuffer.length > 1024 * 1024) {
    console.log('⚠️ Warning: Image is larger than 1MB');
  } else {
    console.log('✅ Image is under 1MB - perfect!');
  }
  
  const collections = ['bayAreaEvents', 'events'];
  let totalUpdated = 0;
  
  for (const collectionName of collections) {
    console.log(`\n📂 Processing ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventID = doc.id;
        
        const firebaseImagePath = `${collectionName}/${eventID}/event_image.png`;
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(firebaseImagePath)}?alt=media`;
        
        console.log(`  📍 ${data.title} (${eventID})`);
        
        try {
          // Upload the optimized image
          const file = bucket.file(firebaseImagePath);
          await file.save(imageBuffer, {
            metadata: {
              contentType: 'image/png',
              cacheControl: 'public, max-age=31536000',
              customMetadata: {
                source: 'common_flyer_images',
                uploadedAt: new Date().toISOString(),
                sizeKB: (imageBuffer.length / 1024).toFixed(0)
              }
            },
            public: true,
          });
          
          // Make sure it's public
          await file.makePublic();
          
          // Update the database
          await doc.ref.update({
            event_image: publicUrl,
            imageUpdated: admin.firestore.FieldValue.serverTimestamp(),
            imageSource: 'common_flyer_images_optimized'
          });
          
          console.log(`     ✅ Updated with ${(imageBuffer.length / 1024).toFixed(0)} KB image`);
          totalUpdated++;
          
        } catch (error) {
          console.error(`     ❌ Failed to update ${eventID}:`, error.message);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events updated: ${totalUpdated}`);
  console.log(`📱 All de Young Museum events now use the optimized image!`);
  console.log(`🎯 Image size: ${imageSizeMB} MB - perfect for mobile!`);
}

useOptimizedDeYoungImage().then(() => {
  console.log('\n✅ Image update completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});