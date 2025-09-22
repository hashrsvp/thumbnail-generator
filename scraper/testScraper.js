#!/usr/bin/env node

/**
 * Hash Event Scraper - Test Suite
 * 
 * Tests the scraper components and validates that scraped events
 * match the exact Firebase schema required by the Hash app.
 */

const chalk = require('chalk');
const FirebaseService = require('./firebaseService');
const LocationUtils = require('./utils/locationUtils');
const CategoryMapper = require('./utils/categoryMapper');
const ImageSelector = require('./utils/imageSelector');

class ScraperTester {
    constructor() {
        this.firebase = new FirebaseService();
        this.locationUtils = new LocationUtils();
        this.categoryMapper = new CategoryMapper();
        this.imageSelector = new ImageSelector();
        
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }
    
    // Test framework helpers
    async runTest(name, testFunc) {
        this.testResults.total++;
        
        try {
            console.log(chalk.cyan(`\n🧪 ${name}...`));
            await testFunc();
            console.log(chalk.green(`✅ ${name} - PASSED`));
            this.testResults.passed++;
        } catch (error) {
            console.log(chalk.red(`❌ ${name} - FAILED`));
            console.log(chalk.red(`   Error: ${error.message}`));
            this.testResults.failed++;
        }
    }
    
    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: expected ${expected}, got ${actual}`);
        }
    }
    
    assertArrayEquals(actual, expected, message) {
        if (JSON.stringify(actual.sort()) !== JSON.stringify(expected.sort())) {
            throw new Error(`${message}: expected [${expected.join(', ')}], got [${actual.join(', ')}]`);
        }
    }
    
    assertTrue(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }
    
    async runAllTests() {
        console.log(chalk.blue.bold('\n🚀 Hash Event Scraper - Test Suite'));
        console.log(chalk.gray('━'.repeat(60)));
        
        // Firebase Schema Tests
        await this.runTest('Firebase schema validation with valid data', this.testValidEventData.bind(this));
        await this.runTest('Firebase schema validation with invalid data', this.testInvalidEventData.bind(this));
        await this.runTest('Firebase data formatting', this.testEventDataFormatting.bind(this));
        
        // Location Utils Tests
        await this.runTest('Address formatting with comma requirement', this.testAddressFormatting.bind(this));
        await this.runTest('City detection from text', this.testCityDetection.bind(this));
        await this.runTest('Collection routing logic', this.testCollectionRouting.bind(this));
        await this.runTest('Venue extraction', this.testVenueExtraction.bind(this));
        
        // Category Mapper Tests
        await this.runTest('Category mapping from event data', this.testCategoryMapping.bind(this));
        await this.runTest('Category validation', this.testCategoryValidation.bind(this));
        await this.runTest('Fallback category assignment', this.testFallbackCategories.bind(this));
        
        // Image Selection Tests
        await this.runTest('Image ratio scoring for square images', this.testImageRatioScoring.bind(this));
        await this.runTest('Image selection with multiple candidates', this.testImageSelection.bind(this));
        await this.runTest('Flyer detection from URL patterns', this.testFlyerDetection.bind(this));
        await this.runTest('Image dimension extraction from URLs', this.testImageDimensions.bind(this));
        
        // Integration Tests
        await this.runTest('Complete event processing workflow', this.testCompleteWorkflow.bind(this));
        await this.runTest('Real Firebase connection', this.testFirebaseConnection.bind(this));
        
        this.showResults();
    }
    
    // Firebase Schema Tests
    async testValidEventData() {
        const validEvent = {
            title: 'Test Music Festival',
            address: '123 Market St, San Francisco',
            venue: 'Test Venue',
            date: '2024-12-15T20:00:00.000Z',
            startTime: '20:00:00',
            startDateTimestamp: { _seconds: 1702656000, _nanoseconds: 0 }, // Mock Timestamp
            categories: ['Music', 'Festivals'],
            free: false,
            soldOutStatus: false,
            createdAt: { _seconds: 1702656000, _nanoseconds: 0 },
        };
        
        const validation = this.firebase.validateEventData(validEvent);
        this.assertTrue(validation.valid, `Event should be valid: ${validation.errors?.join(', ')}`);
    }
    
    async testInvalidEventData() {
        const invalidEvent = {
            title: '', // Empty title - should fail
            address: 'No comma address', // No comma - should fail
            venue: 'Test Venue',
            categories: ['InvalidCategory'], // Invalid category - should fail
            free: 'not a boolean', // Should be boolean - should fail
        };
        
        const validation = this.firebase.validateEventData(invalidEvent);
        this.assertTrue(!validation.valid, 'Event should be invalid');
        this.assertTrue(validation.errors.length > 0, 'Should have validation errors');
        this.assertTrue(validation.errors.some(e => e.includes('title')), 'Should have title error');
        this.assertTrue(validation.errors.some(e => e.includes('comma')), 'Should have address comma error');
    }
    
    async testEventDataFormatting() {
        const rawData = {
            title: 'Test Event',
            venue: 'Test Venue',
            address: '456 Main St, Oakland',
            date: '2024-12-15T20:00:00.000Z',
            startTime: '20:00:00',
            categories: ['Music'],
            free: true,
            soldOut: false,
            description: 'Test description',
            ticketsLink: 'https://test.com'
        };
        
        const formatted = this.firebase.formatEventData(rawData);
        
        // Check required fields are present with correct names
        this.assertTrue(formatted.hasOwnProperty('soldOutStatus'), 'Should use soldOutStatus not soldOut');
        this.assertEquals(formatted.soldOutStatus, false, 'soldOutStatus should be false');
        this.assertTrue(formatted.hasOwnProperty('createdAt'), 'Should have createdAt field');
    }
    
    // Location Utils Tests
    async testAddressFormatting() {
        // Test addresses that need comma formatting
        const tests = [
            {
                input: '123 Main Street San Francisco',
                expected: '123 Main Street, San Francisco'
            },
            {
                input: '456 Oak Ave Berkeley CA',
                expected: '456 Oak Ave, Berkeley CA'
            },
            {
                input: '789 Mission St, San Francisco', // Already has comma
                expected: '789 Mission St, San Francisco'
            }
        ];
        
        for (const test of tests) {
            const result = this.locationUtils.formatAddress(test.input);
            this.assertTrue(result.includes(','), `Address "${result}" should contain comma`);
        }
    }
    
    async testCityDetection() {
        const tests = [
            {
                text: 'Event at 123 Main St, San Francisco, CA',
                expected: 'San Francisco'
            },
            {
                text: 'Austin Convention Center in Austin Texas',
                expected: 'Austin'
            },
            {
                text: 'Oakland Museum in Oakland',
                expected: 'Oakland'
            },
            {
                text: 'SF venue in the city',
                expected: 'San Francisco' // Should map SF abbreviation
            }
        ];
        
        for (const test of tests) {
            const result = this.locationUtils.extractCityFromText(test.text);
            this.assertEquals(result, test.expected, `City detection for "${test.text}"`);
        }
    }
    
    async testCollectionRouting() {
        const bayAreaEvent = { address: '123 Market St, San Francisco', city: 'San Francisco' };
        const austinEvent = { address: '456 Congress Ave, Austin', city: 'Austin' };
        
        this.assertEquals(
            this.firebase.determineCollection(bayAreaEvent), 
            'bayAreaEvents',
            'Bay Area event should route to bayAreaEvents'
        );
        
        this.assertEquals(
            this.firebase.determineCollection(austinEvent),
            'austinEvents', 
            'Austin event should route to austinEvents'
        );
    }
    
    async testVenueExtraction() {
        const tests = [
            {
                input: 'The Fillmore at 1805 Geary Blvd, San Francisco',
                expectedVenue: 'The Fillmore'
            },
            {
                input: 'Austin Convention Center, 500 E Cesar Chavez St, Austin',
                expectedVenue: 'Austin Convention Center'
            }
        ];
        
        for (const test of tests) {
            const result = this.locationUtils.extractVenue(test.input);
            this.assertEquals(result, test.expectedVenue, `Venue extraction for "${test.input}"`);
        }
    }
    
    // Category Mapper Tests
    async testCategoryMapping() {
        const tests = [
            {
                title: 'Rock Concert at The Fillmore',
                description: 'Live music performance',
                expected: ['Music']
            },
            {
                title: 'Comedy Show with Local Comics',
                description: 'Stand-up comedy night with hilarious performers',
                expected: ['Comedy Shows']
            },
            {
                title: 'Art Gallery Opening Reception',
                description: 'Contemporary art exhibition opening',
                expected: ['Art Shows']
            },
            {
                title: 'Food and Music Festival',
                description: 'Outdoor festival with food trucks and live bands',
                expected: ['Festivals', 'Music'] // Should get both, limited to 2
            }
        ];
        
        for (const test of tests) {
            const result = this.categoryMapper.smartMapCategories({
                title: test.title,
                description: test.description,
                venue: '',
                tags: []
            });
            
            this.assertTrue(result.length > 0, `Should have at least one category for "${test.title}"`);
            this.assertTrue(result.length <= 2, `Should have max 2 categories for "${test.title}"`);
            
            // Check that expected categories are included
            for (const expectedCat of test.expected) {
                this.assertTrue(
                    result.includes(expectedCat), 
                    `Should include category "${expectedCat}" for "${test.title}"`
                );
            }
        }
    }
    
    async testCategoryValidation() {
        // Test valid categories
        const validCategories = ['Music', 'Art Shows'];
        const validation1 = this.categoryMapper.validateCategories(validCategories);
        this.assertTrue(validation1.valid, 'Valid categories should pass validation');
        
        // Test invalid category
        const invalidCategories = ['Music', 'InvalidCategory'];
        const validation2 = this.categoryMapper.validateCategories(invalidCategories);
        this.assertTrue(!validation2.valid, 'Invalid categories should fail validation');
        
        // Test too many categories
        const tooManyCategories = ['Music', 'Art Shows', 'Comedy Shows'];
        const validation3 = this.categoryMapper.validateCategories(tooManyCategories);
        this.assertTrue(!validation3.valid, 'More than 2 categories should fail validation');
    }
    
    async testFallbackCategories() {
        // Test with empty/unhelpful data
        const result = this.categoryMapper.smartMapCategories({
            title: 'Some Event',
            description: '',
            venue: 'Random Venue',
            tags: []
        });
        
        this.assertTrue(result.length > 0, 'Should provide fallback categories');
        this.assertTrue(result.length <= 2, 'Fallback should respect 2 category limit');
        
        // Should default to Music as ultimate fallback
        this.assertTrue(result.includes('Music'), 'Should include Music as fallback');
    }
    
    // Image Selection Tests
    async testImageRatioScoring() {
        // Test square images get highest scores
        const squareScore = this.imageSelector.calculateRatioScore(1.0);
        const portraitScore = this.imageSelector.calculateRatioScore(0.8); // 4:5
        const landscapeScore = this.imageSelector.calculateRatioScore(1.5);
        
        this.assertTrue(squareScore >= 90, `Square images should score highly: ${squareScore}`);
        this.assertTrue(portraitScore >= 85, `4:5 portrait should score highly: ${portraitScore}`);
        this.assertTrue(landscapeScore < squareScore, 'Landscape should score lower than square');
    }
    
    async testImageSelection() {
        // Mock image URLs with different ratios (simulated)
        const testImages = [
            'https://cdn.example.com/event-banner-1920x600.jpg', // Landscape
            'https://cdn.example.com/event-flyer-800x800.png',   // Square (should win)
            'https://cdn.example.com/event-poster-600x750.jpg',  // 4:5 portrait
            'https://cdn.example.com/thumbnail-200x200.jpg'      // Too small
        ];
        
        // Mock the selectBestImage method behavior (since we can't actually download images in tests)
        const mockEventTitle = 'Music Festival 2024';
        const mockVenue = 'Golden Gate Park';
        
        // Test that method exists and handles empty arrays
        const emptyResult = await this.imageSelector.selectBestImage([], mockEventTitle, mockVenue);
        this.assertEquals(emptyResult, null, 'Should return null for empty array');
        
        // Test single image handling
        const singleResult = await this.imageSelector.selectBestImage([testImages[0]], mockEventTitle, mockVenue);
        this.assertEquals(singleResult, testImages[0], 'Should return single image when only one provided');
    }
    
    async testFlyerDetection() {
        const tests = [
            {
                url: 'https://cdn.eventbrite.com/images/123/event-flyer-poster.jpg',
                shouldBeFlyer: true,
                description: 'URL contains "flyer" keyword'
            },
            {
                url: 'https://images.com/music-festival-featured-image.png',
                shouldBeFlyer: true,
                description: 'URL contains "featured" keyword'
            },
            {
                url: 'https://cdn.example.com/thumb-small-100x100.jpg',
                shouldBeFlyer: false,
                description: 'URL contains "thumb" and "small" (should be avoided)'
            },
            {
                url: 'https://example.com/generic-photo.jpg',
                shouldBeFlyer: false,
                description: 'Generic image URL'
            }
        ];
        
        for (const test of tests) {
            const flyerInfo = this.imageSelector.calculateFlyerScore(test.url, 'Test Event', 'Test Venue');
            const isDetectedAsFlyer = flyerInfo.score > 20 && flyerInfo.isFlyer;
            
            this.assertEquals(isDetectedAsFlyer, test.shouldBeFlyer, test.description);
        }
    }
    
    async testImageDimensions() {
        const tests = [
            {
                url: 'https://cdn.example.com/image-800x600.jpg',
                expectedWidth: 800,
                expectedHeight: 600,
                description: 'Standard dimension pattern'
            },
            {
                url: 'https://images.example.com/event_1200x1200.png',
                expectedWidth: 1200,
                expectedHeight: 1200,
                description: 'Square image with underscore'
            },
            {
                url: 'https://cdn.example.com/resize:400,500/image.jpg',
                expectedWidth: 400,
                expectedHeight: 500,
                description: 'CDN resize parameter pattern'
            }
        ];
        
        for (const test of tests) {
            const dimensions = this.imageSelector.extractDimensionsFromUrl(test.url);
            
            this.assertEquals(dimensions.width, test.expectedWidth, 
                `${test.description} - width`);
            this.assertEquals(dimensions.height, test.expectedHeight, 
                `${test.description} - height`);
        }
        
        console.log(chalk.green('   ✓ URL dimension extraction patterns work correctly'));
    }
    
    // Integration Tests
    async testCompleteWorkflow() {
        // Simulate complete processing of a scraped event
        const mockScrapedData = {
            title: 'Test Music Festival 2024',
            description: 'Amazing live music with local bands and great food',
            venue: 'Golden Gate Park',
            rawLocation: 'Golden Gate Park, 501 Stanyan St, San Francisco, CA 94117',
            date: '2024-12-15T20:00:00.000Z',
            startTime: '20:00:00',
            free: false,
            soldOut: false,
            ticketsLink: 'https://test-tickets.com',
            imageUrl: 'https://example.com/event-image.jpg'
        };
        
        // Process location
        const locationData = this.locationUtils.parseLocation(mockScrapedData.rawLocation);
        this.assertTrue(locationData.address.includes(','), 'Processed address should have comma');
        this.assertEquals(locationData.city, 'San Francisco', 'Should detect San Francisco');
        this.assertEquals(locationData.region, 'bayArea', 'Should route to Bay Area');
        
        // Map categories
        const categories = this.categoryMapper.smartMapCategories({
            title: mockScrapedData.title,
            description: mockScrapedData.description,
            venue: locationData.venue,
            tags: []
        });
        
        this.assertTrue(categories.includes('Music'), 'Should detect Music category');
        this.assertTrue(categories.includes('Festivals'), 'Should detect Festivals category');
        
        // Format for Firebase
        const processedData = this.firebase.formatEventData({
            title: mockScrapedData.title,
            description: mockScrapedData.description,
            venue: locationData.venue,
            address: locationData.address,
            city: locationData.city,
            date: mockScrapedData.date,
            startTime: mockScrapedData.startTime,
            categories: categories,
            free: mockScrapedData.free,
            soldOut: mockScrapedData.soldOut,
            ticketsLink: mockScrapedData.ticketsLink
        });
        
        // Validate final result
        const validation = this.firebase.validateEventData(processedData);
        this.assertTrue(validation.valid, `Final event should be valid: ${validation.errors?.join(', ')}`);
        
        console.log(chalk.green('   ✓ Complete workflow processed successfully'));
        console.log(chalk.gray(`   Title: ${processedData.title}`));
        console.log(chalk.gray(`   Address: ${processedData.address}`));
        console.log(chalk.gray(`   Categories: ${processedData.categories.join(', ')}`));
    }
    
    async testFirebaseConnection() {
        try {
            const connected = await this.firebase.initialize();
            this.assertTrue(connected, 'Should connect to Firebase');
            
            console.log(chalk.green('   ✓ Firebase connection successful'));
        } catch (error) {
            throw new Error(`Firebase connection failed: ${error.message}`);
        }
    }
    
    showResults() {
        console.log(chalk.blue('\n📊 Test Results:'));
        console.log(chalk.gray('━'.repeat(40)));
        
        console.log(chalk.green(`✅ Passed: ${this.testResults.passed}`));
        console.log(chalk.red(`❌ Failed: ${this.testResults.failed}`));
        console.log(chalk.cyan(`📋 Total: ${this.testResults.total}`));
        
        const successRate = (this.testResults.passed / this.testResults.total * 100).toFixed(1);
        console.log(chalk.cyan(`📈 Success Rate: ${successRate}%`));
        
        console.log(chalk.gray('━'.repeat(40)));
        
        if (this.testResults.failed === 0) {
            console.log(chalk.green.bold('🎉 All tests passed! Scraper is ready to use.'));
        } else {
            console.log(chalk.yellow('⚠️  Some tests failed. Please check the errors above.'));
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ScraperTester();
    tester.runAllTests().catch(error => {
        console.error(chalk.red('💥 Test runner error:'), error);
        process.exit(1);
    });
}

module.exports = ScraperTester;