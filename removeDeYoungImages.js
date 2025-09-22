// Script to remove images from de Young Museum events from 8/16/2025 to end of year
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function removeDeYoungImages() {
  console.log('🗑️ Removing images from de Young Museum events (8/16/2025 to end of year)...\n');
  
  const startDate = new Date('2025-08-16T00:00:00Z');
  const endDate = new Date('2025-12-31T23:59:59Z');
  
  console.log(`📅 Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
  
  const collections = ['bayAreaEvents', 'events'];
  let totalProcessed = 0;
  let totalImagesRemoved = 0;
  
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
        
        // Parse event date
        let eventDate;
        if (data.date) {
          eventDate = new Date(data.date);
        } else if (data.startDateTimestamp) {
          eventDate = data.startDateTimestamp.toDate();
        } else {
          console.log(`  ⚠️ ${data.title} (${eventID}): No date found, skipping`);
          continue;
        }
        
        // Check if event is in our target date range
        if (eventDate >= startDate && eventDate <= endDate) {
          console.log(`  📍 ${data.title} (${eventDate.toISOString().split('T')[0]})`);
          totalProcessed++;
          
          const imagePath = `${collectionName}/${eventID}/event_image.png`;
          
          try {
            // Check if image exists in storage
            const file = bucket.file(imagePath);
            const [exists] = await file.exists();
            
            if (exists) {
              // Delete image from storage
              await file.delete();
              console.log(`     🗑️ Deleted image from storage: ${imagePath}`);
              totalImagesRemoved++;
            } else {
              console.log(`     ℹ️ No image file found in storage`);
            }
            
            // Remove image reference from database
            const updateData = {
              imageRemoved: admin.firestore.FieldValue.serverTimestamp(),
              imageRemovedReason: 'Preparing for re-upload'
            };
            
            // Remove event_image field if it exists
            if (data.event_image) {
              updateData.event_image = admin.firestore.FieldValue.delete();
              console.log(`     🗑️ Removed image URL from database`);
            }
            
            await doc.ref.update(updateData);
            
          } catch (error) {
            console.error(`     ❌ Error removing image for ${eventID}:`, error.message);
          }
          
        } else {
          console.log(`  ⏭️ ${data.title} (${eventDate.toISOString().split('T')[0]}): Outside date range, skipping`);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`📊 Total events processed: ${totalProcessed}`);
  console.log(`🗑️ Total images removed: ${totalImagesRemoved}`);
  console.log(`✅ Ready for fresh image uploads!`);
  console.log(`\n💡 Storage configuration remains stable for uploads`);
}

removeDeYoungImages().then(() => {
  console.log('\n✅ Image removal completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});