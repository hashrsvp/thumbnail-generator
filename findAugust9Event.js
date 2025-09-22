// Script to find the August 9th de Young event and check its exact date format
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findAugust9Event() {
  console.log('🔍 Searching for August 9th 2025 de Young Museum events...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      // Search for all de Young events and filter by date
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} total de Young events`);
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const eventDate = data.date;
        
        // Check if it's August 9th, 2025
        if (eventDate && eventDate.includes('2025-08-09')) {
          console.log(`\n  📍 FOUND August 9th event:`);
          console.log(`     Title: ${data.title}`);
          console.log(`     Date: ${data.date}`);
          console.log(`     Venue: ${data.venue}`);
          console.log(`     Has image: ${data.event_image ? 'YES' : 'NO'}`);
          if (data.event_image) {
            console.log(`     Image URL: ${data.event_image}`);
          }
        }
      });
      
    } catch (error) {
      console.error(`❌ Error searching ${collectionName}:`, error);
    }
  }
}

// Run the search
findAugust9Event().then(() => {
  console.log('\n✅ Search completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});