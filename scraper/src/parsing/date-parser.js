/**
 * Date Parser - Handles various date formats from OCR text
 */

class DateParser {
  constructor(options = {}) {
    this.options = options;
    this.patterns = this.buildPatterns();
    this.monthNames = this.buildMonthNames();
    this.dayNames = this.buildDayNames();
  }

  /**
   * Extract dates from text
   * @param {Object} processedText - Preprocessed text object
   * @param {Object} context - Additional context
   * @returns {Array} Array of date matches with confidence scores
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
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    return {
      // Full month name patterns: January 15, 2025
      fullMonth: [
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})\b/gi,
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi
      ],
      
      // Abbreviated month: Jan 15, 2025
      abbrMonth: [
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})\b/gi,
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi
      ],
      
      // Numeric formats: 1/15/25, 1/15/2025, 01/15/25
      numeric: [
        /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,
        /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/g,
        /\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g,
        /\b(\d{1,2})-(\d{1,2})-(\d{2})\b/g
      ],
      
      // Day of week patterns: Friday January 15, Fri Jan 15
      dayOfWeek: [
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?\b/gi,
        /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\.?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s*,?\s*(\d{4})?\b/gi,
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(\d{1,2})(?:st|nd|rd|th)?\b/gi
      ],
      
      // Relative dates: Today, Tomorrow, This Friday
      relative: [
        /\b(today|tonight)\b/gi,
        /\b(tomorrow)\b/gi,
        /\b(this\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
        /\b(next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi
      ],
      
      // Ordinal dates: 15th January, 3rd of March
      ordinal: [
        /\b(\d{1,2})(?:st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})?\b/gi,
        /\b(\d{1,2})(?:st|nd|rd|th)\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})?\b/gi
      ]
    };
  }

  buildMonthNames() {
    return {
      full: {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
      },
      abbreviated: {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4,
        'may': 5, 'jun': 6, 'jul': 7, 'aug': 8,
        'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
      }
    };
  }

  buildDayNames() {
    return {
      full: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      abbreviated: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    };
  }

  findMatches(text, pattern, patternType) {
    const matches = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      try {
        const dateMatch = this.parseMatch(match, patternType);
        if (dateMatch) {
          matches.push({
            ...dateMatch,
            originalText: match[0],
            index: match.index,
            patternType
          });
        }
      } catch (error) {
        // Continue with next match if parsing fails
        continue;
      }
    }
    
    return matches;
  }

  parseMatch(match, patternType) {
    const currentYear = new Date().getFullYear();
    
    switch (patternType) {
      case 'fullMonth':
        return this.parseFullMonth(match, currentYear);
      case 'abbrMonth':
        return this.parseAbbrMonth(match, currentYear);
      case 'numeric':
        return this.parseNumeric(match, currentYear);
      case 'dayOfWeek':
        return this.parseDayOfWeek(match, currentYear);
      case 'relative':
        return this.parseRelative(match);
      case 'ordinal':
        return this.parseOrdinal(match, currentYear);
      default:
        return null;
    }
  }

  parseFullMonth(match, currentYear) {
    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2]);
    const year = match[3] ? parseInt(match[3]) : currentYear;
    
    const month = this.monthNames.full[monthName];
    if (!month || day < 1 || day > 31) return null;
    
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1) return null; // Invalid date
    
    return {
      parsed: date,
      day,
      month,
      year,
      confidence: this.calculateConfidence(date, 'fullMonth', match[3] ? true : false)
    };
  }

  parseAbbrMonth(match, currentYear) {
    const monthAbbr = match[1].toLowerCase().replace('.', '');
    const day = parseInt(match[2]);
    const year = match[3] ? parseInt(match[3]) : currentYear;
    
    const month = this.monthNames.abbreviated[monthAbbr];
    if (!month || day < 1 || day > 31) return null;
    
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1) return null;
    
    return {
      parsed: date,
      day,
      month,
      year,
      confidence: this.calculateConfidence(date, 'abbrMonth', match[3] ? true : false)
    };
  }

  parseNumeric(match, currentYear) {
    let month = parseInt(match[1]);
    let day = parseInt(match[2]);
    let year = parseInt(match[3]);
    
    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    
    // Try both M/D/Y and D/M/Y formats
    const formats = [
      { month, day, year }, // American format
      { month: day, day: month, year } // International format
    ];
    
    for (const format of formats) {
      if (format.month >= 1 && format.month <= 12 && 
          format.day >= 1 && format.day <= 31) {
        const date = new Date(format.year, format.month - 1, format.day);
        if (date.getMonth() === format.month - 1) {
          return {
            parsed: date,
            day: format.day,
            month: format.month,
            year: format.year,
            confidence: this.calculateConfidence(date, 'numeric', true),
            ambiguous: formats.length > 1 && month !== day
          };
        }
      }
    }
    
    return null;
  }

  parseDayOfWeek(match, currentYear) {
    const dayOfWeek = match[1].toLowerCase();
    const monthStr = match[2] ? match[2].toLowerCase() : null;
    const day = match[3] ? parseInt(match[3]) : null;
    const year = match[4] ? parseInt(match[4]) : currentYear;
    
    if (monthStr && day) {
      // Full date with day of week
      const month = this.monthNames.full[monthStr] || this.monthNames.abbreviated[monthStr.replace('.', '')];
      if (!month) return null;
      
      const date = new Date(year, month - 1, day);
      if (date.getMonth() !== month - 1) return null;
      
      return {
        parsed: date,
        day,
        month,
        year,
        dayOfWeek,
        confidence: this.calculateConfidence(date, 'dayOfWeek', true)
      };
    } else if (day && !monthStr) {
      // Just day of week with day number (need to infer month/year)
      return this.findNextDateForDayAndNumber(dayOfWeek, day, currentYear);
    }
    
    return null;
  }

  parseRelative(match) {
    const relative = match[1].toLowerCase();
    const now = new Date();
    let date;
    
    switch (relative) {
      case 'today':
      case 'tonight':
        date = new Date(now);
        break;
      case 'tomorrow':
        date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      default:
        if (relative.startsWith('this ') || relative.startsWith('next ')) {
          return this.parseRelativeDayOfWeek(relative);
        }
        return null;
    }
    
    return {
      parsed: date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      relative: true,
      confidence: this.calculateConfidence(date, 'relative', true)
    };
  }

  parseRelativeDayOfWeek(relative) {
    const parts = relative.split(' ');
    const modifier = parts[0]; // 'this' or 'next'
    const dayName = parts[1];
    
    const targetDayIndex = this.dayNames.full.indexOf(dayName);
    if (targetDayIndex === -1) return null;
    
    const now = new Date();
    const currentDayIndex = now.getDay();
    
    let daysToAdd;
    if (modifier === 'this') {
      daysToAdd = targetDayIndex - currentDayIndex;
      if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
    } else { // 'next'
      daysToAdd = targetDayIndex - currentDayIndex + 7;
    }
    
    const date = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    return {
      parsed: date,
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      relative: true,
      dayOfWeek: dayName,
      confidence: this.calculateConfidence(date, 'relative', true)
    };
  }

  parseOrdinal(match, currentYear) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = match[3] ? parseInt(match[3]) : currentYear;
    
    const month = this.monthNames.full[monthName];
    if (!month || day < 1 || day > 31) return null;
    
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1) return null;
    
    return {
      parsed: date,
      day,
      month,
      year,
      confidence: this.calculateConfidence(date, 'ordinal', match[3] ? true : false)
    };
  }

  calculateConfidence(date, patternType, hasYear) {
    let baseConfidence = 0.5;
    
    // Pattern type confidence
    const patternConfidence = {
      fullMonth: 0.9,
      abbrMonth: 0.8,
      dayOfWeek: 0.85,
      ordinal: 0.85,
      numeric: 0.7,
      relative: 0.95
    };
    
    baseConfidence = patternConfidence[patternType] || 0.5;
    
    // Year presence bonus
    if (hasYear) {
      baseConfidence += 0.1;
    }
    
    // Date reasonableness check
    const now = new Date();
    const daysDiff = Math.abs((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 365) { // Within a year
      baseConfidence += 0.1;
    } else if (daysDiff > 365 * 2) { // More than 2 years
      baseConfidence -= 0.2;
    }
    
    // Past date penalty (unless very recent)
    if (date < now && daysDiff > 1) {
      baseConfidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, baseConfidence));
  }

  removeDuplicates(matches) {
    const unique = [];
    const seen = new Set();
    
    for (const match of matches) {
      const key = `${match.parsed.getTime()}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(match);
      } else {
        // Update confidence if this match has higher confidence
        const existing = unique.find(m => m.parsed.getTime() === match.parsed.getTime());
        if (existing && match.confidence > existing.confidence) {
          Object.assign(existing, match);
        }
      }
    }
    
    return unique;
  }

  sortByConfidence(matches) {
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  findNextDateForDayAndNumber(dayOfWeek, day, currentYear) {
    // This is a complex heuristic - try to find the next occurrence
    // of the specified day of week with the given day number
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Try current and next month
    for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
      const targetMonth = (currentMonth + monthOffset) % 12;
      const targetYear = currentYear + Math.floor((currentMonth + monthOffset) / 12);
      
      const date = new Date(targetYear, targetMonth, day);
      
      if (date.getMonth() === targetMonth && // Valid day for month
          date > now) { // In the future
        
        const actualDayName = this.dayNames.full[date.getDay()];
        if (actualDayName === dayOfWeek) {
          return {
            parsed: date,
            day,
            month: targetMonth + 1,
            year: targetYear,
            dayOfWeek,
            inferred: true,
            confidence: 0.6 // Lower confidence for inferred dates
          };
        }
      }
    }
    
    return null;
  }
}

module.exports = { DateParser };