/**
 * Confidence Scorer - Provides confidence scoring for parsed event fields
 * Combines individual field confidence with cross-field validation
 */

class ConfidenceScorer {
  constructor(options = {}) {
    this.options = options;
    this.weights = this.buildWeights();
    this.validationRules = this.buildValidationRules();
  }

  /**
   * Score parsing results with confidence values
   * @param {Object} results - Raw parsing results from all parsers
   * @param {string} processedText - Processed text
   * @param {Object} context - Additional context
   * @returns {Object} Scored results with confidence values
   */
  scoreResults(results, processedText, context = {}) {
    const scoredResults = {};
    
    // Score individual fields
    for (const [fieldType, matches] of Object.entries(results)) {
      if (Array.isArray(matches)) {
        scoredResults[fieldType] = matches.map(match => 
          this.scoreField(match, fieldType, processedText, context)
        );
      }
    }
    
    // Apply cross-field validation
    const validatedResults = this.applyCrossFieldValidation(scoredResults, processedText, context);
    
    // Apply context-based scoring
    const contextScoredResults = this.applyContextScoring(validatedResults, context);
    
    return contextScoredResults;
  }

  buildWeights() {
    return {
      // Field importance weights
      fieldImportance: {
        dates: 0.25,
        times: 0.25, 
        prices: 0.2,
        venues: 0.3
      },
      
      // Pattern type weights
      patternTypes: {
        dates: {
          fullMonth: 1.0,
          abbrMonth: 0.9,
          dayOfWeek: 0.85,
          ordinal: 0.8,
          numeric: 0.7,
          relative: 0.95
        },
        times: {
          standard12: 1.0,
          military: 0.95,
          range: 0.8,
          doors: 0.75,
          show: 0.8,
          casual: 0.6,
          contextual: 0.7
        },
        prices: {
          free: 1.0,
          single: 0.9,
          range: 0.85,
          starting: 0.7,
          maximum: 0.65,
          contextual: 0.8,
          tiered: 0.75,
          timing: 0.8
        },
        venues: {
          atVenue: 1.0,
          venueTypes: 0.95,
          liveAt: 0.9,
          addresses: 0.7,
          fuzzy: 0.8,
          locations: 0.5,
          properNouns: 0.3
        }
      },
      
      // Cross-field validation weights
      crossField: {
        dateTimeConsistency: 0.15,
        priceReasonableness: 0.1,
        venueContext: 0.1,
        temporalLogic: 0.15
      }
    };
  }

  buildValidationRules() {
    return {
      // Date validation rules
      dates: {
        futureDate: {
          weight: 0.15,
          validator: (date) => new Date(date.parsed) > new Date()
        },
        reasonableRange: {
          weight: 0.1,
          validator: (date) => {
            const now = new Date();
            const eventDate = new Date(date.parsed);
            const daysDiff = (eventDate - now) / (1000 * 60 * 60 * 24);
            return daysDiff >= 0 && daysDiff <= 365;
          }
        },
        validDate: {
          weight: 0.2,
          validator: (date) => !isNaN(new Date(date.parsed))
        }
      },
      
      // Time validation rules
      times: {
        reasonableEventTime: {
          weight: 0.15,
          validator: (time) => {
            const hour = time.hour || time.start?.hour;
            return (hour >= 6 && hour <= 23) || (hour >= 0 && hour <= 2);
          }
        },
        validTime: {
          weight: 0.2,
          validator: (time) => {
            const hour = time.hour || time.start?.hour;
            const minute = time.minute || time.start?.minute;
            return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
          }
        }
      },
      
      // Price validation rules
      prices: {
        reasonablePrice: {
          weight: 0.15,
          validator: (price) => {
            if (price.isFree) return true;
            const minPrice = price.min || 0;
            const maxPrice = price.max || minPrice;
            return minPrice >= 0 && maxPrice <= 1000;
          }
        },
        validPriceRange: {
          weight: 0.1,
          validator: (price) => {
            if (price.min && price.max) {
              return price.max >= price.min;
            }
            return true;
          }
        }
      },
      
      // Venue validation rules
      venues: {
        reasonableLength: {
          weight: 0.1,
          validator: (venue) => venue.name.length >= 3 && venue.name.length <= 100
        },
        hasVenueType: {
          weight: 0.05,
          validator: (venue) => venue.venueType || venue.type === 'known_venue'
        }
      }
    };
  }

  scoreField(match, fieldType, processedText, context) {
    let baseConfidence = match.confidence || 0.5;
    
    // Apply pattern type weight
    const patternWeight = this.weights.patternTypes[fieldType]?.[match.patternType] || 1.0;
    baseConfidence *= patternWeight;
    
    // Apply field-specific validation rules
    const validationScore = this.applyValidationRules(match, fieldType);
    baseConfidence *= validationScore;
    
    // Apply text quality score
    const textQuality = this.assessTextQuality(processedText, match);
    baseConfidence *= textQuality;
    
    // Apply position-based scoring
    const positionScore = this.scoreByPosition(match, processedText);
    baseConfidence *= positionScore;
    
    return {
      ...match,
      confidence: Math.max(0, Math.min(1, baseConfidence)),
      scoringDetails: {
        originalConfidence: match.confidence,
        patternWeight,
        validationScore,
        textQuality,
        positionScore
      }
    };
  }

  applyValidationRules(match, fieldType) {
    const rules = this.validationRules[fieldType];
    if (!rules) return 1.0;
    
    let totalScore = 1.0;
    let totalWeight = 0;
    
    for (const [ruleName, rule] of Object.entries(rules)) {
      try {
        const passes = rule.validator(match);
        const weight = rule.weight;
        
        if (passes) {
          totalScore += weight * 0.5; // Bonus for passing
        } else {
          totalScore -= weight * 0.3; // Penalty for failing
        }
        
        totalWeight += weight;
      } catch (error) {
        // Skip invalid rules
        continue;
      }
    }
    
    // Normalize score
    return Math.max(0.1, Math.min(1.5, totalScore));
  }

  assessTextQuality(processedText, match) {
    let qualityScore = 1.0;
    
    // Check OCR quality indicators
    if (processedText.ocrQualityScore) {
      qualityScore *= processedText.ocrQualityScore;
    }
    
    // Check match position clarity
    if (match.originalText) {
      const hasWeirdChars = /[^\w\s.,!?:;'"$%()-]/.test(match.originalText);
      if (hasWeirdChars) qualityScore *= 0.8;
      
      const hasExcessiveSpacing = /\s{3,}/.test(match.originalText);
      if (hasExcessiveSpacing) qualityScore *= 0.9;
      
      const hasGoodCapitalization = /^[A-Z]/.test(match.originalText.trim());
      if (hasGoodCapitalization) qualityScore *= 1.1;
    }
    
    return Math.max(0.1, Math.min(1.3, qualityScore));
  }

  scoreByPosition(match, processedText) {
    let positionScore = 1.0;
    
    if (!match.index || !processedText.cleaned) return positionScore;
    
    const text = processedText.cleaned;
    const textLength = text.length;
    const relativePosition = match.index / textLength;
    
    // Early positions often contain key information
    if (relativePosition < 0.3) {
      positionScore *= 1.1;
    }
    
    // Very late positions might be less relevant
    if (relativePosition > 0.8) {
      positionScore *= 0.9;
    }
    
    // Check if match is near important keywords
    const context = match.context || this.extractSimpleContext(text, match.index, match.originalText?.length || 0);
    const nearImportantKeywords = this.isNearImportantKeywords(context);
    if (nearImportantKeywords) {
      positionScore *= 1.2;
    }
    
    return Math.max(0.1, Math.min(1.5, positionScore));
  }

  isNearImportantKeywords(context) {
    const importantKeywords = [
      'event', 'show', 'concert', 'performance', 'when', 'where', 'cost', 'price',
      'tickets', 'admission', 'doors', 'venue', 'location', 'at', 'on', 'date',
      'time', 'starts', 'begins'
    ];
    
    const contextText = (context.before + ' ' + context.after).toLowerCase();
    return importantKeywords.some(keyword => contextText.includes(keyword));
  }

  extractSimpleContext(text, index, length) {
    const start = Math.max(0, index - 20);
    const end = Math.min(text.length, index + length + 20);
    return {
      before: text.substring(start, index),
      after: text.substring(index + length, end)
    };
  }

  applyCrossFieldValidation(results, processedText, context) {
    const validatedResults = { ...results };
    
    // Date-Time consistency validation
    this.validateDateTimeConsistency(validatedResults);
    
    // Price reasonableness based on venue
    this.validatePriceVenueConsistency(validatedResults, context);
    
    // Temporal logic validation
    this.validateTemporalLogic(validatedResults);
    
    // Event type consistency
    this.validateEventTypeConsistency(validatedResults, context);
    
    return validatedResults;
  }

  validateDateTimeConsistency(results) {
    const dates = results.dates || [];
    const times = results.times || [];
    
    if (dates.length > 0 && times.length > 0) {
      const bestDate = dates[0];
      const bestTime = times[0];
      
      // Check if time makes sense for the date
      const dateObj = new Date(bestDate.parsed);
      const dayOfWeek = dateObj.getDay();
      const timeHour = bestTime.hour || bestTime.start?.hour;
      
      // Weekend events can be later
      if ((dayOfWeek === 0 || dayOfWeek === 6) && timeHour > 22) {
        bestTime.confidence *= 0.9; // Small penalty for very late weekend events
      }
      
      // Weekday events are typically earlier
      if (dayOfWeek > 0 && dayOfWeek < 6 && timeHour < 18) {
        bestTime.confidence *= 1.1; // Bonus for reasonable weekday times
      }
    }
  }

  validatePriceVenueConsistency(results, context) {
    const prices = results.prices || [];
    const venues = results.venues || [];
    
    if (prices.length > 0 && venues.length > 0) {
      const price = prices[0];
      const venue = venues[0];
      
      // If we have venue context data, validate price reasonableness
      if (context.venueCapacity) {
        const capacity = context.venueCapacity;
        const priceAmount = price.min || price.max || 0;
        
        // Large venues typically have higher prices
        if (capacity > 1000 && priceAmount < 20 && !price.isFree) {
          price.confidence *= 0.8;
        }
        
        // Small venues with very high prices are suspicious
        if (capacity < 200 && priceAmount > 100) {
          price.confidence *= 0.7;
        }
      }
      
      // Venue type vs price consistency
      if (venue.venueType) {
        const venueType = venue.venueType.toLowerCase();
        const priceAmount = price.min || price.max || 0;
        
        // Museums and libraries often have free events
        if (['museum', 'library', 'gallery'].includes(venueType) && price.isFree) {
          price.confidence *= 1.2;
        }
        
        // Clubs and bars typically have cover charges
        if (['club', 'bar', 'lounge'].includes(venueType) && priceAmount > 0) {
          price.confidence *= 1.1;
        }
      }
    }
  }

  validateTemporalLogic(results) {
    const dates = results.dates || [];
    const times = results.times || [];
    
    if (times.length > 1) {
      // Check for door vs show times
      const doorTimes = times.filter(t => t.type === 'doors');
      const showTimes = times.filter(t => t.type === 'show');
      
      if (doorTimes.length > 0 && showTimes.length > 0) {
        const doorTime = doorTimes[0];
        const showTime = showTimes[0];
        
        const doorHour = doorTime.hour;
        const showHour = showTime.hour;
        
        // Doors should be before show
        if (doorHour < showHour) {
          doorTime.confidence *= 1.2;
          showTime.confidence *= 1.2;
        } else if (doorHour >= showHour) {
          doorTime.confidence *= 0.7;
          showTime.confidence *= 0.7;
        }
      }
    }
    
    // Check for time ranges
    const timeRanges = times.filter(t => t.type === 'range');
    for (const range of timeRanges) {
      if (range.start && range.end) {
        const startHour = range.start.hour;
        const endHour = range.end.hour;
        
        // End should be after start (handling midnight crossover)
        if (endHour > startHour || (startHour > 20 && endHour < 6)) {
          range.confidence *= 1.1;
        } else {
          range.confidence *= 0.8;
        }
      }
    }
  }

  validateEventTypeConsistency(results, context) {
    if (!context.eventType) return;
    
    const eventType = context.eventType.toLowerCase();
    const times = results.times || [];
    const prices = results.prices || [];
    const venues = results.venues || [];
    
    // Concert-specific validations
    if (eventType.includes('concert') || eventType.includes('music')) {
      // Concerts are typically in the evening
      times.forEach(time => {
        const hour = time.hour || time.start?.hour;
        if (hour >= 19 && hour <= 23) {
          time.confidence *= 1.15;
        }
      });
      
      // Concerts typically have ticket prices
      prices.forEach(price => {
        if (!price.isFree && price.min > 10) {
          price.confidence *= 1.1;
        }
      });
    }
    
    // Theater-specific validations
    if (eventType.includes('theater') || eventType.includes('play')) {
      // Theater shows often have matinee and evening shows
      times.forEach(time => {
        const hour = time.hour || time.start?.hour;
        if (hour === 14 || hour === 19 || hour === 20) {
          time.confidence *= 1.2;
        }
      });
    }
    
    // Workshop/class-specific validations
    if (eventType.includes('workshop') || eventType.includes('class')) {
      // Often during business hours
      times.forEach(time => {
        const hour = time.hour || time.start?.hour;
        if (hour >= 9 && hour <= 17) {
          time.confidence *= 1.1;
        }
      });
    }
  }

  applyContextScoring(results, context) {
    const contextScoredResults = { ...results };
    
    // Apply known venue bonus
    if (context.knownVenues) {
      const venues = contextScoredResults.venues || [];
      venues.forEach(venue => {
        if (venue.knownVenue) {
          venue.confidence *= 1.3; // Significant bonus for known venues
        }
      });
    }
    
    // Apply location context
    if (context.expectedLocation) {
      const venues = contextScoredResults.venues || [];
      venues.forEach(venue => {
        if (venue.city && venue.city.toLowerCase() === context.expectedLocation.toLowerCase()) {
          venue.confidence *= 1.2;
        }
      });
    }
    
    // Apply event frequency context
    if (context.isRecurringEvent) {
      const dates = contextScoredResults.dates || [];
      dates.forEach(date => {
        if (date.dayOfWeek) {
          date.confidence *= 1.1; // Recurring events often specify day of week
        }
      });
    }
    
    // Apply historical accuracy
    if (context.historicalAccuracy) {
      const accuracy = context.historicalAccuracy;
      Object.values(contextScoredResults).forEach(matches => {
        if (Array.isArray(matches)) {
          matches.forEach(match => {
            match.confidence *= (0.8 + 0.4 * accuracy); // Scale by historical accuracy
          });
        }
      });
    }
    
    return contextScoredResults;
  }
}

module.exports = { ConfidenceScorer };