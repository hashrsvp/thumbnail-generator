// Script to revert back to working Firebase URLs
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();

async function revertToFirebaseUrls() {
  console.log('🔄 Reverting to Firebase URLs with proper tokens...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  let totalReverted = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Processing ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventID = doc.id;
        
        const imagePath = `${collectionName}/${eventID}/event_image.png`;
        const firebaseUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(imagePath)}?alt=media`;
        
        console.log(`  📍 ${data.title} (${eventID})`);
        
        try {
          // Update back to Firebase URLs
          await doc.ref.update({
            event_image: firebaseUrl,
            imageReverted: admin.firestore.FieldValue.serverTimestamp(),
            imageAccess: 'firebase_standard'
          });
          
          console.log(`     ✅ Reverted to Firebase URL`);
          totalReverted++;
          
        } catch (error) {
          console.error(`     ❌ Error reverting ${eventID}:`, error.message);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events reverted: ${totalReverted}`);
  console.log(`🔙 All URLs now use standard Firebase format`);
  console.log(`📱 iOS app should work with original image loading system`);
}

revertToFirebaseUrls().then(() => {
  console.log('\n✅ Revert completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});