# Universal Scraper Testing Framework - Quick Start

Get up and running with the comprehensive testing framework in under 5 minutes.

## ⚡ 1-Minute Setup

```bash
# Navigate to the tests directory
cd /Users/user/Desktop/hash/scripts/scraper/tests

# Install dependencies
npm install

# Validate setup
npm run validate
```

## 🚀 First Test Run

```bash
# Run quick test (5 venues, ~2-3 minutes)
npm run test:quick
```

This will:
- Test 5 representative venues from different categories
- Validate Hash app requirements  
- Generate detailed reports
- Show performance metrics

## 📊 Understanding Results

### Console Output
```
🧪 Universal Event Scraper Test Framework
==================================================

📂 Testing MUSIC venues (2 venues)

🏪 Testing: The Fillmore
   ✓ PASS
     Confidence: 87% | Validation: 100% | Category: 100%
     Duration: 3247ms | Layers: 4/5
```

### Status Indicators
- **✓ PASS**: All requirements met ✅
- **✓ PARTIAL**: Usable but incomplete data ⚠️  
- **❌ FAIL**: Unable to extract data ❌

### Key Metrics
- **Confidence**: Overall extraction accuracy (0-100%)
- **Validation**: Hash app requirements passed (%)
- **Category**: Category mapping accuracy (%)
- **Duration**: Time to scrape venue (ms)
- **Layers**: Successful extraction layers (n/5)

## 🎯 Next Steps

### Run More Tests
```bash
# Test specific venue type
npm run test:music
npm run test:nightclubs

# Full comprehensive test (all venues)
npm run test:comprehensive

# Performance benchmarking
npm run test:performance
```

### Debug Issues
```bash
# Interactive debugging
npm run debug

# Debug specific venue
npm run debug:url "https://venue-website.com"

# Verbose testing with browser visible
npm run test:debug
```

### View Reports

Reports are saved to `./results/`:
- `test-report-[timestamp].json` - Detailed data
- `test-report-[timestamp].html` - Interactive dashboard

## 🔧 Common Issues & Solutions

### ❌ Browser not launching
```bash
# Install Playwright browsers
npx playwright install chromium
```

### ❌ Timeout errors
```bash
# Increase timeout for slow sites
node runTests.js quick --timeout 60000
```

### ❌ Category mismatches
- Check if venue has changed its event types
- Review category keywords in `../utils/categoryMapper.js`

### ❌ Address validation fails
- Hash app requires addresses with commas
- Check if venue provides proper address format

## 📱 Hash App Requirements

The tests validate these Hash-specific requirements:

✅ **Address Format**: Must contain comma  
✅ **Categories**: From valid list only  
✅ **Date Format**: ISO format (YYYY-MM-DDTHH:mm:ss)  
✅ **Time Format**: HH:mm:ss  
✅ **Required Fields**: Title, address, date  
✅ **Category Limits**: Maximum 2 categories  

## 🏆 Success Targets

| Metric | Excellent | Good | Needs Work |
|--------|-----------|------|------------|
| Success Rate | >90% | >75% | <75% |
| Avg Time | <5s | <10s | >10s |
| Category Accuracy | >95% | >85% | <85% |

## 🛠️ Available Commands

### Testing
- `npm run test:quick` - Quick validation (5 venues)
- `npm run test:comprehensive` - All venues (~20min)
- `npm run test:performance` - Speed benchmarks
- `npm run test:music` - Music venues only
- `npm run test:venue "Venue Name"` - Single venue

### Debugging  
- `npm run debug` - Interactive debugging
- `npm run debug:url <URL>` - Debug specific URL
- `npm run test:debug` - Verbose test with browser

### Validation
- `npm run validate` - Check framework setup
- `npm run validate:connectivity` - Test internet connection

### Help
- `npm run help` - Show all scenarios

## 📞 Need Help?

1. **Check setup**: `npm run validate`
2. **View detailed logs**: Add `--verbose` to any command
3. **Debug interactively**: `npm run debug`  
4. **Check reports**: Look in `./results/` directory

---

**Ready to test?** Start with `npm run test:quick` and you'll have results in under 3 minutes! 🚀