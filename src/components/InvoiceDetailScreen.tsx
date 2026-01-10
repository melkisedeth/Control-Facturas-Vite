import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Invoice, Delivery } from '../types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Container,
  Paper,
  Typography,
  Button,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Grid,
  Alert,
  Stack,
  Card,
  CardContent,
  Avatar,
  Tabs,
  Tab,
  Badge,
  InputAdornment,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  Image as ImageIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  PhotoLibrary as PhotoLibraryIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Fullscreen as FullscreenIcon,
  NoteAdd as NoteAddIcon,
  ArrowForward as ArrowForwardIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Share as ShareIcon,
} from '@mui/icons-material';

const InvoiceDetailScreenDesktop: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const docRef = doc(db, 'invoices', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const invoiceData: Invoice = {
          id: docSnap.id,
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
          deliveredAt: data.deliveredAt?.toDate(),
        };
        setInvoice(invoiceData);
        setClientName(invoiceData.clientName);
        setClientPhone(invoiceData.clientPhone);
        setClientAddress(invoiceData.clientAddress || '');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
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

  const formatDate = (date?: Date) => {
    if (!date) return 'No disponible';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  const handleStatusChange = async () => {
    if (!id || !invoice) return;

    try {
      setUpdating(true);
      const newStatus = invoice.status === 'Despachada' ? 'Pendiente' : 'Despachada';
      
      await updateDoc(doc(db, 'invoices', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        deliveredAt: newStatus === 'Despachada' ? serverTimestamp() : null,
      });

      setInvoice({
        ...invoice,
        status: newStatus,
        updatedAt: new Date(),
        deliveredAt: newStatus === 'Despachada' ? new Date() : undefined,
      });
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;

    try {
      setUpdating(true);
      await updateDoc(doc(db, 'invoices', id), {
        clientName,
        clientPhone,
        clientAddress,
        updatedAt: serverTimestamp(),
      });

      if (invoice) {
        setInvoice({
          ...invoice,
          clientName,
          clientPhone,
          clientAddress,
          updatedAt: new Date(),
        });
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating invoice:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddDeliveryNote = async (deliveryIndex: number, note: string) => {
    if (!id || !invoice || !invoice.deliveries) return;

    try {
      const updatedDeliveries = [...invoice.deliveries];
      updatedDeliveries[deliveryIndex] = {
        ...updatedDeliveries[deliveryIndex],
        notes: note,
      };

      await updateDoc(doc(db, 'invoices', id), {
        deliveries: updatedDeliveries,
        updatedAt: serverTimestamp(),
      });

      setInvoice({
        ...invoice,
        deliveries: updatedDeliveries,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
      setEditNotes('');
    } catch (err) {
      console.error('Error updating delivery note:', err);
    }
  };

  const handleWhatsApp = () => {
    if (invoice?.clientPhone) {
      const phone = invoice.clientPhone.replace(/\D/g, '');
      const url = `https://wa.me/57${phone}`;
      window.open(url, '_blank');
    }
  };

  const handleCall = () => {
    if (invoice?.clientPhone) {
      window.location.href = `tel:${invoice.clientPhone}`;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            Factura no encontrada
          </Alert>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            variant="contained"
          >
            Volver al listado
          </Button>
        </Paper>
      </Container>
    );
  }

  const imageUrls = selectedDelivery !== null && invoice.deliveries[selectedDelivery]?.photos 
    ? invoice.deliveries[selectedDelivery].photos
    : invoice.photos;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header con breadcrumb y acciones */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            variant="outlined"
            size="small"
          >
            Volver
          </Button>
          <Typography variant="h5" fontWeight={600} color="text.primary">
            Detalle de Factura
          </Typography>
        </Stack>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
          <Button
            variant="contained"
            startIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/quick-delivery/${invoice.id}`)}
          >
            Nueva Entrega
          </Button>
        </Stack>
      </Stack>

      {/* Tarjeta principal */}
      <Paper 
        elevation={0}
        sx={{ 
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider'
        }}
      >
        {/* Encabezado con estado y número */}
        <Box sx={{ 
          p: 3, 
          bgcolor: 'primary.light', 
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} md={6}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.main',
                    width: 56,
                    height: 56
                  }}
                >
                  <DescriptionIcon />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight={700} color="primary.contrastText">
                    {invoice.invoiceNumber}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText" sx={{ opacity: 0.9 }}>
                    {formatDate(invoice.createdAt)}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Chip
                  label={invoice.status}
                  color={getStatusColor(invoice.status)}
                  size="medium"
                  sx={{ 
                    fontWeight: 700,
                    fontSize: '1rem',
                    minWidth: 140,
                    height: 40
                  }}
                />
                <Button
                  variant={invoice.status === 'Despachada' ? 'outlined' : 'contained'}
                  color={invoice.status === 'Despachada' ? 'primary' : 'success'}
                  startIcon={updating ? <CircularProgress size={20} /> : <CheckIcon />}
                  onClick={handleStatusChange}
                  disabled={updating}
                  sx={{ 
                    textTransform: 'none',
                    fontWeight: 600,
                    minWidth: 200
                  }}
                >
                  {invoice.status === 'Despachada' ? 'Marcar Pendiente' : 'Marcar Despachada'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Tabs para navegación */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500
              }
            }}
          >
            <Tab 
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PersonIcon fontSize="small" />
                  <span>Información</span>
                </Stack>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={invoice.photos.length} color="primary">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <PhotoLibraryIcon fontSize="small" />
                    <span>Imágenes</span>
                  </Stack>
                </Badge>
              } 
            />
            <Tab 
              label={
                <Badge badgeContent={invoice.deliveries?.length || 0} color="secondary">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <HistoryIcon fontSize="small" />
                    <span>Entregas</span>
                  </Stack>
                </Badge>
              } 
            />
          </Tabs>
        </Box>

        {/* Contenido de las tabs */}
        <Box sx={{ p: 4 }}>
          {activeTab === 0 && (
            <Grid container spacing={4}>
              {/* Columna izquierda - Información del cliente */}
              <Grid item xs={12} md={6}>
                <Card 
                  elevation={0}
                  sx={{ 
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Información del Cliente
                      </Typography>
                      <IconButton 
                        onClick={() => setIsEditing(!isEditing)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Stack>

                    {isEditing ? (
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="Nombre del cliente"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          disabled={updating}
                          variant="outlined"
                          size="medium"
                        />
                        <TextField
                          fullWidth
                          label="Teléfono"
                          value={clientPhone}
                          onChange={(e) => setClientPhone(e.target.value)}
                          disabled={updating}
                          variant="outlined"
                          size="medium"
                        />
                        <TextField
                          fullWidth
                          label="Dirección"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          multiline
                          rows={3}
                          disabled={updating}
                          variant="outlined"
                          size="medium"
                        />
                        <Stack direction="row" spacing={2}>
                          <Button
                            variant="contained"
                            startIcon={updating ? <CircularProgress size={20} /> : <SaveIcon />}
                            onClick={handleSaveEdit}
                            disabled={updating || !clientName || !clientPhone}
                            sx={{ textTransform: 'none' }}
                          >
                            Guardar Cambios
                          </Button>
                          <Button
                            variant="outlined"
                            startIcon={<CancelIcon />}
                            onClick={() => setIsEditing(false)}
                            disabled={updating}
                            sx={{ textTransform: 'none' }}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack spacing={3}>
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Nombre completo
                          </Typography>
                          <Typography variant="body1" fontWeight={500}>
                            {invoice.clientName}
                          </Typography>
                        </Stack>

                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Contacto
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body1" fontWeight={500}>
                              {invoice.clientPhone}
                            </Typography>
                            <Tooltip title="Enviar WhatsApp">
                              <IconButton 
                                onClick={handleWhatsApp} 
                                color="success"
                                size="small"
                                sx={{ bgcolor: 'success.light' }}
                              >
                                <WhatsAppIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Llamar">
                              <IconButton 
                                onClick={handleCall} 
                                color="primary"
                                size="small"
                                sx={{ bgcolor: 'primary.light' }}
                              >
                                <PhoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Stack>

                        {invoice.clientAddress && (
                          <Stack spacing={1}>
                            <Typography variant="subtitle2" color="text.secondary">
                              Dirección de entrega
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                              <LocationIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.5 }} />
                              <Typography variant="body1" fontWeight={500}>
                                {invoice.clientAddress}
                              </Typography>
                            </Stack>
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Columna derecha - Información de la factura */}
              <Grid item xs={12} md={6}>
                <Card 
                  elevation={0}
                  sx={{ 
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                      Información del Documento
                    </Typography>
                    
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ border: 'none', color: 'text.secondary' }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <CalendarIcon fontSize="small" />
                                <span>Creada:</span>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ border: 'none', fontWeight: 500 }}>
                              {formatDate(invoice.createdAt)}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ border: 'none', color: 'text.secondary' }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <CalendarIcon fontSize="small" />
                                <span>Actualizada:</span>
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ border: 'none', fontWeight: 500 }}>
                              {formatDate(invoice.updatedAt)}
                            </TableCell>
                          </TableRow>
                          {invoice.deliveredAt && (
                            <TableRow>
                              <TableCell sx={{ border: 'none', color: 'text.secondary' }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <CheckIcon fontSize="small" />
                                  <span>Despachada:</span>
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ border: 'none', fontWeight: 500 }}>
                                {formatDate(invoice.deliveredAt)}
                              </TableCell>
                            </TableRow>
                          )}
                          {invoice.userEmail && (
                            <TableRow>
                              <TableCell sx={{ border: 'none', color: 'text.secondary' }}>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <EmailIcon fontSize="small" />
                                  <span>Creada por:</span>
                                </Stack>
                              </TableCell>
                              <TableCell sx={{ border: 'none', fontWeight: 500 }}>
                                {invoice.userEmail}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Estadísticas rápidas */}
                    <Box sx={{ 
                      mt: 4, 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider'
                    }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                        Resumen
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Stack alignItems="center">
                            <Typography variant="h5" fontWeight={700} color="primary.main">
                              {invoice.photos.length}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Imágenes
                            </Typography>
                          </Stack>
                        </Grid>
                        <Grid item xs={6}>
                          <Stack alignItems="center">
                            <Typography variant="h5" fontWeight={700} color="secondary.main">
                              {invoice.deliveries?.length || 0}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Entregas
                            </Typography>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && invoice.photos.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Galería de Imágenes ({invoice.photos.length})
              </Typography>
              <Grid container spacing={3}>
                {invoice.photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 4
                        }
                      }}
                      onClick={() => {
                        setSelectedImageIndex(index);
                        setSelectedDelivery(null);
                        setImageDialogOpen(true);
                      }}
                    >
                      <Box sx={{ position: 'relative', pt: '75%' }}>
                        <Box
                          component="img"
                          src={photo}
                          alt={`Factura ${index + 1}`}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderTopLeftRadius: 8,
                            borderTopRightRadius: 8,
                          }}
                        />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            borderRadius: 1,
                            px: 1,
                            py: 0.5,
                          }}
                        >
                          <Typography variant="caption">
                            #{index + 1}
                          </Typography>
                        </Box>
                      </Box>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Imagen {index + 1}
                          </Typography>
                          <IconButton size="small">
                            <FullscreenIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {activeTab === 2 && invoice.deliveries && invoice.deliveries.length > 0 && (
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Historial de Entregas ({invoice.deliveries.length})
              </Typography>
              <Grid container spacing={3}>
                {invoice.deliveries.map((delivery: any, index: number) => (
                  <Grid item xs={12} md={6} key={index}>
                    <Card 
                      elevation={1}
                      sx={{ 
                        height: '100%',
                        borderLeft: 4,
                        borderColor: 'primary.main',
                        borderRadius: 2
                      }}
                    >
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                          <Box>
                            <Typography variant="h6" fontWeight={600} color="primary.main">
                              Entrega #{index + 1}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {delivery.date ? formatDate(delivery.date.toDate()) : 'Fecha no disponible'}
                            </Typography>
                          </Box>
                          <Chip
                            label={`Por: ${delivery.deliveredBy || 'Sistema'}`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>

                        {delivery.notes && (
                          <Box sx={{ 
                            mb: 3, 
                            p: 2, 
                            bgcolor: 'grey.50', 
                            borderRadius: 1,
                            borderLeft: 3,
                            borderColor: 'primary.light'
                          }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              {delivery.notes}
                            </Typography>
                          </Box>
                        )}

                        {delivery.photos && delivery.photos.length > 0 && (
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                              Imágenes ({delivery.photos.length})
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                              {delivery.photos.map((photo: string, photoIndex: number) => (
                                <Box
                                  key={photoIndex}
                                  component="img"
                                  src={photo}
                                  alt={`Entrega ${index + 1} - Foto ${photoIndex + 1}`}
                                  sx={{
                                    width: 80,
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      boxShadow: 2
                                    }
                                  }}
                                  onClick={() => {
                                    setSelectedDelivery(index);
                                    setSelectedImageIndex(photoIndex);
                                    setImageDialogOpen(true);
                                  }}
                                />
                              ))}
                            </Stack>
                          </Box>
                        )}

                        {!delivery.notes && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<NoteAddIcon />}
                            onClick={() => {
                              setSelectedDelivery(index);
                              setEditDialogOpen(true);
                            }}
                            sx={{ textTransform: 'none' }}
                          >
                            Agregar Nota
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Diálogo para ver imagen */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: '90vh',
            borderRadius: 2
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedDelivery !== null ? `Entrega #${selectedDelivery + 1}` : 'Factura'}
            </Typography>
            <IconButton onClick={() => setImageDialogOpen(false)}>
              <CancelIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {imageUrls && imageUrls[selectedImageIndex] && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400 
            }}>
              <Box
                component="img"
                src={imageUrls[selectedImageIndex]}
                alt="Imagen ampliada"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo para agregar nota */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            Agregar Nota a la Entrega
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            placeholder="Describe los detalles de esta entrega..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              sx: { fontSize: '0.95rem' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            variant="outlined"
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => {
              if (selectedDelivery !== null) {
                handleAddDeliveryNote(selectedDelivery, editNotes);
              }
            }}
            disabled={!editNotes.trim()}
            sx={{ textTransform: 'none' }}
          >
            Guardar Nota
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetailScreenDesktop;