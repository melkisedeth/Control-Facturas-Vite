import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Skeleton } from '@mui/material';
import { BrokenImage as BrokenImageIcon } from '@mui/icons-material';

interface LazyImageProps {
  src: string;
  alt: string;
  sx?: object;
  onClick?: (e: React.MouseEvent) => void;
  maxRetries?: number;
}

const LazyImage: React.FC<LazyImageProps> = ({ src, alt, sx, onClick, maxRetries = 4 }) => {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentSrc, setCurrentSrc] = useState(src);
  const retryCount = useRef(0);

  // Reset when src changes
  useEffect(() => {
    setStatus('loading');
    setCurrentSrc(src);
    retryCount.current = 0;
  }, [src]);

  const handleError = useCallback(() => {
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      const delay = retryCount.current * 800;
      setTimeout(() => {
        setCurrentSrc(`${src}${src.includes('?') ? '&' : '?'}_r=${Date.now()}`);
      }, delay);
    } else {
      setStatus('error');
    }
  }, [src, maxRetries]);

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', ...sx }} onClick={onClick}>
      {status === 'loading' && (
        <Skeleton
          variant="rectangular"
          sx={{ position: 'absolute', inset: 0, transform: 'none', borderRadius: 'inherit' }}
          animation="wave"
        />
      )}
      {status === 'error' ? (
        <Box
          sx={{
            width: '100%', height: '100%', minHeight: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#f1f5f9',
          }}
        >
          <BrokenImageIcon sx={{ color: '#cbd5e1', fontSize: 22 }} />
        </Box>
      ) : (
        <Box
          component="img"
          src={currentSrc}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={handleError}
          sx={{
            ...sx,
            position: 'static',
            opacity: status === 'loaded' ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
        />
      )}
    </Box>
  );
};

export default LazyImage;