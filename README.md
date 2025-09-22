# Firebase Duplicate Events Removal Script

This script removes duplicate events from Firebase Firestore based on **same title + date + venue + start time** criteria.

## Features

- ✅ **Safe Duplicate Detection**: Only removes events with identical titles, dates, venues, and start times
- ✅ **Smart Preservation**: Keeps the event with the most complete data and highest engagement
- ✅ **Automatic Backups**: Creates JSON backups before any deletions
- ✅ **Dry Run Mode**: Preview changes without making modifications
- ✅ **Multi-Collection Support**: Processes both `events` and `austinEvents` collections
- ✅ **Progress Tracking**: Real-time progress with detailed logging
- ✅ **Interactive Confirmation**: Requires explicit user confirmation before deletions

## Setup

### 1. Install Dependencies
```bash
cd /Users/user/Desktop/hash/scripts
npm install
```

### 2. Firebase Service Account Setup
You need to add your Firebase service account key file:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`hash-836eb`)
3. Go to **Project Settings** > **Service accounts**
4. Click **Generate new private key**
5. Save the downloaded JSON file as `serviceAccountKey.json` in this directory

**⚠️ SECURITY**: Never commit the service account key to version control!

### 3. File Structure
```
scripts/
├── removeDuplicateEvents.js    # Main script
├── package.json                # Dependencies
├── serviceAccountKey.json      # Your Firebase credentials (YOU ADD THIS)
├── README.md                   # This file
└── backups/                    # Created automatically for backups
```

## Usage

### Preview Changes (Recommended First)
```bash
npm run dry-run
# OR
node removeDuplicateEvents.js --dry-run
```

### Execute Removal
```bash
npm run remove-duplicates
# OR
node removeDuplicateEvents.js
```

### Custom Options
```bash
# Specify different service account path
node removeDuplicateEvents.js --service-account /path/to/key.json

# Process only specific collections
node removeDuplicateEvents.js --collections events

# Multiple collections
node removeDuplicateEvents.js --collections "events,austinEvents"
```

## How It Works

### Duplicate Detection
Events are considered duplicates if they have:
1. **Same title** (case-insensitive, whitespace normalized)
2. **Same date** (extracted from date field, ignoring time)
3. **Same venue** (case-insensitive, whitespace normalized)
4. **Same start time** (HH:MM format)

### Example Duplicates
```javascript
// These would be detected as duplicates:
Event 1: { title: "Summer Music Festival", date: "2024-07-15", venue: "Central Park", startTime: "19:00" }
Event 2: { title: "summer music festival", date: "2024-07-15", venue: "central park", startTime: "19:00" }
Event 3: { title: "  Summer Music Festival  ", date: "2024-07-15", venue: "Central Park", startTime: "19:00" }

// These would NOT be duplicates:
Event A: { title: "Summer Music Festival", date: "2024-07-15", venue: "Central Park", startTime: "19:00" }
Event B: { title: "Summer Music Festival", date: "2024-07-16", venue: "Central Park", startTime: "19:00" } // Different date
Event C: { title: "Winter Music Festival", date: "2024-07-15", venue: "Central Park", startTime: "19:00" } // Different title
Event D: { title: "Summer Music Festival", date: "2024-07-15", venue: "Brooklyn Park", startTime: "19:00" } // Different venue
Event E: { title: "Summer Music Festival", date: "2024-07-15", venue: "Central Park", startTime: "20:00" } // Different time
```

### Selection Criteria
When duplicates are found, the script keeps the event using this priority order:

1. **Image Priority** (Primary factor):
   - Events WITH images are always kept over events without images
   - 🖼️ = Has image, 📝 = No image

2. **Timestamp** (Tiebreaker):
   - If both events have images OR both don't have images
   - More recent events are preferred (newer timestamp)

## Safety Features

### Automatic Backups
Before any deletions, the script creates timestamped JSON backups in the `backups/` directory:
```
backups/
├── duplicates_to_delete_2024-01-15T10-30-45-123Z.json
└── ...
```

### Dry Run Mode
Always test first with dry run mode:
```bash
npm run dry-run
```

This shows exactly what would be deleted without making changes.

### Interactive Confirmation
The script requires explicit confirmation before proceeding with deletions:
```
? Are you sure you want to delete 15 duplicate events? (y/N)
```

## Example Output

### Dry Run
```bash
🔥 Firebase Duplicate Events Removal Tool
==========================================

✅ Firebase initialized successfully
✅ Fetched 1,247 events from events
✅ Fetched 89 events from austinEvents
📋 Total events loaded: 1,336

🔍 Analyzing events for duplicates...
⚠️  Found 3 events with missing title/date
🔄 Found 8 duplicate groups

📌 Keeping: "Summer Music Festival" (events:abc123) - Score: 95
🗑️  Deleting: "summer music festival" (events:def456) - Score: 45
🗑️  Deleting: "Summer Music Festival" (austinEvents:ghi789) - Score: 30

📊 SUMMARY
==================
Duplicate groups found: 8
Events to keep: 8
Events to delete: 15

🔍 DRY RUN MODE - No changes will be made
Run without --dry-run flag to execute deletions
```

### Actual Execution
```bash
? Are you sure you want to delete 15 duplicate events? Yes
💾 Backup created: backups/duplicates_to_delete_2024-01-15T10-30-45-123Z.json
✅ Successfully deleted 15 duplicate events

✅ Duplicate removal completed successfully!
📁 Backups stored in: /Users/user/Desktop/hash/scripts/backups
```

## Recovery

If you need to restore deleted events, you can use the backup files:

1. Locate the backup file in `backups/` directory
2. The JSON contains all deleted event data
3. Use Firebase console or a custom restore script to re-add events if needed

## Troubleshooting

### Common Issues

**Firebase Connection Error**
```
❌ Firebase initialization failed: Error: ENOENT: no such file or directory
```
- Solution: Ensure `serviceAccountKey.json` exists and is valid

**Permission Denied**
```
❌ Error: 7 PERMISSION_DENIED: Missing or insufficient permissions
```
- Solution: Ensure your service account has Firestore read/write permissions

**No Duplicates Found**
```
✅ No duplicate events found!
```
- This is normal if there are no events with matching title AND date

### Debug Mode
For verbose logging, set the environment variable:
```bash
DEBUG=true node removeDuplicateEvents.js --dry-run
```

## Development

### Testing
```bash
# Run with a small test dataset first
node removeDuplicateEvents.js --collections "testEvents" --dry-run
```

### Customization
You can modify the duplicate detection logic in the `createDuplicateKey()` function or scoring logic in `calculateEventScore()` function.

---

**⚠️ Important Notes:**
- Always run dry-run mode first
- Test on a staging environment if available
- Keep backups of your entire Firestore database before running
- The script is designed to be conservative - it only removes clear duplicates