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

// Bay Area location filter - INVERSE of Austin filter from HashUtilities.swift
function isBayAreaEvent(event) {
    const city = event.city || '';
    const address = event.address || '';
    
    // Austin region cities (from HashUtilities.swift) - we want to EXCLUDE these
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
    const isCityAustin = austinCities.some(austinCity => 
        city === austinCity
    );
    
    // Check if address contains Austin area terms
    const isAddressAustin = austinCities.some(austinCity => 
        address.includes(austinCity)
    );
    
    // Return true only if this is NOT an Austin event (i.e., it's Bay Area)
    return !isCityAustin && !isAddressAustin;
}

// Create backup before migration
async function createBackup() {
    console.log('📋 Creating backup of current bayAreaEvents collection...');
    
    try {
        const bayAreaEventsSnapshot = await db.collection('bayAreaEvents').get();
        const backupData = {};
        
        bayAreaEventsSnapshot.forEach(doc => {
            backupData[doc.id] = doc.data();
        });
        
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `bayAreaEvents_backup_${timestamp}.json`);
        
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`✅ Backup created: ${backupFile}`);
        console.log(`📊 Backed up ${Object.keys(backupData).length} existing bayAreaEvents documents`);
        
        return Object.keys(backupData).length;
    } catch (error) {
        console.error('❌ Error creating backup:', error.message);
        throw error;
    }
}

// Check if event already exists in bayAreaEvents collection
async function eventExistsInBayAreaEvents(eventId) {
    try {
        const doc = await db.collection('bayAreaEvents').doc(eventId).get();
        return doc.exists;
    } catch (error) {
        console.error(`❌ Error checking if event ${eventId} exists:`, error.message);
        return false;
    }
}

// Copy Bay Area events from events to bayAreaEvents collection
async function migrateBayAreaEvents(dryRun = true) {
    console.log(`\n🚀 Starting Bay Area events migration (${dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);
    
    try {
        // Get all events from the main events collection
        console.log('📥 Fetching all events from "events" collection...');
        const eventsSnapshot = await db.collection('events').get();
        console.log(`📊 Found ${eventsSnapshot.size} total events`);
        
        const bayAreaEvents = [];
        const austinEventsSkipped = [];
        const existingEvents = [];
        
        // Filter for Bay Area events (non-Austin events)
        console.log('🔍 Filtering for Bay Area events (excluding Austin)...');
        for (const doc of eventsSnapshot.docs) {
            const eventData = doc.data();
            const eventId = doc.id;
            
            if (isBayAreaEvent(eventData)) {
                // Check if event already exists in bayAreaEvents collection
                const exists = await eventExistsInBayAreaEvents(eventId);
                
                if (exists) {
                    existingEvents.push({
                        id: eventId,
                        title: eventData.title || 'No title',
                        city: eventData.city || 'No city'
                    });
                } else {
                    bayAreaEvents.push({
                        id: eventId,
                        data: eventData
                    });
                }
            } else {
                // This is an Austin event - skip it
                austinEventsSkipped.push({
                    id: eventId,
                    title: eventData.title || 'No title',
                    city: eventData.city || 'No city'
                });
            }
        }
        
        console.log(`\n📊 MIGRATION SUMMARY:`);
        console.log(`   🌉 Bay Area events to copy: ${bayAreaEvents.length}`);
        console.log(`   ⚠️  Already exist in bayAreaEvents: ${existingEvents.length}`);
        console.log(`   🤠 Austin events (skipped): ${austinEventsSkipped.length}`);
        
        // Validate our filtering worked correctly
        const totalAccountedFor = bayAreaEvents.length + existingEvents.length + austinEventsSkipped.length;
        console.log(`   ✅ Total accounted for: ${totalAccountedFor}/${eventsSnapshot.size}`);
        
        if (totalAccountedFor !== eventsSnapshot.size) {
            console.log(`⚠️  Warning: Mismatch in event counts!`);
        }
        
        // Show sample of events to be copied
        if (bayAreaEvents.length > 0) {
            console.log(`\n📋 Sample Bay Area events to be copied:`);
            bayAreaEvents.slice(0, 5).forEach(event => {
                console.log(`   • "${event.data.title || 'No title'}" in ${event.data.city || 'No city'}`);
            });
            if (bayAreaEvents.length > 5) {
                console.log(`   ... and ${bayAreaEvents.length - 5} more events`);
            }
        }
        
        // Show sample of Austin events being skipped (for verification)
        if (austinEventsSkipped.length > 0) {
            console.log(`\n🤠 Sample Austin events being skipped:`);
            austinEventsSkipped.slice(0, 3).forEach(event => {
                console.log(`   • "${event.title}" in ${event.city} (ID: ${event.id})`);
            });
            if (austinEventsSkipped.length > 3) {
                console.log(`   ... and ${austinEventsSkipped.length - 3} more Austin events`);
            }
        }
        
        // Show sample of existing events
        if (existingEvents.length > 0) {
            console.log(`\n⚠️  Sample events that already exist in bayAreaEvents:`);
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
        if (bayAreaEvents.length > 0) {
            console.log(`\n💾 Copying ${bayAreaEvents.length} Bay Area events to bayAreaEvents collection...`);
            
            let batch = db.batch(); // Create first batch
            let batchCount = 0;
            let totalCopied = 0;
            const maxBatchSize = 500; // Firestore batch limit
            
            for (const event of bayAreaEvents) {
                const docRef = db.collection('bayAreaEvents').doc(event.id);
                batch.set(docRef, event.data);
                batchCount++;
                
                // Execute batch when it reaches the limit
                if (batchCount >= maxBatchSize) {
                    await batch.commit();
                    totalCopied += batchCount;
                    console.log(`   ✅ Copied batch of ${batchCount} events (${totalCopied}/${bayAreaEvents.length} total)`);
                    
                    // Create new batch for next iteration
                    batch = db.batch();
                    batchCount = 0;
                }
            }
            
            // Execute remaining batch
            if (batchCount > 0) {
                await batch.commit();
                totalCopied += batchCount;
                console.log(`   ✅ Copied final batch of ${batchCount} events (${totalCopied}/${bayAreaEvents.length} total)`);
            }
            
            console.log(`\n🎉 SUCCESS! Copied ${bayAreaEvents.length} Bay Area events to bayAreaEvents collection`);
        } else {
            console.log(`\n✨ No new Bay Area events to copy`);
        }
        
        console.log(`\n📊 FINAL RESULTS:`);
        console.log(`   ✅ Bay Area events copied: ${bayAreaEvents.length}`);
        console.log(`   ⚠️  Events already existed: ${existingEvents.length}`);
        console.log(`   🤠 Austin events skipped: ${austinEventsSkipped.length}`);
        console.log(`   📍 Total Bay Area events in bayAreaEvents collection: ${bayAreaEvents.length + existingEvents.length}`);
        
        // Data validation
        console.log(`\n🔍 VALIDATION:`);
        const finalCount = await db.collection('bayAreaEvents').get();
        console.log(`   📊 Final count in bayAreaEvents collection: ${finalCount.size}`);
        
        if (finalCount.size === bayAreaEvents.length + existingEvents.length) {
            console.log(`   ✅ Data validation PASSED - counts match`);
        } else {
            console.log(`   ❌ Data validation FAILED - count mismatch!`);
        }
        
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
    
    console.log('🌉 Bay Area Events Migration Tool');
    console.log('==================================');
    
    try {
        // Create backup unless skipped
        if (!skipBackup) {
            await createBackup();
        } else {
            console.log('⚠️  Skipping backup (--skip-backup flag used)');
        }
        
        // Run migration
        await migrateBayAreaEvents(!isLiveRun);
        
        if (!isLiveRun) {
            console.log(`\n💡 To perform the actual migration, run:`);
            console.log(`   node migrateBayAreaEvents.js --live`);
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
🌉 Bay Area Events Migration Tool

Usage:
  node migrateBayAreaEvents.js [options]

Options:
  --live            Perform actual migration (default is dry run)
  --skip-backup     Skip creating backup of bayAreaEvents collection
  --help, -h        Show this help message

Examples:
  node migrateBayAreaEvents.js                    # Dry run (safe preview)
  node migrateBayAreaEvents.js --live             # Perform actual migration
  node migrateBayAreaEvents.js --live --skip-backup  # Live run without backup

Description:
  This script copies Bay Area events from the 'events' collection to the 
  'bayAreaEvents' collection. It uses INVERSE Austin location filtering 
  to identify Bay Area events (anything that's NOT Austin).
  
  The script:
  - Only COPIES events (never deletes from source)
  - Excludes Austin events (which already exist in austinEvents collection)
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