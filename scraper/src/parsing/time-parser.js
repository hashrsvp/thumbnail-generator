/**
 * Time Parser - Handles various time formats from OCR text
 * Supports: 8PM, 8:00 PM, Doors 7PM, 7:30-10:00, etc.
 */

class TimeParser {
  constructor(options = {}) {
    this.options = options;
    this.patterns = this.buildPatterns();
    this.keywords = this.buildKeywords();
  }

  /**
   * Extract times from text
   * @param {Object} processedText - Preprocessed text object
   * @param {Object} context - Additional context
   * @returns {Array} Array of time matches with confidence scores
   */
  extract(processedText, context = {}) {
    const text = processedText.cleaned;
    const matches = [];
    
    // Try each pattern type
    for (const [patternType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const patternMatches = this.findMatches(text, pattern, patternType);
        matches.push(...patternMatches);
      }
    }

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.removeDuplicates(matches);
    return this.sortByConfidence(uniqueMatches);
  }

  buildPatterns() {
    return {
      // Standard 12-hour format: 8PM, 8:30 PM, 8:30PM
      standard12: [
        /\b(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm|a\.m\.|p\.m\.)\b/gi,
        /\b(\d{1,2})\s*(AM|PM|am|pm|a\.m\.|p\.m\.)\b/gi
      ],
      
      // 24-hour format: 20:30, 20:30:00
      military: [
        /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/g,
        /\b(2[0-4]|[01]?\d)([0-5]\d)\s*(?:hours?|hrs?|h)?\b/gi
      ],
      
      // Time ranges: 7:30-10:00, 8PM-11PM, 7-9PM
      ranges: [
        /\b(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\s*[-–—]\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)\b/gi,
        /\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(AM|PM|am|pm)\b/gi
      ],
      
      // Door times: Doors 7PM, Doors open 7:30, Doors at 8
      doors: [
        /\b(?:doors?|door)\s*(?:open|at)?\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\b/gi,
        /\b(?:doors?|door)\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\b/gi
      ],
      
      // Show times: Show 8PM, Performance 7:30, Concert at 9
      show: [
        /\b(?:show|performance|concert|event|starts?)\s*(?:at|@)?\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\b/gi
      ],
      
      // Casual formats: around 8, about 7:30, ~9PM
      casual: [
        /\b(?:around|about|approximately|~|circa)\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?\b/gi
      ],
      
      // Time with context: Dinner at 6, Meeting 2PM, Class 10AM
      contextual: [
        /\b(?:at|@)\s*(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)\b/gi
      ]
    };
  }

  buildKeywords() {
    return {
      doors: ['doors', 'door', 'doors open', 'entrance'],
      show: ['show', 'performance', 'concert', 'event', 'starts', 'begins', 'showtime'],
      casual: ['around', 'about', 'approximately', 'circa', '~'],
      early: ['early', 'matinee', 'morning', 'breakfast', 'lunch'],
      late: ['late', 'evening', 'night', 'after', 'dinner'],
      all_day: ['all day', 'all-day', 'throughout', 'continuous']
    };
  }

  findMatches(text, pattern, patternType) {
    const matches = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      try {
        const timeMatch = this.parseMatch(match, patternType, text, match.index);
        if (timeMatch) {
          matches.push({
            ...timeMatch,
            originalText: match[0],
            index: match.index,
            patternType,
            context: this.extractContext(text, match.index, match[0].length)
          });
        }
      } catch (error) {
        continue;
      }
    }
    
    return matches;
  }

  parseMatch(match, patternType, fullText, index) {
    switch (patternType) {
      case 'standard12':
        return this.parseStandard12(match, fullText, index);
      case 'military':
        return this.parseMilitary(match);
      case 'ranges':
        return this.parseRange(match);
      case 'doors':
        return this.parseDoors(match);
      case 'show':
        return this.parseShow(match);
      case 'casual':
        return this.parseCasual(match);
      case 'contextual':
        return this.parseContextual(match, fullText, index);
      default:
        return null;
    }
  }

  parseStandard12(match, fullText, index) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toUpperCase().replace(/\./g, '') : null;
    
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (!period && !this.inferAMPM(hour, fullText, index)) return null;
    
    const inferredPeriod = period || this.inferAMPM(hour, fullText, index);
    const hour24 = this.convertTo24Hour(hour, inferredPeriod);
    
    return {
      hour: hour24,
      minute,
      period: inferredPeriod,
      format: '12-hour',
      confidence: this.calculateConfidence('standard12', period !== null, hour, minute)
    };
  }

  parseMilitary(match) {
    const hour = parseInt(match[1]);
    const minute = parseInt(match[2]);
    const second = match[3] ? parseInt(match[3]) : 0;
    
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
      return null;
    }
    
    return {
      hour,
      minute,
      second,
      format: '24-hour',
      confidence: this.calculateConfidence('military', true, hour, minute)
    };
  }

  parseRange(match) {
    // Parse time ranges like "7:30-10:00 PM" or "8PM-11PM"
    const startHour = parseInt(match[1]);
    const startMinute = match[2] ? parseInt(match[2]) : 0;
    const startPeriod = match[3] ? match[3].toUpperCase().replace(/\./g, '') : null;
    
    const endHour = parseInt(match[4]);
    const endMinute = match[5] ? parseInt(match[5]) : 0;
    const endPeriod = match[6] ? match[6].toUpperCase().replace(/\./g, '') : startPeriod;
    
    if (!this.isValidTime(startHour, startMinute) || !this.isValidTime(endHour, endMinute)) {
      return null;
    }
    
    const startHour24 = this.convertTo24Hour(startHour, startPeriod);
    const endHour24 = this.convertTo24Hour(endHour, endPeriod);
    
    return {
      type: 'range',
      start: {
        hour: startHour24,
        minute: startMinute,
        period: startPeriod
      },
      end: {
        hour: endHour24,
        minute: endMinute,
        period: endPeriod
      },
      format: '12-hour',
      confidence: this.calculateConfidence('range', startPeriod && endPeriod, startHour, startMinute)
    };
  }

  parseDoors(match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toUpperCase().replace(/\./g, '') : this.inferAMPM(hour, '', 0);
    
    if (!this.isValidTime(hour, minute)) return null;
    
    const hour24 = this.convertTo24Hour(hour, period);
    
    return {
      hour: hour24,
      minute,
      period,
      format: '12-hour',
      type: 'doors',
      confidence: this.calculateConfidence('doors', period !== null, hour, minute)
    };
  }

  parseShow(match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toUpperCase().replace(/\./g, '') : this.inferAMPM(hour, '', 0);
    
    if (!this.isValidTime(hour, minute)) return null;
    
    const hour24 = this.convertTo24Hour(hour, period);
    
    return {
      hour: hour24,
      minute,
      period,
      format: '12-hour',
      type: 'show',
      confidence: this.calculateConfidence('show', period !== null, hour, minute)
    };
  }

  parseCasual(match) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toUpperCase().replace(/\./g, '') : this.inferAMPM(hour, '', 0);
    
    if (!this.isValidTime(hour, minute)) return null;
    
    const hour24 = this.convertTo24Hour(hour, period);
    
    return {
      hour: hour24,
      minute,
      period,
      format: '12-hour',
      type: 'approximate',
      confidence: this.calculateConfidence('casual', period !== null, hour, minute) * 0.9 // Slightly lower confidence
    };
  }

  parseContextual(match, fullText, index) {
    const hour = parseInt(match[1]);
    const minute = match[2] ? parseInt(match[2]) : 0;
    const period = match[3] ? match[3].toUpperCase().replace(/\./g, '') : this.inferAMPM(hour, fullText, index);
    
    if (!this.isValidTime(hour, minute)) return null;
    
    const hour24 = this.convertTo24Hour(hour, period);
    
    return {
      hour: hour24,
      minute,
      period,
      format: '12-hour',
      type: 'contextual',
      confidence: this.calculateConfidence('contextual', period !== null, hour, minute)
    };
  }

  isValidTime(hour, minute) {
    return hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59;
  }

  convertTo24Hour(hour, period) {
    if (!period) return hour; // Return as-is if no period
    
    if (period === 'AM') {
      return hour === 12 ? 0 : hour;
    } else if (period === 'PM') {
      return hour === 12 ? 12 : hour + 12;
    }
    
    return hour;
  }

  inferAMPM(hour, text, index) {
    // Try to infer AM/PM from context
    
    // Hour-based inference
    if (hour >= 7 && hour <= 11) {
      // Could be morning or evening, need more context
      const contextBefore = text.substring(Math.max(0, index - 50), index).toLowerCase();
      const contextAfter = text.substring(index, Math.min(text.length, index + 50)).toLowerCase();
      const context = contextBefore + contextAfter;
      
      // Morning indicators
      if (this.hasKeywords(context, this.keywords.early)) {
        return 'AM';
      }
      
      // Evening indicators  
      if (this.hasKeywords(context, this.keywords.late)) {
        return 'PM';
      }
      
      // Default to PM for events (most events are in evening)
      return 'PM';
    }
    
    if (hour === 12) {
      // 12 could be noon or midnight, default to PM (noon)
      return 'PM';
    }
    
    if (hour >= 1 && hour <= 6) {
      // Early hours, likely evening for events
      return 'PM';
    }
    
    if (hour >= 8 && hour <= 11) {
      // Could be morning or evening, default to PM for events
      return 'PM';
    }
    
    return 'PM'; // Default assumption for events
  }

  hasKeywords(text, keywords) {
    return keywords.some(keyword => text.includes(keyword));
  }

  calculateConfidence(patternType, hasPeriod, hour, minute) {
    let baseConfidence = 0.5;
    
    // Pattern type confidence
    const patternConfidence = {
      standard12: 0.9,
      military: 0.95,
      range: 0.85,
      doors: 0.8,
      show: 0.85,
      casual: 0.7,
      contextual: 0.75
    };
    
    baseConfidence = patternConfidence[patternType] || 0.5;
    
    // Period presence bonus
    if (hasPeriod) {
      baseConfidence += 0.1;
    } else {
      baseConfidence -= 0.2; // Penalty for inferred period
    }
    
    // Reasonable time bonus
    if (this.isReasonableEventTime(hour)) {
      baseConfidence += 0.1;
    } else {
      baseConfidence -= 0.1;
    }
    
    // Minute precision bonus
    if (minute === 0 || minute === 15 || minute === 30 || minute === 45) {
      baseConfidence += 0.05; // Common time intervals
    }
    
    return Math.max(0, Math.min(1, baseConfidence));
  }

  isReasonableEventTime(hour24) {
    // Most events are between 6 AM and 2 AM (next day)
    return (hour24 >= 6 && hour24 <= 23) || (hour24 >= 0 && hour24 <= 2);
  }

  extractContext(text, index, length) {
    const start = Math.max(0, index - 30);
    const end = Math.min(text.length, index + length + 30);
    return {
      before: text.substring(start, index),
      after: text.substring(index + length, end),
      full: text.substring(start, end)
    };
  }

  removeDuplicates(matches) {
    const unique = [];
    const seen = new Map();
    
    for (const match of matches) {
      // Create key based on time value
      const key = `${match.hour || match.start?.hour}:${match.minute || match.start?.minute}:${match.type || 'standard'}`;
      
      if (!seen.has(key)) {
        seen.set(key, match);
        unique.push(match);
      } else {
        // Keep the match with higher confidence
        const existing = seen.get(key);
        if (match.confidence > existing.confidence) {
          seen.set(key, match);
          const existingIndex = unique.findIndex(m => m === existing);
          if (existingIndex !== -1) {
            unique[existingIndex] = match;
          }
        }
      }
    }
    
    return unique;
  }

  sortByConfidence(matches) {
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}

module.exports = { TimeParser };