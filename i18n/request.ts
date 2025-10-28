import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async () => {
  // Provide a static locale for static exports
  const locale = 'en';
 
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});