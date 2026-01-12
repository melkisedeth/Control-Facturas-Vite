import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { v4 as uuidv4 } from 'uuid';
import { Client } from '../types/client';
import {
  Container,
  Paper,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  LinearProgress,
  Typography,
  Box,
  Autocomplete,
  Chip,
  Alert,
  Stack,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

const InvoiceCaptureScreen: React.FC = () => {
  const navigate = useNavigate();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  
  // Form fields for new client
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const q = query(
        collection(db, 'clients'),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      
      const clientsList: Client[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        clientsList.push({
          id: doc.id,
          name: data.name || '',
          phone: data.phone || '',
          email: data.email,
          address: data.address,
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
        });
      });
      
      setClients(clientsList);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newPhotos = Array.from(event.target.files);
      if (photos.length + newPhotos.length <= 3) {
        setPhotos([...photos, ...newPhotos]);
      } else {
        alert('Solo puedes adjuntar 3 fotos por factura');
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${uuidv4()}_${file.name}`;
    const storageRef = ref(storage, `invoices/${fileName}`);
    
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const generateInvoiceNumber = async () => {
    const currentYear = new Date().getFullYear();
    // Implementa lógica para números secuenciales
    const count = clients.length + 1;
    return `F-${count.toString().padStart(3, '0')}-${currentYear}`;
  };

  const handleSaveClient = async () => {
    if (!newClientName.trim() || !newClientPhone.trim()) {
      alert('Nombre y teléfono son obligatorios');
      return;
    }

    try {
      setSavingClient(true);
      const clientData = {
        name: newClientName.trim(),
        phone: newClientPhone.trim(),
        email: newClientEmail.trim() || null,
        address: newClientAddress.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'clients'), clientData);
      const newClient: Client = {
        id: docRef.id,
        ...clientData,
        email: clientData.email ?? undefined,
        address: clientData.address ?? undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setClients([...clients, newClient]);
      setSelectedClient(newClient);
      setClientDialogOpen(false);
      resetNewClientForm();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente');
    } finally {
      setSavingClient(false);
    }
  };

  const resetNewClientForm = () => {
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientAddress('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      alert('Debe seleccionar un cliente');
      return;
    }

    if (photos.length === 0) {
      alert('Debe tomar al menos una foto de la factura');
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);

      // Subir fotos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const url = await uploadImage(photos[i]);
        photoUrls.push(url);
        setUploadProgress(((i + 1) / photos.length) * 100);
      }

      const invoiceNumber = await generateInvoiceNumber();
      const invoiceId = uuidv4();

      // Guardar con referencia al cliente
      await addDoc(collection(db, 'invoices'), {
        id: invoiceId,
        invoiceNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientPhone: selectedClient.phone,
        clientEmail: selectedClient.email,
        clientAddress: selectedClient.address,
        photos: photoUrls,
        status: 'Pendiente',
        deliveries: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Limpiar formulario
      setSelectedClient(null);
      setPhotos([]);
      
      alert(`Factura ${invoiceNumber} guardada correctamente`);
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error al guardar factura:', error);
      alert('Error al guardar la factura');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Container maxWidth="md" className="py-8">
      <Paper className="p-6">
        <div className="flex items-center mb-6">
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" className="ml-2">
            Nueva Factura
          </Typography>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Selección de cliente */}
          <div>
            <Typography variant="subtitle1" className="mb-2 font-semibold">
              Cliente *
            </Typography>
            
            <div className="mb-4">
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => `${option.name} - ${option.phone}`}
                value={selectedClient}
                onChange={(_, newValue) => setSelectedClient(newValue)}
                inputValue={searchInput}
                onInputChange={(_, newInputValue) => setSearchInput(newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Buscar cliente..."
                    variant="outlined"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <SearchIcon className="mr-2" />
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <div className="w-full">
                      <div className="flex items-center">
                        <PersonIcon className="mr-2 text-gray-400" />
                        <div>
                          <Typography variant="body1">{option.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {option.phone} {option.email && `• ${option.email}`}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </li>
                )}
              />
            </div>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setClientDialogOpen(true)}
              fullWidth
            >
              Crear Nuevo Cliente
            </Button>
          </div>

          {/* Información del cliente seleccionado */}
          {selectedClient && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" className="font-semibold mb-2">
                  Información del Cliente
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <div className="flex items-center">
                      <PersonIcon className="mr-2 text-gray-500" />
                      <Typography variant="body1">{selectedClient.name}</Typography>
                    </div>
                  </Grid>
                  <Grid item xs={12}>
                    <div className="flex items-center">
                      <PhoneIcon className="mr-2 text-gray-500" />
                      <Typography variant="body1">{selectedClient.phone}</Typography>
                    </div>
                  </Grid>
                  {selectedClient.email && (
                    <Grid item xs={12}>
                      <div className="flex items-center">
                        <EmailIcon className="mr-2 text-gray-500" />
                        <Typography variant="body1">{selectedClient.email}</Typography>
                      </div>
                    </Grid>
                  )}
                  {selectedClient.address && (
                    <Grid item xs={12}>
                      <div className="flex items-center">
                        <LocationIcon className="mr-2 text-gray-500" />
                        <Typography variant="body1">{selectedClient.address}</Typography>
                      </div>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Fotos */}
          <div>
            <Typography variant="subtitle1" className="mb-2 font-semibold">
              Fotos de la factura ({photos.length}/3) *
            </Typography>
            
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              disabled={loading || photos.length >= 3}
              className="hidden"
              id="photo-upload"
            />
            
            <label htmlFor="photo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CameraIcon />}
                disabled={loading || photos.length >= 3}
                fullWidth
              >
                {photos.length >= 3 ? 'Límite alcanzado' : 'Tomar foto'}
              </Button>
            </label>
          </div>

          {/* Vista previa de fotos */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {photos.map((photo, index) => (
                <Box key={index} className="relative">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Foto ${index + 1}`}
                    className="w-24 h-24 object-cover rounded"
                  />
                  <IconButton
                    size="small"
                    className="absolute -top-2 -right-2 bg-red-500 text-white"
                    onClick={() => removePhoto(index)}
                    disabled={loading}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </div>
          )}

          {/* Progreso de carga */}
          {uploadProgress > 0 && (
            <div className="space-y-2">
              <Typography variant="body2">
                Subiendo imágenes: {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </div>
          )}

          {/* Botón de guardar */}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || photos.length === 0 || !selectedClient}
            fullWidth
            size="large"
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Guardar Factura'
            )}
          </Button>
        </form>
      </Paper>

      {/* Diálogo para crear nuevo cliente */}
      <Dialog
        open={clientDialogOpen}
        onClose={() => setClientDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Crear Nuevo Cliente</DialogTitle>
        <DialogContent>
          <Stack spacing={3} className="mt-2">
            <TextField
              fullWidth
              label="Nombre completo *"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              variant="outlined"
              required
              disabled={savingClient}
            />
            <TextField
              fullWidth
              label="Teléfono *"
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              variant="outlined"
              required
              disabled={savingClient}
            />
            <TextField
              fullWidth
              label="Email"
              value={newClientEmail}
              onChange={(e) => setNewClientEmail(e.target.value)}
              variant="outlined"
              type="email"
              disabled={savingClient}
            />
            <TextField
              fullWidth
              label="Dirección"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
              variant="outlined"
              multiline
              rows={2}
              disabled={savingClient}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setClientDialogOpen(false);
              resetNewClientForm();
            }}
            disabled={savingClient}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSaveClient}
            variant="contained"
            disabled={savingClient || !newClientName.trim() || !newClientPhone.trim()}
          >
            {savingClient ? 'Guardando...' : 'Guardar Cliente'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceCaptureScreen;