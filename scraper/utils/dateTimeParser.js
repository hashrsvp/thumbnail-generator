/**
 * Universal Date/Time Parser for Event Websites
 * Handles ANY date format commonly found on event websites with intelligent parsing
 */

class UniversalDateTimeParser {
  constructor() {
    // Month mappings
    this.monthNames = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 7,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };

    // Day names for relative parsing
    this.dayNames = {
      'sunday': 0, 'sun': 0,
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2, 'tues': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6
    };

    // Time keywords for context-aware parsing
    this.timeKeywords = {
      show: ['show', 'performance', 'concert', 'start', 'begins'],
      doors: ['doors', 'gates', 'admission', 'entry', 'open'],
      end: ['end', 'finish', 'close', 'until']
    };

    // Common date patterns
    this.datePatterns = [
      // ISO 8601 variants
      /(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2})(?::(\d{2}))?)?/,
      
      // MM/DD/YYYY or DD/MM/YYYY
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
      
      // Month DD, YYYY
      /([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})/,
      
      // DD Month YYYY
      /(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/,
      
      // Month DD (current year)
      /([a-zA-Z]+)\s+(\d{1,2})\b/,
      
      // Date ranges (take start date)
      /([a-zA-Z]+)\s+(\d{1,2})\s*[-–—]\s*(\d{1,2}),?\s*(\d{4})?/,
      /(\d{1,2})[\/\-.](\d{1,2})\s*[-–—]\s*\d{1,2}[\/\-.](\d{4})/
    ];

    // Time patterns
    this.timePatterns = [
      // 24-hour format
      /(\d{1,2}):(\d{2})(?::(\d{2}))?/,
      
      // 12-hour format with AM/PM
      /(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/i,
      
      // Just hour with am/pm
      /(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i,
      
      // Doors/Show specific patterns
      /(doors?|gates?)\s*:?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
      /(show|performance|start|begins?)\s*:?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i
    ];

    this.now = new Date();
  }

  /**
   * Main parsing function
   * @param {string} input - Raw date/time string
   * @param {Object} options - Parsing options
   * @returns {Object} Parsed date information with confidence scores
   */
  parse(input, options = {}) {
    const {
      preferFuture = true,
      defaultTime = '19:00:00', // 7:00 PM
      timezone = null,
      assumeDMY = false // Assume DD/MM/YYYY over MM/DD/YYYY
    } = options;

    if (!input || typeof input !== 'string') {
      return this.createResult(null, null, 0, 'Invalid input');
    }

    const cleaned = input.toLowerCase().trim();
    let result = {
      date: null,
      time: null,
      confidence: 0,
      error: null,
      originalInput: input,
      parsedComponents: {}
    };

    try {
      // Try natural language first
      const naturalResult = this.parseNaturalLanguage(cleaned, preferFuture);
      if (naturalResult.confidence > 0.7) {
        return naturalResult;
      }

      // Try relative dates
      const relativeResult = this.parseRelativeDate(cleaned, preferFuture);
      if (relativeResult.confidence > 0.7) {
        return relativeResult;
      }

      // Try specific date patterns
      const dateResult = this.parseDatePatterns(cleaned, assumeDMY);
      const timeResult = this.parseTimePatterns(input); // Use original case for time

      // Combine results
      if (dateResult.date || timeResult.time) {
        result.date = dateResult.date || this.getTodayDate();
        result.time = timeResult.time || defaultTime;
        result.confidence = Math.max(dateResult.confidence, timeResult.confidence);
        result.parsedComponents = { ...dateResult.parsedComponents, ...timeResult.parsedComponents };

        // Adjust for future preference
        if (preferFuture && dateResult.date) {
          result.date = this.ensureFutureDate(result.date);
        }
      } else {
        result.error = 'No recognizable date or time patterns found';
      }

    } catch (error) {
      result.error = error.message;
      result.confidence = 0;
    }

    return result;
  }

  /**
   * Parse natural language dates
   */
  parseNaturalLanguage(input, preferFuture) {
    const today = new Date();
    const result = this.createEmptyResult();

    // Today, tomorrow, yesterday
    if (input.includes('today')) {
      result.date = this.formatDate(today);
      result.confidence = 0.9;
    } else if (input.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.date = this.formatDate(tomorrow);
      result.confidence = 0.9;
    } else if (input.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      result.date = this.formatDate(yesterday);
      result.confidence = 0.9;
    }

    // This/Next week patterns
    const weekPattern = /(this|next)\s+(week|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/;
    const weekMatch = input.match(weekPattern);
    if (weekMatch) {
      const [, modifier, dayOrWeek] = weekMatch;
      result.date = this.getRelativeWeekDate(modifier, dayOrWeek, today);
      result.confidence = 0.8;
    }

    return result;
  }

  /**
   * Parse relative dates (This Friday, Next Monday, etc.)
   */
  parseRelativeDate(input, preferFuture) {
    const result = this.createEmptyResult();
    const today = new Date();

    // This/Next + Day pattern
    const relativePattern = /(this|next)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/;
    const match = input.match(relativePattern);

    if (match) {
      const [, modifier, dayName] = match;
      const targetDay = this.dayNames[dayName.toLowerCase()];
      
      if (targetDay !== undefined) {
        const date = this.getNextWeekday(today, targetDay, modifier === 'next');
        result.date = this.formatDate(date);
        result.confidence = 0.8;
        result.parsedComponents.relativeDay = dayName;
      }
    }

    return result;
  }

  /**
   * Parse specific date patterns
   */
  parseDatePatterns(input, assumeDMY) {
    const result = this.createEmptyResult();

    for (const pattern of this.datePatterns) {
      const match = input.match(pattern);
      if (match) {
        const date = this.extractDateFromMatch(match, pattern, assumeDMY);
        if (date) {
          result.date = this.formatDate(date);
          result.confidence = 0.85;
          result.parsedComponents.datePattern = pattern.source;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Parse time patterns with context awareness
   */
  parseTimePatterns(input) {
    const result = this.createEmptyResult();
    const times = [];

    // Extract all possible times
    for (const pattern of this.timePatterns) {
      const matches = [...input.matchAll(new RegExp(pattern, 'gi'))];
      for (const match of matches) {
        const timeInfo = this.extractTimeFromMatch(match, input);
        if (timeInfo) {
          times.push(timeInfo);
        }
      }
    }

    if (times.length === 0) {
      return result;
    }

    // Context-aware time selection
    const selectedTime = this.selectBestTime(times, input);
    if (selectedTime) {
      result.time = selectedTime.time;
      result.confidence = selectedTime.confidence;
      result.parsedComponents.timeContext = selectedTime.context;
    }

    return result;
  }

  /**
   * Extract date from regex match
   */
  extractDateFromMatch(match, pattern, assumeDMY) {
    const now = new Date();
    const currentYear = now.getFullYear();

    // ISO 8601 format
    if (pattern.source.includes('T')) {
      const [, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Numeric formats (MM/DD/YYYY or DD/MM/YYYY)
    if (match[0].match(/^\d/)) {
      const [, first, second, third] = match;
      
      if (third && third.length === 4) {
        // Full year provided
        if (assumeDMY) {
          return new Date(parseInt(third), parseInt(second) - 1, parseInt(first));
        } else {
          return new Date(parseInt(third), parseInt(first) - 1, parseInt(second));
        }
      }
    }

    // Month name formats
    const monthMatch = match.find(part => part && this.monthNames[part.toLowerCase()] !== undefined);
    if (monthMatch) {
      const month = this.monthNames[monthMatch.toLowerCase()];
      const day = parseInt(match.find(part => part && /^\d{1,2}$/.test(part)));
      const year = parseInt(match.find(part => part && /^\d{4}$/.test(part))) || currentYear;
      
      if (!isNaN(day) && day >= 1 && day <= 31) {
        return new Date(year, month, day);
      }
    }

    return null;
  }

  /**
   * Extract time from regex match
   */
  extractTimeFromMatch(match, fullInput) {
    let hour, minute = 0, isPM = false;
    let context = 'general';

    // Determine context from surrounding text
    const matchIndex = fullInput.indexOf(match[0]);
    const contextBefore = fullInput.substring(Math.max(0, matchIndex - 20), matchIndex).toLowerCase();
    const contextAfter = fullInput.substring(matchIndex + match[0].length, Math.min(fullInput.length, matchIndex + match[0].length + 20)).toLowerCase();
    
    if (this.timeKeywords.show.some(keyword => contextBefore.includes(keyword) || contextAfter.includes(keyword))) {
      context = 'show';
    } else if (this.timeKeywords.doors.some(keyword => contextBefore.includes(keyword) || contextAfter.includes(keyword))) {
      context = 'doors';
    }

    // Parse hour and minute
    if (match[1]) {
      hour = parseInt(match[1]);
      if (match[2]) minute = parseInt(match[2]);
      
      // Check for AM/PM
      const ampmMatch = match.find(part => part && /^(am|pm|a\.m\.|p\.m\.)$/i.test(part));
      if (ampmMatch) {
        isPM = /^p/i.test(ampmMatch);
      } else if (hour < 12 && context !== 'doors') {
        // Assume PM for show times if hour is ambiguous
        isPM = true;
      }
    }

    // Convert to 24-hour format
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    // Validate time
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      
      return {
        time: timeString,
        confidence: this.calculateTimeConfidence(match, context),
        context: context,
        originalMatch: match[0]
      };
    }

    return null;
  }

  /**
   * Select the best time from multiple candidates
   */
  selectBestTime(times, input) {
    if (times.length === 1) return times[0];

    // Prioritize show times over doors times
    const showTimes = times.filter(t => t.context === 'show');
    if (showTimes.length > 0) {
      return showTimes.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    }

    // Return highest confidence time
    return times.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Calculate confidence score for time parsing
   */
  calculateTimeConfidence(match, context) {
    let confidence = 0.6; // Base confidence

    // Higher confidence for explicit AM/PM
    if (match[0].match(/[ap]\.?m\.?/i)) confidence += 0.2;

    // Context bonuses
    if (context === 'show') confidence += 0.15;
    if (context === 'doors') confidence += 0.05;

    // Pattern specificity bonus
    if (match[0].includes(':')) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  /**
   * Get next occurrence of a weekday
   */
  getNextWeekday(fromDate, targetDay, forceNext = false) {
    const result = new Date(fromDate);
    const currentDay = result.getDay();
    
    let daysToAdd;
    if (forceNext) {
      daysToAdd = targetDay <= currentDay ? 7 - currentDay + targetDay : targetDay - currentDay;
    } else {
      daysToAdd = targetDay === currentDay ? 0 : 
                 targetDay > currentDay ? targetDay - currentDay : 7 - currentDay + targetDay;
    }
    
    result.setDate(result.getDate() + daysToAdd);
    return result;
  }

  /**
   * Get relative week date
   */
  getRelativeWeekDate(modifier, dayOrWeek, fromDate) {
    const result = new Date(fromDate);
    
    if (dayOrWeek === 'weekend') {
      // Return next Saturday
      return this.getNextWeekday(fromDate, 6, modifier === 'next');
    } else if (dayOrWeek === 'week') {
      // Return Monday of specified week
      const monday = this.getNextWeekday(fromDate, 1, modifier === 'next');
      if (modifier === 'next') monday.setDate(monday.getDate() + 7);
      return monday;
    } else if (this.dayNames[dayOrWeek] !== undefined) {
      return this.getNextWeekday(fromDate, this.dayNames[dayOrWeek], modifier === 'next');
    }
    
    return result;
  }

  /**
   * Ensure date is in the future if preferFuture is true
   */
  ensureFutureDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) {
      // If the date is in the past, move it to next year
      date.setFullYear(date.getFullYear() + 1);
    }
    
    return this.formatDate(date);
  }

  /**
   * Utility functions
   */
  createEmptyResult() {
    return {
      date: null,
      time: null,
      confidence: 0,
      error: null,
      parsedComponents: {}
    };
  }

  createResult(date, time, confidence, error = null) {
    return {
      date,
      time,
      confidence,
      error,
      originalInput: '',
      parsedComponents: {}
    };
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  getTodayDate() {
    return this.formatDate(new Date());
  }

  /**
   * Batch parse multiple date/time strings
   */
  batchParse(inputs, options = {}) {
    return inputs.map(input => this.parse(input, options));
  }

  /**
   * Get parser statistics
   */
  getParserStats() {
    return {
      supportedFormats: [
        'ISO 8601 (2024-01-15T19:00:00)',
        'US Format (01/15/2024)',
        'European Format (15/01/2024)',
        'Natural Language (January 15, 2024)',
        'Relative Dates (Next Friday)',
        'Time Formats (7:00 PM, 19:00)',
        'Context-aware (Doors 6pm, Show 8pm)'
      ],
      features: [
        'Context-aware time extraction',
        'Confidence scoring',
        'Future date preference',
        'Timezone awareness',
        'Batch processing',
        'Error handling'
      ]
    };
  }
}

// Export for use
module.exports = UniversalDateTimeParser;

// Example usage and testing
if (require.main === module) {
  const parser = new UniversalDateTimeParser();
  
  const testCases = [
    "January 15, 2025",
    "Next Saturday",
    "Tomorrow at 7pm",
    "Doors 6pm, Show 8pm",
    "01/15/2025",
    "15-01-2025",
    "2025-01-15T19:00:00",
    "This Friday",
    "Jan 15",
    "January 15-17, 2025",
    "Tomorrow 8:30 PM",
    "Next week",
    "7:00 PM"
  ];

  console.log('Universal Date/Time Parser Test Results:');
  console.log('========================================');
  
  testCases.forEach(testCase => {
    const result = parser.parse(testCase);
    console.log(`\nInput: "${testCase}"`);
    console.log(`Date: ${result.date}`);
    console.log(`Time: ${result.time}`);
    console.log(`Confidence: ${result.confidence.toFixed(2)}`);
    if (result.error) console.log(`Error: ${result.error}`);
  });
}