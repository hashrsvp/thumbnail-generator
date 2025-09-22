#!/usr/bin/env node

/**
 * Debug address parsing to understand why "1401 Trinity St, Austin, TX" isn't being recognized
 */

const AddressEnhancer = require('./utils/addressEnhancer');
const chalk = require('chalk');

async function debugAddressParsing() {
    console.log(chalk.blue('🔍 Debugging Address Parsing\n'));

    const enhancer = new AddressEnhancer({ debug: true });
    
    // Test the address detection logic
    const testAddresses = [
        '1401 Trinity St, Austin, TX',
        '1401 Trinity St Austin TX',
        '2015 E Riverside Dr, Austin, TX',
        '1805 Geary Blvd, San Francisco, CA 94115, United States',
        'Moody Amphitheater at Waterloo Park',
        'Austin, TX'
    ];

    console.log(chalk.yellow('🧪 Testing address detection logic...\n'));

    for (const addr of testAddresses) {
        console.log(chalk.cyan(`Testing: "${addr}"`));
        
        const looksLikeAddress = enhancer.looksLikeAddress(addr);
        console.log(chalk.green('  Looks like address:'), looksLikeAddress ? '✅ YES' : '❌ NO');
        
        // Break down the regex components
        const streetIndicators = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/i;
        const hasNumber = /\b\d+\b/;
        const isUrl = /^https?:\/\//i;
        const hasStateZip = /\b[A-Z]{2}\s*\d{5}/;
        
        console.log(chalk.gray('    Street indicators:'), streetIndicators.test(addr) ? '✅' : '❌');
        console.log(chalk.gray('    Has number:'), hasNumber.test(addr) ? '✅' : '❌');
        console.log(chalk.gray('    Is URL:'), isUrl.test(addr) ? '❌ (bad)' : '✅ (good)');
        console.log(chalk.gray('    Has state/zip:'), hasStateZip.test(addr) ? '✅' : '❌');
        console.log('');
    }

    // Test the specific case we care about
    console.log(chalk.yellow('📋 Testing specific Moody Amphitheater case...\n'));
    
    const moodyAddress = '1401 Trinity St, Austin, TX';
    console.log(chalk.cyan(`Moody address: "${moodyAddress}"`));
    
    // Test each component
    const streetIndicators = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/i;
    const hasNumber = /\b\d+\b/;
    const hasStateZip = /\b[A-Z]{2}\s*\d{5}/;
    const hasStateOnly = /\b[A-Z]{2}\b/;
    
    console.log(chalk.green('Street indicators match:'), streetIndicators.exec(moodyAddress));
    console.log(chalk.green('Number match:'), hasNumber.exec(moodyAddress));
    console.log(chalk.green('State/Zip match:'), hasStateZip.exec(moodyAddress));
    console.log(chalk.green('State only match:'), hasStateOnly.exec(moodyAddress));
    
    // Update the regex to be more flexible
    console.log(chalk.yellow('\n🔧 Testing improved address detection...\n'));
    
    const improvedHasStateZip = /\b[A-Z]{2}(\s*\d{5})?/;
    console.log(chalk.green('Improved state match:'), improvedHasStateZip.test(moodyAddress));
    
    // Test the full improved logic
    const improvedLooksLikeAddress = (line) => {
        const streetIndicators = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/i;
        const hasNumber = /\b\d+\b/;
        const isUrl = /^https?:\/\//i;
        const hasStateOrZip = /\b[A-Z]{2}(\s*\d{5})?/; // State with optional zip
        
        return streetIndicators.test(line) && 
               hasNumber.test(line) && 
               !isUrl.test(line) &&
               hasStateOrZip.test(line);
    };
    
    console.log(chalk.green('Improved detection for Moody:'), improvedLooksLikeAddress(moodyAddress) ? '✅ YES' : '❌ NO');
}

debugAddressParsing().catch(console.error);