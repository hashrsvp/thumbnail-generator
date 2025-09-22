// Script to upload de Young Museum image and update all events to use it
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadDeYoungImage() {
  console.log('📷 Setting up de Young Museum image for all events...\n');
  
  // For now, we'll use a placeholder image URL since we can't directly upload from the screenshot
  // You'll need to upload the image manually to Firebase Storage first
  
  const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/event_images%2FdeYoungMuseumTickets.jpg?alt=media';
  
  console.log(`🔗 Using image URL: ${imageUrl}\n`);
  
  const collections = ['bayAreaEvents', 'events'];
  let totalUpdated = 0;
  
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
        
        // Update the event with the image
        await doc.ref.update({
          event_image: imageUrl,
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
  console.log(`📷 Image URL: ${imageUrl}`);
  console.log(`✅ Total events updated: ${totalUpdated}`);
  console.log(`\n📱 All de Young Museum events now have the ticket image!`);
  console.log(`\n⚠️  NOTE: You need to manually upload the image to Firebase Storage first:`);
  console.log(`1. Go to Firebase Console > Storage`);
  console.log(`2. Upload the de Young ticket image to event_images/ folder`);
  console.log(`3. Name it: deYoungMuseumTickets.jpg`);
  console.log(`4. Make sure it's publicly accessible`);
}

// Alternative function if you want to provide a different image URL
async function updateWithCustomImageUrl(customImageUrl) {
  console.log(`📷 Updating all de Young events with: ${customImageUrl}\n`);
  
  const collections = ['bayAreaEvents', 'events'];
  let totalUpdated = 0;
  
  for (const collectionName of collections) {
    console.log(`📂 Updating ${collectionName}...`);
    
    try {
      const snapshot = await db.collection(collectionName)
        .where('venue', '==', 'de Young Museum')
        .get();
      
      console.log(`  Found ${snapshot.size} de Young Museum events`);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        await doc.ref.update({
          event_image: customImageUrl,
          imageUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`  📷 Updated: ${data.title} (${data.date})`);
        totalUpdated++;
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n✅ Total events updated: ${totalUpdated}`);
}

// Check if custom image URL provided as command line argument
const customImageUrl = process.argv[2];

if (customImageUrl) {
  updateWithCustomImageUrl(customImageUrl).then(() => {
    console.log('\n✅ Image update completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
} else {
  uploadDeYoungImage().then(() => {
    console.log('\n✅ Setup completed! Please upload the image to Firebase Storage.');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script error:', error);
    process.exit(1);
  });
}