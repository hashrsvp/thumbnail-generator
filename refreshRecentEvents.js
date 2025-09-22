// Script to refresh events created in the last 24 hours that might not be showing
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function refreshRecentEvents() {
  console.log('🔍 Looking for events created in the last 24 hours...');
  
  // Get events from the last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  const collections = ['austinEvents', 'bayAreaEvents'];
  let totalRefreshed = 0;
  
  for (const collectionName of collections) {
    console.log(`\n📂 Checking ${collectionName}...`);
    
    try {
      // Query for recent events (you might need to adjust this based on your date field)
      const snapshot = await db.collection(collectionName)
        .where('date', '>=', oneDayAgo.toISOString())
        .get();
      
      console.log(`Found ${snapshot.size} recent events in ${collectionName}`);
      
      // Process each event individually
      for (const doc of snapshot.docs) {
        const data = doc.data();
        console.log(`  Refreshing: ${data.title} on ${data.date}`);
        
        // Just add a timestamp to trigger refresh
        await doc.ref.update({
          refreshedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        totalRefreshed++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Refreshed ${snapshot.size} events in ${collectionName}`);
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n✨ Total events refreshed: ${totalRefreshed}`);
  console.log('\n📱 Now in your iOS app:');
  console.log('1. Force quit the app (swipe up and remove)');
  console.log('2. Reopen the app');
  console.log('3. Pull down to refresh the events list');
  console.log('\nThe events should now appear!');
}

// Run the refresh
refreshRecentEvents().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});