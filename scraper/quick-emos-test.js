#!/usr/bin/env node

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function quickTest() {
    console.log(chalk.blue('🚀 Quick Emo\'s Test (2 events max)'));
    
    const scraper = new EventScraper({
        headless: true,
        debug: false, // Reduce output
        timeout: 30000
    });
    
    try {
        await scraper.initBrowser();
        
        await scraper.page.goto('https://www.emosaustin.com/shows', { 
            waitUntil: 'domcontentloaded',
            timeout: 20000 
        });
        
        console.log('✅ Page loaded');
        await scraper.page.waitForTimeout(2000);
        
        const startTime = Date.now();
        const events = await scraper.scrapeEventListing({
            maxEvents: 2, // Limit to 2 events for quick test
            includeImages: false // Skip images for speed
        });
        const duration = Date.now() - startTime;
        
        console.log(`\n📊 Results (${duration}ms):`);
        console.log(`Found: ${events?.length || 0} events`);
        
        if (events && events.length > 0) {
            events.forEach((event, i) => {
                console.log(`\n--- Event ${i + 1} ---`);
                console.log(`Title: ${event.title}`);
                console.log(`Date: ${event.date}`);
                console.log(`Time: ${event.time || event.startTime}`);
                console.log(`Venue: ${event.venueName || event.venue}`);
                console.log(`Address: ${event.address}`);
                console.log(`Category: ${event.category}`);
                console.log(`Extraction: ${event._extraction?.method}`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        if (scraper.browser) await scraper.close();
    }
}

quickTest().catch(console.error);