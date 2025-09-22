#!/usr/bin/env node

/**
 * Universal Event Scraper Test Framework
 * 
 * Comprehensive testing framework to validate the Universal Event Scraper
 * against real venue websites from the Hash app. Tests all venue types
 * and validates Hash app requirements.
 * 
 * @version 1.0.0
 * @author Claude Code - iOS Testing Specialist
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');
const UniversalExtractor = require('../utils/universalExtractor');
const CategoryMapper = require('../utils/categoryMapper');

class UniversalScraperTestFramework {
    constructor(options = {}) {
        this.options = {
            headless: options.headless !== false,
            timeout: options.timeout || 30000,
            retries: options.retries || 2,
            verbose: options.verbose || false,
            outputDir: options.outputDir || path.join(__dirname, 'results'),
            ...options
        };
        
        this.categoryMapper = new CategoryMapper();
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            venueResults: {},
            categoryResults: {},
            layerResults: {},
            performanceMetrics: {
                totalTime: 0,
                averageTime: 0,
                fastestTime: Infinity,
                slowestTime: 0
            }
        };
        
        // Hash app requirements
        this.validCategories = [
            'Music', 'Festivals', 'Food Events', 'Sports/Games', 
            'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'
        ];
        
        // Test venue URLs organized by category
        this.testVenues = this.loadTestVenues();
        
        this.log = this.options.verbose ? console.log : () => {};
    }
    
    /**
     * Load test venues from venue files and categorize them
     */
    loadTestVenues() {
        return {
            // MUSIC VENUES
            music: [
                {
                    name: 'The Fillmore',
                    url: 'https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events',
                    address: '1805 Geary Blvd, San Francisco, CA 94115, United States',
                    expectedCategory: ['Music'],
                    city: 'San Francisco'
                },
                {
                    name: 'Fox Theater Oakland',
                    url: 'https://thefoxoakland.com/listing/',
                    address: '1807 Telegraph Ave, Oakland, CA 94612, United States',
                    expectedCategory: ['Music'],
                    city: 'Oakland'
                },
                {
                    name: 'Great American Music Hall',
                    url: 'https://gamh.com/calendar/',
                    address: '859 O\'Farrell St, San Francisco, CA 94109, United States',
                    expectedCategory: ['Music'],
                    city: 'San Francisco'
                },
                {
                    name: 'Emo\'s Austin',
                    url: 'https://www.emosaustin.com/shows',
                    address: '2015 E Riverside Dr, Austin, TX',
                    expectedCategory: ['Music'],
                    city: 'Austin'
                },
                {
                    name: 'Mohawk Austin',
                    url: 'https://mohawkaustin.com/',
                    address: '912 Red River St, Austin, TX',
                    expectedCategory: ['Music'],
                    city: 'Austin'
                }
            ],
            
            // NIGHTCLUBS
            nightclubs: [
                {
                    name: 'Audio SF',
                    url: 'https://audiosf.com/events/',
                    address: '316 11th St, San Francisco, CA 94103, United States',
                    expectedCategory: ['Nightclubs'],
                    city: 'San Francisco'
                },
                {
                    name: 'Temple SF',
                    url: 'https://www.templesf.com/calendar',
                    address: '540 Howard St, San Francisco, CA 94105, United States',
                    expectedCategory: ['Nightclubs'],
                    city: 'San Francisco'
                },
                {
                    name: 'Kingdom Austin',
                    url: 'https://kingdomnightclub.com/events/',
                    address: '505 E 7th St, Austin, TX',
                    expectedCategory: ['Nightclubs'],
                    city: 'Austin'
                },
                {
                    name: 'Monarch SF',
                    url: 'https://www.monarchsf.com/',
                    address: '101 6th St, San Francisco, CA 94103',
                    expectedCategory: ['Nightclubs'],
                    city: 'San Francisco'
                }
            ],
            
            // COMEDY VENUES
            comedy: [
                {
                    name: 'Cobb\'s Comedy Club',
                    url: 'https://www.cobbscomedy.com/',
                    address: '915 Columbus Ave, San Francisco, CA 94133, United States',
                    expectedCategory: ['Comedy Shows'],
                    city: 'San Francisco'
                },
                {
                    name: 'Comedy Mothership',
                    url: 'https://comedymothership.com/',
                    address: '320 E 6th St, Austin, TX',
                    expectedCategory: ['Comedy Shows'],
                    city: 'Austin'
                },
                {
                    name: 'San Jose Improv',
                    url: 'https://improv.com/sanjose/',
                    address: '62 S Second St, San Jose, CA 95113, United States',
                    expectedCategory: ['Comedy Shows'],
                    city: 'San Jose'
                }
            ],
            
            // SPORTS VENUES
            sports: [
                {
                    name: 'Oracle Park',
                    url: 'https://www.mlb.com/giants/ballpark/events',
                    address: '24 Willie Mays Plaza, San Francisco, CA 94107, United States',
                    expectedCategory: ['Sports/Games'],
                    city: 'San Francisco'
                },
                {
                    name: 'Chase Center',
                    url: 'https://chasecenter.com/events/',
                    address: '1 Warriors Way, San Francisco, CA 94158, United States',
                    expectedCategory: ['Sports/Games'],
                    city: 'San Francisco'
                },
                {
                    name: 'Q2 Stadium Austin FC',
                    url: 'https://www.austinfc.com/tickets/',
                    address: '10414 McKalla Pl, Austin, TX',
                    expectedCategory: ['Sports/Games'],
                    city: 'Austin'
                }
            ],
            
            // BARS
            bars: [
                {
                    name: 'El Rio SF',
                    url: 'https://www.elriosf.com/calendar',
                    address: '3158 Mission St, San Francisco',
                    expectedCategory: ['Bars'],
                    city: 'San Francisco'
                },
                {
                    name: 'The Saxon Pub',
                    url: 'https://thesaxonpub.com/',
                    address: '1320 S Lamar Blvd, Austin, TX',
                    expectedCategory: ['Bars'],
                    city: 'Austin'
                },
                {
                    name: 'Cornerstone Berkeley',
                    url: 'https://www.cornerstoneberkeley.com/events',
                    address: '2367 Shattuck Ave., Berkeley, CA 94704, United States',
                    expectedCategory: ['Bars'],
                    city: 'Berkeley'
                }
            ],
            
            // ART VENUES
            art: [
                {
                    name: 'California Academy of Sciences',
                    url: 'https://www.calacademy.org/nightlife',
                    address: '55 Music Concourse Dr, San Francisco',
                    expectedCategory: ['Art Shows'],
                    city: 'San Francisco'
                },
                {
                    name: 'Exploratorium',
                    url: 'https://www.exploratorium.edu/visit/calendar/after-dark',
                    address: 'Pier 15 Embarcadero at Green St, San Francisco',
                    expectedCategory: ['Art Shows'],
                    city: 'San Francisco'
                }
            ],
            
            // FOOD EVENTS
            food: [
                {
                    name: 'The ABGB Austin',
                    url: 'https://theabgb.com/calendar/',
                    address: '1305 W Oltorf St, Austin, TX',
                    expectedCategory: ['Food Events', 'Bars'],
                    city: 'Austin'
                }
            ]
        };
    }
    
    /**
     * Run the complete test suite
     */
    async runTestSuite() {
        console.log(chalk.blue.bold('🧪 Universal Event Scraper Test Framework'));
        console.log(chalk.blue.bold('=' .repeat(50)));
        
        const startTime = Date.now();
        
        // Create output directory
        await this.ensureOutputDir();
        
        // Initialize browser
        const browser = await chromium.launch({ 
            headless: this.options.headless,
            timeout: this.options.timeout 
        });
        
        try {
            // Run tests by category
            for (const [category, venues] of Object.entries(this.testVenues)) {
                console.log(chalk.cyan(`\n📂 Testing ${category.toUpperCase()} venues (${venues.length} venues)`));
                
                await this.testVenueCategory(browser, category, venues);
            }
            
            // Calculate final metrics
            this.results.performanceMetrics.totalTime = Date.now() - startTime;
            this.results.performanceMetrics.averageTime = 
                this.results.performanceMetrics.totalTime / this.results.total;
            
            // Generate comprehensive report
            await this.generateReport();
            
        } finally {
            await browser.close();
        }
        
        return this.results;
    }
    
    /**
     * Test a specific venue category
     */
    async testVenueCategory(browser, category, venues) {
        for (const venue of venues) {
            await this.testSingleVenue(browser, category, venue);
        }
    }
    
    /**
     * Test a single venue
     */
    async testSingleVenue(browser, category, venue) {
        const testStart = Date.now();
        this.results.total++;
        
        console.log(chalk.yellow(`\n🏪 Testing: ${venue.name}`));
        console.log(chalk.gray(`   URL: ${venue.url}`));
        
        let attempt = 0;
        let testResult = null;
        
        while (attempt < this.options.retries && !testResult) {
            attempt++;
            
            if (attempt > 1) {
                console.log(chalk.yellow(`   ↻ Retry attempt ${attempt}`));
            }
            
            try {
                testResult = await this.performVenueTest(browser, venue);
                
            } catch (error) {
                if (attempt === this.options.retries) {
                    console.log(chalk.red(`   ❌ Failed after ${this.options.retries} attempts: ${error.message}`));
                    testResult = this.createFailedResult(venue, error);
                } else {
                    this.log(`   ⚠️ Attempt ${attempt} failed: ${error.message}`);
                }
            }
        }
        
        const testDuration = Date.now() - testStart;
        testResult.duration = testDuration;
        
        // Update performance metrics
        this.updatePerformanceMetrics(testDuration);
        
        // Store result
        this.storeTestResult(category, venue, testResult);
        
        // Display result
        this.displayTestResult(venue, testResult);
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    /**
     * Perform the actual venue test
     */
    async performVenueTest(browser, venue) {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });
        
        try {
            const page = await context.newPage();
            
            // Navigate to venue page
            await page.goto(venue.url, { 
                waitUntil: 'networkidle',
                timeout: this.options.timeout 
            });
            
            // Wait for content to load
            await page.waitForTimeout(2000);
            
            // Initialize Universal Extractor
            const extractor = new UniversalExtractor(page, {
                debug: this.options.verbose,
                verbose: this.options.verbose,
                enforceHashRequirements: true,
                requireAddressComma: true
            });
            
            // Extract event data
            const extractionResult = await extractor.extract();
            
            // Validate against Hash app requirements
            const validation = this.validateHashRequirements(extractionResult);
            
            // Test category mapping
            const categoryTest = this.testCategoryMapping(
                extractionResult.data, 
                venue.expectedCategory
            );
            
            return {
                success: true,
                venue: venue,
                extractionResult: extractionResult,
                validation: validation,
                categoryTest: categoryTest,
                layerAnalysis: this.analyzeLayerPerformance(extractionResult.layerResults),
                error: null
            };
            
        } finally {
            await context.close();
        }
    }
    
    /**
     * Validate extracted data against Hash app requirements
     */
    validateHashRequirements(extractionResult) {
        const validation = {
            passed: 0,
            failed: 0,
            warnings: 0,
            details: {}
        };
        
        const data = extractionResult.data;
        const confidence = extractionResult.confidence;
        
        // Required fields validation
        const requiredFields = [
            { field: 'title', minLength: 3, maxLength: 200 },
            { field: 'address', requiresComma: true },
            { field: 'date', isDate: true }
        ];
        
        for (const requirement of requiredFields) {
            const fieldResult = this.validateField(
                data[requirement.field], 
                confidence[requirement.field] || 0,
                requirement
            );
            
            validation.details[requirement.field] = fieldResult;
            
            if (fieldResult.status === 'pass') {
                validation.passed++;
            } else if (fieldResult.status === 'fail') {
                validation.failed++;
            } else {
                validation.warnings++;
            }
        }
        
        // Category validation
        if (data.categories && Array.isArray(data.categories)) {
            const validCategories = data.categories.filter(cat => 
                this.validCategories.includes(cat)
            );
            
            validation.details.categories = {
                status: validCategories.length > 0 ? 'pass' : 'fail',
                message: `${validCategories.length}/${data.categories.length} valid categories`,
                confidence: 90,
                details: {
                    provided: data.categories,
                    valid: validCategories,
                    invalid: data.categories.filter(cat => !this.validCategories.includes(cat))
                }
            };
            
            if (validCategories.length > 0) {
                validation.passed++;
            } else {
                validation.failed++;
            }
        } else {
            validation.details.categories = {
                status: 'fail',
                message: 'No categories provided',
                confidence: 0
            };
            validation.failed++;
        }
        
        // Time format validation
        if (data.startTime) {
            const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
            const isValidTime = timeRegex.test(data.startTime);
            
            validation.details.timeFormat = {
                status: isValidTime ? 'pass' : 'fail',
                message: isValidTime ? 'Valid HH:mm:ss format' : 'Invalid time format',
                confidence: confidence.startTime || 0,
                value: data.startTime
            };
            
            if (isValidTime) {
                validation.passed++;
            } else {
                validation.failed++;
            }
        }
        
        return validation;
    }
    
    /**
     * Validate individual field
     */
    validateField(value, confidence, requirements) {
        if (!value) {
            return {
                status: 'fail',
                message: 'Field is missing or empty',
                confidence: 0
            };
        }
        
        // Length validation
        if (requirements.minLength && value.length < requirements.minLength) {
            return {
                status: 'fail',
                message: `Too short (${value.length} < ${requirements.minLength})`,
                confidence: confidence,
                value: value
            };
        }
        
        if (requirements.maxLength && value.length > requirements.maxLength) {
            return {
                status: 'warn',
                message: `Very long (${value.length} > ${requirements.maxLength})`,
                confidence: confidence,
                value: value
            };
        }
        
        // Address comma requirement
        if (requirements.requiresComma && !value.includes(',')) {
            return {
                status: 'fail',
                message: 'Address must contain comma',
                confidence: confidence,
                value: value
            };
        }
        
        // Date validation
        if (requirements.isDate) {
            try {
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return {
                        status: 'fail',
                        message: 'Invalid date format',
                        confidence: confidence,
                        value: value
                    };
                }
                
                // Check if date is reasonable (not too far in past/future)
                const now = new Date();
                const diffDays = (date - now) / (1000 * 60 * 60 * 24);
                
                if (diffDays < -365 || diffDays > 730) {
                    return {
                        status: 'warn',
                        message: `Date seems unrealistic (${Math.round(diffDays)} days from now)`,
                        confidence: Math.max(0, confidence - 20),
                        value: value
                    };
                }
            } catch (error) {
                return {
                    status: 'fail',
                    message: 'Date parsing error',
                    confidence: confidence,
                    value: value
                };
            }
        }
        
        return {
            status: 'pass',
            message: 'Valid',
            confidence: confidence,
            value: value
        };
    }
    
    /**
     * Test category mapping accuracy
     */
    testCategoryMapping(data, expectedCategories) {
        // Generate categories using the CategoryMapper
        const mappedCategories = this.categoryMapper.smartMapCategories({
            title: data.title || '',
            description: data.description || '',
            venue: data.venue || '',
            tags: data.tags || []
        });
        
        const test = {
            expected: expectedCategories,
            mapped: mappedCategories,
            matches: 0,
            accuracy: 0,
            details: {}
        };
        
        // Calculate matches
        for (const expected of expectedCategories) {
            if (mappedCategories.includes(expected)) {
                test.matches++;
            }
        }
        
        test.accuracy = expectedCategories.length > 0 ? 
            (test.matches / expectedCategories.length) * 100 : 0;
        
        // Detailed analysis
        test.details = {
            correctMatches: mappedCategories.filter(cat => expectedCategories.includes(cat)),
            unexpectedCategories: mappedCategories.filter(cat => !expectedCategories.includes(cat)),
            missedCategories: expectedCategories.filter(cat => !mappedCategories.includes(cat))
        };
        
        return test;
    }
    
    /**
     * Analyze layer performance
     */
    analyzeLayerPerformance(layerResults) {
        const analysis = {
            totalLayers: Object.keys(layerResults).length,
            successfulLayers: 0,
            fieldsExtracted: {},
            layerContributions: {}
        };
        
        for (const [layerNum, result] of Object.entries(layerResults)) {
            if (result.data && Object.keys(result.data).length > 0) {
                analysis.successfulLayers++;
            }
            
            analysis.layerContributions[layerNum] = {
                fieldsCount: result.data ? Object.keys(result.data).length : 0,
                fields: result.data ? Object.keys(result.data) : [],
                hasError: !!result.error
            };
            
            // Track which layer provided each field
            if (result.data) {
                for (const [field, value] of Object.entries(result.data)) {
                    if (!analysis.fieldsExtracted[field]) {
                        analysis.fieldsExtracted[field] = [];
                    }
                    analysis.fieldsExtracted[field].push({
                        layer: layerNum,
                        confidence: result.confidence[field] || 0
                    });
                }
            }
        }
        
        return analysis;
    }
    
    /**
     * Create a failed test result
     */
    createFailedResult(venue, error) {
        return {
            success: false,
            venue: venue,
            extractionResult: null,
            validation: {
                passed: 0,
                failed: 1,
                warnings: 0,
                details: {
                    error: {
                        status: 'fail',
                        message: error.message,
                        confidence: 0
                    }
                }
            },
            categoryTest: {
                expected: venue.expectedCategory,
                mapped: [],
                matches: 0,
                accuracy: 0
            },
            layerAnalysis: null,
            error: error.message
        };
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(duration) {
        this.results.performanceMetrics.fastestTime = 
            Math.min(this.results.performanceMetrics.fastestTime, duration);
        this.results.performanceMetrics.slowestTime = 
            Math.max(this.results.performanceMetrics.slowestTime, duration);
    }
    
    /**
     * Store test result in organized structure
     */
    storeTestResult(category, venue, result) {
        // Initialize category results if needed
        if (!this.results.categoryResults[category]) {
            this.results.categoryResults[category] = {
                total: 0,
                passed: 0,
                failed: 0,
                venues: {}
            };
        }
        
        // Initialize venue results if needed
        if (!this.results.venueResults[venue.name]) {
            this.results.venueResults[venue.name] = {
                category: category,
                venue: venue,
                results: []
            };
        }
        
        // Update counters
        this.results.categoryResults[category].total++;
        this.results.venueResults[venue.name].results.push(result);
        
        if (result.success && result.validation.failed === 0) {
            this.results.passed++;
            this.results.categoryResults[category].passed++;
        } else {
            this.results.failed++;
            this.results.categoryResults[category].failed++;
        }
        
        // Store detailed result
        this.results.categoryResults[category].venues[venue.name] = result;
    }
    
    /**
     * Display test result
     */
    displayTestResult(venue, result) {
        if (result.success) {
            const validationScore = result.validation.passed / 
                (result.validation.passed + result.validation.failed + result.validation.warnings);
            const categoryAccuracy = result.categoryTest.accuracy;
            const overallConfidence = result.extractionResult.metadata.totalConfidence;
            
            const status = result.validation.failed === 0 ? 'PASS' : 'PARTIAL';
            const statusColor = status === 'PASS' ? chalk.green : chalk.yellow;
            
            console.log(statusColor(`   ✓ ${status}`));
            console.log(chalk.gray(`     Confidence: ${overallConfidence}% | Validation: ${Math.round(validationScore * 100)}% | Category: ${Math.round(categoryAccuracy)}%`));
            console.log(chalk.gray(`     Duration: ${result.duration}ms | Layers: ${result.layerAnalysis.successfulLayers}/${result.layerAnalysis.totalLayers}`));
            
            if (this.options.verbose) {
                this.displayDetailedResult(result);
            }
        } else {
            console.log(chalk.red(`   ❌ FAIL: ${result.error}`));
        }
    }
    
    /**
     * Display detailed test results
     */
    displayDetailedResult(result) {
        console.log(chalk.blue('     📊 Detailed Results:'));
        
        // Show extracted data
        const data = result.extractionResult.data;
        console.log(chalk.gray(`       Title: "${data.title || 'N/A'}"`));
        console.log(chalk.gray(`       Venue: "${data.venue || 'N/A'}"`));
        console.log(chalk.gray(`       Address: "${data.address || 'N/A'}"`));
        console.log(chalk.gray(`       Date: "${data.date || 'N/A'}"`));
        console.log(chalk.gray(`       Categories: ${(data.categories || []).join(', ') || 'N/A'}`));
        
        // Show validation issues
        if (result.validation.failed > 0 || result.validation.warnings > 0) {
            console.log(chalk.yellow('     ⚠️  Validation Issues:'));
            for (const [field, validation] of Object.entries(result.validation.details)) {
                if (validation.status !== 'pass') {
                    const icon = validation.status === 'fail' ? '❌' : '⚠️';
                    console.log(chalk.gray(`       ${icon} ${field}: ${validation.message}`));
                }
            }
        }
    }
    
    /**
     * Generate comprehensive test report
     */
    async generateReport() {
        console.log(chalk.blue.bold('\n📊 Test Results Summary'));
        console.log(chalk.blue.bold('=' .repeat(50)));
        
        // Overall statistics
        const successRate = this.results.total > 0 ? 
            (this.results.passed / this.results.total) * 100 : 0;
        
        console.log(chalk.green(`✓ Passed: ${this.results.passed}/${this.results.total} (${Math.round(successRate)}%)`));
        console.log(chalk.red(`✗ Failed: ${this.results.failed}/${this.results.total}`));
        
        // Performance metrics
        console.log(chalk.cyan('\n⏱️  Performance Metrics:'));
        console.log(chalk.gray(`   Total Time: ${Math.round(this.results.performanceMetrics.totalTime / 1000)}s`));
        console.log(chalk.gray(`   Average Time: ${Math.round(this.results.performanceMetrics.averageTime)}ms per venue`));
        console.log(chalk.gray(`   Fastest: ${this.results.performanceMetrics.fastestTime}ms`));
        console.log(chalk.gray(`   Slowest: ${this.results.performanceMetrics.slowestTime}ms`));
        
        // Category breakdown
        console.log(chalk.cyan('\n📂 Results by Category:'));
        for (const [category, results] of Object.entries(this.results.categoryResults)) {
            const categoryRate = results.total > 0 ? 
                (results.passed / results.total) * 100 : 0;
            
            const statusIcon = categoryRate >= 80 ? '🟢' : categoryRate >= 60 ? '🟡' : '🔴';
            console.log(`   ${statusIcon} ${category}: ${results.passed}/${results.total} (${Math.round(categoryRate)}%)`);
        }
        
        // Generate detailed JSON report
        const reportData = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.total,
                passed: this.results.passed,
                failed: this.results.failed,
                successRate: Math.round(successRate),
                totalTime: this.results.performanceMetrics.totalTime,
                averageTime: Math.round(this.results.performanceMetrics.averageTime)
            },
            categoryResults: this.results.categoryResults,
            venueResults: this.results.venueResults,
            performanceMetrics: this.results.performanceMetrics
        };
        
        const reportPath = path.join(this.options.outputDir, `test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(reportData, null, 2));
        
        console.log(chalk.blue(`\n📄 Detailed report saved: ${reportPath}`));
        
        // Generate HTML report
        await this.generateHTMLReport(reportData);
        
        return reportData;
    }
    
    /**
     * Generate HTML test report
     */
    async generateHTMLReport(reportData) {
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Scraper Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #ecf0f1; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-label { color: #7f8c8d; margin-top: 5px; }
        .success { color: #27ae60; }
        .warning { color: #f39c12; }
        .danger { color: #e74c3c; }
        .category-section { margin-bottom: 30px; }
        .category-header { background: #3498db; color: white; padding: 15px; border-radius: 8px 8px 0 0; }
        .venue-list { background: white; border: 1px solid #bdc3c7; border-top: none; border-radius: 0 0 8px 8px; }
        .venue-item { padding: 15px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: between; align-items: center; }
        .venue-name { font-weight: bold; }
        .venue-status { padding: 5px 10px; border-radius: 4px; color: white; font-size: 0.8em; }
        .status-pass { background: #27ae60; }
        .status-fail { background: #e74c3c; }
        .status-partial { background: #f39c12; }
        .details { margin-top: 10px; color: #7f8c8d; font-size: 0.9em; }
        .chart { height: 300px; margin: 20px 0; }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Universal Event Scraper Test Report</h1>
            <p>Generated on ${new Date(reportData.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="metric-card">
                <div class="metric-value success">${reportData.summary.passed}</div>
                <div class="metric-label">Tests Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value danger">${reportData.summary.failed}</div>
                <div class="metric-label">Tests Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${reportData.summary.successRate}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round(reportData.summary.totalTime / 1000)}s</div>
                <div class="metric-label">Total Time</div>
            </div>
        </div>
        
        <div class="chart">
            <canvas id="categoryChart"></canvas>
        </div>
        
        <div id="categories">
            ${this.generateCategoryHTML(reportData.categoryResults)}
        </div>
    </div>
    
    <script>
        // Generate category performance chart
        const ctx = document.getElementById('categoryChart').getContext('2d');
        const categoryData = ${JSON.stringify(reportData.categoryResults)};
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(categoryData),
                datasets: [
                    {
                        label: 'Passed',
                        data: Object.values(categoryData).map(cat => cat.passed),
                        backgroundColor: '#27ae60'
                    },
                    {
                        label: 'Failed', 
                        data: Object.values(categoryData).map(cat => cat.failed),
                        backgroundColor: '#e74c3c'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Test Results by Category'
                    }
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true }
                }
            }
        });
    </script>
</body>
</html>
        `;
        
        const htmlPath = path.join(this.options.outputDir, `test-report-${Date.now()}.html`);
        await fs.writeFile(htmlPath, htmlContent);
        
        console.log(chalk.blue(`📊 HTML report saved: ${htmlPath}`));
    }
    
    /**
     * Generate category HTML for report
     */
    generateCategoryHTML(categoryResults) {
        return Object.entries(categoryResults).map(([category, results]) => {
            const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
            
            const venueHTML = Object.entries(results.venues).map(([venueName, result]) => {
                const status = result.success && result.validation.failed === 0 ? 'pass' : 
                              result.success ? 'partial' : 'fail';
                const statusText = status === 'pass' ? 'PASS' : 
                                 status === 'partial' ? 'PARTIAL' : 'FAIL';
                
                const confidence = result.extractionResult ? 
                    result.extractionResult.metadata.totalConfidence : 0;
                
                return `
                    <div class="venue-item">
                        <div>
                            <div class="venue-name">${venueName}</div>
                            <div class="details">
                                Confidence: ${confidence}% | Duration: ${result.duration || 0}ms
                                ${result.extractionResult ? 
                                    `| Categories: ${(result.extractionResult.data.categories || []).join(', ')}` : ''}
                            </div>
                        </div>
                        <div class="venue-status status-${status}">${statusText}</div>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="category-section">
                    <div class="category-header">
                        <h3>${category.toUpperCase()} - ${results.passed}/${results.total} (${Math.round(successRate)}%)</h3>
                    </div>
                    <div class="venue-list">
                        ${venueHTML}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Ensure output directory exists
     */
    async ensureOutputDir() {
        try {
            await fs.access(this.options.outputDir);
        } catch {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        }
    }
    
    /**
     * Run tests for specific venue category only
     */
    async runCategoryTests(categoryName) {
        if (!this.testVenues[categoryName]) {
            throw new Error(`Category '${categoryName}' not found. Available: ${Object.keys(this.testVenues).join(', ')}`);
        }
        
        console.log(chalk.blue.bold(`🧪 Testing ${categoryName.toUpperCase()} venues only`));
        
        const browser = await chromium.launch({ 
            headless: this.options.headless,
            timeout: this.options.timeout 
        });
        
        try {
            await this.ensureOutputDir();
            await this.testVenueCategory(browser, categoryName, this.testVenues[categoryName]);
            await this.generateReport();
        } finally {
            await browser.close();
        }
        
        return this.results;
    }
    
    /**
     * Run test for single venue
     */
    async runSingleVenueTest(venueName) {
        // Find venue in all categories
        let foundVenue = null;
        let foundCategory = null;
        
        for (const [category, venues] of Object.entries(this.testVenues)) {
            const venue = venues.find(v => v.name.toLowerCase().includes(venueName.toLowerCase()));
            if (venue) {
                foundVenue = venue;
                foundCategory = category;
                break;
            }
        }
        
        if (!foundVenue) {
            throw new Error(`Venue '${venueName}' not found`);
        }
        
        console.log(chalk.blue.bold(`🧪 Testing single venue: ${foundVenue.name}`));
        
        const browser = await chromium.launch({ 
            headless: this.options.headless,
            timeout: this.options.timeout 
        });
        
        try {
            await this.ensureOutputDir();
            await this.testSingleVenue(browser, foundCategory, foundVenue);
            await this.generateReport();
        } finally {
            await browser.close();
        }
        
        return this.results;
    }
}

module.exports = UniversalScraperTestFramework;

// CLI interface if run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    
    const options = {
        headless: !args.includes('--no-headless'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        timeout: 30000
    };
    
    const framework = new UniversalScraperTestFramework(options);
    
    async function runTests() {
        try {
            switch (command) {
                case 'all':
                case undefined:
                    await framework.runTestSuite();
                    break;
                    
                case 'category':
                    if (!args[1]) {
                        console.error(chalk.red('Please specify a category: music, nightclubs, comedy, sports, bars, art, food'));
                        process.exit(1);
                    }
                    await framework.runCategoryTests(args[1]);
                    break;
                    
                case 'venue':
                    if (!args[1]) {
                        console.error(chalk.red('Please specify a venue name'));
                        process.exit(1);
                    }
                    await framework.runSingleVenueTest(args[1]);
                    break;
                    
                default:
                    console.log(chalk.blue('Universal Scraper Test Framework'));
                    console.log(chalk.gray('Usage:'));
                    console.log(chalk.gray('  node universalScraperTests.js [command] [options]'));
                    console.log(chalk.gray(''));
                    console.log(chalk.gray('Commands:'));
                    console.log(chalk.gray('  all                    Run all tests (default)'));
                    console.log(chalk.gray('  category <name>        Run tests for specific category'));
                    console.log(chalk.gray('  venue <name>           Run test for specific venue'));
                    console.log(chalk.gray(''));
                    console.log(chalk.gray('Options:'));
                    console.log(chalk.gray('  --no-headless          Show browser window'));
                    console.log(chalk.gray('  --verbose, -v           Verbose output'));
                    console.log(chalk.gray(''));
                    console.log(chalk.gray('Examples:'));
                    console.log(chalk.gray('  node universalScraperTests.js'));
                    console.log(chalk.gray('  node universalScraperTests.js category music --verbose'));
                    console.log(chalk.gray('  node universalScraperTests.js venue "The Fillmore" --no-headless'));
            }
        } catch (error) {
            console.error(chalk.red(`Test framework error: ${error.message}`));
            process.exit(1);
        }
    }
    
    runTests();
}