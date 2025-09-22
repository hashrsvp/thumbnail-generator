#!/usr/bin/env node

/**
 * Firebase Duplicate Events Removal Script
 * 
 * Removes duplicate events that have:
 * - Same title (case-insensitive)
 * - Same date
 * - Same venue (case-insensitive)
 * - Same start time
 * 
 * Keeps the event with the most complete data or most recent timestamp.
 */

const admin = require('firebase-admin');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  collections: ['events', 'austinEvents'], // Collections to process
  backupDir: path.join(__dirname, 'backups'),
  batchSize: 500, // Process in batches to avoid memory issues
  rateLimitDelay: 100, // ms between operations
};

// Initialize Firebase Admin
let db;
let storage;

function initializeFirebase(serviceAccountPath) {
  try {
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    
    db = admin.firestore();
    storage = admin.storage();
    console.log(chalk.green('✅ Firebase initialized successfully'));
    return true;
  } catch (error) {
    console.error(chalk.red('❌ Firebase initialization failed:'), error.message);
    return false;
  }
}

function normalizeTitle(title) {
  if (!title || typeof title !== 'string') return '';
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeDate(dateValue) {
  if (!dateValue) return null;
  
  // Handle different date formats
  let dateStr = '';
  if (typeof dateValue === 'string') {
    dateStr = dateValue;
  } else if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    // Firestore Timestamp
    dateStr = dateValue.toDate().toISOString().split('T')[0];
  } else if (dateValue instanceof Date) {
    dateStr = dateValue.toISOString().split('T')[0];
  } else {
    return null;
  }
  
  // Extract just the date part (YYYY-MM-DD)
  return dateStr.split('T')[0];
}

function normalizeVenue(venue) {
  if (!venue || typeof venue !== 'string') return '';
  return venue.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeStartTime(startTime) {
  if (!startTime) return '';
  
  // Handle different time formats
  if (typeof startTime === 'string') {
    // Extract time part if it's a datetime string
    const timeMatch = startTime.match(/T(\d{2}:\d{2})/);
    return timeMatch ? timeMatch[1] : startTime.trim();
  } else if (startTime.toDate && typeof startTime.toDate === 'function') {
    // Firestore Timestamp - convert to HH:MM format
    const date = startTime.toDate();
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (startTime instanceof Date) {
    return `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`;
  }
  
  return '';
}

function createDuplicateKey(event) {
  const title = normalizeTitle(event.title);
  const date = normalizeDate(event.date);
  const venue = normalizeVenue(event.venue);
  const startTime = normalizeStartTime(event.startTime);
  
  if (!title || !date) return null;
  
  return `${title}|||${date}|||${venue}|||${startTime}`;
}

async function checkEventHasImage(eventId) {
  try {
    const bucket = storage.bucket();
    const imagePaths = [
      `events/${eventId}/event_image.png`,
      `events/${eventId}/event_image.jpg`
    ];
    
    for (const imagePath of imagePaths) {
      const file = bucket.file(imagePath);
      const [exists] = await file.exists();
      if (exists) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.warn(`⚠️  Error checking image for event ${eventId}:`, error.message);
    return false;
  }
}

function calculateEventScore(event) {
  let score = 0;
  
  // Score based on data completeness
  const fields = ['title', 'address', 'venue', 'categories', 'ticketsLink', 'startTime'];
  fields.forEach(field => {
    if (event[field] && event[field] !== '' && event[field] !== null) {
      score += 10;
    }
  });
  
  // Bonus for having an image
  if (event.imageUrl || event.image) score += 20;
  
  // Bonus for business user created events (more likely to be official)
  if (event.businessUserId || event.createdBy) score += 15;
  
  // Bonus for events with engagement
  if (event.likes && event.likes > 0) score += event.likes;
  if (event.saves && event.saves > 0) score += event.saves * 2;
  
  return score;
}

async function fetchAllEvents(collectionName) {
  const spinner = ora(`Fetching events from ${collectionName}...`).start();
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const events = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      events.push({
        id: doc.id,
        collection: collectionName,
        ...data
      });
    });
    
    spinner.succeed(`Fetched ${events.length} events from ${collectionName}`);
    return events;
  } catch (error) {
    spinner.fail(`Failed to fetch events from ${collectionName}: ${error.message}`);
    throw error;
  }
}

function findDuplicates(events) {
  const duplicateGroups = new Map();
  const invalidEvents = [];
  
  console.log(chalk.blue('🔍 Analyzing events for duplicates...'));
  
  events.forEach(event => {
    const key = createDuplicateKey(event);
    
    if (!key) {
      invalidEvents.push(event);
      return;
    }
    
    if (!duplicateGroups.has(key)) {
      duplicateGroups.set(key, []);
    }
    
    duplicateGroups.get(key).push(event);
  });
  
  // Filter to only groups with actual duplicates
  const actualDuplicates = new Map();
  duplicateGroups.forEach((group, key) => {
    if (group.length > 1) {
      actualDuplicates.set(key, group);
    }
  });
  
  console.log(chalk.yellow(`⚠️  Found ${invalidEvents.length} events with missing title/date`));
  console.log(chalk.red(`🔄 Found ${actualDuplicates.size} duplicate groups`));
  
  return { duplicateGroups: actualDuplicates, invalidEvents };
}

async function selectEventsToKeep(duplicateGroups) {
  const toDelete = [];
  const toKeep = [];
  
  console.log(chalk.blue('🔍 Checking Firebase Storage images for duplicate events...'));
  
  // Get all unique event IDs from duplicates and check their images
  const allDuplicateEvents = Array.from(duplicateGroups.values()).flat();
  const imageCheckPromises = allDuplicateEvents.map(async (event) => {
    event.hasStorageImage = await checkEventHasImage(event.id);
    return event;
  });
  
  await Promise.all(imageCheckPromises);
  const eventsWithImages = allDuplicateEvents.filter(e => e.hasStorageImage).length;
  console.log(chalk.green(`✅ Image check complete: ${eventsWithImages}/${allDuplicateEvents.length} duplicate events have storage images`));
  
  duplicateGroups.forEach((group, key) => {
    // Custom sorting for image priority and timestamp
    group.sort((a, b) => {
      // Check for Firebase Storage images first, then fallback to document fields
      const hasImageA = a.hasStorageImage || !!(a.imageUrl || a.image);
      const hasImageB = b.hasStorageImage || !!(b.imageUrl || b.image);
      
      // First priority: events with images
      if (hasImageA && !hasImageB) return -1; // a goes first (has image)
      if (!hasImageA && hasImageB) return 1;  // b goes first (has image)
      
      // If both have images or both don't have images, use timestamp
      // Prefer more recent events (higher timestamp)
      const timestampA = a.createdAt?.seconds || a.timestamp?.seconds || a.createdAt || a.timestamp || 0;
      const timestampB = b.createdAt?.seconds || b.timestamp?.seconds || b.createdAt || b.timestamp || 0;
      
      return timestampB - timestampA; // More recent first
    });
    
    // Keep the first (best) event, mark rest for deletion
    const [keepEvent, ...deleteEvents] = group;
    
    toKeep.push(keepEvent);
    toDelete.push(...deleteEvents);
    
    const hasImage = keepEvent.hasStorageImage || !!(keepEvent.imageUrl || keepEvent.image);
    const imageStatus = hasImage ? '🖼️' : '📝';
    console.log(chalk.green(`📌 Keeping: "${keepEvent.title}" (${keepEvent.collection}:${keepEvent.id}) ${imageStatus}`));
    
    deleteEvents.forEach(event => {
      const hasDeleteImage = event.hasStorageImage || !!(event.imageUrl || event.image);
      const deleteImageStatus = hasDeleteImage ? '🖼️' : '📝';
      console.log(chalk.red(`🗑️  Deleting: "${event.title}" (${event.collection}:${event.id}) ${deleteImageStatus}`));
    });
  });
  
  return { toDelete, toKeep };
}

function createBackup(events, filename) {
  if (!fs.existsSync(CONFIG.backupDir)) {
    fs.mkdirSync(CONFIG.backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(CONFIG.backupDir, `${filename}_${timestamp}.json`);
  
  const backupData = {
    timestamp: new Date().toISOString(),
    totalEvents: events.length,
    events: events
  };
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  console.log(chalk.blue(`💾 Backup created: ${backupPath}`));
  
  return backupPath;
}

async function deleteEvents(eventsToDelete, dryRun = false) {
  if (eventsToDelete.length === 0) {
    console.log(chalk.green('✅ No events to delete!'));
    return;
  }
  
  if (dryRun) {
    console.log(chalk.yellow(`🔍 DRY RUN: Would delete ${eventsToDelete.length} duplicate events`));
    return;
  }
  
  // Create backup first
  createBackup(eventsToDelete, 'duplicates_to_delete');
  
  const spinner = ora(`Deleting ${eventsToDelete.length} duplicate events...`).start();
  
  try {
    const batch = db.batch();
    let batchCount = 0;
    
    for (const event of eventsToDelete) {
      const docRef = db.collection(event.collection).doc(event.id);
      batch.delete(docRef);
      batchCount++;
      
      // Commit batch when it reaches limit
      if (batchCount >= 500) {
        await batch.commit();
        spinner.text = `Deleted ${batchCount} events... (${eventsToDelete.length - batchCount} remaining)`;
        batchCount = 0;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, CONFIG.rateLimitDelay));
      }
    }
    
    // Commit remaining events
    if (batchCount > 0) {
      await batch.commit();
    }
    
    spinner.succeed(`Successfully deleted ${eventsToDelete.length} duplicate events`);
  } catch (error) {
    spinner.fail(`Failed to delete events: ${error.message}`);
    throw error;
  }
}

function displaySummary(duplicateGroups, toDelete, toKeep) {
  console.log(chalk.blue('\n📊 SUMMARY'));
  console.log(chalk.blue('=================='));
  console.log(`Duplicate groups found: ${duplicateGroups.size}`);
  console.log(`Events to keep: ${toKeep.length}`);
  console.log(`Events to delete: ${toDelete.length}`);
  
  if (duplicateGroups.size > 0) {
    console.log(chalk.yellow('\n🔍 DUPLICATE GROUPS:'));
    let groupNum = 1;
    duplicateGroups.forEach((group, key) => {
      const [title, date, venue, startTime] = key.split('|||');
      console.log(chalk.cyan(`\nGroup ${groupNum}: "${title}" on ${date}`));
      if (venue) console.log(chalk.gray(`  Venue: ${venue}`));
      if (startTime) console.log(chalk.gray(`  Start Time: ${startTime}`));
      group.forEach((event, index) => {
        const hasImage = event.hasStorageImage || !!(event.imageUrl || event.image);
        const imageStatus = hasImage ? '🖼️' : '📝';
        const status = index === 0 ? chalk.green('[KEEP]') : chalk.red('[DELETE]');
        const timestamp = event.createdAt?.seconds || event.timestamp?.seconds || event.createdAt || event.timestamp;
        const timeStr = timestamp ? new Date(timestamp * 1000).toISOString().split('T')[0] : 'N/A';
        console.log(`  ${status} ${event.collection}:${event.id} ${imageStatus} (${timeStr})`);
      });
      groupNum++;
    });
  }
}

async function main() {
  program
    .version('1.0.0')
    .description('Remove duplicate events from Firebase (same title + date + venue + start time)')
    .option('-d, --dry-run', 'Preview changes without executing')
    .option('-s, --service-account <path>', 'Path to Firebase service account key', './serviceAccountKey.json')
    .option('-c, --collections <collections>', 'Comma-separated list of collections', CONFIG.collections.join(','))
    .parse();

  const options = program.opts();
  
  console.log(chalk.blue('🔥 Firebase Duplicate Events Removal Tool'));
  console.log(chalk.blue('==========================================\n'));
  
  // Initialize Firebase
  if (!initializeFirebase(options.serviceAccount)) {
    process.exit(1);
  }
  
  const collections = options.collections.split(',').map(c => c.trim());
  
  try {
    // Fetch all events from specified collections
    let allEvents = [];
    for (const collection of collections) {
      const events = await fetchAllEvents(collection);
      allEvents = allEvents.concat(events);
    }
    
    console.log(chalk.green(`📋 Total events loaded: ${allEvents.length}`));
    
    // Find duplicates
    const { duplicateGroups, invalidEvents } = findDuplicates(allEvents);
    
    if (duplicateGroups.size === 0) {
      console.log(chalk.green('✅ No duplicate events found!'));
      process.exit(0);
    }
    
    // Select events to keep/delete
    const { toDelete, toKeep } = await selectEventsToKeep(duplicateGroups);
    
    // Display summary
    displaySummary(duplicateGroups, toDelete, toKeep);
    
    if (options.dryRun) {
      console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made'));
      console.log(chalk.yellow('Run without --dry-run flag to execute deletions'));
      process.exit(0);
    }
    
    // Confirm deletion
    const { confirmDelete } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmDelete',
        message: `Are you sure you want to delete ${toDelete.length} duplicate events?`,
        default: false
      }
    ]);
    
    if (!confirmDelete) {
      console.log(chalk.yellow('❌ Operation cancelled by user'));
      process.exit(0);
    }
    
    // Execute deletion
    await deleteEvents(toDelete, false);
    
    console.log(chalk.green('\n✅ Duplicate removal completed successfully!'));
    console.log(chalk.blue(`📁 Backups stored in: ${CONFIG.backupDir}`));
    
  } catch (error) {
    console.error(chalk.red('❌ Error:'), error.message);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});

if (require.main === module) {
  main();
}

module.exports = { findDuplicates, createDuplicateKey, normalizeTitle, normalizeDate, normalizeVenue, normalizeStartTime };