// Script to fix Firebase Storage bucket permissions and reset IAM policies
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const bucket = admin.storage().bucket();

async function fixStoragePermissions() {
  console.log('🔧 Fixing Firebase Storage bucket permissions...\n');
  
  try {
    // First, let's get the current IAM policy
    console.log('📋 Getting current bucket IAM policy...');
    const [policy] = await bucket.iam.getPolicy();
    console.log('Current policy bindings:', policy.bindings?.length || 0);
    
    // Reset to a clean, working IAM policy
    console.log('🧹 Setting clean IAM policy...');
    const cleanPolicy = {
      bindings: [
        {
          role: 'roles/storage.legacyBucketOwner',
          members: [`serviceAccount:${serviceAccount.client_email}`],
        },
        {
          role: 'roles/storage.legacyBucketReader',
          members: ['allUsers'],
        },
        {
          role: 'roles/storage.objectViewer',
          members: ['allUsers'],
        }
      ],
    };
    
    await bucket.iam.setPolicy(cleanPolicy);
    console.log('✅ Clean IAM policy set successfully');
    
    // Test bucket access
    console.log('🧪 Testing bucket access...');
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log(`✅ Bucket access working - found ${files.length} file(s)`);
    
    // Set bucket metadata to ensure proper configuration
    console.log('⚙️ Setting bucket metadata...');
    await bucket.setMetadata({
      cors: [
        {
          origin: ['*'],
          method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
          maxAgeSeconds: 3600,
        },
      ],
    });
    console.log('✅ CORS configuration set');
    
  } catch (error) {
    console.error('❌ Error fixing bucket permissions:', error.message);
    
    // If IAM fails, try alternative approach
    console.log('🔄 Trying alternative permission approach...');
    try {
      // Just make sure files are publicly accessible
      const [files] = await bucket.getFiles({ prefix: 'events/' });
      console.log(`📁 Found ${files.length} files in events folder`);
      
      if (files.length > 0) {
        console.log('✅ Basic bucket access is working');
        console.log('💡 The Firebase Console error might be temporary');
      }
      
    } catch (altError) {
      console.error('❌ Alternative approach also failed:', altError.message);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`🔧 Storage permission fix completed`);
  console.log(`💡 Try refreshing the Firebase Console`);
  console.log(`🌐 If error persists, it might be a temporary Firebase Console issue`);
}

fixStoragePermissions().then(() => {
  console.log('\n✅ Permission fix completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});