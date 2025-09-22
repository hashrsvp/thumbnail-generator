#!/usr/bin/env node

/**
 * Detailed Page Analysis for Debugging
 * 
 * Analyzes what's actually on the Eventbrite page to understand
 * why image extraction is failing.
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

async function analyzeEventbritePage() {
    const browser = await chromium.launch({
        headless: false, // Show browser
        args: [
            '--no-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security'
        ]
    });
    
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    
    try {
        const testUrl = 'https://www.eventbrite.com/e/celebrate-with-central-current-tickets-1306982733539';
        
        console.log(chalk.blue.bold('🔍 DETAILED EVENTBRITE PAGE ANALYSIS'));
        console.log(chalk.blue('━'.repeat(60)));
        console.log(chalk.cyan(`Analyzing: ${testUrl}`));
        
        // Navigate to page
        console.log(chalk.yellow('📡 Loading page...'));
        await page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });
        
        // Wait for JavaScript to load
        console.log(chalk.yellow('⏳ Waiting for JavaScript to load...'));
        await page.waitForTimeout(5000);
        
        // Try to wait for common eventbrite elements
        const waitSelectors = [
            'h1',
            'img',
            '[data-spec]',
            '.event',
            'main'
        ];
        
        for (const selector of waitSelectors) {
            try {
                await page.waitForSelector(selector, { timeout: 3000 });
                console.log(chalk.green(`✅ Found: ${selector}`));
                break;
            } catch (e) {
                console.log(chalk.yellow(`⏳ Waiting for: ${selector}`));
            }
        }
        
        // Additional wait for dynamic content
        await page.waitForTimeout(3000);
        
        console.log(chalk.blue('━'.repeat(60)));
        console.log(chalk.blue.bold('📊 PAGE ANALYSIS RESULTS:'));
        console.log(chalk.blue('━'.repeat(60)));
        
        // Check if page loaded properly
        const title = await page.title();
        const url = page.url();
        console.log(chalk.white(`Page Title: ${title}`));
        console.log(chalk.white(`Current URL: ${url}`));
        
        // Check for script tags
        const allScripts = await page.locator('script').count();
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').count();
        console.log(chalk.cyan(`Total script tags: ${allScripts}`));
        console.log(chalk.cyan(`JSON-LD scripts: ${jsonLdScripts}`));
        
        // Check for images
        const allImages = await page.locator('img').count();
        console.log(chalk.cyan(`Total img tags: ${allImages}`));
        
        if (allImages > 0) {
            console.log(chalk.green('\n🖼️  FOUND IMAGES! Analyzing...'));
            
            const images = await page.locator('img').all();
            for (let i = 0; i < Math.min(images.length, 10); i++) { // Limit to first 10
                const img = images[i];
                const src = await img.getAttribute('src');
                const alt = await img.getAttribute('alt');
                const className = await img.getAttribute('class');
                const dataSpecs = await img.getAttribute('data-spec');
                const testId = await img.getAttribute('data-testid');
                
                console.log(chalk.magenta(`\n[${i + 1}] Image Analysis:`));
                console.log(chalk.gray(`  src: "${src}"`));
                console.log(chalk.gray(`  alt: "${alt}"`));
                console.log(chalk.gray(`  class: "${className}"`));
                console.log(chalk.gray(`  data-spec: "${dataSpecs}"`));
                console.log(chalk.gray(`  data-testid: "${testId}"`));
            }
        } else {
            console.log(chalk.red('❌ NO IMAGES FOUND!'));
        }
        
        // Check JSON-LD data
        if (jsonLdScripts > 0) {
            console.log(chalk.green('\n📊 JSON-LD DATA FOUND! Analyzing...'));
            const scripts = await page.locator('script[type="application/ld+json"]').all();
            
            for (let i = 0; i < scripts.length; i++) {
                const content = await scripts[i].textContent();
                console.log(chalk.magenta(`\nJSON-LD Script ${i + 1}:`));
                console.log(chalk.gray(`Length: ${content.length} characters`));
                
                try {
                    const data = JSON.parse(content);
                    console.log(chalk.cyan(`Type: ${typeof data} ${Array.isArray(data) ? '(array)' : '(object)'}`));
                    
                    if (Array.isArray(data)) {
                        data.forEach((item, idx) => {
                            console.log(chalk.cyan(`  [${idx}] @type: ${item['@type']}`));
                        });
                    } else if (data['@type']) {
                        console.log(chalk.cyan(`  @type: ${data['@type']}`));
                    }
                    
                    // Look for image data
                    const findImages = (obj, path = '') => {
                        for (const [key, value] of Object.entries(obj)) {
                            if (key === 'image' || key === 'photo' || key === 'picture') {
                                console.log(chalk.green(`  🖼️  Found image at ${path}.${key}:`, value));
                            }
                            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                findImages(value, path + '.' + key);
                            }
                        }
                    };
                    
                    findImages(data);
                    
                } catch (parseError) {
                    console.log(chalk.red(`  Parse Error: ${parseError.message}`));
                }
            }
        }
        
        // Check meta tags
        console.log(chalk.blue('\n🏷️  META TAG ANALYSIS:'));
        const metaSelectors = [
            'meta[property="og:image"]',
            'meta[name="twitter:image"]',
            'meta[property="twitter:image"]',
            'meta[name="image"]'
        ];
        
        for (const selector of metaSelectors) {
            try {
                const content = await page.getAttribute(selector, 'content');
                if (content) {
                    console.log(chalk.green(`✅ ${selector}: ${content}`));
                } else {
                    console.log(chalk.yellow(`❌ ${selector}: not found`));
                }
            } catch (e) {
                console.log(chalk.yellow(`❌ ${selector}: error`));
            }
        }
        
        // Save page HTML for analysis
        const html = await page.content();
        const outputPath = path.join(__dirname, 'page-debug.html');
        fs.writeFileSync(outputPath, html);
        console.log(chalk.blue(`\n💾 Page HTML saved to: ${outputPath}`));
        
        // Check if this is an error/blocked page
        if (title.toLowerCase().includes('error') || 
            title.toLowerCase().includes('not found') ||
            title.toLowerCase().includes('access denied')) {
            console.log(chalk.red('\n🚫 POSSIBLE ERROR PAGE DETECTED!'));
            console.log(chalk.yellow('The page might be blocked, private, or removed.'));
        }
        
        console.log(chalk.blue('\n━'.repeat(60)));
        console.log(chalk.green('✅ Analysis complete!'));
        
    } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error.message);
    } finally {
        await browser.close();
    }
}

if (require.main === module) {
    analyzeEventbritePage().catch(console.error);
}

module.exports = { analyzeEventbritePage };