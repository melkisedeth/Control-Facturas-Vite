import React from 'react';
import { CircularProgress, Box, Typography } from '@mui/material';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <CircularProgress size={60} thickness={4} />
      <Typography variant="h6" className="mt-4">
        Cargando...
      </Typography>
    </Box>
  );
};

export default LoadingScreen;