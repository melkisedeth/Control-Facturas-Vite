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
  Badge,
  InputAdornment,
  Container,
  Stack,
  alpha,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Alert,
  LinearProgress,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Fade,
  Zoom,
  Drawer,
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
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Inventory as InventoryIcon,
  FileCopy as FileCopyIcon,
  PhotoCamera as PhotoCameraIcon,
  MoreVert as MoreVertIcon,
  QrCode as QrCodeIcon,
  CloudUpload as CloudUploadIcon,
  Sort as SortIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Dashboard as DashboardIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
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
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'client'>('date');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    delivered: 0,
    partial: 0,
    total: 0,
  });

  const open = Boolean(anchorEl);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserEmail(user.email);
        setIsAdmin(user.email === 'admin@gmail.com');
        localStorage.setItem('isAdmin', (user.email === 'admin@gmail.com').toString());
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

  useEffect(() => {
    // Actualizar estadísticas cuando cambian las facturas
    const pending = invoices.filter(inv => inv.status === 'Pendiente').length;
    const delivered = invoices.filter(inv => inv.status === 'Despachada').length;
    const partial = invoices.filter(inv => inv.status === 'Parcial').length;
    
    setStats({
      pending,
      delivered,
      partial,
      total: invoices.length,
    });
  }, [invoices]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'invoices'),
        orderBy('createdAt', 'desc'),
        limit(200)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Despachada': return <CheckCircleIcon fontSize="small" />;
      case 'Parcial': return <InventoryIcon fontSize="small" />;
      default: return <PendingIcon fontSize="small" />;
    }
  };

  const getFilteredInvoices = () => {
    let filtered = invoices;
    
    // Filtrar por tab
    if (tabIndex === 0) {
      filtered = filtered.filter(inv => inv.status !== 'Despachada');
    } else {
      filtered = filtered.filter(inv => inv.status === 'Despachada');
    }
    
    // Filtrar por búsqueda
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((invoice) =>
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.clientName.toLowerCase().includes(searchLower) ||
        invoice.clientPhone.includes(search) ||
        (invoice.userEmail?.toLowerCase().includes(searchLower) ?? false)
      );
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'client':
          return a.clientName.localeCompare(b.clientName);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const handleQuickDelivery = (invoice: Invoice) => {
    if (invoice.id) {
      navigate(`/quick-delivery/${invoice.id}`);
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

  const handleClientsPanel = () => {
    navigate('/clients');
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

  const formatDate = (date: Date) => {
    return format(date, 'dd MMM yyyy HH:mm', { locale: es });
  };

  const getPriorityColor = (invoice: Invoice) => {
    const daysDiff = Math.floor((new Date().getTime() - invoice.createdAt.getTime()) / (1000 * 3600 * 24));
    if (daysDiff > 7) return '#ff6b6b';
    if (daysDiff > 3) return '#ffa726';
    return '#66bb6a';
  };

  const handleExportData = () => {
    // Función para exportar datos
    console.log('Exportando datos...');
  };

  const handlePrintList = () => {
    // Función para imprimir lista
    window.print();
  };

  const quickActions = [
    { icon: <AddIcon />, name: 'Nueva Factura', action: handleAddInvoice },
    { icon: <GroupIcon />, name: 'Clientes', action: handleClientsPanel },
    { icon: <DownloadIcon />, name: 'Exportar', action: handleExportData },
    { icon: <PrintIcon />, name: 'Imprimir', action: handlePrintList },
  ];

  const filteredInvoices = getFilteredInvoices();

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'grey.50',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      {/* Header Mejorado */}
      <AppBar
        position="sticky"
        elevation={1}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.95)'
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              bgcolor: 'primary.main', 
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AssignmentIcon sx={{ color: 'white' }} />
            </Box>
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  fontSize: '1.3rem'
                }}
              >
                Gestión de Facturas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Control de entregas y despachos
              </Typography>
            </Box>
          </Stack>

          {/* Estadísticas rápidas */}
          <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', lg: 'flex' }, mr: 4 }}>
            <Tooltip title="Facturas Pendientes">
              <Stack alignItems="center" spacing={0.5}>
                <Badge badgeContent={stats.pending} color="error" max={99}>
                  <PendingIcon color="action" />
                </Badge>
                <Typography variant="caption" color="text.secondary">
                  Pendientes
                </Typography>
              </Stack>
            </Tooltip>
            
            <Tooltip title="Facturas Parciales">
              <Stack alignItems="center" spacing={0.5}>
                <Badge badgeContent={stats.partial} color="warning" max={99}>
                  <InventoryIcon color="action" />
                </Badge>
                <Typography variant="caption" color="text.secondary">
                  Parciales
                </Typography>
              </Stack>
            </Tooltip>
            
            <Tooltip title="Facturas Despachadas">
              <Stack alignItems="center" spacing={0.5}>
                <Badge badgeContent={stats.delivered} color="success" max={99}>
                  <CheckCircleIcon color="action" />
                </Badge>
                <Typography variant="caption" color="text.secondary">
                  Despachadas
                </Typography>
              </Stack>
            </Tooltip>
          </Stack>

          {/* Avatar y menú */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Acciones rápidas">
              <IconButton
                size="small"
                onClick={() => setQuickActionsOpen(!quickActionsOpen)}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  }
                }}
              >
                <SpeedDialIcon />
              </IconButton>
            </Tooltip>

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
                  width: 36,
                  height: 36,
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
                minWidth: 240,
                borderRadius: 2,
                boxShadow: 3
              }
            }}
          >
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={500}>
                  {currentUserEmail}
                </Typography>
                <Chip 
                  label={isAdmin ? 'Administrador' : 'Usuario'} 
                  size="small" 
                  color={isAdmin ? 'primary' : 'default'}
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
              </Stack>
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleAdminPanel} disabled={!isAdmin}>
              <DashboardIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
              Panel Administrativo
            </MenuItem>

            <MenuItem onClick={handleClientsPanel}>
              <GroupIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
              Gestión de Clientes
            </MenuItem>

            <MenuItem onClick={handleExportData}>
              <DownloadIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
              Exportar Datos
            </MenuItem>

            <Divider />

            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 2, color: 'error.main' }} />
              <Typography color="error.main">
                Cerrar Sesión
              </Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Panel de Control */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 3,
            borderRadius: 3,
            bgcolor: 'white',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
          }}
        >
          {/* Barra de búsqueda y filtros */}
          <Grid container spacing={3} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Buscar por número de factura, cliente o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="medium"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: 2,
                    bgcolor: 'grey.50'
                  }
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Tooltip title="Ordenar por">
                  <Button
                    variant="outlined"
                    startIcon={<SortIcon />}
                    onClick={() => {
                      const sorts = ['date', 'client', 'status'] as const;
                      const currentIndex = sorts.indexOf(sortBy);
                      setSortBy(sorts[(currentIndex + 1) % sorts.length]);
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    {sortBy === 'date' && 'Fecha'}
                    {sortBy === 'client' && 'Cliente'}
                    {sortBy === 'status' && 'Estado'}
                  </Button>
                </Tooltip>
                
                <Tooltip title="Actualizar lista">
                  <IconButton 
                    onClick={fetchInvoices} 
                    disabled={loading}
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' }
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          {/* Tabs Mejoradas */}
          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 2, 
              bgcolor: 'grey.50',
              mb: 3
            }}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, value) => setTabIndex(value)}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  py: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 500,
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&.Mui-selected': {
                    bgcolor: 'white',
                    boxShadow: 1,
                    color: 'primary.main',
                  }
                }
              }}
            >
              <Tab 
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PendingIcon fontSize="small" />
                    <span>Pendientes</span>
                    {stats.pending > 0 && (
                      <Chip
                        label={stats.pending}
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
                    <CheckCircleIcon fontSize="small" />
                    <span>Despachadas</span>
                    {stats.delivered > 0 && (
                      <Chip
                        label={stats.delivered}
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

          {/* Indicador de carga */}
          {loading && (
            <LinearProgress sx={{ mb: 3, borderRadius: 2 }} />
          )}

          {/* Contador de resultados */}
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              bgcolor: 'primary.50',
              border: '1px solid',
              borderColor: 'primary.100'
            }}
          >
            <Typography variant="body2">
              Mostrando <strong>{filteredInvoices.length}</strong> de <strong>{stats.total}</strong> facturas
              {search && ` para la búsqueda: "${search}"`}
            </Typography>
          </Alert>
        </Paper>

        {/* Lista de Facturas - Vista Mejorada */}
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            py: 8,
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3
          }}>
            <CircularProgress size={60} />
            <Typography color="text.secondary">
              Cargando facturas...
            </Typography>
          </Box>
        ) : filteredInvoices.length === 0 ? (
          <Paper
            sx={{
              p: 8,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: 'grey.100', 
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              mx: 'auto'
            }}>
              {tabIndex === 0 ? (
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
              ) : (
                <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              )}
            </Box>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {search ? 'No se encontraron facturas' :
                tabIndex === 0 ? '¡Todo al día!' :
                  'No hay facturas despachadas'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              {search ? 'Prueba con otros términos de búsqueda o revisa la ortografía' :
                tabIndex === 0 ? 'Todas las facturas han sido procesadas correctamente' :
                  'Las facturas despachadas aparecerán aquí'}
            </Typography>
            {tabIndex === 0 && !search && (
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleAddInvoice}
                sx={{ borderRadius: 2 }}
              >
                Registrar Nueva Factura
              </Button>
            )}
          </Paper>
        ) : (
          <List sx={{ 
            bgcolor: 'transparent',
            p: 0
          }}>
            {filteredInvoices.map((invoice, index) => (
              <Fade in={true} timeout={300} key={invoice.id}>
                <ListItem
                  disablePadding
                  sx={{
                    mb: 2,
                    animation: `fadeIn 0.5s ease ${index * 0.1}s both`,
                    '@keyframes fadeIn': {
                      '0%': { opacity: 0, transform: 'translateY(20px)' },
                      '100%': { opacity: 1, transform: 'translateY(0)' },
                    }
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      width: '100%',
                      borderRadius: 3,
                      bgcolor: 'white',
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        transform: 'translateY(-2px)',
                        borderColor: 'primary.light',
                      }
                    }}
                  >
                    <ListItemButton 
                      onClick={() => handleViewDetails(invoice)}
                      sx={{ 
                        p: 3,
                        '&:hover': {
                          bgcolor: 'grey.50'
                        }
                      }}
                    >
                      <Grid container spacing={3} alignItems="center">
                        {/* Columna 1: Información Principal */}
                        <Grid item xs={12} md={4}>
                          <Stack spacing={2}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Box sx={{ 
                                width: 12, 
                                height: 12, 
                                borderRadius: '50%',
                                bgcolor: getPriorityColor(invoice)
                              }} />
                              <Typography variant="h6" fontWeight={600} color="primary">
                                {invoice.invoiceNumber}
                              </Typography>
                            </Stack>
                            
                            <Stack spacing={1}>
                              <Typography variant="subtitle1" fontWeight={500}>
                                {invoice.clientName}
                              </Typography>
                              
                              <Stack direction="row" spacing={2}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {invoice.clientPhone}
                                  </Typography>
                                </Stack>
                                
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">
                                    {formatDate(invoice.createdAt)}
                                  </Typography>
                                </Stack>
                              </Stack>
                            </Stack>
                          </Stack>
                        </Grid>

                        {/* Columna 2: Estado y Detalles */}
                        <Grid item xs={12} md={3}>
                          <Stack spacing={2}>
                            <Chip
                              icon={getStatusIcon(invoice.status)}
                              label={invoice.status}
                              color={getStatusColor(invoice.status)}
                              sx={{ 
                                fontWeight: 600,
                                width: 'fit-content'
                              }}
                            />
                            
                            {invoice.deliveries?.length > 0 && (
                              <Stack direction="row" spacing={1} alignItems="center">
                                <ShippingIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                <Typography variant="body2" color="primary.main">
                                  {invoice.deliveries.length} entrega(s)
                                </Typography>
                              </Stack>
                            )}
                          </Stack>
                        </Grid>

                        {/* Columna 3: Fotos */}
                        <Grid item xs={12} md={2}>
                          {invoice.photos.length > 0 ? (
                            <Tooltip title={`${invoice.photos.length} fotos adjuntas`}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PhotoCameraIcon sx={{ color: 'primary.main' }} />
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  bgcolor: 'primary.50',
                                  borderRadius: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                                    {invoice.photos.length}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Sin fotos
                            </Typography>
                          )}
                        </Grid>

                        {/* Columna 4: Acciones */}
                        <Grid item xs={12} md={3}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Registrar entrega">
                              <span>
                                <Button
                                  variant="contained"
                                  size="small"
                                  startIcon={<ShippingIcon />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickDelivery(invoice);
                                  }}
                                  disabled={invoice.status === 'Despachada'}
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    borderRadius: 2,
                                    minWidth: 140
                                  }}
                                >
                                  {invoice.status === 'Pendiente' ? 'Despachar' : 'Agregar'}
                                </Button>
                              </span>
                            </Tooltip>
                            
                            <Tooltip title="Ver detalles">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(invoice);
                                }}
                                sx={{
                                  border: 1,
                                  borderColor: 'divider'
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Más opciones">
                              <IconButton
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Grid>
                      </Grid>
                    </ListItemButton>
                  </Paper>
                </ListItem>
              </Fade>
            ))}
          </List>
        )}
      </Container>

      {/* Botón de Acción Rápida Flotante */}
      <Zoom in={true}>
        <Fab
          color="primary"
          onClick={handleAddInvoice}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 56,
            height: 56,
            boxShadow: '0 8px 25px rgba(41, 98, 255, 0.3)',
            '&:hover': {
              boxShadow: '0 12px 30px rgba(41, 98, 255, 0.4)',
              transform: 'scale(1.05)'
            }
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* SpeedDial para acciones rápidas */}
      {quickActionsOpen && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 100, 
          right: 32,
          zIndex: 1000 
        }}>
          <Stack spacing={2} alignItems="flex-end">
            {quickActions.map((action, index) => (
              <Zoom in={true} timeout={300} style={{ transitionDelay: `${index * 100}ms` }} key={action.name}>
                <Tooltip title={action.name} placement="left">
                  <Fab
                    size="medium"
                    color="primary"
                    onClick={action.action}
                    sx={{
                      width: 48,
                      height: 48,
                      boxShadow: 3
                    }}
                  >
                    {action.icon}
                  </Fab>
                </Tooltip>
              </Zoom>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default InvoiceListScreenDesktop;