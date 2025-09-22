#!/usr/bin/env node

/**
 * Venue Debug Tool
 * 
 * Interactive debugging tool for testing individual venues with
 * detailed extraction analysis and step-by-step output.
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const readline = require('readline');
const UniversalExtractor = require('../utils/universalExtractor');
const CategoryMapper = require('../utils/categoryMapper');

class VenueDebugger {
    constructor() {
        this.categoryMapper = new CategoryMapper();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    /**
     * Interactive venue debugging session
     */
    async startInteractiveSession() {
        console.log(chalk.blue.bold('🔍 Universal Scraper Venue Debugger'));
        console.log(chalk.blue.bold('=' .repeat(40)));
        console.log(chalk.gray('Enter venue URLs to test extraction in real-time\n'));
        
        const browser = await chromium.launch({ 
            headless: false, // Always show browser for debugging
            devtools: true   // Open dev tools
        });
        
        try {
            while (true) {
                const url = await this.promptForURL();
                
                if (url.toLowerCase() === 'quit' || url.toLowerCase() === 'exit') {
                    break;
                }
                
                if (url.trim()) {
                    await this.debugVenueURL(browser, url.trim());
                }
                
                console.log(chalk.blue('\n' + '-'.repeat(50) + '\n'));
            }
        } finally {
            await browser.close();
            this.rl.close();
        }
    }
    
    /**
     * Prompt user for venue URL
     */
    promptForURL() {
        return new Promise((resolve) => {
            this.rl.question(chalk.cyan('Enter venue URL (or "quit" to exit): '), resolve);
        });
    }
    
    /**
     * Debug specific venue URL with detailed analysis
     */
    async debugVenueURL(browser, url) {
        console.log(chalk.blue(`\n🏪 Debugging venue: ${url}`));
        console.log(chalk.gray('Opening in browser...'));
        
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        });
        
        try {
            const page = await context.newPage();
            
            // Navigate and wait for load
            console.log(chalk.yellow('📡 Loading page...'));
            const startTime = Date.now();
            
            await page.goto(url, { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            
            const loadTime = Date.now() - startTime;
            console.log(chalk.green(`✓ Page loaded in ${loadTime}ms`));
            
            // Wait for user to examine page
            await this.waitForUserReady();
            
            // Initialize extractor with debug mode
            const extractor = new UniversalExtractor(page, {
                debug: true,
                verbose: true,
                enforceHashRequirements: true
            });
            
            // Run extraction with detailed logging
            console.log(chalk.blue('\n🔄 Running extraction layers...\n'));
            const extractionResult = await extractor.extract();
            
            // Display detailed results
            this.displayExtractionResults(extractionResult);
            
            // Category analysis
            this.displayCategoryAnalysis(extractionResult.data);
            
            // Hash validation
            this.displayHashValidation(extractionResult.data);
            
            // Layer performance analysis
            this.displayLayerAnalysis(extractionResult.layerResults);
            
            // Allow user to inspect further
            await this.waitForUserReady('Press Enter to continue to next venue...');
            
        } catch (error) {
            console.error(chalk.red(`❌ Error debugging venue: ${error.message}`));
        } finally {
            await context.close();
        }
    }
    
    /**
     * Wait for user to press Enter
     */
    waitForUserReady(message = 'Press Enter when ready to start extraction...') {
        return new Promise((resolve) => {
            this.rl.question(chalk.cyan(message), resolve);
        });
    }
    
    /**
     * Display detailed extraction results
     */
    displayExtractionResults(result) {
        console.log(chalk.blue.bold('📊 Extraction Results'));
        console.log(chalk.blue('=' .repeat(30)));
        
        const data = result.data;
        const confidence = result.confidence;
        
        console.log(chalk.cyan('\n📝 Extracted Data:'));
        
        const fields = [
            'title', 'venue', 'address', 'date', 'startTime', 'endTime',
            'description', 'categories', 'imageUrl', 'price', 'free', 'ticketsLink'
        ];
        
        for (const field of fields) {
            const value = data[field];
            const conf = confidence[field] || 0;
            
            if (value !== undefined && value !== null && value !== '') {
                const confColor = conf >= 80 ? chalk.green : conf >= 60 ? chalk.yellow : chalk.red;
                const confText = confColor(`${Math.round(conf)}%`);
                
                let displayValue = value;
                if (typeof value === 'string' && value.length > 100) {
                    displayValue = value.substring(0, 100) + '...';
                } else if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value);
                }
                
                console.log(chalk.gray(`   ${field.padEnd(12)}: ${displayValue} [${confText}]`));
            }
        }
        
        // Overall confidence
        const overallConf = result.metadata.totalConfidence;
        const overallColor = overallConf >= 80 ? chalk.green : overallConf >= 60 ? chalk.yellow : chalk.red;
        console.log(chalk.cyan(`\n🎯 Overall Confidence: ${overallColor(`${overallConf}%`)}`));
    }
    
    /**
     * Display category analysis
     */
    displayCategoryAnalysis(data) {
        console.log(chalk.blue.bold('\n🏷️ Category Analysis'));
        console.log(chalk.blue('=' .repeat(25)));
        
        // Run category mapping
        const mappedCategories = this.categoryMapper.smartMapCategories({
            title: data.title || '',
            description: data.description || '',
            venue: data.venue || ''
        });
        
        console.log(chalk.cyan('📋 Mapped Categories:'));
        if (mappedCategories.length > 0) {
            mappedCategories.forEach(category => {
                const color = this.categoryMapper.getCategoryColor(category);
                console.log(chalk.gray(`   • ${category}`));
            });
        } else {
            console.log(chalk.red('   No categories mapped'));
        }
        
        // Show extracted categories vs mapped
        if (data.categories && Array.isArray(data.categories)) {
            console.log(chalk.cyan('\n📝 Extracted Categories:'));
            data.categories.forEach(category => {
                const isValid = this.categoryMapper.validateCategories([category]).valid;
                const icon = isValid ? '✅' : '❌';
                console.log(chalk.gray(`   ${icon} ${category}`));
            });
        }
    }
    
    /**
     * Display Hash app validation
     */
    displayHashValidation(data) {
        console.log(chalk.blue.bold('\n✅ Hash App Validation'));
        console.log(chalk.blue('=' .repeat(28)));
        
        const validations = [
            {
                field: 'title',
                required: true,
                test: () => data.title && data.title.length >= 3 && data.title.length <= 200,
                message: 'Title must be 3-200 characters'
            },
            {
                field: 'address',
                required: true,
                test: () => data.address && data.address.includes(','),
                message: 'Address must contain comma'
            },
            {
                field: 'date',
                required: true,
                test: () => {
                    if (!data.date) return false;
                    try {
                        const date = new Date(data.date);
                        return !isNaN(date.getTime());
                    } catch {
                        return false;
                    }
                },
                message: 'Date must be valid ISO format'
            },
            {
                field: 'startTime',
                required: false,
                test: () => !data.startTime || /^\d{2}:\d{2}:\d{2}$/.test(data.startTime),
                message: 'Time must be HH:mm:ss format'
            },
            {
                field: 'categories',
                required: true,
                test: () => {
                    if (!data.categories || !Array.isArray(data.categories)) return false;
                    return data.categories.length > 0 && data.categories.length <= 2;
                },
                message: 'Must have 1-2 valid categories'
            }
        ];
        
        let passed = 0;
        let total = 0;
        
        for (const validation of validations) {
            const result = validation.test();
            const icon = result ? '✅' : '❌';
            const status = result ? 'PASS' : 'FAIL';
            const statusColor = result ? chalk.green : chalk.red;
            
            console.log(`   ${icon} ${validation.field.padEnd(12)}: ${statusColor(status)}`);
            
            if (!result) {
                console.log(chalk.gray(`      → ${validation.message}`));
            }
            
            if (validation.required) {
                total++;
                if (result) passed++;
            }
        }
        
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        const passColor = passRate >= 90 ? chalk.green : passRate >= 70 ? chalk.yellow : chalk.red;
        
        console.log(chalk.cyan(`\n📊 Validation Score: ${passColor(`${passed}/${total} (${passRate}%)`)}`));
    }
    
    /**
     * Display layer analysis
     */
    displayLayerAnalysis(layerResults) {
        console.log(chalk.blue.bold('\n🔧 Layer Performance Analysis'));
        console.log(chalk.blue('=' .repeat(35)));
        
        const layerNames = {
            1: 'Structured Data (JSON-LD)',
            2: 'Meta Tags (OpenGraph)',
            3: 'Semantic HTML',
            4: 'Text Patterns',
            5: 'Content Analysis'
        };
        
        for (const [layerNum, result] of Object.entries(layerResults)) {
            const layerName = layerNames[layerNum] || `Layer ${layerNum}`;
            const fieldsCount = result.data ? Object.keys(result.data).length : 0;
            const hasError = result.error;
            
            let status, statusColor;
            if (hasError) {
                status = 'ERROR';
                statusColor = chalk.red;
            } else if (fieldsCount > 0) {
                status = `${fieldsCount} fields`;
                statusColor = chalk.green;
            } else {
                status = 'No data';
                statusColor = chalk.yellow;
            }
            
            console.log(`   ${layerNum}. ${layerName.padEnd(25)}: ${statusColor(status)}`);
            
            if (fieldsCount > 0 && result.data) {
                const fields = Object.keys(result.data).join(', ');
                console.log(chalk.gray(`      Fields: ${fields}`));
            }
            
            if (hasError) {
                console.log(chalk.gray(`      Error: ${result.error}`));
            }
        }
        
        // Summary
        const totalLayers = Object.keys(layerResults).length;
        const successfulLayers = Object.values(layerResults).filter(r => 
            !r.error && r.data && Object.keys(r.data).length > 0
        ).length;
        
        const successRate = Math.round((successfulLayers / totalLayers) * 100);
        const successColor = successRate >= 80 ? chalk.green : successRate >= 60 ? chalk.yellow : chalk.red;
        
        console.log(chalk.cyan(`\n📊 Layer Success Rate: ${successColor(`${successfulLayers}/${totalLayers} (${successRate}%)`)}`));
    }
    
    /**
     * Debug single URL from command line
     */
    async debugSingleURL(url) {
        console.log(chalk.blue.bold('🔍 Single URL Debug Mode'));
        console.log(chalk.blue('=' .repeat(30)));
        
        const browser = await chromium.launch({ 
            headless: false,
            devtools: true
        });
        
        try {
            await this.debugVenueURL(browser, url);
        } finally {
            await browser.close();
        }
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const url = args[0];
    
    const debugger = new VenueDebugger();
    
    async function main() {
        try {
            if (url) {
                // Single URL mode
                await debugger.debugSingleURL(url);
            } else {
                // Interactive mode
                await debugger.startInteractiveSession();
            }
        } catch (error) {
            console.error(chalk.red(`❌ Debug error: ${error.message}`));
            process.exit(1);
        }
    }
    
    // Display usage if no arguments
    if (!url && process.argv.length <= 2) {
        console.log(chalk.blue('🔍 Venue Debug Tool'));
        console.log(chalk.gray('Usage:'));
        console.log(chalk.gray('  node debugVenue.js                    # Interactive mode'));
        console.log(chalk.gray('  node debugVenue.js <url>              # Debug specific URL'));
        console.log(chalk.gray(''));
        console.log(chalk.gray('Examples:'));
        console.log(chalk.gray('  node debugVenue.js https://www.livenation.com/venue/KovZpZAE6eeA/the-fillmore-events'));
        console.log(chalk.gray('  node debugVenue.js                    # Then enter URLs interactively'));
        console.log(chalk.gray(''));
        console.log(chalk.yellow('This tool opens a browser window with dev tools for detailed inspection.'));
    }
    
    main();
}

module.exports = VenueDebugger;