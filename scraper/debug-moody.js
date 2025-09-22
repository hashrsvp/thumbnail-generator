#!/usr/bin/env node

/**
 * Debug script for Moody Amphitheater extraction
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');

async function debugMoodyAmphitheater() {
    console.log(chalk.blue('🔍 Debugging Moody Amphitheater - Pixies 2025'));
    console.log(chalk.gray('URL: https://www.moodyamphitheater.com/events/pixies-2025\n'));

    const scraper = new EventScraper({ 
        headless: false, // Show browser
        timeout: 20000,
        debug: true
    });

    try {
        await scraper.initBrowser();
        
        // Navigate to the page
        await scraper.page.goto('https://www.moodyamphitheater.com/events/pixies-2025', {
            waitUntil: 'domcontentloaded',
            timeout: 20000
        });

        console.log(chalk.cyan('📄 Page loaded, analyzing content...'));

        // Wait for dynamic content to load
        await scraper.page.waitForTimeout(5000);

        // Extract page title and basic info
        const pageTitle = await scraper.page.title();
        console.log(chalk.green('Page Title:'), pageTitle);

        // Check for JSON-LD structured data
        console.log(chalk.yellow('\n🔍 Looking for structured data...'));
        const jsonLdScripts = await scraper.page.locator('script[type="application/ld+json"]').all();
        console.log(`Found ${jsonLdScripts.length} JSON-LD script tags`);

        for (let i = 0; i < jsonLdScripts.length; i++) {
            const content = await jsonLdScripts[i].textContent();
            if (content) {
                try {
                    const data = JSON.parse(content);
                    console.log(chalk.cyan(`JSON-LD Script ${i + 1}:`), JSON.stringify(data, null, 2));
                } catch (e) {
                    console.log(chalk.red(`JSON-LD Script ${i + 1} parse error:`, e.message));
                }
            }
        }

        // Check meta tags
        console.log(chalk.yellow('\n🏷️  Checking meta tags...'));
        const metaTags = [
            'meta[property="og:title"]',
            'meta[property="og:description"]', 
            'meta[property="og:image"]',
            'meta[name="twitter:title"]',
            'meta[name="twitter:description"]',
            'title'
        ];

        for (const selector of metaTags) {
            try {
                const content = await scraper.page.getAttribute(selector, 'content') || 
                               await scraper.page.textContent(selector);
                if (content) {
                    console.log(chalk.green(`${selector}:`), content);
                }
            } catch (e) {
                // Tag doesn't exist, continue
            }
        }

        // Look for common event selectors
        console.log(chalk.yellow('\n🎯 Looking for event-specific elements...'));
        const eventSelectors = [
            'h1',
            '.event-title', 
            '.event-name',
            '[data-testid*="title"]',
            '[data-testid*="event"]',
            '.title',
            'h2'
        ];

        for (const selector of eventSelectors) {
            try {
                const element = await scraper.page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    const text = await element.textContent();
                    if (text && text.trim()) {
                        console.log(chalk.green(`${selector}:`), text.trim());
                    }
                }
            } catch (e) {
                // Selector doesn't exist or isn't visible
            }
        }

        // Check for date/time information
        console.log(chalk.yellow('\n📅 Looking for date/time elements...'));
        const dateSelectors = [
            'time',
            '.date',
            '.event-date',
            '[datetime]',
            '[data-testid*="date"]',
            '[data-testid*="time"]'
        ];

        for (const selector of dateSelectors) {
            try {
                const elements = await scraper.page.locator(selector).all();
                for (let i = 0; i < elements.length; i++) {
                    const text = await elements[i].textContent();
                    const datetime = await elements[i].getAttribute('datetime');
                    if (text && text.trim()) {
                        console.log(chalk.green(`${selector} [${i}]:`), text.trim());
                        if (datetime) {
                            console.log(chalk.blue(`  datetime attribute:`), datetime);
                        }
                    }
                }
            } catch (e) {
                // Continue
            }
        }

        // Look for venue information
        console.log(chalk.yellow('\n🏢 Looking for venue information...'));
        const venueSelectors = [
            '.venue',
            '.venue-name',
            '.location',
            '[data-testid*="venue"]',
            '[data-testid*="location"]'
        ];

        for (const selector of venueSelectors) {
            try {
                const element = await scraper.page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    const text = await element.textContent();
                    if (text && text.trim()) {
                        console.log(chalk.green(`${selector}:`), text.trim());
                    }
                }
            } catch (e) {
                // Continue
            }
        }

        // Extract all text content for pattern analysis
        console.log(chalk.yellow('\n📝 Analyzing page text for patterns...'));
        const bodyText = await scraper.page.textContent('body');
        
        // Look for date patterns
        const datePatterns = [
            /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
            /\b\d{1,2}\/\d{1,2}\/\d{4}/g,
            /\b\d{4}-\d{2}-\d{2}/g,
            /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*,?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}/gi
        ];

        console.log(chalk.cyan('Found date patterns:'));
        datePatterns.forEach((pattern, i) => {
            const matches = bodyText.match(pattern);
            if (matches && matches.length > 0) {
                console.log(chalk.green(`Pattern ${i + 1}:`), matches.slice(0, 3).join(', '));
            }
        });

        // Look for time patterns  
        const timePatterns = [
            /\b\d{1,2}:\d{2}\s*(?:AM|PM)/gi,
            /\b\d{1,2}\s*(?:AM|PM)/gi,
            /\bdoors?\s*:?\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?/gi,
            /\bshow\s*:?\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)?/gi
        ];

        console.log(chalk.cyan('Found time patterns:'));
        timePatterns.forEach((pattern, i) => {
            const matches = bodyText.match(pattern);
            if (matches && matches.length > 0) {
                console.log(chalk.green(`Pattern ${i + 1}:`), matches.slice(0, 3).join(', '));
            }
        });

        // Look for "Pixies" specifically
        if (bodyText.toLowerCase().includes('pixies')) {
            console.log(chalk.green('\n🎸 "Pixies" found on page!'));
            
            // Find context around Pixies
            const pixiesIndex = bodyText.toLowerCase().indexOf('pixies');
            const context = bodyText.substring(Math.max(0, pixiesIndex - 100), pixiesIndex + 100);
            console.log(chalk.cyan('Context around "Pixies":'), context.replace(/\s+/g, ' ').trim());
        }

        // Check images
        console.log(chalk.yellow('\n🖼️  Checking for images...'));
        const images = await scraper.page.locator('img').all();
        console.log(`Found ${images.length} images`);
        
        for (let i = 0; i < Math.min(images.length, 5); i++) {
            const src = await images[i].getAttribute('src');
            const alt = await images[i].getAttribute('alt');
            if (src) {
                console.log(chalk.green(`Image ${i + 1}:`), src);
                if (alt) console.log(chalk.blue(`  Alt text:`), alt);
            }
        }

    } catch (error) {
        console.error(chalk.red('❌ Debug failed:'), error.message);
    } finally {
        await scraper.closeBrowser();
    }
}

debugMoodyAmphitheater().catch(console.error);