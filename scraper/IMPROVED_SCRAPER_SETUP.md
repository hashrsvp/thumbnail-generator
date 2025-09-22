# Improved Event Scraper v2.0 - Setup Guide

## Overview

The `improved-event-scraper-2.js` is an enterprise-grade scraping engine with advanced features:

### Key Features
- ✅ **Anti-Detection**: Browser fingerprint randomization, human behavior simulation
- ✅ **Proxy Rotation**: Automated proxy validation and rotation
- ✅ **Persistent Caching**: SQLite-based caching with TTL
- ✅ **Rate Limiting**: Domain-specific rate limiting with statistics
- ✅ **Error Handling**: Smart error classification and recovery strategies
- ✅ **Performance Monitoring**: Real-time metrics and health checks

## Quick Start

### 1. Dependencies Installed ✅
- `playwright` - Browser automation
- `sqlite3` - Database for caching and rate limiting
- `chalk` - Console colors
- `axios`, `cheerio` - HTTP requests and HTML parsing

### 2. Directory Structure Created ✅
```
/scripts/scraper/
├── data/           # SQLite databases (auto-created)
├── logs/           # Log files
├── config/         # Configuration files
└── utils/          # Utility modules (already exists)
```

### 3. Basic Usage

```javascript
const EventScraper = require('./improved-event-scraper-2');

// Basic configuration
const scraper = new EventScraper({
    headless: true,
    timeout: 30000,
    cacheEnabled: true,
    logLevel: 'info',
    logFile: './logs/scraper.log',
    dbPath: './data'
});

// Scrape a single event
const eventData = await scraper.scrapeEvent('https://eventbrite.com/e/event-123');

// Get statistics
const stats = await scraper.getStats();

// Clean up
await scraper.close();
```

### 4. Advanced Configuration

```javascript
const scraper = new EventScraper({
    // Anti-detection
    proxies: [
        { server: 'proxy1.com:8080', username: 'user', password: 'pass' }
    ],
    rotateUserAgent: true,
    rotateViewport: true,
    mimicHumanBehavior: true,
    
    // Rate limiting
    minDelay: 2000,
    maxDelay: 5000,
    dailyLimit: 1000,
    
    // Performance
    concurrency: 3,
    cacheEnabled: true,
    cacheTTL: 3600000, // 1 hour
    
    // Monitoring
    webhookUrl: 'https://hooks.slack.com/...' // For error alerts
});
```

## Testing

### Run Basic Test
```bash
node test-improved-scraper.js
```

### Test with Real URL
```javascript
const EventScraper = require('./improved-event-scraper-2');

async function testRealUrl() {
    const scraper = new EventScraper({
        headless: true,
        debug: true,
        logLevel: 'debug'
    });
    
    try {
        const result = await scraper.scrapeEvent('YOUR_EVENTBRITE_URL_HERE');
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await scraper.close();
    }
}

testRealUrl();
```

## Comparison with Old Scraper

| Feature | Old Scraper | New Scraper |
|---------|-------------|-------------|
| Anti-detection | Basic | Enterprise-grade |
| Caching | None | SQLite persistent |
| Rate limiting | Simple delay | Domain-specific |
| Error handling | Basic try/catch | Smart recovery |
| Monitoring | Console logs | Comprehensive metrics |
| Proxy support | None | Rotation + validation |
| Performance | Sequential | Concurrent batching |

## Migration from Old Scraper

The new scraper is a drop-in replacement for most use cases:

```javascript
// Old way
const EventScraper = require('./eventScraper');
const scraper = new EventScraper();

// New way  
const EventScraper = require('./improved-event-scraper-2');
const scraper = new EventScraper({
    // Add configuration as needed
});
```

## Database Files

The scraper creates these SQLite databases in `./data/`:
- `cache.db` - Response caching
- `ratelimit.db` - Rate limiting tracking

These are automatically managed and cleaned up.

## Monitoring & Health Checks

```javascript
// Get real-time statistics
const stats = await scraper.getStats();
console.log('Success rate:', stats.successRate + '%');
console.log('Cache hit rate:', stats.cacheHitRate + '%');
console.log('Requests per minute:', stats.requestsPerMinute);

// Listen to events
scraper.on('success', ({ url, data, responseTime }) => {
    console.log(`✅ Scraped ${url} in ${responseTime}ms`);
});

scraper.on('failure', ({ url, error }) => {
    console.log(`❌ Failed to scrape ${url}: ${error}`);
});

scraper.on('health', (healthData) => {
    console.log('Health check:', healthData);
});
```

## Next Steps

1. **Test with real URLs** - Replace test URLs in `test-improved-scraper.js`
2. **Configure proxies** - Add proxy servers if needed
3. **Set up monitoring** - Add webhook URLs for alerts
4. **Customize rate limits** - Adjust based on your needs
5. **Integrate with existing code** - Replace old scraper imports

## Support

- Check `./logs/` for detailed execution logs
- SQLite databases in `./data/` contain caching and rate limiting data
- All existing utility files (`utils/`) work with the new scraper
- Configuration files in `config/` for site-specific settings