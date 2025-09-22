#!/usr/bin/env node

/**
 * Debug script for Tixr extraction issue
 * This will help us identify where the data is being lost
 */

const { chromium } = require('playwright');
const UniversalExtractor = require('./utils/universalExtractor');
const chalk = require('chalk');

async function debugTixrExtraction() {
    const testUrl = 'https://www.tixr.com/groups/publicsf/events/salute-presents-infinite-passion-153859?utm_source=publicsf&utm_medium=venuewebsite';
    
    console.log(chalk.blue('\n🔧 DEBUG: Universal Extraction Data Flow'));
    console.log(chalk.blue('=' .repeat(60)));

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log(chalk.cyan('🌐 Navigating to page...'));
        await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(5000);

        console.log(chalk.cyan('🔬 Testing Universal Extractor directly...'));
        
        // Create extractor with debug options
        const extractor = new UniversalExtractor(page, {
            debug: true,
            verbose: true,
            minConfidence: 50,
            enabledLayers: [1, 2, 3, 4, 5]
        });

        // Extract data
        const result = await extractor.extract();
        
        console.log(chalk.green('\n✅ RAW EXTRACTION RESULT:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        console.log(chalk.yellow('🔍 Result structure:'));
        console.log(`  - data: ${typeof result.data} (${Object.keys(result.data || {}).length} keys)`);
        console.log(`  - confidence: ${typeof result.confidence} (${Object.keys(result.confidence || {}).length} keys)`);
        console.log(`  - layerResults: ${typeof result.layerResults} (${Object.keys(result.layerResults || {}).length} layers)`);
        console.log(`  - metadata: ${typeof result.metadata}`);

        if (result.data && Object.keys(result.data).length > 0) {
            console.log(chalk.green('\n📊 EXTRACTED DATA:'));
            console.log(chalk.gray('─'.repeat(40)));
            
            for (const [key, value] of Object.entries(result.data)) {
                const valueStr = typeof value === 'string' ? 
                    (value.length > 80 ? value.substring(0, 80) + '...' : value) :
                    JSON.stringify(value);
                    
                console.log(chalk.cyan(`  ${key}: ${valueStr}`));
            }
        } else {
            console.log(chalk.red('\n❌ NO DATA EXTRACTED'));
        }

        if (result.confidence && Object.keys(result.confidence).length > 0) {
            console.log(chalk.green('\n📈 CONFIDENCE SCORES:'));
            console.log(chalk.gray('─'.repeat(40)));
            
            for (const [key, score] of Object.entries(result.confidence)) {
                const color = score >= 80 ? chalk.green : score >= 60 ? chalk.yellow : chalk.red;
                console.log(color(`  ${key}: ${score}%`));
            }
        } else {
            console.log(chalk.red('\n❌ NO CONFIDENCE SCORES'));
        }

        // Test individual layers
        console.log(chalk.blue('\n🔬 TESTING INDIVIDUAL LAYERS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        for (let layerNum = 1; layerNum <= 5; layerNum++) {
            if (result.layerResults[layerNum]) {
                const layerResult = result.layerResults[layerNum];
                console.log(chalk.cyan(`\nLayer ${layerNum}:`));
                console.log(`  - Data keys: ${Object.keys(layerResult.data || {}).join(', ')}`);
                console.log(`  - Error: ${layerResult.error || 'None'}`);
                
                if (layerResult.data && Object.keys(layerResult.data).length > 0) {
                    console.log(chalk.green(`  ✅ Layer ${layerNum} extracted data successfully`));
                } else {
                    console.log(chalk.red(`  ❌ Layer ${layerNum} extracted no data`));
                }
            }
        }

        // Test JSON-LD specifically (since it seems to work)
        console.log(chalk.blue('\n🧪 TESTING JSON-LD DIRECTLY:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
        console.log(`Found ${jsonLdScripts.length} JSON-LD scripts`);
        
        for (let i = 0; i < jsonLdScripts.length; i++) {
            const script = jsonLdScripts[i];
            const content = await script.textContent();
            
            if (content) {
                console.log(chalk.cyan(`\nScript ${i + 1} (${content.length} chars):`));
                
                try {
                    const jsonData = JSON.parse(content);
                    console.log(`  @type: ${Array.isArray(jsonData) ? jsonData.map(item => item['@type']).join(', ') : jsonData['@type']}`);
                    
                    // Look for event data
                    let eventData = null;
                    if (Array.isArray(jsonData)) {
                        eventData = jsonData.find(item => 
                            item['@type'] === 'SocialEvent' || 
                            item['@type'] === 'Event' ||
                            item['@type'] === 'EventSeries'
                        );
                    } else if (jsonData['@type'] === 'SocialEvent' || jsonData['@type'] === 'Event') {
                        eventData = jsonData;
                    }
                    
                    if (eventData) {
                        console.log(chalk.green(`  ✅ Found event data with @type: ${eventData['@type']}`));
                        console.log(`  Title: ${eventData.name}`);
                        console.log(`  Start: ${eventData.startDate}`);
                        console.log(`  Location: ${eventData.location?.name || 'N/A'}`);
                        console.log(`  Address: ${eventData.location?.address || 'N/A'}`);
                        console.log(`  Description: ${eventData.description ? eventData.description.substring(0, 100) + '...' : 'N/A'}`);
                    } else {
                        console.log(chalk.yellow(`  ⚠️  No event data found in this script`));
                    }
                    
                } catch (error) {
                    console.log(chalk.red(`  ❌ JSON parsing failed: ${error.message}`));
                }
            } else {
                console.log(chalk.yellow(`  ⚠️  Script ${i + 1} has no content`));
            }
        }

    } catch (error) {
        console.error(chalk.red('❌ Debug failed:'), error.message);
        if (error.stack) {
            console.error(chalk.gray(error.stack));
        }
    } finally {
        await browser.close();
    }
}

// Run debug
debugTixrExtraction().catch(console.error);