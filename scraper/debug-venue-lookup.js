#!/usr/bin/env node

/**
 * Debug venue lookup to understand why Moody Amphitheater wasn't matched
 */

const AddressEnhancer = require('./utils/addressEnhancer');
const chalk = require('chalk');
const fs = require('fs');

async function debugVenueLookup() {
    console.log(chalk.blue('🔍 Debugging Venue Lookup for Moody Amphitheater\n'));

    const enhancer = new AddressEnhancer({ debug: true });
    
    // Check what venues we loaded
    const stats = enhancer.getStats();
    console.log(chalk.cyan(`Loaded ${stats.totalVenues} total venues:`));
    console.log(chalk.gray(`   Austin venues: ${stats.regions.austin || 0}`));
    console.log(chalk.gray(`   Bay Area venues: ${stats.regions.bayArea || 0}\n`));

    // Manually check the Austin venues file
    console.log(chalk.yellow('📄 Checking Austin venues file directly...'));
    
    try {
        const austinPath = '/Users/user/Desktop/hash/scripts/Venues/AustinVenues.txt';
        const content = fs.readFileSync(austinPath, 'utf-8');
        const lines = content.split('\n');
        
        console.log(chalk.gray('Looking for Moody Amphitheater entries:'));
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.toLowerCase().includes('moody')) {
                console.log(chalk.green(`Line ${i + 1}: "${line}"`));
                
                // Check next few lines for address
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine) {
                        console.log(chalk.blue(`Line ${j + 1}: "${nextLine}"`));
                        
                        // Check if this looks like an address
                        if (nextLine.includes('1401 Trinity')) {
                            console.log(chalk.green('   ✅ Found the correct address!'));
                        }
                    }
                }
                console.log('');
            }
        }
    } catch (error) {
        console.error(chalk.red('Error reading file:', error.message));
    }

    // Test different venue name variations
    console.log(chalk.yellow('🧪 Testing venue name variations...\n'));
    
    const testNames = [
        'Moody Amphitheater',
        'Moody Amphitheater at Waterloo Park',
        'moody amphitheater',
        'Moody',
        'amphitheater'
    ];

    for (const testName of testNames) {
        console.log(chalk.cyan(`Testing: "${testName}"`));
        
        const result = await enhancer.lookupKnownVenue(testName, 'Austin, TX');
        if (result) {
            console.log(chalk.green(`   ✅ Found: "${result}"`));
        } else {
            console.log(chalk.red(`   ❌ Not found`));
        }
        
        // Show the normalized name
        const normalized = enhancer.normalizeVenueName(testName);
        console.log(chalk.gray(`   Normalized: "${normalized}"\n`));
    }

    // Check what's actually in the venues map
    console.log(chalk.yellow('📋 Checking loaded venues for Austin...'));
    
    // This is a hack to access the private knownVenues map for debugging
    let foundMoody = false;
    for (const [key, venue] of enhancer.knownVenues.entries()) {
        if (venue.region === 'austin' || key.includes('moody') || venue.name.toLowerCase().includes('moody')) {
            console.log(chalk.green(`Found: "${key}" → "${venue.address}" (${venue.region})`));
            foundMoody = true;
        }
    }
    
    if (!foundMoody) {
        console.log(chalk.red('❌ Moody Amphitheater not found in loaded venues'));
        
        // Show first few Austin venues for comparison
        console.log(chalk.yellow('\nFirst few Austin venues in database:'));
        let count = 0;
        for (const [key, venue] of enhancer.knownVenues.entries()) {
            if (venue.region === 'austin' && count < 5) {
                console.log(chalk.gray(`   "${key}" → "${venue.address}"`));
                count++;
            }
        }
    }

    // Test the enhancement directly
    console.log(chalk.yellow('\n🔧 Testing direct address enhancement...'));
    
    const result = await enhancer.enhanceAddress(
        'Moody Amphitheater at Waterloo Park',
        'Moody Amphitheater',
        'Austin, TX'
    );
    
    console.log(chalk.cyan('Enhancement result:'), result);
}

debugVenueLookup().catch(console.error);