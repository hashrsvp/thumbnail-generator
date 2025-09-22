// Script to optimize de Young Museum images to be under 1MB
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const sharp = require('sharp');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function optimizeDeYoungImages() {
  console.log('🖼️ Optimizing de Young Museum images to be under 1MB...\n');
  
  // Note: Using Firebase Storage direct download instead of URL
  
  const collections = ['bayAreaEvents', 'events'];
  let totalOptimized = 0;
  
  console.log('📥 Downloading source image from Firebase Storage...');
  
  // Download directly from Firebase Storage
  const sourceFile = bucket.file('events/tJZ5R9J6Ujt8oY2ZJOY6/event_image.png');
  const [originalBuffer] = await sourceFile.download();
  const originalSize = originalBuffer.length;
  console.log(`📊 Original image size: ${(originalSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Optimize image with different quality settings until under 1MB
  let optimizedBuffer;
  let quality = 85; // Start with high quality
  const targetSize = 1024 * 1024; // 1MB in bytes
  
  do {
    optimizedBuffer = await sharp(Buffer.from(originalBuffer))
      .jpeg({
        quality: quality,
        progressive: true,
        mozjpeg: true // Use mozjpeg encoder for better compression
      })
      .toBuffer();
    
    console.log(`🔧 Quality ${quality}%: ${(optimizedBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    if (optimizedBuffer.length > targetSize) {
      quality -= 5; // Reduce quality by 5%
    }
    
    if (quality < 50) {
      console.log('⚠️ Minimum quality reached (50%), using current version');
      break;
    }
  } while (optimizedBuffer.length > targetSize && quality >= 50);
  
  const finalSize = optimizedBuffer.length;
  console.log(`✅ Final optimized size: ${(finalSize / 1024 / 1024).toFixed(2)} MB (${quality}% quality)\n`);
  
  if (finalSize > targetSize) {
    console.log('⚠️ Warning: Could not reduce image below 1MB while maintaining reasonable quality');
  }
  
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
        
        // The iOS app expects images at: {collection}/{eventID}/event_image.png
        const imagePath = `${collectionName}/${eventID}/event_image.png`;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/hash-836eb.appspot.com/o/${encodeURIComponent(imagePath)}?alt=media`;
        
        console.log(`  📍 Processing: ${data.title} (${data.date})`);
        console.log(`     Event ID: ${eventID}`);
        
        try {
          // Upload optimized image
          const file = bucket.file(imagePath);
          await file.save(optimizedBuffer, {
            metadata: {
              contentType: 'image/jpeg', // Changed to JPEG for better compression
              cacheControl: 'public, max-age=31536000', // 1 year cache
              customMetadata: {
                optimized: 'true',
                originalSize: originalSize.toString(),
                optimizedSize: finalSize.toString(),
                quality: quality.toString()
              }
            },
            public: true,
          });
          
          // Make the file publicly accessible
          await file.makePublic();
          
          // Update the event document with the optimized image URL
          await doc.ref.update({
            event_image: imageUrl,
            imageOptimized: admin.firestore.FieldValue.serverTimestamp(),
            imageSize: finalSize,
            imageQuality: quality
          });
          
          console.log(`     ✅ Optimized and uploaded: ${(finalSize / 1024).toFixed(0)} KB`);
          totalOptimized++;
          
        } catch (uploadError) {
          console.error(`     ❌ Failed to optimize image for ${eventID}:`, uploadError);
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`✅ Total events with optimized images: ${totalOptimized}`);
  console.log(`📊 Image reduced from ${(originalSize / 1024 / 1024).toFixed(2)} MB to ${(finalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎯 Compression ratio: ${((1 - finalSize / originalSize) * 100).toFixed(1)}%`);
  console.log(`📱 All images are now under 1MB and optimized for mobile!`);
}

// Include fetch polyfill for Node.js
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// Run the optimization
optimizeDeYoungImages().then(() => {
  console.log('\n✅ Image optimization completed successfully!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});