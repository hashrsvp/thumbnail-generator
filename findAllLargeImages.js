// Script to find ALL large images in Firebase Storage for de Young events
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function findAllLargeImages() {
  console.log('🔍 Scanning ALL de Young event images for large files...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  let largeImages = [];
  let totalChecked = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Scanning ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventID = doc.id;
        const imagePath = `${collectionName}/${eventID}/event_image.png`;
        
        try {
          const file = bucket.file(imagePath);
          const [metadata] = await file.getMetadata();
          const sizeInMB = metadata.size / 1024 / 1024;
          
          totalChecked++;
          
          if (sizeInMB > 1.0) {
            largeImages.push({
              path: imagePath,
              eventId: eventID,
              title: data.title,
              date: data.date,
              size: sizeInMB,
              contentType: metadata.contentType
            });
            console.log(`  ⚠️  LARGE: ${imagePath} - ${sizeInMB.toFixed(2)} MB`);
          } else {
            console.log(`  ✅ OK: ${imagePath} - ${sizeInMB.toFixed(2)} MB`);
          }
          
        } catch (error) {
          console.log(`  ❌ ERROR: ${imagePath} - ${error.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error scanning ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📊 Total images checked: ${totalChecked}`);
  console.log(`⚠️  Large images found: ${largeImages.length}`);
  
  if (largeImages.length > 0) {
    console.log(`\n🚨 LARGE IMAGES THAT NEED FIXING:`);
    largeImages.forEach(img => {
      console.log(`   ${img.path} - ${img.size.toFixed(2)} MB`);
    });
  } else {
    console.log(`\n✅ All images are under 1MB!`);
  }
}

findAllLargeImages().then(() => {
  console.log('\n✅ Scan completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});