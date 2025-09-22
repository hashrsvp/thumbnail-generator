#!/usr/bin/env node

/**
 * Execute Mad Oak Bar OCR Force Test
 * 
 * Simple execution script that runs the Mad Oak Bar OCR force test
 * to test if OCR can extract target text when traditional methods fail.
 * 
 * Target texts to find:
 * - "TRIVIA NIGHT"
 * - "Tuesday September 2nd" 
 * - "07:00 PM - 09:00 PM"
 * - "KARAOKE WEDNESDAY"
 * - "Wednesday September 3rd"
 * - "07:00 PM - 10:00 PM"
 */

const chalk = require('chalk');

async function runTest() {
    console.log(chalk.blue.bold('\n🧪 EXECUTING MAD OAK BAR OCR FORCE TEST'));
    console.log(chalk.blue('==========================================\n'));
    
    try {
        // Import and run the test
        const MadOakOcrForceTest = require('./test-mad-oak-ocr-force');
        const test = new MadOakOcrForceTest();
        
        console.log(chalk.yellow('🚀 Starting OCR force test with 95% threshold...'));
        console.log(chalk.blue('This will force OCR to run regardless of traditional extraction confidence.\n'));
        
        await test.run();
        
        console.log(chalk.green.bold('\n✅ Test execution completed!'));
        console.log(chalk.blue('Check the generated files for detailed results:'));
        console.log(chalk.gray('- mad-oak-ocr-force-test-*.json (detailed results)'));
        console.log(chalk.gray('- mad-oak-ocr-test-summary-*.md (summary report)'));
        console.log(chalk.gray('- mad-oak-ocr-test-screenshot.png (page screenshot)'));
        
    } catch (error) {
        console.error(chalk.red.bold('❌ Test execution failed:'), error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

runTest();