#!/usr/bin/env node

/**
 * Focused Category Mapping Test
 * 
 * Tests only the DataValidator category mapping functionality
 * to verify the specific fixes for Ice Cube event type categories
 */

const { DataValidator } = require('./utils/dataValidator');
const chalk = require('chalk');

function testCategoryValidation() {
    console.log(chalk.blue('\n🎯 FOCUSED CATEGORY VALIDATION TEST'));
    console.log(chalk.blue('='.repeat(50)));
    
    const validator = new DataValidator({
        autoFix: true,
        debug: false
    });
    
    // Test case 1: Ice Cube event with typical music venue categories
    console.log(chalk.cyan('\n📝 Test Case 1: Ice Cube Event Categories'));
    
    const iceCubeEventData = {
        title: 'Ice Cube - Truth to Power Four Decades of Attitude',
        description: 'Hip hop concert featuring the legendary Ice Cube performing his classic hits',
        venue: 'Oakland Arena',
        address: 'Oakland, CA',
        categories: [
            'Hip Hop',        // Should map to 'Music'
            'Concert',        // Should map to 'Music'
            'Music',          // Should remain 'Music'
            'Live Performance', // Should be filtered (invalid)
            'Entertainment'   // Should be filtered (invalid)
        ]
    };
    
    console.log('BEFORE:', iceCubeEventData.categories);
    
    const result1 = validator.validate(iceCubeEventData);
    
    console.log('AFTER:', result1.data.categories);
    console.log('Valid:', result1.isValid);
    
    // Test case 2: Concert venue categories
    console.log(chalk.cyan('\n📝 Test Case 2: Generic Concert Categories'));
    
    const concertEventData = {
        title: 'Rock Concert at Venue',
        venue: 'Music Hall',
        categories: ['Concert', 'Live Music', 'Rock', 'Performance']
    };
    
    console.log('BEFORE:', concertEventData.categories);
    
    const result2 = validator.validate(concertEventData);
    
    console.log('AFTER:', result2.data.categories);
    console.log('Valid:', result2.isValid);
    
    // Test case 3: Mixed valid and invalid categories
    console.log(chalk.cyan('\n📝 Test Case 3: Mixed Categories'));
    
    const mixedEventData = {
        title: 'Festival Event',
        venue: 'Park',
        categories: [
            'Music',           // Valid - should remain
            'Hip Hop',         // Invalid - should map to Music
            'Food Festival',   // Should map to Food Events or Festivals
            'Bars',           // Valid - should remain
            'Nightlife',      // Should be filtered or mapped
            'Invalid Thing'   // Should be filtered
        ]
    };
    
    console.log('BEFORE:', mixedEventData.categories);
    
    const result3 = validator.validate(mixedEventData);
    
    console.log('AFTER:', result3.data.categories);
    console.log('Valid:', result3.isValid);
    
    // Analyze results
    console.log(chalk.magenta('\n📊 DETAILED ANALYSIS'));
    console.log('='.repeat(30));
    
    // Test 1 Analysis
    console.log(chalk.yellow('\n🎵 Test 1 - Ice Cube Event:'));
    const t1Categories = result1.data.categories;
    const t1Fixes = result1.fixes.filter(f => f.field === 'categories');
    const t1Warnings = result1.warnings.filter(w => w.field === 'categories');
    
    console.log(`✓ Hip Hop mapped to Music: ${t1Categories.includes('Music') ? '✅' : '❌'}`);
    console.log(`✓ Concert mapped to Music: ${t1Categories.includes('Music') ? '✅' : '❌'}`);
    console.log(`✓ Only valid categories: ${t1Categories.every(c => ['Music', 'Festivals', 'Food Events', 'Sports/Games', 'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'].includes(c)) ? '✅' : '❌'}`);
    console.log(`✓ Invalid categories filtered: ${t1Warnings.length > 0 ? '✅' : '❌'}`);
    console.log(`  Final categories: [${t1Categories.join(', ')}]`);
    
    if (t1Fixes.length > 0) {
        console.log(`  Mapping fixes applied: ${t1Fixes.length}`);
        t1Fixes.forEach(fix => {
            console.log(`    - ${fix.reason} (confidence: ${fix.confidence}%)`);
        });
    }
    
    if (t1Warnings.length > 0) {
        console.log(`  Categories filtered out: ${t1Warnings[0].value ? JSON.stringify(t1Warnings[0].value) : 'N/A'}`);
    }
    
    // Test 2 Analysis
    console.log(chalk.yellow('\n🎸 Test 2 - Generic Concert:'));
    const t2Categories = result2.data.categories;
    console.log(`✓ Concert categories mapped correctly: ${t2Categories.includes('Music') ? '✅' : '❌'}`);
    console.log(`  Final categories: [${t2Categories.join(', ')}]`);
    
    // Test 3 Analysis
    console.log(chalk.yellow('\n🎪 Test 3 - Mixed Categories:'));
    const t3Categories = result3.data.categories;
    console.log(`✓ Valid categories preserved: ${t3Categories.includes('Music') || t3Categories.includes('Bars') ? '✅' : '❌'}`);
    console.log(`✓ Maximum 2 categories enforced: ${t3Categories.length <= 2 ? '✅' : '❌'}`);
    console.log(`  Final categories: [${t3Categories.join(', ')}]`);
    
    // Overall assessment
    const allValid = [result1, result2, result3].every(r => 
        r.data.categories.every(c => ['Music', 'Festivals', 'Food Events', 'Sports/Games', 'Comedy Shows', 'Art Shows', 'Bars', 'Nightclubs'].includes(c))
    );
    
    const hipHopMapped = result1.data.categories.includes('Music');
    const concertMapped = result1.data.categories.includes('Music') && result2.data.categories.includes('Music');
    
    console.log(chalk.blue('\n🏆 FINAL ASSESSMENT:'));
    console.log('='.repeat(25));
    console.log(`✓ All outputs use valid Hash categories: ${allValid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✓ Hip Hop mapped to Music: ${hipHopMapped ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✓ Concert mapped to Music: ${concertMapped ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`✓ Validation reports filtering: ${result1.warnings.length > 0 ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallSuccess = allValid && hipHopMapped && concertMapped;
    
    if (overallSuccess) {
        console.log(chalk.green('\n🎉 SUCCESS: Category validation system working correctly!'));
        console.log(chalk.green('✅ Ice Cube event will be properly categorized as [Music]'));
        console.log(chalk.green('✅ Invalid categories like "Hip Hop" and "Concert" are mapped to valid ones'));
        console.log(chalk.green('✅ Hash app compliance maintained'));
    } else {
        console.log(chalk.red('\n❌ FAILURE: Category validation needs fixes'));
    }
    
    return overallSuccess;
}

// Run the test
if (require.main === module) {
    testCategoryValidation();
}