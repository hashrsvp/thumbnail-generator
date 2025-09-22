#!/usr/bin/env node

/**
 * Test script for the improved Event Scraper v2.0
 */

const EventScraper = require('./improved-event-scraper-2');
const path = require('path');

async function testImprovedScraper() {
    console.log('🚀 Testing Improved Event Scraper v2.0...\n');
    
    // Configuration for the scraper
    const options = {
        // Basic settings
        headless: true,
        timeout: 30000,
        delay: 2000,
        retries: 2,
        
        // Performance settings  
        concurrency: 2,
        cacheEnabled: true,
        cacheTTL: 1800000, // 30 minutes
        imageTimeout: 5000,
        
        // Anti-detection (disabled for testing)
        proxies: [], // No proxies for testing
        rotateUserAgent: true,
        rotateViewport: true,
        mimicHumanBehavior: false, // Disable for faster testing
        
        // Rate limiting
        minDelay: 1000,
        maxDelay: 3000,
        dailyLimit: 100,
        
        // Logging
        logLevel: 'info',
        logFile: './logs/scraper-test.log',
        dbPath: './data',
        
        // Debug mode
        debug: true
    };
    
    const scraper = new EventScraper(options);
    
    // Test URLs - start with simple ones
    const testUrls = [
        'https://www.eventbrite.com/e/test-event-123', // Placeholder
        // You can add real URLs here for testing
    ];
    
    try {
        console.log('📊 Scraper Statistics:');
        const stats = await scraper.getStats();
        console.log(JSON.stringify(stats, null, 2));
        
        console.log('\n✅ Test completed successfully!');
        console.log('📁 Check ./logs/ for detailed logs');
        console.log('💾 Check ./data/ for cache and rate limiting data');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (options.debug) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        await scraper.close();
    }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error);
    process.exit(1);
});

// Run the test
if (require.main === module) {
    testImprovedScraper().catch(console.error);
}

module.exports = { testImprovedScraper };