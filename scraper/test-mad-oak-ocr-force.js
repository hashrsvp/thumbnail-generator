#!/usr/bin/env node

/**
 * Mad Oak Bar OCR Force Test
 * 
 * Test script to force OCR analysis on Mad Oak Bar page by setting ocrTriggerThreshold to 95%.
 * This will force the OCR layer to run regardless of traditional text extraction confidence.
 * 
 * Target URL: https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings
 * 
 * Test Objectives:
 * 1. Force OCR on all event flyers
 * 2. Extract specific text: "TRIVIA NIGHT", "Tuesday September 2nd", "07:00 PM - 09:00 PM"
 * 3. Extract specific text: "KARAOKE WEDNESDAY", "Wednesday September 3rd", "07:00 PM - 10:00 PM" 
 * 4. Analyze why traditional layers miss structured text on right side
 * 5. Compare OCR results vs traditional extraction methods
 * 
 * @author Claude Code Test Suite
 * @version 1.0.0
 */

const { chromium } = require('playwright');
const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

// Import scraper components
const EventScraper = require("./improved-event-scraper-2");
const UniversalExtractor = require('./utils/universalExtractor');
const FlyerTextExtractor = require('./utils/flyerTextExtractor');

class MadOakOcrForceTest {
    constructor() {
        this.testUrl = 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings';
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            url: this.testUrl,
            testConfig: {
                ocrTriggerThreshold: 95, // Force OCR by setting threshold to 95%
                maxFlyerImages: 5,
                ocrTimeout: 30000,
                enableAllLayers: true
            },
            targetTexts: [
                {
                    event: 'first_flyer',
                    expectedTexts: ['TRIVIA NIGHT', 'Tuesday September 2nd', '07:00 PM - 09:00 PM']
                },
                {
                    event: 'second_flyer',
                    expectedTexts: ['KARAOKE WEDNESDAY', 'Wednesday September 3rd', '07:00 PM - 10:00 PM']
                }
            ],
            layerComparison: {},
            ocrResults: {},
            traditionalResults: {},
            analysis: {},
            performance: {}
        };
    }

    async init() {
        console.log(chalk.blue('🚀 Initializing Mad Oak Bar OCR Force Test...'));
        
        this.browser = await chromium.launch({
            headless: false, // Run in non-headless for debugging
            slowMo: 500
        });
        
        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            viewport: { width: 1440, height: 900 }
        });
        this.page = await context.newPage();
    }

    async loadPage() {
        console.log(chalk.yellow('📄 Loading Mad Oak Bar page...'));
        const startTime = performance.now();
        
        try {
            await this.page.goto(this.testUrl, { waitUntil: 'networkidle' });
            await this.page.waitForTimeout(3000); // Allow dynamic content to load
            
            this.results.performance.pageLoadTime = performance.now() - startTime;
            console.log(chalk.green(`✅ Page loaded in ${this.results.performance.pageLoadTime.toFixed(2)}ms`));
            
            // Take screenshot for analysis
            await this.page.screenshot({ 
                path: '/Users/user/Desktop/hash/scripts/scraper/mad-oak-ocr-test-screenshot.png',
                fullPage: true 
            });
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to load page:'), error.message);
            throw error;
        }
    }

    async analyzePageStructure() {
        console.log(chalk.yellow('🔍 Analyzing page structure...'));
        
        // Analyze the overall page structure
        const structure = await this.page.evaluate(() => {
            const events = [];
            
            // Look for event containers - Mad Oak typically uses specific class patterns
            const eventSelectors = [
                '.event-item',
                '.event-container', 
                '.happening',
                '.event',
                '[class*="event"]',
                '[class*="happening"]'
            ];
            
            let foundEvents = [];
            
            // Try each selector
            for (const selector of eventSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    console.log(`Found ${elements.length} elements with selector: ${selector}`);
                    
                    elements.forEach((el, index) => {
                        const rect = el.getBoundingClientRect();
                        foundEvents.push({
                            selector,
                            index,
                            text: el.innerText.substring(0, 200),
                            html: el.outerHTML.substring(0, 500),
                            bounds: {
                                x: rect.x,
                                y: rect.y,
                                width: rect.width,
                                height: rect.height
                            },
                            hasImages: el.querySelectorAll('img').length,
                            classes: el.className
                        });
                    });
                }
            }
            
            // Also check for images that might be flyers
            const images = Array.from(document.querySelectorAll('img')).map((img, index) => ({
                src: img.src,
                alt: img.alt,
                index,
                bounds: img.getBoundingClientRect(),
                parentClasses: img.parentElement?.className || ''
            }));
            
            return {
                events: foundEvents,
                images: images,
                totalImages: images.length,
                pageTitle: document.title,
                pageText: document.body.innerText.substring(0, 1000)
            };
        });
        
        this.results.pageStructure = structure;
        console.log(chalk.blue(`📊 Found ${structure.events.length} potential event containers`));
        console.log(chalk.blue(`🖼️  Found ${structure.images.length} images on page`));
    }

    async runTraditionalExtraction() {
        console.log(chalk.yellow('🔄 Running traditional extraction (Layers 1-5)...'));
        const startTime = performance.now();
        
        try {
            // Create extractor with OCR disabled to test traditional layers only
            const traditionalExtractor = new UniversalExtractor(this.page, {
                enabledLayers: [1, 2, 3, 4, 5], // Exclude OCR layer 6
                debug: true,
                verbose: true,
                minConfidence: 30 // Lower threshold for traditional methods
            });
            
            const traditionalResults = await traditionalExtractor.extract();
            
            this.results.traditionalResults = {
                ...traditionalResults,
                extractionTime: performance.now() - startTime,
                layersUsed: traditionalResults.metadata.layersUsed,
                totalConfidence: traditionalResults.metadata.totalConfidence
            };
            
            console.log(chalk.green(`✅ Traditional extraction completed`));
            console.log(chalk.blue(`📈 Traditional confidence: ${traditionalResults.metadata.totalConfidence}%`));
            
        } catch (error) {
            console.error(chalk.red('❌ Traditional extraction failed:'), error.message);
            this.results.traditionalResults = { error: error.message };
        }
    }

    async runForcedOcrExtraction() {
        console.log(chalk.yellow('🔍 Running FORCED OCR extraction (threshold 95%)...'));
        const startTime = performance.now();
        
        try {
            // Create extractor with forced OCR (95% threshold means OCR will always run)
            const ocrExtractor = new UniversalExtractor(this.page, {
                enabledLayers: [1, 2, 3, 4, 5, 6], // Include all layers
                ocrTriggerThreshold: 95, // Force OCR to run
                maxFlyerImages: 5,
                ocrTimeout: 30000,
                debug: true,
                verbose: true,
                minConfidence: 30
            });
            
            const ocrResults = await ocrExtractor.extract();
            
            this.results.ocrResults = {
                ...ocrResults,
                extractionTime: performance.now() - startTime,
                layersUsed: ocrResults.metadata.layersUsed,
                totalConfidence: ocrResults.metadata.totalConfidence
            };
            
            console.log(chalk.green(`✅ OCR extraction completed`));
            console.log(chalk.blue(`📈 OCR confidence: ${ocrResults.metadata.totalConfidence}%`));
            
        } catch (error) {
            console.error(chalk.red('❌ OCR extraction failed:'), error.message);
            this.results.ocrResults = { error: error.message };
        }
    }

    async runStandaloneOcrTest() {
        console.log(chalk.yellow('🎯 Running standalone OCR test on individual flyers...'));
        
        try {
            const flyerExtractor = new FlyerTextExtractor({
                timeout: 30000,
                debug: true,
                verbose: true,
                imagePreprocessing: true
            });
            
            // Find all potential flyer images
            const flyerImages = await this.page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                return images
                    .filter(img => {
                        const src = img.src.toLowerCase();
                        const alt = img.alt.toLowerCase();
                        // Look for event-related images
                        return src.includes('event') || 
                               src.includes('flyer') || 
                               src.includes('happening') ||
                               alt.includes('event') ||
                               alt.includes('flyer') ||
                               alt.includes('trivia') ||
                               alt.includes('karaoke');
                    })
                    .map(img => ({
                        src: img.src,
                        alt: img.alt,
                        bounds: img.getBoundingClientRect()
                    }))
                    .filter(img => img.bounds.width > 100 && img.bounds.height > 100); // Filter out tiny images
            });
            
            console.log(chalk.blue(`🎯 Found ${flyerImages.length} potential flyer images`));
            
            const ocrTestResults = {
                images: flyerImages,
                extractions: []
            };
            
            // Test OCR on each potential flyer
            for (let i = 0; i < Math.min(flyerImages.length, 3); i++) {
                const image = flyerImages[i];
                console.log(chalk.yellow(`🔍 Testing OCR on image ${i + 1}: ${image.src}`));
                
                try {
                    // Take screenshot of just this image for OCR
                    const imageElement = await this.page.locator(`img[src="${image.src}"]`).first();
                    const imageBuffer = await imageElement.screenshot();
                    
                    // Run OCR on the image
                    const ocrResult = await flyerExtractor.extractFromBuffer(imageBuffer);
                    
                    // Check for target texts
                    const targetAnalysis = this.analyzeTargetTexts(ocrResult.rawText || '');
                    
                    ocrTestResults.extractions.push({
                        imageIndex: i,
                        imageSrc: image.src,
                        ocrResult,
                        targetAnalysis,
                        foundTargetTexts: targetAnalysis.foundTexts.length > 0
                    });
                    
                    console.log(chalk.green(`✅ OCR completed for image ${i + 1}`));
                    if (targetAnalysis.foundTexts.length > 0) {
                        console.log(chalk.green(`🎯 Found target texts: ${targetAnalysis.foundTexts.join(', ')}`));
                    }
                    
                } catch (error) {
                    console.error(chalk.red(`❌ OCR failed for image ${i + 1}:`, error.message));
                    ocrTestResults.extractions.push({
                        imageIndex: i,
                        imageSrc: image.src,
                        error: error.message
                    });
                }
            }
            
            this.results.standaloneOcrTest = ocrTestResults;
            
        } catch (error) {
            console.error(chalk.red('❌ Standalone OCR test failed:'), error.message);
            this.results.standaloneOcrTest = { error: error.message };
        }
    }

    analyzeTargetTexts(text) {
        const allTargetTexts = [
            'TRIVIA NIGHT',
            'Tuesday September 2nd', 
            '07:00 PM - 09:00 PM',
            'KARAOKE WEDNESDAY',
            'Wednesday September 3rd',
            '07:00 PM - 10:00 PM'
        ];
        
        const foundTexts = [];
        const partialMatches = [];
        
        const normalizedText = text.toUpperCase();
        
        for (const target of allTargetTexts) {
            const normalizedTarget = target.toUpperCase();
            
            if (normalizedText.includes(normalizedTarget)) {
                foundTexts.push(target);
            } else {
                // Check for partial matches
                const words = normalizedTarget.split(' ');
                const matchedWords = words.filter(word => normalizedText.includes(word));
                if (matchedWords.length > 0) {
                    partialMatches.push({
                        target,
                        matchedWords,
                        matchRatio: matchedWords.length / words.length
                    });
                }
            }
        }
        
        return {
            foundTexts,
            partialMatches,
            extractedText: text,
            confidence: foundTexts.length / allTargetTexts.length
        };
    }

    async analyzeWhyTraditionalMethodsFail() {
        console.log(chalk.yellow('🔬 Analyzing why traditional methods miss structured text...'));
        
        const analysis = await this.page.evaluate(() => {
            const reasons = [];
            
            // Check for JavaScript-rendered content
            const scriptsCount = document.querySelectorAll('script').length;
            const hasReactRoot = !!document.querySelector('[id*="root"], [id*="app"], [class*="react"]');
            const hasVueApp = !!document.querySelector('[id*="vue"], [class*="vue"]');
            
            if (scriptsCount > 10) {
                reasons.push({
                    type: 'javascript_heavy',
                    description: `Page has ${scriptsCount} scripts - content likely dynamically rendered`,
                    impact: 'high'
                });
            }
            
            if (hasReactRoot || hasVueApp) {
                reasons.push({
                    type: 'spa_framework',
                    description: 'Single Page Application detected - content may load after initial DOM parse',
                    impact: 'high'
                });
            }
            
            // Check for CSS-hidden content
            const hiddenElements = Array.from(document.querySelectorAll('*')).filter(el => {
                const style = window.getComputedStyle(el);
                return style.display === 'none' || 
                       style.visibility === 'hidden' || 
                       style.opacity === '0' ||
                       style.position === 'absolute' && (
                           parseInt(style.left) < -9999 || 
                           parseInt(style.top) < -9999
                       );
            });
            
            if (hiddenElements.length > 20) {
                reasons.push({
                    type: 'css_hidden_content',
                    description: `${hiddenElements.length} hidden elements found - content may be in collapsed/hidden sections`,
                    impact: 'medium'
                });
            }
            
            // Check for text in images vs HTML
            const textImages = Array.from(document.querySelectorAll('img')).filter(img => {
                const alt = img.alt.toLowerCase();
                const src = img.src.toLowerCase();
                return alt.includes('event') || alt.includes('text') || src.includes('text') || src.includes('flyer');
            });
            
            if (textImages.length > 3) {
                reasons.push({
                    type: 'text_in_images',
                    description: `${textImages.length} images likely contain text - traditional HTML extraction cannot read image text`,
                    impact: 'high'
                });
            }
            
            // Check for iframe content
            const iframes = document.querySelectorAll('iframe').length;
            if (iframes > 0) {
                reasons.push({
                    type: 'iframe_content',
                    description: `${iframes} iframes detected - content may be in separate documents`,
                    impact: 'medium'
                });
            }
            
            // Check for lazy-loaded content
            const lazyImages = document.querySelectorAll('[loading="lazy"], [data-src], [data-lazy]').length;
            if (lazyImages > 0) {
                reasons.push({
                    type: 'lazy_loading',
                    description: `${lazyImages} lazy-loaded elements - content may not be immediately available`,
                    impact: 'medium'
                });
            }
            
            // Analyze text distribution
            const totalText = document.body.innerText.length;
            const imageCount = document.querySelectorAll('img').length;
            const textToImageRatio = totalText / Math.max(imageCount, 1);
            
            if (textToImageRatio < 100) {
                reasons.push({
                    type: 'low_text_density',
                    description: `Low text-to-image ratio (${textToImageRatio.toFixed(2)}) suggests text is primarily in images`,
                    impact: 'high'
                });
            }
            
            return {
                reasons,
                pageStats: {
                    scriptsCount,
                    hiddenElements: hiddenElements.length,
                    textImages: textImages.length,
                    iframes,
                    lazyImages,
                    totalText,
                    imageCount,
                    textToImageRatio: textToImageRatio.toFixed(2),
                    hasReactRoot,
                    hasVueApp
                }
            };
        });
        
        this.results.analysis.whyTraditionalFails = analysis;
        
        // Print analysis
        console.log(chalk.blue('\n📊 Analysis of Traditional Method Limitations:'));
        analysis.reasons.forEach((reason, index) => {
            const impact = reason.impact === 'high' ? chalk.red('HIGH') : 
                          reason.impact === 'medium' ? chalk.yellow('MEDIUM') : 
                          chalk.green('LOW');
            console.log(chalk.blue(`${index + 1}. [${impact}] ${reason.type}: ${reason.description}`));
        });
    }

    async compareResults() {
        console.log(chalk.yellow('⚖️  Comparing traditional vs OCR results...'));
        
        const comparison = {
            traditional: {
                confidence: this.results.traditionalResults.metadata?.totalConfidence || 0,
                eventsFound: this.results.traditionalResults.data?.events?.length || 0,
                hasTargetTexts: false
            },
            ocr: {
                confidence: this.results.ocrResults.metadata?.totalConfidence || 0,
                eventsFound: this.results.ocrResults.data?.events?.length || 0,
                hasTargetTexts: false
            },
            standalone: {
                imagesProcessed: this.results.standaloneOcrTest?.extractions?.length || 0,
                successfulExtractions: 0,
                targetTextsFound: 0
            }
        };
        
        // Check if traditional results contain any target texts
        const traditionalText = JSON.stringify(this.results.traditionalResults).toUpperCase();
        const targetTexts = ['TRIVIA NIGHT', 'KARAOKE WEDNESDAY'];
        comparison.traditional.hasTargetTexts = targetTexts.some(text => traditionalText.includes(text));
        
        // Check OCR results
        const ocrText = JSON.stringify(this.results.ocrResults).toUpperCase();
        comparison.ocr.hasTargetTexts = targetTexts.some(text => ocrText.includes(text));
        
        // Analyze standalone results
        if (this.results.standaloneOcrTest?.extractions) {
            comparison.standalone.successfulExtractions = this.results.standaloneOcrTest.extractions
                .filter(ext => !ext.error).length;
            comparison.standalone.targetTextsFound = this.results.standaloneOcrTest.extractions
                .filter(ext => ext.targetAnalysis && ext.targetAnalysis.foundTexts.length > 0).length;
        }
        
        this.results.comparison = comparison;
        
        // Print comparison
        console.log(chalk.blue('\n📊 Results Comparison:'));
        console.log(chalk.blue(`Traditional Method: ${comparison.traditional.confidence}% confidence, ${comparison.traditional.eventsFound} events, Target texts: ${comparison.traditional.hasTargetTexts ? 'YES' : 'NO'}`));
        console.log(chalk.blue(`OCR Method: ${comparison.ocr.confidence}% confidence, ${comparison.ocr.eventsFound} events, Target texts: ${comparison.ocr.hasTargetTexts ? 'YES' : 'NO'}`));
        console.log(chalk.blue(`Standalone OCR: ${comparison.standalone.successfulExtractions}/${comparison.standalone.imagesProcessed} successful, ${comparison.standalone.targetTextsFound} with target texts`));
    }

    async saveResults() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `/Users/user/Desktop/hash/scripts/scraper/mad-oak-ocr-force-test-${timestamp}.json`;
        
        try {
            await fs.writeFile(filename, JSON.stringify(this.results, null, 2));
            console.log(chalk.green(`💾 Results saved to: ${filename}`));
            
            // Also save a summary report
            const summaryFilename = `/Users/user/Desktop/hash/scripts/scraper/mad-oak-ocr-test-summary-${timestamp}.md`;
            const summary = this.generateSummaryReport();
            await fs.writeFile(summaryFilename, summary);
            console.log(chalk.green(`📄 Summary report saved to: ${summaryFilename}`));
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to save results:'), error.message);
        }
    }

    generateSummaryReport() {
        const { traditional, ocr, standalone } = this.results.comparison;
        
        return `# Mad Oak Bar OCR Force Test - Summary Report

## Test Overview
- **URL**: ${this.testUrl}
- **Test Date**: ${this.results.timestamp}
- **OCR Trigger Threshold**: 95% (forced)

## Target Texts Searched For
1. "TRIVIA NIGHT"
2. "Tuesday September 2nd" 
3. "07:00 PM - 09:00 PM"
4. "KARAOKE WEDNESDAY"
5. "Wednesday September 3rd"
6. "07:00 PM - 10:00 PM"

## Results Comparison

### Traditional Extraction (Layers 1-5)
- **Confidence**: ${traditional.confidence}%
- **Events Found**: ${traditional.eventsFound}
- **Target Texts Detected**: ${traditional.hasTargetTexts ? '✅ YES' : '❌ NO'}
- **Performance**: ${this.results.traditionalResults.extractionTime?.toFixed(2) || 'N/A'}ms

### OCR Extraction (All Layers + Forced OCR)
- **Confidence**: ${ocr.confidence}%
- **Events Found**: ${ocr.eventsFound}
- **Target Texts Detected**: ${ocr.hasTargetTexts ? '✅ YES' : '❌ NO'}
- **Performance**: ${this.results.ocrResults.extractionTime?.toFixed(2) || 'N/A'}ms

### Standalone OCR Test
- **Images Processed**: ${standalone.imagesProcessed}
- **Successful Extractions**: ${standalone.successfulExtractions}
- **Images with Target Texts**: ${standalone.targetTextsFound}

## Why Traditional Methods Fail

${this.results.analysis.whyTraditionalFails?.reasons.map((reason, index) => 
    `${index + 1}. **${reason.type.replace(/_/g, ' ').toUpperCase()}** (${reason.impact.toUpperCase()} impact)
   - ${reason.description}`
).join('\n\n') || 'Analysis not completed'}

## Page Statistics
${this.results.analysis.whyTraditionalFails ? `
- **Scripts**: ${this.results.analysis.whyTraditionalFails.pageStats.scriptsCount}
- **Hidden Elements**: ${this.results.analysis.whyTraditionalFails.pageStats.hiddenElements}
- **Text Images**: ${this.results.analysis.whyTraditionalFails.pageStats.textImages}
- **Total Text Length**: ${this.results.analysis.whyTraditionalFails.pageStats.totalText}
- **Image Count**: ${this.results.analysis.whyTraditionalFails.pageStats.imageCount}
- **Text/Image Ratio**: ${this.results.analysis.whyTraditionalFails.pageStats.textToImageRatio}
` : 'Statistics not available'}

## Key Findings

### OCR Effectiveness
${ocr.hasTargetTexts || standalone.targetTextsFound > 0 ? 
'✅ OCR successfully extracted target texts that traditional methods missed' : 
'❌ OCR also failed to extract target texts - further investigation needed'}

### Performance Impact
- Traditional: ${this.results.traditionalResults.extractionTime?.toFixed(2) || 'N/A'}ms
- OCR: ${this.results.ocrResults.extractionTime?.toFixed(2) || 'N/A'}ms
- OCR Overhead: ${this.results.ocrResults.extractionTime && this.results.traditionalResults.extractionTime ? 
    (this.results.ocrResults.extractionTime - this.results.traditionalResults.extractionTime).toFixed(2) : 'N/A'}ms

## Recommendations

1. **Text-in-Images**: Mad Oak Bar appears to use flyer images for event details
2. **OCR Integration**: ${standalone.targetTextsFound > 0 ? 'OCR should be enabled' : 'OCR configuration may need adjustment'}
3. **Performance**: ${this.results.ocrResults.extractionTime > 10000 ? 'OCR timeout may need optimization' : 'OCR performance is acceptable'}

## Next Steps

${ocr.hasTargetTexts || standalone.targetTextsFound > 0 ? 
'- Integrate OCR with lower trigger threshold\n- Optimize OCR performance\n- Test on similar venue websites' :
'- Debug OCR configuration\n- Test different image preprocessing\n- Verify target texts are actually present on page'}

---
*Generated by Mad Oak Bar OCR Force Test Suite*
`;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        try {
            console.log(chalk.blue.bold('\n🧪 MAD OAK BAR OCR FORCE TEST'));
            console.log(chalk.blue('===============================\n'));
            
            await this.init();
            await this.loadPage();
            await this.analyzePageStructure();
            
            // Run tests in parallel where possible
            await Promise.all([
                this.runTraditionalExtraction(),
                this.analyzeWhyTraditionalMethodsFail()
            ]);
            
            await this.runForcedOcrExtraction();
            await this.runStandaloneOcrTest();
            await this.compareResults();
            await this.saveResults();
            
            console.log(chalk.green.bold('\n✅ Mad Oak Bar OCR Force Test Completed!'));
            console.log(chalk.blue('Check the generated JSON and MD files for detailed results.'));
            
        } catch (error) {
            console.error(chalk.red.bold('\n❌ Test Failed:'), error.message);
            console.error(error.stack);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the test
if (require.main === module) {
    const test = new MadOakOcrForceTest();
    test.run().catch(console.error);
}

module.exports = MadOakOcrForceTest;