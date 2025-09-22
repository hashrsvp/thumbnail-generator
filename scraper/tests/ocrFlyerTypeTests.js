#!/usr/bin/env node

/**
 * OCR Flyer Type Tests - Extension for OCRTestFramework
 * 
 * Specialized tests for different types of event flyers:
 * - Concert and music event flyers
 * - Nightlife and club event flyers  
 * - Comedy show flyers
 * - Sports event flyers
 * - Food event flyers
 * 
 * Tests specific text patterns, layout recognition, and extraction accuracy
 * for each flyer type.
 */

const chalk = require('chalk');
const path = require('path');
const { getFlyerTypeConfig } = require('./ocrTestConfig');

class OCRFlyerTypeTests {
    constructor(ocrFramework) {
        this.ocrFramework = ocrFramework;
        this.config = ocrFramework.config;
        this.results = {
            byFlyerType: {},
            patternMatchResults: {},
            qualityScores: {}
        };
        
        this.log = this.config.verbose ? console.log : () => {};
    }
    
    /**
     * Run all flyer type specific tests
     */
    async runAllFlyerTypeTests() {
        const flyerTypes = ['concert', 'nightlife', 'comedy', 'sports', 'food'];
        
        for (const flyerType of flyerTypes) {
            try {
                console.log(chalk.cyan(`   Testing ${flyerType} flyers...`));
                await this.runFlyerTypeTest(flyerType);
            } catch (error) {
                console.error(chalk.red(`   ❌ ${flyerType} flyer tests failed: ${error.message}`));
                this.results.byFlyerType[flyerType] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        return this.results;
    }
    
    /**
     * Run tests for a specific flyer type
     */
    async runFlyerTypeTest(flyerType) {
        const typeConfig = getFlyerTypeConfig(flyerType);
        const testImages = await this.loadFlyerTypeTestImages(flyerType);
        
        const typeResults = {
            totalTests: testImages.length,
            passed: 0,
            failed: 0,
            elementExtractionResults: {},
            patternMatchResults: {},
            qualityScore: 0
        };
        
        for (const testImage of testImages) {
            try {
                this.log(chalk.gray(`     Processing: ${testImage.name}`));
                
                const result = await this.testFlyerTypeExtraction(testImage, typeConfig);
                
                if (result.passed) {
                    typeResults.passed++;
                } else {
                    typeResults.failed++;
                }
                
                typeResults.elementExtractionResults[testImage.name] = result;
                
            } catch (error) {
                typeResults.failed++;
                typeResults.elementExtractionResults[testImage.name] = {
                    passed: false,
                    error: error.message
                };
            }
        }
        
        // Calculate overall quality score for this flyer type
        typeResults.qualityScore = this.calculateFlyerTypeQuality(typeResults, typeConfig);
        
        this.results.byFlyerType[flyerType] = typeResults;
        
        this.log(chalk.green(`     ✅ ${flyerType}: ${typeResults.passed}/${typeResults.totalTests} passed (Quality: ${typeResults.qualityScore.toFixed(1)}%)`));
    }
    
    /**
     * Test OCR extraction for a specific flyer type
     */
    async testFlyerTypeExtraction(testImage, typeConfig) {
        // Extract text using OCR
        const ocrResult = await this.ocrFramework.extractTextFromImage(testImage.path);
        
        // Test element extraction based on flyer type expectations
        const elementResults = this.testElementExtraction(ocrResult, typeConfig.expectedElements, testImage.expectedData);
        
        // Test pattern matching
        const patternResults = this.testPatternMatching(ocrResult.text, typeConfig.commonTextPatterns);
        
        // Calculate quality indicators
        const qualityScore = this.calculateImageQualityScore(ocrResult, typeConfig.qualityIndicators);
        
        // Determine if test passed
        const passed = this.evaluateFlyerTypeTestResult(elementResults, patternResults, qualityScore, typeConfig);
        
        return {
            passed,
            ocrResult,
            elementResults,
            patternResults,
            qualityScore,
            confidence: ocrResult.confidence
        };
    }
    
    /**
     * Test extraction of expected elements for flyer type
     */
    testElementExtraction(ocrResult, expectedElements, expectedData = {}) {
        const elementResults = {};
        
        for (const [elementName, requirements] of Object.entries(expectedElements)) {
            const extractionResult = this.extractElement(ocrResult, elementName, requirements, expectedData);
            elementResults[elementName] = extractionResult;
        }
        
        return elementResults;
    }
    
    /**
     * Extract a specific element from OCR result
     */
    extractElement(ocrResult, elementName, requirements, expectedData) {
        const result = {
            found: false,
            value: null,
            confidence: 0,
            meetsRequirements: false,
            accuracy: 0
        };
        
        // Define extraction strategies for different elements
        const extractors = {
            title: () => this.extractTitle(ocrResult),
            eventName: () => this.extractTitle(ocrResult),
            showTitle: () => this.extractTitle(ocrResult),
            artistName: () => this.extractArtistName(ocrResult),
            comedianNames: () => this.extractComedianNames(ocrResult),
            djNames: () => this.extractDJNames(ocrResult),
            teams: () => this.extractTeams(ocrResult),
            venue: () => this.extractVenue(ocrResult),
            date: () => this.extractDate(ocrResult),
            time: () => this.extractTime(ocrResult),
            gameTime: () => this.extractTime(ocrResult),
            showTimes: () => this.extractTime(ocrResult),
            price: () => this.extractPrice(ocrResult),
            ticketPrice: () => this.extractPrice(ocrResult),
            ticketInfo: () => this.extractPrice(ocrResult),
            ageRestriction: () => this.extractAgeRestriction(ocrResult),
            minimumAge: () => this.extractAgeRestriction(ocrResult),
            dresscode: () => this.extractDressCode(ocrResult),
            cuisine: () => this.extractCuisine(ocrResult),
            chef: () => this.extractChef(ocrResult)
        };
        
        const extractor = extractors[elementName] || (() => ({ value: null, confidence: 0 }));
        const extracted = extractor();
        
        if (extracted.value) {
            result.found = true;
            result.value = extracted.value;
            result.confidence = extracted.confidence;
            result.meetsRequirements = result.confidence >= requirements.confidence;
            
            // Calculate accuracy if expected data is available
            if (expectedData[elementName]) {
                result.accuracy = this.ocrFramework.calculateTextAccuracy(
                    extracted.value,
                    expectedData[elementName]
                );
            }
        }
        
        return result;
    }
    
    /**
     * Extract title/event name from OCR result
     */
    extractTitle(ocrResult) {
        // Look for the largest, highest confidence text (usually the title)
        let bestTitle = null;
        let bestScore = 0;
        
        for (const line of ocrResult.lines || []) {
            if (line.text.trim().length < 3) continue;
            
            // Score based on font size (bbox height), confidence, and position
            const fontScore = (line.bbox?.height || 10) / 10;
            const confidenceScore = line.confidence / 100;
            const positionScore = line.bbox?.y0 < 200 ? 1.2 : 1.0; // Bonus for top area
            
            const totalScore = fontScore * confidenceScore * positionScore;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestTitle = line.text.trim();
            }
        }
        
        return {
            value: bestTitle,
            confidence: bestScore * 50 // Convert to percentage-like score
        };
    }
    
    /**
     * Extract artist names from concert flyers
     */
    extractArtistName(ocrResult) {
        const text = ocrResult.text;
        
        // Look for capitalized names that aren't venue names
        const artistPatterns = [
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g,
            /\b[A-Z]{2,}(?:\s+[A-Z]{2,})*\b/g // All caps bands
        ];
        
        const candidates = [];
        
        for (const pattern of artistPatterns) {
            const matches = text.match(pattern) || [];
            candidates.push(...matches);
        }
        
        // Filter out common venue-related words
        const venueWords = ['VENUE', 'THEATER', 'THEATRE', 'HALL', 'CENTER', 'CLUB', 'BAR'];
        const artists = candidates.filter(candidate => 
            !venueWords.some(word => candidate.toUpperCase().includes(word))
        );
        
        return {
            value: artists.length > 0 ? artists[0] : null,
            confidence: artists.length > 0 ? 75 : 0
        };
    }
    
    /**
     * Extract DJ names from nightlife flyers
     */
    extractDJNames(ocrResult) {
        const text = ocrResult.text;
        const djPattern = /\bDJ\s+([A-Za-z\s]+?)(?=\n|$|\s{3,})/gi;
        const matches = text.match(djPattern);
        
        if (matches && matches.length > 0) {
            const djName = matches[0].trim();
            return {
                value: djName,
                confidence: 85
            };
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract comedian names from comedy flyers
     */
    extractComedianNames(ocrResult) {
        // Similar to artist extraction but look for comedy-related context
        const result = this.extractArtistName(ocrResult);
        
        // Boost confidence if comedy-related words are nearby
        const text = ocrResult.text.toLowerCase();
        if (text.includes('comedy') || text.includes('standup') || text.includes('comedian')) {
            result.confidence = Math.min(95, result.confidence + 15);
        }
        
        return result;
    }
    
    /**
     * Extract team names from sports flyers
     */
    extractTeams(ocrResult) {
        const text = ocrResult.text;
        
        // Look for "Team A vs Team B" or "Team A @ Team B" patterns
        const teamPatterns = [
            /([A-Za-z\s]+?)\s+(?:vs?\.?|@|at)\s+([A-Za-z\s]+)/gi,
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:vs?\.?|@)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g
        ];
        
        for (const pattern of teamPatterns) {
            const match = text.match(pattern);
            if (match) {
                return {
                    value: match[0].trim(),
                    confidence: 90
                };
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract venue information
     */
    extractVenue(ocrResult) {
        const structured = ocrResult.structured;
        if (structured && structured.addresses && structured.addresses.length > 0) {
            return {
                value: structured.addresses[0],
                confidence: 80
            };
        }
        
        // Look for venue-related keywords
        const text = ocrResult.text;
        const venuePatterns = [
            /\b([A-Za-z\s]+(?:Theater|Theatre|Hall|Center|Club|Bar|Arena|Stadium))\b/gi,
            /(?:at|@)\s+([A-Za-z\s]+)/gi
        ];
        
        for (const pattern of venuePatterns) {
            const match = text.match(pattern);
            if (match) {
                return {
                    value: match[0].replace(/^(at|@)\s+/i, '').trim(),
                    confidence: 75
                };
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract date information
     */
    extractDate(ocrResult) {
        const structured = ocrResult.structured;
        if (structured && structured.dates && structured.dates.length > 0) {
            return {
                value: structured.dates[0],
                confidence: 90
            };
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract time information
     */
    extractTime(ocrResult) {
        const structured = ocrResult.structured;
        if (structured && structured.times && structured.times.length > 0) {
            return {
                value: structured.times[0],
                confidence: 85
            };
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract price information
     */
    extractPrice(ocrResult) {
        const structured = ocrResult.structured;
        if (structured && structured.prices && structured.prices.length > 0) {
            return {
                value: structured.prices[0],
                confidence: 90
            };
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract age restriction information
     */
    extractAgeRestriction(ocrResult) {
        const text = ocrResult.text;
        const agePatterns = [
            /\b(18\+|21\+|all\s*ages)\b/gi,
            /\b(over\s*\d+|\d+\s*and\s*up)\b/gi
        ];
        
        for (const pattern of agePatterns) {
            const match = text.match(pattern);
            if (match) {
                return {
                    value: match[0].trim(),
                    confidence: 85
                };
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract dress code information
     */
    extractDressCode(ocrResult) {
        const text = ocrResult.text.toLowerCase();
        const dressCodes = ['casual', 'formal', 'cocktail', 'black tie', 'business casual'];
        
        for (const dressCode of dressCodes) {
            if (text.includes(dressCode)) {
                return {
                    value: dressCode,
                    confidence: 75
                };
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract cuisine type from food event flyers
     */
    extractCuisine(ocrResult) {
        const text = ocrResult.text.toLowerCase();
        const cuisines = ['italian', 'mexican', 'asian', 'french', 'american', 'fusion', 'indian', 'thai', 'chinese', 'japanese'];
        
        for (const cuisine of cuisines) {
            if (text.includes(cuisine)) {
                return {
                    value: cuisine,
                    confidence: 80
                };
            }
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Extract chef information
     */
    extractChef(ocrResult) {
        const text = ocrResult.text;
        const chefPattern = /\bchef\s+([A-Za-z\s]+?)(?=\n|$|\s{3,})/gi;
        const match = text.match(chefPattern);
        
        if (match) {
            return {
                value: match[0].trim(),
                confidence: 85
            };
        }
        
        return { value: null, confidence: 0 };
    }
    
    /**
     * Test pattern matching for flyer type
     */
    testPatternMatching(text, patterns) {
        const results = {};
        
        for (const [patternName, pattern] of Object.entries(patterns)) {
            const matches = text.match(pattern) || [];
            results[patternName] = {
                matchCount: matches.length,
                matches: matches.slice(0, 5), // Limit to first 5 matches
                found: matches.length > 0
            };
        }
        
        return results;
    }
    
    /**
     * Calculate quality score based on quality indicators
     */
    calculateImageQualityScore(ocrResult, qualityIndicators) {
        let score = 0;
        const text = ocrResult.text.toLowerCase();
        
        for (const [indicator, points] of Object.entries(qualityIndicators)) {
            switch (indicator) {
                case 'hasLargeTitle':
                    if (ocrResult.lines?.some(line => line.bbox?.height > 30)) {
                        score += points;
                    }
                    break;
                    
                case 'hasMultipleArtists':
                    const artistCount = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).length;
                    if (artistCount > 2) score += points;
                    break;
                    
                case 'hasVenueInfo':
                    if (/\b(theater|theatre|hall|center|club|bar|arena|stadium)\b/i.test(text)) {
                        score += points;
                    }
                    break;
                    
                case 'hasTicketInfo':
                case 'hasPriceInfo':
                    if (/\$\d+|free|tickets?|admission/i.test(text)) {
                        score += points;
                    }
                    break;
                    
                case 'hasAgeRestriction':
                    if (/\b(18\+|21\+|all\s*ages)\b/i.test(text)) {
                        score += points;
                    }
                    break;
                    
                case 'hasContactInfo':
                    if (ocrResult.structured?.phoneNumbers?.length > 0 || 
                        ocrResult.structured?.emails?.length > 0) {
                        score += points;
                    }
                    break;
                    
                default:
                    // Generic text-based indicators
                    if (text.includes(indicator.toLowerCase())) {
                        score += points;
                    }
            }
        }
        
        return score;
    }
    
    /**
     * Evaluate if flyer type test result should pass
     */
    evaluateFlyerTypeTestResult(elementResults, patternResults, qualityScore, typeConfig) {
        let passCount = 0;
        let criticalCount = 0;
        let totalRequired = 0;
        
        // Check required elements
        for (const [elementName, requirements] of Object.entries(typeConfig.expectedElements)) {
            if (requirements.required) {
                totalRequired++;
                
                if (requirements.priority === 'critical') {
                    criticalCount++;
                }
                
                const result = elementResults[elementName];
                if (result && result.found && result.meetsRequirements) {
                    passCount++;
                }
            }
        }
        
        // Must have at least 70% of required elements
        const requiredPassRate = passCount / Math.max(1, totalRequired);
        
        // Must have reasonable quality score
        const minQualityScore = 15;
        
        // Critical elements must all pass
        let criticalPass = true;
        for (const [elementName, requirements] of Object.entries(typeConfig.expectedElements)) {
            if (requirements.priority === 'critical') {
                const result = elementResults[elementName];
                if (!result || !result.found || !result.meetsRequirements) {
                    criticalPass = false;
                    break;
                }
            }
        }
        
        return requiredPassRate >= 0.7 && qualityScore >= minQualityScore && criticalPass;
    }
    
    /**
     * Calculate overall quality score for flyer type
     */
    calculateFlyerTypeQuality(typeResults, typeConfig) {
        if (typeResults.totalTests === 0) return 0;
        
        const passRate = (typeResults.passed / typeResults.totalTests) * 100;
        
        // Calculate average accuracy from test results
        let totalAccuracy = 0;
        let accuracyCount = 0;
        
        for (const result of Object.values(typeResults.elementExtractionResults)) {
            if (result.elementResults) {
                for (const elementResult of Object.values(result.elementResults)) {
                    if (elementResult.accuracy > 0) {
                        totalAccuracy += elementResult.accuracy;
                        accuracyCount++;
                    }
                }
            }
        }
        
        const averageAccuracy = accuracyCount > 0 ? totalAccuracy / accuracyCount : 0;
        
        // Weight pass rate (60%) and accuracy (40%)
        return (passRate * 0.6) + (averageAccuracy * 0.4);
    }
    
    /**
     * Load test images for specific flyer type
     */
    async loadFlyerTypeTestImages(flyerType) {
        const testImages = [];
        
        // Load from test image samples configuration
        const imageSamples = this.config.testImages || {};
        
        for (const [quality, typeImages] of Object.entries(imageSamples)) {
            if (typeImages[flyerType]) {
                const imagePath = path.join(__dirname, 'fixtures', 'images', typeImages[flyerType]);
                testImages.push({
                    name: `${flyerType}_${quality}`,
                    path: imagePath,
                    quality: quality,
                    flyerType: flyerType,
                    expectedData: this.config.groundTruth?.[typeImages[flyerType]] || {}
                });
            }
        }
        
        // If no test images available, create synthetic test case
        if (testImages.length === 0) {
            testImages.push({
                name: `${flyerType}_synthetic`,
                path: null,
                quality: 'synthetic',
                flyerType: flyerType,
                expectedData: this.generateSyntheticExpectedData(flyerType),
                synthetic: true
            });
        }
        
        return testImages;
    }
    
    /**
     * Generate synthetic expected data for flyer type
     */
    generateSyntheticExpectedData(flyerType) {
        const syntheticData = {
            concert: {
                title: 'ROCK CONCERT',
                artist: 'The Rockers',
                venue: 'Music Hall',
                date: '12/25/2024',
                time: '8:00 PM',
                price: '$30'
            },
            nightlife: {
                eventName: 'CLUB NIGHT',
                dj: 'DJ ELECTRONIC',
                venue: 'Night Club',
                date: '12/28/2024',
                time: '10:00 PM',
                age: '21+'
            },
            comedy: {
                showTitle: 'COMEDY SHOW',
                comedianNames: 'Funny Comedian',
                venue: 'Comedy Theater',
                date: '12/30/2024',
                showTimes: '7:00 PM',
                ticketPrice: '$25'
            },
            sports: {
                eventTitle: 'CHAMPIONSHIP GAME',
                teams: 'Team A vs Team B',
                venue: 'Sports Stadium',
                date: '01/05/2025',
                gameTime: '3:00 PM'
            },
            food: {
                eventName: 'FOOD FESTIVAL',
                cuisine: 'Italian',
                chef: 'Chef Mario',
                venue: 'Restaurant',
                date: '01/10/2025',
                time: '6:00 PM'
            }
        };
        
        return syntheticData[flyerType] || {};
    }
}

module.exports = OCRFlyerTypeTests;
