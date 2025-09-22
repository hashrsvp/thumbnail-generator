#!/usr/bin/env node

/**
 * Quick test for multi-event extraction capability
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function quickTest() {
    console.log(chalk.blue('🚀 Quick Multi-Event Test'));
    
    const scraper = new EventScraper({
        headless: true,
        debug: false,  // Disable verbose logging for speed
        timeout: 30000
    });
    
    try {
        await scraper.initBrowser();
        await scraper.page.goto('https://www.cowpalace.com/cow-palace-arena-event-center/upcoming-events/', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log(chalk.green('✅ Page loaded'));
        
        // Quick wait
        await scraper.page.waitForTimeout(2000);
        
        // Test extraction
        console.log(chalk.cyan('📊 Testing scrapeEventListing()...'));
        const events = await scraper.scrapeEventListing();
        
        console.log(chalk.green(`✅ Found ${events.length} events`));
        
        // Show first few events
        events.slice(0, 3).forEach((event, i) => {
            console.log(chalk.yellow(`\nEvent ${i + 1}:`));
            console.log(`Title: ${event.title || 'N/A'}`);
            console.log(`Date: ${event.date || event.startDate || 'N/A'}`);
            console.log(`Venue: ${event.venue || 'N/A'}`);
            console.log(`Method: ${event._extraction?.method || 'N/A'}`);
        });
        
        console.log(chalk.blue(`\n📊 Total: ${events.length} events extracted`));
        
    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
    } finally {
        await scraper.closeBrowser();
    }
}

quickTest();