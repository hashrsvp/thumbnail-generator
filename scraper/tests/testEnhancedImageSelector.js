#!/usr/bin/env node

/**
 * Test Enhanced ImageSelector with OCR Capabilities
 * 
 * Tests the new OCR suitability filtering and flyer text extraction features
 */

const ImageSelector = require('../utils/imageSelector');
const chalk = require('chalk');

async function testEnhancedImageSelector() {
    console.log(chalk.blue.bold('\n🧪 Testing Enhanced ImageSelector with OCR Capabilities'));
    console.log(chalk.gray('━'.repeat(80)));
    
    const imageSelector = new ImageSelector();
    
    // Sample event images with varying OCR suitability
    const testImages = [
        // Good OCR candidates
        'https://eventbrite.com/events/12345/featured-image-800x600.png',
        'https://cdn.example.com/event-flyers/concert-lineup-details-1024x768.jpg',
        'https://images.eventful.com/high-res-poster-information-schedule.png',
        
        // Medium OCR candidates
        'https://venue.com/event-images/show-banner-600x400.jpg',
        'https://social.example.com/og-image-event-details.png',
        
        // Poor OCR candidates
        'https://cdn.example.com/thumbnails/event-thumb-150x150.jpg',
        'https://images.com/small-icon-64x64.png',
        'https://example.com/blurry-low-quality-photo.jpg'
    ];
    
    try {
        console.log(chalk.cyan('\n1️⃣ Testing OCR Suitability Analysis'));
        console.log(chalk.gray('─'.repeat(50)));
        
        for (let i = 0; i < testImages.length; i++) {
            const url = testImages[i];
            console.log(chalk.white(`\nImage ${i + 1}: ${url.split('/').pop()}`));
            
            try {
                const analysis = await imageSelector.analyzeOCRSuitability(url);
                
                console.log(chalk.gray(`   OCR Score: ${analysis.score}/100`));
                console.log(chalk.gray(`   Suitable: ${analysis.isOCRSuitable ? '✅ Yes' : '❌ No'}`));
                console.log(chalk.gray(`   Reasons: ${analysis.reasons.join(', ')}`));
                
            } catch (error) {
                console.log(chalk.red(`   ❌ Analysis failed: ${error.message}`));
            }
        }
        
        console.log(chalk.cyan('\n2️⃣ Testing OCR Suitability Filtering'));
        console.log(chalk.gray('─'.repeat(50)));
        
        const suitableImages = await imageSelector.filterImagesByOCRSuitability(testImages, 60);
        console.log(chalk.green(`\n✅ Found ${suitableImages.length} OCR-suitable images out of ${testImages.length}`));
        
        for (const img of suitableImages) {
            console.log(chalk.gray(`   • ${img.url.split('/').pop()} (score: ${img.ocrScore})`));
        }
        
        console.log(chalk.cyan('\n3️⃣ Testing Best Image Selection with OCR'));
        console.log(chalk.gray('─'.repeat(50)));
        
        const bestImage = await imageSelector.selectBestImage(testImages, 'Summer Music Festival', 'Austin Convention Center', {
            includeOCRAnalysis: true
        });
        
        if (bestImage) {
            console.log(chalk.green(`✅ Best overall image: ${bestImage.split('/').pop()}`));
        } else {
            console.log(chalk.yellow(`⚠️ No suitable image found`));
        }
        
        console.log(chalk.cyan('\n4️⃣ Testing Best OCR Image Selection'));
        console.log(chalk.gray('─'.repeat(50)));
        
        const bestOCRImage = await imageSelector.selectBestImageForOCR(testImages, 'Summer Music Festival', 'Austin Convention Center');
        
        if (bestOCRImage) {
            console.log(chalk.green(`✅ Best OCR image: ${bestOCRImage.split('/').pop()}`));
        } else {
            console.log(chalk.yellow(`⚠️ No OCR-suitable image found`));
        }
        
        console.log(chalk.cyan('\n5️⃣ Testing Debug Analysis'));
        console.log(chalk.gray('─'.repeat(50)));
        
        // Test with first 3 images only for detailed debug
        await imageSelector.debugImageSelection(testImages.slice(0, 3), 'Summer Music Festival', 'Austin Convention Center');
        
        console.log(chalk.green.bold('\n🎉 Enhanced ImageSelector Tests Completed Successfully!'));
        console.log(chalk.gray('\nNew OCR features available:'));
        console.log(chalk.gray('• analyzeOCRSuitability() - Analyze image for OCR potential'));
        console.log(chalk.gray('• filterImagesByOCRSuitability() - Filter images by OCR score'));
        console.log(chalk.gray('• selectBestImageForOCR() - Select optimal image for text extraction'));
        console.log(chalk.gray('• extractTextFromBestImage() - Full OCR workflow'));
        console.log(chalk.gray('• Enhanced scoring with OCR analysis integration'));
        
    } catch (error) {
        console.error(chalk.red(`❌ Test failed: ${error.message}`));
        console.error(error.stack);
    }
}

// Run tests if called directly
if (require.main === module) {
    testEnhancedImageSelector()
        .then(() => {
            console.log(chalk.blue('\n✅ Tests completed'));
            process.exit(0);
        })
        .catch((error) => {
            console.error(chalk.red('\n❌ Tests failed:'), error);
            process.exit(1);
        });
}

module.exports = { testEnhancedImageSelector };