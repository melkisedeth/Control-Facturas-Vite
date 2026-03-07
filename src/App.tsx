import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { onAuthStateChanged, getAuth } from 'firebase/auth';
import { auth } from './firebase/config';
import ErrorBoundary from './components/ErrorBoundary';
import InvoiceListScreen from './components/InvoiceListScreen';
import InvoiceCaptureScreen from './components/InvoiceCaptureScreen';
import QuickDeliveryScreen from './components/QuickDeliveryScreen';
import InvoiceDetailScreen from './components/InvoiceDetailScreen';
import AdminPanelScreen from './components/AdminPanelScreen';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';
import ClientsScreen from './components/ClientsScreen';
import InvoiceTrackingScreen from './components/Invoicetrackingscreen';
// ↓ NEW: public tracking page (no auth required)

const theme = createTheme({
  palette: {
    primary: {
      main: '#3b82f6',
    },
    secondary: {
      main: '#10b981',
    },
  },
});

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router basename="/Control-Facturas-Vite">
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* ── Public route — no auth required ── */}
              <Route path="/tracking/:invoiceId" element={<InvoiceTrackingScreen />} />

              {/* ── Auth routes ── */}
              <Route path="/login" element={user ? <Navigate to="/" /> : <LoginScreen />} />
              <Route path="/" element={user ? <InvoiceListScreen /> : <Navigate to="/login" />} />
              <Route path="/capture" element={user ? <InvoiceCaptureScreen /> : <Navigate to="/login" />} />
              <Route path="/quick-delivery/:invoiceId" element={user ? <QuickDeliveryScreen /> : <Navigate to="/login" />} />
              <Route path="/invoice/:id" element={user ? <InvoiceDetailScreen /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user ? <AdminPanelScreen /> : <Navigate to="/login" />} />
              <Route path="/clients" element={user ? <ClientsScreen /> : <Navigate to="/login" />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;