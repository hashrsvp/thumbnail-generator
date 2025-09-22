/**
 * ExtractorHelpers - Utility functions for Universal Extractor
 * 
 * Collection of helper functions, validators, and utilities used across
 * the UniversalExtractor system.
 * 
 * @author Claude Code
 * @version 2.0.0
 */

const chalk = require('chalk');

/**
 * Data validation utilities
 */
class DataValidator {
    static isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    static isValidImageUrl(url) {
        if (!this.isValidUrl(url)) return false;
        
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        const imageIndicators = /(image|img|photo|pic|cdn|media)/i;
        
        return imageExtensions.test(url) || imageIndicators.test(url);
    }
    
    static isValidDate(dateString) {
        if (!dateString) return false;
        
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    
    static isValidTime(timeString) {
        if (!timeString || typeof timeString !== 'string') return false;
        
        const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        return timePattern.test(timeString);
    }
    
    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }
    
    static isValidPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return false;
        
        // Remove all non-digit characters
        const digits = phone.replace(/\D/g, '');
        
        // Should be 10 or 11 digits (11 for US with country code)
        return digits.length === 10 || (digits.length === 11 && digits[0] === '1');
    }
    
    static isValidPrice(price) {
        if (typeof price === 'number') {
            return price >= 0;
        }
        
        if (typeof price === 'string') {
            const pricePattern = /^\$?\d+(\.\d{2})?$/;
            return pricePattern.test(price) || 
                   price.toLowerCase().includes('free') ||
                   price.toLowerCase().includes('tbd');
        }
        
        return false;
    }
    
    static isValidAddress(address) {
        if (!address || typeof address !== 'string') return false;
        
        const trimmed = address.trim();
        
        // Should be at least 10 characters and contain some common address indicators
        if (trimmed.length < 10) return false;
        
        const addressIndicators = /\b(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl|\d+)\b/i;
        return addressIndicators.test(trimmed);
    }
}

/**
 * Text processing utilities
 */
class TextProcessor {
    static cleanText(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text
            .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
            .replace(/[\r\n\t]/g, ' ') // Replace newlines and tabs with spaces
            .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters (keep basic ASCII)
            .trim();
    }
    
    static truncateText(text, maxLength = 500) {
        if (!text || typeof text !== 'string') return '';
        
        const cleaned = this.cleanText(text);
        
        if (cleaned.length <= maxLength) return cleaned;
        
        // Find the last complete word within the limit
        const truncated = cleaned.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    }
    
    static extractNumbers(text) {
        if (!text || typeof text !== 'string') return [];
        
        const numberPattern = /\d+(?:\.\d+)?/g;
        return text.match(numberPattern)?.map(Number) || [];
    }
    
    static extractUrls(text) {
        if (!text || typeof text !== 'string') return [];
        
        const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
        return text.match(urlPattern) || [];
    }
    
    static extractEmails(text) {
        if (!text || typeof text !== 'string') return [];
        
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        return text.match(emailPattern) || [];
    }
    
    static extractPhoneNumbers(text) {
        if (!text || typeof text !== 'string') return [];
        
        const phonePatterns = [
            /\(\d{3}\)\s*\d{3}-\d{4}/g,
            /\d{3}[-.\s]\d{3}[-.\s]\d{4}/g,
            /\+1[\s-]?\(\d{3}\)[\s-]?\d{3}[\s-]?\d{4}/g
        ];
        
        const phones = [];
        for (const pattern of phonePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                phones.push(...matches);
            }
        }
        
        return [...new Set(phones)]; // Remove duplicates
    }
    
    static capitalizeWords(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text.replace(/\b\w/g, char => char.toUpperCase());
    }
    
    static removeExtraQuotes(text) {
        if (!text || typeof text !== 'string') return text;
        
        // Remove surrounding quotes
        return text.replace(/^["']|["']$/g, '');
    }
    
    static normalizeWhitespace(text) {
        if (!text || typeof text !== 'string') return '';
        
        return text.replace(/\s+/g, ' ').trim();
    }
}

/**
 * Date and time processing utilities
 */
class DateTimeProcessor {
    static parseFlexibleDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return null;
        
        const cleaned = dateString.trim();
        
        try {
            // Try direct parsing first
            const direct = new Date(cleaned);
            if (!isNaN(direct.getTime())) {
                return direct;
            }
            
            // Try various date patterns
            const patterns = [
                // MM/DD/YYYY or MM-DD-YYYY
                {
                    regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
                    handler: (match) => new Date(match[3], match[1] - 1, match[2])
                },
                
                // Month DD, YYYY
                {
                    regex: /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
                    handler: (match) => new Date(`${match[1]} ${match[2]}, ${match[3]}`)
                },
                
                // Mon DD, YYYY
                {
                    regex: /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2}),?\s+(\d{4})/i,
                    handler: (match) => new Date(`${match[1]} ${match[2]}, ${match[3]}`)
                },
                
                // DD Month YYYY
                {
                    regex: /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
                    handler: (match) => new Date(`${match[2]} ${match[1]}, ${match[3]}`)
                },
                
                // YYYY-MM-DD
                {
                    regex: /(\d{4})-(\d{1,2})-(\d{1,2})/,
                    handler: (match) => new Date(match[1], match[2] - 1, match[3])
                }
            ];
            
            for (const pattern of patterns) {
                const match = cleaned.match(pattern.regex);
                if (match) {
                    const date = pattern.handler(match);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
            
        } catch (error) {
            // Continue to return null
        }
        
        return null;
    }
    
    static parseFlexibleTime(timeString) {
        if (!timeString || typeof timeString !== 'string') return null;
        
        const cleaned = timeString.trim();
        
        const timePatterns = [
            // 12-hour format with AM/PM
            {
                regex: /(\d{1,2}):(\d{2})\s*(AM|PM)/i,
                handler: (match) => {
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const meridiem = match[3].toUpperCase();
                    
                    if (meridiem === 'PM' && hours !== 12) {
                        hours += 12;
                    } else if (meridiem === 'AM' && hours === 12) {
                        hours = 0;
                    }
                    
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
                }
            },
            
            // 24-hour format
            {
                regex: /(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
                handler: (match) => {
                    const hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const seconds = parseInt(match[3] || 0);
                    
                    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    }
                    return null;
                }
            },
            
            // Just hour with AM/PM
            {
                regex: /(\d{1,2})\s*(AM|PM)/i,
                handler: (match) => {
                    let hours = parseInt(match[1]);
                    const meridiem = match[2].toUpperCase();
                    
                    if (meridiem === 'PM' && hours !== 12) {
                        hours += 12;
                    } else if (meridiem === 'AM' && hours === 12) {
                        hours = 0;
                    }
                    
                    return `${hours.toString().padStart(2, '0')}:00:00`;
                }
            }
        ];
        
        for (const pattern of timePatterns) {
            const match = cleaned.match(pattern.regex);
            if (match) {
                const time = pattern.handler(match);
                if (time) return time;
            }
        }
        
        return null;
    }
    
    static combineDateAndTime(dateString, timeString) {
        const date = this.parseFlexibleDate(dateString);
        const time = this.parseFlexibleTime(timeString);
        
        if (!date) return null;
        
        if (time) {
            const [hours, minutes, seconds] = time.split(':').map(Number);
            date.setHours(hours, minutes, seconds, 0);
        }
        
        return date.toISOString();
    }
    
    static isUpcoming(dateString) {
        const date = this.parseFlexibleDate(dateString);
        if (!date) return false;
        
        return date.getTime() > Date.now();
    }
    
    static isWithinRange(dateString, days = 365) {
        const date = this.parseFlexibleDate(dateString);
        if (!date) return false;
        
        const now = new Date();
        const maxDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
        const minDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
        
        return date >= minDate && date <= maxDate;
    }
}

/**
 * Price processing utilities
 */
class PriceProcessor {
    static parsePrice(priceString) {
        if (!priceString) return null;
        
        if (typeof priceString === 'number') {
            return {
                amount: priceString,
                currency: 'USD',
                free: priceString === 0,
                raw: priceString.toString()
            };
        }
        
        if (typeof priceString !== 'string') return null;
        
        const cleaned = priceString.trim().toLowerCase();
        
        // Check for free indicators
        const freeIndicators = ['free', 'no charge', 'complimentary', 'gratis', 'donation'];
        if (freeIndicators.some(indicator => cleaned.includes(indicator))) {
            return {
                amount: 0,
                currency: 'USD',
                free: true,
                raw: priceString
            };
        }
        
        // Extract currency and amount
        const currencyPatterns = [
            { symbol: '$', currency: 'USD', regex: /\$(\d+(?:\.\d{2})?)/g },
            { symbol: '€', currency: 'EUR', regex: /€(\d+(?:\.\d{2})?)/g },
            { symbol: '£', currency: 'GBP', regex: /£(\d+(?:\.\d{2})?)/g },
            { symbol: '¥', currency: 'JPY', regex: /¥(\d+)/g },
            { symbol: '₹', currency: 'INR', regex: /₹(\d+(?:\.\d{2})?)/g }
        ];
        
        for (const pattern of currencyPatterns) {
            const match = priceString.match(pattern.regex);
            if (match) {
                const amount = parseFloat(match[0].replace(pattern.symbol, ''));
                return {
                    amount: amount,
                    currency: pattern.currency,
                    free: amount === 0,
                    raw: priceString
                };
            }
        }
        
        // Try to extract just numbers
        const numberMatch = priceString.match(/(\d+(?:\.\d{2})?)/);
        if (numberMatch) {
            const amount = parseFloat(numberMatch[1]);
            return {
                amount: amount,
                currency: 'USD', // Default currency
                free: amount === 0,
                raw: priceString
            };
        }
        
        return null;
    }
    
    static formatPrice(priceData) {
        if (!priceData) return 'Price TBD';
        
        if (priceData.free) return 'Free';
        
        const symbol = this.getCurrencySymbol(priceData.currency);
        return `${symbol}${priceData.amount.toFixed(2)}`;
    }
    
    static getCurrencySymbol(currency) {
        const symbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'INR': '₹'
        };
        
        return symbols[currency] || '$';
    }
}

/**
 * Image processing utilities
 */
class ImageProcessor {
    static analyzeImageUrl(url) {
        if (!DataValidator.isValidImageUrl(url)) {
            return null;
        }
        
        const analysis = {
            url: url,
            extension: this.getImageExtension(url),
            isHighRes: this.isHighResolution(url),
            isThumbnail: this.isThumbnailUrl(url),
            priority: 0
        };
        
        // Calculate priority score
        analysis.priority = this.calculateImagePriority(url);
        
        return analysis;
    }
    
    static getImageExtension(url) {
        const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
        return match ? match[1].toLowerCase() : null;
    }
    
    static isHighResolution(url) {
        const highResIndicators = /(_high|_large|_big|_hd|_xl|_original|\d{4,}x\d{4,})/i;
        return highResIndicators.test(url);
    }
    
    static isThumbnailUrl(url) {
        const thumbnailIndicators = /(_thumb|_small|_mini|_tiny|_xs|thumbnail|thumb|\d{1,3}x\d{1,3})/i;
        return thumbnailIndicators.test(url);
    }
    
    static calculateImagePriority(url) {
        let priority = 0;
        
        // Bonus for high-quality indicators
        if (this.isHighResolution(url)) priority += 20;
        
        // Penalty for thumbnail indicators
        if (this.isThumbnailUrl(url)) priority -= 30;
        
        // Bonus for event-related paths
        const eventIndicators = /(event|hero|featured|main|primary|banner|poster)/i;
        if (eventIndicators.test(url)) priority += 15;
        
        // Penalty for low-priority indicators
        const lowPriorityIndicators = /(logo|icon|avatar|profile|nav|ad|sponsor)/i;
        if (lowPriorityIndicators.test(url)) priority -= 25;
        
        // Bonus for CDN URLs (usually higher quality)
        const cdnIndicators = /(cdn|cloudfront|amazonaws|imgix|cloudinary)/i;
        if (cdnIndicators.test(url)) priority += 5;
        
        return priority;
    }
    
    static selectBestImages(imageUrls, maxImages = 5) {
        if (!Array.isArray(imageUrls)) return [];
        
        // Analyze all images
        const analyzed = imageUrls
            .map(url => this.analyzeImageUrl(url))
            .filter(Boolean);
        
        // Sort by priority (highest first)
        analyzed.sort((a, b) => b.priority - a.priority);
        
        // Remove obvious duplicates and thumbnails
        const filtered = this.removeDuplicateImages(analyzed);
        
        // Return top images
        return filtered
            .slice(0, maxImages)
            .map(img => img.url);
    }
    
    static removeDuplicateImages(imageAnalyses) {
        const seen = new Set();
        const filtered = [];
        
        for (const img of imageAnalyses) {
            // Create a normalized version for comparison
            const normalized = img.url
                .replace(/(_thumb|_small|_large|_hd|_xl)/gi, '')
                .replace(/\d+x\d+/gi, '')
                .replace(/[?&].*$/, ''); // Remove query parameters
            
            if (!seen.has(normalized)) {
                seen.add(normalized);
                filtered.push(img);
            }
        }
        
        return filtered;
    }
}

/**
 * Logging and debugging utilities
 */
class Logger {
    constructor(options = {}) {
        this.debug = options.debug || false;
        this.verbose = options.verbose || false;
        this.prefix = options.prefix || '[UniversalExtractor]';
    }
    
    log(message, ...args) {
        console.log(chalk.blue(`${this.prefix} ${message}`), ...args);
    }
    
    debug(message, ...args) {
        if (this.debug) {
            console.log(chalk.cyan(`${this.prefix} [DEBUG] ${message}`), ...args);
        }
    }
    
    verbose(message, ...args) {
        if (this.verbose) {
            console.log(chalk.gray(`${this.prefix} [VERBOSE] ${message}`), ...args);
        }
    }
    
    warn(message, ...args) {
        console.warn(chalk.yellow(`${this.prefix} [WARN] ${message}`), ...args);
    }
    
    error(message, ...args) {
        console.error(chalk.red(`${this.prefix} [ERROR] ${message}`), ...args);
    }
    
    success(message, ...args) {
        console.log(chalk.green(`${this.prefix} [SUCCESS] ${message}`), ...args);
    }
    
    layer(layerNum, message, ...args) {
        const layerColor = this.getLayerColor(layerNum);
        console.log(layerColor(`${this.prefix} [Layer ${layerNum}] ${message}`), ...args);
    }
    
    confidence(field, score, ...args) {
        const color = this.getConfidenceColor(score);
        console.log(color(`${this.prefix} [${field}] Confidence: ${score}%`), ...args);
    }
    
    getLayerColor(layerNum) {
        const colors = [
            chalk.blue,    // Layer 1
            chalk.green,   // Layer 2
            chalk.yellow,  // Layer 3
            chalk.magenta, // Layer 4
            chalk.cyan     // Layer 5
        ];
        
        return colors[layerNum - 1] || chalk.white;
    }
    
    getConfidenceColor(score) {
        if (score >= 90) return chalk.green;
        if (score >= 70) return chalk.blue;
        if (score >= 50) return chalk.yellow;
        if (score >= 30) return chalk.orange;
        return chalk.red;
    }
}

/**
 * Performance measurement utilities
 */
class PerformanceTracker {
    constructor() {
        this.timers = new Map();
        this.metrics = new Map();
    }
    
    start(label) {
        this.timers.set(label, Date.now());
    }
    
    end(label) {
        const startTime = this.timers.get(label);
        if (startTime) {
            const duration = Date.now() - startTime;
            this.metrics.set(label, duration);
            this.timers.delete(label);
            return duration;
        }
        return null;
    }
    
    getMetric(label) {
        return this.metrics.get(label);
    }
    
    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }
    
    logMetrics() {
        console.log(chalk.blue('\n📊 Performance Metrics:'));
        for (const [label, duration] of this.metrics) {
            const color = duration > 5000 ? chalk.red : 
                         duration > 2000 ? chalk.yellow : chalk.green;
            console.log(color(`  ${label}: ${duration}ms`));
        }
    }
    
    clear() {
        this.timers.clear();
        this.metrics.clear();
    }
}

module.exports = {
    DataValidator,
    TextProcessor,
    DateTimeProcessor,
    PriceProcessor,
    ImageProcessor,
    Logger,
    PerformanceTracker
};