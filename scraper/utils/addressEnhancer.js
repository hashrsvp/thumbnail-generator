#!/usr/bin/env node

/**
 * Address Enhancer for Hash Event Scraper
 * 
 * Resolves venue names to actual street addresses using multiple strategies:
 * 1. Known venue database (from Hash venue lists)
 * 2. Google Places API (if configured)
 * 3. Intelligent parsing and geocoding
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class AddressEnhancer {
    constructor(options = {}) {
        this.options = {
            debug: options.debug || false,
            googleApiKey: options.googleApiKey || process.env.GOOGLE_PLACES_API_KEY,
            ...options
        };
        
        // Load known venue addresses from Hash venue lists
        this.knownVenues = this.loadKnownVenues();
    }
    
    /**
     * Load known venues from Hash venue lists
     */
    loadKnownVenues() {
        const venues = new Map();
        
        try {
            // Load Bay Area venues
            const bayAreaPath = path.join(__dirname, '../../Venues/BayAreaVenues.txt');
            if (fs.existsSync(bayAreaPath)) {
                const content = fs.readFileSync(bayAreaPath, 'utf-8');
                this.parseVenueList(content, venues, 'bayArea');
            }
            
            // Load Austin venues  
            const austinPath = path.join(__dirname, '../../Venues/AustinVenues.txt');
            if (fs.existsSync(austinPath)) {
                const content = fs.readFileSync(austinPath, 'utf-8');
                this.parseVenueList(content, venues, 'austin');
            }
            
            if (this.options.debug) {
                console.log(chalk.cyan(`📍 Loaded ${venues.size} known venue addresses`));
            }
            
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not load venue lists:', error.message));
        }
        
        return venues;
    }
    
    /**
     * Parse venue list content to extract venue names and addresses
     */
    parseVenueList(content, venues, region) {
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for venue pattern: "Venue Name | URL"
            const venueMatch = line.match(/^([^|]+)\s*\|\s*https?:\/\//);
            if (venueMatch) {
                const venueName = venueMatch[1].trim();
                
                // Look for address in the next few lines (skip blank lines)
                for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                    const nextLine = lines[j].trim();
                    
                    // Skip empty lines
                    if (!nextLine) continue;
                    
                    // Check if this line looks like an address
                    if (this.looksLikeAddress(nextLine)) {
                        const normalizedName = this.normalizeVenueName(venueName);
                        venues.set(normalizedName, {
                            name: venueName,
                            address: nextLine,
                            region: region,
                            source: 'venue_list'
                        });
                        
                        if (this.options.debug) {
                            console.log(chalk.green(`✅ Mapped: "${venueName}" → "${nextLine}"`));
                        }
                        break; // Found address, stop looking
                    }
                    
                    // If we hit another venue line, stop looking
                    if (nextLine.includes('|') && nextLine.includes('http')) {
                        break;
                    }
                }
            }
        }
    }
    
    /**
     * Check if a line looks like a street address
     */
    looksLikeAddress(line) {
        // Must contain street indicators and not be a URL or venue name
        const streetIndicators = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/i;
        const hasNumber = /\b\d+\b/;
        const isUrl = /^https?:\/\//i;
        const hasStateOrZip = /\b[A-Z]{2}(\s*\d{5})?/; // State with optional zip code
        
        return streetIndicators.test(line) && 
               hasNumber.test(line) && 
               !isUrl.test(line) &&
               hasStateOrZip.test(line);
    }
    
    /**
     * Normalize venue name for matching
     */
    normalizeVenueName(name) {
        return name.toLowerCase()
            .replace(/[^\w\s]/g, ' ')  // Remove special characters
            .replace(/\s+/g, ' ')      // Normalize spaces
            .trim();
    }
    
    /**
     * Enhance address by resolving venue name to street address
     */
    async enhanceAddress(rawAddress, venueName = '', city = '', options = {}) {
        if (this.options.debug) {
            console.log(chalk.cyan(`🔍 Enhancing address: "${rawAddress}" for venue: "${venueName}"`));
        }
        
        // If we already have a street address, validate and return
        if (this.isStreetAddress(rawAddress)) {
            return this.validateAndFormatAddress(rawAddress, city);
        }
        
        // Strategy 1: Look up in known venues
        const knownAddress = await this.lookupKnownVenue(venueName || rawAddress, city);
        if (knownAddress) {
            if (this.options.debug) {
                console.log(chalk.green(`✅ Found known venue address: "${knownAddress}"`));
            }
            return this.validateAndFormatAddress(knownAddress, city);
        }
        
        // Strategy 2: Try to extract venue name from address and lookup
        const extractedVenue = this.extractVenueFromAddress(rawAddress);
        if (extractedVenue && extractedVenue !== rawAddress) {
            const extractedAddress = await this.lookupKnownVenue(extractedVenue, city);
            if (extractedAddress) {
                if (this.options.debug) {
                    console.log(chalk.green(`✅ Found address for extracted venue "${extractedVenue}": "${extractedAddress}"`));
                }
                return this.validateAndFormatAddress(extractedAddress, city);
            }
        }
        
        // Strategy 3: Google Places API (if available)
        if (this.options.googleApiKey) {
            const googleAddress = await this.lookupGooglePlaces(venueName || rawAddress, city);
            if (googleAddress) {
                if (this.options.debug) {
                    console.log(chalk.green(`✅ Found Google Places address: "${googleAddress}"`));
                }
                return this.validateAndFormatAddress(googleAddress, city);
            }
        }
        
        // Strategy 4: Intelligent defaults with city
        return this.createIntelligentDefault(rawAddress, venueName, city);
    }
    
    /**
     * Check if address contains street information
     */
    isStreetAddress(address) {
        if (!address) return false;
        
        const streetIndicators = /\b(street|st|avenue|ave|boulevard|blvd|road|rd|drive|dr|lane|ln|way|place|pl)\b/i;
        const hasNumber = /^\s*\d+\s/; // Starts with number
        
        return streetIndicators.test(address) && hasNumber.test(address);
    }
    
    /**
     * Look up venue in known venues database
     */
    async lookupKnownVenue(venueName, city = '') {
        if (!venueName) return null;
        
        const normalizedName = this.normalizeVenueName(venueName);
        
        // Direct match
        if (this.knownVenues.has(normalizedName)) {
            return this.knownVenues.get(normalizedName).address;
        }
        
        // Partial matches
        for (const [key, venue] of this.knownVenues.entries()) {
            // Check if the venue name contains our search term or vice versa
            if (key.includes(normalizedName) || normalizedName.includes(key)) {
                // Additional city validation if provided
                if (city && venue.address.toLowerCase().includes(city.toLowerCase())) {
                    return venue.address;
                } else if (!city) {
                    return venue.address;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Extract venue name from a complex address string
     */
    extractVenueFromAddress(address) {
        if (!address) return null;
        
        // Remove common prefixes
        let venue = address.replace(/^(at\s+|the\s+|in\s+|located\s+at\s+)/i, '');
        
        // If there's "at" in the middle, take what's after it
        const atMatch = venue.match(/^(.+?)\s+at\s+(.+)$/i);
        if (atMatch) {
            venue = atMatch[2]; // Take the venue part after "at"
        }
        
        // Remove city, state, country from the end
        venue = venue.replace(/,?\s+(Austin|San Francisco|Oakland|Berkeley|San Jose|TX|CA|Texas|California|United States).*$/i, '');
        
        // Remove obvious address parts (numbers and street suffixes)
        venue = venue.replace(/\s*,?\s*\d+.*$/, '');
        
        return venue.trim();
    }
    
    /**
     * Look up address using Google Places API
     */
    async lookupGooglePlaces(query, city = '') {
        if (!this.options.googleApiKey) return null;
        
        try {
            const searchQuery = city ? `${query} ${city}` : query;
            // This would implement Google Places API call
            // For now, return null to avoid API dependency
            if (this.options.debug) {
                console.log(chalk.yellow('🌐 Google Places API lookup not implemented yet'));
            }
            return null;
        } catch (error) {
            if (this.options.debug) {
                console.warn(chalk.yellow('⚠️  Google Places API error:', error.message));
            }
            return null;
        }
    }
    
    /**
     * Create intelligent default address
     */
    createIntelligentDefault(rawAddress, venueName, city) {
        const venue = venueName || this.extractVenueFromAddress(rawAddress) || rawAddress;
        
        // Determine city based on context or default to Austin for this example
        let defaultCity = city;
        if (!defaultCity) {
            // Try to infer from venue name or address
            if (rawAddress.toLowerCase().includes('austin') || venue.toLowerCase().includes('austin')) {
                defaultCity = 'Austin, TX';
            } else if (rawAddress.toLowerCase().includes('san francisco') || venue.toLowerCase().includes('san francisco')) {
                defaultCity = 'San Francisco, CA';
            } else {
                defaultCity = 'Austin, TX'; // Default for this case
            }
        }
        
        const result = `${venue}, ${defaultCity}`;
        
        if (this.options.debug) {
            console.log(chalk.yellow(`⚠️  Created intelligent default: "${result}"`));
        }
        
        return result;
    }
    
    /**
     * Validate and format address for Hash app compliance
     */
    validateAndFormatAddress(address, city = '') {
        if (!address) return '';
        
        // Ensure comma is present
        if (!address.includes(',')) {
            const defaultCity = city || 'Austin, TX';
            address = `${address}, ${defaultCity}`;
        }
        
        // Clean up formatting
        const parts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);
        return parts.join(', ');
    }
    
    /**
     * Add a new venue to the known venues (for learning)
     */
    addVenue(venueName, address, region = 'unknown') {
        const normalizedName = this.normalizeVenueName(venueName);
        this.knownVenues.set(normalizedName, {
            name: venueName,
            address: address,
            region: region,
            source: 'learned'
        });
        
        if (this.options.debug) {
            console.log(chalk.green(`📚 Learned new venue: "${venueName}" → "${address}"`));
        }
    }
    
    /**
     * Get statistics about known venues
     */
    getStats() {
        const stats = {
            totalVenues: this.knownVenues.size,
            regions: {},
            sources: {}
        };
        
        for (const venue of this.knownVenues.values()) {
            stats.regions[venue.region] = (stats.regions[venue.region] || 0) + 1;
            stats.sources[venue.source] = (stats.sources[venue.source] || 0) + 1;
        }
        
        return stats;
    }
}

module.exports = AddressEnhancer;