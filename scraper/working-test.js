#!/usr/bin/env node

/**
 * Working Test Script - Uses your original scraper that's proven to work
 */

const EventScraper = require('./eventScraper');

async function workingTest() {
    const url = process.argv[2] || 'https://www.eventbrite.com/e/example-event-123';
    
    console.log('🚀 Testing with Original Scraper');
    console.log('URL:', url);
    console.log('');
    
    const scraper = new EventScraper({ 
        debug: true,
        headless: true 
    });
    
    try {
        console.log('⏳ Scraping...');
        const result = await scraper.scrapeEvent(url);
        
        console.log('\n✅ SUCCESS:');
        console.log('Title:', result.title || 'Not found');
        console.log('Venue:', result.venue || 'Not found');
        console.log('Address:', result.address || 'Not found');
        console.log('Date:', result.date || 'Not found');
        console.log('Free:', result.free !== undefined ? result.free : 'Unknown');
        console.log('Image URL:', result.imageUrl || 'None');
        console.log('Categories:', result.categories?.join(', ') || 'None');
        
    } catch (error) {
        console.log('\n❌ ERROR:');
        console.log(error.message);
    } finally {
        await scraper.close();
        console.log('\n🔚 Test complete');
    }
}

// Run the test
if (require.main === module) {
    workingTest().catch(console.error);
}