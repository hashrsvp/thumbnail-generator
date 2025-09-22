#!/usr/bin/env node

/**
 * Webhook Thumbnail Server
 * 
 * A simple HTTP server that receives webhook requests to generate thumbnails.
 * Your business partner can run this to handle thumbnail generation remotely.
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const admin = require('firebase-admin');

const app = express();
app.use(express.json());

// Initialize Firebase (business partner will need their own service account key)
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;
  
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "hash-836eb.appspot.com"
    });
    firebaseInitialized = true;
    console.log("🔥 Firebase initialized successfully");
  } catch (error) {
    console.log("⚠️ Firebase initialization failed, continuing without it");
    console.log("   Make sure serviceAccountKey.json is in the parent directory");
  }
}

function runThumbnailScript(eventId, collection) {
  return new Promise((resolve, reject) => {
    console.log(`🐍 Running thumbnail generator for ${collection}/${eventId}`);
    
    const scriptPath = path.join(__dirname, 'generate_thumbnails.py');
    const process = spawn('python3', [
      scriptPath,
      '--event-id', eventId,
      '--collection', collection,
      '--verbose'
    ]);
    
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      const text = data.toString().trim();
      console.log(`📝 ${text}`);
      output += text;
    });
    
    process.stderr.on('data', (data) => {
      const text = data.toString().trim();
      console.error(`⚠️ ${text}`);
      error += text;
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Thumbnail generated successfully for ${eventId}`);
        resolve({ success: true, output });
      } else {
        console.error(`❌ Thumbnail generation failed for ${eventId} (code: ${code})`);
        reject(new Error(`Process failed: ${error}`));
      }
    });
    
    process.on('error', (err) => {
      console.error(`❌ Failed to start Python script: ${err.message}`);
      reject(err);
    });
  });
}

// Webhook endpoint
app.post('/generate-thumbnail', async (req, res) => {
  const { eventId, collection, action, timestamp } = req.body;
  
  console.log(`\n🎯 Webhook received: ${action} for ${collection}/${eventId}`);
  console.log(`⏰ Timestamp: ${timestamp}`);
  
  if (!eventId || !collection) {
    return res.status(400).json({
      success: false,
      error: 'Missing eventId or collection'
    });
  }
  
  try {
    const result = await runThumbnailScript(eventId, collection);
    
    // Update Firestore if Firebase is initialized
    if (firebaseInitialized) {
      try {
        await admin.firestore()
          .collection(collection)
          .doc(eventId)
          .update({
            thumbnailGenerated: true,
            thumbnailGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
            thumbnailGeneratedBy: 'webhook-server'
          });
        console.log(`📝 Updated Firestore document for ${eventId}`);
      } catch (firestoreError) {
        console.error(`❌ Failed to update Firestore: ${firestoreError.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Thumbnail generated for ${eventId}`,
      eventId,
      collection,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Error processing webhook: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      eventId,
      collection
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Hash Webhook Thumbnail Server',
    firebase: firebaseInitialized,
    timestamp: new Date().toISOString()
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'Hash Webhook Thumbnail Server',
    status: 'running',
    firebase: firebaseInitialized,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('\n🎨 Hash Webhook Thumbnail Server');
  console.log('================================');
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📞 Webhook endpoint: http://localhost:${PORT}/generate-thumbnail`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
  console.log('\n🚀 Ready to receive thumbnail generation requests!');
  console.log('⏹️  Press Ctrl+C to stop\n');
  
  // Initialize Firebase
  initializeFirebase();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down webhook server...');
  console.log('✅ Goodbye!');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});