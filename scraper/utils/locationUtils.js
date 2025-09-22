#!/usr/bin/env node

/**
 * Location Utilities for Hash Event Scraper
 * 
 * Handles address formatting, city detection, and location processing
 * to ensure proper collection routing for events.
 */

const chalk = require('chalk');
const { getGlobalVenueCache } = require('./venueCache');

class LocationUtils {
    constructor(options = {}) {
        // Initialize venue cache for performance optimization
        this.venueCache = getGlobalVenueCache({
            maxSize: options.cacheMaxSize || 1000,
            ttlMs: options.cacheTtlMs || 300000, // 5 minutes
            debug: options.debug || false
        });
        // City mappings for collection routing (matching iOS app logic)
        this.BAY_AREA_CITIES = [
            'San Francisco', 'Oakland', 'San Jose', 'Berkeley', 'Palo Alto',
            'Mountain View', 'Redwood City', 'San Mateo', 'Fremont', 'Sunnyvale',
            'Santa Clara', 'Hayward', 'Richmond', 'Daly City', 'Alameda',
            'San Bruno', 'Millbrae', 'Foster City', 'Belmont', 'San Carlos',
            'Cupertino', 'Los Altos', 'Menlo Park', 'Union City', 'San Rafael',
            'Petaluma', 'Napa', 'Vallejo', 'Concord', 'Walnut Creek',
            'Pleasanton', 'Dublin', 'Livermore', 'Santa Rosa', 'Novato'
        ];
        
        this.AUSTIN_CITIES = [
            'Austin', 'Del Valle', 'Round Rock', 'Cedar Park', 'Buda',
            'Pflugerville', 'Leander', 'Lakeway', 'Georgetown', 'Kyle',
            'Dripping Springs', 'Bee Cave', 'West Lake Hills', 'Rollingwood',
            'Sunset Valley', 'Westlake', 'Barton Creek', 'Manor', 'Elgin',
            'Hutto', 'Taylor', 'Liberty Hill', 'Jonestown', 'Lago Vista'
        ];
        
        // Common address patterns and variations
        this.ADDRESS_PATTERNS = {
            // Street suffixes
            street: ['St', 'Street', 'Ave', 'Avenue', 'Blvd', 'Boulevard', 'Rd', 'Road', 'Dr', 'Drive', 'Ln', 'Lane', 'Way', 'Pl', 'Place'],
            
            // Common venue types to extract
            venueTypes: ['Theater', 'Theatre', 'Hall', 'Center', 'Centre', 'Club', 'Bar', 'Restaurant', 'Park', 'Stadium', 'Arena', 'Museum', 'Gallery'],
            
            // Words to remove from venue names
            cleanupWords: ['at', 'the', 'in', 'on', 'located', 'situated']
        };
    }
    
    /**
     * Format address to match Hash app requirements (must contain comma)
     */
    formatAddress(rawAddress) {
        if (!rawAddress || typeof rawAddress !== 'string') {
            return '';
        }
        
        let address = rawAddress.trim();
        
        // If address already has comma, clean it up
        if (address.includes(',')) {
            const parts = address.split(',');
            // Clean up each part
            const cleanParts = parts.map(part => part.trim()).filter(part => part.length > 0);
            return cleanParts.join(', ');
        }
        
        // Try to split address intelligently
        const possibleCity = this.extractCityFromText(address);
        if (possibleCity) {
            // Remove city from address to get street portion
            const streetPart = address.replace(new RegExp(possibleCity, 'i'), '').trim();
            if (streetPart.length > 0) {
                return `${streetPart}, ${possibleCity}`;
            }
        }
        
        // Fallback: try to detect state abbreviations or zip codes
        const stateZipPattern = /\b([A-Z]{2}\s?\d{5}(-\d{4})?|California|CA|Texas|TX|San Francisco|Austin)\b/i;
        const match = address.match(stateZipPattern);
        
        if (match) {
            const beforeState = address.substring(0, match.index).trim();
            const stateZip = match[0];
            
            if (beforeState.length > 0) {
                return `${beforeState}, ${stateZip}`;
            }
        }
        
        // Last resort: add generic city based on context or default
        return `${address}, San Francisco`; // Default to SF for Bay Area bias
    }
    
    /**
     * Extract city from address or venue text
     */
    extractCityFromText(text) {
        if (!text || typeof text !== 'string') return '';
        
        // Check Bay Area cities first
        for (const city of this.BAY_AREA_CITIES) {
            if (text.toLowerCase().includes(city.toLowerCase())) {
                return city;
            }
        }
        
        // Check Austin cities
        for (const city of this.AUSTIN_CITIES) {
            if (text.toLowerCase().includes(city.toLowerCase())) {
                return city;
            }
        }
        
        // Check for common abbreviations and variations
        const cityMappings = {
            'sf': 'San Francisco',
            'san fran': 'San Francisco',
            'frisco': 'San Francisco', // Though locals don't like this
            'the city': 'San Francisco',
            'berkeley': 'Berkeley',
            'oakland': 'Oakland',
            'san jose': 'San Jose',
            'sj': 'San Jose',
            'palo alto': 'Palo Alto',
            'mountain view': 'Mountain View',
            'mv': 'Mountain View',
            'atx': 'Austin',
            'austin tx': 'Austin',
            'round rock': 'Round Rock',
            'cedar park': 'Cedar Park'
        };
        
        const lowerText = text.toLowerCase();
        for (const [abbrev, fullName] of Object.entries(cityMappings)) {
            if (lowerText.includes(abbrev)) {
                return fullName;
            }
        }
        
        return '';
    }
    
    /**
     * Extract venue name from location text (with caching)
     */
    extractVenue(locationText) {
        if (!locationText || typeof locationText !== 'string') {
            return '';
        }
        
        // Check cache first
        const cacheKey = `venue:${locationText}`;
        const cachedVenue = this.venueCache.get(cacheKey);
        if (cachedVenue !== null) {
            return cachedVenue;
        }
        
        let venue = locationText.trim();
        
        // Remove common prefixes
        venue = venue.replace(/^(at\s+|the\s+|in\s+|located\s+at\s+)/i, '');
        
        // If there's a comma, the venue is likely before the first comma
        if (venue.includes(',')) {
            venue = venue.split(',')[0].trim();
        }
        
        // Remove address-like suffixes (numbers and street names)
        venue = venue.replace(/\s+\d+.*$/, ''); // Remove everything after first number
        
        // Clean up venue name
        venue = venue.trim();
        
        // If venue is too long, try to extract the main part
        if (venue.length > 50) {
            // Try to find venue types and use everything before them
            for (const type of this.ADDRESS_PATTERNS.venueTypes) {
                const typeIndex = venue.toLowerCase().indexOf(type.toLowerCase());
                if (typeIndex !== -1) {
                    venue = venue.substring(0, typeIndex + type.length).trim();
                    break;
                }
            }
        }
        
        // Cache the result before returning
        this.venueCache.set(cacheKey, venue);
        
        return venue;
    }
    
    /**
     * Determine if location is in Bay Area
     */
    isBayAreaLocation(address, city = '') {
        const text = `${address} ${city}`.toLowerCase();
        
        return this.BAY_AREA_CITIES.some(bayCity => 
            text.includes(bayCity.toLowerCase())
        ) || text.includes('california') || text.includes('ca ');
    }
    
    /**
     * Determine if location is in Austin area
     */
    isAustinLocation(address, city = '') {
        const text = `${address} ${city}`.toLowerCase();
        
        return this.AUSTIN_CITIES.some(austinCity => 
            text.includes(austinCity.toLowerCase())
        ) || text.includes('texas') || text.includes('tx ');
    }
    
    /**
     * Get region for collection routing
     */
    getRegion(address, city = '') {
        if (this.isAustinLocation(address, city)) {
            return 'austin';
        } else if (this.isBayAreaLocation(address, city)) {
            return 'bayArea';
        }
        
        // Default to Bay Area if unclear
        return 'bayArea';
    }
    
    /**
     * Validate address format for Hash app
     */
    validateAddress(address) {
        if (!address || typeof address !== 'string') {
            return {
                valid: false,
                error: 'Address is required and must be a string'
            };
        }
        
        if (!address.includes(',')) {
            return {
                valid: false,
                error: 'Address must contain a comma (format: "Street, City")',
                suggestion: this.formatAddress(address)
            };
        }
        
        const parts = address.split(',');
        if (parts.length < 2 || parts.some(part => part.trim().length === 0)) {
            return {
                valid: false,
                error: 'Address must have both street and city parts',
                suggestion: this.formatAddress(address)
            };
        }
        
        return { valid: true };
    }
    
    /**
     * Parse complete location data from raw text
     */
    parseLocation(locationText) {
        if (!locationText || typeof locationText !== 'string') {
            return {
                venue: '',
                address: '',
                city: '',
                region: 'bayArea'
            };
        }
        
        const city = this.extractCityFromText(locationText);
        const venue = this.extractVenue(locationText);
        const address = this.formatAddress(locationText);
        const region = this.getRegion(address, city);
        
        return {
            venue: venue,
            address: address,
            city: city,
            region: region
        };
    }
    
    /**
     * Debug location parsing
     */
    debugLocation(locationText) {
        const parsed = this.parseLocation(locationText);
        
        console.log(chalk.cyan('\n🏠 Location Debug:'));
        console.log(chalk.gray(`Raw: "${locationText}"`));
        console.log(chalk.green(`Venue: "${parsed.venue}"`));
        console.log(chalk.blue(`Address: "${parsed.address}"`));
        console.log(chalk.yellow(`City: "${parsed.city}"`));
        console.log(chalk.magenta(`Region: ${parsed.region}`));
        
        const validation = this.validateAddress(parsed.address);
        if (!validation.valid) {
            console.log(chalk.red(`❌ Address validation: ${validation.error}`));
            if (validation.suggestion) {
                console.log(chalk.cyan(`💡 Suggestion: "${validation.suggestion}"`));
            }
        } else {
            console.log(chalk.green('✅ Address format valid'));
        }
        
        return parsed;
    }
}

module.exports = LocationUtils;