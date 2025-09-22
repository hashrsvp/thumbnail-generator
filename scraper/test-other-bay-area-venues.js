#!/usr/bin/env node

/**
 * Quick Tests: Additional Bay Area Venues
 * 
 * Fast assessment of:
 * 1. 1015 Folsom - Electronic music club
 * 2. Great American Music Hall - Historic venue  
 * 3. Cobbs Comedy Club - Comedy venue
 * 
 * Focus on rapid platform assessment rather than comprehensive extraction
 */

const EventScraper = require("./improved-event-scraper-2");
const chalk = require('chalk');
const fs = require('fs');

async function testOtherVenues() {
    const scraper = new EventScraper({
        headless: true, // Run headless for speed
        timeout: 15000, // Shorter timeout
        debug: false, // Reduce debug output
        verbose: false
    });
    
    const venues = [
        {
            name: '1015 Folsom',
            url: 'https://1015.com/#calendar',
            address: '1015 Folsom St, San Francisco, CA 94103, United States',
            platform: 'Custom',
            category: 'Electronic Music/Nightlife'
        },
        {
            name: 'Great American Music Hall',
            url: 'https://gamh.com/calendar/',
            address: '859 O\'Farrell St, San Francisco, CA 94109, United States',
            platform: 'Custom',
            category: 'Music'
        },
        {
            name: 'Cobbs Comedy Club',
            url: 'https://www.cobbscomedy.com/',
            address: '915 Columbus Ave, San Francisco, CA 94133, United States',
            platform: 'Custom',
            category: 'Comedy'
        }
    ];
    
    const results = [];
    
    console.log(chalk.blue.bold('\n🚀 Quick Bay Area Venue Assessment\n'));
    console.log(chalk.gray('Running rapid platform compatibility tests...\n'));
    
    try {
        for (let i = 0; i < venues.length; i++) {
            const venue = venues[i];
            console.log(chalk.cyan(`[${i + 1}/${venues.length}] Testing ${venue.name}...`));
            console.log(chalk.gray(`   Platform: ${venue.platform} | Category: ${venue.category}`));
            console.log(chalk.gray(`   URL: ${venue.url}`));
            
            const venueResult = {
                venue: venue,
                test: {
                    success: false,
                    extractedData: null,
                    processingTime: 0,
                    extractionMethod: null,
                    confidence: 0,
                    errors: []
                },
                assessment: {
                    platformCompatibility: 'unknown',
                    dataQualityScore: 0,
                    hashCompliance: 0,
                    recommendations: []
                }
            };
            
            const startTime = Date.now();
            
            try {
                // Quick single event extraction
                const eventData = await scraper.scrapeEvent(venue.url);
                
                venueResult.test = {
                    success: !!(eventData && eventData.title),
                    extractedData: eventData,
                    processingTime: Date.now() - startTime,
                    extractionMethod: eventData._extraction?.method || 'unknown',
                    confidence: calculateQuickConfidence(eventData),
                    errors: []
                };
                
                // Quick assessment
                venueResult.assessment = assessVenueQuickly(eventData, venue);
                
                console.log(chalk.green(`   ✅ Success: ${venueResult.test.success}`));
                console.log(chalk.gray(`   Title: "${eventData.title || 'None'}"`));
                console.log(chalk.gray(`   Method: ${venueResult.test.extractionMethod}`));
                console.log(chalk.gray(`   Confidence: ${venueResult.test.confidence}%`));
                console.log(chalk.gray(`   Time: ${venueResult.test.processingTime}ms`));
                console.log(chalk.gray(`   Platform: ${venueResult.assessment.platformCompatibility}`));
                
            } catch (error) {
                console.error(chalk.red(`   ❌ Failed: ${error.message}`));
                venueResult.test.errors.push(error.message);
                venueResult.test.processingTime = Date.now() - startTime;
            }
            
            results.push(venueResult);
            console.log(''); // Space between venues
        }
        
        // Generate summary
        console.log(chalk.blue.bold('📊 Quick Assessment Summary:\n'));
        
        const successful = results.filter(r => r.test.success).length;
        const total = results.length;
        const successRate = Math.round((successful / total) * 100);
        
        console.log(chalk.green(`Success Rate: ${successful}/${total} venues (${successRate}%)`));
        
        // Average metrics
        const successfulResults = results.filter(r => r.test.success);
        if (successfulResults.length > 0) {
            const avgConfidence = Math.round(
                successfulResults.map(r => r.test.confidence).reduce((a, b) => a + b, 0) / successfulResults.length
            );
            const avgTime = Math.round(
                successfulResults.map(r => r.test.processingTime).reduce((a, b) => a + b, 0) / successfulResults.length
            );
            
            console.log(chalk.green(`Average Confidence: ${avgConfidence}%`));
            console.log(chalk.green(`Average Processing Time: ${avgTime}ms`));
        }
        
        // Platform compatibility
        console.log(chalk.blue('\n🏛️ Platform Compatibility:'));
        results.forEach(result => {
            const status = result.test.success ? '✅' : '❌';
            console.log(chalk.gray(`   ${status} ${result.venue.name}: ${result.assessment.platformCompatibility}`));
        });
        
        // Category mapping assessment
        console.log(chalk.blue('\n🏷️ Category Mapping:'));
        results.forEach(result => {
            if (result.test.extractedData?.categories) {
                const categories = result.test.extractedData.categories.join(', ');
                const expected = result.venue.category;
                console.log(chalk.gray(`   ${result.venue.name}: [${categories}] (expected: ${expected})`));
            } else {
                console.log(chalk.gray(`   ${result.venue.name}: No categories extracted`));
            }
        });
        
        // Recommendations
        console.log(chalk.blue.bold('\n📝 Deployment Recommendations:\n'));
        
        if (successRate < 70) {
            console.log(chalk.yellow('🔥 CRITICAL: Low success rate across Bay Area custom venues'));
            console.log(chalk.yellow('   Recommendation: Develop venue-specific extraction patterns'));
        }
        
        const avgConfidenceAll = results
            .filter(r => r.test.success)
            .map(r => r.test.confidence)
            .reduce((a, b, _, arr) => a + b / arr.length, 0);
            
        if (avgConfidenceAll < 60) {
            console.log(chalk.yellow('🔥 CRITICAL: Low confidence scores'));
            console.log(chalk.yellow('   Recommendation: Improve extraction patterns for custom platforms'));
        }
        
        // Platform-specific recommendations
        const customVenues = results.filter(r => r.venue.platform === 'Custom');
        const customSuccess = customVenues.filter(r => r.test.success).length;
        
        if (customSuccess < customVenues.length) {
            console.log(chalk.yellow('⚠️  Custom platform support needs improvement'));
            console.log(chalk.yellow(`   ${customSuccess}/${customVenues.length} custom venues successful`));
        }
        
        // Electronic music specific
        const electronicVenue = results.find(r => r.venue.category.includes('Electronic'));
        if (electronicVenue && !electronicVenue.test.success) {
            console.log(chalk.yellow('⚠️  Electronic music venue (1015 Folsom) needs specific attention'));
            console.log(chalk.yellow('   Recommendation: Implement calendar widget parsing'));
        }
        
        // Comedy specific
        const comedyVenue = results.find(r => r.venue.category.includes('Comedy'));
        if (comedyVenue && !comedyVenue.test.success) {
            console.log(chalk.yellow('⚠️  Comedy venue (Cobbs) needs specific attention'));
            console.log(chalk.yellow('   Recommendation: Implement multiple shows per night parsing'));
        }
        
        // Save results
        const filename = `bay-area-other-venues-test-${Date.now()}.json`;
        fs.writeFileSync(filename, JSON.stringify({
            timestamp: new Date().toISOString(),
            testType: 'Quick Bay Area Assessment',
            summary: {
                successRate,
                averageConfidence: Math.round(avgConfidenceAll),
                totalVenues: total,
                successfulVenues: successful
            },
            results: results
        }, null, 2));
        
        console.log(chalk.gray(`\n📄 Results saved to: ${filename}`));
        
    } catch (error) {
        console.error(chalk.red('\n💥 Test suite failed:'), error.message);
    } finally {
        await scraper.closeBrowser();
        console.log(chalk.gray('🔒 Browser closed\n'));
    }
}

function calculateQuickConfidence(data) {
    if (!data) return 0;
    
    let score = 0;
    let checks = 0;
    
    // Title check
    if (data.title && data.title.trim() && data.title !== 'Untitled Event') {
        score += 30;
    }
    checks += 30;
    
    // Date check
    if (data.date) {
        score += 25;
    }
    checks += 25;
    
    // Venue check
    if (data.venue && data.venue.trim() && data.venue !== 'Venue TBD') {
        score += 20;
    }
    checks += 20;
    
    // Address check
    if (data.address && data.address.trim() && data.address !== 'Address TBD') {
        score += 15;
        if (data.address.includes(',')) score += 5;
    }
    checks += 20;
    
    // Categories check
    if (data.categories && data.categories.length > 0) {
        score += 10;
    }
    checks += 10;
    
    return checks > 0 ? Math.round((score / checks) * 100) : 0;
}

function assessVenueQuickly(data, venue) {
    const assessment = {
        platformCompatibility: 'unknown',
        dataQualityScore: 0,
        hashCompliance: 0,
        recommendations: []
    };
    
    if (!data) {
        assessment.platformCompatibility = 'incompatible';
        assessment.recommendations.push('Unable to extract any data - needs custom patterns');
        return assessment;
    }
    
    // Platform compatibility
    if (data.title && data.title !== 'Untitled Event') {
        assessment.platformCompatibility = 'good';
    } else if (data.date || data.venue) {
        assessment.platformCompatibility = 'partial';
    } else {
        assessment.platformCompatibility = 'poor';
    }
    
    // Data quality score
    assessment.dataQualityScore = calculateQuickConfidence(data);
    
    // Hash compliance check
    let compliantFields = 0;
    if (data.title && data.title !== 'Untitled Event') compliantFields++;
    if (data.date && data.startTime) compliantFields++;
    if (data.venue && data.venue !== 'Venue TBD') compliantFields++;
    if (data.address && data.address.includes(',') && data.address !== 'Address TBD') compliantFields++;
    if (data.categories && data.categories.length > 0) compliantFields++;
    
    assessment.hashCompliance = Math.round((compliantFields / 5) * 100);
    
    // Generate recommendations
    if (assessment.dataQualityScore < 50) {
        assessment.recommendations.push('Needs custom extraction patterns for this platform');
    }
    
    if (assessment.hashCompliance < 80) {
        assessment.recommendations.push('Improve Hash app compliance formatting');
    }
    
    if (venue.platform === 'Custom' && assessment.platformCompatibility === 'poor') {
        assessment.recommendations.push(`Develop ${venue.name}-specific selectors`);
    }
    
    return assessment;
}

// Run the test
if (require.main === module) {
    testOtherVenues().catch(console.error);
}

module.exports = testOtherVenues;