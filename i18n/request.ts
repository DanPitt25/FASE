import {getRequestConfig} from 'next-intl/server';

// Helper to merge multiple translation files
const mergeTranslations = async (locale: string, files: string[]) => {
  const translations = {};
  
  for (const file of files) {
    try {
      const fileTranslations = (await import(`../messages/${locale}/${file}.json`)).default;
      Object.assign(translations, fileTranslations);
    } catch (error) {
      console.warn(`Could not load ${locale}/${file}.json`);
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
});