#!/usr/bin/env node

/**
 * Test script for Universal Extraction System in scrapeGeneric()
 * 
 * Tests the completely rewritten scrapeGeneric() method with the new
 * 5-layer cascade system and specialized extractors.
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testUniversalExtraction() {
    console.log(chalk.blue('🧪 Testing Universal Extraction System...'));
    
    const scraper = new EventScraper({
        headless: true,
        debug: true,
        verbose: true,
        timeout: 15000
    });
    
    try {
        await scraper.initBrowser();
        
        // Test URLs with different extraction challenges
        const testUrls = [
            // JSON-LD structured data test
            'https://www.eventbrite.com/e/sample-event-tickets-123456',
            
            // Meta tags test
            'https://www.facebook.com/events/123456789',
            
            // Generic HTML test
            'https://example-venue.com/events/music-night'
        ];
        
        for (const url of testUrls) {
            console.log(chalk.yellow(`\n🔍 Testing URL: ${url}`));
            
            try {
                // Navigate to test page (will fail for fake URLs but that's OK for testing)
                try {
                    await scraper.page.goto(url, { 
                        waitUntil: 'domcontentloaded',
                        timeout: 10000 
                    });
                } catch (navError) {
                    console.log(chalk.gray(`ℹ️  Navigation failed (expected for test URLs): ${navError.message}`));
                    
                    // Create a mock HTML page for testing
                    await scraper.page.setContent(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Test Event</title>
                            <meta property="og:title" content="Amazing Music Concert" />
                            <meta property="og:description" content="Join us for an incredible night of music" />
                            <meta name="twitter:title" content="Amazing Music Concert" />
                            <script type="application/ld+json">
                            {
                                "@context": "https://schema.org",
                                "@type": "Event",
                                "name": "Test Music Event",
                                "startDate": "2024-01-15T20:00",
                                "endDate": "2024-01-15T23:00",
                                "location": {
                                    "@type": "Place",
                                    "name": "The Music Hall",
                                    "address": "123 Music Street, Los Angeles, CA 90210"
                                },
                                "description": "An amazing musical experience",
                                "image": "https://example.com/event-image.jpg"
                            }
                            </script>
                        </head>
                        <body>
                            <h1>Test Event Page</h1>
                            <div class="event-info">
                                <h2>Amazing Music Concert</h2>
                                <p class="date">January 15, 2024 at 8:00 PM</p>
                                <p class="venue">The Music Hall</p>
                                <p class="address">123 Music Street, Los Angeles, CA 90210</p>
                                <p class="category">Music</p>
                                <img src="https://example.com/event-image.jpg" alt="Event Image" />
                            </div>
                        </body>
                        </html>
                    `);
                }
                
                console.log(chalk.blue('\n🚀 Running Universal Extraction...'));
                
                // Test the new scrapeGeneric method with Universal Extraction
                const result = await scraper.scrapeGeneric({
                    debug: true,
                    verbose: true,
                    minConfidence: 50,
                    enforceHashRequirements: true,
                    requireAddressComma: true
                });
                
                console.log(chalk.green('\n✅ Extraction Result:'));
                console.log(chalk.cyan(JSON.stringify(result, null, 2)));
                
                // Analyze results
                if (result._extraction) {
                    console.log(chalk.blue(`\n📊 Extraction Method: ${result._extraction.method}`));
                    console.log(chalk.blue(`⏱️  Processing Time: ${result._extraction.processingTimeMs}ms`));
                    
                    if (result._extraction.confidenceScores) {
                        console.log(chalk.blue('🎯 Confidence Scores:'));
                        Object.entries(result._extraction.confidenceScores).forEach(([field, score]) => {
                            const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
                            console.log(chalk[color](`   ${field}: ${score}%`));
                        });
                    }
                }
                
                // Validation check
                const hasTitle = result.title || result.name;
                const hasDate = result.startDate || result.date || result.dateTime;
                const hasLocation = result.venue || result.address || result.location;
                
                console.log(chalk.blue('\n🔍 Validation Check:'));
                console.log(chalk[hasTitle ? 'green' : 'red'](`   Title/Name: ${hasTitle ? '✅' : '❌'}`));
                console.log(chalk[hasDate ? 'green' : 'red'](`   Date/Time: ${hasDate ? '✅' : '❌'}`));
                console.log(chalk[hasLocation ? 'green' : 'red'](`   Location: ${hasLocation ? '✅' : '❌'}`));
                
            } catch (error) {
                console.error(chalk.red(`❌ Test failed for ${url}:`), error.message);
            }
        }
        
        console.log(chalk.green('\n🎉 Universal Extraction System test completed!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Test setup failed:'), error.message);
    } finally {
        await scraper.close();
    }
}

// Run the test
if (require.main === module) {
    testUniversalExtraction().catch(console.error);
}

module.exports = testUniversalExtraction;