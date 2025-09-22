#!/usr/bin/env node

/**
 * Basic test for Universal Extraction System without DataValidator dependency
 * 
 * Tests only the core extraction functionality without advanced validation
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

// Create a simple mock DataValidator to avoid moment dependency
class SimpleMockValidator {
    validateAndFix(data, options = {}) {
        return {
            isValid: true,
            data: data,
            score: 85,
            hashCompliant: true,
            errors: [],
            warnings: []
        };
    }
}

async function testBasicExtraction() {
    console.log(chalk.blue('🧪 Testing Basic Universal Extraction...'));
    
    const scraper = new EventScraper({
        headless: true,
        debug: true,
        timeout: 10000
    });
    
    // Replace the complex validator with our simple mock
    scraper.dataValidator = new SimpleMockValidator();
    
    try {
        await scraper.initBrowser();
        
        // Create a test page with structured data
        await scraper.page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Test Event</title>
                <meta property="og:title" content="Universal Extraction Test Concert" />
                <meta property="og:description" content="Testing our 5-layer cascade system" />
                <meta name="twitter:title" content="Universal Extraction Test Concert" />
                <script type="application/ld+json">
                {
                    "@context": "https://schema.org",
                    "@type": "Event",
                    "name": "Universal Extraction Test Concert",
                    "startDate": "2024-02-15T20:00",
                    "endDate": "2024-02-15T23:30",
                    "location": {
                        "@type": "Place",
                        "name": "The Test Venue",
                        "address": "123 Test Street, San Francisco, CA 94102"
                    },
                    "description": "A comprehensive test of our universal extraction system",
                    "image": "https://example.com/test-event.jpg"
                }
                </script>
            </head>
            <body>
                <h1>Universal Extraction Test Concert</h1>
                <div class="event-details">
                    <h2>Universal Extraction Test Concert</h2>
                    <p class="date">February 15, 2024 at 8:00 PM</p>
                    <p class="venue">The Test Venue</p>
                    <p class="address">123 Test Street, San Francisco, CA 94102</p>
                    <p class="category">Music</p>
                    <img src="https://example.com/test-event.jpg" alt="Event Image" />
                </div>
            </body>
            </html>
        `);
        
        console.log(chalk.blue('\\n🚀 Running Universal Extraction on test page...'));
        
        // Test the rewritten scrapeGeneric method
        const result = await scraper.scrapeGeneric({
            debug: true,
            minConfidence: 50,
            enforceHashRequirements: true
        });
        
        console.log(chalk.green('\\n✅ Universal Extraction Result:'));
        console.log(chalk.cyan(JSON.stringify(result, null, 2)));
        
        // Verify the extraction worked
        const hasTitle = result.title || result.name;
        const hasDate = result.startDate || result.date || result.dateTime;
        const hasLocation = result.venue || result.address || result.location;
        const hasImage = result.imageUrls && result.imageUrls.length > 0;
        
        console.log(chalk.blue('\\n🔍 Extraction Verification:'));
        console.log(chalk[hasTitle ? 'green' : 'red'](`   Title/Name: ${hasTitle ? '✅' : '❌'} ${hasTitle || 'Not found'}`));
        console.log(chalk[hasDate ? 'green' : 'red'](`   Date/Time: ${hasDate ? '✅' : '❌'} ${hasDate || 'Not found'}`));
        console.log(chalk[hasLocation ? 'green' : 'red'](`   Location: ${hasLocation ? '✅' : '❌'} ${hasLocation || 'Not found'}`));
        console.log(chalk[hasImage ? 'green' : 'red'](`   Images: ${hasImage ? '✅' : '❌'} ${hasImage ? result.imageUrls.length + ' found' : 'Not found'}`));
        
        if (result._extraction) {
            console.log(chalk.blue('\\n📊 Extraction Metadata:'));
            console.log(chalk.gray(`   Method: ${result._extraction.method}`));
            console.log(chalk.gray(`   Processing Time: ${result._extraction.processingTimeMs}ms`));
            console.log(chalk.gray(`   Total Layers: ${result._extraction.totalLayers || 'Unknown'}`));
            
            if (result._extraction.confidenceScores) {
                console.log(chalk.blue('\\n🎯 Confidence Scores:'));
                Object.entries(result._extraction.confidenceScores).forEach(([field, score]) => {
                    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
                    console.log(chalk[color](`     ${field}: ${score}%`));
                });
            }
        }
        
        // Overall success assessment
        const successCount = [hasTitle, hasDate, hasLocation, hasImage].filter(Boolean).length;
        const totalTests = 4;
        const successRate = (successCount / totalTests) * 100;
        
        console.log(chalk.blue('\\n🏁 Test Results Summary:'));
        console.log(chalk[successRate >= 75 ? 'green' : successRate >= 50 ? 'yellow' : 'red'](
            `   Success Rate: ${successRate}% (${successCount}/${totalTests} tests passed)`
        ));
        
        if (successRate >= 75) {
            console.log(chalk.green('\\n🎉 Universal Extraction System is working correctly!'));
        } else if (successRate >= 50) {
            console.log(chalk.yellow('\\n⚠️  Universal Extraction System is partially working. Some improvements needed.'));
        } else {
            console.log(chalk.red('\\n❌ Universal Extraction System needs significant improvements.'));
        }
        
    } catch (error) {
        console.error(chalk.red('❌ Test failed:'), error.message);
        if (scraper.options.debug) {
            console.error(chalk.red('Stack trace:'), error.stack);
        }
    } finally {
        await scraper.close();
    }
}

// Run the test
if (require.main === module) {
    testBasicExtraction().catch(console.error);
}

module.exports = testBasicExtraction;