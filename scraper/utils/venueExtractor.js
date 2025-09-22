#!/usr/bin/env node

/**
 * Smart Venue and Address Extractor for Hash Event Scraper
 * 
 * Advanced venue name extraction and address formatting with intelligent parsing
 * to separate venue names from addresses correctly and ensure proper formatting.
 * 
 * Features:
 * - Smart venue/address separation using multiple algorithms
 * - Venue keyword recognition and context analysis
 * - Address format validation and comma insertion (required format: "Street, City, State")
 * - Confidence scoring for extraction accuracy
 * - Fallback strategies for incomplete data
 * - Pattern matching for "at [venue]", "@ [venue]", etc.
 */

const chalk = require('chalk');

class VenueExtractor {
    constructor() {
        // Comprehensive venue type keywords for recognition
        this.VENUE_KEYWORDS = [
            // Entertainment
            'Theater', 'Theatre', 'Cinema', 'Amphitheater', 'Amphitheatre',
            'Opera House', 'Concert Hall', 'Music Hall', 'Playhouse',
            
            // Sports & Recreation
            'Stadium', 'Arena', 'Coliseum', 'Fieldhouse', 'Sports Complex',
            'Golf Course', 'Country Club', 'Recreation Center', 'Gym',
            
            // Cultural & Educational
            'Museum', 'Gallery', 'Library', 'University', 'College', 'School',
            'Institute', 'Academy', 'Convention Center', 'Exhibition Hall',
            
            // Hospitality & Dining
            'Restaurant', 'Bar', 'Pub', 'Café', 'Coffee Shop', 'Bistro',
            'Lounge', 'Club', 'Nightclub', 'Hotel', 'Resort', 'Inn',
            
            // General Venues
            'Hall', 'Center', 'Centre', 'Building', 'Plaza', 'Square',
            'Park', 'Garden', 'Pavilion', 'Lodge', 'Ballroom', 'Auditorium',
            
            // Houses of Worship
            'Church', 'Cathedral', 'Temple', 'Synagogue', 'Mosque',
            
            // Business & Conference
            'Conference Center', 'Meeting Room', 'Boardroom', 'Office',
            'Headquarters', 'Studio', 'Workshop', 'Warehouse'
        ];
        
        // Patterns that indicate venue context
        this.VENUE_PATTERNS = [
            /\b(?:at|@)\s+([^,]+?)(?:,|$)/i,
            /\bheld\s+at\s+([^,]+?)(?:,|$)/i,
            /\blocated\s+at\s+([^,]+?)(?:,|$)/i,
            /\btakes?\s+place\s+at\s+([^,]+?)(?:,|$)/i,
            /\bhosted\s+at\s+([^,]+?)(?:,|$)/i
        ];
        
        // Words to clean from venue names
        this.VENUE_CLEANUP = [
            'the', 'at', 'in', 'on', 'located', 'situated', 'held', 'hosted',
            'takes place', 'happening', 'occurring', 'featuring'
        ];
        
        // Address indicators
        this.ADDRESS_INDICATORS = [
            // Street suffixes
            'Street', 'St', 'Avenue', 'Ave', 'Boulevard', 'Blvd', 'Road', 'Rd',
            'Drive', 'Dr', 'Lane', 'Ln', 'Way', 'Place', 'Pl', 'Court', 'Ct',
            'Circle', 'Cir', 'Terrace', 'Ter', 'Highway', 'Hwy', 'Route', 'Rte',
            
            // Directionals
            'North', 'South', 'East', 'West', 'N', 'S', 'E', 'W',
            'Northeast', 'Northwest', 'Southeast', 'Southwest',
            'NE', 'NW', 'SE', 'SW'
        ];
        
        // Major cities for context
        this.MAJOR_CITIES = {
            'California': [
                'San Francisco', 'Los Angeles', 'San Diego', 'Sacramento', 'San Jose',
                'Oakland', 'Berkeley', 'Palo Alto', 'Mountain View', 'Santa Clara',
                'Fremont', 'Hayward', 'Sunnyvale', 'Santa Monica', 'Pasadena'
            ],
            'Texas': [
                'Austin', 'Houston', 'Dallas', 'San Antonio', 'Fort Worth',
                'Round Rock', 'Cedar Park', 'Georgetown', 'Pflugerville', 'Kyle'
            ],
            'New York': [
                'New York', 'NYC', 'Manhattan', 'Brooklyn', 'Queens',
                'Bronx', 'Staten Island', 'Buffalo', 'Rochester', 'Syracuse'
            ]
        };
        
        // State abbreviations
        this.STATE_ABBREV = {
            'CA': 'California', 'TX': 'Texas', 'NY': 'New York',
            'FL': 'Florida', 'IL': 'Illinois', 'WA': 'Washington'
        };
    }
    
    /**
     * Main extraction method - intelligently separates venue from address
     * @param {string} rawText - Raw location text from event sources
     * @param {Object} options - Extraction options
     * @returns {Object} Extracted venue and address with confidence scores
     */
    extractVenueAndAddress(rawText, options = {}) {
        if (!rawText || typeof rawText !== 'string') {
            return this._createResult('', '', 0, 'No input text provided');
        }
        
        const text = rawText.trim();
        const results = [];
        
        // Strategy 1: Pattern-based extraction (highest confidence)
        const patternResult = this._extractUsingPatterns(text);
        if (patternResult.confidence > 0.7) {
            results.push({...patternResult, strategy: 'pattern'});
        }
        
        // Strategy 2: Structure-based extraction (commas, addresses) - run before keywords
        const structureResult = this._extractUsingStructure(text);
        if (structureResult.confidence > 0.5) {
            results.push({...structureResult, strategy: 'structure'});
        }
        
        // Strategy 3: Keyword-based extraction
        const keywordResult = this._extractUsingKeywords(text);
        if (keywordResult.confidence > 0.6) {
            results.push({...keywordResult, strategy: 'keyword'});
        }
        
        // Strategy 4: Contextual extraction
        const contextResult = this._extractUsingContext(text);
        if (contextResult.confidence > 0.4) {
            results.push({...contextResult, strategy: 'context'});
        }
        
        // Choose best result or create fallback
        let bestResult = results.length > 0 
            ? results.reduce((best, current) => 
                current.confidence > best.confidence ? current : best)
            : this._createFallbackResult(text);
        
        // Ensure address has required comma format
        bestResult.address = this._ensureAddressFormat(bestResult.address, bestResult.venue);
        
        // Final validation and cleanup
        bestResult = this._validateAndCleanResult(bestResult);
        
        if (options.debug) {
            this._debugExtraction(text, results, bestResult);
        }
        
        return bestResult;
    }
    
    /**
     * Extract using venue/location patterns (at, @, held at, etc.)
     */
    _extractUsingPatterns(text) {
        for (const pattern of this.VENUE_PATTERNS) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const venue = this._cleanVenueName(match[1]);
                // Get the part after the venue mention for address
                const patternEnd = match.index + match[0].length;
                let address = text.substring(patternEnd).trim();
                
                // If there's a comma after the pattern match, include what follows
                if (text.charAt(patternEnd) === ',') {
                    address = text.substring(patternEnd + 1).trim();
                }
                
                // If no good address found, try to construct one
                if (!address || address.length < 5) {
                    const city = this._detectCity(text);
                    address = city || 'San Francisco, CA';
                }
                
                return this._createResult(
                    venue, 
                    this._formatAddress(address), 
                    0.8, 
                    `Pattern match: ${pattern.source}`,
                    'pattern'
                );
            }
        }
        
        return this._createResult('', '', 0, 'No patterns matched');
    }
    
    /**
     * Extract using venue keywords
     */
    _extractUsingKeywords(text) {
        const words = text.split(/\s+/);
        let bestVenue = '';
        let confidence = 0;
        let keywordFound = '';
        
        // Look for venue keywords and extract surrounding context
        for (let i = 0; i < words.length; i++) {
            for (const keyword of this.VENUE_KEYWORDS) {
                const keywordWords = keyword.toLowerCase().split(/\s+/);
                const textSlice = words.slice(i, i + keywordWords.length)
                    .map(w => w.toLowerCase()).join(' ');
                
                if (textSlice === keyword.toLowerCase()) {
                    // Found keyword, extract venue name around it
                    const startIdx = Math.max(0, i - 3);
                    const endIdx = Math.min(words.length, i + keywordWords.length + 2);
                    const potentialVenue = words.slice(startIdx, endIdx).join(' ');
                    
                    // Check if this looks like a complete venue name
                    const venueConfidence = this._calculateVenueConfidence(potentialVenue);
                    
                    if (venueConfidence > confidence) {
                        confidence = venueConfidence;
                        bestVenue = this._cleanVenueName(potentialVenue);
                        keywordFound = keyword;
                    }
                }
            }
        }
        
        if (confidence > 0.5) {
            const address = this._extractAddressFromText(
                text.replace(bestVenue, '').trim()
            );
            
            return this._createResult(
                bestVenue, 
                address, 
                confidence * 0.7, 
                `Keyword match: ${keywordFound}`,
                'keyword'
            );
        }
        
        return this._createResult('', '', 0, 'No venue keywords found');
    }
    
    /**
     * Extract using text structure (commas, numbers, etc.)
     */
    _extractUsingStructure(text) {
        // If there are commas, try to identify venue vs address parts
        if (text.includes(',')) {
            const parts = text.split(',').map(p => p.trim());
            
            // Check each part for venue vs address characteristics
            let venuePart = '';
            let addressParts = [];
            
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const hasNumbers = /\d/.test(part);
                const hasStreetSuffix = this.ADDRESS_INDICATORS.some(indicator =>
                    part.toLowerCase().includes(indicator.toLowerCase())
                );
                const hasVenueKeyword = this.VENUE_KEYWORDS.some(keyword =>
                    part.toLowerCase().includes(keyword.toLowerCase())
                );
                const isCity = this._detectCity(part);
                const isStreetAddress = hasNumbers && hasStreetSuffix;
                
                // First part is likely venue if it doesn't look like an address
                if (i === 0 && !isStreetAddress && !isCity) {
                    if (hasVenueKeyword || (!hasNumbers && part.split(' ').length <= 6)) {
                        venuePart = part;
                        continue; // Don't add to address parts
                    }
                }
                
                // Other parts with venue keywords (but not first part)
                if (i > 0 && hasVenueKeyword && !isStreetAddress && !isCity && !venuePart) {
                    venuePart = part;
                    continue;
                }
                
                // Add to address parts
                addressParts.push(part);
            }
            
            if (venuePart && addressParts.length > 0) {
                // Check if venue has keywords for confidence boost
                const venueHasKeywords = this.VENUE_KEYWORDS.some(keyword =>
                    venuePart.toLowerCase().includes(keyword.toLowerCase())
                );
                const confidence = venueHasKeywords ? 0.7 : 0.6;
                return this._createResult(
                    this._cleanVenueName(venuePart),
                    addressParts.join(', '),
                    confidence,
                    'Structure-based separation',
                    'structure'
                );
            }
        }
        
        return this._createResult('', '', 0, 'No clear structure found');
    }
    
    /**
     * Extract using contextual clues
     */
    _extractUsingContext(text) {
        // Look for city names to help separate venue from address
        const detectedCity = this._detectCity(text);
        
        if (detectedCity) {
            const cityIndex = text.toLowerCase().indexOf(detectedCity.toLowerCase());
            const beforeCity = text.substring(0, cityIndex).trim();
            const afterCity = text.substring(cityIndex).trim();
            
            // If there's substantial text before the city, it might be the venue
            if (beforeCity.length > 5 && !this._looksLikeStreetAddress(beforeCity)) {
                // Check if beforeCity ends with a venue keyword
                const hasVenueEnding = this.VENUE_KEYWORDS.some(keyword =>
                    beforeCity.toLowerCase().endsWith(keyword.toLowerCase())
                );
                
                if (hasVenueEnding || beforeCity.split(/\s+/).length <= 5) {
                    return this._createResult(
                        this._cleanVenueName(beforeCity),
                        this._formatAddress(afterCity),
                        0.5,
                        `City context: ${detectedCity}`,
                        'context'
                    );
                }
            }
        }
        
        return this._createResult('', '', 0, 'No contextual clues found');
    }
    
    /**
     * Create fallback result when other strategies fail
     */
    _createFallbackResult(text) {
        // Try to identify if the entire text looks more like a venue or address
        const hasNumbers = /\d/.test(text);
        const hasStreetSuffix = this.ADDRESS_INDICATORS.some(indicator =>
            text.toLowerCase().includes(indicator.toLowerCase())
        );
        const hasVenueKeyword = this.VENUE_KEYWORDS.some(keyword =>
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        const detectedCity = this._detectCity(text);
        
        if (!hasNumbers && !hasStreetSuffix && hasVenueKeyword) {
            // Looks like venue name only
            return this._createResult(
                this._cleanVenueName(text),
                detectedCity ? `${detectedCity}` : 'San Francisco, CA',
                0.3,
                'Fallback: venue-only detection',
                'fallback'
            );
        } else if (hasNumbers || hasStreetSuffix) {
            // Looks like address only
            return this._createResult(
                '',
                this._formatAddress(text),
                0.3,
                'Fallback: address-only detection',
                'fallback'
            );
        } else {
            // Unclear - treat as venue name with default city
            return this._createResult(
                this._cleanVenueName(text),
                detectedCity ? `${detectedCity}` : 'San Francisco, CA',
                0.2,
                'Fallback: default venue assumption',
                'fallback'
            );
        }
    }
    
    /**
     * Clean venue name by removing unwanted prefixes/suffixes
     */
    _cleanVenueName(venue) {
        if (!venue) return '';
        
        let cleaned = venue.trim();
        
        // Remove common prefixes
        const prefixPattern = new RegExp(
            `^(${this.VENUE_CLEANUP.join('|')})\\s+`, 'i'
        );
        cleaned = cleaned.replace(prefixPattern, '');
        
        // Remove address-like suffixes (street numbers at the end)
        cleaned = cleaned.replace(/\s+\d+\s*[A-Za-z]*\s*$/, '');
        
        // Capitalize properly
        cleaned = this._toTitleCase(cleaned);
        
        return cleaned.trim();
    }
    
    /**
     * Extract address from text, looking for street patterns
     */
    _extractAddressFromText(text) {
        if (!text) return '';
        
        // Look for number + street pattern
        const streetPattern = /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Place|Pl)/i;
        const match = text.match(streetPattern);
        
        if (match) {
            // Found street address, include any city/state after it
            const streetEnd = match.index + match[0].length;
            const afterStreet = text.substring(streetEnd).trim();
            const address = match[0] + (afterStreet ? `, ${afterStreet}` : '');
            return address;
        }
        
        return text.trim();
    }
    
    /**
     * Ensure address has proper comma format
     */
    _ensureAddressFormat(address, venue = '') {
        if (!address) {
            // If no address but we have venue, create fallback
            if (venue) {
                return `${venue}, San Francisco, CA`;
            }
            return '';
        }
        
        // If address doesn't have comma, add city
        if (!address.includes(',')) {
            const detectedCity = this._detectCity(address);
            if (detectedCity) {
                const streetPart = address.replace(detectedCity, '').trim();
                return streetPart ? `${streetPart}, ${detectedCity}` : detectedCity;
            } else {
                return `${address}, San Francisco, CA`;
            }
        }
        
        return address;
    }
    
    /**
     * Format address to ensure proper comma placement
     */
    _formatAddress(address) {
        if (!address) return '';
        
        let formatted = address.trim();
        
        // If already has commas, clean up spacing
        if (formatted.includes(',')) {
            const parts = formatted.split(',').map(p => p.trim()).filter(p => p);
            return parts.join(', ');
        }
        
        // Try to add comma before city
        const city = this._detectCity(formatted);
        if (city) {
            const cityIndex = formatted.toLowerCase().indexOf(city.toLowerCase());
            const before = formatted.substring(0, cityIndex).trim();
            const after = formatted.substring(cityIndex).trim();
            
            if (before) {
                return `${before}, ${after}`;
            } else {
                return after;
            }
        }
        
        return formatted;
    }
    
    /**
     * Detect city in text
     */
    _detectCity(text) {
        if (!text) return '';
        
        const lowerText = text.toLowerCase();
        
        // Check all major cities
        for (const state of Object.values(this.MAJOR_CITIES)) {
            for (const city of state) {
                if (lowerText.includes(city.toLowerCase())) {
                    return city;
                }
            }
        }
        
        // Check for state abbreviations
        for (const [abbrev, fullState] of Object.entries(this.STATE_ABBREV)) {
            if (lowerText.includes(abbrev.toLowerCase())) {
                // Try to find city before state
                const stateIndex = lowerText.indexOf(abbrev.toLowerCase());
                const beforeState = text.substring(0, stateIndex).trim();
                const words = beforeState.split(/\s+/);
                const lastWord = words[words.length - 1];
                
                if (lastWord && lastWord.length > 2) {
                    return `${this._toTitleCase(lastWord)}, ${abbrev}`;
                }
            }
        }
        
        return '';
    }
    
    /**
     * Calculate confidence score for venue name
     */
    _calculateVenueConfidence(text) {
        let confidence = 0.1; // Base confidence
        
        // Has venue keywords
        const hasVenueKeyword = this.VENUE_KEYWORDS.some(keyword =>
            text.toLowerCase().includes(keyword.toLowerCase())
        );
        if (hasVenueKeyword) confidence += 0.4;
        
        // Reasonable length for venue name
        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount >= 2 && wordCount <= 6) confidence += 0.2;
        
        // Doesn't look like street address
        const hasNumbers = /\d/.test(text);
        const hasStreetSuffix = this.ADDRESS_INDICATORS.some(indicator =>
            text.toLowerCase().includes(indicator.toLowerCase())
        );
        if (!hasNumbers && !hasStreetSuffix) confidence += 0.2;
        
        // Proper capitalization suggests it's a name
        if (text === this._toTitleCase(text)) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Check if text looks like a street address
     */
    _looksLikeStreetAddress(text) {
        const hasNumbers = /^\d/.test(text.trim());
        const hasStreetSuffix = this.ADDRESS_INDICATORS.some(indicator =>
            text.toLowerCase().includes(indicator.toLowerCase())
        );
        
        return hasNumbers && hasStreetSuffix;
    }
    
    /**
     * Convert to title case
     */
    _toTitleCase(str) {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }
    
    /**
     * Create standardized result object
     */
    _createResult(venue, address, confidence, reason, strategy = 'unknown') {
        return {
            venue: venue || '',
            address: address || '',
            confidence: Math.round(confidence * 100) / 100,
            reason: reason || '',
            strategy: strategy,
            timestamp: Date.now()
        };
    }
    
    /**
     * Validate and clean final result
     */
    _validateAndCleanResult(result) {
        // Ensure venue name is clean
        if (result.venue) {
            result.venue = this._cleanVenueName(result.venue);
        }
        
        // Ensure address has comma if it exists
        if (result.address && !result.address.includes(',') && result.venue) {
            result.address = this._ensureAddressFormat(result.address, result.venue);
        }
        
        // Minimum confidence threshold
        if (result.confidence < 0.1) {
            result.confidence = 0.1;
        }
        
        return result;
    }
    
    /**
     * Debug extraction process
     */
    _debugExtraction(originalText, results, finalResult) {
        console.log(chalk.cyan('\n🎯 Venue Extraction Debug'));
        console.log(chalk.gray(`Original: "${originalText}"`));
        console.log(chalk.yellow('\nStrategies tried:'));
        
        results.forEach((result, index) => {
            console.log(chalk.white(`${index + 1}. ${result.strategy.toUpperCase()}`));
            console.log(chalk.green(`   Venue: "${result.venue}"`));
            console.log(chalk.blue(`   Address: "${result.address}"`));
            console.log(chalk.magenta(`   Confidence: ${result.confidence}`));
            console.log(chalk.gray(`   Reason: ${result.reason}`));
        });
        
        console.log(chalk.cyan('\n✨ Final Result:'));
        console.log(chalk.green(`Venue: "${finalResult.venue}"`));
        console.log(chalk.blue(`Address: "${finalResult.address}"`));
        console.log(chalk.magenta(`Confidence: ${finalResult.confidence}`));
        console.log(chalk.yellow(`Strategy: ${finalResult.strategy}`));
        console.log(chalk.gray(`Reason: ${finalResult.reason}`));
    }
    
    /**
     * Batch extract venues from multiple location strings
     */
    extractBatch(locationStrings, options = {}) {
        if (!Array.isArray(locationStrings)) {
            throw new Error('Input must be an array of strings');
        }
        
        const results = locationStrings.map((location, index) => {
            const result = this.extractVenueAndAddress(location, options);
            return {
                index,
                original: location,
                ...result
            };
        });
        
        if (options.debug) {
            console.log(chalk.cyan(`\n📊 Batch Extraction Summary (${results.length} items)`));
            const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
            console.log(chalk.yellow(`Average Confidence: ${avgConfidence.toFixed(2)}`));
            
            const strategies = results.reduce((acc, r) => {
                acc[r.strategy] = (acc[r.strategy] || 0) + 1;
                return acc;
            }, {});
            console.log(chalk.blue('Strategy Usage:', strategies));
        }
        
        return results;
    }
    
    /**
     * Get extraction statistics
     */
    getStats(results) {
        if (!Array.isArray(results)) {
            results = [results];
        }
        
        const totalResults = results.length;
        const avgConfidence = results.reduce((sum, r) => sum + (r.confidence || 0), 0) / totalResults;
        const venuesFound = results.filter(r => r.venue && r.venue.length > 0).length;
        const addressesFound = results.filter(r => r.address && r.address.length > 0).length;
        const strategies = results.reduce((acc, r) => {
            acc[r.strategy] = (acc[r.strategy] || 0) + 1;
            return acc;
        }, {});
        
        return {
            totalResults,
            venuesFound,
            addressesFound,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
            venueSuccessRate: Math.round((venuesFound / totalResults) * 100),
            addressSuccessRate: Math.round((addressesFound / totalResults) * 100),
            strategies
        };
    }
}

module.exports = VenueExtractor;