import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Invoice } from '../types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AppBar,
  Toolbar,
  Typography,
  Tab,
  Tabs,
  TextField,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Fab,
  Box,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  InputAdornment,
  Container,
  Stack,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  AdminPanelSettings as AdminIcon,
  Visibility as VisibilityIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const InvoiceListScreenDesktop: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email);
        
        if (user.email === 'admin@gmail.com') {
          setIsAdmin(true);
          localStorage.setItem('isAdmin', 'true');
        } else {
          setIsAdmin(false);
          localStorage.setItem('isAdmin', 'false');
        }
      } else {
        setCurrentUserEmail(null);
        setIsAdmin(false);
        localStorage.removeItem('isAdmin');
        navigate('/login');
      }
    });

    fetchInvoices();

    return () => unsubscribe();
  }, [navigate]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'invoices'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      
      const invoicesList: Invoice[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        invoicesList.push({
          id: doc.id,
          invoiceNumber: data.invoiceNumber || '',
          clientName: data.clientName || '',
          clientPhone: data.clientPhone || '',
          clientAddress: data.clientAddress,
          status: data.status || 'Pendiente',
          photos: data.photos || [],
          deliveries: data.deliveries || [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          userEmail: data.userEmail,
          userId: data.userId,
        });
      });
      
      setInvoices(invoicesList);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Despachada': return 'success';
      case 'Parcial': return 'warning';
      default: return 'error';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Despachada': return 'Despachada';
      case 'Parcial': return 'Parcial';
      default: return 'Pendiente';
    }
  };

  const getPendingInvoices = () => {
    return invoices.filter(invoice => invoice.status !== 'Despachada');
  };

  const getDeliveredInvoices = () => {
    return invoices.filter(invoice => invoice.status === 'Despachada');
  };

  const filteredInvoices = tabIndex === 0 ? getPendingInvoices() : getDeliveredInvoices();

  const searchFilteredInvoices = filteredInvoices.filter((invoice) => {
    return search === '' ? true :
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
      invoice.clientPhone.includes(search);
  });

  const handleQuickDelivery = (invoice: Invoice) => {
    if (invoice.id) {
      navigate(`/quick-delivery/${invoice.id}`);
    } else {
      console.error('Invoice ID is undefined');
    }
  };

  const handleViewDetails = (invoice: Invoice) => {
    if (invoice.id) {
      navigate(`/invoice/${invoice.id}`);
    }
  };

  const handleAddInvoice = () => {
    navigate('/capture');
  };

  const handleAdminPanel = () => {
    navigate('/admin');
    handleCloseMenu();
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      handleCloseMenu();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const getInitials = (email: string | null) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  const pendingCount = getPendingInvoices().length;
  const deliveredCount = getDeliveredInvoices().length;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Header */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
          <Typography 
            variant="h6" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 700,
              color: 'primary.main',
              fontSize: '1.5rem'
            }}
          >
            Control Facturas - Entregas
          </Typography>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* Botón Admin para pantallas grandes */}
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<AdminIcon />}
                onClick={handleAdminPanel}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Admin
              </Button>
            )}
            
            {/* Email del usuario */}
            {currentUserEmail && (
              <Typography 
                variant="body2" 
                sx={{ 
                  display: { xs: 'none', md: 'block' },
                  color: 'text.secondary'
                }}
              >
                {currentUserEmail}
              </Typography>
            )}
            
            {/* Avatar y menú */}
            <IconButton
              onClick={handleMenuClick}
              size="small"
              sx={{ 
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem'
                }}
              >
                {getInitials(currentUserEmail)}
              </Avatar>
            </IconButton>
          </Stack>

          {/* Menú desplegable */}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleCloseMenu}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
              }
            }}
          >
            <MenuItem disabled>
              <Stack spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  {currentUserEmail}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </Typography>
              </Stack>
            </MenuItem>
            
            <Divider />
            
            {isAdmin && (
              <MenuItem onClick={handleAdminPanel}>
                <AdminIcon fontSize="small" sx={{ mr: 1 }} />
                Panel de Administración
              </MenuItem>
            )}
            
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header con estadísticas y búsqueda */}
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
        >
          <Stack 
            direction="row" 
            justifyContent="space-between" 
            alignItems="center"
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                Gestión de Facturas
              </Typography>
              <Stack direction="row" spacing={3}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Pendientes
                  </Typography>
                  <Badge 
                    badgeContent={pendingCount} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': {
                        fontSize: '0.75rem',
                        height: 20,
                        minWidth: 20
                      }
                    }}
                  >
                    <Typography variant="h6" color="error.main">
                      {pendingCount}
                    </Typography>
                  </Badge>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Despachadas
                  </Typography>
                  <Badge 
                    badgeContent={deliveredCount} 
                    color="success"
                    sx={{ 
                      '& .MuiBadge-badge': {
                        fontSize: '0.75rem',
                        height: 20,
                        minWidth: 20
                      }
                    }}
                  >
                    <Typography variant="h6" color="success.main">
                      {deliveredCount}
                    </Typography>
                  </Badge>
                </Box>
              </Stack>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchInvoices}
                disabled={loading}
              >
                Actualizar
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddInvoice}
                sx={{ display: { xs: 'none', md: 'flex' } }}
              >
                Nueva Factura
              </Button>
            </Stack>
          </Stack>

          {/* Barra de búsqueda y filtros */}
          <Stack 
            direction="row" 
            spacing={2}
            sx={{ mb: 2 }}
          >
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por número, cliente o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
            />
          </Stack>

          {/* Tabs */}
          <Tabs
            value={tabIndex}
            onChange={(_, value) => setTabIndex(value)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': {
                fontSize: '1rem',
                fontWeight: 600,
                minHeight: 48,
                textTransform: 'none'
              }
            }}
          >
            <Tab 
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Pendientes</span>
                  {pendingCount > 0 && (
                    <Chip 
                      label={pendingCount} 
                      size="small" 
                      color="error"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>
              } 
            />
            <Tab 
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <span>Despachadas</span>
                  {deliveredCount > 0 && (
                    <Chip 
                      label={deliveredCount} 
                      size="small" 
                      color="success"
                      sx={{ height: 20, fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>
              } 
            />
          </Tabs>
        </Paper>

        {/* Lista/Grid de facturas */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : searchFilteredInvoices.length === 0 ? (
          <Paper 
            sx={{ 
              p: 8, 
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {search ? 'No se encontraron facturas' :
               tabIndex === 0 ? 'No hay facturas pendientes' :
               'No hay facturas despachadas'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {search ? 'Intenta con otros términos de búsqueda' : 
               tabIndex === 0 ? 'Todas las facturas han sido despachadas' :
               'Registra tu primera entrega'}
            </Typography>
            {!search && tabIndex === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddInvoice}
                size="large"
              >
                Crear Primera Factura
              </Button>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {searchFilteredInvoices.map((invoice) => (
              <Grid item xs={12} key={invoice.id}>
                <Card 
                  elevation={1}
                  sx={{ 
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      elevation: 4,
                      transform: 'translateY(-2px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={3} alignItems="center">
                      {/* Columna 1: Información principal */}
                      <Grid item md={4}>
                        <Stack spacing={1}>
                          <Box>
                            <Typography 
                              variant="subtitle1" 
                              fontWeight={600}
                              sx={{ 
                                color: 'primary.main',
                                cursor: 'pointer',
                                '&:hover': { color: 'primary.dark' }
                              }}
                              onClick={() => handleViewDetails(invoice)}
                            >
                              {invoice.invoiceNumber}
                            </Typography>
                            <Typography variant="body1" fontWeight={500}>
                              {invoice.clientName}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {invoice.clientPhone}
                              </Typography>
                            </Stack>
                          </Box>
                          
                          {invoice.clientAddress && (
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.5 }} />
                              <Typography variant="body2" color="text.secondary">
                                {invoice.clientAddress}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Grid>

                      {/* Columna 2: Fecha y entregas */}
                      <Grid item md={3}>
                        <Stack spacing={2}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {format(invoice.createdAt, 'dd/MM/yyyy HH:mm', { locale: es })}
                            </Typography>
                          </Stack>
                          
                          {invoice.deliveries.length > 0 && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <ShippingIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {invoice.deliveries.length} entrega(s)
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Grid>

                      {/* Columna 3: Fotos */}
                      <Grid item md={2}>
                        {invoice.photos.length > 0 && (
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {invoice.photos.length} foto(s)
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              {invoice.photos.slice(0, 2).map((photo, index) => (
                                <Box
                                  key={index}
                                  component="img"
                                  src={photo}
                                  alt={`Factura ${index + 1}`}
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    border: 1,
                                    borderColor: 'divider'
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x40?text=Imagen';
                                  }}
                                />
                              ))}
                              {invoice.photos.length > 2 && (
                                <Box
                                  sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: 'grey.100',
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: 1,
                                    borderColor: 'divider'
                                  }}
                                >
                                  <Typography variant="caption" color="text.secondary">
                                    +{invoice.photos.length - 2}
                                  </Typography>
                                </Box>
                              )}
                            </Stack>
                          </Box>
                        )}
                      </Grid>

                      {/* Columna 4: Estado y acciones */}
                      <Grid item md={3}>
                        <Stack spacing={2} alignItems="flex-end">
                          <Chip
                            label={getStatusText(invoice.status)}
                            color={getStatusColor(invoice.status)}
                            size="medium"
                            sx={{ 
                              fontWeight: 600,
                              minWidth: 120
                            }}
                          />
                          
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ShippingIcon />}
                              onClick={() => handleQuickDelivery(invoice)}
                              disabled={invoice.status === 'Despachada'}
                              sx={{ 
                                textTransform: 'none',
                                fontWeight: 500
                              }}
                            >
                              {invoice.status === 'Pendiente' ? 'Registrar Entrega' : 'Agregar Entrega'}
                            </Button>
                            
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<VisibilityIcon />}
                              onClick={() => handleViewDetails(invoice)}
                              sx={{ 
                                textTransform: 'none',
                                fontWeight: 500
                              }}
                            >
                              Ver
                            </Button>
                          </Stack>
                        </Stack>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* Botón flotante para móvil */}
      <Fab
        color="primary"
        onClick={handleAddInvoice}
        sx={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          display: { xs: 'flex', md: 'none' }
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default InvoiceListScreenDesktop;