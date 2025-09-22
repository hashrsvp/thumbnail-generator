/**
 * Price Parser - Handles various price formats from OCR text
 * Supports: $25, Free, $20-40, $15+, Starting at $20, etc.
 */

class PriceParser {
  constructor(options = {}) {
    this.options = options;
    this.patterns = this.buildPatterns();
    this.keywords = this.buildKeywords();
    this.currencies = this.buildCurrencies();
  }

  /**
   * Extract prices from text
   * @param {Object} processedText - Preprocessed text object
   * @param {Object} context - Additional context
   * @returns {Array} Array of price matches with confidence scores
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
      // Free events: Free, FREE, No charge, Complimentary
      free: [
        /\b(free|FREE|Free)\b/g,
        /\b(no charge|no cost|complimentary|gratis)\b/gi,
        /\b(admission free|free admission|free entry)\b/gi,
        /\$0\.?00?/g
      ],
      
      // Single prices: $25, $25.00, 25$, USD 25
      single: [
        /\$(\d+(?:\.\d{2})?)\b/g,
        /(\d+(?:\.\d{2})?)\s*\$\b/g,
        /\b(USD|usd)\s*(\d+(?:\.\d{2})?)\b/g,
        /\b(\d+(?:\.\d{2})?)\s*(dollars?|bucks?)\b/gi
      ],
      
      // Price ranges: $20-40, $25-$35, $15 - $25
      ranges: [
        /\$(\d+(?:\.\d{2})?)\s*[-–—]\s*\$?(\d+(?:\.\d{2})?)/g,
        /(\d+(?:\.\d{2})?)\s*[-–—]\s*(\d+(?:\.\d{2})?)\s*\$\b/g,
        /\$(\d+(?:\.\d{2})?)\s*(?:to|through)\s*\$?(\d+(?:\.\d{2})?)/gi
      ],
      
      // Starting prices: Starting at $20, From $15, $25+
      starting: [
        /(?:starting\s*(?:at|from)|from)\s*\$(\d+(?:\.\d{2})?)/gi,
        /\$(\d+(?:\.\d{2})?)\+/g,
        /(?:as\s*low\s*as|minimum)\s*\$(\d+(?:\.\d{2})?)/gi
      ],
      
      // Maximum prices: Up to $50, Maximum $40, Under $30
      maximum: [
        /(?:up\s*to|maximum|max)\s*\$(\d+(?:\.\d{2})?)/gi,
        /(?:under|less\s*than|below)\s*\$(\d+(?:\.\d{2})?)/gi
      ],
      
      // Contextual prices: Tickets $25, Admission $15, Cover $10
      contextual: [
        /(?:tickets?|admission|cover|entry|cost)\s*:?\s*\$(\d+(?:\.\d{2})?)/gi,
        /\$(\d+(?:\.\d{2})?)\s*(?:tickets?|admission|cover|entry)/gi
      ],
      
      // Tiered pricing: $20 General, $15 Students, VIP $50
      tiered: [
        /\$(\d+(?:\.\d{2})?)\s*(general|adult|regular|standard)/gi,
        /\$(\d+(?:\.\d{2})?)\s*(student|senior|child|youth)/gi,
        /(?:vip|premium|special)\s*\$(\d+(?:\.\d{2})?)/gi,
        /(general|adult|regular|standard)\s*\$(\d+(?:\.\d{2})?)/gi
      ],
      
      // Advance/Door pricing: $15 advance, $20 door, Pre-sale $25
      timing: [
        /\$(\d+(?:\.\d{2})?)\s*(?:advance|pre-?sale|early)/gi,
        /\$(\d+(?:\.\d{2})?)\s*(?:door|day\s*of)/gi,
        /(?:advance|pre-?sale|early)\s*\$(\d+(?:\.\d{2})?)/gi,
        /(?:door|day\s*of|at\s*door)\s*\$(\d+(?:\.\d{2})?)/gi
      ]
    };
  }

  buildKeywords() {
    return {
      free: ['free', 'no charge', 'no cost', 'complimentary', 'gratis', 'admission free'],
      currency: ['$', 'usd', 'dollars', 'dollar', 'bucks', 'buck'],
      pricing: ['tickets', 'admission', 'cover', 'entry', 'cost', 'price', 'fee'],
      tiers: {
        general: ['general', 'adult', 'regular', 'standard'],
        student: ['student', 'senior', 'child', 'youth', 'kid'],
        premium: ['vip', 'premium', 'special', 'deluxe']
      },
      timing: {
        advance: ['advance', 'pre-sale', 'presale', 'early', 'early bird'],
        door: ['door', 'day of', 'at door', 'walk-in']
      }
    };
  }

  buildCurrencies() {
    return {
      symbols: ['$', '€', '£', '¥', '₹'],
      codes: ['USD', 'EUR', 'GBP', 'JPY', 'INR'],
      names: ['dollars', 'euros', 'pounds', 'yen', 'rupees']
    };
  }

  findMatches(text, pattern, patternType) {
    const matches = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      try {
        const priceMatch = this.parseMatch(match, patternType, text, match.index);
        if (priceMatch) {
          matches.push({
            ...priceMatch,
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
      case 'free':
        return this.parseFree(match);
      case 'single':
        return this.parseSingle(match);
      case 'ranges':
        return this.parseRange(match);
      case 'starting':
        return this.parseStarting(match);
      case 'maximum':
        return this.parseMaximum(match);
      case 'contextual':
        return this.parseContextual(match, fullText, index);
      case 'tiered':
        return this.parseTiered(match);
      case 'timing':
        return this.parseTiming(match);
      default:
        return null;
    }
  }

  parseFree(match) {
    return {
      type: 'free',
      min: 0,
      max: 0,
      currency: 'USD',
      isFree: true,
      confidence: this.calculateConfidence('free', true, 0, 0)
    };
  }

  parseSingle(match) {
    let price;
    let currency = 'USD';
    
    if (match[1]) {
      // $25 format
      price = parseFloat(match[1]);
    } else if (match[2]) {
      // USD 25 format
      currency = match[1].toUpperCase();
      price = parseFloat(match[2]);
    } else {
      return null;
    }
    
    if (isNaN(price) || price < 0) return null;
    
    return {
      type: 'single',
      min: price,
      max: price,
      currency,
      confidence: this.calculateConfidence('single', true, price, price)
    };
  }

  parseRange(match) {
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    
    if (isNaN(min) || isNaN(max) || min < 0 || max < 0 || min > max) {
      return null;
    }
    
    return {
      type: 'range',
      min,
      max,
      currency: 'USD',
      confidence: this.calculateConfidence('range', true, min, max)
    };
  }

  parseStarting(match) {
    const price = parseFloat(match[1]);
    
    if (isNaN(price) || price < 0) return null;
    
    return {
      type: 'starting',
      min: price,
      max: null,
      currency: 'USD',
      modifier: 'starting_at',
      confidence: this.calculateConfidence('starting', true, price, null)
    };
  }

  parseMaximum(match) {
    const price = parseFloat(match[1]);
    
    if (isNaN(price) || price < 0) return null;
    
    return {
      type: 'maximum',
      min: null,
      max: price,
      currency: 'USD',
      modifier: 'up_to',
      confidence: this.calculateConfidence('maximum', true, null, price)
    };
  }

  parseContextual(match, fullText, index) {
    const price = parseFloat(match[1]);
    
    if (isNaN(price) || price < 0) return null;
    
    const context = this.extractContext(fullText, index, match[0].length);
    const contextType = this.identifyPriceContext(context.full);
    
    return {
      type: 'contextual',
      min: price,
      max: price,
      currency: 'USD',
      context: contextType,
      confidence: this.calculateConfidence('contextual', true, price, price)
    };
  }

  parseTiered(match) {
    let price, tier;
    
    if (match[1] && match[2]) {
      // $25 General format
      price = parseFloat(match[1]);
      tier = match[2].toLowerCase();
    } else if (match[3] && match[4]) {
      // General $25 format  
      tier = match[3].toLowerCase();
      price = parseFloat(match[4]);
    } else {
      return null;
    }
    
    if (isNaN(price) || price < 0) return null;
    
    const tierType = this.identifyTierType(tier);
    
    return {
      type: 'tiered',
      min: price,
      max: price,
      currency: 'USD',
      tier: tierType,
      tierName: tier,
      confidence: this.calculateConfidence('tiered', true, price, price)
    };
  }

  parseTiming(match) {
    let price, timing;
    
    if (match[1]) {
      // $25 advance format
      price = parseFloat(match[1]);
      timing = this.extractTimingFromMatch(match[0]);
    } else if (match[2]) {
      // advance $25 format
      price = parseFloat(match[2]);
      timing = this.extractTimingFromMatch(match[0]);
    } else {
      return null;
    }
    
    if (isNaN(price) || price < 0) return null;
    
    return {
      type: 'timing',
      min: price,
      max: price,
      currency: 'USD',
      timing,
      confidence: this.calculateConfidence('timing', true, price, price)
    };
  }

  identifyPriceContext(contextText) {
    const context = contextText.toLowerCase();
    
    if (context.includes('ticket')) return 'ticket';
    if (context.includes('admission')) return 'admission';
    if (context.includes('cover')) return 'cover';
    if (context.includes('entry')) return 'entry';
    if (context.includes('cost')) return 'cost';
    
    return 'general';
  }

  identifyTierType(tier) {
    const lowerTier = tier.toLowerCase();
    
    if (this.keywords.tiers.general.includes(lowerTier)) return 'general';
    if (this.keywords.tiers.student.includes(lowerTier)) return 'student';
    if (this.keywords.tiers.premium.includes(lowerTier)) return 'premium';
    
    return 'other';
  }

  extractTimingFromMatch(matchText) {
    const text = matchText.toLowerCase();
    
    if (this.keywords.timing.advance.some(keyword => text.includes(keyword))) {
      return 'advance';
    }
    
    if (this.keywords.timing.door.some(keyword => text.includes(keyword))) {
      return 'door';
    }
    
    return 'general';
  }

  calculateConfidence(patternType, hasValidPrice, minPrice, maxPrice) {
    let baseConfidence = 0.5;
    
    // Pattern type confidence
    const patternConfidence = {
      free: 0.95,
      single: 0.9,
      range: 0.85,
      starting: 0.8,
      maximum: 0.75,
      contextual: 0.85,
      tiered: 0.8,
      timing: 0.8
    };
    
    baseConfidence = patternConfidence[patternType] || 0.5;
    
    // Valid price bonus
    if (!hasValidPrice) {
      baseConfidence -= 0.3;
    }
    
    // Reasonable price range check
    if (minPrice !== null && maxPrice !== null) {
      if (this.isReasonablePriceRange(minPrice, maxPrice)) {
        baseConfidence += 0.1;
      } else {
        baseConfidence -= 0.2;
      }
    } else if (minPrice !== null) {
      if (this.isReasonablePrice(minPrice)) {
        baseConfidence += 0.1;
      } else {
        baseConfidence -= 0.1;
      }
    }
    
    // Free event high confidence
    if (patternType === 'free') {
      baseConfidence = Math.max(baseConfidence, 0.9);
    }
    
    return Math.max(0, Math.min(1, baseConfidence));
  }

  isReasonablePrice(price) {
    // Most event prices are between $0 and $500
    return price >= 0 && price <= 500;
  }

  isReasonablePriceRange(min, max) {
    return this.isReasonablePrice(min) && 
           this.isReasonablePrice(max) && 
           max > min &&
           (max - min) <= 200; // Reasonable range spread
  }

  extractContext(text, index, length) {
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + length + 40);
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
      // Create key based on price values and type
      const key = `${match.type}:${match.min}:${match.max}:${match.tier || ''}:${match.timing || ''}`;
      
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
    return matches.sort((a, b) => {
      // Sort by confidence first, then by completeness
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Prefer matches with both min and max
      const aComplete = a.min !== null && a.max !== null ? 1 : 0;
      const bComplete = b.min !== null && b.max !== null ? 1 : 0;
      
      return bComplete - aComplete;
    });
  }
}

module.exports = { PriceParser };