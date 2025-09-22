#!/usr/bin/env node

/**
 * Test to examine structured data on Cow Palace page
 */

const { chromium } = require('playwright');
const chalk = require('chalk');

async function testStructuredData() {
    console.log(chalk.blue('🔍 Testing Structured Data Extraction'));
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://www.cowpalace.com/cow-palace-arena-event-center/upcoming-events/', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log(chalk.green('✅ Page loaded'));
        
        // Check for JSON-LD scripts
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').count();
        console.log(chalk.cyan(`📊 Found ${jsonLdScripts} JSON-LD script tags`));
        
        // Extract structured data
        const structuredEvents = await page.evaluate(() => {
            const events = [];
            const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
            
            for (const script of jsonLdScripts) {
                try {
                    const data = JSON.parse(script.textContent);
                    
                    // Handle single event
                    if (data['@type'] && (data['@type'] === 'Event' || data['@type'] === 'MusicEvent')) {
                        events.push({
                            title: data.name,
                            type: data['@type'],
                            startDate: data.startDate,
                            venue: data.location?.name,
                            address: data.location?.address
                        });
                    }
                    
                    // Handle array of events
                    if (Array.isArray(data)) {
                        for (const item of data) {
                            if (item['@type'] && (item['@type'] === 'Event' || item['@type'] === 'MusicEvent')) {
                                events.push({
                                    title: item.name,
                                    type: item['@type'],
                                    startDate: item.startDate,
                                    venue: item.location?.name,
                                    address: item.location?.address
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.log('JSON parse error:', e.message);
                }
            }
            
            return events;
        });
        
        console.log(chalk.green(`✅ Structured events found: ${structuredEvents.length}`));
        
        structuredEvents.forEach((event, i) => {
            console.log(chalk.yellow(`\nEvent ${i + 1}:`));
            console.log(`  Title: ${event.title}`);
            console.log(`  Type: ${event.type}`);
            console.log(`  Date: ${event.startDate}`);
            console.log(`  Venue: ${event.venue}`);
        });
        
        // Also check for HTML event patterns
        const eventElements = await page.locator('.eventListings li, .event-item, .event-card').count();
        console.log(chalk.cyan(`\n📊 HTML event elements found: ${eventElements}`));
        
    } catch (error) {
        console.error(chalk.red('Error:'), error.message);
    } finally {
        await browser.close();
    }
}

testStructuredData();