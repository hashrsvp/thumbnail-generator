// Script to fix category names for Free Museum Day events
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixMuseumCategories() {
  console.log('🔍 Fixing categories for "Free Museum Day" events...\n');
  
  const collections = ['bayAreaEvents', 'austinEvents', 'events'];
  let totalUpdated = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Checking ${collectionName}...`);
    
    try {
      // Search for events with "Free Museum Day" in title or de Young Museum venue
      const titleSnapshot = await db.collection(collectionName)
        .where('title', '==', 'Free Museum Day')
        .get();
      
      const venueSnapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
        
      const legionSnapshot = await db.collection(collectionName)
        .where('venue', '==', 'Legion of Honor')
        .get();
      
      // Combine all docs and remove duplicates
      const allDocs = [...titleSnapshot.docs, ...venueSnapshot.docs, ...legionSnapshot.docs];
      const uniqueDocs = Array.from(new Map(allDocs.map(doc => [doc.id, doc])).values());
      
      console.log(`  Found ${uniqueDocs.length} museum events to update`);
      
      for (const doc of uniqueDocs) {
        const data = doc.data();
        
        // Check if categories need updating
        if (data.categories && data.categories.includes('Art Events')) {
          console.log(`  📍 Updating: ${data.title} on ${data.date}`);
          console.log(`     Old categories: ${data.categories.join(', ')}`);
          
          // Replace "Art Events" with "Art Shows"
          const newCategories = data.categories.map(cat => 
            cat === 'Art Events' ? 'Art Shows' : cat
          );
          
          console.log(`     New categories: ${newCategories.join(', ')}`);
          
          // Update the document
          await doc.ref.update({
            categories: newCategories,
            categoriesUpdated: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`     ✅ Updated!`);
          totalUpdated++;
        } else if (data.categories && data.categories.includes('Art Shows')) {
          console.log(`  ✅ ${data.title} already has correct category "Art Shows"`);
        } else {
          console.log(`  ⚠️  ${data.title} has unexpected categories: ${data.categories}`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events updated: ${totalUpdated}`);
  console.log(`\n📱 To see the events in your iOS app:`);
  console.log(`1. Force quit the Hash app completely`);
  console.log(`2. Reopen the app`);
  console.log(`3. Navigate to "Art Shows" category`);
  console.log(`4. The Free Museum Day events should now appear!`);
}

// Run the fix
fixMuseumCategories().then(() => {
  console.log('\n✅ Category fix completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});