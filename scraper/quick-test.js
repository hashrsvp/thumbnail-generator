#!/usr/bin/env node

/**
 * Quick Test Script - Simple way to test the improved scraper
 * 
 * Usage: node quick-test.js [URL]
 * Example: node quick-test.js https://www.eventbrite.com/e/your-event-123
 */

const EventScraper = require('./improved-event-scraper-2');
// Import chalk with ES6 syntax for v5+
let chalk;
try {
    chalk = require('chalk');
} catch (e) {
    // Fallback for chalk issues
    chalk = {
        blue: (text) => `\x1b[34m${text}\x1b[0m`,
        gray: (text) => `\x1b[90m${text}\x1b[0m`,
        yellow: (text) => `\x1b[33m${text}\x1b[0m`,
        green: (text) => `\x1b[32m${text}\x1b[0m`,
        white: (text) => text,
        red: (text) => `\x1b[31m${text}\x1b[0m`
    };
}

async function quickTest() {
    // Get URL from command line argument or use default
    const url = process.argv[2] || 'https://www.eventbrite.com/e/example-event-123';
    
    console.log(chalk.blue('🚀 Quick Scraper Test'));
    console.log(chalk.gray('URL:'), url);
    console.log('');
    
    const scraper = new EventScraper({ 
        debug: true,
        headless: true 
    });
    
    try {
        console.log(chalk.yellow('⏳ Scraping...'));
        const result = await scraper.scrapeEvent(url);
        
        console.log(chalk.green('\n✅ SUCCESS:'));
        console.log(chalk.white('Title:'), result.title || 'Not found');
        console.log(chalk.white('Venue:'), result.venue || 'Not found');
        console.log(chalk.white('Address:'), result.address || 'Not found');
        console.log(chalk.white('Date:'), result.date || 'Not found');
        console.log(chalk.white('Free:'), result.free !== undefined ? result.free : 'Unknown');
        console.log(chalk.white('Image URL:'), result.imageUrl || 'None');
        console.log(chalk.white('Categories:'), result.categories?.join(', ') || 'None');
        
    } catch (error) {
        console.log(chalk.red('\n❌ ERROR:'));
        console.log(chalk.red(error.message));
    } finally {
        await scraper.close();
        console.log(chalk.gray('\n🔚 Test complete'));
    }
}

// Run the test
if (require.main === module) {
    quickTest().catch(console.error);
}