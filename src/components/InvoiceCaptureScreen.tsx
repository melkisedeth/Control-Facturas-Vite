import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { v4 as uuidv4 } from 'uuid';
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
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

const InvoiceCaptureScreen: React.FC = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    // Aquí podrías implementar lógica para generar números secuenciales
    return `F-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}-${currentYear}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      // Guardar en Firestore
      await addDoc(collection(db, 'invoices'), {
        id: invoiceId,
        invoiceNumber,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientAddress: clientAddress.trim(),
        photos: photoUrls,
        status: 'Pendiente',
        deliveries: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Limpiar formulario
      setClientName('');
      setClientPhone('');
      setClientAddress('');
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
          <TextField
            fullWidth
            label="Nombre del cliente*"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="Teléfono del cliente*"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            required
            disabled={loading}
          />
          
          <TextField
            fullWidth
            label="Dirección (opcional)"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            multiline
            rows={2}
            disabled={loading}
          />

          <div>
            <Typography variant="subtitle1" className="mb-2">
              Fotos de la factura ({photos.length}/3)
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

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <Typography variant="body2">
                Subiendo imágenes: {Math.round(uploadProgress)}%
              </Typography>
              <LinearProgress variant="determinate" value={uploadProgress} />
            </div>
          )}

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || photos.length === 0}
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
    </Container>
  );
};

export default InvoiceCaptureScreen;