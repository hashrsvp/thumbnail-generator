#!/usr/bin/env node

/**
 * Comprehensive Austin Venues Testing Suite
 * 
 * Tests the Universal Event Scraper on top Austin venues identified from venue analysis.
 * Tests both single event extraction (scrapeGeneric) and multi-event extraction (scrapeEventListing).
 * 
 * Priority venues:
 * 1. Emo's - https://www.emosaustin.com/shows
 * 2. The Long Center - https://thelongcenter.org/upcoming-calendar/
 * 3. Antone's Nightclub - https://antonesnightclub.com/
 * 4. Capitol City Comedy Club - https://www.capcitycomedy.com/
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Import the Universal Event Scraper
const EventScraper = require("./improved-event-scraper-2");

class AustinVenueTestSuite {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 45000,
            verbose: options.verbose || false,
            ...options
        };
        
        this.scraper = new EventScraper({
            headless: this.options.headless,
            timeout: this.options.timeout
        });
        
        // Test venues with priority order
        this.testVenues = [
            {
                name: "Emo's",
                priority: 1,
                eventListingUrl: "https://www.emosaustin.com/shows",
                singleEventUrl: null, // Will be determined from listing
                category: "Music",
                platform: "custom",
                description: "indie/rock shows",
                expectedFeatures: {
                    structuredData: true,
                    calendar: true,
                    images: true,
                    ticketing: true
                }
            },
            {
                name: "The Long Center",
                priority: 2,
                eventListingUrl: "https://thelongcenter.org/upcoming-calendar/",
                singleEventUrl: null,
                category: "Arts & Theater",
                platform: "custom",
                description: "performing arts, complex calendar",
                expectedFeatures: {
                    structuredData: true,
                    calendar: true,
                    images: true,
                    performanceDetails: true
                }
            },
            {
                name: "Antone's Nightclub",
                priority: 3,
                eventListingUrl: "https://antonesnightclub.com/",
                singleEventUrl: null,
                category: "Music",
                platform: "custom",
                description: "historic venue, custom booking",
                expectedFeatures: {
                    structuredData: false,
                    calendar: true,
                    images: true,
                    ticketing: true
                }
            },
            {
                name: "Capitol City Comedy Club",
                priority: 4,
                eventListingUrl: "https://www.capcitycomedy.com/",
                singleEventUrl: null,
                category: "Comedy",
                platform: "custom",
                description: "comedy venue, different event structure",
                expectedFeatures: {
                    structuredData: false,
                    calendar: true,
                    images: true,
                    showTimes: true
                }
            }
        ];
        
        this.testResults = [];
        this.performanceMetrics = {};
    }
    
    /**
     * Log test progress with proper formatting
     */
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const colors = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            debug: chalk.gray
        };
        
        console.log(`[${timestamp}] ${colors[type] || chalk.white}(${message})`);
    }
    
    /**
     * Run comprehensive test suite for all Austin venues
     */
    async runComprehensiveTests() {
        this.log("🎭 Starting Comprehensive Austin Venues Testing Suite", 'success');
        this.log(`Testing ${this.testVenues.length} priority Austin venues`, 'info');
        
        const startTime = Date.now();
        
        try {
            // Initialize scraper
            await this.scraper.initBrowser();
            
            // Test each venue in priority order
            for (const venue of this.testVenues) {
                this.log(`\n🏛️  Testing Venue #${venue.priority}: ${venue.name}`, 'info');
                this.log(`URL: ${venue.eventListingUrl}`, 'debug');
                this.log(`Expected: ${venue.description}`, 'debug');
                
                const venueResults = await this.testVenue(venue);
                this.testResults.push({
                    venue: venue.name,
                    priority: venue.priority,
                    results: venueResults
                });
            }
            
            // Generate comprehensive report
            const totalTime = Date.now() - startTime;
            await this.generateTestReport(totalTime);
            
        } catch (error) {
            this.log(`❌ Test suite failed: ${error.message}`, 'error');
            console.error(error);
        } finally {
            await this.cleanup();
        }
    }
    
    /**
     * Test a single venue comprehensively
     */
    async testVenue(venue) {
        const venueStartTime = Date.now();
        const results = {
            venue: venue.name,
            priority: venue.priority,
            url: venue.eventListingUrl,
            tests: {
                multiEventExtraction: null,
                singleEventExtraction: null,
                dataQuality: null,
                performance: null
            },
            summary: {
                success: false,
                extractionMethod: null,
                eventsExtracted: 0,
                avgConfidence: 0,
                issues: []
            }
        };
        
        try {
            // Test 1: Multi-Event Extraction (scrapeEventListing)
            this.log(`📋 Testing multi-event extraction for ${venue.name}`, 'info');
            results.tests.multiEventExtraction = await this.testMultiEventExtraction(venue);
            
            // Test 2: Single Event Extraction (scrapeGeneric) - if we found events
            if (results.tests.multiEventExtraction.success && results.tests.multiEventExtraction.events.length > 0) {
                this.log(`🎫 Testing single event extraction for ${venue.name}`, 'info');
                const firstEvent = results.tests.multiEventExtraction.events[0];
                if (firstEvent.url) {
                    results.tests.singleEventExtraction = await this.testSingleEventExtraction(firstEvent.url, venue);
                }
            }
            
            // Test 3: Data Quality Assessment
            this.log(`🔍 Assessing data quality for ${venue.name}`, 'info');
            results.tests.dataQuality = await this.assessDataQuality(results, venue);
            
            // Test 4: Performance Metrics
            const venueTime = Date.now() - venueStartTime;
            results.tests.performance = this.calculatePerformanceMetrics(results, venueTime);
            
            // Generate summary
            results.summary = this.generateVenueSummary(results);
            
        } catch (error) {
            this.log(`❌ Venue test failed for ${venue.name}: ${error.message}`, 'error');
            results.summary.issues.push(`Test execution error: ${error.message}`);
        }
        
        return results;
    }
    
    /**
     * Test multi-event extraction using scrapeEventListing
     */
    async testMultiEventExtraction(venue) {
        const testResult = {
            method: 'scrapeEventListing',
            success: false,
            events: [],
            extractionMethod: null,
            confidence: 0,
            processingTime: 0,
            errors: []
        };
        
        const startTime = Date.now();
        
        try {
            this.log(`Navigating to event listing page: ${venue.eventListingUrl}`, 'debug');
            
            // First navigate to the page
            await this.scraper.page.goto(venue.eventListingUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            
            // Wait for content to load
            await this.scraper.page.waitForTimeout(3000);
            
            this.log(`Scraping events using scrapeEventListing method`, 'debug');
            
            // Then call scrapeEventListing without URL parameter
            const result = await this.scraper.scrapeEventListing({
                maxEvents: 10, // Limit for testing
                includeImages: true,
                enhanceAddresses: true
            });
            
            testResult.processingTime = Date.now() - startTime;
            
            // scrapeEventListing returns an array directly
            if (result && Array.isArray(result) && result.length > 0) {
                testResult.success = true;
                testResult.events = result;
                
                // Get extraction method from first event's metadata
                if (result[0] && result[0]._extraction) {
                    testResult.extractionMethod = result[0]._extraction.method;
                    testResult.confidence = result[0]._extraction.confidence || 0;
                }
                
                this.log(`✅ Successfully extracted ${result.length} events`, 'success');
                
                // Log sample event data
                if (this.options.verbose && result[0]) {
                    this.log(`Sample event: ${result[0].title}`, 'debug');
                    this.log(`Date: ${result[0].date}`, 'debug');
                    this.log(`Venue: ${result[0].venueName || result[0].venue}`, 'debug');
                }
            } else {
                testResult.errors.push('No events extracted from listing page');
                this.log(`⚠️  No events found on listing page`, 'warning');
            }
            
        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Multi-event extraction failed: ${error.message}`, 'error');
        }
        
        return testResult;
    }
    
    /**
     * Test single event extraction using scrapeGeneric
     */
    async testSingleEventExtraction(eventUrl, venue) {
        const testResult = {
            method: 'scrapeGeneric',
            url: eventUrl,
            success: false,
            event: null,
            extractionMethod: null,
            confidence: 0,
            processingTime: 0,
            errors: []
        };
        
        const startTime = Date.now();
        
        try {
            this.log(`Navigating to single event page: ${eventUrl}`, 'debug');
            
            // First navigate to the event page
            await this.scraper.page.goto(eventUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            
            // Wait for content to load
            await this.scraper.page.waitForTimeout(2000);
            
            this.log(`Scraping single event using scrapeGeneric method`, 'debug');
            
            // Then call scrapeGeneric without URL parameter
            const result = await this.scraper.scrapeGeneric({
                includeImages: true,
                enhanceAddress: true
            });
            
            testResult.processingTime = Date.now() - startTime;
            
            if (result && result.title) {
                testResult.success = true;
                testResult.event = result;
                testResult.extractionMethod = result.extractionMethod || 'unknown';
                testResult.confidence = result.confidence || 0;
                
                this.log(`✅ Successfully extracted single event: ${result.title}`, 'success');
                
                if (this.options.verbose) {
                    this.log(`Extraction method: ${testResult.extractionMethod}`, 'debug');
                    this.log(`Confidence: ${testResult.confidence}%`, 'debug');
                }
            } else {
                testResult.errors.push('Failed to extract event data from single event page');
                this.log(`⚠️  Failed to extract single event data`, 'warning');
            }
            
        } catch (error) {
            testResult.errors.push(error.message);
            this.log(`❌ Single event extraction failed: ${error.message}`, 'error');
        }
        
        return testResult;
    }
    
    /**
     * Assess data quality for extracted events
     */
    async assessDataQuality(results, venue) {
        const assessment = {
            titleQuality: { score: 0, issues: [] },
            dateTimeQuality: { score: 0, issues: [] },
            venueQuality: { score: 0, issues: [] },
            addressQuality: { score: 0, issues: [] },
            categoryMapping: { score: 0, issues: [] },
            hashCompliance: { score: 0, issues: [] },
            overallScore: 0
        };
        
        const allEvents = [];
        
        // Collect all events for analysis
        if (results.tests.multiEventExtraction && results.tests.multiEventExtraction.events) {
            allEvents.push(...results.tests.multiEventExtraction.events);
        }
        if (results.tests.singleEventExtraction && results.tests.singleEventExtraction.event) {
            allEvents.push(results.tests.singleEventExtraction.event);
        }
        
        if (allEvents.length === 0) {
            assessment.overallScore = 0;
            assessment.titleQuality.issues.push('No events to assess');
            return assessment;
        }
        
        for (const event of allEvents) {
            // Assess title quality
            this.assessTitleQuality(event, assessment.titleQuality);
            
            // Assess date/time quality  
            this.assessDateTimeQuality(event, assessment.dateTimeQuality);
            
            // Assess venue quality
            this.assessVenueQuality(event, assessment.venueQuality, venue);
            
            // Assess address quality
            this.assessAddressQuality(event, assessment.addressQuality);
            
            // Assess category mapping
            this.assessCategoryMapping(event, assessment.categoryMapping, venue);
            
            // Assess Hash app compliance
            this.assessHashCompliance(event, assessment.hashCompliance);
        }
        
        // Calculate overall score
        const scores = [
            assessment.titleQuality.score,
            assessment.dateTimeQuality.score,
            assessment.venueQuality.score,
            assessment.addressQuality.score,
            assessment.categoryMapping.score,
            assessment.hashCompliance.score
        ];
        
        assessment.overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        
        return assessment;
    }
    
    /**
     * Assess title quality
     */
    assessTitleQuality(event, quality) {
        if (!event.title) {
            quality.issues.push('Missing title');
            return;
        }
        
        let score = 100;
        
        if (event.title.length < 5) {
            quality.issues.push('Title too short');
            score -= 30;
        }
        
        if (event.title.length > 100) {
            quality.issues.push('Title too long');
            score -= 20;
        }
        
        if (event.title.includes('undefined') || event.title.includes('null')) {
            quality.issues.push('Title contains placeholder values');
            score -= 50;
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Assess date/time quality
     */
    assessDateTimeQuality(event, quality) {
        let score = 100;
        
        if (!event.date) {
            quality.issues.push('Missing date');
            score -= 50;
        } else {
            const date = new Date(event.date);
            if (isNaN(date.getTime())) {
                quality.issues.push('Invalid date format');
                score -= 40;
            } else if (date < new Date()) {
                quality.issues.push('Date is in the past');
                score -= 20;
            }
        }
        
        if (!event.time) {
            quality.issues.push('Missing time');
            score -= 30;
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Assess venue quality
     */
    assessVenueQuality(event, quality, expectedVenue) {
        let score = 100;
        
        if (!event.venueName && !event.venue) {
            quality.issues.push('Missing venue name');
            score -= 50;
        } else {
            const venueName = event.venueName || event.venue;
            if (!venueName.toLowerCase().includes(expectedVenue.name.toLowerCase().split(' ')[0])) {
                quality.issues.push(`Venue name doesn't match expected (${expectedVenue.name})`);
                score -= 30;
            }
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Assess address quality and Hash compliance
     */
    assessAddressQuality(event, quality) {
        let score = 100;
        
        if (!event.address) {
            quality.issues.push('Missing address');
            score -= 50;
        } else {
            // Check for comma (Hash app requirement)
            if (!event.address.includes(',')) {
                quality.issues.push('Address missing comma (Hash requirement)');
                score -= 30;
            }
            
            // Check for Austin, TX
            if (!event.address.toLowerCase().includes('austin')) {
                quality.issues.push('Address does not include Austin');
                score -= 20;
            }
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Assess category mapping
     */
    assessCategoryMapping(event, quality, expectedVenue) {
        let score = 100;
        
        if (!event.category) {
            quality.issues.push('Missing category');
            score -= 50;
        } else {
            const validCategories = [
                'Music', 'Comedy', 'Arts & Theater', 'Sports', 'Food & Drink', 
                'Community', 'Business', 'Health & Wellness', 'Education', 'Other'
            ];
            
            if (!validCategories.includes(event.category)) {
                quality.issues.push(`Invalid category: ${event.category}`);
                score -= 40;
            } else if (event.category !== expectedVenue.category) {
                quality.issues.push(`Category mismatch (expected ${expectedVenue.category}, got ${event.category})`);
                score -= 20;
            }
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Assess overall Hash app compliance
     */
    assessHashCompliance(event, quality) {
        let score = 100;
        const requiredFields = ['title', 'date', 'venueName', 'address', 'category'];
        const missingFields = requiredFields.filter(field => !event[field]);
        
        if (missingFields.length > 0) {
            quality.issues.push(`Missing required Hash fields: ${missingFields.join(', ')}`);
            score -= (missingFields.length * 20);
        }
        
        // Address format compliance
        if (event.address && !event.address.includes(',')) {
            quality.issues.push('Address format not Hash compliant (missing comma)');
            score -= 20;
        }
        
        quality.score = Math.max(quality.score, score);
    }
    
    /**
     * Calculate performance metrics
     */
    calculatePerformanceMetrics(results, totalTime) {
        const metrics = {
            totalProcessingTime: totalTime,
            multiEventTime: results.tests.multiEventExtraction?.processingTime || 0,
            singleEventTime: results.tests.singleEventExtraction?.processingTime || 0,
            averageEventTime: 0,
            eventsPerSecond: 0,
            successRate: 0
        };
        
        const totalEvents = (results.tests.multiEventExtraction?.events?.length || 0) +
                           (results.tests.singleEventExtraction?.success ? 1 : 0);
        
        if (totalEvents > 0) {
            metrics.averageEventTime = totalTime / totalEvents;
            metrics.eventsPerSecond = (totalEvents / totalTime) * 1000;
        }
        
        const successfulTests = [
            results.tests.multiEventExtraction?.success,
            results.tests.singleEventExtraction?.success
        ].filter(Boolean).length;
        
        metrics.successRate = (successfulTests / 2) * 100;
        
        return metrics;
    }
    
    /**
     * Generate venue summary
     */
    generateVenueSummary(results) {
        const summary = {
            success: false,
            extractionMethod: null,
            eventsExtracted: 0,
            avgConfidence: 0,
            issues: []
        };
        
        // Check if any tests succeeded
        if (results.tests.multiEventExtraction?.success || results.tests.singleEventExtraction?.success) {
            summary.success = true;
        }
        
        // Determine primary extraction method
        if (results.tests.multiEventExtraction?.success) {
            summary.extractionMethod = results.tests.multiEventExtraction.extractionMethod;
        } else if (results.tests.singleEventExtraction?.success) {
            summary.extractionMethod = results.tests.singleEventExtraction.extractionMethod;
        }
        
        // Count events
        summary.eventsExtracted = (results.tests.multiEventExtraction?.events?.length || 0) +
                                 (results.tests.singleEventExtraction?.success ? 1 : 0);
        
        // Calculate average confidence
        const confidences = [];
        if (results.tests.multiEventExtraction?.confidence) {
            confidences.push(results.tests.multiEventExtraction.confidence);
        }
        if (results.tests.singleEventExtraction?.confidence) {
            confidences.push(results.tests.singleEventExtraction.confidence);
        }
        
        if (confidences.length > 0) {
            summary.avgConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
        }
        
        // Collect issues
        if (results.tests.multiEventExtraction?.errors) {
            summary.issues.push(...results.tests.multiEventExtraction.errors);
        }
        if (results.tests.singleEventExtraction?.errors) {
            summary.issues.push(...results.tests.singleEventExtraction.errors);
        }
        if (results.tests.dataQuality?.overallScore < 70) {
            summary.issues.push(`Low data quality score: ${results.tests.dataQuality.overallScore}%`);
        }
        
        return summary;
    }
    
    /**
     * Generate comprehensive test report
     */
    async generateTestReport(totalTime) {
        const report = {
            testSuite: 'Austin Venues Comprehensive Testing',
            timestamp: new Date().toISOString(),
            totalTime: totalTime,
            venuestested: this.testVenues.length,
            results: this.testResults,
            summary: this.generateOverallSummary()
        };
        
        // Save detailed report to file
        const reportPath = path.join(__dirname, `austin-venues-test-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        // Generate and display summary
        this.displayTestSummary(report);
        
        this.log(`\n📊 Full test report saved to: ${reportPath}`, 'success');
    }
    
    /**
     * Generate overall test summary
     */
    generateOverallSummary() {
        const summary = {
            totalVenues: this.testVenues.length,
            successfulVenues: 0,
            totalEventsExtracted: 0,
            averageConfidence: 0,
            averageDataQuality: 0,
            commonIssues: {},
            extractionMethods: {},
            recommendations: []
        };
        
        const confidences = [];
        const dataQualities = [];
        
        for (const result of this.testResults) {
            if (result.results.summary.success) {
                summary.successfulVenues++;
            }
            
            summary.totalEventsExtracted += result.results.summary.eventsExtracted;
            
            if (result.results.summary.avgConfidence > 0) {
                confidences.push(result.results.summary.avgConfidence);
            }
            
            if (result.results.tests.dataQuality?.overallScore) {
                dataQualities.push(result.results.tests.dataQuality.overallScore);
            }
            
            // Track extraction methods
            const method = result.results.summary.extractionMethod;
            if (method) {
                summary.extractionMethods[method] = (summary.extractionMethods[method] || 0) + 1;
            }
            
            // Collect common issues
            for (const issue of result.results.summary.issues) {
                summary.commonIssues[issue] = (summary.commonIssues[issue] || 0) + 1;
            }
        }
        
        // Calculate averages
        if (confidences.length > 0) {
            summary.averageConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
        }
        
        if (dataQualities.length > 0) {
            summary.averageDataQuality = Math.round(dataQualities.reduce((a, b) => a + b, 0) / dataQualities.length);
        }
        
        // Generate recommendations
        this.generateRecommendations(summary);
        
        return summary;
    }
    
    /**
     * Generate recommendations based on test results
     */
    generateRecommendations(summary) {
        if (summary.successfulVenues < summary.totalVenues * 0.8) {
            summary.recommendations.push('Consider improving fallback extraction methods for better venue coverage');
        }
        
        if (summary.averageConfidence < 70) {
            summary.recommendations.push('Low average confidence suggests need for enhanced extraction patterns');
        }
        
        if (summary.averageDataQuality < 80) {
            summary.recommendations.push('Data quality issues detected - review address enhancement and category mapping');
        }
        
        const topIssue = Object.keys(summary.commonIssues).reduce((a, b) => 
            summary.commonIssues[a] > summary.commonIssues[b] ? a : b, '');
        
        if (topIssue && summary.commonIssues[topIssue] > 1) {
            summary.recommendations.push(`Address common issue: ${topIssue}`);
        }
        
        if (summary.extractionMethods['layer5'] > summary.extractionMethods['layer1']) {
            summary.recommendations.push('Many venues using fallback extraction - consider improving structured data detection');
        }
    }
    
    /**
     * Display test summary in console
     */
    displayTestSummary(report) {
        console.log('\n' + '='.repeat(80));
        console.log(chalk.bold.blue('🎭 AUSTIN VENUES TEST RESULTS SUMMARY'));
        console.log('='.repeat(80));
        
        console.log(`\n📊 ${chalk.bold('Overview:')}`);
        console.log(`   Venues Tested: ${report.summary.totalVenues}`);
        console.log(`   Successful Venues: ${report.summary.successfulVenues}/${report.summary.totalVenues} (${Math.round((report.summary.successfulVenues/report.summary.totalVenues)*100)}%)`);
        console.log(`   Total Events Extracted: ${report.summary.totalEventsExtracted}`);
        console.log(`   Average Confidence: ${report.summary.averageConfidence}%`);
        console.log(`   Average Data Quality: ${report.summary.averageDataQuality}%`);
        console.log(`   Total Test Time: ${Math.round(report.totalTime/1000)}s`);
        
        console.log(`\n🏛️  ${chalk.bold('Venue Results:')}`);
        for (const result of report.results) {
            const status = result.results.summary.success ? 
                chalk.green('✅ SUCCESS') : chalk.red('❌ FAILED');
            const confidence = result.results.summary.avgConfidence > 0 ? 
                ` (${result.results.summary.avgConfidence}% confidence)` : '';
            const events = result.results.summary.eventsExtracted > 0 ? 
                ` - ${result.results.summary.eventsExtracted} events` : '';
            
            console.log(`   ${status} ${result.venue}${confidence}${events}`);
            
            if (result.results.summary.extractionMethod) {
                console.log(`            Method: ${result.results.summary.extractionMethod}`);
            }
            
            if (result.results.summary.issues.length > 0 && result.results.summary.issues.length <= 2) {
                result.results.summary.issues.forEach(issue => {
                    console.log(`            Issue: ${issue}`);
                });
            }
        }
        
        if (Object.keys(report.summary.extractionMethods).length > 0) {
            console.log(`\n🔧 ${chalk.bold('Extraction Methods:')}`);
            for (const [method, count] of Object.entries(report.summary.extractionMethods)) {
                console.log(`   ${method}: ${count} venues`);
            }
        }
        
        if (report.summary.recommendations.length > 0) {
            console.log(`\n💡 ${chalk.bold('Recommendations:')}`);
            for (const rec of report.summary.recommendations) {
                console.log(`   • ${rec}`);
            }
        }
        
        console.log('\n' + '='.repeat(80));
    }
    
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.scraper && this.scraper.browser) {
                await this.scraper.close();
            }
        } catch (error) {
            this.log(`Warning: Cleanup failed: ${error.message}`, 'warning');
        }
    }
}

// CLI execution
async function main() {
    const args = process.argv.slice(2);
    const options = {
        headless: !args.includes('--no-headless'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        timeout: args.includes('--timeout') ? parseInt(args[args.indexOf('--timeout') + 1]) : 45000
    };
    
    console.log(chalk.bold.blue('\n🎭 Austin Venues Comprehensive Testing Suite'));
    console.log(chalk.gray('Testing Universal Event Scraper on top Austin venues\n'));
    
    const testSuite = new AustinVenueTestSuite(options);
    await testSuite.runComprehensiveTests();
}

// Export for use as module
module.exports = AustinVenueTestSuite;

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red('\n❌ Test suite failed:'), error);
        process.exit(1);
    });
}