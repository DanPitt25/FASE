#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Load the main translation files
const loadTranslations = (locale) => {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Extract translation keys from a file's content
const extractTranslationKeys = (content) => {
  const keys = new Set();
  
  // Match useTranslations('namespace') patterns
  const namespaceMatches = content.match(/useTranslations\(['"`]([^'"`]+)['"`]\)/g);
  const namespaces = namespaceMatches ? 
    namespaceMatches.map(match => match.match(/useTranslations\(['"`]([^'"`]+)['"`]\)/)[1]) : [];
  
  // Match t('key.path') patterns
  const keyMatches = content.match(/t\(['"`]([^'"`]+)['"`]\)/g);
  const translationKeys = keyMatches ? 
    keyMatches.map(match => match.match(/t\(['"`]([^'"`]+)['"`]\)/)[1]) : [];
  
  return { namespaces, translationKeys };
};

// Get nested value from object using dot notation
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current && current[key], obj);
};

// Set nested value in object using dot notation
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
};

// Extract relevant translations for a namespace and keys
const extractRelevantTranslations = (translations, namespace, keys) => {
  const result = {};
  
  // Get all translations for the namespace
  const namespaceData = translations[namespace];
  if (!namespaceData) {
    console.warn(`Namespace '${namespace}' not found in translations`);
    return result;
  }
  
  // If no specific keys, include entire namespace
  if (keys.length === 0) {
    result[namespace] = namespaceData;
    return result;
  }
  
  // Extract specific keys
  result[namespace] = {};
  keys.forEach(key => {
    const value = getNestedValue(namespaceData, key);
    if (value !== undefined) {
      setNestedValue(result[namespace], key, value);
    } else {
      console.warn(`Key '${key}' not found in namespace '${namespace}'`);
    }
  });
  
  return result;
};

// Process a single page file
const processPageFile = (filePath) => {
  console.log(`Processing: ${filePath}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  const { namespaces, translationKeys } = extractTranslationKeys(content);
  
  if (namespaces.length === 0) {
    console.log(`  No translations found, skipping...`);
    return;
  }
  
  const pageDir = path.dirname(filePath);
  const locales = ['en', 'fr', 'de', 'it'];
  
  locales.forEach(locale => {
    const translations = loadTranslations(locale);
    let pageTranslations = {};
    
    // For each namespace used in this page
    namespaces.forEach(namespace => {
      // Filter keys that belong to this namespace
      const namespaceKeys = translationKeys.filter(key => 
        key.startsWith(namespace + '.') ? key.substring(namespace.length + 1) : 
        namespaces.length === 1 ? key : false
      ).filter(Boolean);
      
      const extracted = extractRelevantTranslations(translations, namespace, namespaceKeys);
      pageTranslations = { ...pageTranslations, ...extracted };
    });
    
    // Also include common translations (navigation, common, etc.)
    const commonNamespaces = ['common', 'navigation'];
    commonNamespaces.forEach(ns => {
      if (translations[ns]) {
        pageTranslations[ns] = translations[ns];
      }
    });
    
    if (Object.keys(pageTranslations).length > 0) {
      const outputPath = path.join(pageDir, `${locale}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(pageTranslations, null, 2));
      console.log(`  Created: ${outputPath}`);
    }
  });
};

// Main execution
const main = () => {
  console.log('🌍 Splitting translation files page-by-page...\n');
  
  // Find all page.tsx files
  const pageFiles = glob.sync('**/page.tsx', { 
    cwd: path.join(__dirname, '..', 'app'),
    absolute: true 
  });
  
  console.log(`Found ${pageFiles.length} page files\n`);
  
  pageFiles.forEach(processPageFile);
  
  console.log('\n✅ Translation splitting complete!');
  console.log('\nNext steps:');
  console.log('1. Update i18n/request.ts to load page-specific translations');
  console.log('2. Test the application to ensure all translations work');
  console.log('3. Clean up the old monolithic translation files');
};

if (require.main === module) {
  main();
}

module.exports = { extractTranslationKeys, extractRelevantTranslations };