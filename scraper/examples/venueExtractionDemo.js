#!/usr/bin/env node

/**
 * Demo: Using VenueExtractor with Hash Event Scraper
 * 
 * This example shows how to integrate the smart venue extractor
 * with the existing Hash scraper utilities and locationUtils.
 */

const VenueExtractor = require('../utils/venueExtractor');
const LocationUtils = require('../utils/locationUtils');
const chalk = require('chalk');

// Sample event data that might come from event sources
const sampleEventLocations = [
    // From Eventbrite-style sources
    "Live music performance at The Fillmore, 1805 Geary Boulevard, San Francisco, CA 94115",
    "Art exhibition held at de Young Museum, 50 Hagiwara Tea Garden Dr, San Francisco, CA",
    "@ Blue Note Jazz Club, 131 West 3rd Street, New York, NY 10012",
    "Food festival takes place at Pier 39, Fisherman's Wharf, San Francisco, California",
    
    // From Facebook events
    "Castro Theatre · 429 Castro Street, San Francisco, CA 94114",
    "The Independent · 628 Divisadero Street, San Francisco, CA",
    "Austin City Limits Music Festival, Zilker Park, Austin, TX",
    
    // From Meetup-style sources  
    "Stubbs Bar-B-Q, 801 Red River St, Austin, TX 78701",
    "Golden Gate Park Shakespeare Garden, San Francisco",
    "Oracle Park Stadium, 24 Willie Mays Plaza, San Francisco, CA",
    
    // Edge cases that need intelligent handling
    "1234 Market Street, San Francisco, CA", // Address only
    "The Masonic San Francisco", // Venue only
    "Various Locations, San Francisco Bay Area", // Multiple venues
    "Online Event", // Virtual
    "TBA - Location to be determined" // Unknown
];

function demonstrateVenueExtraction() {
    console.log(chalk.bold.cyan('\n🎯 Hash Event Scraper - Smart Venue Extraction Demo'));
    console.log(chalk.gray('=' .repeat(70)));
    
    const venueExtractor = new VenueExtractor();
    const locationUtils = new LocationUtils();
    
    const results = [];
    
    sampleEventLocations.forEach((locationText, index) => {
        console.log(chalk.yellow(`\n📍 Event ${index + 1}:`));
        console.log(chalk.gray(`Raw Location: "${locationText}"`));
        
        // Extract venue and address using the smart extractor
        const extracted = venueExtractor.extractVenueAndAddress(locationText);
        
        // Process with existing LocationUtils for region detection
        const locationData = locationUtils.parseLocation(locationText);
        
        // Combine results for optimal data
        const venue = extracted.venue || locationData.venue || '';
        const address = extracted.address || locationData.address || '';
        const region = locationUtils.getRegion(address);
        
        // Validate the final address format
        const validation = locationUtils.validateAddress(address);
        
        const result = {
            original: locationText,
            venue: venue,
            address: address,
            region: region,
            confidence: extracted.confidence,
            strategy: extracted.strategy,
            valid: validation.valid,
            suggestion: validation.suggestion || null
        };
        
        results.push(result);
        
        // Display results with appropriate coloring
        const confidenceColor = extracted.confidence >= 0.7 ? 'green' : 
                               extracted.confidence >= 0.5 ? 'yellow' : 'red';
        const regionColor = region === 'bayArea' ? 'blue' : 'magenta';
        
        console.log(chalk.green(`🏢 Venue: "${venue}"`));
        console.log(chalk.cyan(`🏠 Address: "${address}"`));
        console.log(chalk[regionColor](`📍 Region: ${region}`));
        console.log(chalk[confidenceColor](`🎯 Confidence: ${extracted.confidence} (${extracted.strategy})`));
        
        if (!validation.valid) {
            console.log(chalk.red(`⚠️  Address Issue: ${validation.error}`));
            if (validation.suggestion) {
                console.log(chalk.yellow(`💡 Suggested Fix: "${validation.suggestion}"`));
            }
        } else {
            console.log(chalk.green('✅ Address Format Valid'));
        }
    });
    
    // Generate comprehensive statistics
    console.log(chalk.bold.cyan('\n📊 Extraction Results Summary'));
    console.log(chalk.gray('=' .repeat(70)));
    
    const stats = venueExtractor.getStats(results);
    const validAddresses = results.filter(r => r.valid).length;
    const bayAreaEvents = results.filter(r => r.region === 'bayArea').length;
    const austinEvents = results.filter(r => r.region === 'austin').length;
    
    console.log(chalk.white(`Total Events Processed: ${results.length}`));
    console.log(chalk.green(`Venues Successfully Extracted: ${stats.venuesFound} (${stats.venueSuccessRate}%)`));
    console.log(chalk.blue(`Valid Address Format: ${validAddresses} (${Math.round((validAddresses/results.length)*100)}%)`));
    console.log(chalk.yellow(`Average Confidence: ${stats.avgConfidence}`));
    
    console.log(chalk.cyan('\nRegion Distribution:'));
    console.log(chalk.blue(`  Bay Area: ${bayAreaEvents} events`));
    console.log(chalk.magenta(`  Austin: ${austinEvents} events`));
    
    console.log(chalk.cyan('\nExtraction Strategy Usage:'));
    Object.entries(stats.strategies).forEach(([strategy, count]) => {
        const percentage = Math.round((count / results.length) * 100);
        console.log(chalk.white(`  ${strategy}: ${count} (${percentage}%)`));
    });
    
    // Show potential improvements needed
    const lowConfidence = results.filter(r => r.confidence < 0.5);
    const invalidAddresses = results.filter(r => !r.valid);
    const missingVenues = results.filter(r => !r.venue);
    
    if (lowConfidence.length > 0 || invalidAddresses.length > 0 || missingVenues.length > 0) {
        console.log(chalk.red('\n⚠️  Areas for Improvement:'));
        if (lowConfidence.length > 0) {
            console.log(chalk.red(`  ${lowConfidence.length} results with low confidence (<0.5)`));
        }
        if (invalidAddresses.length > 0) {
            console.log(chalk.red(`  ${invalidAddresses.length} results with invalid address format`));
        }
        if (missingVenues.length > 0) {
            console.log(chalk.red(`  ${missingVenues.length} results with missing venue names`));
        }
    }
    
    console.log(chalk.green('\n✅ Demo completed successfully!'));
    
    return results;
}

// Integration helper function for actual scraper use
function processEventLocation(rawLocation, options = {}) {
    const venueExtractor = new VenueExtractor();
    const locationUtils = new LocationUtils();
    
    // Extract venue and address
    const extracted = venueExtractor.extractVenueAndAddress(rawLocation, options);
    
    // Ensure proper formatting and region detection
    const address = locationUtils.formatAddress(extracted.address);
    const region = locationUtils.getRegion(address);
    const validation = locationUtils.validateAddress(address);
    
    // Return data in format expected by Hash app
    return {
        venue: extracted.venue || '',
        address: validation.valid ? address : (validation.suggestion || address),
        city: locationUtils.extractCityFromText(address),
        region: region,
        metadata: {
            confidence: extracted.confidence,
            strategy: extracted.strategy,
            valid: validation.valid,
            originalText: rawLocation
        }
    };
}

// Example usage function for scraper integration
function integrateWithHashScraper(eventData) {
    console.log(chalk.bold.cyan('\n🔗 Hash Scraper Integration Example'));
    console.log(chalk.gray('=' .repeat(50)));
    
    const processedEvent = {
        ...eventData,
        location: processEventLocation(eventData.rawLocation || eventData.location, { debug: false })
    };
    
    console.log(chalk.yellow('Original Event:'));
    console.log(JSON.stringify(eventData, null, 2));
    
    console.log(chalk.green('\nProcessed Event:'));
    console.log(JSON.stringify(processedEvent, null, 2));
    
    return processedEvent;
}

// Run the demo if this file is executed directly
if (require.main === module) {
    // Run main demonstration
    const results = demonstrateVenueExtraction();
    
    // Show integration example
    console.log('\n' + '='.repeat(70));
    const sampleEvent = {
        id: 'demo-event-123',
        title: 'Sample Music Event',
        description: 'A great music event in the city',
        rawLocation: 'Live music at The Chapel, 777 Valencia Street, San Francisco, CA',
        date: '2024-12-25T19:00:00Z',
        price: 25
    };
    
    const processedEvent = integrateWithHashScraper(sampleEvent);
    
    console.log(chalk.cyan('\n💡 Usage in Hash Scraper:'));
    console.log(chalk.gray('const processEventLocation = require("./utils/venueExtractor");'));
    console.log(chalk.gray('const processed = processEventLocation(event.location);'));
    console.log(chalk.gray('event.venue = processed.venue;'));
    console.log(chalk.gray('event.address = processed.address;'));
    console.log(chalk.gray('event.region = processed.region;'));
}

module.exports = {
    demonstrateVenueExtraction,
    processEventLocation,
    integrateWithHashScraper
};