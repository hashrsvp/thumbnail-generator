#!/usr/bin/env node

/**
 * Category Validation Test for Ice Cube Oakland Arena Event
 * 
 * Tests the updated DataValidator category mapping system to ensure:
 * 1. Invalid categories like "Hip Hop" and "Concert" are filtered out
 * 2. Valid categories like "Music" are correctly mapped
 * 3. Validation system reports what was filtered/mapped
 * 4. Hash app compliance is maintained at 100%
 */

const EventScraper = require("./improved-event-scraper-2");
const { DataValidator } = require('./utils/dataValidator');
const chalk = require('chalk');

class CategoryValidationTest {
    constructor() {
        this.scraper = null;
        this.validator = new DataValidator({
            autoFix: true,
            debug: true
        });
    }

    async runTest() {
        console.log(chalk.blue('\n🧪 CATEGORY VALIDATION TEST'));
        console.log(chalk.blue('='.repeat(50)));
        
        const testUrl = 'https://www.theoaklandarena.com/events/detail/ice-cube-truth-to-power-four-decades-of-attitude';
        
        try {
            // Initialize scraper
            console.log(chalk.cyan('\n📝 Step 1: Initializing Event Scraper...'));
            this.scraper = new EventScraper({
                headless: true,
                debug: true,
                timeout: 30000
            });
            
            // Test the specific URL with scrapeGeneric method
            console.log(chalk.cyan(`\n📝 Step 2: Testing URL: ${testUrl}`));
            console.log(chalk.cyan('Using scrapeGeneric() method to extract event data...'));
            
            await this.scraper.initBrowser();
            await this.scraper.page.goto(testUrl, { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
            
            // Wait for content to load
            await this.scraper.page.waitForTimeout(3000);
            
            // Extract raw event data using scrapeGeneric
            const rawEventData = await this.scraper.scrapeGeneric();
            
            console.log(chalk.green('\n✅ Step 3: Raw Event Data Extracted'));
            console.log(chalk.gray('Raw data overview:'));
            console.log({
                title: rawEventData.title,
                categories: rawEventData.categories,
                venue: rawEventData.venue,
                hasValidationData: !!rawEventData._extraction
            });
            
            // Test category validation specifically
            console.log(chalk.cyan('\n📝 Step 4: Testing Category Validation System'));
            
            // Create test data with problematic categories that should be filtered
            const testEventData = {
                title: rawEventData.title || 'Ice Cube - Truth to Power',
                description: rawEventData.description || 'Hip hop concert featuring Ice Cube',
                venue: rawEventData.venue || 'Oakland Arena',
                categories: [
                    'Hip Hop',        // Should be mapped to 'Music'
                    'Concert',        // Should be mapped to 'Music'  
                    'Music',          // Should remain as 'Music'
                    'Invalid Category', // Should be filtered out
                    'Entertainment'   // Should be filtered out
                ],
                address: rawEventData.address || 'Oakland, CA'
            };
            
            console.log(chalk.yellow('\n⚠️  BEFORE VALIDATION:'));
            console.log('Categories:', testEventData.categories);
            
            // Run validation
            const validationResult = this.validator.validate(testEventData);
            
            console.log(chalk.green('\n✅ AFTER VALIDATION:'));
            console.log('Valid:', validationResult.isValid);
            console.log('Final Categories:', validationResult.data.categories);
            console.log('Confidence Score:', validationResult.confidenceScore + '%');
            
            // Check validation fixes and warnings
            console.log(chalk.cyan('\n📊 VALIDATION REPORT:'));
            console.log('Fixes Applied:', validationResult.fixes.length);
            console.log('Errors Found:', validationResult.errors.length);
            console.log('Warnings Found:', validationResult.warnings.length);
            
            // Detailed fixes analysis
            if (validationResult.fixes.length > 0) {
                console.log(chalk.blue('\n🔧 FIXES APPLIED:'));
                validationResult.fixes.forEach((fix, i) => {
                    console.log(`${i + 1}. ${fix.field}:`);
                    console.log(`   Before: ${JSON.stringify(fix.oldValue)}`);
                    console.log(`   After: ${JSON.stringify(fix.newValue)}`);
                    console.log(`   Reason: ${fix.reason}`);
                    console.log(`   Confidence: ${fix.confidence}%`);
                });
            }
            
            // Check warnings (for filtered categories)
            if (validationResult.warnings.length > 0) {
                console.log(chalk.yellow('\n⚠️  WARNINGS:'));
                validationResult.warnings.forEach((warning, i) => {
                    console.log(`${i + 1}. ${warning.field}: ${warning.message}`);
                    if (warning.value) {
                        console.log(`   Filtered: ${JSON.stringify(warning.value)}`);
                    }
                });
            }
            
            // Test results verification
            console.log(chalk.magenta('\n🧪 TEST RESULTS VERIFICATION:'));
            
            const finalCategories = validationResult.data.categories || [];
            const validHashCategories = ['Music', 'Festivals', 'Food Events', 'Sports/Games', 'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'];
            
            // Check 1: Only valid Hash categories
            const allCategoriesValid = finalCategories.every(cat => validHashCategories.includes(cat));
            console.log(`✓ All categories are valid Hash categories: ${allCategoriesValid ? '✅ PASS' : '❌ FAIL'}`);
            console.log(`  Final categories: [${finalCategories.join(', ')}]`);
            
            // Check 2: Hip Hop and Concert filtered out
            const hasInvalidCategories = finalCategories.includes('Hip Hop') || finalCategories.includes('Concert');
            console.log(`✓ Invalid categories filtered out: ${!hasInvalidCategories ? '✅ PASS' : '❌ FAIL'}`);
            
            // Check 3: Music category present (mapped correctly)
            const hasMusicCategory = finalCategories.includes('Music');
            console.log(`✓ Music category correctly mapped: ${hasMusicCategory ? '✅ PASS' : '❌ FAIL'}`);
            
            // Check 4: Validation reporting
            const hasValidationReporting = validationResult.fixes.length > 0 || validationResult.warnings.length > 0;
            console.log(`✓ Validation system reports changes: ${hasValidationReporting ? '✅ PASS' : '❌ FAIL'}`);
            
            // Check 5: Hash app compliance
            const isHashCompliant = validationResult.confidenceScore >= 70 && allCategoriesValid;
            console.log(`✓ Hash app compliance maintained: ${isHashCompliant ? '✅ PASS' : '❌ FAIL'}`);
            
            // Final test summary
            const allTestsPassed = allCategoriesValid && !hasInvalidCategories && hasMusicCategory && hasValidationReporting && isHashCompliant;
            
            console.log(chalk.blue('\n📋 FINAL TEST SUMMARY:'));
            console.log('='.repeat(30));
            if (allTestsPassed) {
                console.log(chalk.green('🎉 ALL TESTS PASSED! Category validation system is working correctly.'));
            } else {
                console.log(chalk.red('❌ Some tests failed. Category validation system needs attention.'));
            }
            
            console.log(`\nTest Results:`);
            console.log(`- Original categories: ${testEventData.categories.length} (${testEventData.categories.join(', ')})`);
            console.log(`- Final categories: ${finalCategories.length} (${finalCategories.join(', ')})`);
            console.log(`- Categories filtered/mapped: ${testEventData.categories.length - finalCategories.length + (validationResult.fixes.filter(f => f.field === 'categories').length)}`);
            console.log(`- Validation confidence: ${validationResult.confidenceScore}%`);
            console.log(`- Hash compliance: ${isHashCompliant ? '100%' : '<100%'}`);
            
        } catch (error) {
            console.error(chalk.red('\n❌ Test failed with error:'), error.message);
            if (this.scraper?.options?.debug) {
                console.error(chalk.red('Stack trace:'), error.stack);
            }
        } finally {
            if (this.scraper) {
                await this.scraper.closeBrowser();
            }
        }
    }
}

// Run the test
async function main() {
    const test = new CategoryValidationTest();
    await test.runTest();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = CategoryValidationTest;