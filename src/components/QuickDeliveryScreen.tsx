import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { v4 as uuidv4 } from 'uuid';
import { Invoice } from '../types/invoice';
import {
  Container,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  LinearProgress,
  CircularProgress,
  Box,
  Alert,
  Stack,
  Grid,
  Card,
  CardContent,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const QuickDeliveryScreen: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    } else {
      setError('ID de factura no proporcionado');
      setLoading(false);
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    if (!invoiceId) return;
    
    try {
      setLoading(true);
      setError('');
      const docRef = doc(db, 'invoices', invoiceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setInvoice({
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
        });
      } else {
        setError('Factura no encontrada');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Error al cargar la factura. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newPhotos = Array.from(event.target.files);
      if (photos.length + newPhotos.length <= 3) {
        setPhotos([...photos, ...newPhotos]);
        setError('');
      } else {
        setError('Solo puedes adjuntar 3 fotos por entrega');
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileName = `${uuidv4()}_${file.name}`;
    const storageRef = ref(storage, `deliveries/${fileName}`);
    
    const uploadTask = uploadBytes(storageRef, file);
    await uploadTask;
    return await getDownloadURL(storageRef);
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError('Debe tomar al menos una foto del comprobante');
      return;
    }

    if (!invoiceId || !invoice) {
      setError('Datos de factura no disponibles');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setUploadProgress(0);

      // Subir fotos
      const photoUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const url = await uploadImage(photos[i]);
          photoUrls.push(url);
          setUploadProgress(((i + 1) / photos.length) * 100);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          throw new Error('Error al subir las imágenes. Verifica tu conexión.');
        }
      }

      // Crear entrega CON TIMESTAMP CLIENTE (no serverTimestamp en arrays)
      const delivery = {
        date: Timestamp.now(), // Usar Timestamp.now() en lugar de serverTimestamp()
        photos: photoUrls,
        notes: notes.trim(),
        deliveredBy: 'Sistema',
      };

      // Determinar nuevo estado
      const isFinalDelivery = false; // Puedes cambiar esta lógica
      const newStatus = isFinalDelivery ? 'Despachada' : 'Parcial';

      // Actualizar documento - IMPORTANTE: no usar serverTimestamp() dentro del array
      const invoiceRef = doc(db, 'invoices', invoiceId);
      await updateDoc(invoiceRef, {
        status: newStatus,
        deliveries: [...(invoice.deliveries || []), delivery],
        updatedAt: Timestamp.now(), // Usar Timestamp.now() aquí también
      });

      // Mostrar éxito
      showSnackbar('✅ Entrega registrada correctamente');
      setSuccess(true);
      
      // Esperar 2 segundos y volver
      setTimeout(() => {
        navigate(-1);
      }, 2000);

    } catch (err: any) {
      console.error('Error saving delivery:', err);
      const errorMessage = err.message || 'Error al registrar la entrega';
      setError(errorMessage);
      showSnackbar(`❌ ${errorMessage}`);
    } finally {
      setSaving(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  if (loading) {
    return (
      <Container maxWidth="md" className="py-8">
        <Box className="flex flex-col justify-center items-center h-64 space-y-4">
          <CircularProgress size={60} />
          <Typography>Cargando información de la factura...</Typography>
        </Box>
      </Container>
    );
  }

  if (error && !invoice) {
    return (
      <Container maxWidth="md" className="py-8">
        <Paper className="p-6">
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" className="py-8">
      <Paper className="p-6 shadow-lg">
        {/* Header */}
        <Box className="mb-6">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            disabled={saving}
            className="mb-4"
          >
            Volver
          </Button>
          
          <Typography variant="h4" className="font-bold text-gray-800 mb-2">
            Registro Rápido de Entrega
          </Typography>
          
          {invoice && (
            <Card variant="outlined" className="mb-4">
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box className="flex items-center mb-2">
                      <ReceiptIcon className="mr-2 text-blue-600" />
                      <Typography variant="subtitle1" className="font-semibold">
                        Factura: {invoice.invoiceNumber}
                      </Typography>
                    </Box>
                    <Box className="flex items-center">
                      <PersonIcon fontSize="small" className="mr-2 text-gray-500" />
                      <Typography variant="body2" color="textSecondary">
                        {invoice.clientName}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box className="flex items-center">
                      <PhoneIcon fontSize="small" className="mr-2 text-gray-500" />
                      <Typography variant="body2" color="textSecondary">
                        {invoice.clientPhone}
                      </Typography>
                    </Box>
                    {invoice.clientAddress && (
                      <Typography variant="body2" color="textSecondary" className="mt-1">
                        {invoice.clientAddress}
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Mensajes de error */}
        {error && !success && (
          <Alert severity="error" className="mb-4" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" className="mb-4">
            ¡Entrega registrada correctamente! Redirigiendo...
          </Alert>
        )}

        <Box className="space-y-6">
          {/* Campo de notas */}
          <Box>
            <Typography variant="subtitle1" className="font-semibold mb-2">
              Observaciones (opcional)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ej: Cliente llevó 10 bultos de cemento y 3 varillas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving || success}
              variant="outlined"
              helperText="Agrega cualquier detalle relevante sobre la entrega"
            />
          </Box>

          {/* Sección de fotos */}
          <Box>
            <Typography variant="subtitle1" className="font-semibold mb-2">
              Comprobante de Entrega ({photos.length}/3)
            </Typography>
            <Typography variant="body2" color="textSecondary" className="mb-4">
              Tome fotos del vale, remisión o firma del cliente
            </Typography>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              disabled={saving || success || photos.length >= 3}
              className="hidden"
              id="delivery-photo-upload"
              capture="environment"
            />
            
            <label htmlFor="delivery-photo-upload">
              <Button
                variant="contained"
                component="span"
                startIcon={<CameraIcon />}
                disabled={saving || success || photos.length >= 3}
                fullWidth
                className="mb-4"
                size="large"
              >
                {photos.length >= 3 ? 'Límite alcanzado' : 'Tomar Foto'}
              </Button>
            </label>

            {/* Vista previa de fotos */}
            {photos.length > 0 && (
              <Box className="mb-4">
                <Typography variant="body2" className="mb-2">
                  Fotos seleccionadas:
                </Typography>
                <Grid container spacing={2}>
                  {photos.map((photo, index) => (
                    <Grid item xs={6} sm={4} key={index}>
                      <Box className="relative">
                        <img
                          src={URL.createObjectURL(photo)}
                          alt={`Entrega ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow"
                        />
                        <IconButton
                          size="small"
                          className="absolute top-1 right-1 bg-red-500 text-white hover:bg-red-600"
                          onClick={() => removePhoto(index)}
                          disabled={saving || success}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="caption" className="block text-center mt-1">
                          Foto {index + 1}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </Box>

          {/* Barra de progreso */}
          {uploadProgress > 0 && (
            <Box className="space-y-2">
              <Typography variant="body2">
                Subiendo imágenes: {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </Box>
          )}

          {/* Botones de acción */}
          <Stack spacing={2}>
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <CheckIcon />}
              onClick={handleSubmit}
              disabled={saving || success || photos.length === 0}
              fullWidth
            >
              {saving ? 'Guardando...' : success ? '¡Guardado!' : 'Guardar Entrega'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={saving}
              fullWidth
            >
              Cancelar
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Snackbar para notificaciones */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleCloseSnackbar}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />
    </Container>
  );
};

export default QuickDeliveryScreen;