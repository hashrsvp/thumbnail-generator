#!/usr/bin/env node

/**
 * Comprehensive Test of Universal Event Scraper on Oakland Arena Event
 * 
 * Tests all scraper capabilities including:
 * 1. Single event extraction using scrapeGeneric() method
 * 2. Data field extraction analysis
 * 3. Hash app compliance validation
 * 4. Extraction method detection
 * 5. Confidence and performance metrics
 * 6. Address enhancement capability
 * 7. Bay Area venue database lookup
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

// Test Configuration
const TEST_CONFIG = {
    url: 'https://www.theoaklandarena.com/events/detail/ice-cube-truth-to-power-four-decades-of-attitude',
    expectedVenue: 'Oakland Arena',
    expectedCity: 'Oakland',
    debug: true,
    verbose: true,
    testTimeout: 60000, // 60 seconds
    enableAllLayers: true
};

class OaklandArenaTest {
    constructor() {
        this.scraper = null;
        this.testResults = {
            started: new Date().toISOString(),
            url: TEST_CONFIG.url,
            phases: {},
            extractionData: null,
            performance: {},
            compliance: {},
            addressEnhancement: {},
            confidence: {},
            errors: []
        };
    }

    /**
     * Initialize the test suite
     */
    async initialize() {
        console.log(chalk.blue('\n🚀 Oakland Arena Event Scraper Test Suite'));
        console.log(chalk.gray('=' .repeat(60)));
        console.log(chalk.cyan(`🌐 Test URL: ${TEST_CONFIG.url}`));
        console.log(chalk.cyan(`🎯 Expected Venue: ${TEST_CONFIG.expectedVenue}`));
        console.log(chalk.cyan(`📍 Expected City: ${TEST_CONFIG.expectedCity}`));
        console.log(chalk.gray('=' .repeat(60)));

        this.scraper = new EventScraper({
            headless: true,
            debug: TEST_CONFIG.debug,
            verbose: TEST_CONFIG.verbose,
            timeout: TEST_CONFIG.testTimeout
        });

        await this.scraper.initBrowser();
        
        this.testResults.phases.initialization = {
            status: 'completed',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Phase 1: Test Single Event Extraction
     */
    async testSingleEventExtraction() {
        console.log(chalk.blue('\n📋 Phase 1: Testing Single Event Extraction with scrapeGeneric()'));
        const phaseStart = Date.now();

        try {
            // Navigate to the page first
            await this.scraper.page.goto(TEST_CONFIG.url, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });

            // Wait for content to load
            await this.scraper.page.waitForTimeout(3000);

            console.log(chalk.yellow('🔍 Starting scrapeGeneric() extraction...'));
            
            // Test scrapeGeneric with enhanced configuration
            const extractedData = await this.scraper.scrapeGeneric({
                debug: true,
                verbose: true,
                enabledLayers: [1, 2, 3, 4, 5], // All layers
                minConfidence: 50,
                preferHighConfidence: true
            });

            this.testResults.extractionData = extractedData;
            this.testResults.performance.extractionTime = Date.now() - phaseStart;

            // Log extracted fields
            console.log(chalk.green('\n✅ Extraction Results:'));
            console.log(chalk.cyan(`   📝 Title: ${extractedData.title || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   📅 Date: ${extractedData.date || extractedData.startDate || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   🕒 Time: ${extractedData.time || extractedData.startTime || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   🏢 Venue: ${extractedData.venue || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   📍 Address: ${extractedData.address || extractedData.rawLocation || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   📖 Description: ${extractedData.description ? `${extractedData.description.substring(0, 100)}...` : 'NOT FOUND'}`));
            console.log(chalk.cyan(`   🏷️  Categories: ${extractedData.categories ? extractedData.categories.join(', ') : 'NOT FOUND'}`));
            console.log(chalk.cyan(`   💰 Free: ${extractedData.free !== undefined ? extractedData.free : 'NOT FOUND'}`));
            console.log(chalk.cyan(`   🎟️  Tickets Link: ${extractedData.ticketsLink || 'NOT FOUND'}`));
            console.log(chalk.cyan(`   🖼️  Images: ${extractedData.imageUrls ? extractedData.imageUrls.length : 0} found`));

            if (extractedData.imageUrls && extractedData.imageUrls.length > 0) {
                console.log(chalk.magenta('   Image URLs:'));
                extractedData.imageUrls.forEach((url, i) => {
                    console.log(chalk.magenta(`     [${i + 1}] ${url.substring(0, 80)}...`));
                });
            }

            this.testResults.phases.extraction = {
                status: 'completed',
                timestamp: new Date().toISOString(),
                fieldsExtracted: Object.keys(extractedData).filter(k => k !== '_extraction').length,
                hasTitle: !!extractedData.title,
                hasDate: !!(extractedData.date || extractedData.startDate),
                hasVenue: !!extractedData.venue,
                hasAddress: !!(extractedData.address || extractedData.rawLocation),
                hasImages: !!(extractedData.imageUrls && extractedData.imageUrls.length > 0)
            };

            return true;

        } catch (error) {
            console.error(chalk.red('❌ Single event extraction failed:'), error.message);
            this.testResults.errors.push({
                phase: 'extraction',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            this.testResults.phases.extraction = {
                status: 'failed',
                error: error.message,
                timestamp: new Date().toISOString()
            };

            return false;
        }
    }

    /**
     * Phase 2: Analyze Extracted Data Fields
     */
    async analyzeExtractedData() {
        console.log(chalk.blue('\n📊 Phase 2: Analyzing Extracted Data Fields'));

        if (!this.testResults.extractionData) {
            console.log(chalk.red('❌ No extraction data available for analysis'));
            return false;
        }

        const data = this.testResults.extractionData;
        const analysis = {
            requiredFields: {},
            optionalFields: {},
            dataQuality: {},
            fieldTypes: {}
        };

        // Analyze required Hash app fields
        const requiredFields = ['title', 'venue', 'address', 'date', 'categories'];
        console.log(chalk.yellow('\n🔍 Required Fields Analysis:'));
        
        requiredFields.forEach(field => {
            const hasField = !!(data[field] || data[field.replace('date', 'startDate')] || data[field.replace('address', 'rawLocation')]);
            const value = data[field] || data[field.replace('date', 'startDate')] || data[field.replace('address', 'rawLocation')] || null;
            
            analysis.requiredFields[field] = {
                present: hasField,
                value: value,
                type: typeof value,
                length: value ? value.toString().length : 0
            };
            
            console.log(chalk.cyan(`   ${hasField ? '✅' : '❌'} ${field}: ${hasField ? 'PRESENT' : 'MISSING'}`));
            if (hasField && value) {
                console.log(chalk.gray(`      Value: ${value.toString().substring(0, 60)}${value.toString().length > 60 ? '...' : ''}`));
            }
        });

        // Analyze optional fields
        const optionalFields = ['description', 'time', 'endDate', 'free', 'soldOut', 'ticketsLink', 'imageUrls'];
        console.log(chalk.yellow('\n🔍 Optional Fields Analysis:'));
        
        optionalFields.forEach(field => {
            const hasField = !!(data[field] || data[field.replace('time', 'startTime')]);
            const value = data[field] || data[field.replace('time', 'startTime')] || null;
            
            analysis.optionalFields[field] = {
                present: hasField,
                value: value,
                type: typeof value,
                length: value ? (Array.isArray(value) ? value.length : value.toString().length) : 0
            };
            
            console.log(chalk.cyan(`   ${hasField ? '✅' : '⚠️ '} ${field}: ${hasField ? 'PRESENT' : 'MISSING'}`));
            if (hasField && value) {
                if (Array.isArray(value)) {
                    console.log(chalk.gray(`      Array length: ${value.length}`));
                } else {
                    console.log(chalk.gray(`      Value: ${value.toString().substring(0, 60)}${value.toString().length > 60 ? '...' : ''}`));
                }
            }
        });

        this.testResults.phases.dataAnalysis = {
            status: 'completed',
            analysis: analysis,
            timestamp: new Date().toISOString()
        };

        return true;
    }

    /**
     * Phase 3: Validate Hash App Compliance
     */
    async validateHashCompliance() {
        console.log(chalk.blue('\n✅ Phase 3: Hash App Compliance Validation'));

        if (!this.testResults.extractionData) {
            console.log(chalk.red('❌ No extraction data available for validation'));
            return false;
        }

        const data = this.testResults.extractionData;
        const compliance = {
            addressFormat: false,
            requiredFields: false,
            categories: false,
            dateFormat: false,
            fieldValidation: []
        };

        // Check address format (should contain comma for proper parsing)
        const address = data.address || data.rawLocation || '';
        compliance.addressFormat = address.includes(',');
        console.log(chalk.cyan(`🏠 Address Format: ${compliance.addressFormat ? '✅ Contains comma' : '❌ Missing comma separator'}`));
        if (address) {
            console.log(chalk.gray(`   Address: ${address}`));
        }

        // Check required fields presence
        const requiredPresent = !!(data.title && (data.venue || data.address) && (data.date || data.startDate) && data.categories);
        compliance.requiredFields = requiredPresent;
        console.log(chalk.cyan(`📋 Required Fields: ${requiredPresent ? '✅ All present' : '❌ Some missing'}`));

        // Check categories format (should be array)
        const hasValidCategories = Array.isArray(data.categories) && data.categories.length > 0;
        compliance.categories = hasValidCategories;
        console.log(chalk.cyan(`🏷️  Categories: ${hasValidCategories ? '✅ Valid array' : '❌ Invalid format'}`));
        if (data.categories) {
            console.log(chalk.gray(`   Categories: ${JSON.stringify(data.categories)}`));
        }

        // Check date format (should be ISO string)
        const dateField = data.date || data.startDate;
        const hasValidDate = dateField && !isNaN(new Date(dateField).getTime());
        compliance.dateFormat = hasValidDate;
        console.log(chalk.cyan(`📅 Date Format: ${hasValidDate ? '✅ Valid ISO format' : '❌ Invalid format'}`));
        if (dateField) {
            console.log(chalk.gray(`   Date: ${dateField}`));
        }

        // Overall compliance score
        const complianceScore = Object.values(compliance).filter(v => typeof v === 'boolean').filter(Boolean).length / 4 * 100;
        console.log(chalk.yellow(`\n📊 Overall Compliance Score: ${complianceScore}%`));

        this.testResults.compliance = {
            ...compliance,
            score: complianceScore,
            timestamp: new Date().toISOString()
        };

        this.testResults.phases.compliance = {
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        return true;
    }

    /**
     * Phase 4: Test Extraction Method Detection
     */
    async testExtractionMethods() {
        console.log(chalk.blue('\n🔍 Phase 4: Extraction Method Detection'));

        const methods = {
            structuredData: false,
            metaTags: false,
            htmlPatterns: false,
            textPatterns: false
        };

        try {
            // Test for structured data (JSON-LD)
            const jsonLdScripts = await this.scraper.page.locator('script[type="application/ld+json"]').count();
            methods.structuredData = jsonLdScripts > 0;
            console.log(chalk.cyan(`📊 JSON-LD Structured Data: ${methods.structuredData ? '✅ Found' : '❌ Not found'} (${jsonLdScripts} scripts)`));

            // Test for meta tags
            const metaTags = await this.scraper.page.locator('meta[property^="og:"], meta[name^="twitter:"]').count();
            methods.metaTags = metaTags > 0;
            console.log(chalk.cyan(`🏷️  Meta Tags: ${methods.metaTags ? '✅ Found' : '❌ Not found'} (${metaTags} tags)`));

            // Test for common HTML patterns
            const eventSelectors = [
                '.event-details',
                '.event-info',
                '[class*="event"]',
                'h1',
                '.title',
                '.venue',
                '.date',
                '.time'
            ];

            let htmlPatternCount = 0;
            for (const selector of eventSelectors) {
                const count = await this.scraper.page.locator(selector).count();
                htmlPatternCount += count;
            }
            
            methods.htmlPatterns = htmlPatternCount > 0;
            console.log(chalk.cyan(`🏗️  HTML Patterns: ${methods.htmlPatterns ? '✅ Found' : '❌ Not found'} (${htmlPatternCount} elements)`));

            // Check if extraction metadata indicates what methods were used
            const extractionMeta = this.testResults.extractionData?._extraction;
            if (extractionMeta) {
                console.log(chalk.yellow('\n🔍 Extraction Method Analysis:'));
                console.log(chalk.gray(`   Method: ${extractionMeta.method || 'unknown'}`));
                console.log(chalk.gray(`   Processing Time: ${extractionMeta.processingTimeMs || 'unknown'}ms`));
                if (extractionMeta.confidenceScores) {
                    console.log(chalk.gray(`   Confidence Scores: ${JSON.stringify(extractionMeta.confidenceScores)}`));
                }
                if (extractionMeta.totalLayers) {
                    console.log(chalk.gray(`   Layers Used: ${extractionMeta.totalLayers}`));
                }
            }

            this.testResults.phases.extractionMethods = {
                status: 'completed',
                methods: methods,
                timestamp: new Date().toISOString()
            };

            return true;

        } catch (error) {
            console.error(chalk.red('❌ Extraction method detection failed:'), error.message);
            this.testResults.errors.push({
                phase: 'extractionMethods',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    /**
     * Phase 5: Measure Performance Metrics
     */
    async measurePerformanceMetrics() {
        console.log(chalk.blue('\n⚡ Phase 5: Performance Metrics Analysis'));

        const extractionMeta = this.testResults.extractionData?._extraction;
        const performance = {
            totalProcessingTime: this.testResults.performance.extractionTime || 0,
            extractionMethod: extractionMeta?.method || 'unknown',
            layersUsed: extractionMeta?.totalLayers || 0,
            validationPassed: extractionMeta?.validationPassed || false,
            validationScore: extractionMeta?.validationScore || 0,
            hashCompliant: extractionMeta?.hashCompliant || false
        };

        console.log(chalk.cyan(`⏱️  Total Processing Time: ${performance.totalProcessingTime}ms`));
        console.log(chalk.cyan(`🔧 Extraction Method: ${performance.extractionMethod}`));
        console.log(chalk.cyan(`📚 Layers Used: ${performance.layersUsed}`));
        console.log(chalk.cyan(`✅ Validation Passed: ${performance.validationPassed ? 'Yes' : 'No'}`));
        console.log(chalk.cyan(`📊 Validation Score: ${performance.validationScore}%`));
        console.log(chalk.cyan(`🎯 Hash Compliant: ${performance.hashCompliant ? 'Yes' : 'No'}`));

        // Performance assessment
        let performanceGrade = 'F';
        if (performance.totalProcessingTime < 5000) performanceGrade = 'A'; // Under 5s
        else if (performance.totalProcessingTime < 10000) performanceGrade = 'B'; // Under 10s
        else if (performance.totalProcessingTime < 15000) performanceGrade = 'C'; // Under 15s
        else if (performance.totalProcessingTime < 30000) performanceGrade = 'D'; // Under 30s

        console.log(chalk.yellow(`\n📈 Performance Grade: ${performanceGrade}`));

        this.testResults.performance = {
            ...this.testResults.performance,
            ...performance,
            grade: performanceGrade,
            timestamp: new Date().toISOString()
        };

        this.testResults.phases.performance = {
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        return true;
    }

    /**
     * Phase 6: Test Address Enhancement Capability
     */
    async testAddressEnhancement() {
        console.log(chalk.blue('\n📍 Phase 6: Address Enhancement Capability Test'));

        const data = this.testResults.extractionData;
        if (!data) {
            console.log(chalk.red('❌ No extraction data available'));
            return false;
        }

        const enhancement = {
            originalVenue: data.venue || 'Not found',
            originalAddress: data.address || data.rawLocation || 'Not found',
            venueResolved: false,
            addressResolved: false,
            gpsReady: false
        };

        try {
            // Check if the venue matches expected Oakland Arena
            const venueMatch = enhancement.originalVenue.toLowerCase().includes('oakland arena') ||
                              enhancement.originalVenue.toLowerCase().includes('oracle arena');
            enhancement.venueResolved = venueMatch;

            console.log(chalk.cyan(`🏢 Original Venue: ${enhancement.originalVenue}`));
            console.log(chalk.cyan(`✅ Venue Resolution: ${enhancement.venueResolved ? 'SUCCESS - Matches Oakland Arena' : 'PARTIAL - Check venue name'}`));

            // Check if address contains street information
            const hasStreetAddress = enhancement.originalAddress.toLowerCase().includes('7000') && 
                                   enhancement.originalAddress.toLowerCase().includes('coliseum');
            enhancement.addressResolved = hasStreetAddress || enhancement.originalAddress.includes(',');

            console.log(chalk.cyan(`📍 Original Address: ${enhancement.originalAddress}`));
            console.log(chalk.cyan(`✅ Address Resolution: ${enhancement.addressResolved ? 'SUCCESS' : 'NEEDS ENHANCEMENT'}`));

            // Check GPS readiness (address should have comma for proper parsing)
            enhancement.gpsReady = enhancement.originalAddress.includes(',') && enhancement.originalAddress.length > 10;
            console.log(chalk.cyan(`🧭 GPS Navigation Ready: ${enhancement.gpsReady ? 'YES' : 'NO'}`));

            // Test Bay Area venue database lookup
            console.log(chalk.yellow('\n🔍 Bay Area Venue Database Test:'));
            
            // Read Bay Area venues file to check if Oakland Arena is listed
            const fs = require('fs');
            const path = require('path');
            
            try {
                const venuesPath = path.join(__dirname, 'BayAreaVenues.txt');
                if (fs.existsSync(venuesPath)) {
                    const venuesContent = fs.readFileSync(venuesPath, 'utf8');
                    const hasOaklandArena = venuesContent.toLowerCase().includes('oakland arena') ||
                                          venuesContent.toLowerCase().includes('7000 coliseum');
                    
                    console.log(chalk.cyan(`📚 Bay Area Database: ${hasOaklandArena ? '✅ Oakland Arena found' : '⚠️  Oakland Arena not found'}`));
                    enhancement.inDatabase = hasOaklandArena;
                    
                    if (hasOaklandArena) {
                        console.log(chalk.green('   → Address enhancement should work for Oakland Arena'));
                    } else {
                        console.log(chalk.yellow('   → May need to add Oakland Arena to venue database'));
                    }
                } else {
                    console.log(chalk.yellow('📚 Bay Area Database: File not found'));
                    enhancement.inDatabase = false;
                }
            } catch (error) {
                console.log(chalk.red('❌ Database lookup failed:'), error.message);
                enhancement.inDatabase = false;
            }

            this.testResults.addressEnhancement = enhancement;

            this.testResults.phases.addressEnhancement = {
                status: 'completed',
                timestamp: new Date().toISOString()
            };

            return true;

        } catch (error) {
            console.error(chalk.red('❌ Address enhancement test failed:'), error.message);
            this.testResults.errors.push({
                phase: 'addressEnhancement',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            return false;
        }
    }

    /**
     * Phase 7: Calculate Overall Confidence Score
     */
    async calculateConfidenceScore() {
        console.log(chalk.blue('\n🎯 Phase 7: Overall Confidence Score Calculation'));

        const confidence = {
            dataExtraction: 0,
            fieldAccuracy: 0,
            hashCompliance: 0,
            overall: 0
        };

        // Data extraction confidence (based on fields found)
        const extractedFields = this.testResults.phases.extraction;
        if (extractedFields) {
            const fieldCount = extractedFields.fieldsExtracted || 0;
            const criticalFields = [
                extractedFields.hasTitle,
                extractedFields.hasDate,
                extractedFields.hasVenue,
                extractedFields.hasAddress
            ].filter(Boolean).length;
            
            confidence.dataExtraction = (criticalFields / 4) * 100;
        }

        // Field accuracy confidence (based on data quality)
        const compliance = this.testResults.compliance;
        if (compliance) {
            confidence.fieldAccuracy = compliance.score || 0;
        }

        // Hash compliance confidence
        confidence.hashCompliance = this.testResults.extractionData?._extraction?.validationScore || 0;

        // Overall confidence (weighted average)
        confidence.overall = Math.round(
            (confidence.dataExtraction * 0.4) +
            (confidence.fieldAccuracy * 0.3) +
            (confidence.hashCompliance * 0.3)
        );

        console.log(chalk.cyan(`📊 Data Extraction Confidence: ${confidence.dataExtraction}%`));
        console.log(chalk.cyan(`🎯 Field Accuracy Confidence: ${confidence.fieldAccuracy}%`));
        console.log(chalk.cyan(`✅ Hash Compliance Confidence: ${confidence.hashCompliance}%`));
        console.log(chalk.yellow(`\n🏆 Overall Confidence Score: ${confidence.overall}%`));

        // Confidence assessment
        let confidenceGrade = 'F';
        if (confidence.overall >= 90) confidenceGrade = 'A';
        else if (confidence.overall >= 80) confidenceGrade = 'B';
        else if (confidence.overall >= 70) confidenceGrade = 'C';
        else if (confidence.overall >= 60) confidenceGrade = 'D';

        console.log(chalk.yellow(`🏅 Confidence Grade: ${confidenceGrade}`));

        this.testResults.confidence = {
            ...confidence,
            grade: confidenceGrade,
            timestamp: new Date().toISOString()
        };

        this.testResults.phases.confidence = {
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        return true;
    }

    /**
     * Generate comprehensive test report
     */
    async generateTestReport() {
        console.log(chalk.blue('\n📋 Generating Comprehensive Test Report'));
        
        this.testResults.completed = new Date().toISOString();
        this.testResults.duration = Date.now() - new Date(this.testResults.started).getTime();

        console.log(chalk.green('\n' + '='.repeat(80)));
        console.log(chalk.green('📊 OAKLAND ARENA EVENT SCRAPER TEST REPORT'));
        console.log(chalk.green('='.repeat(80)));

        // Test Summary
        console.log(chalk.yellow('\n📋 TEST SUMMARY'));
        console.log(chalk.cyan(`   🌐 URL: ${this.testResults.url}`));
        console.log(chalk.cyan(`   ⏱️  Duration: ${this.testResults.duration}ms`));
        console.log(chalk.cyan(`   🚀 Started: ${this.testResults.started}`));
        console.log(chalk.cyan(`   ✅ Completed: ${this.testResults.completed}`));

        // Phase Results
        console.log(chalk.yellow('\n🔍 PHASE RESULTS'));
        Object.entries(this.testResults.phases).forEach(([phase, result]) => {
            const status = result.status === 'completed' ? '✅' : '❌';
            console.log(chalk.cyan(`   ${status} ${phase}: ${result.status.toUpperCase()}`));
        });

        // Key Findings
        console.log(chalk.yellow('\n📊 KEY FINDINGS'));
        
        if (this.testResults.extractionData) {
            console.log(chalk.cyan(`   📝 Title: ${this.testResults.extractionData.title ? '✅ Found' : '❌ Missing'}`));
            console.log(chalk.cyan(`   🏢 Venue: ${this.testResults.extractionData.venue ? '✅ Found' : '❌ Missing'}`));
            console.log(chalk.cyan(`   📍 Address: ${this.testResults.extractionData.address || this.testResults.extractionData.rawLocation ? '✅ Found' : '❌ Missing'}`));
            console.log(chalk.cyan(`   📅 Date: ${this.testResults.extractionData.date || this.testResults.extractionData.startDate ? '✅ Found' : '❌ Missing'}`));
            console.log(chalk.cyan(`   🖼️  Images: ${this.testResults.extractionData.imageUrls?.length || 0} found`));
        }

        // Performance Metrics
        if (this.testResults.performance) {
            console.log(chalk.yellow('\n⚡ PERFORMANCE METRICS'));
            console.log(chalk.cyan(`   ⏱️  Processing Time: ${this.testResults.performance.totalProcessingTime}ms`));
            console.log(chalk.cyan(`   🏅 Performance Grade: ${this.testResults.performance.grade}`));
            console.log(chalk.cyan(`   🔧 Method Used: ${this.testResults.performance.extractionMethod}`));
        }

        // Confidence Analysis
        if (this.testResults.confidence) {
            console.log(chalk.yellow('\n🎯 CONFIDENCE ANALYSIS'));
            console.log(chalk.cyan(`   🏆 Overall Score: ${this.testResults.confidence.overall}%`));
            console.log(chalk.cyan(`   🏅 Confidence Grade: ${this.testResults.confidence.grade}`));
            console.log(chalk.cyan(`   📊 Data Extraction: ${this.testResults.confidence.dataExtraction}%`));
            console.log(chalk.cyan(`   🎯 Field Accuracy: ${this.testResults.confidence.fieldAccuracy}%`));
            console.log(chalk.cyan(`   ✅ Hash Compliance: ${this.testResults.confidence.hashCompliance}%`));
        }

        // Hash Compliance
        if (this.testResults.compliance) {
            console.log(chalk.yellow('\n✅ HASH APP COMPLIANCE'));
            console.log(chalk.cyan(`   📊 Compliance Score: ${this.testResults.compliance.score}%`));
            console.log(chalk.cyan(`   🏠 Address Format: ${this.testResults.compliance.addressFormat ? '✅ Valid' : '❌ Invalid'}`));
            console.log(chalk.cyan(`   📋 Required Fields: ${this.testResults.compliance.requiredFields ? '✅ Present' : '❌ Missing'}`));
            console.log(chalk.cyan(`   🏷️  Categories: ${this.testResults.compliance.categories ? '✅ Valid' : '❌ Invalid'}`));
            console.log(chalk.cyan(`   📅 Date Format: ${this.testResults.compliance.dateFormat ? '✅ Valid' : '❌ Invalid'}`));
        }

        // Address Enhancement
        if (this.testResults.addressEnhancement) {
            console.log(chalk.yellow('\n📍 ADDRESS ENHANCEMENT'));
            console.log(chalk.cyan(`   🏢 Venue Recognition: ${this.testResults.addressEnhancement.venueResolved ? '✅ Success' : '⚠️  Needs Review'}`));
            console.log(chalk.cyan(`   📍 Address Quality: ${this.testResults.addressEnhancement.addressResolved ? '✅ Good' : '⚠️  Needs Enhancement'}`));
            console.log(chalk.cyan(`   🧭 GPS Ready: ${this.testResults.addressEnhancement.gpsReady ? '✅ Yes' : '❌ No'}`));
            console.log(chalk.cyan(`   📚 In Database: ${this.testResults.addressEnhancement.inDatabase !== undefined ? (this.testResults.addressEnhancement.inDatabase ? '✅ Yes' : '❌ No') : '❓ Unknown'}`));
        }

        // Errors (if any)
        if (this.testResults.errors.length > 0) {
            console.log(chalk.yellow('\n❌ ERRORS ENCOUNTERED'));
            this.testResults.errors.forEach((error, i) => {
                console.log(chalk.red(`   [${i + 1}] ${error.phase}: ${error.error}`));
            });
        }

        console.log(chalk.green('\n' + '='.repeat(80)));

        // Save results to file
        const fs = require('fs');
        const reportPath = `/Users/user/Desktop/hash/scripts/scraper/oakland-arena-test-results.json`;
        try {
            fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
            console.log(chalk.gray(`📁 Full results saved to: ${reportPath}`));
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not save results file: ${error.message}`));
        }
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        if (this.scraper) {
            await this.scraper.closeBrowser();
        }
    }

    /**
     * Run the complete test suite
     */
    async runCompleteTest() {
        try {
            await this.initialize();
            
            const success1 = await this.testSingleEventExtraction();
            if (success1) {
                await this.analyzeExtractedData();
                await this.validateHashCompliance(); 
                await this.testExtractionMethods();
                await this.measurePerformanceMetrics();
                await this.testAddressEnhancement();
                await this.calculateConfidenceScore();
            }
            
            await this.generateTestReport();
            
        } catch (error) {
            console.error(chalk.red('\n❌ Test suite failed:'), error.message);
            if (TEST_CONFIG.debug) {
                console.error(chalk.red('Stack trace:'), error.stack);
            }
        } finally {
            await this.cleanup();
        }
    }
}

// Update todo status and run the test
(async () => {
    console.log(chalk.blue('🧪 Starting Oakland Arena Event Scraper Test...'));
    
    const test = new OaklandArenaTest();
    await test.runCompleteTest();
    
    console.log(chalk.green('\n✨ Test suite completed!'));
    process.exit(0);
})();