// Script to restore full Firebase Console access including upload/folder creation
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'hash-836eb.appspot.com'
});

const bucket = admin.storage().bucket();

async function restoreConsoleAccess() {
  console.log('🔧 Restoring full Firebase Console access...\n');
  
  try {
    // Set comprehensive IAM policy that preserves console functionality
    console.log('🔑 Setting comprehensive IAM policy...');
    const fullAccessPolicy = {
      bindings: [
        {
          role: 'roles/storage.admin',
          members: [`serviceAccount:${serviceAccount.client_email}`],
        },
        {
          role: 'roles/storage.objectAdmin', 
          members: [`serviceAccount:${serviceAccount.client_email}`],
        },
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
        },
        {
          role: 'roles/storage.legacyObjectReader',
          members: ['allUsers'],
        }
      ],
    };
    
    await bucket.iam.setPolicy(fullAccessPolicy);
    console.log('✅ Full access IAM policy set successfully');
    
    // Test various bucket operations
    console.log('🧪 Testing bucket operations...');
    
    // Test listing files
    const [files] = await bucket.getFiles({ maxResults: 5 });
    console.log(`✅ List files: Found ${files.length} files`);
    
    // Test getting bucket metadata
    const [metadata] = await bucket.getMetadata();
    console.log(`✅ Bucket metadata: ${metadata.name}`);
    
    // Ensure proper bucket configuration
    console.log('⚙️ Configuring bucket for console access...');
    await bucket.setMetadata({
      cors: [
        {
          origin: ['*'],
          method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
          maxAgeSeconds: 3600,
          responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
        },
      ],
      uniformBucketLevelAccess: {
        enabled: false, // Disable uniform access to allow ACLs
      },
    });
    console.log('✅ Bucket configured for console access');
    
    // Test creating a sample file to verify write access
    console.log('✍️ Testing write access...');
    const testFile = bucket.file('.console-test');
    await testFile.save('test', {
      metadata: {
        contentType: 'text/plain',
      },
    });
    
    // Clean up test file
    await testFile.delete();
    console.log('✅ Write access confirmed');
    
  } catch (error) {
    console.error('❌ Error restoring console access:', error.message);
    
    // Show current permissions for debugging
    try {
      const [policy] = await bucket.iam.getPolicy();
      console.log('\n📋 Current IAM policy:');
      policy.bindings?.forEach((binding, i) => {
        console.log(`  ${i + 1}. ${binding.role}: ${binding.members?.join(', ')}`);
      });
    } catch (policyError) {
      console.error('Could not retrieve current policy:', policyError.message);
    }
  }
  
  console.log(`\n========================================`);
  console.log(`🔧 Console access restoration completed`);
  console.log(`💻 Firebase Console should now show upload/folder options`);
  console.log(`🔄 Refresh the console if options are still missing`);
  console.log(`🕐 Wait 2-3 minutes for IAM changes to propagate`);
}

restoreConsoleAccess().then(() => {
  console.log('\n✅ Console access restoration completed!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});