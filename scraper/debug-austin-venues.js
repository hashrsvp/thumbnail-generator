#!/usr/bin/env node

/**
 * Debug script for Austin venues to understand why extraction is failing
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const EventScraper = require("./improved-event-scraper-2");

async function debugSingleVenue() {
    console.log(chalk.blue('🔍 Debugging Austin Venue Extraction'));
    
    const scraper = new EventScraper({
        headless: false, // Run in visible mode for debugging
        timeout: 60000
    });
    
    try {
        console.log('Initializing browser...');
        await scraper.initBrowser();
        
        const testUrl = 'https://www.emosaustin.com/shows';
        console.log(`\nTesting URL: ${testUrl}`);
        
        // First, let's try to navigate to the page manually and see what happens
        console.log('Navigating to page...');
        await scraper.page.goto(testUrl, { waitUntil: 'networkidle' });
        
        console.log('Page loaded. Current URL:', await scraper.page.url());
        console.log('Page title:', await scraper.page.title());
        
        // Take a screenshot for debugging
        await scraper.page.screenshot({ path: 'debug-emos-page.png', fullPage: true });
        console.log('Screenshot saved: debug-emos-page.png');
        
        // Check if the page has basic content
        const bodyText = await scraper.page.textContent('body');
        console.log('Page content length:', bodyText?.length || 0);
        
        if (bodyText && bodyText.length < 100) {
            console.log('Page content (first 500 chars):', bodyText.substring(0, 500));
        }
        
        // Look for common event-related selectors
        const eventSelectors = [
            '.event',
            '.show',
            '.concert',
            '.performance',
            '[class*="event"]',
            '[class*="show"]',
            '[data-event]',
            'a[href*="event"]',
            'a[href*="show"]'
        ];
        
        console.log('\nChecking for event elements...');
        for (const selector of eventSelectors) {
            try {
                const elements = await scraper.page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
                    
                    // Get text content from first few elements
                    for (let i = 0; i < Math.min(3, elements.length); i++) {
                        const text = await elements[i].textContent();
                        console.log(`   Element ${i + 1}: ${text?.substring(0, 100)?.trim()}`);
                    }
                }
            } catch (error) {
                // Ignore selector errors
            }
        }
        
        // Check for structured data
        console.log('\nChecking for structured data...');
        const jsonLD = await scraper.page.$$('script[type="application/ld+json"]');
        console.log(`JSON-LD scripts found: ${jsonLD.length}`);
        
        for (let i = 0; i < jsonLD.length; i++) {
            try {
                const content = await jsonLD[i].textContent();
                console.log(`JSON-LD ${i + 1}:`, content?.substring(0, 200));
            } catch (error) {
                console.log(`Error reading JSON-LD ${i + 1}:`, error.message);
            }
        }
        
        // Now try the actual scrapeEventListing method
        console.log('\n🎭 Testing scrapeEventListing method...');
        
        try {
            const result = await scraper.scrapeEventListing(testUrl, {
                maxEvents: 5,
                includeImages: true,
                enhanceAddresses: true
            });
            
            console.log('Scraper result:', result);
            
            if (result && result.events && result.events.length > 0) {
                console.log(`✅ Successfully extracted ${result.events.length} events`);
                console.log('Sample event:', JSON.stringify(result.events[0], null, 2));
            } else {
                console.log('❌ No events extracted');
                console.log('Full result:', JSON.stringify(result, null, 2));
            }
        } catch (error) {
            console.error('❌ scrapeEventListing failed:', error);
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        if (scraper.browser) {
            await scraper.browser.close();
        }
    }
}

// Run the debug
debugSingleVenue().catch(console.error);