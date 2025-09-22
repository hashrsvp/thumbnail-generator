/**
 * Text Processor - Preprocesses and cleans OCR text for better parsing
 * Handles OCR artifacts, normalization, and text quality assessment
 */

class TextProcessor {
  constructor(options = {}) {
    this.options = {
      enableSpellCorrection: false,
      enableOCRArtifactCorrection: true,
      preserveOriginal: true,
      ...options
    };
    
    this.ocrCorrections = this.buildOCRCorrections();
    this.commonTypos = this.buildCommonTypos();
    this.textPatterns = this.buildTextPatterns();
  }

  /**
   * Preprocess OCR text for parsing
   * @param {string} text - Raw OCR text
   * @param {Object} context - Additional context
   * @returns {Object} Processed text with metadata
   */
  preprocess(text, context = {}) {
    if (!text || typeof text !== 'string') {
      return {
        original: text || '',
        cleaned: '',
        normalized: '',
        qualityScore: 0,
        issues: ['empty_text'],
        corrections: []
      };
    }

    const result = {
      original: text,
      cleaned: text,
      normalized: '',
      qualityScore: 1.0,
      issues: [],
      corrections: []
    };

    // Step 1: Basic cleaning
    result.cleaned = this.basicClean(result.cleaned);
    
    // Step 2: OCR artifact correction
    if (this.options.enableOCRArtifactCorrection) {
      const correctionResult = this.correctOCRArtifacts(result.cleaned);
      result.cleaned = correctionResult.text;
      result.corrections.push(...correctionResult.corrections);
    }
    
    // Step 3: Text normalization
    result.normalized = this.normalize(result.cleaned);
    
    // Step 4: Quality assessment
    const qualityAssessment = this.assessTextQuality(result.cleaned, result.original);
    result.qualityScore = qualityAssessment.score;
    result.issues.push(...qualityAssessment.issues);
    
    // Step 5: Spell correction (if enabled)
    if (this.options.enableSpellCorrection) {
      const spellResult = this.correctSpelling(result.cleaned);
      result.cleaned = spellResult.text;
      result.corrections.push(...spellResult.corrections);
    }
    
    // Final update
    result.normalized = this.normalize(result.cleaned);
    
    return result;
  }

  buildOCRCorrections() {
    return {
      // Common OCR character substitutions
      characterMap: {
        '0': ['O', 'o', 'Q'],
        '1': ['I', 'l', '|'],
        '2': ['Z'],
        '5': ['S'],
        '6': ['G'],
        '8': ['B'],
        'I': ['1', 'l', '|'],
        'l': ['I', '1', '|'],
        'O': ['0', 'o'],
        'o': ['0', 'O'],
        'S': ['5'],
        'G': ['6'],
        'B': ['8'],
        'Z': ['2']
      },
      
      // Common OCR word corrections
      wordCorrections: {
        'TICKETSS': 'TICKETS',
        'TICKE1S': 'TICKETS',
        'ADMISSI0N': 'ADMISSION',
        'ADMISSI0N': 'ADMISSION',
        'D00RS': 'DOORS',
        'D0ORS': 'DOORS',
        'D0ORS': 'DOORS',
        'SH0W': 'SHOW',
        'SH0W': 'SHOW',
        'C0NCERT': 'CONCERT',
        'C0NCERT': 'CONCERT',
        'PERP0RMANCE': 'PERFORMANCE',
        'PERP0RMANCE': 'PERFORMANCE',
        'EVEN1': 'EVENT',
        'EVEN7': 'EVENT',
        'FRIDA7': 'FRIDAY',
        'FRIDA1': 'FRIDAY',
        'SATURDA1': 'SATURDAY',
        'SATURDA7': 'SATURDAY',
        'SUNDA1': 'SUNDAY',
        'SUNDA7': 'SUNDAY',
        'MONDA1': 'MONDAY',
        'MONDA7': 'MONDAY',
        'TUESDA7': 'TUESDAY',
        'TUESDA1': 'TUESDAY',
        'WEDNESDA7': 'WEDNESDAY',
        'WEDNESDA1': 'WEDNESDAY',
        'THURSDA7': 'THURSDAY',
        'THURSDA1': 'THURSDAY'
      },
      
      // Pattern-based corrections
      patterns: [
        { pattern: /(\d+)([Il1])([Il1])(\d+)/g, replacement: '$1:$4' }, // Time format: 8Il3 -> 8:30
        { pattern: /\$(\d+)([Il1])(\d+)/g, replacement: '$$$1.$3' }, // Price format: $25Il50 -> $25.50
        { pattern: /([Il1])(\d+)([Il1])(\d+)/g, replacement: '$2/$4' }, // Date format: Il15Il25 -> 15/25
        { pattern: /([A-Z])([Il1])([A-Z])/g, replacement: '$1I$3' }, // Middle character in caps
        { pattern: /\b([Il1])([A-Z]{2,})\b/g, replacement: 'I$2' }, // Starting with 1 in caps words
        { pattern: /\b([A-Z]{2,})([Il1])\b/g, replacement: '$1I' }, // Ending with 1 in caps words
      ]
    };
  }

  buildCommonTypos() {
    return {
      // Common event-related typos
      'concret': 'concert',
      'conert': 'concert',
      'perfomance': 'performance',
      'performace': 'performance',
      'admisson': 'admission',
      'admision': 'admission',
      'tikets': 'tickets',
      'tickts': 'tickets',
      'ticets': 'tickets',
      'veune': 'venue',
      'vene': 'venue',
      'locaton': 'location',
      'loction': 'location',
      'staring': 'starting',
      'begining': 'beginning',
      'begining': 'beginning',
      'thearter': 'theater',
      'threatre': 'theatre'
    };
  }

  buildTextPatterns() {
    return {
      // Patterns that indicate good OCR quality
      goodPatterns: [
        /\b\d{1,2}:\d{2}\s*(AM|PM|am|pm)\b/, // Well-formed times
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b/, // Full month names
        /\$\d+(?:\.\d{2})?\b/, // Well-formed prices
        /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/ // Day names
      ],
      
      // Patterns that indicate poor OCR quality
      poorPatterns: [
        /[Il1O0]{3,}/, // Sequences of similar characters
        /[^\w\s.,!?:;'"$%()-]{3,}/, // Unusual character sequences
        /\s{5,}/, // Excessive whitespace
        /[A-Z]{1}[a-z]{1}[A-Z]{1}[a-z]{1}/, // Alternating case patterns
        /\b\w{1,2}\b\s+\b\w{1,2}\b\s+\b\w{1,2}\b/, // Too many short words
      ],
      
      // Spacing issues
      spacingIssues: [
        /[A-Za-z]\d/, // Letter followed by digit without space
        /\d[A-Za-z]/, // Digit followed by letter without space
        /[A-Z][a-z]+[A-Z]/, // CamelCase in middle of words
        /\$\d+[A-Za-z]/, // Price followed by letters
      ]
    };
  }

  basicClean(text) {
    let cleaned = text;
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    // Remove common OCR artifacts
    cleaned = cleaned.replace(/[^\w\s.,!?:;'"$%()-]/g, ' ');
    
    // Fix common spacing issues around punctuation
    cleaned = cleaned.replace(/\s+([.,!?:;])/g, '$1');
    cleaned = cleaned.replace(/([.,!?:;])\s*/g, '$1 ');
    
    // Fix spacing around currency symbols
    cleaned = cleaned.replace(/\$\s+(\d)/g, '$$$1');
    cleaned = cleaned.replace(/(\d)\s+\$([^$\d])/g, '$1$ $2');
    
    // Fix spacing in times
    cleaned = cleaned.replace(/(\d+)\s*:\s*(\d+)/g, '$1:$2');
    
    // Remove excessive punctuation
    cleaned = cleaned.replace(/[.,!?:;]{2,}/g, '.');
    
    // Final cleanup
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  correctOCRArtifacts(text) {
    let corrected = text;
    const corrections = [];
    
    // Apply word-level corrections
    for (const [wrong, right] of Object.entries(this.ocrCorrections.wordCorrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      if (regex.test(corrected)) {
        corrected = corrected.replace(regex, right);
        corrections.push({
          type: 'word_correction',
          original: wrong,
          corrected: right,
          pattern: 'word_substitution'
        });
      }
    }
    
    // Apply pattern-based corrections
    for (const correction of this.ocrCorrections.patterns) {
      if (correction.pattern.test(corrected)) {
        const originalText = corrected;
        corrected = corrected.replace(correction.pattern, correction.replacement);
        if (originalText !== corrected) {
          corrections.push({
            type: 'pattern_correction',
            pattern: correction.pattern.toString(),
            replacement: correction.replacement,
            before: originalText,
            after: corrected
          });
        }
      }
    }
    
    // Apply character-level corrections in context
    corrected = this.correctCharactersInContext(corrected, corrections);
    
    return { text: corrected, corrections };
  }

  correctCharactersInContext(text, corrections) {
    let corrected = text;
    
    // Correct numbers in time contexts: 8Il5 PM -> 8:15 PM
    corrected = corrected.replace(/(\d+)([Il1])([Il1])(\d+)\s*(AM|PM|am|pm)/g, '$1:$4 $5');
    
    // Correct numbers in price contexts: $Il5 -> $15
    corrected = corrected.replace(/\$([Il1])(\d+)/g, '$1$2');
    corrected = corrected.replace(/\$(\d+)([Il1])/g, '$$$1$2');
    
    // Correct O/0 in prices: $2O -> $20
    corrected = corrected.replace(/\$(\d+)([O])(\d*)/g, '$$$10$3');
    
    // Correct common date patterns: Il/15 -> 1/15
    corrected = corrected.replace(/\b([Il1])(\/)(\d+)/g, '1$2$3');
    corrected = corrected.replace(/\b(\d+)(\/)([Il1])/g, '$1$21');
    
    // Correct AM/PM: AII -> AM, PII -> PM
    corrected = corrected.replace(/\bA[Il1]{1,2}\b/g, 'AM');
    corrected = corrected.replace(/\bP[Il1]{1,2}\b/g, 'PM');
    
    return corrected;
  }

  normalize(text) {
    let normalized = text;
    
    // Convert to consistent case for common words
    normalized = normalized.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
    normalized = normalized.replace(/\b(free|Free|FREE)\b/g, 'FREE');
    
    // Normalize common abbreviations
    const abbreviations = {
      'St.': 'Street',
      'Ave.': 'Avenue',
      'Rd.': 'Road',
      'Blvd.': 'Boulevard',
      'Jan.': 'January',
      'Feb.': 'February',
      'Mar.': 'March',
      'Apr.': 'April',
      'Jun.': 'June',
      'Jul.': 'July',
      'Aug.': 'August',
      'Sep.': 'September',
      'Sept.': 'September',
      'Oct.': 'October',
      'Nov.': 'November',
      'Dec.': 'December'
    };
    
    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr.replace('.', '\\.')}`, 'gi');
      normalized = normalized.replace(regex, full);
    }
    
    // Normalize spacing
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  assessTextQuality(text, originalText) {
    const assessment = {
      score: 1.0,
      issues: []
    };
    
    if (!text || text.length === 0) {
      assessment.score = 0;
      assessment.issues.push('empty_text');
      return assessment;
    }
    
    // Check for good patterns
    let goodPatternCount = 0;
    for (const pattern of this.textPatterns.goodPatterns) {
      if (pattern.test(text)) {
        goodPatternCount++;
      }
    }
    
    // Check for poor patterns
    let poorPatternCount = 0;
    for (const pattern of this.textPatterns.poorPatterns) {
      if (pattern.test(text)) {
        poorPatternCount++;
      }
    }
    
    // Check for spacing issues
    let spacingIssueCount = 0;
    for (const pattern of this.textPatterns.spacingIssues) {
      if (pattern.test(text)) {
        spacingIssueCount++;
      }
    }
    
    // Calculate quality score
    const goodPatternBonus = Math.min(0.3, goodPatternCount * 0.1);
    const poorPatternPenalty = Math.min(0.4, poorPatternCount * 0.1);
    const spacingPenalty = Math.min(0.3, spacingIssueCount * 0.05);
    
    assessment.score = Math.max(0.1, 1.0 + goodPatternBonus - poorPatternPenalty - spacingPenalty);
    
    // Identify specific issues
    if (goodPatternCount === 0) {
      assessment.issues.push('no_recognizable_patterns');
    }
    
    if (poorPatternCount > 0) {
      assessment.issues.push('ocr_artifacts_detected');
    }
    
    if (spacingIssueCount > 0) {
      assessment.issues.push('spacing_issues');
    }
    
    // Check text length
    if (text.length < 10) {
      assessment.issues.push('very_short_text');
      assessment.score *= 0.8;
    }
    
    if (text.length > 1000) {
      assessment.issues.push('very_long_text');
      assessment.score *= 0.9;
    }
    
    // Check character diversity
    const uniqueChars = new Set(text.toLowerCase()).size;
    const totalChars = text.length;
    const diversity = uniqueChars / totalChars;
    
    if (diversity < 0.1) {
      assessment.issues.push('low_character_diversity');
      assessment.score *= 0.7;
    }
    
    // Check for reasonable word length distribution
    const words = text.split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    
    if (avgWordLength < 2) {
      assessment.issues.push('unusually_short_words');
      assessment.score *= 0.8;
    }
    
    if (avgWordLength > 15) {
      assessment.issues.push('unusually_long_words');
      assessment.score *= 0.8;
    }
    
    // Check for mixed content (good sign)
    const hasNumbers = /\d/.test(text);
    const hasLetters = /[a-zA-Z]/.test(text);
    const hasCurrency = /\$/.test(text);
    const hasTimes = /\d+:\d+/.test(text);
    
    if (hasNumbers && hasLetters && (hasCurrency || hasTimes)) {
      assessment.score *= 1.1; // Bonus for mixed content typical of event info
    }
    
    return assessment;
  }

  correctSpelling(text) {
    let corrected = text;
    const corrections = [];
    
    // Apply common typo corrections
    const words = text.split(/\s+/);
    const correctedWords = words.map(word => {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (this.commonTypos[cleanWord]) {
        corrections.push({
          type: 'spelling_correction',
          original: word,
          corrected: this.commonTypos[cleanWord]
        });
        return word.replace(new RegExp(cleanWord, 'i'), this.commonTypos[cleanWord]);
      }
      return word;
    });
    
    corrected = correctedWords.join(' ');
    
    return { text: corrected, corrections };
  }

  /**
   * Extract key phrases that are likely to contain event information
   * @param {string} text - Processed text
   * @returns {Array} Array of key phrases
   */
  extractKeyPhrases(text) {
    const phrases = [];
    
    // Time-related phrases
    const timeMatches = text.match(/\b\d{1,2}:?\d{0,2}\s*(AM|PM|am|pm)\b[^.!?]*[.!?]?/g);
    if (timeMatches) {
      phrases.push(...timeMatches.map(match => ({ type: 'time', phrase: match.trim() })));
    }
    
    // Date-related phrases
    const dateMatches = text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{1,2})[^.!?]*[.!?]?/gi);
    if (dateMatches) {
      phrases.push(...dateMatches.map(match => ({ type: 'date', phrase: match.trim() })));
    }
    
    // Price-related phrases
    const priceMatches = text.match(/\$\d+[^.!?]*[.!?]?|free[^.!?]*[.!?]?/gi);
    if (priceMatches) {
      phrases.push(...priceMatches.map(match => ({ type: 'price', phrase: match.trim() })));
    }
    
    // Venue-related phrases
    const venueMatches = text.match(/\b(?:at|@|venue|location)[^.!?]*[.!?]?/gi);
    if (venueMatches) {
      phrases.push(...venueMatches.map(match => ({ type: 'venue', phrase: match.trim() })));
    }
    
    return phrases;
  }
}

module.exports = { TextProcessor };