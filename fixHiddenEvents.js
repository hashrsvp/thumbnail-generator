// Script to fix events that are in Firebase but not showing in app
// This will "touch" the events to trigger a refresh

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixHiddenEvents() {
  console.log('🔍 Searching for events that might not be showing...');
  
  const collections = ['austinEvents', 'bayAreaEvents'];
  let totalFixed = 0;
  
  for (const collectionName of collections) {
    console.log(`\n📂 Checking ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      console.log(`Found ${snapshot.size} events in ${collectionName}`);
      
      let count = 0;
      const batch = db.batch();
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Add a small update to trigger refresh
        // This adds/updates a lastUpdated field without changing the actual event data
        batch.update(doc.ref, {
          ...data,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          // Ensure critical fields are present
          startDateTimestamp: data.startDateTimestamp || admin.firestore.Timestamp.fromDate(new Date(data.date)),
          free: data.free === true || data.free === 1 ? true : false
        });
        
        count++;
        
        // Commit batch every 100 documents (Firebase limit is 500)
        if (count % 100 === 0) {
          batch.commit();
          console.log(`Updated ${count} events...`);
        }
      });
      
      // Commit remaining updates
      if (count % 100 !== 0) {
        await batch.commit();
      }
      
      console.log(`✅ Updated ${count} events in ${collectionName}`);
      totalFixed += count;
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n✨ Total events touched: ${totalFixed}`);
  console.log('Events should now appear in the app. Force refresh the app to see them.');
}

// Run the fix
fixHiddenEvents().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});