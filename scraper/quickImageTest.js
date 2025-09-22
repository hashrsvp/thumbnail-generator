#!/usr/bin/env node

/**
 * Quick Image Test - Focus only on image extraction
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function quickImageTest() {
    const scraper = new EventScraper({
        headless: true, // Run headless for speed
        timeout: 30000
    });
    
    try {
        const testUrl = 'https://www.eventbrite.com/e/celebrate-with-central-current-tickets-1306982733539';
        
        console.log(chalk.blue('🔍 QUICK IMAGE EXTRACTION TEST'));
        console.log(chalk.cyan(`URL: ${testUrl}\n`));
        
        await scraper.initBrowser();
        
        // Navigate to page
        await scraper.page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait for content to load
        console.log('⏳ Waiting for page content...');
        await scraper.page.waitForTimeout(5000);
        
        // Test ONLY the image extraction
        console.log('🖼️  Testing image extraction...\n');
        const imageUrls = await scraper.extractEventbriteImages();
        
        console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        console.log(chalk.green('✅ IMAGE EXTRACTION RESULTS:'));
        console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        
        if (imageUrls && imageUrls.length > 0) {
            console.log(chalk.green(`Found ${imageUrls.length} image(s):`));
            imageUrls.forEach((url, i) => {
                console.log(chalk.cyan(`[${i + 1}] ${url}`));
            });
            
            // Test image selection
            const selectedUrl = await scraper.imageSelector.selectBestImage(imageUrls, 'Central Current Event', 'Syracuse');
            
            console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk.green('🎯 IMAGE SELECTION RESULT:'));
            console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(chalk.white(`Selected: ${selectedUrl || 'None'}`));
            
            if (selectedUrl) {
                console.log(chalk.green('\n✅ SUCCESS: Image extraction working!'));
            } else {
                console.log(chalk.red('\n❌ ISSUE: Images found but none selected'));
            }
            
        } else {
            console.log(chalk.red('❌ No images found'));
        }
        
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
    } finally {
        await scraper.closeBrowser();
    }
}

quickImageTest().catch(console.error);