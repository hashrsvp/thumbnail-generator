#!/usr/bin/env node

/**
 * Test Script for Smart Venue Extractor
 * 
 * Demonstrates the venue extraction capabilities with various input formats
 * and edge cases to validate the extraction algorithms.
 */

const VenueExtractor = require('./utils/venueExtractor');
const chalk = require('chalk');

// Test cases covering different scenarios
const testCases = [
    // Pattern-based extraction
    "Concert at The Fillmore, 1805 Geary Blvd, San Francisco, CA",
    "@ Warfield Theater, 982 Market Street, San Francisco",
    "Held at Oracle Park, 24 Willie Mays Plaza, San Francisco, CA",
    "Takes place at Austin City Limits Music Festival, Zilker Park, Austin, TX",
    
    // Keyword-based extraction
    "Blue Note Jazz Club, 131 West 3rd Street, New York, NY",
    "The Greek Theatre Berkeley, 2001 Gayley Road, Berkeley, CA",
    "Stubbs Bar-B-Q, 801 Red River St, Austin, TX",
    "Museum of Modern Art, 11 West 53rd Street, New York",
    
    // Structure-based extraction (comma separation)
    "Castro Theatre, 429 Castro Street, San Francisco, CA 94114",
    "Amoeba Music, 1855 Haight St, San Francisco",
    "The Independent, 628 Divisadero Street, San Francisco, California",
    
    // Context-based extraction (city detection)
    "Golden Gate Park Shakespeare Garden San Francisco CA",
    "Lady Bird Lake Austin Texas",
    "Brooklyn Museum New York NY",
    
    // Edge cases
    "1234 Market Street, San Francisco, CA", // Address only
    "The Masonic San Francisco", // Venue only
    "Event at TBA", // To Be Announced
    "Online Event", // Virtual event
    "Private Residence, Austin, TX", // Private venue
    "Various Locations, San Francisco Bay Area", // Multiple locations
    
    // Complex cases
    "Live music at The Chapel, 777 Valencia Street, in the Mission District, San Francisco, CA",
    "Art exhibition held at de Young Museum located in Golden Gate Park, San Francisco",
    "Food festival @ Pier 39, Fisherman's Wharf, San Francisco, California 94133",
    
    // International formats (for future expansion)
    "Royal Albert Hall, Kensington Gore, London, UK",
    "Sydney Opera House, Bennelong Point, Sydney NSW, Australia"
];

function runTests() {
    console.log(chalk.bold.cyan('\n🎯 Smart Venue Extractor Test Suite'));
    console.log(chalk.gray('='.repeat(60)));
    
    const extractor = new VenueExtractor();
    const results = [];
    
    testCases.forEach((testCase, index) => {
        console.log(chalk.yellow(`\nTest ${index + 1}/${testCases.length}:`));
        console.log(chalk.gray(`Input: "${testCase}"`));
        
        const result = extractor.extractVenueAndAddress(testCase, { debug: false });
        results.push(result);
        
        // Display results with color coding based on confidence
        const confidenceColor = result.confidence >= 0.7 ? 'green' : 
                               result.confidence >= 0.5 ? 'yellow' : 'red';
        
        console.log(chalk.green(`📍 Venue: "${result.venue}"`));
        console.log(chalk.blue(`🏠 Address: "${result.address}"`));
        console.log(chalk[confidenceColor](`🎯 Confidence: ${result.confidence} (${result.strategy})`));
        
        // Validate address format
        if (result.address && !result.address.includes(',')) {
            console.log(chalk.red('⚠️  Warning: Address missing required comma'));
        } else if (result.address) {
            console.log(chalk.green('✅ Address format valid'));
        }
    });
    
    // Display overall statistics
    console.log(chalk.bold.cyan('\n📊 Test Results Summary'));
    console.log(chalk.gray('='.repeat(60)));
    
    const stats = extractor.getStats(results);
    console.log(chalk.white(`Total Tests: ${stats.totalResults}`));
    console.log(chalk.green(`Venues Found: ${stats.venuesFound} (${stats.venueSuccessRate}%)`));
    console.log(chalk.blue(`Addresses Found: ${stats.addressesFound} (${stats.addressSuccessRate}%)`));
    console.log(chalk.yellow(`Average Confidence: ${stats.avgConfidence}`));
    
    console.log(chalk.cyan('\nStrategy Usage:'));
    Object.entries(stats.strategies).forEach(([strategy, count]) => {
        const percentage = Math.round((count / stats.totalResults) * 100);
        console.log(chalk.white(`  ${strategy}: ${count} (${percentage}%)`));
    });
    
    // Highlight problematic cases
    const lowConfidenceResults = results.filter(r => r.confidence < 0.5);
    if (lowConfidenceResults.length > 0) {
        console.log(chalk.red(`\n⚠️  ${lowConfidenceResults.length} results with low confidence (<0.5)`));
    }
    
    const noAddressResults = results.filter(r => !r.address || !r.address.includes(','));
    if (noAddressResults.length > 0) {
        console.log(chalk.red(`⚠️  ${noAddressResults.length} results with invalid address format`));
    }
    
    console.log(chalk.green('\n✅ Test suite completed!'));
}

// Interactive mode for testing custom inputs
function interactiveMode() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const extractor = new VenueExtractor();
    
    console.log(chalk.bold.cyan('\n🎯 Interactive Venue Extraction Mode'));
    console.log(chalk.gray('Enter location text to extract venue and address (type "exit" to quit)'));
    
    function promptUser() {
        rl.question(chalk.yellow('\nEnter location: '), (input) => {
            if (input.toLowerCase() === 'exit') {
                console.log(chalk.green('Goodbye!'));
                rl.close();
                return;
            }
            
            if (input.trim()) {
                const result = extractor.extractVenueAndAddress(input, { debug: true });
                console.log(chalk.gray('-'.repeat(50)));
            }
            
            promptUser();
        });
    }
    
    promptUser();
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
        interactiveMode();
    } else {
        runTests();
        
        if (args.includes('--interactive-after') || args.includes('-ia')) {
            setTimeout(interactiveMode, 1000);
        }
    }
}

module.exports = { testCases };