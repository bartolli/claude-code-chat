import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTruncatedTextOptions {
  text: string;
  maxWidth?: number;
  suffix?: string;
}

export const useTruncatedText = ({ 
  text, 
  maxWidth, 
  suffix = '...' 
}: UseTruncatedTextOptions) => {
  const [truncatedText, setTruncatedText] = useState(text);
  const [isTruncated, setIsTruncated] = useState(false);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const measureText = useCallback((str: string): number => {
    if (!measureRef.current) return 0;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 0;

    const computedStyle = window.getComputedStyle(measureRef.current);
    context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    
    return context.measureText(str).width;
  }, []);

  const truncateText = useCallback(() => {
    if (!containerRef.current || !text) {
      setTruncatedText(text);
      setIsTruncated(false);
      return;
    }

    const availableWidth = maxWidth || containerRef.current.offsetWidth;
    if (!availableWidth) {
      setTruncatedText(text);
      setIsTruncated(false);
      return;
    }

    // Quick check if text fits
    const fullWidth = measureText(text);
    if (fullWidth <= availableWidth) {
      setTruncatedText(text);
      setIsTruncated(false);
      return;
    }

    // Binary search for the right truncation point
    let left = 0;
    let right = text.length;
    let bestFit = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncated = text.slice(0, mid) + suffix;
      const width = measureText(truncated);

      if (width <= availableWidth) {
        bestFit = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    const finalText = text.slice(0, bestFit) + suffix;
    setTruncatedText(finalText);
    setIsTruncated(true);
  }, [text, maxWidth, suffix, measureText]);

  useEffect(() => {
    truncateText();

    // Re-truncate on window resize
    const handleResize = () => {
      truncateText();
    };

    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver if available for more precise updates
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        truncateText();
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [truncateText]);

  return {
    truncatedText,
    isTruncated,
    containerRef,
    measureRef
  };
};