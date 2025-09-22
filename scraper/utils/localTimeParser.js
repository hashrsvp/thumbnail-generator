#!/usr/bin/env node

/**
 * Local Time Parser for Hash Event Scraper
 * 
 * CRITICAL FIX: This parser NEVER converts to UTC. It preserves the local timezone
 * as displayed on the event website, which is what users expect to see.
 * 
 * The Hash app displays times exactly as entered, so we must preserve the original
 * local time from the event website without any UTC conversion.
 */

class LocalTimeParser {
    constructor(options = {}) {
        this.options = {
            defaultTime: '19:00:00', // 7:00 PM default if no time found
            assumeEvening: true,     // Assume evening times for events
            preserveLocalTime: true, // NEVER convert to UTC
            ...options
        };
        
        // Time patterns for extraction (no timezone conversion)
        this.timePatterns = [
            // Standard 12-hour format with AM/PM
            /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/gi,
            /\b(\d{1,2})\s*(AM|PM)\b/gi,
            
            // 24-hour format
            /\b(\d{1,2}):(\d{2})\b/g,
            
            // Event-specific patterns
            /(?:doors|gates|admission|entry|open)\s*(?:@|at|:)?\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/gi,
            /(?:show|performance|start|begins?)\s*(?:@|at|:)?\s*(\d{1,2}):?(\d{2})?\s*(AM|PM)?/gi,
        ];
        
        // Date patterns for local dates (no timezone conversion)
        this.datePatterns = [
            // MM/DD/YYYY or MM/DD/YY
            /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g,
            
            // Month DD, YYYY
            /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s*(\d{4})\b/gi,
            
            // DD Month YYYY
            /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*,?\s*(\d{4})\b/gi,
            
            // Relative dates
            /\b(today|tomorrow|yesterday)\b/gi,
            /\b(this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|weekend)\b/gi,
        ];
        
        this.monthNames = {
            'january': 0, 'jan': 0,
            'february': 1, 'feb': 1,
            'march': 2, 'mar': 2,
            'april': 3, 'apr': 3,
            'may': 4,
            'june': 5, 'jun': 5,
            'july': 6, 'jul': 6,
            'august': 7, 'aug': 7,
            'september': 8, 'sep': 8, 'sept': 8,
            'october': 9, 'oct': 9,
            'november': 10, 'nov': 10,
            'december': 11, 'dec': 11
        };
    }
    
    /**
     * Parse date and time from text, preserving LOCAL timezone
     * CRITICAL: This function NEVER converts to UTC
     */
    parseDateTime(text, options = {}) {
        if (!text || typeof text !== 'string') {
            return this.createEmptyResult();
        }
        
        const result = {
            date: null,
            startTime: null,
            endTime: null,
            confidence: 0,
            parsedComponents: {},
            preservedLocalTime: true // Flag to indicate local time preservation
        };
        
        try {
            // Extract time first (preserve original format)
            const timeResult = this.extractLocalTime(text);
            if (timeResult.success) {
                result.startTime = timeResult.startTime;
                result.endTime = timeResult.endTime;
                result.confidence += 0.4;
                result.parsedComponents.timeExtraction = timeResult.method;
            }
            
            // Extract date (preserve local date)
            const dateResult = this.extractLocalDate(text);
            if (dateResult.success) {
                result.date = dateResult.date;
                result.confidence += 0.4;
                result.parsedComponents.dateExtraction = dateResult.method;
            }
            
            // If we have both date and time, boost confidence
            if (result.date && result.startTime) {
                result.confidence = Math.min(result.confidence + 0.2, 1.0);
            }
            
            // Apply defaults if needed
            if (!result.startTime && dateResult.success) {
                result.startTime = this.options.defaultTime;
                result.parsedComponents.defaultTimeApplied = true;
            }
            
            return result;
            
        } catch (error) {
            console.error('Error in local time parsing:', error);
            return this.createEmptyResult();
        }
    }
    
    /**
     * Extract time while preserving LOCAL format
     * NEVER converts to UTC - keeps exact time as shown on website
     */
    extractLocalTime(text) {
        const times = [];
        
        for (const pattern of this.timePatterns) {
            let match;
            pattern.lastIndex = 0; // Reset regex
            
            while ((match = pattern.exec(text)) !== null) {
                const timeInfo = this.parseTimeMatch(match, pattern);
                if (timeInfo) {
                    times.push(timeInfo);
                }
            }
        }
        
        if (times.length === 0) {
            return { success: false, method: 'no_time_found' };
        }
        
        // Sort by confidence and select best
        times.sort((a, b) => b.confidence - a.confidence);
        const bestTime = times[0];
        
        return {
            success: true,
            startTime: bestTime.time,
            endTime: bestTime.endTime, // May be null
            method: bestTime.method,
            confidence: bestTime.confidence,
            originalText: bestTime.originalText
        };
    }
    
    /**
     * Parse individual time match and convert to LOCAL HH:MM:SS format
     * CRITICAL: No timezone conversion - preserves local event time
     */
    parseTimeMatch(match, pattern) {
        try {
            let hour, minute, ampm;
            
            if (match.length === 4) { // Hour:Minute AM/PM
                hour = parseInt(match[1]);
                minute = parseInt(match[2]) || 0;
                ampm = match[3];
            } else if (match.length === 3) { // Hour AM/PM or Hour:Minute
                if (match[2] && /^(AM|PM)$/i.test(match[2])) {
                    hour = parseInt(match[1]);
                    minute = 0;
                    ampm = match[2];
                } else {
                    hour = parseInt(match[1]);
                    minute = parseInt(match[2]) || 0;
                    ampm = null;
                }
            } else {
                return null;
            }
            
            // Convert to 24-hour format (LOCAL TIME ONLY)
            if (ampm) {
                ampm = ampm.toUpperCase();
                if (ampm === 'PM' && hour !== 12) {
                    hour += 12;
                } else if (ampm === 'AM' && hour === 12) {
                    hour = 0;
                }
            } else if (this.options.assumeEvening && hour < 12 && hour > 6) {
                // Assume evening times for events (e.g., 8:00 = 8:00 PM)
                // Only if no AM/PM specified and it's a reasonable event time
                hour += 12;
            }
            
            // Format as HH:MM:SS (LOCAL TIME)
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
            
            return {
                time: timeString,
                endTime: null, // Could be expanded to handle time ranges
                confidence: ampm ? 0.9 : 0.7,
                method: 'regex_local_time',
                originalText: match[0]
            };
            
        } catch (error) {
            console.warn('Error parsing time match:', error);
            return null;
        }
    }
    
    /**
     * Extract date while preserving LOCAL date (no timezone conversion)
     */
    extractLocalDate(text) {
        for (const pattern of this.datePatterns) {
            pattern.lastIndex = 0; // Reset regex
            const match = pattern.exec(text);
            
            if (match) {
                const dateInfo = this.parseDateMatch(match, pattern);
                if (dateInfo) {
                    return {
                        success: true,
                        date: dateInfo.date,
                        method: dateInfo.method,
                        confidence: dateInfo.confidence
                    };
                }
            }
        }
        
        return { success: false, method: 'no_date_found' };
    }
    
    /**
     * Parse date match to LOCAL YYYY-MM-DD format
     * CRITICAL: No timezone conversion - preserves local event date
     */
    parseDateMatch(match, pattern) {
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            
            // Handle different date formats
            if (pattern.source.includes('january|february')) {
                // Month name format
                let month, day, year;
                
                if (match.length === 4) { // Month DD, YYYY
                    month = this.monthNames[match[1].toLowerCase()];
                    day = parseInt(match[2]);
                    year = parseInt(match[3]);
                } else if (match.length === 4) { // DD Month YYYY
                    day = parseInt(match[1]);
                    month = this.monthNames[match[2].toLowerCase()];
                    year = parseInt(match[3]);
                }
                
                if (month !== undefined && day && year) {
                    // Create LOCAL date (no timezone conversion)
                    const localDate = new Date(year, month, day);
                    return {
                        date: this.formatLocalDate(localDate),
                        method: 'month_name_format',
                        confidence: 0.9
                    };
                }
                
            } else if (pattern.source.includes('\\d{1,2}/\\d{1,2}')) {
                // MM/DD/YYYY format
                const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
                const day = parseInt(match[2]);
                let year = parseInt(match[3]);
                
                // Handle 2-digit years
                if (year < 100) {
                    year += year < 50 ? 2000 : 1900;
                }
                
                // Create LOCAL date (no timezone conversion)
                const localDate = new Date(year, month, day);
                return {
                    date: this.formatLocalDate(localDate),
                    method: 'numeric_format',
                    confidence: 0.8
                };
            }
            
            // Handle relative dates
            if (match[0].toLowerCase() === 'today') {
                return {
                    date: this.formatLocalDate(now),
                    method: 'relative_today',
                    confidence: 0.95
                };
            } else if (match[0].toLowerCase() === 'tomorrow') {
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return {
                    date: this.formatLocalDate(tomorrow),
                    method: 'relative_tomorrow',
                    confidence: 0.95
                };
            }
            
            return null;
            
        } catch (error) {
            console.warn('Error parsing date match:', error);
            return null;
        }
    }
    
    /**
     * Format date to YYYY-MM-DD WITHOUT timezone conversion
     * CRITICAL: Uses local date components, never calls toISOString()
     */
    formatLocalDate(date) {
        // Extract local date components (no timezone conversion)
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Return YYYY-MM-DD format using LOCAL date components
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Create empty result object
     */
    createEmptyResult() {
        return {
            date: null,
            startTime: this.options.defaultTime,
            endTime: null,
            confidence: 0,
            parsedComponents: {
                defaultTimeApplied: true
            },
            preservedLocalTime: true
        };
    }
    
    /**
     * Validate time format (must be HH:MM:SS)
     */
    isValidTimeFormat(timeString) {
        if (!timeString || typeof timeString !== 'string') return false;
        return /^\d{2}:\d{2}:\d{2}$/.test(timeString);
    }
    
    /**
     * Validate date format (must be YYYY-MM-DD)
     */
    isValidDateFormat(dateString) {
        if (!dateString || typeof dateString !== 'string') return false;
        return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    }
}

module.exports = LocalTimeParser;