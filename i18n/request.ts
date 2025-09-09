import {getRequestConfig} from 'next-intl/server';
 
export default getRequestConfig(async () => {
  // For now, we'll default to English and handle dynamic switching on client side
  // In a full implementation, this would check cookies/headers for locale preference
  const locale = 'en';
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});