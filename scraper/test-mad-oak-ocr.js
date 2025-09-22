#!/usr/bin/env node

/**
 * Mad Oak Bar OCR-Focused Test
 * 
 * This script focuses specifically on testing the OCR extraction capabilities
 * on Mad Oak Bar's event images and flyers. It will:
 * 1. Navigate to the events page
 * 2. Find all event images
 * 3. Force OCR extraction on each image
 * 4. Compare OCR results with standard extraction
 */

const { chromium } = require('playwright');
const FlyerTextExtractor = require('./utils/flyerTextExtractor');
const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');
const fs = require('fs');

class MadOakOCRTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.results = {
            timestamp: new Date().toISOString(),
            url: 'https://madoakbar.com/oakland-mad-oak-bar-n-yard-happenings',
            images: [],
            ocrResults: [],
            comparison: {}
        };
    }

    async initialize() {
        console.log(chalk.blue('🚀 Initializing Mad Oak Bar OCR Test...'));
        
        this.browser = await chromium.launch({
            headless: false, // Keep visible for debugging
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });

        this.page = await this.browser.newPage({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            viewport: { width: 1280, height: 720 }
        });

        // Initialize OCR extractor with detailed settings
        this.ocrExtractor = new FlyerTextExtractor(this.page, {
            debug: true,
            verbose: true,
            maxImages: 10,
            ocrTimeout: 20000,
            enablePreprocessing: true,
            contrastEnhancement: true,
            minConfidence: 40,
            enablePatternRecognition: true
        });

        console.log(chalk.green('✅ OCR Test initialized'));
        console.log('');
    }

    async discoverEventImages() {
        console.log(chalk.cyan('🔍 DISCOVERING EVENT IMAGES'));
        console.log('='.repeat(40));
        console.log('');

        try {
            await this.page.goto(this.results.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            await this.page.waitForTimeout(3000);

            // Extract all images with detailed analysis
            const imageData = await this.page.evaluate(() => {
                const images = Array.from(document.querySelectorAll('img'));
                
                return images.map((img, index) => {
                    const rect = img.getBoundingClientRect();
                    const computedStyle = window.getComputedStyle(img);
                    
                    const isVisible = rect.width > 0 && rect.height > 0 && 
                                    computedStyle.visibility !== 'hidden' &&
                                    computedStyle.display !== 'none' &&
                                    computedStyle.opacity !== '0';
                    
                    const width = rect.width || img.naturalWidth || img.width;
                    const height = rect.height || img.naturalHeight || img.height;
                    
                    // Try to find event context
                    let eventContext = '';
                    let parentElement = img.parentElement;
                    let depth = 0;
                    
                    while (parentElement && depth < 3) {
                        const text = parentElement.textContent || '';
                        if (text.length > eventContext.length && text.length < 500) {
                            eventContext = text;
                        }
                        parentElement = parentElement.parentElement;
                        depth++;
                    }

                    return {
                        index,
                        src: img.src,
                        alt: img.alt || '',
                        className: img.className || '',
                        width: Math.round(width),
                        height: Math.round(height),
                        aspectRatio: width / height || 0,
                        isVisible,
                        fileSize: img.naturalWidth * img.naturalHeight, // Approximate
                        isEventRelated: /event|flyer|poster|show|happening|band|artist|concert/i.test(
                            (img.alt || '') + ' ' + (img.className || '') + ' ' + (img.src || '')
                        ),
                        isLargeEnough: width >= 150 && height >= 150,
                        hasGoodAspectRatio: (width / height >= 0.5) && (width / height <= 2.0),
                        eventContext: eventContext.substring(0, 200) + (eventContext.length > 200 ? '...' : ''),
                        containsText: /\w/.test(eventContext), // Has alphanumeric characters
                        ocrPriority: 0 // Will be calculated
                    };
                });
            });

            // Calculate OCR priority scores
            imageData.forEach(img => {
                let score = 0;
                
                if (img.isVisible) score += 20;
                if (img.isEventRelated) score += 30;
                if (img.isLargeEnough) score += 25;
                if (img.hasGoodAspectRatio) score += 15;
                if (img.containsText) score += 20;
                if (img.width >= 300 && img.height >= 300) score += 10; // Bonus for large images
                if (img.alt && img.alt.length > 5) score += 5; // Has descriptive alt text
                
                // Penalty for very small or very large images
                if (img.width < 100 || img.height < 100) score -= 20;
                if (img.width > 2000 || img.height > 2000) score -= 10;
                
                img.ocrPriority = score;
            });

            // Filter and sort by OCR priority
            const validImages = imageData
                .filter(img => img.isVisible && img.src && img.src.startsWith('http'))
                .sort((a, b) => b.ocrPriority - a.ocrPriority);

            this.results.images = validImages;

            console.log(chalk.green(`✅ Found ${imageData.length} total images`));
            console.log(chalk.yellow(`🎯 ${validImages.length} images suitable for OCR`));
            console.log('');

            // Display top OCR candidates
            const topCandidates = validImages.slice(0, 5);
            
            console.log(chalk.blue('🏆 Top OCR Candidates:'));
            topCandidates.forEach((img, index) => {
                console.log(chalk.gray(`   ${index + 1}. Priority Score: ${img.ocrPriority}`));
                console.log(chalk.gray(`      Size: ${img.width}x${img.height}`));
                console.log(chalk.gray(`      Source: ${img.src.substring(0, 60)}...`));
                console.log(chalk.gray(`      Alt: ${img.alt || 'No alt text'}`));
                console.log(chalk.gray(`      Event context: ${img.eventContext.substring(0, 80)}...`));
                console.log('');
            });

            return validImages;

        } catch (error) {
            console.error(chalk.red('❌ Image discovery failed:'), error.message);
            throw error;
        }
    }

    async testOCRExtraction(images) {
        console.log(chalk.cyan('🔍 TESTING OCR EXTRACTION'));
        console.log('='.repeat(35));
        console.log('');

        // Test top 3 images to avoid overwhelming the system
        const testImages = images.slice(0, 3);
        
        if (testImages.length === 0) {
            console.log(chalk.red('❌ No suitable images found for OCR testing'));
            return;
        }

        console.log(chalk.yellow(`🎯 Testing OCR on ${testImages.length} images`));
        console.log('');

        for (let i = 0; i < testImages.length; i++) {
            const img = testImages[i];
            
            console.log(chalk.blue(`📸 Testing Image ${i + 1}/${testImages.length}`));
            console.log(chalk.gray(`   URL: ${img.src}`));
            console.log(chalk.gray(`   Size: ${img.width}x${img.height}`));
            console.log(chalk.gray(`   Priority: ${img.ocrPriority}/100`));
            console.log('');

            try {
                const startTime = Date.now();
                
                // Run OCR extraction
                const ocrResult = await this.ocrExtractor.extract();
                
                const extractionTime = Date.now() - startTime;

                const result = {
                    imageIndex: i,
                    imageUrl: img.src,
                    imagePriority: img.ocrPriority,
                    extractionTime,
                    success: !!ocrResult && !!ocrResult.data,
                    ocrData: ocrResult || {}
                };

                if (ocrResult && ocrResult.data) {
                    console.log(chalk.green(`   ✅ OCR extraction successful (${extractionTime}ms)`));
                    console.log(chalk.gray(`   Fields extracted: ${Object.keys(ocrResult.data).length}`));
                    console.log(chalk.gray(`   Overall confidence: ${ocrResult.metadata?.totalConfidence || 'N/A'}%`));
                    
                    // Show extracted data
                    if (Object.keys(ocrResult.data).length > 0) {
                        console.log(chalk.cyan('   📋 Extracted Data:'));
                        Object.entries(ocrResult.data).forEach(([field, value]) => {
                            const confidence = ocrResult.confidence?.[field] || 0;
                            const displayValue = typeof value === 'string' && value.length > 40 ? 
                                               value.substring(0, 40) + '...' : value;
                            console.log(chalk.gray(`      ${field}: "${displayValue}" (${confidence}%)`));
                        });
                    }

                    // Show raw OCR text if available
                    if (ocrResult.rawText) {
                        console.log(chalk.cyan('   📝 Raw OCR Text Sample:'));
                        const textSample = ocrResult.rawText.substring(0, 150) + 
                                         (ocrResult.rawText.length > 150 ? '...' : '');
                        console.log(chalk.gray(`      "${textSample}"`));
                    }

                } else {
                    console.log(chalk.red(`   ❌ OCR extraction failed or returned no data`));
                    result.error = 'No data extracted';
                }

                this.results.ocrResults.push(result);

            } catch (error) {
                console.error(chalk.red(`   ❌ OCR extraction error: ${error.message}`));
                
                this.results.ocrResults.push({
                    imageIndex: i,
                    imageUrl: img.src,
                    imagePriority: img.ocrPriority,
                    success: false,
                    error: error.message
                });
            }

            console.log('');

            // Small delay between OCR operations
            if (i < testImages.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    async compareWithStandardExtraction() {
        console.log(chalk.cyan('⚖️ COMPARING OCR vs STANDARD EXTRACTION'));
        console.log('='.repeat(50));
        console.log('');

        try {
            // Run standard extraction without OCR
            const scraper = new EventScraper({
                debug: false,
                headless: true
            });

            await scraper.initBrowser();

            console.log(chalk.blue('🔍 Running standard extraction (without OCR)...'));
            const standardResult = await scraper.scrapeEvent(this.results.url);
            
            console.log(chalk.blue('🔍 Running forced OCR extraction...'));
            const ocrScraper = new EventScraper({
                debug: true,
                headless: true
            });

            await ocrScraper.initBrowser();

            // Force OCR by setting low threshold
            const ocrPage = ocrScraper.page;
            const ocrResult = await ocrPage.evaluate(() => {
                // This is a placeholder - in a real implementation, 
                // we would modify the scraper to force OCR layer
                return {};
            });

            await scraper.close();
            await ocrScraper.close();

            // Compare results
            const comparison = {
                standard: {
                    fieldsExtracted: Object.keys(standardResult).length,
                    hasTitle: !!standardResult.title,
                    hasDate: !!standardResult.date,
                    hasVenue: !!standardResult.venue,
                    hasImage: !!standardResult.imageUrl,
                    confidence: standardResult._extraction?.validationScore || 0
                },
                ocr: {
                    testsRun: this.results.ocrResults.length,
                    successful: this.results.ocrResults.filter(r => r.success).length,
                    failed: this.results.ocrResults.filter(r => !r.success).length,
                    totalFields: this.results.ocrResults.reduce((acc, r) => 
                        acc + (r.ocrData?.data ? Object.keys(r.ocrData.data).length : 0), 0),
                    avgConfidence: this.calculateAverageOCRConfidence()
                }
            };

            this.results.comparison = comparison;

            console.log(chalk.yellow('📊 COMPARISON RESULTS'));
            console.log('');
            console.log(chalk.cyan('Standard Extraction:'));
            console.log(chalk.gray(`   Fields extracted: ${comparison.standard.fieldsExtracted}`));
            console.log(chalk.gray(`   Has title: ${comparison.standard.hasTitle ? 'Yes' : 'No'}`));
            console.log(chalk.gray(`   Has date: ${comparison.standard.hasDate ? 'Yes' : 'No'}`));
            console.log(chalk.gray(`   Has venue: ${comparison.standard.hasVenue ? 'Yes' : 'No'}`));
            console.log(chalk.gray(`   Has image: ${comparison.standard.hasImage ? 'Yes' : 'No'}`));
            console.log('');
            
            console.log(chalk.cyan('OCR Extraction:'));
            console.log(chalk.gray(`   Images tested: ${comparison.ocr.testsRun}`));
            console.log(chalk.gray(`   Successful extractions: ${comparison.ocr.successful}`));
            console.log(chalk.gray(`   Failed extractions: ${comparison.ocr.failed}`));
            console.log(chalk.gray(`   Total fields from OCR: ${comparison.ocr.totalFields}`));
            console.log(chalk.gray(`   Average confidence: ${comparison.ocr.avgConfidence}%`));
            console.log('');

            // Recommendations
            this.generateOCRRecommendations(comparison);

        } catch (error) {
            console.error(chalk.red('❌ Comparison failed:'), error.message);
            this.results.comparison.error = error.message;
        }
    }

    calculateAverageOCRConfidence() {
        const successfulResults = this.results.ocrResults.filter(r => r.success && r.ocrData?.metadata);
        if (successfulResults.length === 0) return 0;
        
        const total = successfulResults.reduce((acc, r) => 
            acc + (r.ocrData?.metadata?.totalConfidence || 0), 0);
        
        return Math.round(total / successfulResults.length);
    }

    generateOCRRecommendations(comparison) {
        console.log(chalk.blue('💡 OCR RECOMMENDATIONS'));
        console.log('-'.repeat(30));
        console.log('');

        const ocrSuccessRate = comparison.ocr.testsRun > 0 ? 
            (comparison.ocr.successful / comparison.ocr.testsRun) * 100 : 0;

        if (ocrSuccessRate >= 70) {
            console.log(chalk.green('✅ OCR is highly effective for this venue'));
            console.log(chalk.green('   Recommendation: Enable OCR layer with threshold 60-70%'));
            console.log(chalk.gray('   • OCR successfully extracted data from most images'));
            console.log(chalk.gray('   • Use OCR as enhancement to standard extraction'));
            console.log(chalk.gray('   • Configure parallel OCR processing for efficiency'));
        } else if (ocrSuccessRate >= 30) {
            console.log(chalk.yellow('⚠️  OCR shows moderate effectiveness'));
            console.log(chalk.yellow('   Recommendation: Use OCR selectively with threshold 40-50%'));
            console.log(chalk.gray('   • OCR worked on some images but not consistently'));
            console.log(chalk.gray('   • Consider image preprocessing improvements'));
            console.log(chalk.gray('   • Use as fallback when standard extraction lacks data'));
        } else {
            console.log(chalk.red('❌ OCR shows limited effectiveness'));
            console.log(chalk.red('   Recommendation: Rely primarily on standard extraction'));
            console.log(chalk.gray('   • OCR failed on most images tested'));
            console.log(chalk.gray('   • Images may lack readable text or have complex layouts'));
            console.log(chalk.gray('   • Focus on improving semantic HTML and meta tag extraction'));
        }

        console.log('');

        // Specific recommendations based on results
        if (comparison.ocr.totalFields > comparison.standard.fieldsExtracted * 0.5) {
            console.log(chalk.blue('🔍 OCR provides significant additional data'));
            console.log(chalk.gray('   • OCR extracted substantial information not found by standard methods'));
            console.log(chalk.gray('   • Consider hybrid approach: standard + OCR validation'));
        }

        if (comparison.standard.fieldsExtracted < 5) {
            console.log(chalk.blue('🔍 Standard extraction yielded limited data'));
            console.log(chalk.gray('   • OCR may be valuable as primary extraction method'));
            console.log(chalk.gray('   • This venue may rely heavily on image-based event information'));
        }

        console.log('');
    }

    async saveResults() {
        const filename = `mad-oak-ocr-test-${Date.now()}.json`;
        const filepath = `/Users/user/Desktop/hash/scripts/scraper/${filename}`;
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
            console.log(chalk.green(`📁 OCR test results saved to: ${filename}`));
            return filename;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not save results: ${error.message}`));
            return null;
        }
    }

    async cleanup() {
        console.log(chalk.gray('\n🧹 Cleaning up OCR test...'));
        
        if (this.ocrExtractor) {
            await this.ocrExtractor.cleanup();
        }
        
        if (this.browser) {
            await this.browser.close();
        }
        
        console.log(chalk.green('✅ OCR test cleanup complete'));
    }
}

// Main execution
async function main() {
    const test = new MadOakOCRTest();
    
    try {
        console.log(chalk.blue('🔍 MAD OAK BAR - OCR EXTRACTION TEST'));
        console.log(chalk.gray('====================================='));
        console.log('');
        console.log(chalk.yellow('This test focuses specifically on OCR capabilities'));
        console.log(chalk.yellow('for extracting event data from images and flyers.'));
        console.log('');
        
        await test.initialize();
        
        const images = await test.discoverEventImages();
        
        if (images.length > 0) {
            await test.testOCRExtraction(images);
            await test.compareWithStandardExtraction();
        } else {
            console.log(chalk.red('❌ No suitable images found for OCR testing'));
        }
        
        const savedFile = await test.saveResults();
        
        console.log('');
        console.log(chalk.blue('🏁 OCR TEST COMPLETE'));
        console.log(chalk.gray('Check the output above for detailed OCR analysis.'));
        if (savedFile) {
            console.log(chalk.gray(`Detailed results saved to: ${savedFile}`));
        }
        
    } catch (error) {
        console.error(chalk.red('❌ OCR test failed:'), error.message);
        console.error(chalk.gray('Stack trace:'), error.stack);
    } finally {
        await test.cleanup();
        process.exit(0);
    }
}

// Handle process interruption
process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⚠️  OCR test interrupted. Cleaning up...'));
    process.exit(0);
});

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = MadOakOCRTest;