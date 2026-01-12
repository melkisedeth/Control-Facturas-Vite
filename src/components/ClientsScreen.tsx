import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Client } from '../types/client';
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
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Note as NoteIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

const ClientsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMenuIndex, setSelectedMenuIndex] = useState<number | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    filterClients();
  }, [search, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'clients'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      const clientsList: Client[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientsList.push({
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || undefined,
          address: data.address || undefined,
          notes: data.notes || undefined,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy || undefined,
          invoiceCount: data.invoiceCount || 0,
        });
      });
      
      setClients(clientsList);
      setFilteredClients(clientsList);
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterClients = () => {
    if (!search.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(searchLower) ||
      client.phone.includes(search) ||
      (client.email?.toLowerCase().includes(searchLower) ?? false) ||
      (client.address?.toLowerCase().includes(searchLower) ?? false)
    );
    
    setFilteredClients(filtered);
  };

  const handleAddClick = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setDialogOpen(true);
  };

  const handleDeleteClick = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      alert('Nombre y teléfono son obligatorios');
      return;
    }

    try {
      setSaving(true);
      const clientData = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        updatedAt: serverTimestamp(),
        ...(editingClient ? {} : {
          createdAt: serverTimestamp(),
        })
      };

      if (editingClient?.id) {
        await updateDoc(doc(db, 'clients', editingClient.id), clientData);
        setClients(clients.map(c => 
          c.id === editingClient.id 
            ? { 
                ...c, 
                name: clientData.name,
                phone: clientData.phone,
                email: clientData.email || undefined,
                address: clientData.address || undefined,
                notes: clientData.notes || undefined,
                updatedAt: new Date(),
              } 
            : c
        ));
      } else {
        const docRef = await addDoc(collection(db, 'clients'), clientData);
        const newClient: Client = {
          id: docRef.id,
          name: clientData.name,
          phone: clientData.phone,
          email: clientData.email || undefined,
          address: clientData.address || undefined,
          notes: clientData.notes || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          invoiceCount: 0,
        };
        setClients([newClient, ...clients]);
      }

      setDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving client:', err);
      alert('Error al guardar el cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient?.id) return;

    try {
      await deleteDoc(doc(db, 'clients', selectedClient.id));
      setClients(clients.filter(c => c.id !== selectedClient.id));
      setDeleteDialogOpen(false);
      setSelectedClient(null);
    } catch (err) {
      console.error('Error deleting client:', err);
      alert('Error al eliminar el cliente');
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedMenuIndex(index);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMenuIndex(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
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
              Gestión de Clientes
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {clients.length} clientes registrados
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
              onClick={fetchClients}
              disabled={loading}
            >
              Actualizar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
            >
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Búsqueda */}
        <Grid container spacing={3} className="mb-6">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon className="mr-2" color="action" />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} className="flex items-center">
            <Chip
              label={`${filteredClients.length} resultados`}
              color="primary"
              variant="outlined"
              className="ml-2"
            />
          </Grid>
        </Grid>

        {/* Tabla de clientes */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <CircularProgress />
          </div>
        ) : filteredClients.length === 0 ? (
          <Alert severity="info" className="mb-4">
            {search ? 'No se encontraron clientes con los filtros aplicados' : 'No hay clientes registrados'}
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Cliente</TableCell>
                    <TableCell>Contacto</TableCell>
                    <TableCell>Dirección</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell>Registrado</TableCell>
                    <TableCell>Facturas</TableCell>
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredClients
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((client, index) => (
                      <TableRow key={client.id} hover>
                        <TableCell>
                          <div className="flex items-center">
                            <Avatar className="mr-3" sx={{ bgcolor: 'primary.main' }}>
                              {getInitials(client.name)}
                            </Avatar>
                            <div>
                              <Typography variant="body1" className="font-medium">
                                {client.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {client.createdBy || 'Sistema'}
                              </Typography>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="flex items-center">
                              <PhoneIcon fontSize="small" className="mr-1" />
                              <Typography variant="body2">{client.phone}</Typography>
                            </div>
                            {client.email && (
                              <div className="flex items-center mt-1">
                                <EmailIcon fontSize="small" className="mr-1" />
                                <Typography variant="body2" color="textSecondary">
                                  {client.email}
                                </Typography>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {client.address ? (
                            <Typography variant="body2">{client.address}</Typography>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              Sin dirección
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.notes ? (
                            <Tooltip title={client.notes}>
                              <Typography variant="body2" className="truncate max-w-xs">
                                {client.notes}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="textSecondary">
                              Sin notas
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(client.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={client.invoiceCount || 0}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
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
                              handleEditClick(client);
                              handleMenuClose();
                            }}>
                              <EditIcon fontSize="small" className="mr-2" />
                              Editar
                            </MenuItem>
                            <MenuItem onClick={() => {
                              handleDeleteClick(client);
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
              count={filteredClients.length}
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Clientes
              </Typography>
              <Typography variant="h4" className="font-bold">
                {clients.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Con Email
              </Typography>
              <Typography variant="h4" className="font-bold text-blue-600">
                {clients.filter(c => c.email).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Con Dirección
              </Typography>
              <Typography variant="h4" className="font-bold text-green-600">
                {clients.filter(c => c.address).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Con Notas
              </Typography>
              <Typography variant="h4" className="font-bold text-purple-600">
                {clients.filter(c => c.notes).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de edición/creación */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-4 mt-2">
            <TextField
              fullWidth
              label="Nombre completo*"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              required
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Teléfono*"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              variant="outlined"
              required
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="outlined"
              type="email"
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Dirección"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              variant="outlined"
              multiline
              rows={2}
              disabled={saving}
            />
            <TextField
              fullWidth
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              variant="outlined"
              multiline
              rows={3}
              disabled={saving}
              helperText="Información adicional sobre el cliente"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving || !name.trim() || !phone.trim()}
            startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar al cliente{' '}
            <strong>{selectedClient?.name}</strong>?
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
    </Container>
  );
};

export default ClientsScreen;