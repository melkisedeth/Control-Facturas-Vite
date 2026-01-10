import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Invoice } from '../types/invoice';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tab,
  Tabs,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  LocalShipping as ShippingIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const AdminPanelScreen: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [status, setStatus] = useState('Pendiente');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'invoices'),
        orderBy('createdAt', 'desc')
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
    } catch (err) {
      console.error('Error fetching invoices:', err);
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

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus = tabIndex === 0 ? true :
      tabIndex === 1 ? invoice.status !== 'Despachada' :
      invoice.status === 'Despachada';
    
    const matchesSearch = search === '' ? true :
      invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
      invoice.clientPhone.includes(search) ||
      (invoice.userEmail?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    return matchesStatus && matchesSearch;
  });

  const handleDelete = async () => {
    if (!selectedInvoice?.id) return;

    try {
      await deleteDoc(doc(db, 'invoices', selectedInvoice.id));
      setInvoices(invoices.filter(inv => inv.id !== selectedInvoice.id));
      setDeleteDialogOpen(false);
      setSelectedInvoice(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const handleEdit = async () => {
    if (!selectedInvoice?.id) return;

    try {
      setUpdating(true);
      await updateDoc(doc(db, 'invoices', selectedInvoice.id), {
        clientName,
        clientPhone,
        clientAddress,
        status,
        updatedAt: serverTimestamp(),
      });

      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, clientName, clientPhone, clientAddress, status: status as "Pendiente" | "Parcial" | "Despachada" }
          : inv
      ));
      
      setEditDialogOpen(false);
      setSelectedInvoice(null);
    } catch (err) {
      console.error('Error updating invoice:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedMenuIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMenuIndex(null);
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'No disponible';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  };

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Header */}
      <Paper className="p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <Typography variant="h4" className="font-bold">
              Panel de Administración
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {invoices.length} facturas registradas
            </Typography>
          </div>
          
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
            >
              Volver
            </Button>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchInvoices}
              disabled={loading}
            >
              Actualizar
            </Button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <Grid container spacing={3} className="mb-6">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar facturas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon className="mr-2" color="action" />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Tabs
              value={tabIndex}
              onChange={(_, value) => setTabIndex(value)}
              variant="fullWidth"
            >
              <Tab label="Todas" />
              <Tab label="Pendientes" />
              <Tab label="Despachadas" />
            </Tabs>
          </Grid>
        </Grid>

        {/* Tabla de facturas */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <CircularProgress />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Alert severity="info" className="mb-4">
            No se encontraron facturas con los filtros aplicados
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Factura</TableCell>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Creada</TableCell>
                    <TableCell>Fotos</TableCell>
                    <TableCell>Entregas</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((invoice, index) => (
                      <TableRow key={invoice.id} hover>
                        <TableCell>
                          <Typography variant="body2" className="font-medium">
                            {invoice.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{invoice.clientName}</TableCell>
                        <TableCell>{invoice.clientPhone}</TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.status}
                            color={getStatusColor(invoice.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(invoice.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>{invoice.photos.length}</TableCell>
                        <TableCell>{invoice.deliveries?.length || 0}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="textSecondary">
                            {invoice.userEmail || 'Sistema'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuClick(e, index)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                          
                          <Menu
                            anchorEl={anchorEl}
                            open={selectedMenuIndex === index}
                            onClose={handleMenuClose}
                          >
                            <MenuItem onClick={() => {
                              navigate(`/invoice/${invoice.id}`);
                              handleMenuClose();
                            }}>
                              <VisibilityIcon fontSize="small" className="mr-2" />
                              Ver Detalles
                            </MenuItem>
                            <MenuItem onClick={() => {
                              setSelectedInvoice(invoice);
                              setClientName(invoice.clientName);
                              setClientPhone(invoice.clientPhone);
                              setClientAddress(invoice.clientAddress || '');
                              setStatus(invoice.status);
                              setEditDialogOpen(true);
                              handleMenuClose();
                            }}>
                              <EditIcon fontSize="small" className="mr-2" />
                              Editar
                            </MenuItem>
                            <MenuItem onClick={() => {
                              navigate(`/quick-delivery/${invoice.id}`);
                              handleMenuClose();
                            }}>
                              <ShippingIcon fontSize="small" className="mr-2" />
                              Agregar Entrega
                            </MenuItem>
                            <MenuItem onClick={() => {
                              setSelectedInvoice(invoice);
                              setDeleteDialogOpen(true);
                              handleMenuClose();
                            }} className="text-red-600">
                              <DeleteIcon fontSize="small" className="mr-2" />
                              Eliminar
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={filteredInvoices.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              labelRowsPerPage="Filas por página:"
            />
          </>
        )}
      </Paper>

      {/* Estadísticas */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Facturas
              </Typography>
              <Typography variant="h4" className="font-bold">
                {invoices.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pendientes
              </Typography>
              <Typography variant="h4" className="font-bold text-yellow-600">
                {invoices.filter(i => i.status === 'Pendiente').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Despachadas
              </Typography>
              <Typography variant="h4" className="font-bold text-green-600">
                {invoices.filter(i => i.status === 'Despachada').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar la factura{' '}
            <strong>{selectedInvoice?.invoiceNumber}</strong>?
          </Typography>
          <Alert severity="warning" className="mt-3">
            Esta acción no se puede deshacer.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de edición */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Factura</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Número de Factura"
              value={selectedInvoice?.invoiceNumber || ''}
              disabled
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Nombre del Cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              variant="outlined"
              required
            />
            <TextField
              fullWidth
              label="Teléfono"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              variant="outlined"
              required
            />
            <TextField
              fullWidth
              label="Dirección"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              variant="outlined"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              select
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              variant="outlined"
            >
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="Parcial">Parcial</MenuItem>
              <MenuItem value="Despachada">Despachada</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={updating}>
            Cancelar
          </Button>
          <Button
            onClick={handleEdit}
            variant="contained"
            disabled={updating || !clientName || !clientPhone}
          >
            {updating ? <CircularProgress size={20} /> : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanelScreen;