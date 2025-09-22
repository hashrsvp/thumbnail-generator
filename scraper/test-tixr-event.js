#!/usr/bin/env node

/**
 * Test script for Universal Event Scraper on Tixr event
 * Tests the robustness and extraction capabilities on a specific Tixr event
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testTixrEvent() {
    const testUrl = 'https://www.tixr.com/groups/publicsf/events/salute-presents-infinite-passion-153859?utm_source=publicsf&utm_medium=venuewebsite';
    
    console.log(chalk.blue('\n🧪 Testing Universal Event Scraper on Tixr Event'));
    console.log(chalk.blue('=' .repeat(60)));
    console.log(chalk.cyan(`🎯 Target URL: ${testUrl}`));
    console.log(chalk.gray('This is a DRY RUN test - no data will be saved to Firebase\n'));

    const scraper = new EventScraper({
        headless: false,  // Show browser for debugging
        debug: true,      // Enable debug logging
        verbose: true,    // Enable verbose output
        timeout: 45000    // Increase timeout for complex sites
    });

    let testResults = {
        success: false,
        extractionData: null,
        errors: [],
        performance: {},
        hashCompliance: {},
        confidenceScores: {}
    };

    const startTime = Date.now();

    try {
        console.log(chalk.blue('🚀 Initializing scraper...'));
        
        // Test the scrapeGeneric method directly since Tixr isn't in the site-specific scrapers
        await scraper.initBrowser();
        
        console.log(chalk.blue('🌐 Navigating to event page...'));
        await scraper.page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: scraper.options.timeout 
        });

        // Wait for content to load
        console.log(chalk.blue('⏳ Waiting for page content to load...'));
        await scraper.page.waitForTimeout(5000);

        // Test the Universal Extraction System
        console.log(chalk.blue('🔬 Testing Universal Extraction System...'));
        const extractedData = await scraper.scrapeGeneric({
            debug: true,
            verbose: true,
            minConfidence: 50, // Lower threshold for testing
            enabledLayers: [1, 2, 3, 4, 5] // All layers
        });

        testResults.success = true;
        testResults.extractionData = extractedData;
        testResults.performance.extractionTime = Date.now() - startTime;

        // Analyze results
        console.log(chalk.green('\n✅ EXTRACTION COMPLETED'));
        console.log(chalk.blue('=' .repeat(60)));
        
        // Basic data validation
        console.log(chalk.yellow('\n📊 EXTRACTED DATA ANALYSIS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        if (extractedData.title) {
            console.log(chalk.green(`✅ Title: "${extractedData.title}"`));
        } else {
            console.log(chalk.red('❌ Title: Not found'));
            testResults.errors.push('Missing title');
        }

        if (extractedData.venue) {
            console.log(chalk.green(`✅ Venue: "${extractedData.venue}"`));
        } else {
            console.log(chalk.red('❌ Venue: Not found'));
            testResults.errors.push('Missing venue');
        }

        if (extractedData.address || extractedData.rawLocation) {
            const address = extractedData.address || extractedData.rawLocation;
            console.log(chalk.green(`✅ Address: "${address}"`));
            
            // Check Hash app compliance for address format
            if (address.includes(',')) {
                console.log(chalk.green('✅ Address contains comma (Hash compliant)'));
                testResults.hashCompliance.addressFormat = true;
            } else {
                console.log(chalk.yellow('⚠️  Address missing comma (Hash prefers comma-separated)'));
                testResults.hashCompliance.addressFormat = false;
            }
        } else {
            console.log(chalk.red('❌ Address: Not found'));
            testResults.errors.push('Missing address');
        }

        if (extractedData.startDate || extractedData.date) {
            const date = extractedData.startDate || extractedData.date;
            console.log(chalk.green(`✅ Date: "${date}"`));
            
            // Validate date format
            try {
                const parsedDate = new Date(date);
                if (isNaN(parsedDate.getTime())) {
                    console.log(chalk.yellow('⚠️  Date format may be invalid'));
                    testResults.errors.push('Invalid date format');
                } else {
                    console.log(chalk.green('✅ Date format is valid ISO string'));
                }
            } catch (error) {
                console.log(chalk.red('❌ Date parsing failed'));
                testResults.errors.push('Date parsing error');
            }
        } else {
            console.log(chalk.red('❌ Date: Not found'));
            testResults.errors.push('Missing date');
        }

        if (extractedData.startTime) {
            console.log(chalk.green(`✅ Time: "${extractedData.startTime}"`));
        } else {
            console.log(chalk.red('❌ Time: Not found'));
            testResults.errors.push('Missing time');
        }

        if (extractedData.description) {
            const desc = extractedData.description.substring(0, 100);
            console.log(chalk.green(`✅ Description: "${desc}..." (${extractedData.description.length} chars)`));
        } else {
            console.log(chalk.yellow('⚠️  Description: Not found (optional)'));
        }

        if (extractedData.imageUrls && extractedData.imageUrls.length > 0) {
            console.log(chalk.green(`✅ Images: ${extractedData.imageUrls.length} found`));
            extractedData.imageUrls.slice(0, 3).forEach((url, i) => {
                console.log(chalk.gray(`   [${i + 1}] ${url.substring(0, 80)}...`));
            });
        } else if (extractedData.imageUrl) {
            console.log(chalk.green(`✅ Image: Single image found`));
            console.log(chalk.gray(`   ${extractedData.imageUrl.substring(0, 80)}...`));
        } else {
            console.log(chalk.red('❌ Images: Not found'));
            testResults.errors.push('Missing images');
        }

        if (extractedData.category || extractedData.categories) {
            const cats = extractedData.categories || [extractedData.category];
            console.log(chalk.green(`✅ Categories: ${JSON.stringify(cats)}`));
            testResults.hashCompliance.categoriesFound = true;
        } else {
            console.log(chalk.yellow('⚠️  Categories: Not found (will be inferred)'));
            testResults.hashCompliance.categoriesFound = false;
        }

        // Free/Paid status
        if (extractedData.free !== undefined) {
            console.log(chalk.green(`✅ Free Status: ${extractedData.free ? 'Free' : 'Paid'}`));
        } else {
            console.log(chalk.yellow('⚠️  Free Status: Unknown'));
        }

        // Tickets link
        if (extractedData.ticketsLink || extractedData.sourceUrl) {
            const link = extractedData.ticketsLink || extractedData.sourceUrl;
            console.log(chalk.green(`✅ Tickets Link: "${link}"`));
        } else {
            console.log(chalk.red('❌ Tickets Link: Not found'));
            testResults.errors.push('Missing tickets link');
        }

        // Confidence scores analysis
        console.log(chalk.yellow('\n📈 CONFIDENCE SCORES:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        if (extractedData._extraction && extractedData._extraction.confidenceScores) {
            const scores = extractedData._extraction.confidenceScores;
            testResults.confidenceScores = scores;
            
            for (const [field, score] of Object.entries(scores)) {
                const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
                console.log(color(`${field}: ${score}%`));
            }
            
            const avgScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length;
            const overallColor = avgScore >= 80 ? chalk.green : avgScore >= 60 ? chalk.yellow : chalk.red;
            console.log(overallColor(`\n📊 Overall Confidence: ${Math.round(avgScore)}%`));
            testResults.performance.overallConfidence = Math.round(avgScore);
        } else {
            console.log(chalk.red('❌ No confidence scores available'));
        }

        // Performance metrics
        console.log(chalk.yellow('\n⚡ PERFORMANCE METRICS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        if (extractedData._extraction) {
            const extraction = extractedData._extraction;
            
            console.log(chalk.cyan(`🔧 Extraction Method: ${extraction.method}`));
            console.log(chalk.cyan(`⏱️  Processing Time: ${extraction.processingTimeMs}ms`));
            console.log(chalk.cyan(`🎯 Validation Score: ${extraction.validationScore}%`));
            console.log(chalk.cyan(`✅ Hash Compliant: ${extraction.hashCompliant ? 'Yes' : 'No'}`));
            
            testResults.performance.processingTime = extraction.processingTimeMs;
            testResults.performance.validationScore = extraction.validationScore;
            testResults.hashCompliance.overall = extraction.hashCompliant;
        }

        // Hash App Compliance Summary
        console.log(chalk.yellow('\n🏷️  HASH APP COMPLIANCE:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const requiredFields = ['title', 'venue', 'date', 'address'];
        const foundFields = requiredFields.filter(field => 
            extractedData[field] || extractedData[`raw${field.charAt(0).toUpperCase() + field.slice(1)}`] || 
            extractedData[`start${field.charAt(0).toUpperCase() + field.slice(1)}`]
        );
        
        console.log(chalk.green(`✅ Required fields found: ${foundFields.length}/${requiredFields.length}`));
        foundFields.forEach(field => console.log(chalk.gray(`   • ${field}`)));
        
        if (foundFields.length < requiredFields.length) {
            const missingFields = requiredFields.filter(field => !foundFields.includes(field));
            console.log(chalk.red(`❌ Missing required fields: ${missingFields.join(', ')}`));
        }

    } catch (error) {
        console.error(chalk.red('\n❌ TEST FAILED:'), error.message);
        testResults.success = false;
        testResults.errors.push(`Critical error: ${error.message}`);
        
        if (scraper.options.debug) {
            console.error(chalk.red('Stack trace:'), error.stack);
        }
    } finally {
        // Clean up
        await scraper.closeBrowser();
        testResults.performance.totalTime = Date.now() - startTime;
    }

    // Test Summary
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('🎯 TEST SUMMARY'));
    console.log(chalk.blue('='.repeat(60)));
    
    if (testResults.success) {
        console.log(chalk.green('✅ Overall Status: SUCCESS'));
    } else {
        console.log(chalk.red('❌ Overall Status: FAILED'));
    }
    
    console.log(chalk.cyan(`📊 Data extraction: ${testResults.success ? 'Working' : 'Failed'}`));
    console.log(chalk.cyan(`⚠️  Issues found: ${testResults.errors.length}`));
    console.log(chalk.cyan(`⏱️  Total time: ${testResults.performance.totalTime}ms`));
    
    if (testResults.performance.overallConfidence !== undefined) {
        console.log(chalk.cyan(`🎯 Confidence: ${testResults.performance.overallConfidence}%`));
    }
    
    if (testResults.errors.length > 0) {
        console.log(chalk.yellow('\n⚠️  ISSUES TO ADDRESS:'));
        testResults.errors.forEach((error, i) => {
            console.log(chalk.red(`   ${i + 1}. ${error}`));
        });
    }

    console.log(chalk.blue('\n🧪 Test completed successfully!'));
    
    return testResults;
}

// Run the test
if (require.main === module) {
    testTixrEvent()
        .then(results => {
            process.exit(results.success ? 0 : 1);
        })
        .catch(error => {
            console.error(chalk.red('Fatal test error:'), error);
            process.exit(1);
        });
}

module.exports = { testTixrEvent };