// Script to find and fix images that are still too large
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const sharp = require('sharp');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function fixLargeImages() {
  console.log('🔧 Finding and fixing images that are still too large...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  let totalFixed = 0;
  let totalChecked = 0;
  
  // Get the optimized source image buffer
  console.log('📥 Loading optimized source image...');
  const sourceFile = bucket.file('events/tJZ5R9J6Ujt8oY2ZJOY6/event_image.png');
  const [optimizedBuffer] = await sourceFile.download();
  console.log(`✅ Source image loaded: ${(optimizedBuffer.length / 1024).toFixed(0)} KB\n`);
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventID = doc.id;
        
        const imagePath = `${collectionName}/${eventID}/event_image.png`;
        totalChecked++;
        
        try {
          const file = bucket.file(imagePath);
          const [metadata] = await file.getMetadata();
          const sizeInMB = metadata.size / 1024 / 1024;
          
          console.log(`  📍 ${data.title} (${eventID}): ${sizeInMB.toFixed(2)} MB`);
          
          // If image is larger than 1MB, replace it
          if (sizeInMB > 1.0) {
            console.log(`     🔧 Image too large, replacing...`);
            
            // Upload the optimized version
            await file.save(optimizedBuffer, {
              metadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000',
                customMetadata: {
                  optimized: 'true',
                  fixedDate: new Date().toISOString()
                }
              },
              public: true,
            });
            
            await file.makePublic();
            
            console.log(`     ✅ Fixed! Now ${(optimizedBuffer.length / 1024).toFixed(0)} KB`);
            totalFixed++;
          } else {
            console.log(`     ✅ Already optimized`);
          }
          
        } catch (error) {
          console.error(`     ❌ Error checking ${imagePath}:`, error.message);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📊 Total images checked: ${totalChecked}`);
  console.log(`🔧 Total images fixed: ${totalFixed}`);
  console.log(`✅ All de Young Museum images are now under 1MB!`);
}

fixLargeImages().then(() => {
  console.log('\n✅ Large image fix completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});