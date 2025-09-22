const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let db;

function initializeFirebase() {
    try {
        const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
        
        if (!fs.existsSync(serviceAccountPath)) {
            throw new Error('Service account key file not found at: ' + serviceAccountPath);
        }
        
        const serviceAccount = require(serviceAccountPath);
        
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
            storageBucket: `${serviceAccount.project_id}.appspot.com`
        });
        
        db = admin.firestore();
        console.log('✅ Firebase Admin SDK initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
        return false;
    }
}

// Initialize Firebase at startup
if (!initializeFirebase()) {
    console.error('❌ Cannot proceed without Firebase connection');
    process.exit(1);
}

// Austin location filter - same logic as HashUtilities.swift
function isAustinEvent(event) {
    const city = event.city || '';
    const address = event.address || '';
    
    // Austin region cities (matching HashUtilities.swift)
    const austinCities = [
        'Austin',
        'Del Valle',
        'Round Rock',
        'Cedar Park',
        'Buda',
        'Pflugerville',
        'Leander',
        'Lakeway'
    ];
    
    // Check if city matches any Austin area cities
    const isCityMatch = austinCities.some(austinCity => 
        city === austinCity
    );
    
    // Check if address contains Austin area terms
    const isAddressMatch = austinCities.some(austinCity => 
        address.includes(austinCity)
    );
    
    return isCityMatch || isAddressMatch;
}

// Create backup before migration
async function createBackup() {
    console.log('📋 Creating backup of current austinEvents collection...');
    
    try {
        const austinEventsSnapshot = await db.collection('austinEvents').get();
        const backupData = {};
        
        austinEventsSnapshot.forEach(doc => {
            backupData[doc.id] = doc.data();
        });
        
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `austinEvents_backup_${timestamp}.json`);
        
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup created: ${backupFile}`);
        console.log(`📊 Backed up ${Object.keys(backupData).length} existing austinEvents documents`);
        
        return Object.keys(backupData).length;
    } catch (error) {
        console.error('❌ Error creating backup:', error.message);
        throw error;
    }
}

// Check if event already exists in austinEvents collection
async function eventExistsInAustinEvents(eventId) {
    try {
        const doc = await db.collection('austinEvents').doc(eventId).get();
        return doc.exists;
    } catch (error) {
        console.error(`❌ Error checking if event ${eventId} exists:`, error.message);
        return false;
    }
}

// Copy events from events to austinEvents collection
async function migrateAustinEvents(dryRun = true) {
    console.log(`\n🚀 Starting Austin events migration (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);
    
    try {
        // Get all events from the main events collection
        console.log('📥 Fetching all events from "events" collection...');
        const eventsSnapshot = await db.collection('events').get();
        console.log(`📊 Found ${eventsSnapshot.size} total events`);
        
        const austinEvents = [];
        const skippedEvents = [];
        const existingEvents = [];
        
        // Filter for Austin events
        console.log('🔍 Filtering for Austin events...');
        for (const doc of eventsSnapshot.docs) {
            const eventData = doc.data();
            const eventId = doc.id;
            
            if (isAustinEvent(eventData)) {
                // Check if event already exists in austinEvents collection
                const exists = await eventExistsInAustinEvents(eventId);
                
                if (exists) {
                    existingEvents.push({
                        id: eventId,
                        title: eventData.title || 'No title',
                        city: eventData.city || 'No city'
                    });
                } else {
                    austinEvents.push({
                        id: eventId,
                        data: eventData
                    });
                }
            } else {
                skippedEvents.push({
                    id: eventId,
                    title: eventData.title || 'No title',
                    city: eventData.city || 'No city'
                });
            }
        }
        
        console.log(`\n📊 MIGRATION SUMMARY:`);
        console.log(`   🎯 Austin events to copy: ${austinEvents.length}`);
        console.log(`   ⚠️  Already exist in austinEvents: ${existingEvents.length}`);
        console.log(`   ⏭️  Non-Austin events (skipped): ${skippedEvents.length}`);
        
        // Show sample of events to be copied
        if (austinEvents.length > 0) {
            console.log(`\n📋 Sample Austin events to be copied:`);
            austinEvents.slice(0, 5).forEach(event => {
                console.log(`   • "${event.data.title || 'No title'}" in ${event.data.city || 'No city'}`);
            });
            if (austinEvents.length > 5) {
                console.log(`   ... and ${austinEvents.length - 5} more events`);
            }
        }
        
        // Show sample of existing events
        if (existingEvents.length > 0) {
            console.log(`\n⚠️  Sample events that already exist in austinEvents:`);
            existingEvents.slice(0, 3).forEach(event => {
                console.log(`   • "${event.title}" in ${event.city} (ID: ${event.id})`);
            });
            if (existingEvents.length > 3) {
                console.log(`   ... and ${existingEvents.length - 3} more existing events`);
            }
        }
        
        if (dryRun) {
            console.log(`\n🔍 DRY RUN COMPLETE - No changes made`);
            console.log(`   Run with --live flag to perform actual migration`);
            return;
        }
        
        // Perform actual migration
        if (austinEvents.length > 0) {
            console.log(`\n💾 Copying ${austinEvents.length} Austin events to austinEvents collection...`);
            
            let batch = db.batch(); // Create first batch
            let batchCount = 0;
            let totalCopied = 0;
            const maxBatchSize = 500; // Firestore batch limit
            
            for (const event of austinEvents) {
                const docRef = db.collection('austinEvents').doc(event.id);
                batch.set(docRef, event.data);
                batchCount++;
                
                // Execute batch when it reaches the limit
                if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    totalCopied += batchCount;
                    console.log(`   ✅ Copied batch of ${batchCount} events (${totalCopied}/${austinEvents.length} total)`);
                    
                    // Create new batch for next iteration
                    batch = db.batch();
                    batchCount = 0;
                }
            }
            
            // Execute remaining batch
            if (batchCount > 0) {
                await batch.commit();
                totalCopied += batchCount;
                console.log(`   ✅ Copied final batch of ${batchCount} events (${totalCopied}/${austinEvents.length} total)`);
            }
            
            console.log(`\n🎉 SUCCESS! Copied ${austinEvents.length} Austin events to austinEvents collection`);
        } else {
            console.log(`\n✨ No new Austin events to copy`);
        }
        
        console.log(`\n📊 FINAL RESULTS:`);
        console.log(`   ✅ Events copied: ${austinEvents.length}`);
        console.log(`   ⚠️  Events already existed: ${existingEvents.length}`);
        console.log(`   📍 Total Austin events in austinEvents collection: ${austinEvents.length + existingEvents.length}`);
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const isLiveRun = args.includes('--live');
    const skipBackup = args.includes('--skip-backup');
    
    console.log('🔥 Austin Events Migration Tool');
    console.log('================================');
    
    try {
        // Create backup unless skipped
        if (!skipBackup) {
            await createBackup();
        } else {
            console.log('⚠️  Skipping backup (--skip-backup flag used)');
        }
        
        // Run migration
        await migrateAustinEvents(!isLiveRun);
        
        if (!isLiveRun) {
            console.log(`\n💡 To perform the actual migration, run:`);
            console.log(`   node migrateAustinEvents.js --live`);
        }
        
        console.log(`\n✅ Migration process completed successfully`);
        
    } catch (error) {
        console.error('\n❌ Migration process failed:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🔥 Austin Events Migration Tool

Usage:
  node migrateAustinEvents.js [options]

Options:
  --live            Perform actual migration (default is dry run)
  --skip-backup     Skip creating backup of austinEvents collection
  --help, -h        Show this help message

Examples:
  node migrateAustinEvents.js                    # Dry run (safe preview)
  node migrateAustinEvents.js --live             # Perform actual migration
  node migrateAustinEvents.js --live --skip-backup  # Live run without backup

Description:
  This script copies Austin-area events from the 'events' collection to the 
  'austinEvents' collection. It uses the same location filtering logic as 
  the iOS app (HashUtilities.swift) to identify Austin events.
  
  The script:
  - Only COPIES events (never deletes from source)
  - Checks for existing events to prevent duplicates  
  - Creates automatic backups before migration
  - Shows detailed progress and summary
  
Requirements:
  - Firebase Admin SDK credentials (service account key)
  - Node.js with firebase-admin package installed
`);
    process.exit(0);
}

// Run the script
main();