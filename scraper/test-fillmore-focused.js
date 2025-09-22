#!/usr/bin/env node

/**
 * Focused Test: The Fillmore (LiveNation Platform)
 * 
 * Quick focused test of The Fillmore to demonstrate:
 * 1. Single Event Extraction capabilities
 * 2. Multi-Event Extraction from venue listing
 * 3. LiveNation platform integration
 * 4. Data quality assessment for Bay Area deployment
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');
const fs = require('fs');

async function testFillmore() {
    const scraper = new EventScraper({
        headless: false, // Show browser
        timeout: 30000,
        debug: true,
        verbose: true
    });
    
    const venue = {
        name: 'The Fillmore',
        url: 'https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events',
        address: '1805 Geary Blvd, San Francisco, CA 94115, United States',
        platform: 'LiveNation',
        category: 'Music'
    };
    
    const results = {
        venue: venue,
        tests: {
            singleEvent: null,
            multiEvent: null
        },
        analysis: {
            dataQuality: {},
            performance: {},
            bayAreaReadiness: {}
        }
    };
    
    console.log(chalk.blue.bold('\n🎵 Testing The Fillmore (LiveNation Platform)\n'));
    console.log(chalk.gray(`URL: ${venue.url}`));
    console.log(chalk.gray(`Platform: ${venue.platform}`));
    console.log(chalk.gray(`Expected Category: ${venue.category}\n`));
    
    try {
        // Test 1: Single Event Extraction
        console.log(chalk.cyan('🎯 Test 1: Single Event Extraction (scrapeGeneric)'));
        const singleStart = Date.now();
        
        try {
            const singleEvent = await scraper.scrapeEvent(venue.url);
            results.tests.singleEvent = {
                success: !!(singleEvent && singleEvent.title),
                data: singleEvent,
                processingTime: Date.now() - singleStart,
                extractionMethod: singleEvent._extraction?.method || 'unknown',
                confidence: calculateDataConfidence(singleEvent)
            };
            
            console.log(chalk.green(`✅ Single event extracted: "${singleEvent.title || 'Untitled'}"`));
            console.log(chalk.gray(`   Method: ${results.tests.singleEvent.extractionMethod}`));
            console.log(chalk.gray(`   Confidence: ${results.tests.singleEvent.confidence}%`));
            console.log(chalk.gray(`   Processing time: ${results.tests.singleEvent.processingTime}ms`));
            
            // Quick data quality check
            console.log(chalk.blue('\n🔍 Single Event Data Quality:'));
            if (singleEvent.title && singleEvent.title !== 'Untitled Event') {
                console.log(chalk.green(`   ✅ Title: "${singleEvent.title}"`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Title: Needs improvement`));
            }
            
            if (singleEvent.date) {
                console.log(chalk.green(`   ✅ Date: ${singleEvent.date}`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Date: Missing`));
            }
            
            if (singleEvent.venue && singleEvent.venue !== 'Venue TBD') {
                console.log(chalk.green(`   ✅ Venue: "${singleEvent.venue}"`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Venue: "${singleEvent.venue || 'Missing'}"`));
            }
            
            if (singleEvent.address && singleEvent.address.includes(',')) {
                console.log(chalk.green(`   ✅ Address: "${singleEvent.address}"`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Address: "${singleEvent.address || 'Missing'}" (needs comma for Hash compliance)`));
            }
            
            if (singleEvent.categories && singleEvent.categories.length > 0) {
                console.log(chalk.green(`   ✅ Categories: [${singleEvent.categories.join(', ')}]`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Categories: Missing or invalid`));
            }
            
            if (singleEvent.imageUrl) {
                console.log(chalk.green(`   ✅ Image: Available (${singleEvent.imageUrl.substring(0, 60)}...)`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Image: Missing`));
            }
            
        } catch (error) {
            console.error(chalk.red(`   ❌ Single event extraction failed: ${error.message}`));
            results.tests.singleEvent = {
                success: false,
                error: error.message,
                processingTime: Date.now() - singleStart
            };
        }
        
        // Test 2: Multi-Event Extraction
        console.log(chalk.cyan('\n📋 Test 2: Multi-Event Extraction (scrapeEventListing)'));
        const multiStart = Date.now();
        
        try {
            const multiEvents = await scraper.scrapeEventListing();
            results.tests.multiEvent = {
                success: multiEvents.length > 0,
                eventCount: multiEvents.length,
                events: multiEvents.slice(0, 3), // Include first 3 for analysis
                processingTime: Date.now() - multiStart,
                averageConfidence: multiEvents.length > 0 ? 
                    Math.round(multiEvents.map(e => calculateDataConfidence(e)).reduce((a, b) => a + b, 0) / multiEvents.length) : 0
            };
            
            console.log(chalk.green(`✅ Multi-event extraction: ${multiEvents.length} events found`));
            console.log(chalk.gray(`   Average confidence: ${results.tests.multiEvent.averageConfidence}%`));
            console.log(chalk.gray(`   Processing time: ${results.tests.multiEvent.processingTime}ms`));
            
            // Show sample events
            if (multiEvents.length > 0) {
                console.log(chalk.blue('\n📅 Sample Events (first 3):'));
                multiEvents.slice(0, 3).forEach((event, i) => {
                    console.log(chalk.gray(`   ${i + 1}. "${event.title || 'Untitled'}" - ${event.date ? new Date(event.date).toLocaleDateString() : 'No date'}`));
                });
            }
            
        } catch (error) {
            console.error(chalk.red(`   ❌ Multi-event extraction failed: ${error.message}`));
            results.tests.multiEvent = {
                success: false,
                error: error.message,
                processingTime: Date.now() - multiStart,
                eventCount: 0
            };
        }
        
        // Analysis
        console.log(chalk.blue.bold('\n📊 Analysis & Bay Area Deployment Assessment:'));
        
        // Success Rate
        const testsRun = [results.tests.singleEvent, results.tests.multiEvent].filter(t => t !== null);
        const successfulTests = testsRun.filter(t => t.success);
        const successRate = testsRun.length > 0 ? Math.round((successfulTests.length / testsRun.length) * 100) : 0;
        
        console.log(chalk.green(`✅ Success Rate: ${successfulTests.length}/${testsRun.length} tests (${successRate}%)`));
        
        // Data Quality Assessment
        if (results.tests.singleEvent?.data) {
            const data = results.tests.singleEvent.data;
            const hashCompliance = assessHashCompliance(data);
            
            console.log(chalk.green(`📋 Data Quality Score: ${results.tests.singleEvent.confidence}%`));
            console.log(chalk.green(`🎯 Hash App Compliance: ${hashCompliance.score}% (${hashCompliance.compliantFields}/${hashCompliance.totalFields} fields)`));
        }
        
        // Platform Assessment
        console.log(chalk.blue('\n🏛️ LiveNation Platform Assessment:'));
        if (results.tests.singleEvent?.extractionMethod) {
            console.log(chalk.green(`   Extraction Method: ${results.tests.singleEvent.extractionMethod}`));
            
            if (results.tests.singleEvent.extractionMethod === 'universal') {
                console.log(chalk.green(`   ✅ Successfully using Universal Extractor (5-layer cascade)`));
            } else if (results.tests.singleEvent.extractionMethod === 'structured_data') {
                console.log(chalk.green(`   ✅ Leveraging structured data (JSON-LD)`));
            } else {
                console.log(chalk.yellow(`   ⚠️  Using fallback extraction method`));
            }
        }
        
        // Performance Assessment
        const avgTime = testsRun.length > 0 ? 
            Math.round(testsRun.map(t => t.processingTime || 0).reduce((a, b) => a + b, 0) / testsRun.length) : 0;
            
        console.log(chalk.green(`⚡ Average Processing Time: ${avgTime}ms`));
        
        if (avgTime < 5000) {
            console.log(chalk.green(`   ✅ Excellent performance for production`));
        } else if (avgTime < 10000) {
            console.log(chalk.yellow(`   ⚠️  Acceptable performance, room for optimization`));
        } else {
            console.log(chalk.red(`   ❌ Performance needs improvement for production`));
        }
        
        // Bay Area Deployment Readiness
        console.log(chalk.blue.bold('\n🌉 Bay Area Deployment Readiness:'));
        
        let readinessScore = 0;
        const recommendations = [];
        
        // Success rate contribution (40%)
        readinessScore += successRate * 0.4;
        
        // Data quality contribution (30%)
        const dataQuality = results.tests.singleEvent?.confidence || 0;
        readinessScore += dataQuality * 0.3;
        
        // Hash compliance contribution (30%)
        let hashScore = 0;
        if (results.tests.singleEvent?.data) {
            hashScore = assessHashCompliance(results.tests.singleEvent.data).score;
        }
        readinessScore += hashScore * 0.3;
        
        readinessScore = Math.round(readinessScore);
        
        console.log(chalk.green(`🎯 Overall Readiness Score: ${readinessScore}%`));
        
        if (readinessScore >= 80) {
            console.log(chalk.green(`   ✅ READY for Bay Area deployment`));
        } else if (readinessScore >= 60) {
            console.log(chalk.yellow(`   ⚠️  MOSTLY READY - minor improvements needed`));
        } else {
            console.log(chalk.red(`   ❌ NEEDS WORK before Bay Area deployment`));
        }
        
        // Generate recommendations
        if (successRate < 80) {
            recommendations.push('Improve extraction reliability for LiveNation platform');
        }
        
        if (dataQuality < 70) {
            recommendations.push('Enhance data extraction accuracy for venue listings');
        }
        
        if (hashScore < 80) {
            recommendations.push('Improve Hash app compliance formatting');
        }
        
        if (avgTime > 8000) {
            recommendations.push('Optimize processing speed for better user experience');
        }
        
        if (recommendations.length > 0) {
            console.log(chalk.yellow('\n📝 Recommendations:'));
            recommendations.forEach((rec, i) => {
                console.log(chalk.yellow(`   ${i + 1}. ${rec}`));
            });
        }
        
        // Save results
        const filename = `fillmore-test-results-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify({
            timestamp: new Date().toISOString(),
            venue: venue,
            results: results,
            readinessScore: readinessScore,
            recommendations: recommendations
        }, null, 2));
        
        console.log(chalk.gray(`\n📄 Results saved to: ${filename}`));
        
    } catch (error) {
        console.error(chalk.red('\n💥 Test failed:'), error.message);
        console.error(chalk.red('Stack trace:'), error.stack);
    } finally {
        await scraper.closeBrowser();
        console.log(chalk.gray('\n🔒 Browser closed'));
    }
}

function calculateDataConfidence(data) {
    if (!data) return 0;
    
    let score = 0;
    let maxScore = 0;
    
    // Title (25 points)
    maxScore += 25;
    if (data.title && data.title.trim() && data.title !== 'Untitled Event') {
        score += Math.min(25, data.title.length >= 5 ? 25 : 15);
    }
    
    // Date (25 points)
    maxScore += 25;
    if (data.date) {
        score += 15;
        if (data.startTime) score += 10;
    }
    
    // Venue (20 points)
    maxScore += 20;
    if (data.venue && data.venue.trim() && data.venue !== 'Venue TBD') {
        score += 20;
    }
    
    // Address (20 points)
    maxScore += 20;
    if (data.address && data.address.trim() && data.address !== 'Address TBD') {
        score += data.address.includes(',') ? 20 : 15;
    }
    
    // Categories (10 points)
    maxScore += 10;
    if (data.categories && data.categories.length > 0) {
        score += 10;
    }
    
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

function assessHashCompliance(data) {
    const checks = {
        title: !!(data.title && data.title.trim() && !data.title.includes('TBD')),
        date: !!(data.date && data.startTime),
        venue: !!(data.venue && data.venue.trim() && !data.venue.includes('TBD')),
        address: !!(data.address && data.address.includes(',') && !data.address.includes('TBD')),
        categories: !!(data.categories && data.categories.length > 0 && 
            data.categories.every(cat => ['Music', 'Comedy', 'Arts & Theater', 'Nightlife', 'Food & Drink', 'Sports', 'Education', 'Family', 'Community', 'Business'].includes(cat)))
    };
    
    const compliantFields = Object.values(checks).filter(Boolean).length;
    const totalFields = Object.keys(checks).length;
    const score = Math.round((compliantFields / totalFields) * 100);
    
    return { score, compliantFields, totalFields, checks };
}

// Run the test
if (require.main === module) {
    testFillmore().catch(console.error);
}

module.exports = testFillmore;