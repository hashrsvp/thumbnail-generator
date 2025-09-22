#!/usr/bin/env node

/**
 * End-to-End Ice Cube Oakland Arena Test
 * 
 * Tests the complete flow including scraping and validation
 * for the specific URL mentioned in the requirements
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testIceCubeEvent() {
    console.log(chalk.blue('\n🎤 ICE CUBE OAKLAND ARENA - END-TO-END TEST'));
    console.log(chalk.blue('='.repeat(60)));
    
    const testUrl = 'https://www.theoaklandarena.com/events/detail/ice-cube-truth-to-power-four-decades-of-attitude';
    
    const scraper = new EventScraper({
        headless: true,
        debug: false, // Reduce noise
        timeout: 45000
    });
    
    try {
        console.log(chalk.cyan(`\n🌐 Testing URL: ${testUrl}`));
        console.log(chalk.gray('Method: scrapeGeneric() with full validation pipeline'));
        
        await scraper.initBrowser();
        await scraper.page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 45000 
        });
        
        // Wait for dynamic content
        await scraper.page.waitForTimeout(5000);
        
        // Extract using scrapeGeneric (full pipeline)
        console.log(chalk.yellow('\n⚡ Running scrapeGeneric()...'));
        const eventData = await scraper.scrapeGeneric();
        
        // Process the data (includes validation)
        console.log(chalk.yellow('⚡ Processing and validating data...'));
        const finalData = await scraper.processEventData(eventData);
        
        console.log(chalk.green('\n✅ EXTRACTION COMPLETE'));
        console.log(chalk.blue('='.repeat(40)));
        
        // Display key results
        console.log(`📝 Title: ${finalData.title || 'Not extracted'}`);
        console.log(`🏢 Venue: ${finalData.venue || 'Not extracted'}`);
        console.log(`📍 Address: ${finalData.address || 'Not extracted'}`);
        console.log(`📅 Date: ${finalData.date || 'Not extracted'}`);
        console.log(`⏰ Time: ${finalData.startTime || 'Not extracted'}`);
        console.log(`🏷️  Categories: [${finalData.categories ? finalData.categories.join(', ') : 'None'}]`);
        console.log(`💰 Free: ${finalData.free}`);
        console.log(`🎫 Sold Out: ${finalData.soldOut}`);
        console.log(`🔗 Tickets: ${finalData.ticketsLink || 'Not available'}`);
        console.log(`🖼️  Image: ${finalData.imageUrl ? 'Available' : 'Not found'}`);
        
        // Category validation analysis
        console.log(chalk.magenta('\n🔍 CATEGORY ANALYSIS'));
        console.log('='.repeat(25));
        
        const categories = finalData.categories || [];
        const validHashCategories = ['Music', 'Festivals', 'Food Events', 'Sports/Games', 'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'];
        
        const allValidCategories = categories.every(cat => validHashCategories.includes(cat));
        const hasMusic = categories.includes('Music');
        const categoryCount = categories.length;
        
        console.log(`✓ All categories valid: ${allValidCategories ? '✅' : '❌'}`);
        console.log(`✓ Contains Music category: ${hasMusic ? '✅' : '❌'}`);
        console.log(`✓ Category count (≤2): ${categoryCount <= 2 ? '✅' : '❌'} (${categoryCount} categories)`);
        console.log(`✓ No Hip Hop category: ${!categories.includes('Hip Hop') ? '✅' : '❌'}`);
        console.log(`✓ No Concert category: ${!categories.includes('Concert') ? '✅' : '❌'}`);
        
        // Hash compliance check
        console.log(chalk.blue('\n📊 HASH APP COMPLIANCE'));
        console.log('='.repeat(30));
        
        const hasRequiredFields = !!(finalData.title && finalData.venue && finalData.categories && finalData.date);
        const addressHasComma = finalData.address && finalData.address.includes(',');
        const validImageUrl = finalData.imageUrl && (finalData.imageUrl.startsWith('http') || finalData.imageUrl.startsWith('https'));
        
        console.log(`✓ Required fields present: ${hasRequiredFields ? '✅' : '❌'}`);
        console.log(`✓ Address has comma: ${addressHasComma ? '✅' : '❌'}`);
        console.log(`✓ Valid image URL: ${validImageUrl ? '✅' : '❌'}`);
        console.log(`✓ Valid categories: ${allValidCategories ? '✅' : '❌'}`);
        
        const hashCompliant = hasRequiredFields && allValidCategories && categoryCount > 0 && categoryCount <= 2;
        
        console.log(chalk.cyan('\n🎯 FINAL RESULTS'));
        console.log('='.repeat(20));
        
        if (hashCompliant && hasMusic) {
            console.log(chalk.green('🎉 SUCCESS: Ice Cube event properly processed!'));
            console.log(chalk.green('✅ Category validation working correctly'));
            console.log(chalk.green('✅ Invalid categories filtered/mapped'));
            console.log(chalk.green('✅ Hash app compliance: 100%'));
            console.log(chalk.green('✅ Event ready for Hash Firebase submission'));
        } else {
            console.log(chalk.yellow('⚠️  PARTIAL SUCCESS: Some issues detected'));
            if (!hasMusic) console.log(chalk.yellow('  - Music category not detected'));
            if (!hashCompliant) console.log(chalk.yellow('  - Hash compliance issues'));
        }
        
        // Show extraction metadata if available
        if (eventData._extraction) {
            console.log(chalk.gray('\n📈 Extraction Metadata:'));
            console.log(`  Method: ${eventData._extraction.method}`);
            console.log(`  Processing Time: ${eventData._extraction.processingTimeMs || 'N/A'}ms`);
            console.log(`  Validation Passed: ${eventData._extraction.validationPassed || 'N/A'}`);
            console.log(`  Hash Compliant: ${eventData._extraction.hashCompliant || 'N/A'}`);
        }
        
        // Final summary
        console.log(chalk.blue('\n📋 TEST SUMMARY'));
        console.log(`URL: ${testUrl}`);
        console.log(`Categories: [${categories.join(', ')}]`);
        console.log(`Hash Compliance: ${hashCompliant ? '100%' : '<100%'}`);
        console.log(`Ready for Hash App: ${hashCompliant && hasMusic ? 'YES ✅' : 'NO ❌'}`);
        
        return { success: hashCompliant && hasMusic, data: finalData };
        
    } catch (error) {
        console.error(chalk.red('\n❌ Test failed:'), error.message);
        return { success: false, error: error.message };
    } finally {
        await scraper.closeBrowser();
    }
}

// Run the test
if (require.main === module) {
    testIceCubeEvent()
        .then(result => {
            if (result.success) {
                console.log(chalk.green('\n🎊 Overall test: PASSED'));
                process.exit(0);
            } else {
                console.log(chalk.red('\n💥 Overall test: FAILED'));
                process.exit(1);
            }
        })
        .catch(error => {
            console.error(chalk.red('Test execution error:'), error);
            process.exit(1);
        });
}

module.exports = { testIceCubeEvent };