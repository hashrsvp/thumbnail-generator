// Script to check actual file sizes in Firebase Storage
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const bucket = admin.storage().bucket();

async function checkImageSizes() {
  console.log('🔍 Checking actual image sizes in Firebase Storage...\n');
  
  // Check a few sample event image paths
  const samplePaths = [
    'events/en6tPdeVG3UgkVxZEasz/event_image.png',
    'bayAreaEvents/en6tPdeVG3UgkVxZEasz/event_image.png',
    'events/tJZ5R9J6Ujt8oY2ZJOY6/event_image.png'
  ];
  
  for (const path of samplePaths) {
    try {
      const file = bucket.file(path);
      const [metadata] = await file.getMetadata();
      const sizeInMB = (metadata.size / 1024 / 1024).toFixed(2);
      
      console.log(`📁 ${path}`);
      console.log(`   Size: ${sizeInMB} MB`);
      console.log(`   Content-Type: ${metadata.contentType}`);
      console.log(`   Updated: ${metadata.updated}`);
      console.log();
      
    } catch (error) {
      console.log(`❌ ${path}: ${error.message}`);
    }
  }
}

checkImageSizes().then(() => {
  console.log('✅ Check completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});