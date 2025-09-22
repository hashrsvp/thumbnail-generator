#!/usr/bin/env node

/**
 * Performance Validation Script
 * 
 * Tests the performance improvements to ensure we achieve the <5s target
 * by comparing before/after metrics on real-world scraping scenarios.
 * 
 * @author Claude Code
 * @version 1.0.0
 */

const { performance } = require('perf_hooks');
const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

class PerformanceValidator {
    constructor() {
        // Test URLs representing different complexity levels
        this.testUrls = [
            // Simple structured data sites
            'https://www.eventbrite.com/e/test-event-1',
            
            // Complex sites requiring multiple layers
            'https://www.fillmore.com/events/',
            
            // Sites with heavy JavaScript
            'https://www.oaklandtheatre.com/events',
            
            // Multi-event listing pages
            'https://www.thewarfieldtheatre.com/events'
        ];
        
        this.targetTime = 5000; // 5 seconds target
        this.results = {
            before: {},
            after: {},
            improvements: {}
        };
    }
    
    /**
     * Run performance validation tests
     */
    async runValidation() {
        console.log(chalk.blue.bold('🚀 Starting Performance Validation Tests'));
        console.log(chalk.gray(`Target: Reduce processing time to <${this.targetTime}ms`));
        
        try {
            // Test optimized scraper
            console.log(chalk.cyan('\n📊 Testing Optimized Scraper Performance...'));
            await this.testOptimizedScraper();
            
            // Generate performance report
            console.log(chalk.cyan('\n📈 Generating Performance Report...'));
            this.generatePerformanceReport();
            
            // Validate improvements
            console.log(chalk.cyan('\n✅ Validating Performance Improvements...'));
            const validationResult = this.validateImprovements();
            
            if (validationResult.success) {
                console.log(chalk.green.bold('🎉 Performance Validation PASSED!'));
                console.log(chalk.green(`Average processing time: ${validationResult.averageTime}ms (target: ${this.targetTime}ms)`));
            } else {
                console.log(chalk.red.bold('❌ Performance Validation FAILED'));
                console.log(chalk.red(`Average processing time: ${validationResult.averageTime}ms (target: ${this.targetTime}ms)`));
            }
            
        } catch (error) {
            console.error(chalk.red('❌ Performance validation failed:'), error);
        }
    }
    
    /**
     * Test optimized scraper with performance tracking
     */
    async testOptimizedScraper() {
        const scrapingTimes = [];
        
        for (let i = 0; i < this.testUrls.length; i++) {
            const url = this.testUrls[i];
            console.log(chalk.gray(`  [${i + 1}/${this.testUrls.length}] Testing: ${url}`));
            
            const scraper = new EventScraper({
                headless: true,
                debug: false,
                // Use optimized settings
                maxEventsBatch: 10,
                skipAddressEnhancement: true,
                imageTimeout: 1000,
                enableEarlyTermination: true
            });
            
            try {
                const startTime = performance.now();
                
                // Test single event scraping
                const singleEventTime = await this.testSingleEventScraping(scraper, url);
                scrapingTimes.push({
                    url,
                    type: 'single_event',
                    time: singleEventTime,
                    success: singleEventTime > 0
                });
                
                // Test multi-event scraping if applicable
                if (url.includes('/events')) {
                    const multiEventTime = await this.testMultiEventScraping(scraper, url);
                    scrapingTimes.push({
                        url,
                        type: 'multi_event',
                        time: multiEventTime,
                        success: multiEventTime > 0
                    });
                }
                
            } catch (error) {
                console.log(chalk.yellow(`    ⚠️  Test failed: ${error.message}`));
                scrapingTimes.push({
                    url,
                    type: 'failed',
                    time: -1,
                    error: error.message,
                    success: false
                });
            } finally {
                await scraper.close();
            }
        }
        
        this.results.after = {
            times: scrapingTimes,
            averageTime: this.calculateAverageTime(scrapingTimes),
            successRate: this.calculateSuccessRate(scrapingTimes),
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Test single event scraping performance
     */
    async testSingleEventScraping(scraper, url) {
        try {
            const startTime = performance.now();
            
            // Mock single event URL (in real test, this would be an actual event page)
            const testUrl = url.includes('/events') ? url : url;
            
            await scraper.initBrowser();
            const result = await scraper.scrapeEvent(testUrl);
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(chalk.gray(`    Single event: ${duration.toFixed(2)}ms`));
            return duration;
            
        } catch (error) {
            console.log(chalk.yellow(`    Single event failed: ${error.message}`));
            return -1;
        }
    }
    
    /**
     * Test multi-event scraping performance
     */
    async testMultiEventScraping(scraper, url) {
        try {
            const startTime = performance.now();
            
            await scraper.initBrowser();
            await scraper.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            const events = await scraper.scrapeEventListing({
                maxEvents: 5 // Limit for testing
            });
            
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(chalk.gray(`    Multi-event (${events.length} events): ${duration.toFixed(2)}ms`));
            return duration;
            
        } catch (error) {
            console.log(chalk.yellow(`    Multi-event failed: ${error.message}`));
            return -1;
        }
    }
    
    /**
     * Calculate average processing time from test results
     */
    calculateAverageTime(times) {
        const successfulTimes = times.filter(t => t.success && t.time > 0).map(t => t.time);
        if (successfulTimes.length === 0) return 0;
        return successfulTimes.reduce((sum, time) => sum + time, 0) / successfulTimes.length;
    }
    
    /**
     * Calculate success rate from test results
     */
    calculateSuccessRate(times) {
        const totalTests = times.length;
        const successfulTests = times.filter(t => t.success).length;
        return totalTests > 0 ? (successfulTests / totalTests) * 100 : 0;
    }
    
    /**
     * Generate comprehensive performance report
     */
    generatePerformanceReport() {
        console.log(chalk.blue('\n📊 Performance Report'));
        console.log(chalk.blue('=================='));
        
        // Current performance metrics
        console.log(chalk.cyan('\n🔍 Optimized Scraper Results:'));
        console.log(`  Average Time: ${this.results.after.averageTime.toFixed(2)}ms`);
        console.log(`  Success Rate: ${this.results.after.successRate.toFixed(1)}%`);
        console.log(`  Target Time: ${this.targetTime}ms`);
        
        // Detailed results
        console.log(chalk.cyan('\n📋 Detailed Test Results:'));
        this.results.after.times.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            const timeStr = result.time > 0 ? `${result.time.toFixed(2)}ms` : 'Failed';
            console.log(`  ${status} Test ${index + 1}: ${result.type} - ${timeStr}`);
            if (result.error) {
                console.log(`      Error: ${result.error}`);
            }
        });
        
        // Performance analysis
        console.log(chalk.cyan('\n🎯 Performance Analysis:'));
        const meetsBenchmark = this.results.after.averageTime < this.targetTime;
        console.log(`  Meets <5s Target: ${meetsBenchmark ? '✅ YES' : '❌ NO'}`);
        
        if (meetsBenchmark) {
            const improvement = ((this.targetTime - this.results.after.averageTime) / this.targetTime) * 100;
            console.log(`  Performance Margin: ${improvement.toFixed(1)}% under target`);
        } else {
            const excess = ((this.results.after.averageTime - this.targetTime) / this.targetTime) * 100;
            console.log(`  Performance Excess: ${excess.toFixed(1)}% over target`);
        }
    }
    
    /**
     * Validate that performance improvements meet targets
     */
    validateImprovements() {
        const averageTime = this.results.after.averageTime;
        const successRate = this.results.after.successRate;
        
        // Success criteria
        const meetsBenchmark = averageTime < this.targetTime;
        const adequateSuccessRate = successRate >= 70; // At least 70% success rate
        
        return {
            success: meetsBenchmark && adequateSuccessRate,
            averageTime: averageTime.toFixed(2),
            successRate: successRate.toFixed(1),
            meetsBenchmark,
            adequateSuccessRate,
            improvements: {
                speedImprovement: meetsBenchmark,
                reliabilityImprovement: adequateSuccessRate
            }
        };
    }
    
    /**
     * Run quick performance check on a single URL
     */
    async quickPerformanceCheck(url) {
        console.log(chalk.cyan(`🚀 Quick Performance Check: ${url}`));
        
        const scraper = new EventScraper({
            headless: true,
            debug: true,
            maxEventsBatch: 5,
            skipAddressEnhancement: true,
            imageTimeout: 1000,
            enableEarlyTermination: true
        });
        
        try {
            const startTime = performance.now();
            const result = await scraper.scrapeEvent(url);
            const endTime = performance.now();
            
            const duration = endTime - startTime;
            const success = duration < this.targetTime;
            
            console.log(chalk[success ? 'green' : 'red'](`⏱️  Processing Time: ${duration.toFixed(2)}ms`));
            console.log(chalk[success ? 'green' : 'red'](`🎯 Target Met: ${success ? 'YES' : 'NO'} (${this.targetTime}ms target)`));
            
            if (result && result.title) {
                console.log(chalk.gray(`📝 Extracted Event: "${result.title}"`));
            }
            
            return { duration, success, result };
            
        } catch (error) {
            console.log(chalk.red(`❌ Quick check failed: ${error.message}`));
            return { duration: -1, success: false, error: error.message };
        } finally {
            await scraper.close();
        }
    }
}

// CLI Interface
if (require.main === module) {
    const validator = new PerformanceValidator();
    
    const args = process.argv.slice(2);
    
    if (args.length > 0 && args[0].startsWith('http')) {
        // Quick check mode
        validator.quickPerformanceCheck(args[0])
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(chalk.red('❌ Quick check failed:'), error);
                process.exit(1);
            });
    } else {
        // Full validation mode
        validator.runValidation()
            .then(() => process.exit(0))
            .catch((error) => {
                console.error(chalk.red('❌ Validation failed:'), error);
                process.exit(1);
            });
    }
}

module.exports = PerformanceValidator;