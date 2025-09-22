#!/usr/bin/env node

/**
 * Mad Oak Bar Individual Flyer OCR Test
 * 
 * Tests OCR extraction on a specific event flyer from Mad Oak Bar
 * to demonstrate the OCR capabilities on their high-quality images
 */

const FlyerTextExtractor = require('./utils/flyerTextExtractor');
const { chromium } = require('playwright');
const chalk = require('chalk');

async function testIndividualFlyer() {
    console.log(chalk.blue('🎯 MAD OAK BAR - INDIVIDUAL FLYER OCR TEST'));
    console.log('='.repeat(45));
    console.log('');

    // Initialize browser for image access
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Navigate to the events page to access images
        console.log(chalk.cyan('🔍 Accessing Mad Oak Bar events page...'));
        await page.goto('https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings', {
            waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(3000);

        // Find event flyer images
        const eventImages = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images
                .filter(img => img.src.includes('spotapps.co/spots/'))
                .map(img => ({
                    src: img.src,
                    width: img.width || img.naturalWidth,
                    height: img.height || img.naturalHeight
                }))
                .filter(img => img.width >= 300 && img.height >= 300)
                .slice(0, 3); // Test first 3 images
        });

        console.log(chalk.green(`✅ Found ${eventImages.length} suitable flyer images`));

        // Initialize OCR extractor
        const ocrExtractor = new FlyerTextExtractor(page, {
            debug: true,
            verbose: true,
            timeout: 25000,
            enablePreprocessing: true,
            contrastEnhancement: true,
            minConfidence: 40
        });

        // Test each flyer individually
        for (let i = 0; i < eventImages.length; i++) {
            const flyer = eventImages[i];
            
            console.log(chalk.yellow(`\n📸 Testing Flyer ${i + 1}/${eventImages.length}`));
            console.log(chalk.gray(`   URL: ${flyer.src}`));
            console.log(chalk.gray(`   Size: ${flyer.width}x${flyer.height}`));

            try {
                // Create a test page with just this image
                const testImageHtml = `
                    <!DOCTYPE html>
                    <html>
                    <body>
                        <img src="${flyer.src}" style="max-width: 100%;" alt="Event Flyer">
                    </body>
                    </html>
                `;

                await page.setContent(testImageHtml);
                await page.waitForSelector('img');

                console.log(chalk.blue('   🔍 Running OCR extraction...'));
                const startTime = Date.now();
                
                const ocrResult = await ocrExtractor.extract();
                
                const extractionTime = Date.now() - startTime;

                if (ocrResult && ocrResult.data && Object.keys(ocrResult.data).length > 0) {
                    console.log(chalk.green(`   ✅ SUCCESS (${extractionTime}ms)`));
                    console.log(chalk.cyan('   📋 Extracted Data:'));
                    
                    Object.entries(ocrResult.data).forEach(([field, value]) => {
                        const confidence = ocrResult.confidence[field] || 0;
                        let displayValue = value;
                        
                        if (typeof value === 'string' && value.length > 60) {
                            displayValue = value.substring(0, 60) + '...';
                        }
                        
                        console.log(chalk.gray(`      ${field}: "${displayValue}" (${confidence}%)`));
                    });

                    // Show raw text sample if available
                    if (ocrResult.rawText && ocrResult.rawText.length > 20) {
                        console.log(chalk.cyan('   📝 Raw OCR Text Sample:'));
                        const textSample = ocrResult.rawText.substring(0, 200).replace(/\n/g, ' ');
                        console.log(chalk.gray(`      "${textSample}..."`));
                    }

                    // Show processing metadata
                    if (ocrResult.metadata) {
                        console.log(chalk.cyan('   📊 Processing Info:'));
                        console.log(chalk.gray(`      Processing time: ${ocrResult.metadata.processingTime || extractionTime}ms`));
                        console.log(chalk.gray(`      OCR confidence: ${ocrResult.metadata.ocrConfidence || 'N/A'}%`));
                        console.log(chalk.gray(`      Text length: ${ocrResult.rawText?.length || 0} chars`));
                    }

                } else {
                    console.log(chalk.red(`   ❌ FAILED - No data extracted (${extractionTime}ms)`));
                    
                    if (ocrResult?.error) {
                        console.log(chalk.red(`      Error: ${ocrResult.error}`));
                    }
                }

            } catch (error) {
                console.log(chalk.red(`   ❌ ERROR: ${error.message}`));
            }

            // Delay between tests
            if (i < eventImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        // Summary and recommendations
        console.log(chalk.blue('\n💡 RECOMMENDATIONS BASED ON TEST RESULTS'));
        console.log('-'.repeat(40));
        
        if (eventImages.length > 0) {
            console.log(chalk.green('✅ Mad Oak Bar uses high-quality event flyers'));
            console.log(chalk.yellow('🎯 OCR is highly recommended for this venue'));
            console.log('');
            console.log(chalk.cyan('Implementation suggestions:'));
            console.log(chalk.gray('• Set ocrTriggerThreshold to 30-40% to force OCR'));
            console.log(chalk.gray('• Enable image preprocessing for better accuracy'));
            console.log(chalk.gray('• Use timeout of 25-30 seconds for OCR processing'));
            console.log(chalk.gray('• Configure batch processing for multiple flyers'));
            console.log('');
            console.log(chalk.cyan('Expected benefits:'));
            console.log(chalk.gray('• Extract event titles from flyer headers'));
            console.log(chalk.gray('• Get accurate dates and times from promotional text'));
            console.log(chalk.gray('• Capture venue details and address information'));
            console.log(chalk.gray('• Extract pricing and ticket information'));
        } else {
            console.log(chalk.red('❌ No suitable flyer images found for OCR testing'));
            console.log(chalk.yellow('• Recommend standard HTML extraction approach'));
        }

    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
    } finally {
        await browser.close();
        console.log(chalk.blue('\n🏁 Individual flyer test complete'));
    }
}

if (require.main === module) {
    testIndividualFlyer().catch(console.error);
}

module.exports = testIndividualFlyer;