#!/usr/bin/env node

/**
 * INTEGRATION PATCH FOR HASH EVENT SCRAPER
 * 
 * This file provides the integration points to apply the Hash Scraper Patch
 * to the existing improved-event-scraper-2.js and Firebase Cloud Function.
 * 
 * INSTRUCTIONS FOR INTEGRATION:
 * 1. Add this to the top of improved-event-scraper-2.js after existing imports
 * 2. Replace the extractDateTime and extractImages functions with patched versions
 * 3. Update the Firebase Cloud Function to use the patched data processing
 */

const { HashScraperPatch, applyHashScraperPatch } = require('./hashScraperPatch');

/**
 * INTEGRATION POINT 1: Initialize the patch in the main scraper class
 * 
 * Add this to the EventScraper constructor after existing initialization:
 */
const SCRAPER_PATCH_INIT = `
// HASH SCRAPER PATCH INTEGRATION
this.hashScraperPatch = new HashScraperPatch();
console.log('🔧 Hash Scraper Patch integrated - Local time preservation and enhanced images enabled');
`;

/**
 * INTEGRATION POINT 2: Replace the problematic extractDateTime method
 * 
 * Replace the existing extractDateTime method with this patched version:
 */
function extractDateTime_PATCHED(text, pageContent = '') {
    console.log('🕐 PATCHED: Extracting time with LOCAL timezone preservation...');
    
    // Use the patched local time parser instead of UTC conversion
    return this.hashScraperPatch.extractLocalDateTime(text, pageContent);
}

/**
 * INTEGRATION POINT 3: Replace/enhance the image extraction
 * 
 * Replace or enhance existing image extraction with this patched version:
 */
async function extractImages_PATCHED(url, eventTitle = '', eventVenue = '') {
    console.log('🖼️  PATCHED: Enhanced image extraction with frontend coordination...');
    
    try {
        // Try existing image extraction first
        let existingResult = null;
        try {
            if (this.imageSelector && typeof this.imageSelector.selectBestImage === 'function') {
                // Use existing ImageSelector if available
                existingResult = await this.imageSelector.selectBestImage([], eventTitle, eventVenue);
            }
        } catch (error) {
            console.log('📷 Falling back to patched image extractor...');
        }
        
        // Use patched image extractor (enhanced version)
        const patchedResult = await this.hashScraperPatch.extractBestEventImage(url, eventTitle, eventVenue);
        
        // Prefer patched result if better, or use as fallback
        if (patchedResult.imageUrl) {
            return {
                imageUrl: patchedResult.imageUrl,
                imageUrls: patchedResult.imageUrls,
                imageMetadata: patchedResult.imageMetadata,
                extractionMethod: 'patched_enhanced_extractor',
                frontendReady: true
            };
        }
        
        // Return existing result if patched extraction failed
        if (existingResult) {
            return {
                imageUrl: existingResult,
                imageUrls: [existingResult],
                extractionMethod: 'existing_selector',
                frontendReady: false
            };
        }
        
        return {
            imageUrl: null,
            imageUrls: [],
            extractionMethod: 'no_extraction_available',
            frontendReady: false
        };
        
    } catch (error) {
        console.error('❌ PATCHED image extraction error:', error);
        return {
            imageUrl: null,
            imageUrls: [],
            error: error.message,
            extractionMethod: 'extraction_failed'
        };
    }
}

/**
 * INTEGRATION POINT 4: Process final scraped data with patch
 * 
 * Add this method to the EventScraper class or use it in the main scraping workflow:
 */
async function processScrapedData_PATCHED(scrapedData, sourceUrl) {
    console.log('🔧 PATCHED: Processing scraped data with Hash fixes...');
    
    try {
        // Apply comprehensive patch (time + images + validation)
        const result = await applyHashScraperPatch(scrapedData, sourceUrl);
        
        if (result.patchApplied) {
            console.log('✅ Hash Scraper Patch applied successfully');
            
            // Return data formatted for both Firebase and frontend
            return {
                // Data for Firebase storage (validated and fixed)
                firebaseData: result.patchedData,
                
                // Data for frontend form population
                frontendData: result.frontendData,
                
                // Validation results
                validation: result.validation,
                
                // Original data for comparison
                originalData: result.originalData,
                
                // Patch metadata
                patchInfo: {
                    version: '1.0.0',
                    applied: true,
                    localTimePreserved: result.patchedData._timeExtraction?.preservedLocalTime,
                    imageEnhanced: Boolean(result.patchedData.imageUrl),
                    timestamp: new Date().toISOString()
                }
            };
        } else {
            console.warn('⚠️  Hash Scraper Patch could not be applied, using original data');
            return {
                firebaseData: scrapedData,
                frontendData: scrapedData,
                validation: { valid: false, errors: ['Patch application failed'] },
                originalData: scrapedData,
                patchInfo: {
                    version: '1.0.0',
                    applied: false,
                    error: result.error
                }
            };
        }
        
    } catch (error) {
        console.error('❌ Error processing scraped data with patch:', error);
        
        // Return original data with error info
        return {
            firebaseData: scrapedData,
            frontendData: scrapedData,
            validation: { valid: false, errors: [error.message] },
            originalData: scrapedData,
            patchInfo: {
                version: '1.0.0',
                applied: false,
                error: error.message
            }
        };
    }
}

/**
 * FIREBASE CLOUD FUNCTION INTEGRATION
 * 
 * Update your Firebase Cloud Function to use the patched scraper:
 */
const FIREBASE_FUNCTION_PATCH = `
const { HashScraperPatch, applyHashScraperPatch } = require('./hashScraperPatch');

exports.scrapeEvent = functions.https.onRequest(async (req, res) => {
    try {
        // ... existing scraper initialization ...
        
        // Initialize patch
        const hashPatch = new HashScraperPatch();
        
        // ... existing scraping logic ...
        
        // CRITICAL: Apply patch before saving to Firebase
        const patchResult = await applyHashScraperPatch(scrapedData, req.body.url);
        
        if (patchResult.patchApplied && patchResult.validation.valid) {
            console.log('✅ Using patched data with local time preservation and enhanced images');
            
            // Use patched data for Firebase storage
            const dataToSave = patchResult.patchedData;
            
            // ... save to Firebase using dataToSave ...
            
            // Return frontend-ready data in response
            res.json({
                success: true,
                data: patchResult.frontendData,
                patchApplied: true,
                localTimePreserved: true,
                imageEnhanced: Boolean(dataToSave.imageUrl),
                validation: patchResult.validation
            });
            
        } else {
            console.warn('⚠️  Using original data due to patch validation failure');
            
            // Fallback to original data
            // ... existing save logic ...
            
            res.json({
                success: true,
                data: scrapedData,
                patchApplied: false,
                validationErrors: patchResult.validation?.errors
            });
        }
        
    } catch (error) {
        console.error('❌ Error in patched scrapeEvent function:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});
`;

/**
 * FRONTEND JAVASCRIPT INTEGRATION
 * 
 * Update the frontend scraper response handler to use patched data:
 */
const FRONTEND_INTEGRATION = `
// In the scrapeEvent() function response handler, after successful scraping:
if (data.success && data.patchApplied) {
    console.log('✅ Received patched data with local time preservation');
    
    // Populate form with patched data
    populateScrapedForm(data.data);
    
    // Show patch status
    if (data.localTimePreserved) {
        showScrapeStatus('🕐 Time preserved in local timezone (no UTC conversion)', 'success');
    }
    
    if (data.imageEnhanced) {
        showScrapeStatus('🖼️  Enhanced image extraction applied', 'success');
        
        // Auto-populate image preview if available
        if (data.data.imageUrl) {
            const preview = document.getElementById('scrapedImagePreview');
            const previewImg = document.getElementById('scrapedPreviewImage');
            
            if (preview && previewImg) {
                previewImg.src = data.data.imageUrl;
                previewImg.style.display = 'block';
                preview.classList.add('show');
                
                console.log('✅ Image automatically populated in preview');
            }
        }
    }
    
} else if (data.success) {
    console.warn('⚠️  Using unpitched data (patch not applied)');
    populateScrapedForm(data.data);
    
    if (data.validationErrors) {
        showScrapeStatus('⚠️  Data validation issues: ' + data.validationErrors.join(', '), 'warning');
    }
}
`;

/**
 * STEP-BY-STEP INTEGRATION INSTRUCTIONS
 */
const INTEGRATION_INSTRUCTIONS = `
HASH SCRAPER PATCH - INTEGRATION INSTRUCTIONS
==============================================

1. BACKEND INTEGRATION (Firebase Functions):
   - Copy hashScraperPatch.js to your Firebase functions directory
   - Copy localTimeParser.js and enhancedImageExtractor.js to utils/
   - Update your scrapeEvent Cloud Function with the FIREBASE_FUNCTION_PATCH code
   - Deploy updated functions: firebase deploy --only functions

2. SCRAPER INTEGRATION (Local Scripts):
   - Add SCRAPER_PATCH_INIT to EventScraper constructor in improved-event-scraper-2.js
   - Replace extractDateTime method with extractDateTime_PATCHED
   - Replace or enhance image extraction with extractImages_PATCHED  
   - Add processScrapedData_PATCHED method to the class

3. FRONTEND INTEGRATION (Website):
   - Update the scrapeEvent response handler with FRONTEND_INTEGRATION code
   - Test image auto-population in the scraped event form
   - Verify local time preservation in form fields

4. TESTING:
   - Test with events that have specific times (should preserve local time)
   - Test with events that have promotional images (should auto-populate)
   - Verify form data matches what's shown on the original event website

5. MONITORING:
   - Check console logs for "🔧 Hash Scraper Patch" messages
   - Verify "PRESERVED LOCAL TIMEZONE" appears in time extraction logs
   - Confirm "READY FOR FRONTEND COORDINATION" appears for images

CRITICAL REQUIREMENTS:
- Never call .toISOString() on dates for time extraction
- Never convert times to UTC in any parser
- Always preserve local timezone as shown on event website
- Ensure images automatically populate in frontend form
- Validate all extracted data meets Hash app requirements

For questions or issues, check the patch validation results and console logs.
`;

module.exports = {
    extractDateTime_PATCHED,
    extractImages_PATCHED,
    processScrapedData_PATCHED,
    SCRAPER_PATCH_INIT,
    FIREBASE_FUNCTION_PATCH,
    FRONTEND_INTEGRATION,
    INTEGRATION_INSTRUCTIONS
};