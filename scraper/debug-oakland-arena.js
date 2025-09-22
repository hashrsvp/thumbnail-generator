#!/usr/bin/env node

/**
 * Debug Script for Oakland Arena Website
 * Investigates why the Universal Event Scraper failed to extract data
 */

const { chromium } = require('playwright');
const chalk = require('chalk');

const URL = 'https://www.theoaklandarena.com/events/detail/ice-cube-truth-to-power-four-decades-of-attitude';

async function debugOaklandArena() {
    console.log(chalk.blue('🔍 Debugging Oakland Arena Website Structure'));
    console.log(chalk.gray('=' .repeat(60)));
    console.log(chalk.cyan(`🌐 URL: ${URL}`));
    console.log(chalk.gray('=' .repeat(60)));

    const browser = await chromium.launch({ headless: false }); // Use non-headless for debugging
    const page = await browser.newPage();

    try {
        // Navigate to the page
        console.log(chalk.yellow('🔍 Navigating to the page...'));
        await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for content to load
        await page.waitForTimeout(5000);
        
        // Check if page loaded correctly
        const title = await page.title();
        console.log(chalk.cyan(`📄 Page Title: ${title}`));

        // Check for structured data
        console.log(chalk.blue('\n📊 Checking for Structured Data (JSON-LD)...'));
        const jsonLdData = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            return scripts.map(script => {
                try {
                    return JSON.parse(script.textContent);
                } catch (e) {
                    return { error: 'Parse error', content: script.textContent.substring(0, 100) };
                }
            });
        });

        console.log(chalk.cyan(`Found ${jsonLdData.length} JSON-LD scripts:`));
        jsonLdData.forEach((data, i) => {
            console.log(chalk.magenta(`  [${i + 1}] Type: ${data['@type'] || 'Unknown'}`));
            if (data.name) console.log(chalk.magenta(`      Name: ${data.name}`));
            if (data.error) console.log(chalk.red(`      Error: ${data.error}`));
        });

        // Check meta tags
        console.log(chalk.blue('\n🏷️  Checking Meta Tags...'));
        const metaTags = await page.evaluate(() => {
            const ogTags = Array.from(document.querySelectorAll('meta[property^="og:"]'));
            const twitterTags = Array.from(document.querySelectorAll('meta[name^="twitter:"]'));
            
            return {
                og: ogTags.map(tag => ({
                    property: tag.getAttribute('property'),
                    content: tag.getAttribute('content')
                })),
                twitter: twitterTags.map(tag => ({
                    name: tag.getAttribute('name'),
                    content: tag.getAttribute('content')
                }))
            };
        });

        console.log(chalk.cyan(`OpenGraph tags: ${metaTags.og.length}`));
        metaTags.og.forEach(tag => {
            console.log(chalk.magenta(`  ${tag.property}: ${tag.content?.substring(0, 60)}...`));
        });

        console.log(chalk.cyan(`Twitter tags: ${metaTags.twitter.length}`));
        metaTags.twitter.forEach(tag => {
            console.log(chalk.magenta(`  ${tag.name}: ${tag.content?.substring(0, 60)}...`));
        });

        // Check for common HTML patterns
        console.log(chalk.blue('\n🏗️  Analyzing HTML Structure...'));
        
        const htmlAnalysis = await page.evaluate(() => {
            const analysis = {
                h1: Array.from(document.querySelectorAll('h1')).map(el => el.textContent.trim()).filter(t => t),
                h2: Array.from(document.querySelectorAll('h2')).map(el => el.textContent.trim()).filter(t => t),
                h3: Array.from(document.querySelectorAll('h3')).map(el => el.textContent.trim()).filter(t => t),
                eventSelectors: {},
                dateTimeSelectors: {},
                venueSelectors: {},
                images: []
            };

            // Check common event selectors
            const eventSelectors = [
                '.event-title', '.event-name', '.title',
                '.event-date', '.date', 'time',
                '.venue', '.venue-name', '.location',
                '.event-description', '.description'
            ];

            eventSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    analysis.eventSelectors[selector] = Array.from(elements).map(el => el.textContent?.trim()).filter(t => t);
                }
            });

            // Check for images
            const images = Array.from(document.querySelectorAll('img'));
            analysis.images = images.map(img => ({
                src: img.src,
                alt: img.alt,
                class: img.className
            })).filter(img => img.src && !img.src.includes('data:'));

            return analysis;
        });

        console.log(chalk.yellow('📝 Headlines:'));
        console.log(chalk.cyan(`  H1 tags: ${htmlAnalysis.h1.length}`));
        htmlAnalysis.h1.forEach(text => console.log(chalk.magenta(`    "${text}"`)));
        
        console.log(chalk.cyan(`  H2 tags: ${htmlAnalysis.h2.length}`));
        htmlAnalysis.h2.slice(0, 5).forEach(text => console.log(chalk.magenta(`    "${text}"`)));
        
        console.log(chalk.cyan(`  H3 tags: ${htmlAnalysis.h3.length}`));
        htmlAnalysis.h3.slice(0, 5).forEach(text => console.log(chalk.magenta(`    "${text}"`)));

        console.log(chalk.yellow('\n🎯 Event Selectors Found:'));
        Object.entries(htmlAnalysis.eventSelectors).forEach(([selector, texts]) => {
            console.log(chalk.cyan(`  ${selector}: ${texts.length} elements`));
            texts.slice(0, 2).forEach(text => console.log(chalk.magenta(`    "${text}"`)));
        });

        console.log(chalk.yellow(`\n🖼️  Images Found: ${htmlAnalysis.images.length}`));
        htmlAnalysis.images.slice(0, 5).forEach((img, i) => {
            console.log(chalk.cyan(`  [${i + 1}] ${img.src}`));
            console.log(chalk.gray(`      Alt: ${img.alt || 'None'}`));
            console.log(chalk.gray(`      Class: ${img.class || 'None'}`));
        });

        // Check page source for specific patterns
        console.log(chalk.blue('\n🔍 Content Analysis...'));
        const contentAnalysis = await page.evaluate(() => {
            const bodyText = document.body.textContent || '';
            const innerHTML = document.body.innerHTML;
            
            return {
                hasIceCube: bodyText.toLowerCase().includes('ice cube'),
                hasTruthToPower: bodyText.toLowerCase().includes('truth to power'),
                hasOaklandArena: bodyText.toLowerCase().includes('oakland arena'),
                hasDate: /\b(?:september|sept|sep)\s+\d{1,2},?\s+\d{4}/i.test(bodyText),
                hasTime: /\b\d{1,2}:\d{2}\s*(?:am|pm)\b/i.test(bodyText),
                bodyLength: bodyText.length,
                hasJavaScript: innerHTML.includes('<script'),
                hasDynamicContent: innerHTML.includes('vue') || innerHTML.includes('react') || innerHTML.includes('angular')
            };
        });

        console.log(chalk.cyan('📄 Content Analysis:'));
        console.log(chalk.magenta(`  Contains "Ice Cube": ${contentAnalysis.hasIceCube ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Contains "Truth to Power": ${contentAnalysis.hasTruthToPower ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Contains "Oakland Arena": ${contentAnalysis.hasOaklandArena ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Contains Date Pattern: ${contentAnalysis.hasDate ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Contains Time Pattern: ${contentAnalysis.hasTime ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Body Text Length: ${contentAnalysis.bodyLength} characters`));
        console.log(chalk.magenta(`  Has JavaScript: ${contentAnalysis.hasJavaScript ? '✅' : '❌'}`));
        console.log(chalk.magenta(`  Dynamic Content: ${contentAnalysis.hasDynamicContent ? '✅' : '❌'}`));

        // Take a screenshot for manual inspection
        await page.screenshot({ path: '/Users/user/Desktop/hash/scripts/scraper/oakland-arena-debug.png', fullPage: true });
        console.log(chalk.green('\n📸 Screenshot saved to oakland-arena-debug.png'));

        // Wait a bit before closing for manual inspection if needed
        console.log(chalk.yellow('\n⏳ Keeping browser open for 10 seconds for manual inspection...'));
        await page.waitForTimeout(10000);

    } catch (error) {
        console.error(chalk.red('❌ Debug failed:'), error.message);
    } finally {
        await browser.close();
    }

    console.log(chalk.green('\n✅ Debug analysis complete'));
}

debugOaklandArena();