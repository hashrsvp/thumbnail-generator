#!/usr/bin/env node

/**
 * Test script for multi-event extraction capability
 * Tests the new scrapeEventListing() method on Cow Palace upcoming events
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function testMultiEventExtraction() {
    console.log(chalk.blue('🚀 Testing Multi-Event Extraction on Cow Palace'));
    console.log(chalk.gray('=' .repeat(60)));
    
    const scraper = new EventScraper({
        headless: true,   // Use headless for faster execution
        debug: true,      // Enable detailed logging
        verbose: true,    // Enable verbose output
        timeout: 60000    // 60 second timeout
    });
    
    let testResults = {
        url: 'https://www.cowpalace.com/cow-palace-arena-event-center/upcoming-events/',
        startTime: Date.now(),
        endTime: null,
        events: [],
        extractionMethod: null,
        errors: [],
        performanceMetrics: {},
        hashCompliance: {}
    };
    
    try {
        console.log(chalk.cyan('\n📋 Step 1: Initializing browser and navigating to Cow Palace...'));
        
        // Initialize browser
        await scraper.initBrowser();
        
        // Navigate to Cow Palace upcoming events page
        await scraper.page.goto(testResults.url, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        console.log(chalk.green('✅ Successfully loaded Cow Palace events page'));
        
        // Wait for content to load
        await scraper.page.waitForTimeout(3000);
        
        console.log(chalk.cyan('\n📊 Step 2: Testing scrapeEventListing() method...'));
        
        // Test the new scrapeEventListing() method
        const extractedEvents = await scraper.scrapeEventListing();
        
        testResults.events = extractedEvents;
        testResults.endTime = Date.now();
        testResults.performanceMetrics.totalProcessingTime = testResults.endTime - testResults.startTime;
        testResults.performanceMetrics.eventsExtracted = extractedEvents.length;
        
        console.log(chalk.green(`\n✅ Extraction completed! Found ${extractedEvents.length} events`));
        
        // Analyze each extracted event
        console.log(chalk.cyan('\n📋 Step 3: Analyzing extracted events...'));
        
        let hashCompliantCount = 0;
        let highConfidenceCount = 0;
        
        extractedEvents.forEach((event, index) => {
            console.log(chalk.yellow(`\n--- Event ${index + 1} ---`));
            
            // Check extraction method
            if (event._extraction && !testResults.extractionMethod) {
                testResults.extractionMethod = event._extraction.method;
                console.log(chalk.blue(`🔧 Extraction Method: ${event._extraction.method}`));
            }
            
            // Display event data
            console.log(chalk.white(`📍 Title: ${event.title || 'Not extracted'}`));
            console.log(chalk.white(`📅 Date: ${event.date || event.startDate || 'Not extracted'}`));
            console.log(chalk.white(`⏰ Time: ${event.time || event.startTime || 'Not extracted'}`));
            console.log(chalk.white(`🏢 Venue: ${event.venue || 'Not extracted'}`));
            console.log(chalk.white(`📍 Address: ${event.address || 'Not extracted'}`));
            console.log(chalk.white(`🏷️  Categories: ${event.categories ? event.categories.join(', ') : 'Not extracted'}`));
            console.log(chalk.white(`💰 Free: ${event.free !== undefined ? event.free : 'Not determined'}`));
            console.log(chalk.white(`🎫 Tickets Link: ${event.ticketsLink || 'Not extracted'}`));
            console.log(chalk.white(`🖼️  Image URL: ${event.imageUrl || 'Not extracted'}`));
            
            // Check Hash compliance
            const hasRequiredFields = event.title && (event.date || event.startDate) && 
                                    (event.venue || event.address);
            if (hasRequiredFields) {
                hashCompliantCount++;
                console.log(chalk.green(`✅ Hash App Compliant`));
            } else {
                console.log(chalk.red(`❌ Missing required Hash fields`));
            }
            
            // Check confidence scores (if available)
            if (event._extraction && event._extraction.confidenceScores) {
                const overallConfidence = calculateOverallConfidence(event._extraction.confidenceScores);
                console.log(chalk.blue(`📊 Confidence Score: ${overallConfidence}%`));
                if (overallConfidence >= 80) highConfidenceCount++;
            }
            
            // Validation results
            if (event._extraction) {
                console.log(chalk.blue(`✅ Validation Passed: ${event._extraction.validationPassed}`));
                console.log(chalk.blue(`🎯 Hash Compliant: ${event._extraction.hashCompliant}`));
            }
        });
        
        // Update test results
        testResults.hashCompliance = {
            compliantEvents: hashCompliantCount,
            totalEvents: extractedEvents.length,
            compliancePercentage: extractedEvents.length > 0 ? 
                Math.round((hashCompliantCount / extractedEvents.length) * 100) : 0
        };
        
        // Generate final report
        console.log(chalk.cyan('\n📋 Step 4: Generating test results summary...'));
        generateTestReport(testResults, highConfidenceCount);
        
    } catch (error) {
        console.error(chalk.red('\n❌ Test failed:'), error.message);
        console.error(chalk.red('Stack trace:'), error.stack);
        testResults.errors.push({
            message: error.message,
            stack: error.stack
        });
    } finally {
        // Clean up
        await scraper.closeBrowser();
        console.log(chalk.gray('\n🔒 Browser closed'));
    }
    
    return testResults;
}

function calculateOverallConfidence(confidenceScores) {
    const scores = Object.values(confidenceScores).filter(score => typeof score === 'number');
    if (scores.length === 0) return 0;
    
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round(average);
}

function generateTestReport(results, highConfidenceCount) {
    console.log(chalk.blue('\n' + '='.repeat(60)));
    console.log(chalk.blue('📊 MULTI-EVENT EXTRACTION TEST RESULTS'));
    console.log(chalk.blue('='.repeat(60)));
    
    console.log(chalk.white(`🌐 Test URL: ${results.url}`));
    console.log(chalk.white(`⏱️  Total Processing Time: ${results.performanceMetrics.totalProcessingTime}ms`));
    console.log(chalk.white(`🔧 Extraction Method: ${results.extractionMethod || 'Unknown'}`));
    
    console.log(chalk.cyan('\n📊 EXTRACTION RESULTS:'));
    console.log(chalk.white(`✅ Events Extracted: ${results.performanceMetrics.eventsExtracted}`));
    console.log(chalk.white(`🎯 Hash Compliant: ${results.hashCompliance.compliantEvents}/${results.hashCompliance.totalEvents} (${results.hashCompliance.compliancePercentage}%)`));
    console.log(chalk.white(`📈 High Confidence: ${highConfidenceCount}/${results.performanceMetrics.eventsExtracted}`));
    
    if (results.performanceMetrics.eventsExtracted > 0) {
        console.log(chalk.white(`⚡ Avg Time per Event: ${Math.round(results.performanceMetrics.totalProcessingTime / results.performanceMetrics.eventsExtracted)}ms`));
    }
    
    console.log(chalk.cyan('\n🎯 PERFORMANCE ANALYSIS:'));
    if (results.performanceMetrics.eventsExtracted >= 5) {
        console.log(chalk.green('✅ SUCCESS: Extracted 5+ events as required'));
    } else if (results.performanceMetrics.eventsExtracted > 0) {
        console.log(chalk.yellow(`⚠️  LIMITED SUCCESS: Extracted ${results.performanceMetrics.eventsExtracted} events (less than 5)`));
    } else {
        console.log(chalk.red('❌ FAILURE: No events extracted'));
    }
    
    if (results.hashCompliance.compliancePercentage >= 80) {
        console.log(chalk.green('✅ EXCELLENT: High Hash app compliance'));
    } else if (results.hashCompliance.compliancePercentage >= 60) {
        console.log(chalk.yellow('⚠️  FAIR: Moderate Hash app compliance'));
    } else {
        console.log(chalk.red('❌ POOR: Low Hash app compliance'));
    }
    
    console.log(chalk.cyan('\n🔧 EXTRACTION METHOD ANALYSIS:'));
    switch(results.extractionMethod) {
        case 'structured_listing':
            console.log(chalk.green('✅ OPTIMAL: Used structured data (JSON-LD) - Most reliable'));
            break;
        case 'html_listing':
            console.log(chalk.yellow('⚡ GOOD: Used HTML pattern matching - Reliable'));
            break;
        case 'universal':
            console.log(chalk.blue('🔧 UNIVERSAL: Used universal extraction system'));
            break;
        default:
            console.log(chalk.gray('❓ UNKNOWN: Extraction method not determined'));
    }
    
    if (results.errors.length > 0) {
        console.log(chalk.red(`\n❌ ERRORS ENCOUNTERED: ${results.errors.length}`));
        results.errors.forEach((error, i) => {
            console.log(chalk.red(`   ${i + 1}. ${error.message}`));
        });
    }
    
    console.log(chalk.blue('\n='.repeat(60)));
    console.log(chalk.green('🎉 Multi-Event Extraction Test Complete!'));
    console.log(chalk.blue('='.repeat(60)));
}

// Run the test
if (require.main === module) {
    testMultiEventExtraction()
        .then((results) => {
            console.log(chalk.green('\n✅ Test completed successfully'));
            process.exit(0);
        })
        .catch((error) => {
            console.error(chalk.red('\n❌ Test failed with error:'), error.message);
            process.exit(1);
        });
}

module.exports = testMultiEventExtraction;