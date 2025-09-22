/**
 * Event Details Text Parser
 * Robust text parsing algorithms for extracting event details from OCR text
 */

const { DateParser } = require('./date-parser');
const { TimeParser } = require('./time-parser');
const { PriceParser } = require('./price-parser');
const { VenueParser } = require('./venue-parser');
const { TextProcessor } = require('./text-processor');
const { ConfidenceScorer } = require('./confidence-scorer');

class EventDetailsParser {
  constructor(options = {}) {
    this.options = {
      minConfidence: 0.6,
      enableFuzzyMatching: true,
      enableSpellCorrection: false,
      ...options
    };

    this.dateParser = new DateParser(this.options);
    this.timeParser = new TimeParser(this.options);
    this.priceParser = new PriceParser(this.options);
    this.venueParser = new VenueParser(this.options);
    this.textProcessor = new TextProcessor(this.options);
    this.confidenceScorer = new ConfidenceScorer(this.options);
  }

  /**
   * Parse event details from OCR text
   * @param {string} text - Raw OCR text
   * @param {Object} context - Additional context (venue list, event type, etc.)
   * @returns {Object} Parsed event details with confidence scores
   */
  parse(text, context = {}) {
    try {
      // Preprocess text
      const processedText = this.textProcessor.preprocess(text);
      
      // Extract all possible matches
      const dateResults = this.dateParser.extract(processedText, context);
      const timeResults = this.timeParser.extract(processedText, context);
      const priceResults = this.priceParser.extract(processedText, context);
      const venueResults = this.venueParser.extract(processedText, context);

      // Apply confidence scoring
      const scoredResults = this.confidenceScorer.scoreResults({
        dates: dateResults,
        times: timeResults,
        prices: priceResults,
        venues: venueResults
      }, processedText, context);

      // Filter by minimum confidence
      const filteredResults = this.filterByConfidence(scoredResults);

      // Resolve conflicts and pick best matches
      const resolvedResults = this.resolveConflicts(filteredResults, processedText, context);

      return {
        success: true,
        data: {
          date: resolvedResults.date || null,
          time: resolvedResults.time || null,
          price: resolvedResults.price || null,
          venue: resolvedResults.venue || null,
          originalText: text,
          processedText: processedText.cleaned
        },
        confidence: this.calculateOverallConfidence(resolvedResults),
        metadata: {
          processingTime: Date.now(),
          alternativeMatches: this.getAlternativeMatches(scoredResults, resolvedResults),
          issues: this.identifyIssues(resolvedResults, text)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
          stack: error.stack
        },
        data: {
          date: null,
          time: null,
          price: null,
          venue: null,
          originalText: text,
          processedText: null
        },
        confidence: 0,
        metadata: {
          processingTime: Date.now(),
          alternativeMatches: {},
          issues: ['parsing_error']
        }
      };
    }
  }

  /**
   * Parse specific field type from text
   * @param {string} text - Text to parse
   * @param {string} fieldType - Type of field (date, time, price, venue)
   * @param {Object} context - Additional context
   * @returns {Object} Parsing results for specific field
   */
  parseField(text, fieldType, context = {}) {
    const processedText = this.textProcessor.preprocess(text);
    
    switch (fieldType.toLowerCase()) {
      case 'date':
        return this.dateParser.extract(processedText, context);
      case 'time':
        return this.timeParser.extract(processedText, context);
      case 'price':
        return this.priceParser.extract(processedText, context);
      case 'venue':
        return this.venueParser.extract(processedText, context);
      default:
        throw new Error(`Unknown field type: ${fieldType}`);
    }
  }

  /**
   * Validate parsed results
   * @param {Object} results - Parsed results
   * @returns {Object} Validation results
   */
  validate(results) {
    const issues = [];
    const warnings = [];

    // Validate date
    if (results.data.date) {
      const dateIssues = this.validateDate(results.data.date);
      issues.push(...dateIssues.errors);
      warnings.push(...dateIssues.warnings);
    }

    // Validate time
    if (results.data.time) {
      const timeIssues = this.validateTime(results.data.time);
      issues.push(...timeIssues.errors);
      warnings.push(...timeIssues.warnings);
    }

    // Validate price
    if (results.data.price) {
      const priceIssues = this.validatePrice(results.data.price);
      issues.push(...priceIssues.errors);
      warnings.push(...priceIssues.warnings);
    }

    // Validate venue
    if (results.data.venue) {
      const venueIssues = this.validateVenue(results.data.venue);
      issues.push(...venueIssues.errors);
      warnings.push(...venueIssues.warnings);
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      confidence: results.confidence
    };
  }

  // Private methods
  filterByConfidence(results) {
    const filtered = {};
    
    for (const [fieldType, matches] of Object.entries(results)) {
      filtered[fieldType] = matches.filter(match => 
        match.confidence >= this.options.minConfidence
      );
    }
    
    return filtered;
  }

  resolveConflicts(results, text, context) {
    const resolved = {};
    
    // Pick highest confidence match for each field
    for (const [fieldType, matches] of Object.entries(results)) {
      if (matches.length > 0) {
        // Sort by confidence and pick the best
        const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
        
        // Convert plural field names to singular for resolved object
        const singularFieldType = fieldType.replace(/s$/, ''); // dates -> date, times -> time, etc.
        resolved[singularFieldType] = sortedMatches[0];
      }
    }
    
    // Apply cross-field validation and adjustments
    return this.applyCrossFieldValidation(resolved, text, context);
  }

  applyCrossFieldValidation(results, text, context) {
    // Validate date-time consistency
    if (results.date && results.time) {
      const dateTime = this.combineDateAndTime(results.date, results.time);
      if (dateTime.isValid) {
        results.date.combined = dateTime.combined;
        results.time.combined = dateTime.combined;
      }
    }

    // Validate price-venue consistency
    if (results.price && results.venue) {
      const priceVenueConsistency = this.validatePriceVenueConsistency(
        results.price, results.venue, context
      );
      if (priceVenueConsistency.adjustedConfidence) {
        results.price.confidence *= priceVenueConsistency.adjustedConfidence;
      }
    }

    return results;
  }

  calculateOverallConfidence(results) {
    const confidences = Object.values(results)
      .filter(result => result && result.confidence)
      .map(result => result.confidence);
    
    if (confidences.length === 0) return 0;
    
    // Weighted average with field importance
    const weights = {
      date: 0.3,
      time: 0.25,
      price: 0.2,
      venue: 0.25
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [fieldType, result] of Object.entries(results)) {
      if (result && result.confidence) {
        const weight = weights[fieldType] || 0.25;
        weightedSum += result.confidence * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  getAlternativeMatches(scoredResults, resolvedResults) {
    const alternatives = {};
    
    for (const [fieldType, matches] of Object.entries(scoredResults)) {
      const resolved = resolvedResults[fieldType];
      alternatives[fieldType] = matches
        .filter(match => !resolved || match.value !== resolved.value)
        .slice(0, 3) // Top 3 alternatives
        .map(match => ({
          value: match.value,
          confidence: match.confidence,
          reason: match.reason || 'alternative_match'
        }));
    }
    
    return alternatives;
  }

  identifyIssues(results, originalText) {
    const issues = [];
    
    // Check for missing critical fields
    if (!results.date) issues.push('missing_date');
    if (!results.time) issues.push('missing_time');
    if (!results.venue) issues.push('missing_venue');
    
    // Check for low confidence
    const overallConfidence = this.calculateOverallConfidence(results);
    if (overallConfidence < 0.7) issues.push('low_confidence');
    
    // Check for OCR quality issues
    if (this.hasOCRQualityIssues(originalText)) {
      issues.push('poor_ocr_quality');
    }
    
    return issues;
  }

  hasOCRQualityIssues(text) {
    // Check for common OCR issues
    const ocrIssuePatterns = [
      /[Il1]{3,}/, // Multiple similar characters
      /[0O]{3,}/, // Multiple zeros/Os
      /\s{5,}/, // Excessive whitespace
      /[^\w\s.,!?:;'"$%()-]{3,}/, // Unusual character sequences
    ];
    
    return ocrIssuePatterns.some(pattern => pattern.test(text));
  }

  // Validation methods
  validateDate(dateResult) {
    const errors = [];
    const warnings = [];
    
    const date = new Date(dateResult.parsed);
    const now = new Date();
    
    if (isNaN(date)) {
      errors.push('invalid_date_format');
    } else {
      if (date < now && (now - date) > 24 * 60 * 60 * 1000) {
        warnings.push('date_in_past');
      }
      
      if (date > new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)) {
        warnings.push('date_far_future');
      }
    }
    
    return { errors, warnings };
  }

  validateTime(timeResult) {
    const errors = [];
    const warnings = [];
    
    if (timeResult.hour < 0 || timeResult.hour > 23) {
      errors.push('invalid_hour');
    }
    
    if (timeResult.minute < 0 || timeResult.minute > 59) {
      errors.push('invalid_minute');
    }
    
    // Check for reasonable event times
    if (timeResult.hour < 6) {
      warnings.push('very_early_time');
    }
    
    if (timeResult.hour > 23) {
      warnings.push('very_late_time');
    }
    
    return { errors, warnings };
  }

  validatePrice(priceResult) {
    const errors = [];
    const warnings = [];
    
    if (priceResult.min < 0) {
      errors.push('negative_price');
    }
    
    if (priceResult.max && priceResult.max < priceResult.min) {
      errors.push('invalid_price_range');
    }
    
    if (priceResult.min > 1000) {
      warnings.push('very_high_price');
    }
    
    return { errors, warnings };
  }

  validateVenue(venueResult) {
    const errors = [];
    const warnings = [];
    
    if (venueResult.name.length < 3) {
      warnings.push('very_short_venue_name');
    }
    
    if (venueResult.name.length > 100) {
      warnings.push('very_long_venue_name');
    }
    
    return { errors, warnings };
  }

  combineDateAndTime(dateResult, timeResult) {
    try {
      const date = new Date(dateResult.parsed);
      date.setHours(timeResult.hour, timeResult.minute, 0, 0);
      
      return {
        isValid: true,
        combined: date
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  validatePriceVenueConsistency(priceResult, venueResult, context) {
    // This could be enhanced with venue-specific price expectations
    // For now, return neutral consistency
    return {
      adjustedConfidence: 1.0,
      reason: 'no_venue_price_data'
    };
  }
}

module.exports = { EventDetailsParser };