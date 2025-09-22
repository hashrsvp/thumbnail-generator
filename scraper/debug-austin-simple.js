#!/usr/bin/env node

/**
 * Simple debug script to test basic page loading
 */

const { chromium } = require('playwright');
const chalk = require('chalk');

async function testBasicPageLoad() {
    console.log(chalk.blue('🔍 Testing Basic Page Loading'));
    
    const testUrls = [
        'https://www.emosaustin.com/shows',
        'https://thelongcenter.org/upcoming-calendar/',
        'https://antonesnightclub.com/',
        'https://www.capcitycomedy.com/'
    ];
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
        for (const url of testUrls) {
            console.log(`\n🌐 Testing: ${url}`);
            
            const page = await browser.newPage({
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            try {
                const startTime = Date.now();
                
                // Try with a shorter timeout and different wait strategy
                await page.goto(url, { 
                    timeout: 30000,
                    waitUntil: 'domcontentloaded'
                });
                
                const loadTime = Date.now() - startTime;
                console.log(`✅ Page loaded in ${loadTime}ms`);
                console.log(`   Title: ${await page.title()}`);
                console.log(`   URL: ${await page.url()}`);
                
                // Quick content check
                const bodyText = await page.textContent('body');
                console.log(`   Content length: ${bodyText?.length || 0} characters`);
                
                if (bodyText && bodyText.includes('event') || bodyText.includes('show') || bodyText.includes('concert')) {
                    console.log('   ✅ Found event-related content');
                } else {
                    console.log('   ⚠️  No obvious event content detected');
                }
                
                // Look for basic event containers
                const eventElements = await page.$$eval('*', elements => {
                    return elements.filter(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        const className = el.className?.toLowerCase() || '';
                        return (text.includes('event') || text.includes('show') || text.includes('concert')) &&
                               (className.includes('event') || className.includes('show') || className.includes('card'));
                    }).length;
                });
                
                console.log(`   Event-like elements found: ${eventElements}`);
                
            } catch (error) {
                console.log(`❌ Failed to load: ${error.message}`);
            } finally {
                await page.close();
            }
        }
    } finally {
        await browser.close();
    }
}

testBasicPageLoad().catch(console.error);