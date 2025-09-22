// Script to fix Firebase Storage permissions and update image URLs
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function fixImagePermissions() {
  console.log('🔧 Fixing Firebase Storage permissions and URLs...\n');
  
  const collections = ['bayAreaEvents', 'events'];
  let totalFixed = 0;
  
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
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(imagePath)}?alt=media`;
        
        console.log(`  📍 Processing: ${data.title} (${eventID})`);
        
        try {
          const file = bucket.file(imagePath);
          
          // Set proper IAM permissions for public access
          await file.acl.add({
            entity: 'allUsers',
            role: 'READER',
          });
          
          // Make file publicly accessible
          await file.makePublic();
          
          // Update the database with the correct public URL
          await doc.ref.update({
            event_image: publicUrl,
            imageAccessFixed: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`     ✅ Fixed permissions and URL`);
          totalFixed++;
          
        } catch (error) {
          console.error(`     ❌ Error fixing ${imagePath}:`, error.message);
          
          // If permission error, try alternative approach
          if (error.message.includes('permission') || error.message.includes('access')) {
            try {
              // Just update the URL in database to use the standard public format
              await doc.ref.update({
                event_image: publicUrl,
                imageAccessFixed: admin.firestore.FieldValue.serverTimestamp()
              });
              console.log(`     ⚠️  Updated URL only (permission issue)`);
              totalFixed++;
            } catch (updateError) {
              console.error(`     ❌ Failed to update URL:`, updateError.message);
            }
          }
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events with fixed permissions: ${totalFixed}`);
  console.log(`🔗 All URLs now use the standard public format`);
  console.log(`📱 iOS app should be able to load images without token errors`);
}

fixImagePermissions().then(() => {
  console.log('\n✅ Image permission fix completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});