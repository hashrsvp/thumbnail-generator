#!/usr/bin/env node

/**
 * Mad Oak Bar Website Analysis and OCR-Enhanced Scraper Test
 * 
 * This script analyzes https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings
 * and tests the Universal Extraction System with OCR enhancement on their events.
 * 
 * Features:
 * - Page structure analysis for individual event extraction
 * - OCR-enhanced scraping test on event flyers
 * - Comprehensive testing of all 6 extraction layers
 * - Individual event URL discovery and analysis
 */

const { chromium } = require('playwright');
const EventScraper = require("./improved-event-scraper-2");
const UniversalExtractor = require('./utils/universalExtractor');
const chalk = require('chalk');
const fs = require('fs');

class MadOakBarAnalyzer {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            analysis: {
                timestamp: new Date().toISOString(),
                url: 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings',
                pageStructure: {},
                events: [],
                recommendations: []
            },
            scraping: {
                universal: {},
                ocr: {},
                individual: []
            }
        };
    }

    async initialize() {
        console.log(chalk.blue('🚀 Initializing Mad Oak Bar Analysis...'));
        console.log(chalk.gray('Target: https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings'));
        console.log('');

        // Initialize browser
        this.browser = await chromium.launch({
            headless: false, // Keep visible for analysis
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        this.page = await this.browser.newPage({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            viewport: { width: 1280, height: 720 }
        });

        // Initialize scrapers with debug enabled
        this.scraper = new EventScraper({
            debug: true,
            headless: false,
            timeout: 30000
        });

        await this.scraper.initBrowser();

        console.log(chalk.green('✅ Initialization complete'));
        console.log('');
    }

    async analyzePageStructure() {
        console.log(chalk.cyan('📋 ANALYZING PAGE STRUCTURE'));
        console.log('='.repeat(50));
        console.log('');

        try {
            await this.page.goto('https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            // Wait for content to load
            await this.page.waitForTimeout(3000);

            // 1. Overall page structure analysis
            console.log(chalk.blue('🔍 1. Overall Page Structure'));
            
            const pageInfo = await this.page.evaluate(() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    hasEvents: !!document.querySelector('.events-background, .event, [class*="event"]'),
                    eventContainers: document.querySelectorAll('.events-background, .event, [class*="event"]').length,
                    images: document.querySelectorAll('img').length,
                    paragraphs: document.querySelectorAll('p').length,
                    links: document.querySelectorAll('a').length,
                    scripts: document.querySelectorAll('script').length
                };
            });

            console.log(chalk.gray('   Title:'), pageInfo.title);
            console.log(chalk.gray('   Event containers found:'), pageInfo.eventContainers);
            console.log(chalk.gray('   Images on page:'), pageInfo.images);
            console.log(chalk.gray('   Total paragraphs:'), pageInfo.paragraphs);
            console.log(chalk.gray('   Total links:'), pageInfo.links);
            console.log('');

            this.results.analysis.pageStructure = pageInfo;

            // 2. Event detection and structure analysis
            console.log(chalk.blue('🔍 2. Event Detection and Structure'));
            
            const events = await this.page.evaluate(() => {
                const eventElements = [];
                
                // Look for various event container patterns
                const eventSelectors = [
                    '.events-background',
                    '.event',
                    '[class*="event"]',
                    '.happening',
                    '[class*="happening"]',
                    '.show',
                    '[class*="show"]'
                ];

                let foundEvents = [];
                
                for (const selector of eventSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                        
                        Array.from(elements).forEach((element, index) => {
                            const eventData = {
                                selector: selector,
                                index: index,
                                innerHTML: element.innerHTML.substring(0, 500) + '...',
                                textContent: element.textContent.substring(0, 200) + '...',
                                images: Array.from(element.querySelectorAll('img')).map(img => ({
                                    src: img.src,
                                    alt: img.alt || 'No alt text',
                                    className: img.className
                                })),
                                links: Array.from(element.querySelectorAll('a')).map(link => ({
                                    href: link.href,
                                    text: link.textContent.trim(),
                                    target: link.target
                                })),
                                hasDateText: /\d{1,2}\/\d{1,2}|\w+day|\d{1,2}th|\d{1,2}st|\d{1,2}nd/i.test(element.textContent),
                                hasTimeText: /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/i.test(element.textContent),
                                hasPriceText: /\$\d+|free|cover/i.test(element.textContent.toLowerCase())
                            };
                            foundEvents.push(eventData);
                        });
                        break; // Use first successful selector
                    }
                }

                // Fallback: look for structured content that might contain events
                if (foundEvents.length === 0) {
                    const contentElements = document.querySelectorAll('div, section, article');
                    Array.from(contentElements).forEach((element, index) => {
                        const text = element.textContent.toLowerCase();
                        
                        // Look for event indicators
                        const eventKeywords = ['event', 'show', 'performance', 'concert', 'party', 'night', 'pm', 'doors'];
                        const hasEventKeywords = eventKeywords.some(keyword => text.includes(keyword));
                        
                        if (hasEventKeywords && text.length > 50 && text.length < 1000) {
                            foundEvents.push({
                                selector: 'content-analysis',
                                index: index,
                                textContent: element.textContent.substring(0, 300) + '...',
                                hasDateText: /\d{1,2}\/\d{1,2}|\w+day|\d{1,2}th/i.test(element.textContent),
                                hasTimeText: /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)/i.test(element.textContent),
                                hasPriceText: /\$\d+|free|cover/i.test(text),
                                images: Array.from(element.querySelectorAll('img')).map(img => ({
                                    src: img.src,
                                    alt: img.alt || 'No alt text'
                                }))
                            });
                        }
                    });
                }

                return foundEvents;
            });

            console.log(chalk.green(`✅ Found ${events.length} potential event elements`));
            
            events.forEach((event, index) => {
                console.log(chalk.gray(`   Event ${index + 1}:`));
                console.log(chalk.gray(`     Selector: ${event.selector}`));
                console.log(chalk.gray(`     Has date text: ${event.hasDateText}`));
                console.log(chalk.gray(`     Has time text: ${event.hasTimeText}`));
                console.log(chalk.gray(`     Has price text: ${event.hasPriceText}`));
                console.log(chalk.gray(`     Images: ${event.images.length}`));
                console.log(chalk.gray(`     Links: ${event.links?.length || 0}`));
                if (event.images.length > 0) {
                    console.log(chalk.gray(`     First image: ${event.images[0].src}`));
                }
                console.log('');
            });

            this.results.analysis.events = events;

            // 3. Individual event URL discovery
            console.log(chalk.blue('🔍 3. Individual Event URL Discovery'));
            
            const eventLinks = await this.page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href]'))
                    .filter(link => {
                        const href = link.href.toLowerCase();
                        const text = link.textContent.toLowerCase();
                        
                        // Look for event-specific URLs
                        return (href.includes('event') || 
                               href.includes('show') || 
                               href.includes('happening') ||
                               text.includes('more info') ||
                               text.includes('details') ||
                               text.includes('tickets')) &&
                               !href.includes('facebook') &&
                               !href.includes('instagram') &&
                               !href.includes('mailto');
                    })
                    .map(link => ({
                        url: link.href,
                        text: link.textContent.trim(),
                        context: link.parentElement.textContent.substring(0, 100) + '...'
                    }));

                return links;
            });

            if (eventLinks.length > 0) {
                console.log(chalk.green(`✅ Found ${eventLinks.length} potential event links`));
                eventLinks.forEach((link, index) => {
                    console.log(chalk.gray(`   ${index + 1}. "${link.text}"`));
                    console.log(chalk.gray(`      URL: ${link.url}`));
                    console.log(chalk.gray(`      Context: ${link.context}`));
                    console.log('');
                });
            } else {
                console.log(chalk.yellow('⚠️  No individual event links found'));
                console.log(chalk.gray('   Events may be displayed inline without separate pages'));
            }

            // 4. Image analysis for OCR potential
            console.log(chalk.blue('🔍 4. Image Analysis for OCR Potential'));
            
            const imageAnalysis = await this.page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                
                return images.map((img, index) => {
                    const rect = img.getBoundingClientRect();
                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                    window.getComputedStyle(img).visibility !== 'hidden' &&
                                    window.getComputedStyle(img).display !== 'none';
                    
                    return {
                        index,
                        src: img.src,
                        alt: img.alt || 'No alt text',
                        className: img.className,
                        width: rect.width || img.width,
                        height: rect.height || img.height,
                        isVisible,
                        aspectRatio: (rect.width || img.width) / (rect.height || img.height) || 0,
                        isEventImage: /event|flyer|poster|show/i.test(img.alt || img.className || img.src),
                        isLargeEnough: (rect.width || img.width) >= 200 && (rect.height || img.height) >= 200,
                        ocrPotential: isVisible && 
                                    (rect.width || img.width) >= 200 && 
                                    (rect.height || img.height) >= 200 &&
                                    /event|flyer|poster|show|happening/i.test(img.alt || img.className || img.src || 'general')
                    };
                }).filter(img => img.isVisible);
            });

            const ocrCandidates = imageAnalysis.filter(img => img.ocrPotential);

            console.log(chalk.green(`✅ Analyzed ${imageAnalysis.length} visible images`));
            console.log(chalk.yellow(`🎯 Found ${ocrCandidates.length} OCR candidates`));

            if (ocrCandidates.length > 0) {
                ocrCandidates.forEach((img, index) => {
                    console.log(chalk.gray(`   OCR Candidate ${index + 1}:`));
                    console.log(chalk.gray(`     Source: ${img.src}`));
                    console.log(chalk.gray(`     Size: ${Math.round(img.width)}x${Math.round(img.height)}`));
                    console.log(chalk.gray(`     Alt text: ${img.alt}`));
                    console.log(chalk.gray(`     Event related: ${img.isEventImage}`));
                    console.log('');
                });
            }

            // Store recommendations
            this.results.analysis.recommendations = this.generateRecommendations(events, eventLinks, ocrCandidates);

        } catch (error) {
            console.error(chalk.red('❌ Page structure analysis failed:'), error.message);
            this.results.analysis.error = error.message;
        }
    }

    generateRecommendations(events, eventLinks, ocrCandidates) {
        const recommendations = [];

        // Event scraping strategy
        if (events.length > 0) {
            recommendations.push({
                type: 'scraping_strategy',
                priority: 'high',
                title: 'Multiple Event Extraction Available',
                description: `Found ${events.length} event elements. Use multi-event extraction with Universal Scraper.`,
                implementation: 'Use EventScraper.scrapeEventListing() method for bulk extraction'
            });
        } else {
            recommendations.push({
                type: 'scraping_strategy',
                priority: 'medium',
                title: 'Single Page Analysis Required',
                description: 'No clear event containers found. Use content analysis layer.',
                implementation: 'Use EventScraper.scrapeEvent() with enhanced content analysis'
            });
        }

        // OCR strategy
        if (ocrCandidates.length > 0) {
            recommendations.push({
                type: 'ocr_strategy',
                priority: 'high',
                title: 'OCR Enhancement Recommended',
                description: `Found ${ocrCandidates.length} images suitable for OCR extraction.`,
                implementation: 'Force OCR layer by setting ocrTriggerThreshold to 95%'
            });
        } else {
            recommendations.push({
                type: 'ocr_strategy',
                priority: 'low',
                title: 'Limited OCR Potential',
                description: 'No large event flyers detected. OCR may not provide additional value.',
                implementation: 'Use standard extraction layers without forced OCR'
            });
        }

        // Individual event processing
        if (eventLinks.length > 0) {
            recommendations.push({
                type: 'individual_events',
                priority: 'high',
                title: 'Individual Event Pages Available',
                description: `Found ${eventLinks.length} individual event URLs for detailed extraction.`,
                implementation: 'Process each event URL separately for maximum data quality'
            });
        } else {
            recommendations.push({
                type: 'individual_events',
                priority: 'medium',
                title: 'Inline Event Processing',
                description: 'Events appear to be displayed inline. Extract from main page.',
                implementation: 'Use single-page multi-event extraction approach'
            });
        }

        return recommendations;
    }

    async testUniversalExtraction() {
        console.log(chalk.cyan('🧪 TESTING UNIVERSAL EXTRACTION SYSTEM'));
        console.log('='.repeat(50));
        console.log('');

        try {
            console.log(chalk.blue('🔍 Running Universal Extraction with OCR Force...'));
            
            // Navigate to the page with the scraper
            await this.scraper.page.goto('https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            await this.scraper.page.waitForTimeout(3000);

            // Test with OCR forced (low confidence threshold)
            const universalOptions = {
                debug: true,
                verbose: true,
                ocrTriggerThreshold: 50, // Force OCR to run
                enabledLayers: [1, 2, 3, 4, 5, 6], // All layers including OCR
                layerTimeout: 5000,
                maxFlyerImages: 5
            };

            const extractor = new UniversalExtractor(this.scraper.page, universalOptions);
            
            console.log(chalk.yellow('🚀 Starting 6-layer extraction cascade...'));
            const startTime = Date.now();
            
            const results = await extractor.extract();
            
            const extractionTime = Date.now() - startTime;
            console.log(chalk.green(`✅ Universal extraction completed in ${extractionTime}ms`));
            console.log('');

            this.results.scraping.universal = {
                ...results,
                extractionTime,
                options: universalOptions
            };

            // Analyze results
            this.analyzeUniversalResults(results, extractionTime);

        } catch (error) {
            console.error(chalk.red('❌ Universal extraction failed:'), error.message);
            this.results.scraping.universal.error = error.message;
        }
    }

    analyzeUniversalResults(results, extractionTime) {
        console.log(chalk.blue('📊 UNIVERSAL EXTRACTION ANALYSIS'));
        console.log('='.repeat(45));
        console.log('');

        // Overall metrics
        console.log(chalk.cyan('🎯 Overall Results:'));
        console.log(chalk.gray('   Extraction time:'), `${extractionTime}ms`);
        console.log(chalk.gray('   Layers used:'), results.metadata.layersUsed.join(', '));
        console.log(chalk.gray('   Total confidence:'), `${results.metadata.totalConfidence}%`);
        console.log(chalk.gray('   Fields extracted:'), Object.keys(results.data).length);
        console.log('');

        // Extracted data analysis
        console.log(chalk.cyan('📋 Extracted Data:'));
        if (Object.keys(results.data).length > 0) {
            Object.entries(results.data).forEach(([field, value]) => {
                const confidence = results.confidence[field] || 0;
                const status = confidence >= 70 ? chalk.green('✅') : 
                              confidence >= 50 ? chalk.yellow('⚠️') : chalk.red('❌');
                
                let displayValue = value;
                if (typeof value === 'string' && value.length > 50) {
                    displayValue = value.substring(0, 50) + '...';
                } else if (Array.isArray(value)) {
                    displayValue = `[${value.length} items]`;
                } else if (typeof value === 'object') {
                    displayValue = '{object}';
                }
                
                console.log(`   ${status} ${field}: "${displayValue}" (${confidence}%)`);
            });
        } else {
            console.log(chalk.red('   ❌ No data extracted'));
        }
        console.log('');

        // Layer-by-layer analysis
        console.log(chalk.cyan('🔍 Layer Analysis:'));
        const layerNames = {
            1: 'Structured Data',
            2: 'Meta Tags',
            3: 'Semantic HTML',
            4: 'Text Patterns',
            5: 'Content Analysis',
            6: 'OCR/Flyer Text'
        };

        Object.entries(results.layerResults).forEach(([layerNum, layerResult]) => {
            const layerName = layerNames[layerNum] || 'Unknown';
            const dataCount = Object.keys(layerResult.data || {}).length;
            
            if (layerResult.error) {
                console.log(chalk.red(`   ❌ Layer ${layerNum} (${layerName}): ERROR`));
                console.log(chalk.red(`      ${layerResult.error}`));
            } else {
                const avgConfidence = this.calculateAverageConfidence(layerResult.confidence || {});
                const status = dataCount > 0 ? chalk.green('✅') : chalk.gray('○');
                
                console.log(`   ${status} Layer ${layerNum} (${layerName}): ${dataCount} fields, ${avgConfidence}% avg confidence`);
                
                if (dataCount > 0) {
                    Object.entries(layerResult.data).forEach(([field, value]) => {
                        const confidence = layerResult.confidence[field] || 0;
                        let displayValue = typeof value === 'string' && value.length > 30 ? 
                                         value.substring(0, 30) + '...' : value;
                        console.log(chalk.gray(`      ${field}: "${displayValue}" (${confidence}%)`));
                    });
                }
            }
            console.log('');
        });

        // OCR-specific analysis
        if (results.layerResults[6]) {
            console.log(chalk.magenta('🔍 OCR LAYER DETAILED ANALYSIS'));
            console.log('-'.repeat(40));
            
            const ocrResult = results.layerResults[6];
            
            if (ocrResult.error) {
                console.log(chalk.red('❌ OCR Layer Failed:'), ocrResult.error);
            } else {
                console.log(chalk.green('✅ OCR Layer Executed Successfully'));
                
                if (ocrResult.rawText) {
                    console.log(chalk.gray('📝 Raw OCR Text Sample:'));
                    console.log(chalk.gray(ocrResult.rawText.substring(0, 200) + (ocrResult.rawText.length > 200 ? '...' : '')));
                    console.log('');
                }

                if (ocrResult.metadata) {
                    console.log(chalk.gray('📊 OCR Metadata:'));
                    Object.entries(ocrResult.metadata).forEach(([key, value]) => {
                        console.log(chalk.gray(`   ${key}: ${value}`));
                    });
                    console.log('');
                }
            }
        } else {
            console.log(chalk.yellow('⚠️  OCR Layer (Layer 6) did not execute'));
            console.log(chalk.gray('   This may indicate confidence was too high for OCR trigger'));
        }
    }

    calculateAverageConfidence(confidenceObj) {
        const values = Object.values(confidenceObj);
        if (values.length === 0) return 0;
        return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
    }

    async testIndividualEventExtraction() {
        console.log(chalk.cyan('🔗 TESTING INDIVIDUAL EVENT EXTRACTION'));
        console.log('='.repeat(50));
        console.log('');

        const eventLinks = this.results.analysis.events
            .filter(event => event.links && event.links.length > 0)
            .flatMap(event => event.links)
            .filter(link => link.href && !link.href.includes('facebook') && !link.href.includes('instagram'));

        if (eventLinks.length === 0) {
            console.log(chalk.yellow('⚠️  No individual event URLs found to test'));
            console.log(chalk.gray('   All events appear to be inline on the main page'));
            return;
        }

        console.log(chalk.blue(`🔍 Found ${eventLinks.length} individual event URLs to test`));
        
        // Test first few individual events
        const testUrls = eventLinks.slice(0, 3).map(link => link.href);
        
        for (let i = 0; i < testUrls.length; i++) {
            const url = testUrls[i];
            console.log(chalk.yellow(`\n📍 Testing Event ${i + 1}: ${url}`));
            
            try {
                const eventData = await this.scraper.scrapeEvent(url);
                
                this.results.scraping.individual.push({
                    url,
                    success: true,
                    data: eventData,
                    fieldsExtracted: Object.keys(eventData).length,
                    hasImage: !!eventData.imageUrl,
                    hasOCR: eventData._extraction && eventData._extraction.method === 'universal' && 
                           eventData._extraction.layersUsed && eventData._extraction.layersUsed.includes(6)
                });

                console.log(chalk.green(`   ✅ Success: ${eventData.title || 'Untitled Event'}`));
                console.log(chalk.gray(`      Fields: ${Object.keys(eventData).length}`));
                console.log(chalk.gray(`      Venue: ${eventData.venue || 'N/A'}`));
                console.log(chalk.gray(`      Date: ${eventData.date || 'N/A'}`));
                console.log(chalk.gray(`      Image: ${eventData.imageUrl ? 'Yes' : 'No'}`));
                
            } catch (error) {
                this.results.scraping.individual.push({
                    url,
                    success: false,
                    error: error.message
                });
                
                console.log(chalk.red(`   ❌ Failed: ${error.message}`));
            }

            // Delay between requests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async generateFinalReport() {
        console.log(chalk.cyan('📄 GENERATING FINAL ANALYSIS REPORT'));
        console.log('='.repeat(50));
        console.log('');

        const report = {
            summary: {
                venue: 'Mad Oak Bar N Yard',
                url: 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings',
                analysisDate: new Date().toISOString(),
                eventsFound: this.results.analysis.events.length,
                ocrCandidates: this.results.analysis.events.reduce((acc, event) => acc + event.images.length, 0),
                scrapingSuccess: this.results.scraping.universal.data ? Object.keys(this.results.scraping.universal.data).length > 0 : false,
                ocrExecuted: this.results.scraping.universal.metadata ? this.results.scraping.universal.metadata.layersUsed.includes(6) : false
            },
            pageStructure: this.results.analysis.pageStructure,
            recommendations: this.results.analysis.recommendations,
            scrapingResults: {
                universal: {
                    fieldsExtracted: this.results.scraping.universal.data ? Object.keys(this.results.scraping.universal.data).length : 0,
                    confidence: this.results.scraping.universal.metadata ? this.results.scraping.universal.metadata.totalConfidence : 0,
                    layersUsed: this.results.scraping.universal.metadata ? this.results.scraping.universal.metadata.layersUsed : [],
                    extractionTime: this.results.scraping.universal.extractionTime || 0
                },
                individual: {
                    tested: this.results.scraping.individual.length,
                    successful: this.results.scraping.individual.filter(r => r.success).length,
                    failed: this.results.scraping.individual.filter(r => !r.success).length
                }
            },
            bestApproach: this.determineBestApproach()
        };

        console.log(chalk.blue('📊 ANALYSIS SUMMARY'));
        console.log(chalk.gray('Venue:'), report.summary.venue);
        console.log(chalk.gray('Events detected:'), report.summary.eventsFound);
        console.log(chalk.gray('OCR candidates:'), report.summary.ocrCandidates);
        console.log(chalk.gray('Universal scraping success:'), report.summary.scrapingSuccess ? chalk.green('Yes') : chalk.red('No'));
        console.log(chalk.gray('OCR layer executed:'), report.summary.ocrExecuted ? chalk.green('Yes') : chalk.red('No'));
        console.log('');

        console.log(chalk.blue('🎯 BEST APPROACH'));
        console.log(chalk.green(`Strategy: ${report.bestApproach.strategy}`));
        console.log(chalk.gray('Reason:'), report.bestApproach.reason);
        console.log(chalk.gray('Implementation:'), report.bestApproach.implementation);
        console.log('');

        console.log(chalk.blue('💡 KEY RECOMMENDATIONS'));
        report.recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'high' ? chalk.red('HIGH') : 
                           rec.priority === 'medium' ? chalk.yellow('MEDIUM') : chalk.gray('LOW');
            console.log(`${index + 1}. [${priority}] ${rec.title}`);
            console.log(chalk.gray(`   ${rec.description}`));
            console.log(chalk.gray(`   Implementation: ${rec.implementation}`));
            console.log('');
        });

        // Save report
        const filename = `mad-oak-bar-analysis-${Date.now()}.json`;
        const filepath = `/Users/user/Desktop/hash/scripts/scraper/${filename}`;
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
            console.log(chalk.green(`📁 Full report saved to: ${filename}`));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not save report: ${error.message}`));
        }

        return report;
    }

    determineBestApproach() {
        const hasMultipleEvents = this.results.analysis.events.length > 1;
        const hasOCRCandidates = this.results.analysis.events.some(event => event.images.length > 0);
        const universalWorked = this.results.scraping.universal.data && Object.keys(this.results.scraping.universal.data).length > 0;
        const individualLinksExist = this.results.analysis.events.some(event => event.links && event.links.length > 0);

        if (hasMultipleEvents && universalWorked) {
            return {
                strategy: 'Multi-Event Universal Extraction',
                reason: 'Multiple events detected and universal extraction successful',
                implementation: 'Use EventScraper.scrapeEventListing() with all 6 layers enabled'
            };
        } else if (individualLinksExist) {
            return {
                strategy: 'Individual Event Processing',
                reason: 'Individual event URLs available for detailed extraction',
                implementation: 'Process each event URL separately with Universal Extraction'
            };
        } else if (hasOCRCandidates) {
            return {
                strategy: 'OCR-Enhanced Single Page',
                reason: 'Event flyers/images detected suitable for OCR',
                implementation: 'Force OCR layer with low confidence threshold (30-50%)'
            };
        } else {
            return {
                strategy: 'Standard Single Page Extraction',
                reason: 'Limited structured data, use content analysis layers',
                implementation: 'Use layers 3-5 with enhanced content analysis'
            };
        }
    }

    async cleanup() {
        console.log(chalk.gray('\n🧹 Cleaning up...'));
        
        if (this.scraper) {
            await this.scraper.close();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log(chalk.green('✅ Cleanup complete'));
    }
}

// Main execution
async function main() {
    const analyzer = new MadOakBarAnalyzer();
    
    try {
        console.log(chalk.blue('🍺 MAD OAK BAR - WEBSITE ANALYSIS & OCR-ENHANCED SCRAPER TEST'));
        console.log(chalk.gray('================================================================'));
        console.log('');
        
        await analyzer.initialize();
        await analyzer.analyzePageStructure();
        await analyzer.testUniversalExtraction();
        await analyzer.testIndividualEventExtraction();
        
        const report = await analyzer.generateFinalReport();
        
        console.log('');
        console.log(chalk.blue('🏁 ANALYSIS COMPLETE'));
        console.log(chalk.gray('Check the output above for detailed analysis and recommendations.'));
        console.log(chalk.gray('A comprehensive JSON report has been saved to the scraper directory.'));
        
        return report;
        
    } catch (error) {
        console.error(chalk.red('❌ Analysis failed:'), error.message);
        console.error(chalk.gray('Stack trace:'), error.stack);
    } finally {
        await analyzer.cleanup();
        process.exit(0);
    }
}

// Handle process interruption
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⚠️  Analysis interrupted. Cleaning up...'));
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise);
    console.error(chalk.red('Reason:'), reason);
    process.exit(1);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = MadOakBarAnalyzer;