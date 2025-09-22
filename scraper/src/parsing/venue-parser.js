/**
 * Venue Parser - Extracts venue names and locations from OCR text
 * Handles various formats and uses fuzzy matching with known venues
 */

class VenueParser {
  constructor(options = {}) {
    this.options = options;
    this.patterns = this.buildPatterns();
    this.keywords = this.buildKeywords();
    this.commonVenueTypes = this.buildVenueTypes();
    this.stopWords = this.buildStopWords();
  }

  /**
   * Extract venues from text
   * @param {Object} processedText - Preprocessed text object
   * @param {Object} context - Additional context (known venues, location, etc.)
   * @returns {Array} Array of venue matches with confidence scores
   */
  extract(processedText, context = {}) {
    const text = processedText.cleaned;
    const matches = [];
    
    // Try each pattern type
    for (const [patternType, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const patternMatches = this.findMatches(text, pattern, patternType, context);
        matches.push(...patternMatches);
      }
    }

    // Apply fuzzy matching against known venues if provided
    if (context.knownVenues) {
      const fuzzyMatches = this.findFuzzyMatches(text, context.knownVenues);
      matches.push(...fuzzyMatches);
    }

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.removeDuplicates(matches);
    return this.sortByConfidence(uniqueMatches);
  }

  buildPatterns() {
    return {
      // At venue: "at The Observatory", "@ Madison Square Garden"
      atVenue: [
        /\b(?:at|@)\s+([A-Z][A-Za-z\s&',.-]{3,50})/g,
        /\b(?:venue|location):\s*([A-Z][A-Za-z\s&',.-]{3,50})/gi
      ],
      
      // Venue types: "The Theater", "Club Luna", "Bar & Grill"
      venueTypes: [
        /\b(The\s+)?([A-Z][A-Za-z\s&',.-]{1,30})\s+(Theater|Theatre|Club|Bar|Lounge|Hall|Arena|Stadium|Center|Centre|Auditorium|Pavilion|Garden|Gardens|Hotel|Casino|Restaurant|Cafe|Gallery|Museum|Library|Church|Temple)\b/gi,
        /\b(Theater|Theatre|Club|Bar|Lounge|Hall|Arena|Stadium|Center|Centre|Auditorium|Pavilion|Garden|Gardens|Hotel|Casino|Restaurant|Cafe|Gallery|Museum|Library|Church|Temple)\s+([A-Z][A-Za-z\s&',.-]{1,30})\b/gi
      ],
      
      // Address patterns: "123 Main St", "1234 Broadway"
      addresses: [
        /\b(\d{1,5})\s+([A-Z][A-Za-z\s]{2,30})\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Way|Circle|Cir|Court|Ct|Place|Pl)\b/gi,
        /\b(\d{1,5})\s+([A-Z][A-Za-z\s]{2,30})\b/g
      ],
      
      // Common venue indicators: "Live at", "Performing at"
      liveAt: [
        /\b(?:live|performing|playing|appearing)\s+(?:at|@)\s+([A-Z][A-Za-z\s&',.-]{3,50})/gi
      ],
      
      // Proper nouns that might be venues (uppercase words)
      properNouns: [
        /\b([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){1,4})\b/g
      ],
      
      // Location indicators: "in Chicago", "Los Angeles venue"
      locations: [
        /\bin\s+([A-Z][A-Za-z\s]{2,30}),?\s*([A-Z]{2}|\b[A-Z][A-Za-z\s]{2,20})\b/g,
        /\b([A-Z][A-Za-z\s]{2,30}),\s*([A-Z]{2})\b/g
      ]
    };
  }

  buildKeywords() {
    return {
      venueIndicators: ['at', '@', 'venue', 'location', 'live', 'performing', 'playing', 'appearing'],
      venueTypes: [
        'theater', 'theatre', 'club', 'bar', 'lounge', 'hall', 'arena', 'stadium',
        'center', 'centre', 'auditorium', 'pavilion', 'garden', 'gardens',
        'hotel', 'casino', 'restaurant', 'cafe', 'gallery', 'museum',
        'library', 'church', 'temple', 'ballroom', 'convention', 'conference'
      ],
      locationWords: ['in', 'at', 'near', 'downtown', 'uptown', 'north', 'south', 'east', 'west'],
      excludeWords: [
        'the', 'and', 'or', 'but', 'with', 'for', 'on', 'in', 'at', 'by', 'to',
        'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'among', 'under', 'over', 'again', 'further',
        'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
        'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        'can', 'will', 'just', 'should', 'now', 'event', 'show', 'concert',
        'performance', 'tickets', 'admission', 'doors', 'pm', 'am'
      ]
    };
  }

  buildVenueTypes() {
    return [
      'theater', 'theatre', 'club', 'bar', 'pub', 'lounge', 'hall', 'arena',
      'stadium', 'center', 'centre', 'auditorium', 'pavilion', 'garden',
      'gardens', 'hotel', 'casino', 'restaurant', 'cafe', 'bistro', 'grill',
      'gallery', 'museum', 'library', 'church', 'cathedral', 'temple',
      'ballroom', 'convention', 'conference', 'civic', 'community', 'cultural',
      'performing', 'music', 'opera', 'symphony', 'amphitheater', 'coliseum'
    ];
  }

  buildStopWords() {
    return new Set([
      'the', 'and', 'or', 'but', 'with', 'for', 'on', 'in', 'at', 'by', 'to',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'under', 'over', 'again', 'further',
      'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
      'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
      'can', 'will', 'just', 'should', 'now', 'event', 'show', 'concert',
      'performance', 'tickets', 'admission', 'doors', 'pm', 'am', 'date', 'time',
      'price', 'cost', 'free', 'tonight', 'today', 'tomorrow', 'friday', 'saturday',
      'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'january', 'february',
      'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
      'november', 'december'
    ]);
  }

  findMatches(text, pattern, patternType, context) {
    const matches = [];
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      try {
        const venueMatch = this.parseMatch(match, patternType, text, match.index, context);
        if (venueMatch) {
          matches.push({
            ...venueMatch,
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

  parseMatch(match, patternType, fullText, index, context) {
    switch (patternType) {
      case 'atVenue':
        return this.parseAtVenue(match);
      case 'venueTypes':
        return this.parseVenueTypes(match);
      case 'addresses':
        return this.parseAddresses(match);
      case 'liveAt':
        return this.parseLiveAt(match);
      case 'properNouns':
        return this.parseProperNouns(match, fullText, index, context);
      case 'locations':
        return this.parseLocations(match);
      default:
        return null;
    }
  }

  parseAtVenue(match) {
    const venueName = this.cleanVenueName(match[1]);
    
    if (!this.isValidVenueName(venueName)) return null;
    
    return {
      name: venueName,
      type: 'venue',
      confidence: this.calculateConfidence('atVenue', venueName, true)
    };
  }

  parseVenueTypes(match) {
    let venueName, venueType;
    
    if (match[2] && match[3]) {
      // "Name Theater" format
      const prefix = match[1] || '';
      venueName = prefix + match[2];
      venueType = match[3].toLowerCase();
    } else if (match[4] && match[5]) {
      // "Theater Name" format
      venueType = match[4].toLowerCase();
      venueName = match[5];
    } else {
      return null;
    }
    
    venueName = this.cleanVenueName(venueName);
    
    if (!this.isValidVenueName(venueName)) return null;
    
    return {
      name: venueName + ' ' + this.capitalizeFirst(venueType),
      type: 'venue',
      venueType,
      confidence: this.calculateConfidence('venueTypes', venueName, true)
    };
  }

  parseAddresses(match) {
    const streetNumber = match[1];
    const streetName = match[2];
    const streetType = match[3] || '';
    
    const address = `${streetNumber} ${streetName}${streetType ? ' ' + streetType : ''}`;
    
    return {
      name: address,
      type: 'address',
      streetNumber,
      streetName,
      streetType,
      confidence: this.calculateConfidence('addresses', address, false)
    };
  }

  parseLiveAt(match) {
    const venueName = this.cleanVenueName(match[1]);
    
    if (!this.isValidVenueName(venueName)) return null;
    
    return {
      name: venueName,
      type: 'venue',
      confidence: this.calculateConfidence('liveAt', venueName, true)
    };
  }

  parseProperNouns(match, fullText, index, context) {
    const properNoun = this.cleanVenueName(match[1]);
    
    // Filter out common non-venue proper nouns
    if (!this.isLikelyVenue(properNoun, fullText, index)) return null;
    if (!this.isValidVenueName(properNoun)) return null;
    
    return {
      name: properNoun,
      type: 'potential_venue',
      confidence: this.calculateConfidence('properNouns', properNoun, false)
    };
  }

  parseLocations(match) {
    const city = match[1];
    const state = match[2];
    
    return {
      name: `${city}, ${state}`,
      type: 'location',
      city,
      state,
      confidence: this.calculateConfidence('locations', `${city}, ${state}`, false)
    };
  }

  findFuzzyMatches(text, knownVenues) {
    const matches = [];
    const textLower = text.toLowerCase();
    
    for (const venue of knownVenues) {
      const venueLower = venue.name.toLowerCase();
      const similarity = this.calculateStringSimilarity(textLower, venueLower);
      
      // Also check if venue name appears as substring
      const substringMatch = textLower.includes(venueLower) || venueLower.includes(textLower);
      
      if (similarity > 0.8 || substringMatch) {
        const confidence = substringMatch ? 
          Math.max(similarity, 0.9) : 
          similarity * 0.9; // Slight penalty for fuzzy matches
        
        matches.push({
          name: venue.name,
          type: 'known_venue',
          knownVenue: true,
          similarity,
          confidence: this.calculateConfidence('fuzzy', venue.name, true) * confidence,
          venueData: venue
        });
      }
    }
    
    return matches;
  }

  cleanVenueName(name) {
    return name
      .trim()
      .replace(/^\s*[@&]\s*/, '') // Remove leading @ or &
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(the\s+)?/i, '') // Remove leading "the"
      .trim();
  }

  isValidVenueName(name) {
    if (!name || name.length < 2 || name.length > 100) return false;
    
    // Check if it's mostly stop words
    const words = name.toLowerCase().split(/\s+/);
    const nonStopWords = words.filter(word => !this.stopWords.has(word));
    
    if (nonStopWords.length === 0) return false;
    
    // Check for minimum meaningful content
    if (nonStopWords.length < words.length * 0.5) return false;
    
    // Check for obvious non-venue patterns
    const lowerName = name.toLowerCase();
    const badPatterns = [
      /^\d+$/, // Just numbers
      /^[^\w\s]+$/, // Just punctuation
      /\b(today|tomorrow|tonight|pm|am)\b/i, // Time indicators
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i, // Months
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i, // Days
      /^\$\d+/, // Prices
    ];
    
    return !badPatterns.some(pattern => pattern.test(lowerName));
  }

  isLikelyVenue(name, fullText, index) {
    const context = this.extractContext(fullText, index, name.length);
    const contextText = (context.before + ' ' + context.after).toLowerCase();
    
    // Check for venue indicators in context
    const venueIndicators = this.keywords.venueIndicators;
    const hasVenueIndicator = venueIndicators.some(indicator => 
      contextText.includes(indicator)
    );
    
    // Check if it contains common venue types
    const hasVenueType = this.commonVenueTypes.some(type => 
      name.toLowerCase().includes(type)
    );
    
    // Check if it's in a venue-like context position
    const beforeText = context.before.toLowerCase();
    const afterText = context.after.toLowerCase();
    
    const isAfterVenueWord = /\b(at|@|venue|location)\s*$/.test(beforeText);
    const isBeforeLocationWord = /^\s*(in|at|near|downtown)/.test(afterText);
    
    return hasVenueIndicator || hasVenueType || isAfterVenueWord || isBeforeLocationWord;
  }

  calculateStringSimilarity(str1, str2) {
    // Simple Levenshtein distance calculation
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const maxLength = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLength;
  }

  calculateConfidence(patternType, venueName, hasStrongIndicator) {
    let baseConfidence = 0.5;
    
    // Pattern type confidence
    const patternConfidence = {
      atVenue: 0.95,
      venueTypes: 0.9,
      liveAt: 0.85,
      addresses: 0.8,
      fuzzy: 0.85,
      locations: 0.6,
      properNouns: 0.3
    };
    
    baseConfidence = patternConfidence[patternType] || 0.5;
    
    // Strong indicator bonus
    if (hasStrongIndicator) {
      baseConfidence += 0.1;
    }
    
    // Name quality assessment
    const nameQuality = this.assessNameQuality(venueName);
    baseConfidence *= nameQuality;
    
    return Math.max(0, Math.min(1, baseConfidence));
  }

  assessNameQuality(name) {
    let quality = 1.0;
    
    // Length check
    if (name.length < 3) quality -= 0.3;
    if (name.length > 50) quality -= 0.2;
    
    // Word count check
    const words = name.split(/\s+/).filter(word => word.length > 0);
    if (words.length === 1 && words[0].length < 5) quality -= 0.2;
    if (words.length > 6) quality -= 0.1;
    
    // Check for venue type words
    const hasVenueType = this.commonVenueTypes.some(type => 
      name.toLowerCase().includes(type)
    );
    if (hasVenueType) quality += 0.2;
    
    // Check for common venue name patterns
    if (/^The\s+/i.test(name)) quality += 0.1;
    if (/\s+(Hall|Center|Theatre|Theater|Club|Bar)$/i.test(name)) quality += 0.2;
    
    return Math.max(0.1, Math.min(1.5, quality));
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  extractContext(text, index, length) {
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + length + 50);
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
      // Normalize name for comparison
      const normalizedName = match.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const key = `${normalizedName}:${match.type}`;
      
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
      // Sort by confidence first
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Then by type preference (known venues first)
      const typeOrder = { known_venue: 3, venue: 2, address: 1, location: 0, potential_venue: -1 };
      const aOrder = typeOrder[a.type] || 0;
      const bOrder = typeOrder[b.type] || 0;
      
      return bOrder - aOrder;
    });
  }
}

module.exports = { VenueParser };