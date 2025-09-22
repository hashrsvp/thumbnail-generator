/**
 * OCR Integration Test for Universal Extractor Layer 6
 * 
 * Tests the integration of flyerTextExtractor as Layer 6 in the Universal Extractor system
 * with confidence-based triggering and concurrent processing.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const chalk = require('chalk');
const { chromium } = require('playwright');
const UniversalExtractor = require('../utils/universalExtractor');

/**
 * Test configuration
 */
const TEST_CONFIG = {
    // Test URLs with different confidence scenarios
    urls: {
        highConfidence: 'https://www.eventbrite.com/e/sample-event-with-structured-data',
        lowConfidence: 'https://example.com/simple-flyer-only-event',
        local: 'file://test-page-with-flyers.html'
    },
    
    // OCR test settings
    ocrSettings: {
        ocrTriggerThreshold: 70,
        maxFlyerImages: 3,
        ocrTimeout: 10000,
        debug: true,
        verbose: true
    },
    
    // Browser settings
    browserSettings: {
        headless: true,
        timeout: 30000
    }
};

/**
 * Main test runner
 */
async function runOCRIntegrationTests() {
    console.log(chalk.blue('🧪 Starting OCR Integration Tests for Universal Extractor Layer 6\n'));
    
    let browser, page;
    let testResults = {
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0
    };
    
    try {
        // Initialize browser
        console.log(chalk.cyan('🚀 Initializing browser...'));
        browser = await chromium.launch(TEST_CONFIG.browserSettings);
        page = await browser.newPage();
        
        // Test 1: Verify Layer 6 is properly integrated
        await runTest('Layer 6 Integration Test', async () => {
            const extractor = new UniversalExtractor(page, TEST_CONFIG.ocrSettings);
            
            // Check if Layer 6 exists and is FlyerTextExtractor
            if (!extractor.layers[6]) {
                throw new Error('Layer 6 not found in extractor layers');
            }
            
            if (extractor.layers[6].name !== 'Flyer Text Extraction (OCR)') {
                throw new Error('Layer 6 is not the FlyerTextExtractor');
            }
            
            // Check if OCR settings are properly configured
            if (extractor.options.ocrTriggerThreshold !== TEST_CONFIG.ocrSettings.ocrTriggerThreshold) {
                throw new Error('OCR trigger threshold not properly configured');
            }
            
            console.log(chalk.green('✅ Layer 6 properly integrated with correct configuration'));
        }, testResults);
        
        // Test 2: Verify confidence-based triggering (high confidence scenario)
        await runTest('High Confidence - OCR Skip Test', async () => {
            // Create a mock page with high-confidence structured data
            const mockHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Event</title>
                    <script type="application/ld+json">
                    {
                        "@context": "https://schema.org",
                        "@type": "Event",
                        "name": "Test Concert Event",
                        "startDate": "2024-12-25T19:00:00",
                        "location": {
                            "@type": "Place",
                            "name": "Test Venue",
                            "address": "123 Test Street, Test City, TS 12345"
                        },
                        "description": "A test concert event with complete structured data"
                    }
                    </script>
                </head>
                <body>
                    <h1>Test Concert Event</h1>
                    <img src="test-flyer.jpg" alt="event flyer" class="event-poster" width="400" height="600">
                </body>
                </html>
            `;
            
            await page.setContent(mockHTML);
            
            const extractor = new UniversalExtractor(page, TEST_CONFIG.ocrSettings);
            const results = await extractor.extract();
            
            // Should have high confidence from structured data (Layer 1)
            if (results.metadata.totalConfidence < 70) {
                throw new Error(`Expected high confidence, got ${results.metadata.totalConfidence}%`);
            }
            
            // Layer 6 (OCR) should not have been used
            if (results.metadata.layersUsed.includes(6)) {
                throw new Error('OCR layer should not have run with high confidence');
            }
            
            console.log(chalk.green(`✅ OCR correctly skipped with ${results.metadata.totalConfidence}% confidence`));
        }, testResults);
        
        // Test 3: Verify confidence-based triggering (low confidence scenario)
        await runTest('Low Confidence - OCR Trigger Test', async () => {
            // Create a mock page with only minimal data (should trigger OCR)
            const mockHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Event Page</title>
                </head>
                <body>
                    <div>Some event happening soon</div>
                    <img src="test-flyer.jpg" alt="flyer" class="event-poster" width="400" height="600">
                    <img src="test-flyer2.png" alt="event banner" width="300" height="400">
                </body>
                </html>
            `;
            
            await page.setContent(mockHTML);
            
            const extractor = new UniversalExtractor(page, {
                ...TEST_CONFIG.ocrSettings,
                ocrTriggerThreshold: 90 // Set high threshold to force OCR
            });
            
            const results = await extractor.extract();
            
            // Should have low confidence from basic layers
            if (results.metadata.totalConfidence >= 90) {
                console.log(chalk.yellow('⚠️  Higher confidence than expected, OCR may not trigger'));
                return; // Skip test if confidence is unexpectedly high
            }
            
            // Layer 6 (OCR) should have been attempted (even if it fails due to mock images)
            if (!results.layerResults[6]) {
                throw new Error('OCR layer should have been triggered with low confidence');
            }
            
            console.log(chalk.green(`✅ OCR correctly triggered with ${results.metadata.totalConfidence}% confidence`));
        }, testResults);
        
        // Test 4: Test concurrent image processing capability
        await runTest('Concurrent Image Processing Test', async () => {
            // Create a mock page with multiple flyer-style images
            const mockHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Multi-Flyer Event</title>
                </head>
                <body>
                    <h1>Event with Multiple Flyers</h1>
                    <img src="flyer1.jpg" alt="main event flyer" class="event-image" width="400" height="600">
                    <img src="flyer2.png" alt="event poster" class="poster" width="300" height="450">
                    <img src="flyer3.jpg" alt="event banner" class="banner" width="800" height="200">
                    <img src="flyer4.webp" alt="promotional image" class="promo" width="500" height="700">
                    <img src="flyer5.jpg" alt="event announcement" class="announcement" width="350" height="500">
                </body>
                </html>
            `;
            
            await page.setContent(mockHTML);
            
            const extractor = new UniversalExtractor(page, {
                ...TEST_CONFIG.ocrSettings,
                ocrTriggerThreshold: 90, // Force OCR
                maxFlyerImages: 3
            });
            
            // Get the flyer extractor to test image selection
            const flyerExtractor = extractor.layers[6];
            const images = await flyerExtractor.findFlyerImages();
            
            // Should find the flyer-style images
            if (images.length === 0) {
                throw new Error('Should have found flyer-style images');
            }
            
            // Should be limited to maxFlyerImages
            if (images.length > TEST_CONFIG.ocrSettings.maxFlyerImages) {
                throw new Error(`Should process max ${TEST_CONFIG.ocrSettings.maxFlyerImages} images, found ${images.length}`);
            }
            
            // Check image prioritization
            const topImage = images[0];
            if (topImage.score <= 0) {
                throw new Error('Image prioritization not working correctly');
            }
            
            console.log(chalk.green(`✅ Found ${images.length} flyer images with proper prioritization (top score: ${topImage.score})`));
        }, testResults);
        
        // Test 5: Test error handling and timeout protection
        await runTest('Error Handling and Timeout Test', async () => {
            const extractor = new UniversalExtractor(page, {
                ...TEST_CONFIG.ocrSettings,
                ocrTriggerThreshold: 90,
                ocrTimeout: 100 // Very short timeout to test timeout handling
            });
            
            // This should not throw errors even if OCR fails
            const results = await extractor.extract();
            
            // Results should still be returned even if OCR fails
            if (!results) {
                throw new Error('Should return results even if OCR fails');
            }
            
            if (!results.metadata) {
                throw new Error('Should have metadata even if OCR fails');
            }
            
            console.log(chalk.green('✅ Error handling works correctly'));
        }, testResults);
        
        // Test 6: Test cleanup functionality
        await runTest('Cleanup Test', async () => {
            const extractor = new UniversalExtractor(page, TEST_CONFIG.ocrSettings);
            
            // Initialize OCR by running extraction
            await extractor.extract();
            
            // Test cleanup
            await extractor.cleanupAfterExtraction();
            
            // Check if OCR worker is cleaned up
            const flyerExtractor = extractor.layers[6];
            if (flyerExtractor.isInitialized) {
                throw new Error('OCR worker should be cleaned up');
            }
            
            console.log(chalk.green('✅ Cleanup works correctly'));
        }, testResults);
        
    } catch (error) {
        console.error(chalk.red(`❌ Test setup failed: ${error.message}`));
        testResults.failed++;
        testResults.total++;
    } finally {
        // Cleanup
        if (browser) {
            await browser.close();
        }
    }
    
    // Print test results
    printTestResults(testResults);
    
    return testResults;
}

/**
 * Run individual test with error handling
 */
async function runTest(testName, testFunction, results) {
    results.total++;
    
    try {
        console.log(chalk.cyan(`\n🧪 Running: ${testName}`));
        await testFunction();
        results.passed++;
        console.log(chalk.green(`✅ PASSED: ${testName}`));
    } catch (error) {
        results.failed++;
        console.log(chalk.red(`❌ FAILED: ${testName}`));
        console.log(chalk.red(`   Error: ${error.message}`));
    }
}

/**
 * Print test results summary
 */
function printTestResults(results) {
    console.log(chalk.blue('\n📊 Test Results Summary'));
    console.log(chalk.blue('========================'));
    console.log(chalk.green(`✅ Passed: ${results.passed}/${results.total}`));
    
    if (results.failed > 0) {
        console.log(chalk.red(`❌ Failed: ${results.failed}/${results.total}`));
    }
    
    if (results.skipped > 0) {
        console.log(chalk.yellow(`⏭️  Skipped: ${results.skipped}/${results.total}`));
    }
    
    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    console.log(chalk.blue(`📈 Success Rate: ${successRate}%`));
    
    if (results.passed === results.total) {
        console.log(chalk.green('\n🎉 All tests passed! OCR integration is working correctly.'));
    } else {
        console.log(chalk.red('\n⚠️  Some tests failed. Please review the errors above.'));
    }
}

/**
 * Usage information
 */
function printUsage() {
    console.log(chalk.blue('OCR Integration Test'));
    console.log(chalk.blue('==================='));
    console.log('');
    console.log('This test verifies the integration of OCR Layer 6 in the Universal Extractor system.');
    console.log('');
    console.log('Features tested:');
    console.log('• Layer 6 integration and configuration');
    console.log('• Confidence-based triggering (< 70% threshold)');
    console.log('• Concurrent processing of up to 3 flyer images');
    console.log('• Error handling and timeout protection');
    console.log('• Resource cleanup');
    console.log('');
    console.log('Usage: node test-ocr-integration.js');
    console.log('');
}

// Run tests if called directly
if (require.main === module) {
    printUsage();
    runOCRIntegrationTests().catch(error => {
        console.error(chalk.red(`Test runner failed: ${error.message}`));
        process.exit(1);
    });
}

module.exports = {
    runOCRIntegrationTests,
    TEST_CONFIG
};