// Script to copy image from August 9th 2025 de Young event to all other de Young events
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateDeYoungImages() {
  console.log('🔍 Finding image from August 9th 2025 de Young Museum event...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  let referenceImageUrl = null;
  let totalUpdated = 0;
  
  // First, find the August 9th 2025 event to get the reference image
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .where('date', '==', '2025-08-09T07:00:00.000Z')
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        if (data.event_image) {
          referenceImageUrl = data.event_image;
          console.log(`✅ Found reference image: ${referenceImageUrl}`);
          console.log(`   From event: ${data.title} on ${data.date}\n`);
          break;
        }
      }
    } catch (error) {
      console.error(`Error searching ${collectionName}:`, error);
    }
  }
  
  if (!referenceImageUrl) {
    console.log('❌ Could not find image from August 9th 2025 de Young event');
    return;
  }
  
  // Now update all other de Young Museum events with this image
  for (const collectionName of collections) {
    console.log(`📂 Updating ${collectionName}...`);
    
    try {
      // Get all de Young Museum events
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Skip if it already has the same image
        if (data.event_image === referenceImageUrl) {
          console.log(`  ✅ ${data.title} (${data.date}) already has correct image`);
          continue;
        }
        
        // Update the event with the reference image
        await doc.ref.update({
          event_image: referenceImageUrl,
          imageUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`  📷 Updated: ${data.title} (${data.date})`);
        totalUpdated++;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📷 Reference image: ${referenceImageUrl}`);
  console.log(`✅ Total events updated: ${totalUpdated}`);
  console.log(`\n📱 The de Young Museum events should now all have the same image!`);
}

// Run the update
updateDeYoungImages().then(() => {
  console.log('\n✅ Image update completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});