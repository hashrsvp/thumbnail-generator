# Firebase Repeat Events Creation Script

This script creates repeat events from existing Hash events, copying all event data including images from Firebase Storage.

## Features

- ✅ **Multiple Repeat Patterns**: Weekly, bi-weekly, monthly, and custom intervals
- ✅ **Image Copying**: Automatically copies event images to repeat events
- ✅ **Specific Dates**: Create events on exact dates you specify
- ✅ **Safety Features**: Dry run mode, validation, and automatic backups
- ✅ **Interactive Mode**: User-friendly prompts for easy operation
- ✅ **CLI Mode**: Command-line interface for automation
- ✅ **Progress Tracking**: Real-time progress with detailed logging

## Quick Start

### Interactive Mode (Recommended)
```bash
npm run create-repeats
```
This launches an interactive wizard that guides you through the process.

### Command Line Examples
```bash
# Create 10 weekly repeats of an event
node createRepeatEvents.js --event-id "abc123" --pattern weekly --count 10

# Create 6 monthly repeats
node createRepeatEvents.js --event-id "abc123" --pattern monthly --count 6

# Create events on specific dates
node createRepeatEvents.js --event-id "abc123" --dates "2025-08-15,2025-09-15,2025-10-15"

# Dry run (preview without creating)
node createRepeatEvents.js --event-id "abc123" --pattern weekly --count 5 --dry-run

# Custom interval (every 3 days)
node createRepeatEvents.js --event-id "abc123" --pattern custom --custom-days 3 --count 8
```

## Repeat Patterns

### Weekly
Creates events every 7 days from the original event date.

**Example**: Original event on Monday → Repeats every Monday

### Bi-weekly  
Creates events every 14 days from the original event date.

**Example**: Original event on Jan 1st → Jan 15th, Jan 29th, Feb 12th...

### Monthly
Creates events on the same date each month.

**Example**: Original event on 15th → 15th of each subsequent month

### Custom Interval
Creates events every X days that you specify.

**Example**: Every 3 days, every 10 days, etc.

### Specific Dates
Creates events on exact dates you provide.

**Example**: "2025-08-15,2025-09-20,2025-12-25"

## Image Handling

The script automatically handles event images:

1. **Detection**: Checks if original event has image at `events/{eventId}/event_image.png` or `.jpg`
2. **Copying**: Downloads original image and uploads copies for each repeat event  
3. **Storage**: Each repeat event gets its own image at `events/{newEventId}/event_image.png`
4. **Quality**: Maintains original image quality and format
5. **Reporting**: Shows success/failure status for each image copy

## Command Line Options

| Option | Description | Example |
|--------|-------------|---------|
| `-e, --event-id <id>` | Event ID to copy | `--event-id "abc123"` |
| `-p, --pattern <pattern>` | Repeat pattern | `--pattern weekly` |
| `-c, --count <number>` | Number of repeats | `--count 10` |
| `-d, --dates <dates>` | Specific dates | `--dates "2025-08-15,2025-09-15"` |
| `--custom-days <days>` | Custom interval | `--custom-days 3` |
| `--no-copy-images` | Skip image copying | `--no-copy-images` |
| `--dry-run` | Preview mode | `--dry-run` |
| `-s, --service-account <path>` | Firebase key path | `--service-account ./key.json` |

## Event Data Handling

### What Gets Copied
- ✅ Title, description, address, venue
- ✅ Categories, ticket links, pricing info
- ✅ Business user information
- ✅ All custom fields and metadata
- ✅ Event images from Firebase Storage

### What Gets Updated
- 🔄 Date and time fields (`date`, `startDate`, `endDate`)
- 🔄 Timestamp fields (`startDateTimestamp`, `endDateTimestamp`)
- 🔄 Creation timestamp (`createdAt`)
- 🔄 Unique document IDs

### What Gets Added
- ➕ `isRepeatEvent: true` flag
- ➕ `originalEventId` reference
- ➕ `repeatCreatedAt` timestamp

## Safety Features

### Validation
- ✅ Verifies original event exists
- ✅ Checks user permissions (business user ownership)
- ✅ Validates date formats
- ✅ Confirms Firebase connectivity

### Backups
- 📁 Creates JSON backup of all created events
- 📁 Stored in `backups/` directory with timestamp
- 📁 Includes success/failure status for recovery

### Error Handling
- 🛡️ Graceful failure recovery
- 🛡️ Detailed error messages
- 🛡️ Rate limiting to prevent overload
- 🛡️ Progress tracking with resumption capability

## Example Output

```bash
🔄 Firebase Repeat Events Creator
===================================

✅ Firebase initialized successfully
✅ Found event: "Weekly Yoga Class" in events

📅 Will create 8 repeat events:
  1. Mon Aug 04 2025
  2. Mon Aug 11 2025
  3. Mon Aug 18 2025
  4. Mon Aug 25 2025
  5. Mon Sep 01 2025
  6. Mon Sep 08 2025
  7. Mon Sep 15 2025
  8. Mon Sep 22 2025

✅ Successfully created 8 repeat events
💾 Backup created: backups/repeat_events_created_2025-07-26T20-30-15-123Z.json

📊 SUMMARY
==================
Events created: 8/8
Images copied: 8/8

✅ Repeat event creation completed!
```

## Use Cases

### Weekly Classes
Perfect for recurring classes, workshops, or regular meetups.
```bash
npm run create-repeats
# Select: Weekly pattern, 12 repeats
```

### Monthly Events
Great for monthly networking events, book clubs, or community gatherings.
```bash
node createRepeatEvents.js --event-id "monthly_meetup" --pattern monthly --count 12
```

### Seasonal Events
Create events for specific holiday dates or seasonal activities.
```bash
node createRepeatEvents.js --event-id "holiday_party" --dates "2025-11-28,2025-12-25,2026-01-01"
```

### Conference Series
Create multi-day conference events with custom spacing.
```bash
node createRepeatEvents.js --event-id "tech_conf" --pattern custom --custom-days 30 --count 4
```

## Troubleshooting

### Common Issues

**Event Not Found**
```
❌ Event with ID "abc123" not found
```
- Solution: Verify the event ID exists in either `events` or `austinEvents` collections

**Permission Denied**  
```
❌ Error: 7 PERMISSION_DENIED: Missing or insufficient permissions
```
- Solution: Ensure your service account has Firestore read/write permissions

**Invalid Date Format**
```
❌ Invalid date format: 2025/08/15. Use YYYY-MM-DD format.
```
- Solution: Use YYYY-MM-DD format for all dates (e.g., "2025-08-15")

**Image Copy Failed**
```
⚠️ IMAGE COPY ISSUES:
  xyz789: Failed to copy image: File not found
```
- This is usually harmless - the original event may not have had an image
- Events are still created successfully, just without images

### Debug Mode
For verbose logging, set the environment variable:
```bash
DEBUG=true node createRepeatEvents.js --event-id "abc123" --pattern weekly --count 5
```

## Advanced Usage

### Batch Processing
Create a script to process multiple events:
```bash
#!/bin/bash
events=("event1" "event2" "event3")
for event_id in "${events[@]}"; do
    node createRepeatEvents.js --event-id "$event_id" --pattern weekly --count 10
done
```

### Custom Date Lists
For complex scheduling, use specific dates:
```bash
# Summer concert series
node createRepeatEvents.js \
  --event-id "summer_concert" \
  --dates "2025-06-15,2025-07-15,2025-08-15" \
  --copy-images
```

## Limitations

- Maximum 100 repeat events per execution (safety limit)
- Rate limited to prevent Firebase quotas (200ms between operations)
- Requires business user ownership to copy events
- Images must be under Firebase Storage limits

## Security

- ✅ Validates user permissions before copying
- ✅ Only copies events owned by authenticated business user  
- ✅ Preserves original event integrity
- ✅ Creates audit trail with backups
- ✅ No sensitive data exposed in logs

---

For additional help, run:
```bash
npm run help-repeats
```