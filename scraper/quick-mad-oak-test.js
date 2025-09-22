#!/usr/bin/env node

/**
 * Quick Mad Oak Bar Test
 * 
 * A simplified test to quickly analyze the Mad Oak Bar events page
 * and test a single event URL with the OCR-enhanced scraper
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function quickTest() {
    console.log(chalk.blue('🍺 MAD OAK BAR - QUICK TEST'));
    console.log('='.repeat(30));
    console.log('');

    const scraper = new EventScraper({
        debug: true,
        headless: false,
        timeout: 15000,
        // Force OCR by setting low threshold
        ocrTriggerThreshold: 30
    });

    try {
        await scraper.initBrowser();
        
        console.log(chalk.cyan('🔍 Testing main events page...'));
        const mainPageResult = await scraper.scrapeEvent('https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings');
        
        console.log(chalk.green('\n✅ Main page results:'));
        console.log(`Title: ${mainPageResult.title}`);
        console.log(`Venue: ${mainPageResult.venue}`);
        console.log(`Date: ${mainPageResult.date}`);
        console.log(`Description: ${mainPageResult.description?.substring(0, 100)}...`);
        console.log(`Image: ${mainPageResult.imageUrl}`);
        console.log(`Categories: ${JSON.stringify(mainPageResult.categories)}`);
        
        // Test OCR extraction specifically on image-rich content
        if (mainPageResult.imageUrl) {
            console.log(chalk.cyan('\n🖼️  Testing OCR on page images...'));
            
            // Try with enhanced OCR settings
            const ocrScraper = new EventScraper({
                debug: true,
                headless: false,
                timeout: 20000,
                ocrTriggerThreshold: 0, // Force OCR
                maxFlyerImages: 10,
                enableEarlyTermination: false
            });
            
            await ocrScraper.initBrowser();
            
            const ocrResult = await ocrScraper.scrapeEvent('https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings');
            
            console.log(chalk.green('\n✅ OCR-enhanced results:'));
            console.log(`Title: ${ocrResult.title}`);
            console.log(`OCR Extraction Used: ${ocrResult._extraction?.layersUsed?.includes(6) ? 'Yes' : 'No'}`);
            console.log(`Total Confidence: ${ocrResult._extraction?.validationScore}%`);
            
            await ocrScraper.close();
        }

        console.log(chalk.cyan('\n🔍 Testing multi-event extraction...'));
        const multiEventResult = await scraper.scrapeEventListing({
            debug: true,
            maxEventsBatch: 5,
            skipAddressEnhancement: true
        });
        
        console.log(chalk.green(`\n✅ Multi-event extraction: Found ${multiEventResult.length} events`));
        multiEventResult.forEach((event, i) => {
            console.log(`${i + 1}. ${event.title || 'Untitled'} - ${event.venue || 'No venue'}`);
        });

    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
    } finally {
        await scraper.close();
        console.log(chalk.blue('\n🏁 Quick test complete'));
    }
}

if (require.main === module) {
    quickTest();
}