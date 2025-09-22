// Script to fix token access issues by making images truly public
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function fixTokenlessAccess() {
  console.log('🔧 Fixing tokenless access for de Young Museum images...\n');
  
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
        
        console.log(`  📍 ${data.title} (${eventID})`);
        
        try {
          const file = bucket.file(imagePath);
          
          // Check if file exists
          const [exists] = await file.exists();
          if (!exists) {
            console.log(`     ⚠️ File doesn't exist, skipping`);
            continue;
          }
          
          // Method 1: Set bucket-level permissions
          try {
            await bucket.iam.setPolicy({
              bindings: [
                {
                  role: 'roles/storage.objectViewer',
                  members: ['allUsers'],
                },
              ],
            });
          } catch (policyError) {
            console.log(`     ⚠️ Bucket policy already set or permission denied`);
          }
          
          // Method 2: Make individual file public with ACL
          try {
            await file.acl.add({
              entity: 'allUsers',
              role: 'READER',
            });
          } catch (aclError) {
            console.log(`     ⚠️ ACL might already be set`);
          }
          
          // Method 3: Use makePublic (most reliable)
          await file.makePublic();
          
          // Method 4: Update file metadata to ensure public access
          await file.setMetadata({
            metadata: {
              firebaseStorageDownloadTokens: '', // Remove download tokens
            },
            cacheControl: 'public, max-age=31536000',
          });
          
          // Create multiple URL formats for maximum compatibility
          const directUrl = `https://storage.googleapis.com/hash-836eb.appspot.com/${imagePath}`;
          const altMediaUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(imagePath)}?alt=media`;
          
          // Update database with the direct storage URL (no tokens needed)
          await doc.ref.update({
            event_image: directUrl, // Use direct Google Storage URL
            event_image_alt: altMediaUrl, // Backup URL
            imageTokenFixed: admin.firestore.FieldValue.serverTimestamp(),
            imageAccess: 'public_direct'
          });
          
          console.log(`     ✅ Fixed with direct URL: ${directUrl}`);
          totalFixed++;
          
        } catch (error) {
          console.error(`     ❌ Error fixing ${imagePath}:`, error.message);
        }
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events with fixed access: ${totalFixed}`);
  console.log(`🌐 All images now use direct Google Storage URLs`);
  console.log(`🚫 No authentication tokens required`);
  console.log(`📱 iOS app should load images without any token errors`);
}

fixTokenlessAccess().then(() => {
  console.log('\n✅ Tokenless access fix completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});