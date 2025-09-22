#!/usr/bin/env node

/**
 * Smart Image Selector for Hash Event Scraper
 * 
 * Intelligently selects the best event image from multiple candidates,
 * prioritizing square (1:1) and portrait (4:5) ratios for optimal display
 * in the Hash mobile app. Prefers flyer-style promotional images.
 */

const axios = require('axios');
const sharp = require('sharp');
const chalk = require('chalk');
const FlyerTextExtractor = require('./flyerTextExtractor');

class ImageSelector {
    constructor() {
        // Ideal ratios for Hash app mobile display
        this.IDEAL_RATIOS = {
            SQUARE: 1.0,      // 1:1 (Instagram-style, perfect for mobile)
            PORTRAIT: 0.8,    // 4:5 (Event flyer style, great for mobile)
            STORY: 0.5625,    // 9:16 (Instagram story, very mobile-friendly)
            GOLDEN: 0.618     // Golden ratio portrait
        };
        
        // Initialize OCR-capable text extractor
        this.flyerTextExtractor = new FlyerTextExtractor();
        
        // Keywords indicating high-quality promotional/flyer images
        this.FLYER_KEYWORDS = [
            'flyer', 'poster', 'banner', 'promo', 'promotional',
            'featured', 'hero', 'main', 'primary', 'cover',
            'eventbrite', 'event-image', 'listing-image',
            'card-image', 'tile-image', 'featured-image',
            'social-image', 'share-image', 'og-image'
        ];
        
        // Keywords indicating low-quality or unwanted images
        this.AVOID_KEYWORDS = [
            'thumb', 'thumbnail', 'small', 'tiny', 'icon',
            'avatar', 'profile', 'logo-only', 'watermark',
            'preview', 'crop', 'snippet', 'sample'
        ];
        
        // Minimum acceptable dimensions for Hash app
        this.MIN_WIDTH = 300;
        this.MIN_HEIGHT = 300;
        this.IDEAL_MIN_WIDTH = 600;
        this.IDEAL_MIN_HEIGHT = 600;
        
        // OCR-specific minimum dimensions for text extraction
        this.OCR_MIN_WIDTH = 400;
        this.OCR_MIN_HEIGHT = 400;
        this.OCR_IDEAL_WIDTH = 800;
        this.OCR_IDEAL_HEIGHT = 800;
        
        // Common CDN patterns that usually indicate optimized images
        this.CDN_PATTERNS = [
            'cdn.', 'cloudinary', 'imgix', 'fastly', 'cloudflare',
            'amazonaws', 's3.', 'firebase', 'googleusercontent'
        ];
        
        // OCR-specific keywords for text-rich content
        this.OCR_KEYWORDS = [
            'lineup', 'schedule', 'details', 'info', 'information',
            'text', 'readable', 'clear', 'sharp', 'high-res',
            'announcement', 'advertisement', 'ticket', 'pricing'
        ];
        
        // Text readability indicators
        this.READABLE_TEXT_PATTERNS = [
            'when:', 'where:', 'time:', 'date:', 'venue:', 'tickets:',
            'artists:', 'lineup:', 'schedule:', 'details:', 'info:',
            'price:', 'cost:', 'admission:', 'entry:', 'doors:'
        ];
    }
    
    /**
     * Select the best image from multiple candidates
     */
    async selectBestImage(imageUrls, eventTitle = '', eventVenue = '', options = {}) {
        if (!imageUrls || imageUrls.length === 0) {
            return null;
        }
        
        if (imageUrls.length === 1) {
            console.log(chalk.gray('📷 Single image available, using as-is'));
            return imageUrls[0];
        }
        
        console.log(chalk.cyan(`🖼️  Analyzing ${imageUrls.length} image candidates...`));
        
        const scoredImages = await this.scoreAllImages(imageUrls, eventTitle, eventVenue, options);
        
        if (scoredImages.length === 0) {
            console.warn(chalk.yellow('⚠️  No valid images found'));
            return null;
        }
        
        const bestImage = scoredImages[0];
        
        console.log(chalk.green(`✅ Selected optimal image (score: ${bestImage.totalScore})`));
        console.log(chalk.gray(`   Ratio: ${bestImage.ratio?.toFixed(2)} (${this.getRatioDescription(bestImage.ratio)})`));
        console.log(chalk.gray(`   Dimensions: ${bestImage.width}x${bestImage.height}`));
        console.log(chalk.gray(`   Flyer style: ${bestImage.isFlyer ? 'Yes' : 'No'}`));
        console.log(chalk.gray(`   OCR suitable: ${bestImage.isOCRSuitable ? 'Yes' : 'No'} (score: ${bestImage.ocrScore || 0})`));
        
        return bestImage.url;
    }
    
    /**
     * Score all images and return sorted by best score
     */
    async scoreAllImages(imageUrls, eventTitle = '', eventVenue = '', options = {}) {
        const imageScores = [];
        const includeOCRAnalysis = options.includeOCRAnalysis || false;
        
        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            
            try {
                console.log(chalk.gray(`   [${i + 1}/${imageUrls.length}] Analyzing: ${this.truncateUrl(url)}`));
                
                const score = await this.calculateImageScore(url, eventTitle, eventVenue, { includeOCRAnalysis });
                
                if (score.isValid) {
                    imageScores.push({
                        url: url,
                        ...score
                    });
                    
                    const ocrInfo = score.ocrScore ? `, OCR: ${score.ocrScore}` : '';
                    console.log(chalk.gray(`     Score: ${score.totalScore} (ratio: ${score.ratioScore}, size: ${score.sizeScore}, flyer: ${score.flyerScore}${ocrInfo})`));
                } else {
                    console.log(chalk.yellow(`     ⚠️ Invalid or too small`));
                }
                
            } catch (error) {
                console.warn(chalk.yellow(`     ⚠️ Analysis failed: ${error.message}`));
            }
        }
        
        // Sort by total score (highest first)
        return imageScores.sort((a, b) => b.totalScore - a.totalScore);
    }
    
    /**
     * Calculate comprehensive score for an image
     */
    async calculateImageScore(imageUrl, eventTitle = '', eventVenue = '', options = {}) {
        const scores = {
            ratioScore: 0,
            flyerScore: 0,
            sizeScore: 0,
            qualityScore: 0,
            contextScore: 0,
            ocrScore: 0,
            totalScore: 0,
            isValid: false,
            url: imageUrl,
            width: 0,
            height: 0,
            ratio: 0,
            isFlyer: false,
            isOCRSuitable: false
        };
        
        try {
            // Get image dimensions and basic info
            const dimensions = await this.getImageDimensions(imageUrl);
            
            scores.width = dimensions.width || 0;
            scores.height = dimensions.height || 0;
            
            // Skip if dimensions couldn't be determined or too small
            if (scores.width < this.MIN_WIDTH || scores.height < this.MIN_HEIGHT) {
                return scores; // isValid remains false
            }
            
            scores.ratio = scores.width / scores.height;
            scores.isValid = true;
            
            // 1. RATIO SCORE (Most Important - 40% weight)
            scores.ratioScore = this.calculateRatioScore(scores.ratio) * 0.4;
            
            // 2. SIZE SCORE (25% weight)
            scores.sizeScore = this.calculateSizeScore(scores.width, scores.height) * 0.25;
            
            // 3. FLYER/PROMOTIONAL SCORE (20% weight)
            const flyerInfo = this.calculateFlyerScore(imageUrl, eventTitle, eventVenue);
            scores.flyerScore = flyerInfo.score * 0.2;
            scores.isFlyer = flyerInfo.isFlyer;
            
            // 4. QUALITY INDICATORS SCORE (10% weight)
            scores.qualityScore = this.calculateQualityScore(imageUrl) * 0.1;
            
            // 5. CONTEXT RELEVANCE SCORE (5% weight)
            scores.contextScore = this.calculateContextScore(imageUrl, eventTitle, eventVenue) * 0.05;
            
            // 6. OCR SUITABILITY SCORE (10% weight, optional)
            if (options.includeOCRAnalysis) {
                const ocrAnalysis = await this.analyzeOCRSuitability(imageUrl, {
                    width: scores.width,
                    height: scores.height
                });
                scores.ocrScore = ocrAnalysis.score * 0.1;
                scores.isOCRSuitable = ocrAnalysis.isOCRSuitable;
                
                // Adjust other weights when OCR is included
                scores.ratioScore *= 0.9; // 36%
                scores.sizeScore *= 0.9;  // 22.5%
                scores.flyerScore *= 0.9; // 18%
                scores.qualityScore *= 0.9; // 9%
                scores.contextScore *= 0.9; // 4.5%
            }
            
            // Calculate total score
            scores.totalScore = Math.round(
                scores.ratioScore + scores.sizeScore + scores.flyerScore +
                scores.qualityScore + scores.contextScore + scores.ocrScore
            );
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Error scoring image ${imageUrl}: ${error.message}`));
        }
        
        return scores;
    }
    
    /**
     * Score based on aspect ratio (prioritize square and 4:5 portrait)
     */
    calculateRatioScore(ratio) {
        if (!ratio || ratio <= 0) return 0;
        
        // Perfect scores for ideal ratios
        if (Math.abs(ratio - this.IDEAL_RATIOS.SQUARE) < 0.05) {
            return 100; // Perfect square (1:1)
        }
        
        if (Math.abs(ratio - this.IDEAL_RATIOS.PORTRAIT) < 0.05) {
            return 95; // Perfect 4:5 portrait
        }
        
        if (Math.abs(ratio - this.IDEAL_RATIOS.STORY) < 0.05) {
            return 90; // Perfect 9:16 story format
        }
        
        if (Math.abs(ratio - this.IDEAL_RATIOS.GOLDEN) < 0.05) {
            return 85; // Golden ratio portrait
        }
        
        // Good scores for close ratios
        if (ratio >= 0.7 && ratio <= 1.3) {
            // Close to square or portrait
            const distanceFromSquare = Math.abs(ratio - 1.0);
            return Math.max(60, 80 - (distanceFromSquare * 100));
        }
        
        // Lower scores for landscape or extreme ratios
        if (ratio > 1.3 && ratio < 2.0) {
            return 30; // Moderate landscape
        }
        
        if (ratio < 0.5 || ratio > 2.0) {
            return 10; // Extreme ratios (very wide or very tall)
        }
        
        return 40; // Default for other ratios
    }
    
    /**
     * Score based on image size (prefer larger, high-quality images)
     */
    calculateSizeScore(width, height) {
        const area = width * height;
        const megapixels = area / (1024 * 1024);
        
        // Excellent size (high resolution)
        if (width >= this.IDEAL_MIN_WIDTH && height >= this.IDEAL_MIN_HEIGHT) {
            if (megapixels >= 1.0) return 100; // > 1MP
            if (megapixels >= 0.5) return 90;  // > 0.5MP
            return 80;
        }
        
        // Good size (acceptable resolution)
        if (width >= this.MIN_WIDTH && height >= this.MIN_HEIGHT) {
            if (megapixels >= 0.3) return 70;  // > 0.3MP
            return 60;
        }
        
        // Too small
        return 20;
    }
    
    /**
     * Score based on flyer/promotional image indicators
     */
    calculateFlyerScore(imageUrl, eventTitle = '', eventVenue = '') {
        const urlLower = imageUrl.toLowerCase();
        const titleLower = eventTitle.toLowerCase();
        const venueLower = eventVenue.toLowerCase();
        
        let score = 0;
        let isFlyer = false;
        
        // Check URL for flyer keywords
        for (const keyword of this.FLYER_KEYWORDS) {
            if (urlLower.includes(keyword)) {
                score += 30;
                isFlyer = true;
                break; // Only count once per category
            }
        }
        
        // Bonus for specific promotional terms
        if (urlLower.includes('featured') || urlLower.includes('hero')) {
            score += 20;
            isFlyer = true;
        }
        
        // Bonus for social sharing optimized images
        if (urlLower.includes('og-image') || urlLower.includes('social')) {
            score += 15;
            isFlyer = true;
        }
        
        // Penalty for clearly non-promotional images
        for (const keyword of this.AVOID_KEYWORDS) {
            if (urlLower.includes(keyword)) {
                score -= 50;
                break;
            }
        }
        
        // Bonus if URL contains event title words (relevance)
        if (titleLower && titleLower.length > 3) {
            const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
            for (const word of titleWords) {
                if (urlLower.includes(word)) {
                    score += 10;
                    break;
                }
            }
        }
        
        return {
            score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
            isFlyer: isFlyer
        };
    }
    
    /**
     * Score based on technical quality indicators
     */
    calculateQualityScore(imageUrl) {
        const urlLower = imageUrl.toLowerCase();
        let score = 0;
        
        // Bonus for CDN hosting (usually optimized)
        for (const pattern of this.CDN_PATTERNS) {
            if (urlLower.includes(pattern)) {
                score += 20;
                break;
            }
        }
        
        // Bonus for modern formats
        if (urlLower.includes('.webp')) score += 15;
        if (urlLower.includes('.png')) score += 10;
        if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) score += 5;
        
        // Penalty for old or low-quality indicators
        if (urlLower.includes('.gif')) score -= 10;
        if (urlLower.includes('.bmp')) score -= 20;
        
        // Bonus for HTTPS (security)
        if (imageUrl.startsWith('https://')) score += 5;
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Score based on context relevance to event
     */
    calculateContextScore(imageUrl, eventTitle = '', eventVenue = '') {
        let score = 0;
        const urlLower = imageUrl.toLowerCase();
        
        // Check if image path contains event-related terms
        const contextTerms = ['event', 'concert', 'show', 'festival', 'performance'];
        for (const term of contextTerms) {
            if (urlLower.includes(term)) {
                score += 20;
                break;
            }
        }
        
        // Check for venue relevance
        if (eventVenue && eventVenue.length > 3) {
            const venueWords = eventVenue.toLowerCase().split(/\s+/);
            for (const word of venueWords) {
                if (word.length > 3 && urlLower.includes(word)) {
                    score += 15;
                    break;
                }
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Get image dimensions using multiple methods
     */
    async getImageDimensions(imageUrl) {
        try {
            // Method 1: Try to extract from URL parameters (fastest)
            const urlDimensions = this.extractDimensionsFromUrl(imageUrl);
            if (urlDimensions.width && urlDimensions.height) {
                return urlDimensions;
            }
            
            // Method 2: Fetch image header with Sharp (reliable)
            const headerDimensions = await this.fetchImageHeader(imageUrl);
            if (headerDimensions.width && headerDimensions.height) {
                return headerDimensions;
            }
            
            // Method 3: Fallback to basic HTTP HEAD request
            const basicInfo = await this.getBasicImageInfo(imageUrl);
            return basicInfo;
            
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Could not determine dimensions for ${this.truncateUrl(imageUrl)}: ${error.message}`));
            return { width: 0, height: 0 };
        }
    }
    
    /**
     * Extract dimensions from URL parameters (common CDN pattern)
     */
    extractDimensionsFromUrl(url) {
        const patterns = [
            // Common CDN patterns
            /[?&]w=(\d+)[&.].*[?&]h=(\d+)/i,        // ?w=800&h=600
            /[?&]width=(\d+)[&.].*[?&]height=(\d+)/i, // ?width=800&height=600
            /\/(\d+)x(\d+)\//,                       // /800x600/
            /_(\d+)x(\d+)\./,                        // _800x600.jpg
            /(\d+)x(\d+)\.(jpg|png|webp)/i,         // 800x600.jpg
            /resize[=:](\d+)[x,:](\d+)/i,           // resize=800x600 or resize:800,600
            /(\d{3,4})x(\d{3,4})/                   // Generic 800x600 pattern
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1] && match[2]) {
                const width = parseInt(match[1]);
                const height = parseInt(match[2]);
                
                // Sanity check - reasonable dimensions
                if (width > 50 && width < 5000 && height > 50 && height < 5000) {
                    return { width, height };
                }
            }
        }
        
        return { width: 0, height: 0 };
    }
    
    /**
     * Fetch image header to get dimensions with Sharp
     */
    async fetchImageHeader(imageUrl) {
        try {
            // Download only first 32KB (enough for image headers)
            const response = await axios({
                method: 'GET',
                url: imageUrl,
                responseType: 'arraybuffer',
                maxContentLength: 32768, // 32KB
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Range': 'bytes=0-32767' // Request only first 32KB
                }
            });
            
            const buffer = Buffer.from(response.data);
            const metadata = await sharp(buffer).metadata();
            
            return {
                width: metadata.width || 0,
                height: metadata.height || 0,
                format: metadata.format
            };
            
        } catch (error) {
            // If partial download fails, try HEAD request
            throw new Error(`Header fetch failed: ${error.message}`);
        }
    }
    
    /**
     * Basic image info from HTTP HEAD request
     */
    async getBasicImageInfo(imageUrl) {
        try {
            const response = await axios({
                method: 'HEAD',
                url: imageUrl,
                timeout: 5000,
                maxRedirects: 3
            });
            
            const contentLength = parseInt(response.headers['content-length'] || '0');
            const contentType = response.headers['content-type'] || '';
            
            // Rough dimension estimation based on file size (very approximate)
            let estimatedDimensions = { width: 0, height: 0 };
            
            if (contentType.includes('image') && contentLength > 0) {
                // Very rough estimation: assume average compression
                const estimatedPixels = Math.sqrt(contentLength * 8); // Rough heuristic
                estimatedDimensions = {
                    width: Math.round(estimatedPixels),
                    height: Math.round(estimatedPixels)
                };
            }
            
            return {
                ...estimatedDimensions,
                contentLength: contentLength,
                contentType: contentType,
                estimated: true
            };
            
        } catch (error) {
            return { width: 0, height: 0 };
        }
    }
    
    /**
     * Get human-readable description of aspect ratio
     */
    getRatioDescription(ratio) {
        if (!ratio) return 'unknown';
        
        if (Math.abs(ratio - 1.0) < 0.1) return 'square';
        if (Math.abs(ratio - 0.8) < 0.1) return '4:5 portrait';
        if (Math.abs(ratio - 0.5625) < 0.1) return '9:16 story';
        if (ratio < 0.8) return 'tall portrait';
        if (ratio > 1.3) return 'landscape';
        
        return 'portrait';
    }
    
    /**
     * Truncate URL for cleaner logging
     */
    truncateUrl(url, maxLength = 60) {
        if (url.length <= maxLength) return url;
        
        const start = url.substring(0, maxLength / 2);
        const end = url.substring(url.length - maxLength / 2);
        return `${start}...${end}`;
    }
    
    /**
     * Debug method to show detailed scoring breakdown
     */
    async debugImageSelection(imageUrls, eventTitle = '', eventVenue = '') {
        console.log(chalk.blue.bold('\n🔍 Image Selection Debug Analysis'));
        console.log(chalk.gray('━'.repeat(60)));
        
        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            console.log(chalk.cyan(`\n📷 Image ${i + 1}: ${this.truncateUrl(url)}`));
            
            const score = await this.calculateImageScore(url, eventTitle, eventVenue);
            
            if (score.isValid) {
                console.log(chalk.green(`   ✅ Valid image`));
                console.log(chalk.gray(`   Dimensions: ${score.width}x${score.height} (${this.getRatioDescription(score.ratio)})`));
                console.log(chalk.gray(`   Ratio Score: ${score.ratioScore.toFixed(1)}/40`));
                console.log(chalk.gray(`   Size Score: ${score.sizeScore.toFixed(1)}/25`));
                console.log(chalk.gray(`   Flyer Score: ${score.flyerScore.toFixed(1)}/20 ${score.isFlyer ? '(detected)' : ''}`));
                console.log(chalk.gray(`   Quality Score: ${score.qualityScore.toFixed(1)}/10`));
                console.log(chalk.gray(`   Context Score: ${score.contextScore.toFixed(1)}/5`));
                console.log(chalk.white(`   TOTAL SCORE: ${score.totalScore}/100`));
            } else {
                console.log(chalk.red(`   ❌ Invalid (too small or analysis failed)`));
            }
        }
        
        console.log(chalk.gray('━'.repeat(60)));
    }
    
    /**
     * Filter images by OCR suitability for text extraction
     */
    async filterImagesByOCRSuitability(imageUrls, minScore = 60) {
        console.log(chalk.cyan(`🔤 Filtering ${imageUrls.length} images for OCR suitability...`));
        
        const suitableImages = [];
        
        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            
            try {
                // Get image dimensions first
                const dimensions = await this.getImageDimensions(url);
                
                // Quick OCR suitability check
                const ocrAnalysis = await this.analyzeOCRSuitability(url, dimensions);
                
                if (ocrAnalysis.score >= minScore) {
                    suitableImages.push({
                        url: url,
                        ocrScore: ocrAnalysis.score,
                        isOCRSuitable: ocrAnalysis.isOCRSuitable,
                        dimensions: dimensions,
                        reasons: ocrAnalysis.reasons
                    });
                    
                    console.log(chalk.green(`   [${i + 1}/${imageUrls.length}] ✅ Suitable (score: ${ocrAnalysis.score})`));
                } else {
                    console.log(chalk.gray(`   [${i + 1}/${imageUrls.length}] ❌ Not suitable (score: ${ocrAnalysis.score})`));
                }
                
            } catch (error) {
                console.warn(chalk.yellow(`   [${i + 1}/${imageUrls.length}] ⚠️ Analysis failed: ${error.message}`));
            }
        }
        
        // Sort by OCR score (highest first)
        suitableImages.sort((a, b) => b.ocrScore - a.ocrScore);
        
        console.log(chalk.green(`✅ Found ${suitableImages.length} OCR-suitable images`));
        
        return suitableImages;
    }
    
    /**
     * Analyze image for OCR suitability
     */
    async analyzeOCRSuitability(imageUrl, dimensions = null) {
        const analysis = {
            score: 0,
            isOCRSuitable: false,
            reasons: [],
            dimensionScore: 0,
            keywordScore: 0,
            textIndicatorScore: 0
        };
        
        try {
            // Get dimensions if not provided
            if (!dimensions) {
                dimensions = await this.getImageDimensions(imageUrl);
            }
            
            // 1. DIMENSION ANALYSIS (50% weight)
            analysis.dimensionScore = this.calculateOCRDimensionScore(dimensions, analysis);
            
            // 2. KEYWORD ANALYSIS (30% weight)
            analysis.keywordScore = this.calculateOCRKeywordScore(imageUrl, analysis);
            
            // 3. TEXT INDICATOR ANALYSIS (20% weight)
            analysis.textIndicatorScore = this.calculateTextIndicatorScore(imageUrl, analysis);
            
            // Calculate overall score
            analysis.score = Math.round(
                (analysis.dimensionScore * 0.5) +
                (analysis.keywordScore * 0.3) +
                (analysis.textIndicatorScore * 0.2)
            );
            
            analysis.isOCRSuitable = analysis.score >= 60;
            
            return analysis;
            
        } catch (error) {
            analysis.reasons.push(`Analysis failed: ${error.message}`);
            return analysis;
        }
    }
    
    /**
     * Calculate OCR dimension score
     */
    calculateOCRDimensionScore(dimensions, analysis) {
        const { width, height } = dimensions;
        
        if (!width || !height) {
            analysis.reasons.push('Could not determine dimensions');
            return 0;
        }
        
        // Check OCR minimum requirements
        if (width < this.OCR_MIN_WIDTH || height < this.OCR_MIN_HEIGHT) {
            analysis.reasons.push(`Too small for OCR (${width}x${height}, need ${this.OCR_MIN_WIDTH}x${this.OCR_MIN_HEIGHT})`);
            return 10;
        }
        
        let score = 60; // Base score for meeting OCR minimum
        
        // Bonus for ideal OCR dimensions
        if (width >= this.OCR_IDEAL_WIDTH && height >= this.OCR_IDEAL_HEIGHT) {
            score += 30;
            analysis.reasons.push('Excellent dimensions for OCR');
        } else if (width >= this.OCR_MIN_WIDTH * 1.5 && height >= this.OCR_MIN_HEIGHT * 1.5) {
            score += 20;
            analysis.reasons.push('Good dimensions for OCR');
        }
        
        // Bonus for square-ish ratios (easier OCR processing)
        const aspectRatio = width / height;
        if (aspectRatio >= 0.7 && aspectRatio <= 1.4) {
            score += 10;
            analysis.reasons.push('Good aspect ratio for text reading');
        }
        
        return Math.min(100, score);
    }
    
    /**
     * Calculate OCR keyword score
     */
    calculateOCRKeywordScore(imageUrl, analysis) {
        const urlLower = imageUrl.toLowerCase();
        let score = 40; // Neutral base
        
        // Check for OCR-favorable keywords
        for (const keyword of this.OCR_KEYWORDS) {
            if (urlLower.includes(keyword)) {
                score += 15;
                analysis.reasons.push(`URL suggests text content: ${keyword}`);
                break;
            }
        }
        
        // Check for flyer-style content
        for (const keyword of this.FLYER_KEYWORDS) {
            if (urlLower.includes(keyword)) {
                score += 20;
                analysis.reasons.push(`URL suggests flyer content: ${keyword}`);
                break;
            }
        }
        
        // Penalty for thumbnail indicators
        const thumbKeywords = ['thumb', 'small', 'icon', 'preview'];
        for (const keyword of thumbKeywords) {
            if (urlLower.includes(keyword)) {
                score -= 30;
                analysis.reasons.push(`URL suggests small/thumbnail image: ${keyword}`);
                break;
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Calculate text indicator score
     */
    calculateTextIndicatorScore(imageUrl, analysis) {
        const urlLower = imageUrl.toLowerCase();
        let score = 40; // Neutral base
        
        // Check for readable text patterns
        for (const pattern of this.READABLE_TEXT_PATTERNS) {
            if (urlLower.includes(pattern.toLowerCase())) {
                score += 20;
                analysis.reasons.push(`URL suggests readable text content`);
                break;
            }
        }
        
        // Check for high-quality indicators
        const qualityKeywords = ['hd', 'high-res', 'quality', 'sharp', 'clear'];
        for (const keyword of qualityKeywords) {
            if (urlLower.includes(keyword)) {
                score += 15;
                analysis.reasons.push(`URL suggests high quality: ${keyword}`);
                break;
            }
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * Select best image for OCR text extraction
     */
    async selectBestImageForOCR(imageUrls, eventTitle = '', eventVenue = '') {
        console.log(chalk.cyan(`🔤 Selecting best image for OCR from ${imageUrls.length} candidates...`));
        
        if (!imageUrls || imageUrls.length === 0) {
            return null;
        }
        
        if (imageUrls.length === 1) {
            // Still check if single image is suitable
            const ocrAnalysis = await this.analyzeOCRSuitability(imageUrls[0]);
            if (ocrAnalysis.isOCRSuitable) {
                console.log(chalk.green(`✅ Single image is OCR-suitable (score: ${ocrAnalysis.score})`));
                return imageUrls[0];
            } else {
                console.log(chalk.yellow(`⚠️ Single image not suitable for OCR (score: ${ocrAnalysis.score})`));
                return null;
            }
        }
        
        // Score all images with OCR analysis enabled
        const scoredImages = await this.scoreAllImages(imageUrls, eventTitle, eventVenue, {
            includeOCRAnalysis: true
        });
        
        // Filter for OCR-suitable images
        const ocrSuitableImages = scoredImages.filter(img => img.isOCRSuitable);
        
        if (ocrSuitableImages.length === 0) {
            console.log(chalk.yellow(`⚠️ No OCR-suitable images found`));
            return null;
        }
        
        const bestOCRImage = ocrSuitableImages[0];
        
        console.log(chalk.green(`✅ Selected best OCR image (total score: ${bestOCRImage.totalScore}, OCR score: ${bestOCRImage.ocrScore})`));
        console.log(chalk.gray(`   Dimensions: ${bestOCRImage.width}x${bestOCRImage.height}`));
        console.log(chalk.gray(`   Flyer style: ${bestOCRImage.isFlyer ? 'Yes' : 'No'}`));
        
        return bestOCRImage.url;
    }
    
    /**
     * Extract text from the best OCR-suitable image
     */
    async extractTextFromBestImage(imageUrls, eventTitle = '', eventVenue = '') {
        const bestImageUrl = await this.selectBestImageForOCR(imageUrls, eventTitle, eventVenue);
        
        if (!bestImageUrl) {
            return {
                success: false,
                reason: 'No OCR-suitable image found',
                text: '',
                confidence: 0
            };
        }
        
        console.log(chalk.cyan(`🔤 Extracting text from selected image...`));
        
        try {
            const extractionResult = await this.flyerTextExtractor.extractTextFromImage(bestImageUrl);
            
            if (extractionResult.success) {
                console.log(chalk.green(`✅ Text extraction successful (${extractionResult.charCount} characters)`));
                
                // Extract event details from the text
                const eventDetails = this.flyerTextExtractor.extractEventDetailsFromText(extractionResult.text);
                
                return {
                    success: true,
                    imageUrl: bestImageUrl,
                    text: extractionResult.text,
                    confidence: extractionResult.confidence,
                    eventDetails: eventDetails,
                    wordCount: extractionResult.wordCount,
                    charCount: extractionResult.charCount
                };
            } else {
                return {
                    success: false,
                    reason: extractionResult.reason || 'Text extraction failed',
                    imageUrl: bestImageUrl,
                    text: '',
                    confidence: 0
                };
            }
            
        } catch (error) {
            console.error(chalk.red(`❌ Text extraction error: ${error.message}`));
            return {
                success: false,
                reason: error.message,
                imageUrl: bestImageUrl,
                text: '',
                confidence: 0
            };
        }
    }
    
    /**
     * Filter images by minimum dimensions for OCR
     */
    filterImagesByMinimumOCRSize(imageUrls) {
        return imageUrls.filter(async (url) => {
            try {
                const dimensions = await this.getImageDimensions(url);
                return dimensions.width >= this.OCR_MIN_WIDTH && dimensions.height >= this.OCR_MIN_HEIGHT;
            } catch (error) {
                return false;
            }
        });
    }
}

module.exports = ImageSelector;