#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Helper function to recursively get all keys from a nested object
const getAllKeys = (obj, prefix = '') => {
  const keys = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys.push(...getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
};

// Load and merge all new translation files for a locale
const loadNewTranslations = (locale) => {
  const localeDir = path.join(__dirname, '..', 'messages', locale);
  
  if (!fs.existsSync(localeDir)) {
    console.error(`❌ New translation directory not found: ${localeDir}`);
    return {};
  }
  
  const mergedTranslations = {};
  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const filePath = path.join(localeDir, file);
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge into the main object
    Object.assign(mergedTranslations, fileContent);
  });
  
  return mergedTranslations;
};

// This function is no longer needed - we deleted the original files
// We now use English organized files as the baseline

// Compare translations against English baseline
const compareTranslations = (locale) => {
  console.log(`\n🔍 Verifying ${locale.toUpperCase()} translations...`);
  
  // Use English as baseline instead of old master files
  const baselineTranslations = loadNewTranslations('en');
  const currentTranslations = loadNewTranslations(locale);
  
  const baselineKeys = new Set(getAllKeys(baselineTranslations));
  const currentKeys = new Set(getAllKeys(currentTranslations));
  
  console.log(`  📊 Baseline (EN) keys: ${baselineKeys.size}`);
  console.log(`  📊 Current (${locale.toUpperCase()}) keys: ${currentKeys.size}`);
  
  // Find missing keys (in baseline but not in current)
  const missingKeys = [...baselineKeys].filter(key => !currentKeys.has(key));
  
  // Find extra keys (in current but not in baseline)
  const extraKeys = [...currentKeys].filter(key => !baselineKeys.has(key));
  
  // Check for value differences (skip for non-English locales)
  const modifiedKeys = [];
  if (locale === 'en') {
    [...baselineKeys].filter(key => currentKeys.has(key)).forEach(key => {
      const baselineValue = getNestedValue(baselineTranslations, key);
      const currentValue = getNestedValue(currentTranslations, key);
    
      if (JSON.stringify(baselineValue) !== JSON.stringify(currentValue)) {
        modifiedKeys.push({
          key,
          baseline: baselineValue,
          current: currentValue
        });
      }
    });
  }
  
  // Report results  
  if (missingKeys.length === 0) {
    console.log(`  ✅ Complete translation coverage!`);
    if (extraKeys.length > 0) {
      console.log(`  ℹ️  Has ${extraKeys.length} extra keys (this is fine)`);
    }
    return true;
  } else {
    if (missingKeys.length > 0) {
      console.log(`  ❌ Missing keys (${missingKeys.length}):`);
      missingKeys.slice(0, 10).forEach(key => console.log(`    - ${key}`));
      if (missingKeys.length > 10) {
        console.log(`    ... and ${missingKeys.length - 10} more`);
      }
    }
    
    // Don't show extra keys as errors in detailed view - they're handled above
    
    if (modifiedKeys.length > 0) {
      console.log(`  🔄 Value differences (${modifiedKeys.length}):`);
      modifiedKeys.slice(0, 5).forEach(({ key, baseline, current }) => {
        console.log(`    ~ ${key}`);
        console.log(`      Baseline: ${JSON.stringify(baseline)}`);
        console.log(`      Current: ${JSON.stringify(current)}`);
      });
      if (modifiedKeys.length > 5) {
        console.log(`    ... and ${modifiedKeys.length - 5} more`);
      }
    }
    
    return false;
  }
};

// Helper to get nested value using dot notation
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current && current[key], obj);
};

// Show detailed breakdown of where keys ended up
const showKeyDistribution = (locale) => {
  console.log(`\n📋 Key distribution for ${locale.toUpperCase()}:`);
  
  const localeDir = path.join(__dirname, '..', 'messages', locale);
  const files = fs.readdirSync(localeDir).filter(file => file.endsWith('.json'));
  
  files.forEach(file => {
    const filePath = path.join(localeDir, file);
    const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const keys = getAllKeys(fileContent);
    const namespaces = Object.keys(fileContent);
    
    console.log(`  📄 ${file}:`);
    console.log(`    Namespaces: ${namespaces.join(', ')}`);
    console.log(`    Total keys: ${keys.length}`);
    
    // Show size
    const sizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log(`    Size: ${sizeKB}KB`);
  });
};

// Find hardcoded strings that should be translated
const checkForHardcodedStrings = () => {
  const appFiles = [];
  const findTsxFiles = (dir) => {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    files.forEach(file => {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        findTsxFiles(fullPath);
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        appFiles.push(fullPath);
      }
    });
  };
  
  findTsxFiles(path.join(__dirname, '..', 'app'));
  findTsxFiles(path.join(__dirname, '..', 'components'));
  
  console.log(`📄 Scanning ${appFiles.length} TypeScript/TSX files for hardcoded strings...\n`);
  
  const allHardcodedStrings = [];
  
  appFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Skip files that clearly don't contain user-facing content
      if (filePath.includes('node_modules') || filePath.includes('.next') || 
          content.includes('use server') || content.includes('api/')) {
        return;
      }
      
      const hardcodedStrings = findHardcodedStrings(filePath);
      if (hardcodedStrings.length > 0) {
        allHardcodedStrings.push({
          file: filePath.replace(__dirname + '/../', ''),
          strings: hardcodedStrings
        });
      }
    } catch (error) {
      // Skip files we can't read
    }
  });
  
  if (allHardcodedStrings.length > 0) {
    console.log(`❌ Found hardcoded strings that should be translated:\n`);
    allHardcodedStrings.forEach(({ file, strings }) => {
      console.log(`📄 ${file}:`);
      strings.forEach(string => {
        console.log(`   - "${string}"`);
      });
      console.log('');
    });
  } else {
    console.log(`✅ No obvious hardcoded strings found!`);
  }
  
  return allHardcodedStrings.length === 0;
};

// Main verification function
const main = () => {
  console.log('🔍 Translation Verification Report');
  console.log('=====================================');
  
  // First check if all languages have complete coverage
  console.log('📋 Checking translation coverage...\n');
  const locales = ['fr', 'de', 'es', 'it', 'nl'];
  const results = {};
  
  locales.forEach(locale => {
    results[locale] = compareTranslations(locale);
  });
  
  // Most importantly - scan for hardcoded strings in actual site files
  console.log('\n🔍 Scanning for hardcoded strings in site files...\n');
  const noHardcodedStrings = checkForHardcodedStrings();
  
  const allTranslationsComplete = Object.values(results).every(result => result);
  
  console.log('\n📊 Summary:');
  console.log('===========');
  
  if (allTranslationsComplete && noHardcodedStrings) {
    console.log('✅ All translations are complete!');
    console.log('✅ No hardcoded strings found that need translation!');
    console.log('🎉 Site is fully localized!');
  } else {
    if (!allTranslationsComplete) {
      console.log('❌ Some languages are missing translation keys');
    }
    if (!noHardcodedStrings) {
      console.log('❌ Found hardcoded strings that should be translated');
    }
    console.log('⚠️  Please fix the issues above');
  }
  
  console.log('\nRecommended next steps:');
  console.log('1. Fix any hardcoded strings by adding proper translation keys');
  console.log('2. Add missing translation keys to incomplete languages');
  console.log('3. Test the application in all languages');
  
  return allTranslationsComplete && noHardcodedStrings;
};

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { compareTranslations, getAllKeys };