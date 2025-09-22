# Universal Extractor - OCR Integration (Layer 6)

## Overview

The Universal Extractor has been enhanced with OCR-based flyer text extraction as Layer 6. This intelligent layer automatically triggers when confidence from other extraction layers is low (<70%), providing a fallback mechanism to extract event data from flyer-style images.

## Features

### 🔍 **Intelligent Triggering**
- Only runs when overall confidence from Layers 1-5 is below 70%
- Preserves performance by avoiding unnecessary OCR processing
- Configurable confidence threshold

### 🖼️ **Smart Image Selection**
- Automatically identifies flyer-style images based on:
  - Size and aspect ratio
  - Alt text and CSS class indicators  
  - Content relevance scoring
- Processes up to 3 images concurrently
- Filters out logos, icons, and thumbnails

### 🚀 **Concurrent Processing**
- Processes multiple images in parallel for optimal performance
- Individual timeout protection per image (15 seconds default)
- Graceful error handling prevents pipeline failures

### 📖 **Advanced OCR**
- Uses Tesseract.js for high-accuracy text extraction
- Configurable OCR parameters for optimal results
- Pattern matching for event data extraction
- Confidence-based result validation

## Architecture

```
Universal Extractor (6-Layer System)
├── Layer 1: Structured Data (JSON-LD, Microdata, RDFa)
├── Layer 2: Meta Tag Extraction 
├── Layer 3: Semantic HTML Patterns
├── Layer 4: Text Pattern Matching
├── Layer 5: Content Analysis Fallback
└── Layer 6: OCR Flyer Text Extraction ← NEW
    ├── Confidence-based triggering (<70%)
    ├── Smart image selection
    ├── Concurrent OCR processing
    └── Pattern-based data extraction
```

## Configuration

### Basic Configuration

```javascript
const extractor = new UniversalExtractor(page, {
    // OCR Layer configuration
    ocrTriggerThreshold: 70,    // Only run OCR if confidence < 70%
    maxFlyerImages: 3,          // Process up to 3 images concurrently
    ocrTimeout: 15000,          // 15 seconds timeout per image
    
    // Image selection criteria
    minImageSize: { width: 200, height: 150 },
    preferredFormats: ['jpg', 'jpeg', 'png', 'webp'],
    excludeClasses: ['logo', 'icon', 'avatar', 'thumbnail'],
    
    // Debug settings
    debug: true,
    verbose: true
});
```

### Advanced Configuration

```javascript
const extractor = new UniversalExtractor(page, {
    enabledLayers: [1, 2, 3, 4, 5, 6], // Enable all layers including OCR
    
    // OCR-specific options
    ocrTriggerThreshold: 60,            // Lower threshold = more OCR usage
    maxFlyerImages: 5,                  // Process more images
    ocrTimeout: 30000,                  // Longer timeout for complex images
    strictMode: false,                  // Allow non-preferred image formats
    
    // Enhanced image selection
    minImageSize: { width: 300, height: 200 },
    excludeClasses: ['logo', 'icon', 'avatar', 'thumbnail', 'badge'],
    
    // Performance tuning
    layerTimeout: 3000,                 // Longer layer timeout
    
    // Hash app compliance
    enforceHashRequirements: true,
    requireAddressComma: true
});
```

## Usage Examples

### Basic Usage

```javascript
const { UniversalExtractor } = require('./utils/universalExtractor');
const { chromium } = require('playwright');

async function extractEventData() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    await page.goto('https://example.com/event-page');
    
    const extractor = new UniversalExtractor(page, {
        ocrTriggerThreshold: 70,
        debug: true
    });
    
    const results = await extractor.extract();
    
    console.log('Extracted Data:', results.data);
    console.log('Confidence Scores:', results.confidence);
    console.log('Layers Used:', results.metadata.layersUsed);
    console.log('Overall Confidence:', results.metadata.totalConfidence);
    
    await browser.close();
}
```

### OCR-Focused Extraction

```javascript
async function extractWithOCRFocus() {
    const extractor = new UniversalExtractor(page, {
        ocrTriggerThreshold: 90,    // Force OCR usage
        maxFlyerImages: 5,          // Process more images
        verbose: true
    });
    
    const results = await extractor.extract();
    
    // Check if OCR was used
    if (results.metadata.layersUsed.includes(6)) {
        console.log('✅ OCR layer was triggered');
        console.log('OCR Results:', results.layerResults[6]);
    } else {
        console.log('⏭️ OCR layer was skipped (high confidence)');
    }
}
```

## Output Format

The OCR layer extracts the following event data:

```javascript
{
    data: {
        title: "Concert Event Title",           // From flyer text
        date: "2024-12-25T19:00:00.000Z",     // Parsed date
        startTime: "19:00:00",                 // Extracted time
        venue: "Music Hall Downtown",          // Venue name
        address: "123 Main St, City, ST",     // Full address
        description: "Event description...",   // Extracted description
        price: 25.00,                          // Ticket price
        free: false                            // Free event flag
    },
    confidence: {
        title: 72,      // OCR confidence * 0.8
        date: 81,       // OCR confidence * 0.9
        startTime: 77,  // OCR confidence * 0.85
        venue: 68,      // OCR confidence * 0.75
        address: 72,    // OCR confidence * 0.8
        price: 77,      // OCR confidence * 0.85
        free: 81        // OCR confidence * 0.9
    }
}
```

## Performance Characteristics

### Triggering Logic
- **High Confidence (≥70%)**: OCR skipped, ~2-5 seconds total extraction
- **Low Confidence (<70%)**: OCR triggered, ~10-20 seconds additional processing
- **No Images Found**: OCR skipped immediately, minimal overhead

### Processing Speed
- **Single Image**: ~5-15 seconds (depending on complexity)
- **Multiple Images**: ~8-25 seconds (concurrent processing)
- **Timeout Protection**: Max 15 seconds per image

### Resource Usage
- **Memory**: ~50-100MB additional for OCR worker
- **CPU**: Intensive during OCR processing
- **Network**: Downloads images for processing

## Error Handling

The OCR layer includes comprehensive error handling:

### Common Scenarios
```javascript
// OCR initialization failure
results.layerResults[6] = { 
    data: {}, 
    confidence: {}, 
    error: "OCR initialization failed: Missing tesseract.js" 
};

// Image processing timeout
results.layerResults[6] = { 
    data: {}, 
    confidence: {}, 
    error: "OCR timeout after 15000ms" 
};

// Low quality OCR results
results.layerResults[6] = { 
    data: {}, 
    confidence: {}, 
    error: "Low quality OCR result (confidence: 45%, text length: 12)" 
};
```

### Error Recovery
- Failed OCR doesn't break the extraction pipeline
- Falls back to other layers' results
- Provides detailed error information for debugging
- Automatic resource cleanup on failures

## Testing

Run the integration test suite:

```bash
# Install dependencies
npm install

# Run OCR integration tests
npm run test:ocr

# Run all tests
npm test
```

### Test Coverage
- ✅ Layer 6 integration and configuration
- ✅ Confidence-based triggering
- ✅ Concurrent image processing
- ✅ Error handling and timeout protection
- ✅ Resource cleanup
- ✅ Image prioritization logic

## Dependencies

### Required
```json
{
    "tesseract.js": "^5.0.0",
    "chalk": "^4.1.2",
    "playwright": "^1.40.0"
}
```

### Optional
- Node.js 16+ (for optimal performance)
- At least 1GB RAM (for OCR processing)

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ocrTriggerThreshold` | number | 70 | Confidence threshold for OCR triggering |
| `maxFlyerImages` | number | 3 | Maximum images to process concurrently |
| `ocrTimeout` | number | 15000 | Timeout per image (milliseconds) |
| `minImageSize` | object | `{width: 200, height: 150}` | Minimum image dimensions |
| `preferredFormats` | array | `['jpg', 'jpeg', 'png', 'webp']` | Supported image formats |
| `excludeClasses` | array | `['logo', 'icon', 'avatar', 'thumbnail']` | CSS classes to exclude |
| `strictMode` | boolean | false | Only process preferred formats |
| `enablePatternMatching` | boolean | true | Enable text pattern recognition |

## Troubleshooting

### Common Issues

**OCR layer never triggers**
- Check `ocrTriggerThreshold` setting (lower = more triggers)
- Verify other layers aren't providing high confidence
- Enable `debug: true` to see confidence scores

**No images found for OCR**
- Check `minImageSize` requirements
- Verify `excludeClasses` isn't too restrictive
- Look for images with proper alt text or CSS classes

**OCR processing too slow**
- Reduce `maxFlyerImages`
- Lower `ocrTimeout` 
- Use `strictMode: true` for faster image filtering

**Poor OCR accuracy**
- Images may be too small or low quality
- Text may be stylized or artistic
- Consider preprocessing images for better OCR results

### Debug Mode

Enable comprehensive logging:

```javascript
const extractor = new UniversalExtractor(page, {
    debug: true,
    verbose: true,
    ocrTriggerThreshold: 90 // Force OCR for testing
});
```

This will output detailed information about:
- Image selection and scoring
- OCR processing progress
- Text extraction patterns
- Confidence calculations
- Error details

## License

MIT License - see the main project LICENSE file for details.

---

**Note**: OCR processing is computationally intensive and may increase extraction time significantly. The confidence-based triggering system ensures it only runs when necessary, maintaining optimal performance for most use cases.