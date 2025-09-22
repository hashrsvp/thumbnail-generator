#!/usr/bin/env node

/**
 * Firebase Repeat Events Creation Script
 * 
 * Creates repeat events based on patterns:
 * - Weekly, bi-weekly, monthly repeats
 * - Custom intervals
 * - Specific dates
 * 
 * Copies all event data including images from Firebase Storage.
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
    backupDir: path.join(__dirname, 'backups'),
    batchSize: 10, // Process images in batches
    rateLimitDelay: 200, // ms between operations
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

// Repeat pattern types
const REPEAT_PATTERNS = {
    WEEKLY: 'weekly',
    BIWEEKLY: 'biweekly', 
    MONTHLY: 'monthly',
    CUSTOM: 'custom'
};

// Date calculation functions
function calculateRepeatDates(startDate, pattern, count, customDays = null) {
    const dates = [];
    const baseDate = new Date(startDate);
    
    for (let i = 1; i <= count; i++) {
        let nextDate = new Date(baseDate);
        
        switch (pattern) {
            case REPEAT_PATTERNS.WEEKLY:
                nextDate.setDate(baseDate.getDate() + (i * 7));
                break;
            case REPEAT_PATTERNS.BIWEEKLY:
                nextDate.setDate(baseDate.getDate() + (i * 14));
                break;
            case REPEAT_PATTERNS.MONTHLY:
                nextDate.setMonth(baseDate.getMonth() + i);
                break;
            case REPEAT_PATTERNS.CUSTOM:
                if (customDays) {
                    nextDate.setDate(baseDate.getDate() + (i * customDays));
                }
                break;
        }
        
        dates.push(nextDate);
    }
    
    return dates;
}

function parseSpecificDates(dateString) {
    const dates = dateString.split(',').map(d => d.trim());
    return dates.map(dateStr => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format: ${dateStr}. Use YYYY-MM-DD format.`);
        }
        return date;
    });
}

// Event validation and fetching
async function validateEventExists(eventId, collections = ['events', 'austinEvents']) {
    for (const collectionName of collections) {
        try {
            const doc = await db.collection(collectionName).doc(eventId).get();
            if (doc.exists) {
                return { collection: collectionName, data: doc.data() };
            }
        } catch (error) {
            console.warn(`Warning: Could not check collection ${collectionName}:`, error.message);
        }
    }
    return null;
}

async function validateBusinessUserPermission(event, currentUserId) {
    // Check if current user is the business user who created the event
    if (event.businessUserId && event.businessUserId === currentUserId) {
        return true;
    }
    
    // Also check createdBy field as fallback
    if (event.createdBy && event.createdBy === currentUserId) {
        return true;
    }
    
    return false;
}

// Event data copying
function copyEventData(originalEvent, newDate) {
    const eventCopy = { ...originalEvent };
    
    // Remove fields that should be unique for each event
    delete eventCopy.documentId;
    
    // Update date-related fields
    const isoFormatter = new Intl.DateTimeFormat('sv-SE'); // YYYY-MM-DD format
    const dateString = isoFormatter.format(newDate);
    
    eventCopy.date = newDate.toISOString();
    eventCopy.startDateTimestamp = admin.firestore.Timestamp.fromDate(newDate);
    
    // If there's an end date, update it maintaining the same duration
    if (originalEvent.endDate && originalEvent.endDateTimestamp) {
        const originalStart = originalEvent.startDateTimestamp.toDate();
        const originalEnd = originalEvent.endDateTimestamp.toDate();
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        const newEndDate = new Date(newDate.getTime() + duration);
        eventCopy.endDate = newEndDate.toISOString();
        eventCopy.endDateTimestamp = admin.firestore.Timestamp.fromDate(newEndDate);
    }
    
    // Update creation timestamp
    eventCopy.createdAt = admin.firestore.Timestamp.now();
    
    // Add repeat event metadata
    eventCopy.isRepeatEvent = true;
    eventCopy.originalEventId = originalEvent.documentId || 'unknown';
    eventCopy.repeatCreatedAt = admin.firestore.Timestamp.now();
    
    return eventCopy;
}

// Image copying functionality
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
                return imagePath;
            }
        }
        
        return null;
    } catch (error) {
        console.warn(`⚠️  Error checking image for event ${eventId}:`, error.message);
        return null;
    }
}

async function copyEventImage(originalEventId, newEventId) {
    try {
        const originalImagePath = await checkEventHasImage(originalEventId);
        if (!originalImagePath) {
            return { success: false, message: 'No image found' };
        }
        
        const bucket = storage.bucket();
        const originalFile = bucket.file(originalImagePath);
        
        // Determine file extension
        const extension = originalImagePath.endsWith('.jpg') ? '.jpg' : '.png';
        const newImagePath = `events/${newEventId}/event_image${extension}`;
        const newFile = bucket.file(newImagePath);
        
        // Copy the file
        await originalFile.copy(newFile);
        
        return { 
            success: true, 
            message: `Image copied from ${originalImagePath} to ${newImagePath}` 
        };
    } catch (error) {
        return { 
            success: false, 
            message: `Failed to copy image: ${error.message}` 
        };
    }
}

// Helper function to determine appropriate collection based on event location
function determineCollectionForEvent(eventData) {
    const city = eventData.city || '';
    const address = eventData.address || '';
    
    // Austin region cities (same logic as iOS app)
    const austinCities = [
        'Austin', 'Del Valle', 'Round Rock', 'Cedar Park', 
        'Buda', 'Pflugerville', 'Leander', 'Lakeway'
    ];
    
    // Check if this is an Austin event
    const isCityAustin = austinCities.includes(city);
    const isAddressAustin = austinCities.some(austinCity => address.includes(austinCity));
    
    if (isCityAustin || isAddressAustin) {
        console.log(`🤠 Event "${eventData.title || 'Untitled'}" detected as Austin event (${city})`);
        return 'austinEvents';
    } else {
        console.log(`🌉 Event "${eventData.title || 'Untitled'}" detected as Bay Area event (${city})`);
        return 'bayAreaEvents';
    }
}

// Main event creation function
async function createRepeatEvent(eventData, targetCollection = null, copyImage = true, originalEventId = null) {
    // Auto-determine collection if not specified
    if (!targetCollection) {
        targetCollection = determineCollectionForEvent(eventData);
        console.log(`📍 Auto-selected collection: ${targetCollection}`);
    }
    try {
        // Create the event document
        const docRef = await db.collection(targetCollection).add(eventData);
        const newEventId = docRef.id;
        
        let imageResult = { success: false, message: 'Image copying disabled' };
        
        // Copy image if requested and original event ID is provided
        if (copyImage && originalEventId) {
            imageResult = await copyEventImage(originalEventId, newEventId);
        }
        
        return {
            success: true,
            eventId: newEventId,
            imageResult: imageResult
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Backup functionality
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

// Interactive mode
async function runInteractiveMode() {
    console.log(chalk.blue('🔄 Interactive Repeat Events Creator'));
    console.log(chalk.blue('=====================================\n'));
    
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'eventId',
            message: 'Enter the Event ID to copy:',
            validate: input => input.length > 0 || 'Event ID is required'
        },
        {
            type: 'list',
            name: 'pattern',
            message: 'Select repeat pattern:',
            choices: [
                { name: 'Weekly (every 7 days)', value: REPEAT_PATTERNS.WEEKLY },
                { name: 'Bi-weekly (every 14 days)', value: REPEAT_PATTERNS.BIWEEKLY },
                { name: 'Monthly (same date each month)', value: REPEAT_PATTERNS.MONTHLY },
                { name: 'Custom interval', value: REPEAT_PATTERNS.CUSTOM },
                { name: 'Specific dates', value: 'specific' }
            ]
        }
    ]);
    
    if (answers.pattern === 'specific') {
        const dateAnswer = await inquirer.prompt([
            {
                type: 'input',
                name: 'dates',
                message: 'Enter specific dates (comma-separated, YYYY-MM-DD format):',
                validate: input => {
                    try {
                        parseSpecificDates(input);
                        return true;
                    } catch (error) {
                        return error.message;
                    }
                }
            }
        ]);
        answers.dates = dateAnswer.dates;
    } else {
        const countAnswer = await inquirer.prompt([
            {
                type: 'number',
                name: 'count',
                message: 'How many repeat events to create:',
                default: 5,
                validate: input => input > 0 && input <= 100 || 'Enter a number between 1 and 100'
            }
        ]);
        answers.count = countAnswer.count;
        
        if (answers.pattern === REPEAT_PATTERNS.CUSTOM) {
            const customAnswer = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'customDays',
                    message: 'Enter custom interval in days:',
                    default: 7,
                    validate: input => input > 0 || 'Enter a positive number'
                }
            ]);
            answers.customDays = customAnswer.customDays;
        }
    }
    
    const confirmAnswer = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'copyImages',
            message: 'Copy event images to repeat events?',
            default: true
        },
        {
            type: 'confirm',
            name: 'proceed',
            message: 'Proceed with creating repeat events?',
            default: false
        }
    ]);
    
    if (!confirmAnswer.proceed) {
        console.log(chalk.yellow('❌ Operation cancelled'));
        return;
    }
    
    return { ...answers, ...confirmAnswer };
}

// Main execution function
async function executeRepeatCreation(options) {
    const { eventId, pattern, count, dates, customDays, copyImages = true, dryRun = false } = options;
    
    console.log(chalk.blue('\n🚀 Starting repeat event creation...'));
    
    // Validate original event
    const spinner = ora('Validating original event...').start();
    const originalEvent = await validateEventExists(eventId);
    
    if (!originalEvent) {
        spinner.fail(`Event with ID "${eventId}" not found`);
        return;
    }
    
    spinner.succeed(`Found event: "${originalEvent.data.title}" in ${originalEvent.collection}`);
    
    // Calculate target dates
    let targetDates = [];
    
    if (dates) {
        targetDates = parseSpecificDates(dates);
    } else {
        const originalDate = originalEvent.data.startDateTimestamp ? 
            originalEvent.data.startDateTimestamp.toDate() : 
            new Date(originalEvent.data.date);
        
        targetDates = calculateRepeatDates(originalDate, pattern, count, customDays);
    }
    
    console.log(chalk.blue(`\n📅 Will create ${targetDates.length} repeat events:`));
    targetDates.forEach((date, index) => {
        console.log(`  ${index + 1}. ${date.toDateString()}`);
    });
    
    if (dryRun) {
        console.log(chalk.yellow('\n🔍 DRY RUN MODE - No events will be created'));
        return;
    }
    
    // Create repeat events
    const results = [];
    const progressSpinner = ora(`Creating repeat events (0/${targetDates.length})...`).start();
    
    for (let i = 0; i < targetDates.length; i++) {
        const targetDate = targetDates[i];
        progressSpinner.text = `Creating repeat events (${i + 1}/${targetDates.length})...`;
        
        // Copy event data with new date
        const eventData = copyEventData(originalEvent.data, targetDate);
        
        // Create the repeat event
        const result = await createRepeatEvent(
            eventData, 
            originalEvent.collection, 
            copyImages, 
            eventId
        );
        
        results.push({
            date: targetDate.toDateString(),
            success: result.success,
            eventId: result.eventId || null,
            imageResult: result.imageResult || null,
            error: result.error || null
        });
        
        // Rate limiting
        if (i < targetDates.length - 1) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.rateLimitDelay));
        }
    }
    
    const successCount = results.filter(r => r.success).length;
    const imageSuccessCount = results.filter(r => r.success && r.imageResult?.success).length;
    
    if (successCount === targetDates.length) {
        progressSpinner.succeed(`Successfully created ${successCount} repeat events`);
    } else {
        progressSpinner.warn(`Created ${successCount}/${targetDates.length} repeat events`);
    }
    
    // Create backup
    createBackup(results, 'repeat_events_created');
    
    // Display summary
    console.log(chalk.blue('\n📊 SUMMARY'));
    console.log(chalk.blue('=================='));
    console.log(`Events created: ${successCount}/${targetDates.length}`);
    console.log(`Images copied: ${imageSuccessCount}/${successCount}`);
    
    // Show details
    if (results.some(r => !r.success)) {
        console.log(chalk.red('\n❌ FAILED EVENTS:'));
        results.filter(r => !r.success).forEach(result => {
            console.log(`  ${result.date}: ${result.error}`);
        });
    }
    
    if (copyImages && results.some(r => r.success && !r.imageResult?.success)) {
        console.log(chalk.yellow('\n⚠️  IMAGE COPY ISSUES:'));
        results.filter(r => r.success && !r.imageResult?.success).forEach(result => {
            console.log(`  ${result.eventId}: ${result.imageResult?.message}`);
        });
    }
    
    console.log(chalk.green('\n✅ Repeat event creation completed!'));
}

// CLI setup
async function main() {
    program
        .version('1.0.0')
        .description('Create repeat events from existing Hash events')
        .option('-e, --event-id <id>', 'Event ID to copy')
        .option('-p, --pattern <pattern>', 'Repeat pattern (weekly, biweekly, monthly, custom)')
        .option('-c, --count <number>', 'Number of repeat events to create', parseInt)
        .option('-d, --dates <dates>', 'Specific dates (comma-separated YYYY-MM-DD)')
        .option('--custom-days <days>', 'Custom interval in days', parseInt)
        .option('--no-copy-images', 'Skip copying event images')
        .option('--dry-run', 'Preview changes without creating events')
        .option('-s, --service-account <path>', 'Path to Firebase service account key', './serviceAccountKey.json')
        .parse();

    const options = program.opts();
    
    console.log(chalk.blue('🔄 Firebase Repeat Events Creator'));
    console.log(chalk.blue('===================================\n'));
    
    // Initialize Firebase
    if (!initializeFirebase(options.serviceAccount)) {
        process.exit(1);
    }
    
    try {
        let executionOptions;
        
        if (options.eventId) {
            // Command line mode
            executionOptions = {
                eventId: options.eventId,
                pattern: options.pattern,
                count: options.count,
                dates: options.dates,
                customDays: options.customDays,
                copyImages: options.copyImages !== false,
                dryRun: options.dryRun
            };
            
            // Validate required options
            if (!options.dates && (!options.pattern || !options.count)) {
                console.error(chalk.red('❌ Either --dates or both --pattern and --count are required'));
                process.exit(1);
            }
        } else {
            // Interactive mode
            executionOptions = await runInteractiveMode();
            if (!executionOptions) {
                process.exit(0);
            }
        }
        
        await executeRepeatCreation(executionOptions);
        
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

module.exports = { 
    calculateRepeatDates, 
    copyEventData, 
    parseSpecificDates,
    REPEAT_PATTERNS 
};