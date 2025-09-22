#!/usr/bin/env node

/**
 * Auto Thumbnail Generator
 * 
 * Monitors Firestore for new events and automatically runs the Python thumbnail generator.
 * This runs locally and watches for new events, then generates thumbnails automatically.
 */

const admin = require("firebase-admin");
const { spawn } = require("child_process");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "hash-836eb.appspot.com"
});

const db = admin.firestore();

console.log("🎨 Auto Thumbnail Generator - Started");
console.log("👀 Watching for new events in Firestore...");
console.log("⏹️  Press Ctrl+C to stop");

// Collections to monitor
const collectionsToWatch = ['austinEvents', 'bayAreaEvents', 'testEvents'];

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
        resolve(output);
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

// Process recent events (last 5 minutes)
async function processRecentEvents() {
  console.log("🔍 Checking for recent events without thumbnails...");
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  
  for (const collection of collectionsToWatch) {
    try {
      const snapshot = await db.collection(collection)
        .where('scrapedAt', '>=', fiveMinutesAgo.toISOString())
        .get();
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const eventId = doc.id;
        
        // Check if event has an image but no thumbnail flag
        if ((data.imageUrl || data.event_image) && !data.thumbnailGenerated) {
          console.log(`🎯 Found event needing thumbnail: ${collection}/${eventId}`);
          
          try {
            await runThumbnailScript(eventId, collection);
            
            // Update the document to mark thumbnail as generated
            await doc.ref.update({
              thumbnailGenerated: true,
              thumbnailGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
              thumbnailGeneratedBy: 'auto-script'
            });
            
          } catch (error) {
            console.error(`❌ Failed to process ${eventId}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error checking collection ${collection}:`, error.message);
    }
  }
}

// Set up real-time listeners for new events
function setupRealtimeListeners() {
  collectionsToWatch.forEach(collection => {
    console.log(`👂 Setting up listener for ${collection}`);
    
    db.collection(collection).onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const eventId = change.doc.id;
          
          // Check if this is a new event with an image
          if ((data.imageUrl || data.event_image) && !data.thumbnailGenerated) {
            console.log(`🆕 New event detected: ${collection}/${eventId}`);
            
            // Wait a moment to ensure the event is fully saved
            setTimeout(async () => {
              try {
                await runThumbnailScript(eventId, collection);
                
                // Update the document
                await change.doc.ref.update({
                  thumbnailGenerated: true,
                  thumbnailGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                  thumbnailGeneratedBy: 'auto-script'
                });
                
                console.log(`🎉 Auto-generated thumbnail for ${eventId}`);
                
              } catch (error) {
                console.error(`❌ Auto-generation failed for ${eventId}:`, error.message);
              }
            }, 2000); // 2 second delay
          }
        }
      });
    });
  });
}

// Main execution
async function main() {
  try {
    // Process any recent events first
    await processRecentEvents();
    
    // Then set up real-time monitoring
    setupRealtimeListeners();
    
    console.log("\n🚀 Auto thumbnail generator is now running!");
    console.log("📱 Create events on https://hash-836eb.firebaseapp.com");
    console.log("🖼️ Thumbnails will be generated automatically");
    console.log("⏹️  Press Ctrl+C to stop");
    
  } catch (error) {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down auto thumbnail generator...');
  console.log('✅ Goodbye!');
  process.exit(0);
});

// Start the auto thumbnail generator
main();