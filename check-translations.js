const fs = require('fs');
const path = require('path');

// Load translation files
const translationsDir = './app/member-portal/translations';
const languages = ['en', 'fr', 'de'];

// Files to scan for translation keys
const filesToScan = [
  './app/member-portal/member-content.tsx',
  './components/ManageProfile.tsx'
];

function loadTranslations(lang) {
  const filePath = path.join(translationsDir, `${lang}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${lang}.json:`, error.message);
    return null;
  }
}

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const currentKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], currentKey));
    } else {
      keys.push(currentKey);
    }
  }
  return keys;
}

function extractTranslationKeys(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const keys = new Set();
    
    // Match t('key') and t("key") patterns
    const simpleMatches = content.match(/t\(['"`]([^'"`]+)['"`]\)/g) || [];
    simpleMatches.forEach(match => {
      const key = match.match(/t\(['"`]([^'"`]+)['"`]\)/)[1];
      keys.add(key);
    });
    
    // Match t(`template.${variable}`) patterns - properly handle dynamic templates
    const templateMatches = content.match(/t\(`([^`]+)`/g) || [];
    templateMatches.forEach(match => {
      const template = match.match(/t\(`([^`]+)`/)[1];
      // Mark as dynamic template for later validation
      if (template.includes('${')) {
        keys.add(`DYNAMIC:${template}`);
      } else {
        keys.add(template);
      }
    });
    
    // Match t('key', { interpolations }) patterns
    const interpolationMatches = content.match(/t\(['"`]([^'"`]+)['"`]\s*,\s*{[^}]+}\)/g) || [];
    interpolationMatches.forEach(match => {
      const key = match.match(/t\(['"`]([^'"`]+)['"`]/)[1];
      keys.add(key);
    });
    
    return Array.from(keys);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function findHardcodedStrings(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const hardcodedStrings = [];
    
    // Remove all t() calls to avoid false positives
    const contentWithoutTranslations = content.replace(/t\(['"`][^'"`]*['"`](?:\s*,\s*{[^}]*})?\)/g, 'TRANSLATION_REMOVED');
    
    // Common patterns for hardcoded user-facing strings
    const patterns = [
      // String literals in quotes (most common pattern)
      /['"`]([A-Z][a-zA-Z\s\.]{2,})['"`]/g,
      // JSX text content (not in t() calls)
      />[^<{]*[A-Z][a-zA-Z\s]{3,}[^<{]*</g,
      // String literals in common UI patterns
      /(?:placeholder|title|label|aria-label)=['"`]([A-Z][a-zA-Z\s]{3,})['"`]/g,
      // Alert/console messages
      /(?:alert|console\.log)\(['"`]([A-Z][a-zA-Z\s]{3,})['"`]/g,
    ];
    
    patterns.forEach((pattern, patternIndex) => {
      let match;
      pattern.lastIndex = 0; // Reset regex state
      while ((match = pattern.exec(contentWithoutTranslations)) !== null) {
        let text = match[1] || match[0];
        text = text.replace(/[<>{}]/g, '').trim();
        
        // Filter out technical strings, variables, etc.
        if (text.length > 2 && 
            text.match(/^[A-Z]/) && 
            !text.match(/^(className|onClick|onChange|onSubmit|useState|useEffect|import|export|const|let|var|function|return|if|else|for|while|switch|case|break|continue|try|catch|finally|throw|new|this|super|class|extends|implements|interface|type|enum|namespace|module|declare|async|await|yield|typeof|instanceof|in|of|delete|void|null|undefined|true|false|NaN|Infinity|document|window|console|JSON|Object|Array|String|Number|Boolean|Date|RegExp|Error|Math|Promise|Symbol|Map|Set|WeakMap|WeakSet|Proxy|Reflect|parseInt|parseFloat|isNaN|isFinite|encodeURI|decodeURI|encodeURIComponent|decodeURIComponent|escape|unescape|eval|EditingMember|Member|CompanyInfo|TRANSLATION_REMOVED)$/) &&
            !text.match(/\$\{/) &&
            !text.match(/^[A-Z_]+$/) && // ALL_CAPS constants
            !text.includes('(') &&
            !text.includes(')') &&
            !text.includes('\\') &&
            !text.includes('/') &&
            !text.includes('@') &&
            !text.includes('http') &&
            !text.includes('www') &&
            !text.includes('.com') &&
            !text.includes('.org') &&
            !text.includes('FirebaseError') &&
            !text.includes('Error') &&
            text.match(/[a-z]/) && // Has lowercase letters
            text.split(' ').length <= 10) { // Not too long
          
          // Additional filtering for common false positives
          const falsePositives = [
            'Bearer', 'Content-Type', 'Authorization', 'Accept', 'User-Agent',
            'POST', 'GET', 'PUT', 'DELETE', 'PATCH',
            'Firebase', 'Firestore', 'Auth', 'Storage',
            'React', 'Next', 'Vercel', 'Node',
            'TypeScript', 'JavaScript', 'JSON',
            'boolean', 'string', 'number', 'object', 'undefined',
            'Interface', 'Type', 'Props', 'State',
            'Component', 'Hook', 'Context', 'Provider'
          ];
          
          if (!falsePositives.includes(text)) {
            hardcodedStrings.push(text);
          }
        }
      }
    });
    
    return [...new Set(hardcodedStrings)];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return [];
  }
}

function validateDynamicTemplates(dynamicKeys, translations) {
  const issues = [];
  
  dynamicKeys.forEach(key => {
    const template = key.replace('DYNAMIC:', '');
    const parts = template.split('${');
    const basePart = parts[0];
    
    if (basePart.endsWith('.')) {
      // Check if the expected dynamic keys exist
      const expectedKeys = [];
      
      if (basePart.includes('priority')) {
        expectedKeys.push(basePart + 'high', basePart + 'medium', basePart + 'low');
        if (basePart.includes('alerts')) {
          expectedKeys.push(basePart + 'urgent');
        }
      }
      
      if (basePart.includes('types')) {
        expectedKeys.push(basePart + 'error', basePart + 'warning', basePart + 'success', basePart + 'info');
      }
      
      expectedKeys.forEach(expectedKey => {
        if (!translations.has(expectedKey)) {
          issues.push(`Missing dynamic key: ${expectedKey} (from template: ${template})`);
        }
      });
    }
  });
  
  return issues;
}

function checkTranslationCoverage() {
  console.log('🔍 Checking Member Portal Translation Coverage\n');
  
  const translations = {};
  const allKeys = new Set();
  
  // Load all translations and collect keys
  for (const lang of languages) {
    translations[lang] = loadTranslations(lang);
    if (translations[lang]) {
      const keys = getAllKeys(translations[lang]);
      keys.forEach(key => allKeys.add(key));
      console.log(`📁 ${lang.toUpperCase()}: ${keys.length} keys loaded`);
    }
  }
  
  console.log(`\n📊 Total unique keys: ${allKeys.size}\n`);
  
  // Check coverage
  const missingKeys = {};
  languages.forEach(lang => missingKeys[lang] = []);
  
  for (const key of allKeys) {
    for (const lang of languages) {
      if (!translations[lang]) continue;
      
      const keyParts = key.split('.');
      let current = translations[lang];
      let missing = false;
      
      for (const part of keyParts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          missing = true;
          break;
        }
      }
      
      if (missing) {
        missingKeys[lang].push(key);
      }
    }
  }
  
  // Report results
  let allComplete = true;
  for (const lang of languages) {
    if (missingKeys[lang].length > 0) {
      allComplete = false;
      console.log(`❌ ${lang.toUpperCase()} missing ${missingKeys[lang].length} keys:`);
      missingKeys[lang].forEach(key => console.log(`   - ${key}`));
      console.log();
    } else {
      console.log(`✅ ${lang.toUpperCase()}: Complete (${allKeys.size}/${allKeys.size} keys)`);
    }
  }
  
  if (allComplete) {
    console.log('\n🎉 All languages have complete translation coverage!');
  } else {
    console.log('\n⚠️  Some translations are missing. Please add the missing keys.');
  }
  
  // Check if all keys used in code exist in translations
  console.log('\n🔍 Checking if code keys exist in translations...\n');
  
  const usedKeys = new Set();
  const dynamicKeys = [];
  const allHardcodedStrings = [];
  
  for (const filePath of filesToScan) {
    console.log(`📄 Scanning ${filePath}...`);
    const keys = extractTranslationKeys(filePath);
    const hardcoded = findHardcodedStrings(filePath);
    
    console.log(`   Found ${keys.length} translation keys`);
    if (hardcoded.length > 0) {
      console.log(`   Found ${hardcoded.length} potential hardcoded strings`);
      allHardcodedStrings.push(...hardcoded.map(s => ({ file: filePath, string: s })));
    }
    
    keys.forEach(key => {
      if (key.startsWith('DYNAMIC:')) {
        dynamicKeys.push(key);
      } else {
        usedKeys.add(key);
      }
    });
  }
  
  console.log(`\n📊 Total keys used in code: ${usedKeys.size}`);
  console.log(`📊 Dynamic templates found: ${dynamicKeys.length}`);
  
  const enKeys = new Set(getAllKeys(translations.en || {}));
  
  // Check regular keys (exclude dynamic template raw strings)
  const missingInTranslations = [...usedKeys].filter(key => 
    !enKeys.has(key) && !key.includes('${')
  );
  const unusedInTranslations = [...enKeys].filter(key => !usedKeys.has(key));
  
  // Validate dynamic templates
  const dynamicIssues = validateDynamicTemplates(dynamicKeys, enKeys);
  
  // Report results
  if (missingInTranslations.length > 0) {
    console.log(`\n❌ Keys used in code but missing in translations (${missingInTranslations.length}):`);
    missingInTranslations.forEach(key => console.log(`   - ${key}`));
  } else {
    console.log(`\n✅ All code keys exist in translations!`);
  }
  
  if (dynamicIssues.length > 0) {
    console.log(`\n❌ Dynamic template issues (${dynamicIssues.length}):`);
    dynamicIssues.forEach(issue => console.log(`   - ${issue}`));
  } else if (dynamicKeys.length > 0) {
    console.log(`\n✅ All dynamic templates have required keys!`);
  }
  
  if (allHardcodedStrings.length > 0) {
    console.log(`\n⚠️  Potential hardcoded strings that should be translated (${allHardcodedStrings.length}):`);
    allHardcodedStrings.forEach(({ file, string }) => {
      console.log(`   - "${string}" in ${file.split('/').pop()}`);
    });
  } else {
    console.log(`\n✅ No hardcoded strings detected!`);
  }
  
  if (unusedInTranslations.length > 0) {
    console.log(`\n🔍 Keys in translations but not used in code (${unusedInTranslations.length}):`);
    unusedInTranslations.forEach(key => console.log(`   + ${key}`));
  }
  
  const hasIssues = missingInTranslations.length > 0 || dynamicIssues.length > 0 || allHardcodedStrings.length > 0;
  
  if (!hasIssues && allComplete) {
    console.log('\n🎊 Perfect! All translations are complete and all code keys are covered!');
  } else if (hasIssues) {
    console.log('\n⚠️  There are translation issues that need to be addressed.');
  }
}

checkTranslationCoverage();