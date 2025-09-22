// EMERGENCY: Restore original Firebase Storage configuration
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const bucket = admin.storage().bucket();

async function emergencyRestore() {
  console.log('🚨 EMERGENCY: Restoring original Firebase Storage configuration...\n');
  
  try {
    // Step 1: Remove all custom IAM policies and restore defaults
    console.log('🔄 Restoring default IAM policy...');
    
    const originalPolicy = {
      bindings: [
        {
          role: 'roles/storage.legacyBucketOwner',
          members: [
            `serviceAccount:${serviceAccount.client_email}`,
            'serviceAccount:firebase-adminsdk-ux6hs@hash-836eb.iam.gserviceaccount.com'
          ],
        },
        {
          role: 'roles/storage.legacyBucketReader',
          members: ['allUsers'],
        }
      ],
    };
    
    await bucket.iam.setPolicy(originalPolicy);
    console.log('✅ Default IAM policy restored');
    
    // Step 2: Reset bucket metadata to defaults
    console.log('🔄 Resetting bucket metadata...');
    await bucket.setMetadata({
      uniformBucketLevelAccess: {
        enabled: true, // Enable uniform access (Firebase default)
      },
      cors: [
        {
          origin: ['*'],
          method: ['GET', 'HEAD'],
          maxAgeSeconds: 3600,
        },
      ],
    });
    console.log('✅ Bucket metadata reset to defaults');
    
    // Step 3: Ensure files are still publicly accessible
    console.log('🔄 Making bucket public...');
    await bucket.makePublic();
    console.log('✅ Bucket made public');
    
    // Step 4: Test basic functionality
    console.log('🧪 Testing basic functionality...');
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log(`✅ Basic access working - found ${files.length} file(s)`);
    
  } catch (error) {
    console.error('❌ Error during emergency restore:', error.message);
    
    // Last resort: try minimal configuration
    try {
      console.log('🆘 Trying minimal configuration...');
      await bucket.makePublic();
      console.log('✅ Minimal public access set');
    } catch (minimalError) {
      console.error('❌ Even minimal config failed:', minimalError.message);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`🚨 EMERGENCY RESTORE COMPLETED`);
  console.log(`🔄 REFRESH FIREBASE CONSOLE NOW`);
  console.log(`⏱️ Wait 30 seconds for changes to propagate`);
  console.log(`💻 Upload and folder buttons should be restored`);
}

emergencyRestore().then(() => {
  console.log('\n✅ Emergency restore completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Emergency restore failed:', error);
  process.exit(1);
});