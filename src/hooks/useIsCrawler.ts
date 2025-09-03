import { useState, useEffect } from 'react';

const isBrowser = typeof window !== 'undefined';

/**
 * 검색 엔진 크롤러(봇) 여부를 판별하는 훅
 * @returns {boolean} 크롤러 여부
 */
export const useIsCrawler = (): boolean => {
  const [isCrawler, setIsCrawler] = useState(false);

  useEffect(() => {
    const userAgent = isBrowser ? navigator.userAgent : '';
    // Googlebot, Bingbot, Naver Yeti 등 일반적인 검색 봇 패턴
    const botPatterns = /bot|googlebot|crawler|spider|crawling|yeti/i;
    setIsCrawler(botPatterns.test(userAgent));
  }, []);

  return isCrawler;
};