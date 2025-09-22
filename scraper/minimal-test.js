#!/usr/bin/env node

/**
 * Minimal Test - No dependencies on chalk
 */

const EventScraper = require('./eventScraper');

async function minimalTest() {
    const url = process.argv[2] || 'https://www.eventbrite.com/e/example-event-123';
    
    console.log('Testing URL:', url);
    
    // Override console methods to avoid chalk issues
    const originalLog = console.log;
    console.log = (...args) => {
        const message = args.join(' ').replace(/\x1b\[[0-9;]*m/g, ''); // Strip colors
        originalLog(message);
    };
    
    const scraper = new EventScraper({ 
        headless: true 
    });
    
    try {
        const result = await scraper.scrapeEvent(url);
        
        console.log('\nSUCCESS:');
        console.log('Title:', result.title || 'Not found');
        console.log('Venue:', result.venue || 'Not found');
        console.log('Address:', result.address || 'Not found');
        console.log('Date:', result.date || 'Not found');
        console.log('Image URL:', result.imageUrl || 'None');
        
    } catch (error) {
        console.log('\nERROR:', error.message);
    } finally {
        await scraper.close();
        console.log('\nComplete');
    }
}

minimalTest().catch(console.error);