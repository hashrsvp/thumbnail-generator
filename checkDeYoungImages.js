// Script to verify that de Young events have the correct image
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDeYoungImages() {
  console.log('🔍 Checking de Young Museum events for images...\n');
  
  const expectedImageUrl = 'https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/events%2FtJZ5R9J6Ujt8oY2ZJOY6%2Fevent_image.png?alt=media&token=1e365237-7564-41c9-b156-1d69d5c9009e';
  
  const collections = ['bayAreaEvents', 'events'];
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      let hasImage = 0;
      let correctImage = 0;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.event_image) {
          hasImage++;
          if (data.event_image === expectedImageUrl) {
            correctImage++;
          } else {
            console.log(`  ⚠️  ${data.title} (${data.date}) has different image: ${data.event_image}`);
          }
        } else {
          console.log(`  ❌ ${data.title} (${data.date}) has NO image`);
        }
      });
      
      console.log(`  ✅ Events with images: ${hasImage}/${snapshot.size}`);
      console.log(`  ✅ Events with correct image: ${correctImage}/${snapshot.size}`);
      
    } catch (error) {
      console.error(`❌ Error checking ${collectionName}:`, error);
    }
  }
  
  console.log(`\n🔗 Expected image URL: ${expectedImageUrl}`);
}

// Run the check
checkDeYoungImages().then(() => {
  console.log('\n✅ Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});