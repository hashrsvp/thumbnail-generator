// Script to find and fix the "Free Museum Day" events at de Young Museum
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixDeYoungEvents() {
  console.log('🔍 Searching for "Free Museum Day" events at de Young Museum...\n');
  
  const collections = ['bayAreaEvents', 'austinEvents', 'events'];
  let totalFound = 0;
  let totalFixed = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      // Search for events with "Free Museum Day" in title
      const snapshot = await db.collection(collectionName)
        .where('title', '==', 'Free Museum Day')
        .get();
      
      console.log(`  Found ${snapshot.size} "Free Museum Day" events`);
      
      // Also search for de Young in venue
      const venueSnapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
        
      console.log(`  Found ${venueSnapshot.size} events at "de Young Museum"`);
      
      // Process each event
      const allDocs = [...snapshot.docs, ...venueSnapshot.docs];
      const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());
      
      for (const doc of uniqueDocs) {
        const data = doc.data();
        console.log(`\n  📍 Event: ${data.title}`);
        console.log(`     Venue: ${data.venue}`);
        console.log(`     Date: ${data.date}`);
        console.log(`     Address: ${data.address}`);
        console.log(`     Categories: ${data.categories}`);
        console.log(`     Free: ${data.free}`);
        totalFound++;
        
        // Check what might be missing
        const issues = [];
        if (!data.startDateTimestamp) issues.push('Missing startDateTimestamp');
        if (data.free !== true && data.free !== false) issues.push('Invalid free field');
        if (!data.categories || data.categories.length === 0) issues.push('Missing categories');
        
        if (issues.length > 0) {
          console.log(`     ⚠️  Issues: ${issues.join(', ')}`);
          
          // Fix the issues
          const updates = {};
          
          // Fix timestamp if missing
          if (!data.startDateTimestamp && data.date) {
            updates.startDateTimestamp = admin.firestore.Timestamp.fromDate(new Date(data.date));
          }
          
          // Ensure free is boolean
          if (data.free !== true && data.free !== false) {
            updates.free = true; // It's Free Museum Day, so it should be free
          }
          
          // Add categories if missing
          if (!data.categories || data.categories.length === 0) {
            updates.categories = ['Art Shows']; // Museum events are art shows
          }
          
          // Add a refresh timestamp
          updates.lastRefreshed = admin.firestore.FieldValue.serverTimestamp();
          
          // Apply the fixes
          await doc.ref.update(updates);
          console.log(`     ✅ Fixed!`);
          totalFixed++;
        } else {
          // Even if no issues, add a refresh timestamp to trigger sync
          await doc.ref.update({
            lastRefreshed: admin.firestore.FieldValue.serverTimestamp()
          });
          console.log(`     ✅ Refreshed`);
          totalFixed++;
        }
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✨ Total "Free Museum Day" events found: ${totalFound}`);
  console.log(`✅ Total events fixed/refreshed: ${totalFixed}`);
  console.log(`\n📱 To see the events in your iOS app:`);
  console.log(`1. Force quit the Hash app (swipe up and remove)`);
  console.log(`2. Reopen the app`);
  console.log(`3. Navigate to the Art Shows category or search for "Museum"`);
  console.log(`4. The events should now appear!`);
}

// Run the fix
fixDeYoungEvents().then(() => {
  console.log('\n✅ Script completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});