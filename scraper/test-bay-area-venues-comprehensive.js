#!/usr/bin/env node

/**
 * Comprehensive Bay Area Venue Testing Suite
 * 
 * Tests the Universal Event Scraper against top Bay Area venues identified from venue analysis.
 * Focuses on LiveNation integration, custom calendars, and different platform structures.
 * 
 * Test Venues (Priority Order):
 * 1. The Fillmore - LiveNation platform, major touring acts
 * 2. 1015 Folsom - Electronic music club, calendar widget  
 * 3. Great American Music Hall - Historic venue, custom calendar
 * 4. Cobbs Comedy Club - Comedy club, multiple shows per night
 * 
 * Tests:
 * - Single Event Extraction (scrapeGeneric)
 * - Multi-Event Extraction (scrapeEventListing) 
 * - Data Quality Assessment
 * - Performance Metrics
 * - Bay Area deployment readiness
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class BayAreaVenueTestSuite {
    constructor() {
        this.scraper = new EventScraper({
            headless: false, // Show browser for debugging
            timeout: 45000,
            delay: 2000,
            debug: true,
            verbose: true
        });
        
        // Test venues in priority order
        this.venues = [
            {
                name: 'The Fillmore',
                url: 'https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events',
                address: '1805 Geary Blvd, San Francisco, CA 94115, United States',
                platform: 'LiveNation',
                category: 'Music',
                description: 'Major touring acts, LiveNation platform integration',
                testTypes: ['single_event', 'multi_event', 'performance']
            },
            {
                name: '1015 Folsom', 
                url: 'https://1015.com/#calendar',
                address: '1015 Folsom St, San Francisco, CA 94103, United States',
                platform: 'Custom',
                category: 'Electronic Music/Nightlife',
                description: 'Electronic music club with calendar widget',
                testTypes: ['single_event', 'multi_event', 'calendar_widget']
            },
            {
                name: 'Great American Music Hall',
                url: 'https://gamh.com/calendar/',
                address: '859 O\'Farrell St, San Francisco, CA 94109, United States', 
                platform: 'Custom',
                category: 'Music',
                description: 'Historic venue with custom calendar system',
                testTypes: ['single_event', 'multi_event', 'custom_calendar']
            },
            {
                name: 'Cobbs Comedy Club',
                url: 'https://www.cobbscomedy.com/',
                address: '915 Columbus Ave, San Francisco, CA 94133, United States',
                platform: 'Custom',
                category: 'Comedy',
                description: 'Comedy club with multiple shows per night',
                testTypes: ['single_event', 'multi_event', 'multi_shows']
            }
        ];
        
        this.results = {
            venues: [],
            summary: {
                totalVenues: 0,
                successful: 0,
                failed: 0,
                averageConfidence: 0,
                averageProcessingTime: 0,
                categoryMappingAccuracy: 0,
                hashComplianceRate: 0
            },
            performance: {
                extractionMethods: {},
                platformComparison: {},
                bayAreaReadiness: {
                    score: 0,
                    recommendations: []
                }
            }
        };
    }
    
    /**
     * Run comprehensive test suite
     */
    async runTestSuite() {
        console.log(chalk.blue.bold('\n🚀 Bay Area Venue Testing Suite Starting...\n'));
        console.log(chalk.gray(`Testing ${this.venues.length} priority venues for Hash App deployment readiness`));
        console.log(chalk.gray(`Focus: LiveNation integration, custom calendars, electronic/comedy venues\n`));
        
        const startTime = Date.now();
        
        try {
            // Test each venue comprehensively
            for (let i = 0; i < this.venues.length; i++) {
                const venue = this.venues[i];
                console.log(chalk.cyan(`\n[${ i + 1}/${this.venues.length}] Testing ${venue.name}...`));
                console.log(chalk.gray(`Platform: ${venue.platform} | Category: ${venue.category}`));
                console.log(chalk.gray(`URL: ${venue.url}\n`));
                
                const venueResult = await this.testVenue(venue);
                this.results.venues.push(venueResult);
                
                // Add delay between venues to avoid rate limiting
                if (i < this.venues.length - 1) {
                    console.log(chalk.gray('⏳ Waiting 3 seconds before next venue...\n'));
                    await this.delay(3000);
                }
            }
            
            // Generate comprehensive analysis
            await this.generateAnalysis();
            
            // Save results
            await this.saveResults();
            
            const totalTime = Date.now() - startTime;
            console.log(chalk.green.bold(`\n✅ Bay Area Venue Testing Complete!`));
            console.log(chalk.gray(`Total time: ${(totalTime / 1000).toFixed(1)}s`));
            console.log(chalk.gray(`Results saved to: bay-area-venues-test-results-${Date.now()}.json\n`));
            
        } catch (error) {
            console.error(chalk.red('\n❌ Test suite failed:'), error.message);
            console.error(chalk.red('Stack trace:'), error.stack);
        } finally {
            await this.scraper.closeBrowser();
        }
    }
    
    /**
     * Comprehensive testing of a single venue
     */
    async testVenue(venue) {
        const venueResult = {
            ...venue,
            tests: {
                singleEvent: null,
                multiEvent: null, 
                dataQuality: null,
                performance: null
            },
            overall: {
                success: false,
                confidence: 0,
                hashCompliant: false,
                deploymentReady: false,
                errors: []
            }
        };
        
        try {
            // Test 1: Single Event Extraction
            if (venue.testTypes.includes('single_event')) {
                console.log(chalk.blue('🎯 Test 1: Single Event Extraction (scrapeGeneric)'));
                venueResult.tests.singleEvent = await this.testSingleEventExtraction(venue);
            }
            
            // Test 2: Multi-Event Extraction  
            if (venue.testTypes.includes('multi_event')) {
                console.log(chalk.blue('📋 Test 2: Multi-Event Extraction (scrapeEventListing)'));
                venueResult.tests.multiEvent = await this.testMultiEventExtraction(venue);
            }
            
            // Test 3: Data Quality Assessment
            console.log(chalk.blue('🔍 Test 3: Data Quality Assessment'));
            venueResult.tests.dataQuality = await this.testDataQuality(venue, venueResult.tests);
            
            // Test 4: Performance Metrics
            console.log(chalk.blue('⚡ Test 4: Performance Metrics'));
            venueResult.tests.performance = await this.testPerformance(venue, venueResult.tests);
            
            // Calculate overall venue assessment
            this.calculateVenueOverall(venueResult);
            
            console.log(chalk.green(`✅ ${venue.name} testing complete`));
            console.log(chalk.gray(`Overall confidence: ${venueResult.overall.confidence}%`));
            console.log(chalk.gray(`Deployment ready: ${venueResult.overall.deploymentReady ? 'Yes' : 'No'}\n`));
            
        } catch (error) {
            console.error(chalk.red(`❌ ${venue.name} testing failed:`), error.message);
            venueResult.overall.errors.push(error.message);
        }
        
        return venueResult;
    }
    
    /**
     * Test single event extraction capability
     */
    async testSingleEventExtraction(venue) {
        const test = {
            success: false,
            extractedData: null,
            confidence: 0,
            processingTime: 0,
            extractionMethod: null,
            errors: []
        };
        
        try {
            const startTime = Date.now();
            
            // Navigate to venue page and extract single event
            const eventData = await this.scraper.scrapeEvent(venue.url);
            
            test.processingTime = Date.now() - startTime;
            test.extractedData = eventData;
            test.success = !!(eventData && eventData.title);
            test.extractionMethod = eventData._extraction?.method || 'unknown';
            
            // Calculate confidence based on data completeness
            test.confidence = this.calculateDataConfidence(eventData, venue);
            
            console.log(chalk.green(`  ✅ Single event extracted: "${eventData.title || 'Untitled'}"`));
            console.log(chalk.gray(`  Method: ${test.extractionMethod} | Confidence: ${test.confidence}%`));
            console.log(chalk.gray(`  Processing time: ${test.processingTime}ms`));
            
        } catch (error) {
            console.error(chalk.red(`  ❌ Single event extraction failed:`), error.message);
            test.errors.push(error.message);
        }
        
        return test;
    }
    
    /**
     * Test multi-event extraction capability
     */
    async testMultiEventExtraction(venue) {
        const test = {
            success: false,
            extractedEvents: [],
            eventCount: 0,
            averageConfidence: 0,
            processingTime: 0,
            errors: []
        };
        
        try {
            const startTime = Date.now();
            
            // Use the multi-event extraction capability
            const events = await this.scraper.scrapeEventListing();
            
            test.processingTime = Date.now() - startTime;
            test.extractedEvents = events;
            test.eventCount = events.length;
            test.success = events.length > 0;
            
            // Calculate average confidence
            if (events.length > 0) {
                const confidences = events.map(event => this.calculateDataConfidence(event, venue));
                test.averageConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
            }
            
            console.log(chalk.green(`  ✅ Multi-event extraction: ${test.eventCount} events found`));
            console.log(chalk.gray(`  Average confidence: ${test.averageConfidence}%`));
            console.log(chalk.gray(`  Processing time: ${test.processingTime}ms`));
            
        } catch (error) {
            console.error(chalk.red(`  ❌ Multi-event extraction failed:`), error.message);
            test.errors.push(error.message);
        }
        
        return test;
    }
    
    /**
     * Test data quality and Hash app compliance
     */
    async testDataQuality(venue, tests) {
        const quality = {
            titleExtraction: { success: false, confidence: 0, hashCompliant: false },
            dateTimeExtraction: { success: false, confidence: 0, hashCompliant: false },
            venueExtraction: { success: false, confidence: 0, hashCompliant: false },
            addressExtraction: { success: false, confidence: 0, hashCompliant: false },
            categoryMapping: { success: false, confidence: 0, hashCompliant: false, mappedCategories: [] },
            addressEnhancement: { success: false, confidence: 0, enhancedFrom: null },
            overallQuality: 0,
            hashComplianceRate: 0,
            recommendations: []
        };
        
        // Analyze single event data quality
        if (tests.singleEvent?.extractedData) {
            const data = tests.singleEvent.extractedData;
            
            // Title quality
            quality.titleExtraction.success = !!(data.title && data.title.trim());
            quality.titleExtraction.confidence = this.assessFieldQuality('title', data.title);
            quality.titleExtraction.hashCompliant = this.isHashCompliant('title', data.title);
            
            // Date/Time quality  
            quality.dateTimeExtraction.success = !!(data.date || data.startTime);
            quality.dateTimeExtraction.confidence = this.assessFieldQuality('datetime', {
                date: data.date,
                time: data.startTime
            });
            quality.dateTimeExtraction.hashCompliant = this.isHashCompliant('datetime', {
                date: data.date,
                time: data.startTime  
            });
            
            // Venue quality
            quality.venueExtraction.success = !!(data.venue && data.venue.trim());
            quality.venueExtraction.confidence = this.assessFieldQuality('venue', data.venue);
            quality.venueExtraction.hashCompliant = this.isHashCompliant('venue', data.venue);
            
            // Address quality and enhancement
            quality.addressExtraction.success = !!(data.address && data.address.trim());
            quality.addressExtraction.confidence = this.assessFieldQuality('address', data.address);
            quality.addressExtraction.hashCompliant = this.isHashCompliant('address', data.address);
            
            // Test address enhancement against Bay Area database
            if (data.address) {
                const enhancement = this.testAddressEnhancement(data.address, venue.address);
                quality.addressEnhancement = enhancement;
            }
            
            // Category mapping quality
            if (data.categories && data.categories.length > 0) {
                quality.categoryMapping.success = true;
                quality.categoryMapping.mappedCategories = data.categories;
                quality.categoryMapping.confidence = this.assessCategoryMapping(data.categories, venue.category);
                quality.categoryMapping.hashCompliant = this.areValidHashCategories(data.categories);
            }
        }
        
        // Calculate overall quality scores
        const qualityScores = Object.values(quality)
            .filter(item => typeof item === 'object' && item.confidence !== undefined)
            .map(item => item.confidence);
        
        if (qualityScores.length > 0) {
            quality.overallQuality = Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length);
        }
        
        // Calculate Hash compliance rate
        const complianceChecks = Object.values(quality)
            .filter(item => typeof item === 'object' && item.hashCompliant !== undefined)
            .map(item => item.hashCompliant ? 1 : 0);
        
        if (complianceChecks.length > 0) {
            quality.hashComplianceRate = Math.round((complianceChecks.reduce((a, b) => a + b, 0) / complianceChecks.length) * 100);
        }
        
        // Generate recommendations
        quality.recommendations = this.generateQualityRecommendations(quality, venue);
        
        console.log(chalk.green(`  ✅ Data quality analysis complete`));
        console.log(chalk.gray(`  Overall quality: ${quality.overallQuality}%`));
        console.log(chalk.gray(`  Hash compliance: ${quality.hashComplianceRate}%`));
        
        return quality;
    }
    
    /**
     * Test performance characteristics
     */
    async testPerformance(venue, tests) {
        const performance = {
            singleEventTime: tests.singleEvent?.processingTime || 0,
            multiEventTime: tests.multiEvent?.processingTime || 0,
            averageProcessingTime: 0,
            extractionMethod: tests.singleEvent?.extractionMethod || 'unknown',
            platformEfficiency: 0,
            recommendedOptimizations: []
        };
        
        // Calculate averages
        const times = [performance.singleEventTime, performance.multiEventTime].filter(t => t > 0);
        if (times.length > 0) {
            performance.averageProcessingTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
        }
        
        // Assess platform efficiency
        performance.platformEfficiency = this.assessPlatformEfficiency(venue.platform, performance.extractionMethod, performance.averageProcessingTime);
        
        // Generate optimization recommendations
        performance.recommendedOptimizations = this.generatePerformanceOptimizations(performance, venue);
        
        console.log(chalk.green(`  ✅ Performance analysis complete`));
        console.log(chalk.gray(`  Average processing time: ${performance.averageProcessingTime}ms`));
        console.log(chalk.gray(`  Platform efficiency: ${performance.platformEfficiency}%`));
        
        return performance;
    }
    
    /**
     * Calculate data confidence score
     */
    calculateDataConfidence(data, venue) {
        if (!data) return 0;
        
        let score = 0;
        let maxScore = 0;
        
        // Title (weight: 25)
        maxScore += 25;
        if (data.title && data.title.trim() && data.title !== 'Untitled Event') {
            score += Math.min(25, data.title.length >= 5 ? 25 : 15);
        }
        
        // Date/Time (weight: 25) 
        maxScore += 25;
        if (data.date) {
            score += 15;
            if (data.startTime) score += 10;
        }
        
        // Venue (weight: 20)
        maxScore += 20;
        if (data.venue && data.venue.trim() && data.venue !== 'Venue TBD') {
            score += 20;
        }
        
        // Address (weight: 20)
        maxScore += 20;
        if (data.address && data.address.trim() && data.address !== 'Address TBD') {
            score += data.address.includes(',') ? 20 : 15;
        }
        
        // Categories (weight: 10)
        maxScore += 10;
        if (data.categories && data.categories.length > 0) {
            score += 10;
        }
        
        return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    }
    
    /**
     * Assess field quality
     */
    assessFieldQuality(fieldType, value) {
        switch (fieldType) {
            case 'title':
                if (!value || typeof value !== 'string') return 0;
                if (value.includes('TBD') || value.includes('Untitled')) return 20;
                if (value.length < 3) return 30;
                if (value.length > 150) return 70;
                return 90;
                
            case 'datetime':
                if (!value || typeof value !== 'object') return 0;
                let score = 0;
                if (value.date) {
                    try {
                        const date = new Date(value.date);
                        if (!isNaN(date.getTime())) score += 50;
                    } catch (e) {
                        score += 20;
                    }
                }
                if (value.time && /\d{2}:\d{2}:\d{2}/.test(value.time)) score += 50;
                return score;
                
            case 'venue':
            case 'address':
                if (!value || typeof value !== 'string') return 0;
                if (value.includes('TBD')) return 20;
                if (fieldType === 'address' && !value.includes(',')) return 70;
                return value.length > 5 ? 90 : 60;
                
            default:
                return value ? 80 : 0;
        }
    }
    
    /**
     * Check Hash app compliance
     */
    isHashCompliant(fieldType, value) {
        switch (fieldType) {
            case 'title':
                return !!(value && typeof value === 'string' && value.trim() && !value.includes('TBD'));
                
            case 'datetime':
                return !!(value?.date && value?.time);
                
            case 'venue':
                return !!(value && typeof value === 'string' && value.trim() && !value.includes('TBD'));
                
            case 'address':
                return !!(value && typeof value === 'string' && value.includes(',') && !value.includes('TBD'));
                
            default:
                return !!value;
        }
    }
    
    /**
     * Test address enhancement against Bay Area venue database
     */
    testAddressEnhancement(extractedAddress, knownAddress) {
        const enhancement = {
            success: false,
            confidence: 0,
            enhancedFrom: null,
            matchesKnown: false
        };
        
        if (!extractedAddress || !knownAddress) return enhancement;
        
        // Simple similarity check
        const normalizeAddress = (addr) => addr.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
        const normalized1 = normalizeAddress(extractedAddress);
        const normalized2 = normalizeAddress(knownAddress);
        
        // Calculate similarity
        const similarity = this.calculateStringSimilarity(normalized1, normalized2);
        
        enhancement.success = similarity > 0.6;
        enhancement.confidence = Math.round(similarity * 100);
        enhancement.matchesKnown = similarity > 0.8;
        
        if (extractedAddress.includes(',') && !extractedAddress.includes('TBD')) {
            enhancement.enhancedFrom = 'extracted';
        } else {
            enhancement.enhancedFrom = 'fallback';
        }
        
        return enhancement;
    }
    
    /**
     * Assess category mapping quality
     */
    assessCategoryMapping(mappedCategories, expectedCategory) {
        if (!mappedCategories || mappedCategories.length === 0) return 0;
        
        const validHashCategories = [
            'Music', 'Comedy', 'Arts & Theater', 'Nightlife', 'Food & Drink',
            'Sports', 'Education', 'Family', 'Community', 'Business'
        ];
        
        const validCount = mappedCategories.filter(cat => validHashCategories.includes(cat)).length;
        const validityScore = (validCount / mappedCategories.length) * 50;
        
        // Check if mapped categories align with expected venue category
        let alignmentScore = 0;
        const categoryMappings = {
            'Music': ['Music'],
            'Electronic Music/Nightlife': ['Music', 'Nightlife'],
            'Comedy': ['Comedy']
        };
        
        const expectedCategories = categoryMappings[expectedCategory] || [];
        const hasExpected = expectedCategories.some(cat => mappedCategories.includes(cat));
        alignmentScore = hasExpected ? 50 : 0;
        
        return Math.round(validityScore + alignmentScore);
    }
    
    /**
     * Check if categories are valid Hash categories
     */
    areValidHashCategories(categories) {
        if (!categories || categories.length === 0) return false;
        
        const validHashCategories = [
            'Music', 'Comedy', 'Arts & Theater', 'Nightlife', 'Food & Drink',
            'Sports', 'Education', 'Family', 'Community', 'Business'
        ];
        
        return categories.every(cat => validHashCategories.includes(cat));
    }
    
    /**
     * Assess platform efficiency
     */
    assessPlatformEfficiency(platform, extractionMethod, processingTime) {
        let baseScore = 50;
        
        // Platform bonuses
        switch (platform) {
            case 'LiveNation':
                baseScore += extractionMethod === 'structured_data' ? 30 : 10;
                break;
            case 'Custom':
                baseScore += extractionMethod === 'universal' ? 20 : 5;
                break;
        }
        
        // Processing time penalties
        if (processingTime > 10000) baseScore -= 20;
        else if (processingTime > 5000) baseScore -= 10;
        else if (processingTime < 2000) baseScore += 10;
        
        return Math.max(0, Math.min(100, baseScore));
    }
    
    /**
     * Calculate venue overall assessment
     */
    calculateVenueOverall(venueResult) {
        const tests = venueResult.tests;
        const overall = venueResult.overall;
        
        // Success rate
        const successCount = Object.values(tests).filter(test => test?.success).length;
        const totalTests = Object.values(tests).filter(test => test !== null).length;
        overall.success = totalTests > 0 && successCount / totalTests >= 0.5;
        
        // Average confidence
        const confidences = [
            tests.singleEvent?.confidence,
            tests.multiEvent?.averageConfidence,
            tests.dataQuality?.overallQuality
        ].filter(c => c !== null && c !== undefined);
        
        if (confidences.length > 0) {
            overall.confidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
        }
        
        // Hash compliance
        overall.hashCompliant = tests.dataQuality?.hashComplianceRate >= 70;
        
        // Deployment readiness
        overall.deploymentReady = overall.success && overall.confidence >= 60 && overall.hashCompliant;
    }
    
    /**
     * Generate quality recommendations
     */
    generateQualityRecommendations(quality, venue) {
        const recommendations = [];
        
        if (quality.titleExtraction.confidence < 70) {
            recommendations.push(`Improve title extraction for ${venue.platform} platforms`);
        }
        
        if (quality.dateTimeExtraction.confidence < 70) {
            recommendations.push(`Enhance date/time parsing for ${venue.name} format`);
        }
        
        if (quality.addressExtraction.confidence < 70 || !quality.addressExtraction.hashCompliant) {
            recommendations.push('Implement address comma requirement enforcement');
        }
        
        if (!quality.categoryMapping.hashCompliant) {
            recommendations.push(`Update category mappings for ${venue.category} events`);
        }
        
        if (quality.overallQuality < 70) {
            recommendations.push('Consider platform-specific extraction optimizations');
        }
        
        return recommendations;
    }
    
    /**
     * Generate performance optimization recommendations
     */
    generatePerformanceOptimizations(performance, venue) {
        const optimizations = [];
        
        if (performance.averageProcessingTime > 8000) {
            optimizations.push(`Optimize extraction speed for ${venue.platform} platform`);
        }
        
        if (performance.extractionMethod === 'legacy') {
            optimizations.push('Implement structured data support for this venue');
        }
        
        if (venue.platform === 'Custom' && performance.platformEfficiency < 60) {
            optimizations.push('Create venue-specific extraction patterns');
        }
        
        return optimizations;
    }
    
    /**
     * Calculate string similarity (simple Jaccard similarity)
     */
    calculateStringSimilarity(str1, str2) {
        const set1 = new Set(str1.split(' '));
        const set2 = new Set(str2.split(' '));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
    
    /**
     * Generate comprehensive analysis
     */
    async generateAnalysis() {
        const results = this.results;
        
        // Calculate summary statistics
        results.summary.totalVenues = results.venues.length;
        results.summary.successful = results.venues.filter(v => v.overall.success).length;
        results.summary.failed = results.summary.totalVenues - results.summary.successful;
        
        // Average metrics
        const confidences = results.venues.map(v => v.overall.confidence).filter(c => c > 0);
        if (confidences.length > 0) {
            results.summary.averageConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
        }
        
        const processingTimes = results.venues
            .map(v => v.tests.performance?.averageProcessingTime)
            .filter(t => t && t > 0);
        if (processingTimes.length > 0) {
            results.summary.averageProcessingTime = Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length);
        }
        
        const categoryMappingScores = results.venues
            .map(v => v.tests.dataQuality?.categoryMapping?.confidence)
            .filter(s => s !== null && s !== undefined);
        if (categoryMappingScores.length > 0) {
            results.summary.categoryMappingAccuracy = Math.round(categoryMappingScores.reduce((a, b) => a + b, 0) / categoryMappingScores.length);
        }
        
        const hashComplianceRates = results.venues
            .map(v => v.tests.dataQuality?.hashComplianceRate)
            .filter(r => r !== null && r !== undefined);
        if (hashComplianceRates.length > 0) {
            results.summary.hashComplianceRate = Math.round(hashComplianceRates.reduce((a, b) => a + b, 0) / hashComplianceRates.length);
        }
        
        // Performance analysis
        results.performance.extractionMethods = this.analyzeExtractionMethods();
        results.performance.platformComparison = this.analyzePlatformComparison();
        results.performance.bayAreaReadiness = this.assessBayAreaReadiness();
        
        console.log(chalk.blue.bold('\n📊 Bay Area Deployment Analysis:'));
        console.log(chalk.green(`Success rate: ${results.summary.successful}/${results.summary.totalVenues} venues (${Math.round((results.summary.successful/results.summary.totalVenues)*100)}%)`));
        console.log(chalk.green(`Average confidence: ${results.summary.averageConfidence}%`));
        console.log(chalk.green(`Hash compliance rate: ${results.summary.hashComplianceRate}%`));
        console.log(chalk.green(`Bay Area readiness score: ${results.performance.bayAreaReadiness.score}%`));
    }
    
    /**
     * Analyze extraction methods used
     */
    analyzeExtractionMethods() {
        const methods = {};
        
        this.results.venues.forEach(venue => {
            const method = venue.tests.singleEvent?.extractionMethod || 'unknown';
            methods[method] = (methods[method] || 0) + 1;
        });
        
        return methods;
    }
    
    /**
     * Analyze platform comparison
     */
    analyzePlatformComparison() {
        const platforms = {};
        
        this.results.venues.forEach(venue => {
            const platform = venue.platform;
            if (!platforms[platform]) {
                platforms[platform] = {
                    count: 0,
                    successRate: 0,
                    averageConfidence: 0,
                    averageProcessingTime: 0
                };
            }
            
            platforms[platform].count++;
            if (venue.overall.success) platforms[platform].successRate++;
            platforms[platform].averageConfidence += venue.overall.confidence;
            platforms[platform].averageProcessingTime += venue.tests.performance?.averageProcessingTime || 0;
        });
        
        // Calculate averages
        Object.keys(platforms).forEach(platform => {
            const p = platforms[platform];
            p.successRate = Math.round((p.successRate / p.count) * 100);
            p.averageConfidence = Math.round(p.averageConfidence / p.count);
            p.averageProcessingTime = Math.round(p.averageProcessingTime / p.count);
        });
        
        return platforms;
    }
    
    /**
     * Assess Bay Area deployment readiness
     */
    assessBayAreaReadiness() {
        const readiness = {
            score: 0,
            recommendations: []
        };
        
        // Base score from venue success rate
        const successRate = (this.results.summary.successful / this.results.summary.totalVenues) * 100;
        readiness.score += successRate * 0.4; // 40% weight
        
        // Confidence score contribution
        readiness.score += this.results.summary.averageConfidence * 0.3; // 30% weight
        
        // Hash compliance contribution
        readiness.score += this.results.summary.hashComplianceRate * 0.3; // 30% weight
        
        readiness.score = Math.round(readiness.score);
        
        // Generate recommendations
        if (successRate < 75) {
            readiness.recommendations.push('Improve extraction success rate for Bay Area venue deployment');
        }
        
        if (this.results.summary.averageConfidence < 70) {
            readiness.recommendations.push('Enhance data extraction confidence for production deployment');
        }
        
        if (this.results.summary.hashComplianceRate < 80) {
            readiness.recommendations.push('Improve Hash app compliance formatting before Bay Area launch');
        }
        
        if (this.results.summary.averageProcessingTime > 8000) {
            readiness.recommendations.push('Optimize processing performance for user experience');
        }
        
        // Platform-specific recommendations
        const platforms = this.results.performance.platformComparison;
        Object.keys(platforms).forEach(platform => {
            if (platforms[platform].successRate < 70) {
                readiness.recommendations.push(`Improve ${platform} platform integration`);
            }
        });
        
        return readiness;
    }
    
    /**
     * Save comprehensive results
     */
    async saveResults() {
        const timestamp = Date.now();
        const filename = `bay-area-venues-test-results-${timestamp}.json`;
        const filepath = path.join(__dirname, filename);
        
        const output = {
            testSuite: 'Bay Area Venue Testing Suite',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            summary: this.results.summary,
            performance: this.results.performance,
            venues: this.results.venues.map(venue => ({
                // Include venue details but limit raw data size
                name: venue.name,
                url: venue.url,
                platform: venue.platform,
                category: venue.category,
                overall: venue.overall,
                dataQuality: venue.tests.dataQuality,
                performance: venue.tests.performance,
                // Include sample extracted data (limited)
                sampleData: venue.tests.singleEvent?.extractedData ? {
                    title: venue.tests.singleEvent.extractedData.title,
                    date: venue.tests.singleEvent.extractedData.date,
                    venue: venue.tests.singleEvent.extractedData.venue,
                    address: venue.tests.singleEvent.extractedData.address,
                    categories: venue.tests.singleEvent.extractedData.categories,
                    extractionMethod: venue.tests.singleEvent.extractedData._extraction?.method
                } : null
            }))
        };
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
            console.log(chalk.gray(`📄 Results saved: ${filename}`));
        } catch (error) {
            console.error(chalk.red('❌ Failed to save results:'), error.message);
        }
    }
    
    /**
     * Utility: Add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Run the test suite if called directly
if (require.main === module) {
    const testSuite = new BayAreaVenueTestSuite();
    
    testSuite.runTestSuite().catch(error => {
        console.error(chalk.red('\n💥 Test suite crashed:'), error.message);
        console.error(chalk.red('Stack trace:'), error.stack);
        process.exit(1);
    });
}

module.exports = BayAreaVenueTestSuite;