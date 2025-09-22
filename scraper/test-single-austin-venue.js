#!/usr/bin/env node

/**
 * Quick test for a single Austin venue to verify the scraper is working
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testSingleVenue() {
    console.log(chalk.blue('🎭 Testing Single Austin Venue: Emo\'s'));
    
    const scraper = new EventScraper({
        headless: true, // Headless for speed
        debug: true,
        timeout: 45000
    });
    
    try {
        console.log('Initializing browser...');
        await scraper.initBrowser();
        
        const testUrl = 'https://www.emosaustin.com/shows';
        console.log(`\nTesting: ${testUrl}`);
        
        // Navigate to page
        console.log('🚀 Navigating to Emo\'s shows page...');
        await scraper.page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log('✅ Page loaded successfully');
        console.log('📍 Current URL:', await scraper.page.url());
        console.log('📄 Page title:', await scraper.page.title());
        
        // Wait for content to load
        console.log('⏳ Waiting for content to load...');
        await scraper.page.waitForTimeout(3000);
        
        // Test scrapeEventListing
        console.log('\n🎪 Testing scrapeEventListing...');
        const events = await scraper.scrapeEventListing({
            maxEvents: 5,
            includeImages: true
        });
        
        console.log(`\n📊 Results: Found ${events?.length || 0} events`);
        
        if (events && events.length > 0) {
            console.log(chalk.green(`✅ SUCCESS: Extracted ${events.length} events`));
            
            // Show first event details
            const firstEvent = events[0];
            console.log('\n📋 First Event Details:');
            console.log(`  Title: ${firstEvent.title || 'Not extracted'}`);
            console.log(`  Date: ${firstEvent.date || 'Not extracted'}`);
            console.log(`  Time: ${firstEvent.time || firstEvent.startTime || 'Not extracted'}`);
            console.log(`  Venue: ${firstEvent.venueName || firstEvent.venue || 'Not extracted'}`);
            console.log(`  Address: ${firstEvent.address || 'Not extracted'}`);
            console.log(`  Category: ${firstEvent.category || 'Not extracted'}`);
            console.log(`  Free: ${firstEvent.free !== undefined ? firstEvent.free : 'Not determined'}`);
            console.log(`  Image: ${firstEvent.imageUrls ? firstEvent.imageUrls[0] : 'Not extracted'}`);
            
            if (firstEvent._extraction) {
                console.log(`  Extraction Method: ${firstEvent._extraction.method}`);
                console.log(`  Confidence: ${firstEvent._extraction.confidence || 'Not provided'}%`);
            }
            
            // Test data quality
            console.log('\n🔍 Data Quality Assessment:');
            const hasRequiredFields = firstEvent.title && firstEvent.date && 
                                     (firstEvent.venueName || firstEvent.venue);
            console.log(`  Required fields: ${hasRequiredFields ? '✅ Present' : '❌ Missing'}`);
            
            const hasAddress = firstEvent.address && firstEvent.address.includes(',');
            console.log(`  Hash-compliant address: ${hasAddress ? '✅ Yes' : '❌ No'}`);
            
        } else {
            console.log(chalk.red('❌ No events found'));
            console.log('Raw result:', events);
        }
        
        // Take a screenshot for debugging
        await scraper.page.screenshot({ path: 'emos-test-result.png', fullPage: false });
        console.log('\n📸 Screenshot saved: emos-test-result.png');
        
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (scraper.browser) {
            await scraper.close();
            console.log('✅ Browser closed');
        }
    }
}

testSingleVenue().catch(console.error);