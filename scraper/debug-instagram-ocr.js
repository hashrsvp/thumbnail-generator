#!/usr/bin/env node

/**
 * Debug Instagram OCR Trigger Issue
 * 
 * Tests the specific Instagram URL to understand why OCR (Layer 6) didn't trigger
 * and analyzes the confidence scores from each layer.
 */

const SimpleEventScraper = require('../../functions/scraperSimple');
const chalk = require('chalk');

async function debugInstagramOCR() {
    const scraper = new SimpleEventScraper();
    const instagramUrl = 'https://www.instagram.com/p/DN_yDCcEjzt/?hl=en';
    
    console.log(chalk.blue('🔍 DEBUG: Testing Instagram URL for OCR trigger issue'));
    console.log(chalk.gray(`📍 URL: ${instagramUrl}`));
    console.log(chalk.gray(`🎯 OCR Trigger Threshold: 70% (should trigger if overall confidence < 70%)`));
    console.log('');
    
    try {
        // Test the Instagram-specific extraction
        console.log(chalk.cyan('📸 Testing Instagram-specific extraction...'));
        const result = await scraper.scrapeEvent(instagramUrl);
        
        console.log(chalk.green('✅ Extraction Results:'));
        console.log(chalk.gray('Title:'), result.title || 'N/A');
        console.log(chalk.gray('Venue:'), result.venue || 'N/A');
        console.log(chalk.gray('Date:'), result.date || 'N/A');
        console.log(chalk.gray('Categories:'), JSON.stringify(result.categories || []));
        console.log(chalk.gray('Free:'), result.free);
        console.log(chalk.gray('Image URLs:'), result.imageUrls ? result.imageUrls.length : 0);
        console.log(chalk.gray('Extraction Method:'), result.extractionMethod || 'unknown');
        console.log(chalk.gray('Platform:'), result.platform || 'unknown');
        console.log('');
        
        // Analyze why only "Untitled Event" was extracted
        if (result.title === 'Untitled Event' || result.title === 'Instagram Event') {
            console.log(chalk.red('❌ ISSUE IDENTIFIED: Poor title extraction'));
            console.log(chalk.yellow('   • Instagram extraction returned generic title'));
            console.log(chalk.yellow('   • This suggests Instagram content was not properly parsed'));
            console.log('');
        }
        
        if (result.categories && result.categories.includes('Music') && result.categories.length === 1) {
            console.log(chalk.red('❌ ISSUE IDENTIFIED: Fallback category used'));
            console.log(chalk.yellow('   • Only "Music" category suggests fallback logic was used'));
            console.log(chalk.yellow('   • Real categories weren\'t extracted from content'));
            console.log('');
        }
        
        // Check if we have images but poor metadata
        if (result.imageUrls && result.imageUrls.length > 0) {
            console.log(chalk.green('✅ Images were found:'));
            result.imageUrls.forEach((url, i) => {
                console.log(chalk.gray(`   [${i + 1}] ${url.substring(0, 80)}...`));
            });
            console.log('');
            
            console.log(chalk.yellow('🤔 ANALYSIS: Images were extracted but OCR didn\'t run'));
            console.log(chalk.yellow('   • This suggests confidence from other layers was >= 70%'));
            console.log(chalk.yellow('   • But the results are poor (generic title, fallback category)'));
            console.log(chalk.yellow('   • This indicates a false positive in confidence calculation'));
            console.log('');
        }
        
        // Simulate what the confidence calculation might be doing wrong
        console.log(chalk.magenta('🔍 CONFIDENCE ANALYSIS:'));
        
        // If we found a venue name
        if (result.venue && result.venue !== 'TBD') {
            console.log(chalk.gray(`   • Venue found: "${result.venue}" - might give high confidence`));
        }
        
        // If we found a date
        if (result.date) {
            console.log(chalk.gray(`   • Date found: "${result.date}" - might give high confidence`));
        }
        
        // If we found images
        if (result.imageUrls && result.imageUrls.length > 0) {
            console.log(chalk.gray(`   • ${result.imageUrls.length} images found - might contribute to confidence`));
        }
        
        // But actual quality is poor
        if (result.title === 'Untitled Event' || result.title === 'Instagram Event') {
            console.log(chalk.red('   • BUT: Title extraction failed - confidence calculation may be flawed'));
        }
        
        console.log('');
        console.log(chalk.blue('💡 HYPOTHESIS:'));
        console.log(chalk.yellow('   1. Instagram meta tags provide some structured data'));
        console.log(chalk.yellow('   2. Image extraction succeeds (finds Instagram post images)'));
        console.log(chalk.yellow('   3. These give false confidence scores >= 70%'));
        console.log(chalk.yellow('   4. OCR layer never triggers despite poor actual extraction'));
        console.log(chalk.yellow('   5. Result: "Untitled Event" with fallback "Music" category'));
        console.log('');
        
    } catch (error) {
        console.error(chalk.red('❌ Error during Instagram scraping:'), error.message);
        console.error(chalk.gray('Stack:'), error.stack);
    }
}

// Enhanced debug with confidence tracking
async function debugWithConfidenceTracking() {
    console.log(chalk.blue('\n🧪 ENHANCED DEBUG: Manual confidence calculation simulation'));
    console.log('');
    
    // Simulate what each layer might extract from Instagram
    const mockLayerResults = {
        1: { // Structured Data Layer  
            data: { imageUrls: ['https://instagram.com/some-image.jpg'] },
            confidence: { imageUrls: 85 } // High confidence for meta tag images
        },
        2: { // Meta Tag Layer
            data: { 
                title: 'Instagram Post', 
                description: 'Some description',
                imageUrl: 'https://instagram.com/meta-image.jpg'
            },
            confidence: { 
                title: 70,  // Medium confidence for og:title
                description: 60,
                imageUrl: 85
            }
        },
        3: { // Semantic HTML Layer
            data: { venue: 'Instagram' }, // Might extract from page structure
            confidence: { venue: 50 } // Low confidence
        },
        4: { // Text Pattern Layer  
            data: {},
            confidence: {}
        },
        5: { // Content Analysis Layer
            data: { categories: ['Music'] }, // Fallback
            confidence: { categories: 40 }
        }
    };
    
    console.log(chalk.cyan('📊 Simulated Layer Results:'));
    Object.entries(mockLayerResults).forEach(([layer, result]) => {
        console.log(chalk.gray(`   Layer ${layer}:`), 
            `data keys: ${Object.keys(result.data).join(', ') || 'none'}`,
            `confidence: ${JSON.stringify(result.confidence)}`
        );
    });
    console.log('');
    
    // Calculate overall confidence (simplified)
    const allConfidences = Object.values(mockLayerResults)
        .map(layer => Object.values(layer.confidence))
        .flat()
        .filter(conf => typeof conf === 'number');
    
    const avgConfidence = allConfidences.length > 0 
        ? allConfidences.reduce((sum, conf) => sum + conf, 0) / allConfidences.length 
        : 0;
    
    console.log(chalk.yellow(`🎯 Calculated Average Confidence: ${avgConfidence.toFixed(1)}%`));
    console.log(chalk.yellow(`🎯 OCR Trigger Threshold: 70%`));
    
    if (avgConfidence >= 70) {
        console.log(chalk.red('❌ PROBLEM IDENTIFIED:'));
        console.log(chalk.red(`   • Average confidence (${avgConfidence.toFixed(1)}%) >= 70%`));
        console.log(chalk.red('   • OCR layer will NOT trigger'));
        console.log(chalk.red('   • But actual extraction quality is poor'));
        console.log('');
        
        console.log(chalk.blue('🔧 ROOT CAUSE:'));
        console.log(chalk.yellow('   • Meta tag extraction gives high confidence for images (85%)'));
        console.log(chalk.yellow('   • Meta tag extraction gives medium confidence for title (70%)'));
        console.log(chalk.yellow('   • This inflates overall confidence despite poor actual content'));
        console.log(chalk.yellow('   • Instagram meta tags don\'t contain actual event details'));
        console.log('');
        
        console.log(chalk.green('✅ SOLUTIONS:'));
        console.log(chalk.cyan('   1. Lower OCR trigger threshold to 60% for social media sites'));
        console.log(chalk.cyan('   2. Add quality validation - check if title is generic'));
        console.log(chalk.cyan('   3. Reduce confidence for social media meta tags'));
        console.log(chalk.cyan('   4. Add Instagram-specific patterns for event detection'));
        console.log(chalk.cyan('   5. Always run OCR if images are found but title is generic'));
    } else {
        console.log(chalk.green(`✅ OCR would trigger (confidence ${avgConfidence.toFixed(1)}% < 70%)`));
    }
}

async function main() {
    try {
        await debugInstagramOCR();
        await debugWithConfidenceTracking();
        
        console.log(chalk.green('\n✅ Debug analysis complete'));
        console.log(chalk.blue('📋 Next steps:'));
        console.log(chalk.gray('   1. Review confidence calculation logic'));
        console.log(chalk.gray('   2. Test OCR threshold adjustment'));
        console.log(chalk.gray('   3. Improve Instagram-specific extraction'));
        
    } catch (error) {
        console.error(chalk.red('❌ Debug failed:'), error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { debugInstagramOCR, debugWithConfidenceTracking };