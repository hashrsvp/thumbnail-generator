# Hash Event Scraper

A comprehensive web scraper that extracts event data from various websites and submits it directly to Firebase with 100% accurate schema validation for the Hash iOS app.

## Features

✅ **Direct Firebase Integration** - Bypasses web forms for speed and reliability  
✅ **Exact Schema Validation** - Ensures events display properly in Hash app  
✅ **Smart Location Detection** - Auto-routes events to correct collections  
✅ **Intelligent Category Mapping** - Maps event content to Hash categories  
✅ **Smart Image Selection** - Prioritizes square/4:5 ratio and flyer-style images  
✅ **Advanced Image Processing** - Downloads, optimizes, and uploads best images  
✅ **Duplicate Prevention** - Checks for existing events before submission  
✅ **Multi-Site Support** - Supports Eventbrite, Ticketmaster, and generic sites  

## Quick Start

### 1. Install Dependencies
```bash
cd /Users/user/Desktop/hash/scripts
npm install
```

### 2. Run Test Suite
```bash
npm run test-scraper
```

### 3. Scrape a Single Event
```bash
# Dry run (preview without submitting)
npm run scrape-dry -- --url "https://www.eventbrite.com/e/..."

# Submit to Firebase
npm run scrape -- --url "https://www.eventbrite.com/e/..."
```

## Usage Examples

### Single Event Scraping
```bash
# Scrape and submit an Eventbrite event
node scraper/scrapeAndSubmit.js --url "https://www.eventbrite.com/e/music-festival-tickets-123456"

# Preview without submitting
node scraper/scrapeAndSubmit.js --url "https://..." --dry-run

# Skip image processing
node scraper/scrapeAndSubmit.js --url "https://..." --no-images

# Allow duplicates
node scraper/scrapeAndSubmit.js --url "https://..." --allow-duplicates

# Debug image selection (see which images are found and scored)
node scraper/scrapeAndSubmit.js --url "https://..." --verbose --dry-run
```

### Image Selection Features

The enhanced scraper now intelligently selects the best images:

#### **Priority Ranking:**
1. **Square Images (1:1)** - Perfect for mobile app display
2. **Portrait Flyers (4:5)** - Ideal for event promotional content  
3. **Story Format (9:16)** - Great for social media integration
4. **Golden Ratio (1:1.618)** - Aesthetically pleasing proportions

#### **Smart Detection:**
- **Flyer Keywords**: 'flyer', 'poster', 'featured', 'hero', 'promo'
- **Quality Indicators**: CDN hosting, modern formats (WebP), large dimensions  
- **Avoid**: Thumbnails, small images, generic photos

#### **Debug Mode:**
```bash
# See detailed image analysis
node scraper/scrapeAndSubmit.js --url "https://eventbrite.com/e/..." --verbose --dry-run
```
Shows:
- All image candidates found
- Dimension analysis and ratio scoring
- Flyer detection results
- Final selection reasoning

### Batch Processing
```bash
# Create a file with URLs (one per line)
echo "https://www.eventbrite.com/e/event1-123" > urls.txt
echo "https://www.eventbrite.com/e/event2-456" >> urls.txt

# Process all URLs
node scraper/scrapeAndSubmit.js --batch urls.txt

# Batch with custom settings
node scraper/scrapeAndSubmit.js --batch urls.txt --batch-size 3 --delay 3000 --dry-run
```

## Supported Websites

- **Eventbrite** - Full support with detailed extraction
- **Ticketmaster** - Basic support for major events  
- **Facebook Events** - Limited support (public events only)
- **Generic Sites** - Configurable extraction via JSON configs

## Firebase Schema

The scraper ensures events match the exact Hash app schema:

### Required Fields
- `title` - Event name
- `address` - Must contain comma ("Street, City")  
- `venue` - Venue name
- `date` - ISO 8601 timestamp
- `startTime` - HH:mm:ss format
- `categories` - Array of 1-2 valid categories
- `free` - Boolean
- `soldOutStatus` - Boolean (note: not "soldOut")
- `createdAt` - Firebase Timestamp

### Valid Categories
- Music
- Festivals  
- Food Events
- Sports/Games
- Comedy Shows
- Art Shows
- Bars
- Nightclubs

### Collection Routing
- **Bay Area cities** → `bayAreaEvents`
- **Austin cities** → `austinEvents`  
- **Unknown/ambiguous** → `bayAreaEvents` (default)

## File Structure

```
/scripts/scraper/
├── scrapeAndSubmit.js          # Main CLI interface
├── eventScraper.js             # Core scraping engine
├── firebaseService.js          # Firebase operations & validation
├── testScraper.js              # Test suite
├── utils/
│   ├── locationUtils.js        # Address formatting & city detection
│   ├── categoryMapper.js       # Category classification
│   └── imageHandler.js         # Image download & upload
├── config/
│   ├── eventbrite.json         # Eventbrite scraping config
│   └── generic.json            # Generic site fallback config
└── README.md
```

## Error Handling

The scraper includes comprehensive error handling:

- **Validation Errors** - Shows specific field validation issues
- **Network Errors** - Retries with exponential backoff  
- **Image Errors** - Continues without images if processing fails
- **Firebase Errors** - Detailed error messages with suggestions

## Development

### Adding New Site Support

1. Create config file in `config/[sitename].json`
2. Add site detection logic in `eventScraper.js`
3. Implement site-specific extraction method
4. Test with real URLs

### Running Tests
```bash
# Full test suite
node scraper/testScraper.js

# Test specific components
node -e "
const LocationUtils = require('./utils/locationUtils');
const utils = new LocationUtils();
console.log(utils.debugLocation('123 Market St, San Francisco'));
"
```

## Troubleshooting

### Common Issues

**"Firebase initialization failed"**
- Check that service account key exists at `../key/hash-836eb-firebase-adminsdk-*.json`
- Verify Firebase permissions

**"Address must contain comma"**  
- Address formatting is strict for Hash app compatibility
- Use `--debug` to see address processing details

**"Invalid category"**
- Only specific categories are allowed (see list above)
- Use `--verbose` to see category detection logic

**"Event already exists"**
- Duplicate detection checks title + date + venue
- Use `--allow-duplicates` to override

### Debug Mode
```bash
node scraper/scrapeAndSubmit.js --url "..." --debug --verbose
```

## Performance

- **Speed**: 10x faster than form automation
- **Reliability**: Direct Firebase API, no UI dependencies  
- **Batch Processing**: Handle hundreds of URLs efficiently
- **Image Optimization**: Auto-resize to Hash app requirements

## Security

- Service account credentials required
- No sensitive data logged
- Images processed locally then uploaded
- Rate limiting to respect website policies