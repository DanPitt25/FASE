#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Define the new organization structure
const translationGroups = {
  // Core/shared translations
  'messages/core.json': [
    'common',
    'navigation',
    'errors'
  ],
  
  // Authentication & user management
  'messages/auth.json': [
    'login_form',
    'register_form', 
    'verification',
    'register',
    'invite'
  ],
  
  // Main pages
  'messages/pages.json': [
    'about',
    'mission',
    'leadership',
    'contact',
    'directory',
    'search',
    'sponsors',
    'events',
    'rendezvous'
  ],
  
  // Member-related content
  'messages/member.json': [
    'member_portal',
    'manage_profile',
    'member_directory',
    'apply_membership'
  ],
  
  // Knowledge & learning
  'messages/knowledge.json': [
    'knowledge_base',
    'webinars',
    'entrepreneurial_underwriter'
  ],
  
  // Business features
  'messages/business.json': [
    'industry_advocacy',
    'market_intelligence', 
    'capacity_transparency',
    'sponsorship'
  ],
  
  // News & content
  'messages/content.json': [
    'news',
    'article'
  ],
  
  // Admin & management
  'messages/admin.json': [
    'admin_portal',
    'manage_members',
    'billing'
  ]
};

const loadTranslations = (locale) => {
  const filePath = path.join(__dirname, '..', 'messages', `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Translation file not found: ${filePath}`);
    return {};
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const createGroupedTranslations = (locale) => {
  console.log(`\n📋 Processing ${locale.toUpperCase()} translations...`);
  
  const allTranslations = loadTranslations(locale);
  const usedKeys = new Set();
  
  Object.entries(translationGroups).forEach(([outputFile, keys]) => {
    const groupedTranslations = {};
    let foundKeys = 0;
    
    keys.forEach(key => {
      if (allTranslations[key]) {
        groupedTranslations[key] = allTranslations[key];
        usedKeys.add(key);
        foundKeys++;
      }
    });
    
    if (foundKeys > 0) {
      const filePath = outputFile.replace('messages/', `messages/${locale}/`);
      const dir = path.dirname(filePath);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(groupedTranslations, null, 2));
      console.log(`  ✅ ${path.basename(filePath)}: ${foundKeys} namespaces`);
    }
  });
  
  // Create a file with any unused keys
  const unusedTranslations = {};
  Object.keys(allTranslations).forEach(key => {
    if (!usedKeys.has(key)) {
      unusedTranslations[key] = allTranslations[key];
    }
  });
  
  if (Object.keys(unusedTranslations).length > 0) {
    const unusedFile = path.join(__dirname, '..', 'messages', locale, 'other.json');
    fs.writeFileSync(unusedFile, JSON.stringify(unusedTranslations, null, 2));
    console.log(`  ⚠️  other.json: ${Object.keys(unusedTranslations).length} unused namespaces`);
  }
  
  console.log(`  📊 Total: ${Object.keys(allTranslations).length} namespaces processed`);
};

const updateI18nConfig = () => {
  const configContent = `import {getRequestConfig} from 'next-intl/server';

// Helper to merge multiple translation files
const mergeTranslations = async (locale: string, files: string[]) => {
  const translations = {};
  
  for (const file of files) {
    try {
      const fileTranslations = (await import(\`../messages/\${locale}/\${file}.json\`)).default;
      Object.assign(translations, fileTranslations);
    } catch (error) {
      console.warn(\`Could not load \${locale}/\${file}.json\`);
    }
  }
  
  return translations;
};

export default getRequestConfig(async () => {
  // Provide a static locale for static exports
  const locale = 'en';
  
  // Load all translation files for better organization
  const translationFiles = [
    'core',      // common, navigation, errors
    'auth',      // login, register, verification 
    'pages',     // about, mission, contact, etc.
    'member',    // member portal related
    'knowledge', // knowledge base, webinars
    'business',  // industry features
    'content',   // news, articles
    'admin',     // admin panel
    'other'      // any remaining translations
  ];
  
  const messages = await mergeTranslations(locale, translationFiles);
 
  return {
    locale,
    messages
  };
});`;

  const configPath = path.join(__dirname, '..', 'i18n', 'request.ts');
  fs.writeFileSync(configPath, configContent);
  console.log('\n🔧 Updated i18n/request.ts configuration');
};

const showSizeComparison = () => {
  console.log('\n📏 File size comparison:');
  
  const locales = ['en', 'fr', 'de', 'it'];
  
  locales.forEach(locale => {
    const oldFile = path.join(__dirname, '..', 'messages', `${locale}.json`);
    const newDir = path.join(__dirname, '..', 'messages', locale);
    
    if (fs.existsSync(oldFile)) {
      const oldSize = fs.statSync(oldFile).size;
      console.log(`\n  ${locale.toUpperCase()}:`);
      console.log(`    Old: ${(oldSize / 1024).toFixed(1)}KB (single file)`);
      
      if (fs.existsSync(newDir)) {
        const newFiles = fs.readdirSync(newDir);
        let totalNewSize = 0;
        
        newFiles.forEach(file => {
          const filePath = path.join(newDir, file);
          const size = fs.statSync(filePath).size;
          totalNewSize += size;
          console.log(`    ${file}: ${(size / 1024).toFixed(1)}KB`);
        });
        
        console.log(`    New total: ${(totalNewSize / 1024).toFixed(1)}KB (${newFiles.length} files)`);
        const savings = ((oldSize - totalNewSize) / oldSize * 100);
        if (savings > 0) {
          console.log(`    💚 Saved: ${savings.toFixed(1)}%`);
        }
      }
    }
  });
};

const main = () => {
  console.log('🌍 Organizing translation files into logical groups...');
  
  const locales = ['en', 'fr', 'de', 'it'];
  
  locales.forEach(createGroupedTranslations);
  
  updateI18nConfig();
  
  showSizeComparison();
  
  console.log('\n✅ Translation organization complete!');
  console.log('\nBenefits:');
  console.log('• Smaller, focused translation files');
  console.log('• Better organization by feature area');
  console.log('• Easier maintenance and updates');
  console.log('• Reduced bundle size for specific features');
  
  console.log('\nNext steps:');
  console.log('1. Test the application to ensure all translations work');
  console.log('2. Consider the old monolithic files for removal');
  console.log('3. Update documentation about the new structure');
};

if (require.main === module) {
  main();
}

module.exports = { translationGroups, createGroupedTranslations };