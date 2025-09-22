#!/usr/bin/env node

/**
 * Enhanced Image Extractor for Hash Event Scraper
 * 
 * CRITICAL FIX: This extractor ensures image URLs are properly extracted 
 * and automatically populated in the frontend scraper form.
 * 
 * Focuses on finding the best promotional/event images and ensuring
 * proper coordination between backend extraction and frontend display.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');

class EnhancedImageExtractor {
    constructor(options = {}) {
        this.options = {
            timeout: 10000,
            maxImages: 5,
            minWidth: 300,
            minHeight: 300,
            idealWidth: 800,
            idealHeight: 800,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...options
        };
        
        // Image quality indicators (prioritized)
        this.qualityIndicators = {
            // High quality promotional images
            high: [
                'hero', 'banner', 'featured', 'main', 'primary', 'cover',
                'poster', 'flyer', 'promo', 'promotional', 'event-image',
                'og:image', 'twitter:image', 'event-banner', 'event-poster'
            ],
            
            // Medium quality images  
            medium: [
                'thumbnail', 'preview', 'card', 'tile', 'listing',
                'social', 'share', 'image', 'photo', 'pic'
            ],
            
            // Low quality (avoid these)
            low: [
                'icon', 'logo', 'avatar', 'profile', 'badge', 'tiny',
                'small', 'mini', 'pixel', 'spacer', 'border'
            ]
        };
        
        // Selectors for finding images (prioritized)
        this.imageSelectors = [
            // OpenGraph and Twitter Card images (highest priority)
            'meta[property="og:image"]',
            'meta[name="twitter:image"]', 
            'meta[name="twitter:image:src"]',
            
            // Event-specific selectors
            'img[class*="event"]',
            'img[class*="banner"]', 
            'img[class*="hero"]',
            'img[class*="featured"]',
            'img[class*="poster"]',
            'img[class*="flyer"]',
            
            // JSON-LD structured data
            'script[type="application/ld+json"]',
            
            // Generic high-quality selectors
            '.hero img',
            '.banner img',
            '.featured img',
            '.main-image img',
            '.event-image img',
            '.poster img',
            
            // Fallback selectors
            'img[src*="event"]',
            'img[src*="banner"]',
            'img[src*="poster"]',
            'img[alt*="event"]',
            'img[alt*="poster"]',
            
            // Last resort
            'img'
        ];
        
        // CDN patterns for high-quality hosted images
        this.cdnPatterns = [
            'cdn.', 'cloudinary', 'imgix', 'fastly', 'cloudflare',
            'amazonaws', 's3.', 'firebase', 'googleusercontent',
            'eventbrite', 'ticketmaster', 'stubhub', 'seatgeek'
        ];
    }
    
    /**
     * Extract images from URL with enhanced selection logic
     * Returns the best image URL for the Hash app frontend
     */
    async extractBestImage(url, eventTitle = '', eventVenue = '') {
        console.log(`🖼️  Enhanced image extraction for: ${url}`);
        
        try {
            // Step 1: Extract all candidate images
            const candidates = await this.extractAllImages(url);
            
            if (candidates.length === 0) {
                console.log('❌ No images found');
                return null;
            }
            
            console.log(`📷 Found ${candidates.length} image candidates`);
            
            // Step 2: Score and rank images
            const scoredImages = await this.scoreImages(candidates, eventTitle, eventVenue);
            
            if (scoredImages.length === 0) {
                console.log('❌ No valid images after scoring');
                return null;
            }
            
            // Step 3: Return best image with metadata
            const bestImage = scoredImages[0];
            
            console.log(`✅ Selected best image: ${bestImage.url}`);
            console.log(`   Quality score: ${bestImage.score}`);
            console.log(`   Dimensions: ${bestImage.width}x${bestImage.height}`);
            console.log(`   Source: ${bestImage.source}`);
            
            return {
                imageUrl: bestImage.url,
                imageUrls: scoredImages.slice(0, this.options.maxImages).map(img => img.url),
                bestImageMetadata: {
                    score: bestImage.score,
                    width: bestImage.width,
                    height: bestImage.height,
                    source: bestImage.source,
                    alt: bestImage.alt,
                    extractionMethod: 'enhanced_image_extractor'
                }
            };
            
        } catch (error) {
            console.error('Error in enhanced image extraction:', error);
            return null;
        }
    }
    
    /**
     * Extract all candidate images from the page
     */
    async extractAllImages(url) {
        const candidates = [];
        
        try {
            // Fetch page content
            const response = await axios.get(url, {
                timeout: this.options.timeout,
                headers: {
                    'User-Agent': this.options.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
                }
            });
            
            const $ = cheerio.load(response.data);
            
            // Extract images using prioritized selectors
            for (const selector of this.imageSelectors) {
                await this.extractFromSelector($, selector, candidates, url);
            }
            
            // Extract from JSON-LD structured data
            await this.extractFromJsonLD($, candidates, url);
            
            // Remove duplicates
            const uniqueCandidates = this.removeDuplicateImages(candidates);
            
            console.log(`📋 ${uniqueCandidates.length} unique image candidates found`);
            return uniqueCandidates;
            
        } catch (error) {
            console.error('Error extracting images:', error);
            return [];
        }
    }
    
    /**
     * Extract images from specific selector
     */
    async extractFromSelector($, selector, candidates, baseUrl) {
        try {
            $(selector).each((i, element) => {
                let imageUrl = null;
                let alt = '';
                let source = selector;
                
                if (selector.includes('meta')) {
                    // Meta tag images (og:image, twitter:image)
                    imageUrl = $(element).attr('content');
                    source = 'meta_tag';
                } else if (selector.includes('script')) {
                    // JSON-LD handled separately
                    return;
                } else {
                    // Regular img tags
                    imageUrl = $(element).attr('src') || $(element).attr('data-src') || $(element).attr('data-lazy-src');
                    alt = $(element).attr('alt') || '';
                    source = 'img_tag';
                }
                
                if (imageUrl) {
                    // Convert relative URLs to absolute
                    const absoluteUrl = this.makeAbsoluteUrl(imageUrl, baseUrl);
                    
                    if (this.isValidImageUrl(absoluteUrl)) {
                        candidates.push({
                            url: absoluteUrl,
                            alt: alt,
                            source: source,
                            selector: selector,
                            priority: this.getSelectorPriority(selector)
                        });
                    }
                }
            });
        } catch (error) {
            console.warn(`Error extracting from selector ${selector}:`, error);
        }
    }
    
    /**
     * Extract images from JSON-LD structured data
     */
    async extractFromJsonLD($, candidates, baseUrl) {
        try {
            $('script[type="application/ld+json"]').each((i, element) => {
                try {
                    const jsonData = JSON.parse($(element).html());
                    const images = this.extractImagesFromJsonObject(jsonData, baseUrl);
                    
                    images.forEach(img => {
                        candidates.push({
                            ...img,
                            source: 'json_ld',
                            priority: 100 // High priority for structured data
                        });
                    });
                } catch (e) {
                    // Skip invalid JSON
                }
            });
        } catch (error) {
            console.warn('Error extracting from JSON-LD:', error);
        }
    }
    
    /**
     * Recursively extract images from JSON-LD object
     */
    extractImagesFromJsonObject(obj, baseUrl) {
        const images = [];
        
        if (!obj || typeof obj !== 'object') return images;
        
        // Handle arrays
        if (Array.isArray(obj)) {
            obj.forEach(item => {
                images.push(...this.extractImagesFromJsonObject(item, baseUrl));
            });
            return images;
        }
        
        // Look for image properties
        const imageProps = ['image', 'photo', 'logo', 'thumbnail', 'poster', 'banner'];
        
        for (const prop of imageProps) {
            if (obj[prop]) {
                const imageData = obj[prop];
                
                if (typeof imageData === 'string') {
                    const absoluteUrl = this.makeAbsoluteUrl(imageData, baseUrl);
                    if (this.isValidImageUrl(absoluteUrl)) {
                        images.push({
                            url: absoluteUrl,
                            alt: prop,
                            selector: `json_ld.${prop}`
                        });
                    }
                } else if (Array.isArray(imageData)) {
                    imageData.forEach(img => {
                        if (typeof img === 'string') {
                            const absoluteUrl = this.makeAbsoluteUrl(img, baseUrl);
                            if (this.isValidImageUrl(absoluteUrl)) {
                                images.push({
                                    url: absoluteUrl,
                                    alt: prop,
                                    selector: `json_ld.${prop}[]`
                                });
                            }
                        } else if (img && img.url) {
                            const absoluteUrl = this.makeAbsoluteUrl(img.url, baseUrl);
                            if (this.isValidImageUrl(absoluteUrl)) {
                                images.push({
                                    url: absoluteUrl,
                                    alt: img.description || img.caption || prop,
                                    selector: `json_ld.${prop}[].url`
                                });
                            }
                        }
                    });
                } else if (imageData && imageData.url) {
                    const absoluteUrl = this.makeAbsoluteUrl(imageData.url, baseUrl);
                    if (this.isValidImageUrl(absoluteUrl)) {
                        images.push({
                            url: absoluteUrl,
                            alt: imageData.description || imageData.caption || prop,
                            selector: `json_ld.${prop}.url`
                        });
                    }
                }
            }
        }
        
        // Recursively search nested objects
        Object.values(obj).forEach(value => {
            if (typeof value === 'object') {
                images.push(...this.extractImagesFromJsonObject(value, baseUrl));
            }
        });
        
        return images;
    }
    
    /**
     * Score and rank images by quality
     */
    async scoreImages(candidates, eventTitle, eventVenue) {
        const scoredImages = [];
        
        for (const candidate of candidates) {
            try {
                const score = await this.calculateImageScore(candidate, eventTitle, eventVenue);
                
                if (score > 0) {
                    scoredImages.push({
                        ...candidate,
                        score: score
                    });
                }
            } catch (error) {
                console.warn(`Error scoring image ${candidate.url}:`, error);
            }
        }
        
        // Sort by score (highest first)
        scoredImages.sort((a, b) => b.score - a.score);
        
        return scoredImages;
    }
    
    /**
     * Calculate quality score for an image
     */
    async calculateImageScore(candidate, eventTitle, eventVenue) {
        let score = 0;
        
        // Base score from selector priority
        score += candidate.priority || 0;
        
        // Score URL quality indicators
        const url = candidate.url.toLowerCase();
        
        // High quality indicators
        for (const indicator of this.qualityIndicators.high) {
            if (url.includes(indicator) || candidate.alt.toLowerCase().includes(indicator)) {
                score += 20;
                break; // Only count once per category
            }
        }
        
        // Medium quality indicators
        for (const indicator of this.qualityIndicators.medium) {
            if (url.includes(indicator) || candidate.alt.toLowerCase().includes(indicator)) {
                score += 10;
                break;
            }
        }
        
        // Penalize low quality indicators
        for (const indicator of this.qualityIndicators.low) {
            if (url.includes(indicator) || candidate.alt.toLowerCase().includes(indicator)) {
                score -= 30;
                break;
            }
        }
        
        // CDN bonus (usually higher quality)
        for (const cdn of this.cdnPatterns) {
            if (url.includes(cdn)) {
                score += 15;
                break;
            }
        }
        
        // File extension bonus
        if (url.match(/\\.(jpg|jpeg|png|webp)($|\\?)/)) {
            score += 10;
        }
        
        // Event relevance bonus
        if (eventTitle) {
            const titleWords = eventTitle.toLowerCase().split(/\\s+/);
            for (const word of titleWords) {
                if (word.length > 3 && (url.includes(word) || candidate.alt.toLowerCase().includes(word))) {
                    score += 5;
                }
            }
        }
        
        if (eventVenue) {
            const venueWords = eventVenue.toLowerCase().split(/\\s+/);
            for (const word of venueWords) {
                if (word.length > 3 && (url.includes(word) || candidate.alt.toLowerCase().includes(word))) {
                    score += 5;
                }
            }
        }
        
        // Try to get dimensions (if possible)
        try {
            const dimensions = await this.getImageDimensions(candidate.url);
            if (dimensions) {
                candidate.width = dimensions.width;
                candidate.height = dimensions.height;
                
                // Size bonus
                if (dimensions.width >= this.options.idealWidth && dimensions.height >= this.options.idealHeight) {
                    score += 25;
                } else if (dimensions.width >= this.options.minWidth && dimensions.height >= this.options.minHeight) {
                    score += 15;
                } else {
                    score -= 20; // Too small
                }
                
                // Aspect ratio bonus (prefer square/portrait for mobile)
                const aspectRatio = dimensions.width / dimensions.height;
                if (aspectRatio >= 0.8 && aspectRatio <= 1.2) {
                    score += 15; // Square-ish (ideal for mobile)
                } else if (aspectRatio >= 0.6 && aspectRatio <= 0.9) {
                    score += 10; // Portrait (good for mobile)
                }
            }
        } catch (error) {
            // Dimensions check failed, continue without bonus
            console.warn(`Could not get dimensions for ${candidate.url}:`, error);
        }
        
        return Math.max(score, 0); // Never return negative scores
    }
    
    /**
     * Get image dimensions
     */
    async getImageDimensions(imageUrl) {
        try {
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 5000,
                maxContentLength: 2 * 1024 * 1024, // 2MB limit
                headers: {
                    'User-Agent': this.options.userAgent
                }
            });
            
            const buffer = Buffer.from(response.data);
            const metadata = await sharp(buffer).metadata();
            
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format
            };
            
        } catch (error) {
            // If we can't get dimensions, return null
            return null;
        }
    }
    
    /**
     * Remove duplicate images
     */
    removeDuplicateImages(candidates) {
        const seen = new Set();
        return candidates.filter(candidate => {
            if (seen.has(candidate.url)) {
                return false;
            }
            seen.add(candidate.url);
            return true;
        });
    }
    
    /**
     * Get selector priority
     */
    getSelectorPriority(selector) {
        if (selector.includes('og:image') || selector.includes('twitter:image')) return 100;
        if (selector.includes('event') || selector.includes('banner') || selector.includes('hero')) return 80;
        if (selector.includes('featured') || selector.includes('poster') || selector.includes('flyer')) return 70;
        if (selector.includes('main') || selector.includes('primary')) return 60;
        if (selector === 'img') return 10; // Last resort
        return 50; // Default
    }
    
    /**
     * Convert relative URL to absolute
     */
    makeAbsoluteUrl(url, baseUrl) {
        if (!url) return null;
        
        try {
            // Already absolute
            if (url.startsWith('http')) return url;
            
            // Protocol relative
            if (url.startsWith('//')) {
                const protocol = new URL(baseUrl).protocol;
                return `${protocol}${url}`;
            }
            
            // Absolute path
            if (url.startsWith('/')) {
                const base = new URL(baseUrl);
                return `${base.protocol}//${base.host}${url}`;
            }
            
            // Relative path
            return new URL(url, baseUrl).href;
            
        } catch (error) {
            console.warn('Error making URL absolute:', error);
            return null;
        }
    }
    
    /**
     * Validate image URL
     */
    isValidImageUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            
            // Must be HTTP/HTTPS
            if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
            
            // Skip obvious non-images
            const path = urlObj.pathname.toLowerCase();
            const skipPatterns = ['.css', '.js', '.json', '.xml', '.txt', '.pdf'];
            if (skipPatterns.some(pattern => path.endsWith(pattern))) return false;
            
            // Skip data URLs and other problematic URLs
            if (url.startsWith('data:') || url.includes('base64')) return false;
            
            // Skip tiny tracking pixels
            if (url.includes('1x1') || url.includes('pixel')) return false;
            
            return true;
            
        } catch (error) {
            return false;
        }
    }
}

module.exports = EnhancedImageExtractor;