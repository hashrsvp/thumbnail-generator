#!/usr/bin/env node

/**
 * HASH SCRAPER CRITICAL FIXES PATCH
 * 
 * This patch fixes the two critical issues in the Hash event scraper:
 * 
 * 1. TIME EXTRACTION FIX: Prevents UTC conversion, preserves local timezone
 * 2. IMAGE EXTRACTION FIX: Ensures images are properly extracted and displayed
 * 
 * USAGE: This patch should be integrated into the main scraper and Firebase functions
 */

const LocalTimeParser = require('./utils/localTimeParser');
const EnhancedImageExtractor = require('./utils/enhancedImageExtractor');

class HashScraperPatch {
    constructor() {
        // Initialize the fixed parsers
        this.localTimeParser = new LocalTimeParser({
            defaultTime: '19:00:00', // 7:00 PM default
            assumeEvening: true,     // Assume evening times for events
            preserveLocalTime: true  // NEVER convert to UTC
        });
        
        this.imageExtractor = new EnhancedImageExtractor({
            timeout: 10000,
            maxImages: 5,
            minWidth: 300,
            minHeight: 300,
            idealWidth: 800,
            idealHeight: 800
        });
        
        console.log('🔧 Hash Scraper Patch initialized with LOCAL time preservation');
    }
    
    /**
     * CRITICAL FIX 1: Extract time preserving LOCAL timezone
     * 
     * This replaces the problematic UTC conversion in the original scraper.
     * The Hash app expects local times as displayed on the event website.
     */
    extractLocalDateTime(text, pageContent = '') {
        console.log('🕐 Extracting LOCAL time (no UTC conversion)...');
        
        // Combine text sources for better parsing
        const combinedText = `${text} ${pageContent}`.substring(0, 10000); // Limit size
        
        // Use the new local time parser
        const result = this.localTimeParser.parseDateTime(combinedText);
        
        if (result.confidence > 0) {
            console.log(`✅ LOCAL time extracted:`);
            console.log(`   Date: ${result.date}`);
            console.log(`   Start Time: ${result.startTime}`);
            console.log(`   End Time: ${result.endTime || 'Not specified'}`);
            console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`   🚨 PRESERVED LOCAL TIMEZONE (no UTC conversion)`);
            
            return {
                date: result.date,
                startTime: result.startTime,
                endTime: result.endTime,
                confidence: result.confidence,
                method: 'local_time_parser_patch',
                preservedLocalTime: true
            };
        }
        
        console.log('⚠️  No time information found, using defaults');
        return {
            date: null,
            startTime: '19:00:00', // Default 7 PM
            endTime: null,
            confidence: 0,
            method: 'default_time',
            preservedLocalTime: true
        };
    }
    
    /**
     * CRITICAL FIX 2: Enhanced image extraction with frontend coordination
     * 
     * This ensures images are properly extracted and automatically populate
     * in the scraped event form on the frontend.
     */
    async extractBestEventImage(url, eventTitle = '', eventVenue = '') {
        console.log('🖼️  Extracting best event image with frontend coordination...');
        
        try {
            const result = await this.imageExtractor.extractBestImage(url, eventTitle, eventVenue);
            
            if (result && result.imageUrl) {
                console.log(`✅ Image extracted for frontend:`);
                console.log(`   Primary Image: ${result.imageUrl}`);
                console.log(`   Alternative Images: ${result.imageUrls.length}`);
                console.log(`   Quality Score: ${result.bestImageMetadata.score}`);
                console.log(`   Dimensions: ${result.bestImageMetadata.width}x${result.bestImageMetadata.height}`);
                console.log(`   🚨 READY FOR FRONTEND COORDINATION`);
                
                return {
                    imageUrl: result.imageUrl,
                    imageUrls: result.imageUrls,
                    imageMetadata: result.bestImageMetadata,
                    frontendReady: true,
                    extractionMethod: 'enhanced_image_extractor_patch'
                };
            }
            
            console.log('⚠️  No suitable images found');
            return {
                imageUrl: null,
                imageUrls: [],
                imageMetadata: null,
                frontendReady: false,
                extractionMethod: 'no_images_found'
            };
            
        } catch (error) {
            console.error('❌ Image extraction error:', error);
            return {
                imageUrl: null,
                imageUrls: [],
                imageMetadata: null,
                frontendReady: false,
                extractionMethod: 'extraction_failed',
                error: error.message
            };
        }
    }
    
    /**
     * INTEGRATED FIX: Process scraped event data with both fixes applied
     * 
     * This method applies both the time and image fixes to scraped event data,
     * ensuring it's properly formatted for the Hash app and frontend.
     */
    async processScrapedEventData(rawData, sourceUrl) {
        console.log('🔧 Processing scraped event data with Hash fixes...');
        
        const processedData = { ...rawData };
        
        // CRITICAL FIX 1: Apply local time parsing
        const combinedText = [
            rawData.title,
            rawData.description,
            rawData.venue,
            rawData.rawContent // If available
        ].filter(Boolean).join(' ');
        
        const timeResult = this.extractLocalDateTime(combinedText);
        
        // Override any UTC-converted times with local times
        if (timeResult.date) {
            processedData.date = timeResult.date;
        }
        if (timeResult.startTime) {
            processedData.startTime = timeResult.startTime;
        }
        if (timeResult.endTime) {
            processedData.endTime = timeResult.endTime;
        }
        
        // Add time extraction metadata
        processedData._timeExtraction = {
            method: timeResult.method,
            confidence: timeResult.confidence,
            preservedLocalTime: timeResult.preservedLocalTime,
            appliedFix: 'local_time_parser_patch'
        };
        
        // CRITICAL FIX 2: Apply enhanced image extraction
        if (sourceUrl) {
            const imageResult = await this.extractBestEventImage(
                sourceUrl,
                processedData.title,
                processedData.venue
            );
            
            // Override any existing image data with enhanced extraction
            if (imageResult.imageUrl) {
                processedData.imageUrl = imageResult.imageUrl;
                processedData.imageUrls = imageResult.imageUrls;
                processedData._imageExtraction = imageResult.imageMetadata;
                processedData._imageExtraction.appliedFix = 'enhanced_image_extractor_patch';
            }
        }
        
        // Ensure Hash app compatibility
        processedData._patchApplied = {
            localTimePreservation: true,
            enhancedImageExtraction: true,
            version: '1.0.0',
            timestamp: new Date().toISOString()
        };
        
        console.log('✅ Event data processed with Hash fixes applied');
        console.log(`   📅 Date: ${processedData.date}`);
        console.log(`   🕐 Start Time: ${processedData.startTime} (LOCAL)`);
        console.log(`   🖼️  Image URL: ${processedData.imageUrl ? 'Available' : 'Not found'}`);
        
        return processedData;
    }
    
    /**
     * Validation helper: Ensure data meets Hash app requirements
     */
    validateHashAppCompatibility(eventData) {
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        // Check time format (must be HH:MM:SS)
        if (eventData.startTime) {
            if (!/^\\d{2}:\\d{2}:\\d{2}$/.test(eventData.startTime)) {
                validation.errors.push('startTime must be in HH:MM:SS format');
                validation.valid = false;
            }
        }
        
        if (eventData.endTime) {
            if (!/^\\d{2}:\\d{2}:\\d{2}$/.test(eventData.endTime)) {
                validation.errors.push('endTime must be in HH:MM:SS format');
                validation.valid = false;
            }
        }
        
        // Check date format (must be YYYY-MM-DD)
        if (eventData.date) {
            if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(eventData.date)) {
                validation.errors.push('date must be in YYYY-MM-DD format');
                validation.valid = false;
            }
        }
        
        // Check image URL format
        if (eventData.imageUrl) {
            try {
                new URL(eventData.imageUrl);
            } catch (e) {
                validation.warnings.push('imageUrl may not be a valid URL');
            }
        }
        
        // Check for UTC time indicators (should not exist with our fix)
        if (eventData.startTime && eventData.startTime.includes('Z')) {
            validation.errors.push('startTime contains UTC indicator (Z) - local time fix not applied');
            validation.valid = false;
        }
        
        if (eventData.date && eventData.date.includes('T')) {
            validation.warnings.push('date contains time component - may indicate UTC conversion');
        }
        
        return validation;
    }
    
    /**
     * Frontend coordination helper: Format data for the scraped event form
     */
    formatForFrontendForm(eventData) {
        console.log('📱 Formatting data for frontend scraped event form...');
        
        return {
            // Core event data
            title: eventData.title || '',
            venue: eventData.venue || '',
            address: eventData.address || '',
            description: eventData.description || '',
            
            // Time data (LOCAL TIMEZONE PRESERVED)
            date: eventData.date || '',
            startTime: eventData.startTime || '19:00:00',
            endTime: eventData.endTime || '',
            
            // Image data (ENHANCED EXTRACTION)
            imageUrl: eventData.imageUrl || '',
            imageUrls: eventData.imageUrls || [],
            
            // Categories and flags
            categories: eventData.categories || [],
            free: Boolean(eventData.free),
            soldOut: Boolean(eventData.soldOut || eventData.soldOutStatus),
            
            // Links
            ticketsLink: eventData.ticketsLink || eventData.ticketUrl || '',
            
            // Metadata for debugging
            _extraction: {
                method: 'hash_scraper_patch',
                timePreserved: eventData._timeExtraction?.preservedLocalTime,
                imageExtracted: Boolean(eventData.imageUrl),
                patchVersion: '1.0.0',
                timestamp: new Date().toISOString()
            }
        };
    }
}

/**
 * INTEGRATION HELPER: Apply patch to existing scraper results
 * 
 * This function can be used to retroactively fix existing scraper results
 * that may have UTC time conversion issues or missing images.
 */
async function applyHashScraperPatch(scrapedData, sourceUrl) {
    const patch = new HashScraperPatch();
    
    console.log('🔧 Applying Hash Scraper Patch to existing data...');
    
    try {
        // Process with fixes
        const fixedData = await patch.processScrapedEventData(scrapedData, sourceUrl);
        
        // Validate compatibility
        const validation = patch.validateHashAppCompatibility(fixedData);
        
        if (!validation.valid) {
            console.error('❌ Patched data failed validation:', validation.errors);
            fixedData._validationErrors = validation.errors;
        }
        
        if (validation.warnings.length > 0) {
            console.warn('⚠️  Validation warnings:', validation.warnings);
            fixedData._validationWarnings = validation.warnings;
        }
        
        // Format for frontend
        const frontendData = patch.formatForFrontendForm(fixedData);
        
        console.log('✅ Hash Scraper Patch applied successfully');
        
        return {
            originalData: scrapedData,
            patchedData: fixedData,
            frontendData: frontendData,
            validation: validation,
            patchApplied: true
        };
        
    } catch (error) {
        console.error('❌ Error applying Hash Scraper Patch:', error);
        
        return {
            originalData: scrapedData,
            patchedData: null,
            frontendData: null,
            validation: { valid: false, errors: [error.message] },
            patchApplied: false,
            error: error.message
        };
    }
}

module.exports = {
    HashScraperPatch,
    applyHashScraperPatch
};