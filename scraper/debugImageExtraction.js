#!/usr/bin/env node

/**
 * Debug Image Extraction Test
 * 
 * Tests the enhanced debug version of the event scraper 
 * specifically for image extraction issues.
 */

const chalk = require('chalk');
const EventScraper = require("./improved-event-scraper-2");

async function debugImageExtraction() {
    const scraper = new EventScraper({
        headless: false, // Show browser for debugging
        timeout: 30000
    });
    
    try {
        // Test with a current active Eventbrite event URL
        const testUrl = 'https://www.eventbrite.com/e/celebrate-with-central-current-tickets-1306982733539';
        
        console.log(chalk.blue.bold('🔍 DEBUG IMAGE EXTRACTION TEST'));
        console.log(chalk.blue('━'.repeat(60)));
        console.log(chalk.cyan(`Testing URL: ${testUrl}`));
        console.log(chalk.gray('Running with headless=false to see browser interaction\n'));
        
        const eventData = await scraper.scrapeEvent(testUrl);
        
        console.log(chalk.blue('━'.repeat(60)));
        console.log(chalk.green.bold('✅ EXTRACTION COMPLETE'));
        console.log(chalk.blue('━'.repeat(60)));
        
        // Summary of results
        console.log(chalk.white.bold('📊 FINAL RESULTS:'));
        console.log(chalk.white(`Title: ${eventData.title || 'NOT FOUND'}`));
        console.log(chalk.white(`Image URL: ${eventData.imageUrl || 'None'}`));
        console.log(chalk.white(`Venue: ${eventData.venue || 'NOT FOUND'}`));
        console.log(chalk.white(`Date: ${eventData.date || 'NOT FOUND'}`));
        console.log(chalk.white(`Free: ${eventData.free !== undefined ? eventData.free : 'UNKNOWN'}`));
        
        if (eventData.imageUrl) {
            console.log(chalk.green('\n✅ IMAGE EXTRACTION SUCCESSFUL!'));
        } else {
            console.log(chalk.red('\n❌ IMAGE EXTRACTION FAILED!'));
            console.log(chalk.yellow('Check the debug output above to identify the issue.'));
        }
        
    } catch (error) {
        console.error(chalk.red.bold('\n❌ SCRAPING FAILED:'));
        console.error(chalk.red(error.message));
        console.error(chalk.gray(error.stack));
        
    } finally {
        await scraper.closeBrowser();
        console.log(chalk.gray('\n🔚 Test complete.'));
    }
}

// Run the debug test
if (require.main === module) {
    debugImageExtraction().catch(console.error);
}

module.exports = { debugImageExtraction };