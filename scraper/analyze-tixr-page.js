#!/usr/bin/env node

/**
 * Analyze the Tixr page structure to understand what's available
 */

const { chromium } = require('playwright');
const chalk = require('chalk');

async function analyzeTixrPage() {
    const testUrl = 'https://www.tixr.com/groups/publicsf/events/salute-presents-infinite-passion-153859?utm_source=publicsf&utm_medium=venuewebsite';
    
    console.log(chalk.blue('\n🔍 ANALYZING TIXR PAGE STRUCTURE'));
    console.log(chalk.blue('=' .repeat(60)));

    const browser = await chromium.launch({ 
        headless: false,
        args: [
            '--no-sandbox', 
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security'
        ]
    });
    
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    try {
        console.log(chalk.cyan('🌐 Navigating to page...'));
        await page.goto(testUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
        });

        console.log(chalk.cyan('⏳ Waiting for dynamic content...'));
        await page.waitForTimeout(10000); // Wait longer for dynamic content

        // Check for JSON-LD scripts
        console.log(chalk.blue('\n📋 JSON-LD SCRIPTS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();
        console.log(`Found ${jsonLdScripts.length} JSON-LD script tags`);
        
        if (jsonLdScripts.length === 0) {
            console.log(chalk.yellow('⚠️  No JSON-LD found - checking all script tags...'));
            
            const allScripts = await page.locator('script').all();
            console.log(`Found ${allScripts.length} total script tags`);
            
            for (let i = 0; i < Math.min(allScripts.length, 10); i++) {
                const script = allScripts[i];
                const type = await script.getAttribute('type') || 'text/javascript';
                const src = await script.getAttribute('src') || 'inline';
                console.log(`  Script ${i + 1}: type="${type}", src="${src}"`);
            }
        }

        // Check for meta tags
        console.log(chalk.blue('\n📋 META TAGS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const metaTags = {
            'og:title': await page.getAttribute('meta[property="og:title"]', 'content'),
            'og:description': await page.getAttribute('meta[property="og:description"]', 'content'),
            'og:image': await page.getAttribute('meta[property="og:image"]', 'content'),
            'title': await page.textContent('title'),
            'description': await page.getAttribute('meta[name="description"]', 'content')
        };
        
        for (const [name, content] of Object.entries(metaTags)) {
            if (content) {
                const displayContent = content.length > 100 ? content.substring(0, 100) + '...' : content;
                console.log(chalk.green(`  ✅ ${name}: "${displayContent}"`));
            } else {
                console.log(chalk.red(`  ❌ ${name}: Not found`));
            }
        }

        // Check page structure
        console.log(chalk.blue('\n📋 PAGE STRUCTURE:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const structureElements = {
            'h1 tags': await page.locator('h1').count(),
            'h2 tags': await page.locator('h2').count(),
            'h3 tags': await page.locator('h3').count(),
            'images': await page.locator('img').count(),
            'time elements': await page.locator('time').count(),
            'address elements': await page.locator('address').count(),
            'elements with "event" class': await page.locator('[class*="event" i]').count(),
            'elements with "title" class': await page.locator('[class*="title" i]').count(),
            'elements with "date" class': await page.locator('[class*="date" i]').count(),
            'elements with "venue" class': await page.locator('[class*="venue" i]').count(),
        };
        
        for (const [element, count] of Object.entries(structureElements)) {
            console.log(`  ${element}: ${count}`);
        }

        // Check if page loaded properly
        console.log(chalk.blue('\n📋 PAGE LOADING STATUS:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const pageContent = await page.textContent('body');
        console.log(`  Body text length: ${pageContent ? pageContent.length : 0} characters`);
        
        if (pageContent && pageContent.length > 0) {
            console.log(chalk.green('  ✅ Page has content'));
            
            // Look for key terms
            const keyTerms = ['salute', 'infinite', 'passion', 'event', 'tickets', 'venue', 'date', 'time'];
            const foundTerms = keyTerms.filter(term => 
                pageContent.toLowerCase().includes(term.toLowerCase())
            );
            
            console.log(`  Found key terms: ${foundTerms.join(', ')}`);
        } else {
            console.log(chalk.red('  ❌ Page appears to be empty'));
        }

        // Try to extract basic information manually
        console.log(chalk.blue('\n📋 MANUAL EXTRACTION ATTEMPT:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        // Check for common title selectors
        const titleSelectors = ['h1', '[class*="title"]', '[class*="event"]', 'title'];
        for (const selector of titleSelectors) {
            try {
                const elements = await page.locator(selector).all();
                if (elements.length > 0) {
                    console.log(`  ${selector}: Found ${elements.length} elements`);
                    for (let i = 0; i < Math.min(elements.length, 3); i++) {
                        const text = await elements[i].textContent();
                        if (text && text.trim()) {
                            console.log(`    [${i + 1}] "${text.trim().substring(0, 80)}..."`);
                        }
                    }
                }
            } catch (e) {
                // Continue
            }
        }

        // Check for any form of date/time information
        console.log(chalk.blue('\n📋 DATE/TIME SEARCH:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const datePatterns = [
            /\b\d{4}-\d{2}-\d{2}/g,
            /\b\d{1,2}\/\d{1,2}\/\d{4}/g,
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
            /\b\d{1,2}:\d{2}\s*(AM|PM)/gi
        ];
        
        for (const pattern of datePatterns) {
            const matches = pageContent.match(pattern);
            if (matches && matches.length > 0) {
                console.log(`  Pattern ${pattern.toString()}: ${matches.slice(0, 5).join(', ')}`);
            }
        }

        // Check if there's a robot detection or loading issue
        console.log(chalk.blue('\n📋 ANTI-BOT DETECTION:'));
        console.log(chalk.gray('─'.repeat(40)));
        
        const antiBot = {
            'captcha': await page.locator('[class*="captcha" i], [id*="captcha" i]').count(),
            'cloudflare': pageContent.toLowerCase().includes('cloudflare'),
            'loading': pageContent.toLowerCase().includes('loading'),
            'javascript required': pageContent.toLowerCase().includes('javascript'),
            'cookies': pageContent.toLowerCase().includes('cookie')
        };
        
        for (const [check, result] of Object.entries(antiBot)) {
            if (result > 0 || result === true) {
                console.log(chalk.yellow(`  ⚠️  ${check}: ${result}`));
            } else {
                console.log(chalk.green(`  ✅ ${check}: OK`));
            }
        }

    } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error.message);
        console.error(chalk.gray(error.stack));
    } finally {
        await browser.close();
    }
}

// Run analysis
analyzeTixrPage().catch(console.error);