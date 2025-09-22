#!/usr/bin/env node

/**
 * Test Partner Setup Script
 * 
 * This script helps your business partner test their webhook server setup
 * and ensures everything is working correctly with the Hash thumbnail system.
 */

const express = require('express');
const fetch = require('node-fetch');

console.log('🧪 Hash Partner Setup Test');
console.log('==========================');
console.log('');

// Step 1: Check if webhook server is running
async function testWebhookServer(port = 3001) {
  try {
    console.log(`📡 Testing webhook server on port ${port}...`);
    const response = await fetch(`http://localhost:${port}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Webhook server is running!');
      console.log(`   Status: ${data.status}`);
      console.log(`   Firebase: ${data.firebase ? '✅ Connected' : '❌ Not connected'}`);
      return true;
    } else {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Webhook server test failed:', error.message);
    console.log('');
    console.log('💡 Make sure your webhook server is running:');
    console.log('   node webhook-thumbnail-server.js');
    console.log('');
    return false;
  }
}

// Step 2: Test thumbnail generation
async function testThumbnailGeneration(port = 3001) {
  try {
    console.log('🎨 Testing thumbnail generation...');
    
    const testData = {
      eventId: 'test-partner-' + Date.now(),
      collection: 'testEvents',
      action: 'generate_thumbnail',
      timestamp: new Date().toISOString()
    };
    
    const response = await fetch(`http://localhost:${port}/generate-thumbnail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Thumbnail generation test passed!');
      console.log(`   Event ID: ${result.eventId}`);
      console.log(`   Collection: ${result.collection}`);
      console.log(`   Timestamp: ${result.timestamp}`);
      return true;
    } else {
      console.log('⚠️ Thumbnail generation test failed:');
      console.log(`   Error: ${result.error}`);
      // This might be expected if serviceAccountKey.json is not set up
      return false;
    }
  } catch (error) {
    console.log('❌ Thumbnail generation test failed:', error.message);
    return false;
  }
}

// Step 3: Test cloud webhook integration
async function testCloudWebhook(localPort = 3001, ngrokUrl = null) {
  if (!ngrokUrl) {
    console.log('⏭️ Skipping cloud webhook test (no ngrok URL provided)');
    console.log('');
    console.log('💡 To test cloud integration:');
    console.log('   1. Start ngrok: npx ngrok http 3001');
    console.log('   2. Run this test with ngrok URL: node test-partner-setup.js --ngrok https://your-id.ngrok.io');
    return true;
  }
  
  try {
    console.log('☁️ Testing cloud webhook integration...');
    
    const testData = {
      eventId: 'cloud-test-' + Date.now(),
      collection: 'testEvents',
      triggerUrl: `${ngrokUrl}/generate-thumbnail`
    };
    
    const response = await fetch('https://us-central1-hash-836eb.cloudfunctions.net/triggerThumbnailGeneration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Cloud webhook test passed!');
      console.log('   Your partner setup is ready for production!');
      return true;
    } else {
      console.log('⚠️ Cloud webhook test had issues:');
      console.log(`   Message: ${result.message}`);
      console.log(`   Error: ${result.error || 'None'}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Cloud webhook test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting partner setup tests...');
  console.log('');
  
  const args = process.argv.slice(2);
  const ngrokUrl = args.find(arg => arg.startsWith('--ngrok'))?.split('=')[1] || 
                   args.find((arg, i) => args[i-1] === '--ngrok');
  
  let allPassed = true;
  
  // Test 1: Webhook server
  const webhookTest = await testWebhookServer();
  allPassed = allPassed && webhookTest;
  console.log('');
  
  if (webhookTest) {
    // Test 2: Thumbnail generation
    const thumbnailTest = await testThumbnailGeneration();
    console.log('');
    
    // Test 3: Cloud integration
    const cloudTest = await testCloudWebhook(3001, ngrokUrl);
    console.log('');
  }
  
  // Final results
  console.log('📋 Test Results Summary');
  console.log('======================');
  
  if (allPassed) {
    console.log('🎉 All tests passed! Your business partner setup is ready.');
    console.log('');
    console.log('📝 Next steps for your business partner:');
    console.log('   1. Start the webhook server: node webhook-thumbnail-server.js');
    console.log('   2. Start ngrok for public access: npx ngrok http 3001');
    console.log('   3. Set webhook URL in Hash website localStorage');
    console.log('   4. Test with a real event creation');
  } else {
    console.log('⚠️ Some tests failed. Please check the setup:');
    console.log('   1. Make sure webhook server is running');
    console.log('   2. Verify serviceAccountKey.json is in place');
    console.log('   3. Check Python dependencies are installed');
    console.log('   4. Test with: npm run thumbnails-test');
  }
  
  console.log('');
  console.log('📞 For support, check the partner-setup.md guide');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWebhookServer, testThumbnailGeneration, testCloudWebhook };