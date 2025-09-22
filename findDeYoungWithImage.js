// Script to find any de Young event that has an image
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findDeYoungWithImage() {
  console.log('🔍 Searching for de Young Museum events with images...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      // Search for all de Young events
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} total de Young events`);
      
      let foundWithImage = false;
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if it has an image
        if (data.event_image) {
          console.log(`\n  📍 FOUND event with image:`);
          console.log(`     Title: ${data.title}`);
          console.log(`     Date: ${data.date}`);
          console.log(`     Venue: ${data.venue}`);
          console.log(`     Image URL: ${data.event_image}`);
          foundWithImage = true;
        }
      });
      
      if (!foundWithImage) {
        console.log(`  ❌ No de Young events with images found in ${collectionName}`);
      }
      
    } catch (error) {
      console.error(`❌ Error searching ${collectionName}:`, error);
    }
  }
  
  // Also check Legion of Honor events for reference
  console.log(`\n📂 Checking Legion of Honor events for reference...`);
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'Legion of Honor')
        .get();
      
      console.log(`  Found ${snapshot.size} Legion of Honor events`);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        if (data.event_image) {
          console.log(`\n  📍 Legion of Honor event with image:`);
          console.log(`     Title: ${data.title}`);
          console.log(`     Date: ${data.date}`);
          console.log(`     Image URL: ${data.event_image}`);
        }
      });
      
    } catch (error) {
      console.error(`❌ Error searching Legion of Honor:`, error);
    }
  }
}

// Run the search
findDeYoungWithImage().then(() => {
  console.log('\n✅ Search completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});