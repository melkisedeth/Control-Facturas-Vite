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
  Badge,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  InputAdornment,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  Edit as EditIcon,
  CheckCircle as CheckIcon,
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Fullscreen as FullscreenIcon,
  NoteAdd as NoteAddIcon,
  ArrowForward as ArrowForwardIcon,
  Print as PrintIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Image as ImageIcon,
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  Check as CheckIconCopy,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

// ─── Tracking URL helper ───────────────────────────────────────────────────────
const getTrackingUrl = (invoiceId: string) =>
  `${window.location.origin}/Control-Facturas-Vite/tracking/${invoiceId}`;

// ─── Share Dialog ──────────────────────────────────────────────────────────────
const ShareDialog: React.FC<{
  open: boolean;
  invoiceId: string;
  invoiceNumber: string;
  clientPhone?: string;
  onClose: () => void;
}> = ({ open, invoiceId, invoiceNumber, clientPhone, onClose }) => {
  const [copied, setCopied] = useState(false);
  const url = getTrackingUrl(invoiceId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hola — Factura *${invoiceNumber}*, puedes ver el estado de tu pedido aquí:\n${url}`
    );
    const phone = clientPhone ? `57${clientPhone.replace(/\D/g, '')}` : '';
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: 1.5, bgcolor: '#eff6ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ShareIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Compartir seguimiento</Typography>
            <Typography variant="caption" color="text.secondary">Factura {invoiceNumber}</Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Comparte este enlace con tu cliente para que pueda ver el estado de su pedido en tiempo real, sin necesidad de iniciar sesión.
        </Typography>

        {/* URL field */}
        <TextField
          fullWidth
          value={url}
          size="small"
          InputProps={{
            readOnly: true,
            sx: { fontFamily: 'monospace', fontSize: '0.8rem', bgcolor: '#f8fafc' },
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={copied ? '¡Copiado!' : 'Copiar'}>
                  <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                    {copied ? <CheckIconCopy fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          }}
          sx={{ mb: 3 }}
        />

        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
          Compartir vía
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<WhatsAppIcon />}
            onClick={handleWhatsApp}
            sx={{ bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            WhatsApp
          </Button>
          <Button
            variant="outlined"
            startIcon={copied ? <CheckIconCopy /> : <CopyIcon />}
            onClick={handleCopy}
            color={copied ? 'success' : 'inherit'}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
          <Tooltip title="Abrir como cliente">
            <IconButton size="small" onClick={() => window.open(url, '_blank')} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox: React.FC<{
  open: boolean;
  photos: string[];
  index: number;
  title: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}> = ({ open, photos, index, title, onClose, onNavigate }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onNavigate((index + 1) % photos.length);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, index, photos.length]);

  if (!photos.length) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'rgba(8,8,18,0.97)', borderRadius: 3, overflow: 'hidden' } }}
    >
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ImageIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} />
          <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{title}</Typography>
          <Chip
            label={`${index + 1} / ${photos.length}`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: '0.72rem' }}
          />
        </Stack>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420, p: 2 }}>
        {photos.length > 1 && (
          <IconButton
            onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
            sx={{ position: 'absolute', left: 12, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, backdropFilter: 'blur(6px)' }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        <Box
          component="img"
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          sx={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        />
        {photos.length > 1 && (
          <IconButton
            onClick={() => onNavigate((index + 1) % photos.length)}
            sx={{ position: 'absolute', right: 12, bgcolor: 'rgba(255,255,255,0.1)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }, backdropFilter: 'blur(6px)' }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      {photos.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, p: 2, overflowX: 'auto', bgcolor: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: photos.length <= 7 ? 'center' : 'flex-start' }}>
          {photos.map((p, i) => (
            <Box
              key={i}
              component="img"
              src={p}
              onClick={() => onNavigate(i)}
              sx={{
                width: 60, height: 60, objectFit: 'cover', borderRadius: 1.5, cursor: 'pointer', flexShrink: 0,
                border: i === index ? '2px solid #60a5fa' : '2px solid transparent',
                opacity: i === index ? 1 : 0.45,
                transition: 'all 0.15s',
                '&:hover': { opacity: 0.85, transform: 'scale(1.06)' },
              }}
            />
          ))}
        </Box>
      )}
    </Dialog>
  );
};

// ─── Inline Photo Grid ────────────────────────────────────────────────────────
const PhotoGrid: React.FC<{
  photos: string[];
  onOpen: (index: number) => void;
}> = ({ photos, onOpen }) => {
  const MAX = 8;
  const overflow = photos.length - MAX;
  const visible = photos.slice(0, MAX);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 1.5 }}>
      {visible.map((photo, idx) => (
        <Box
          key={idx}
          sx={{ position: 'relative', cursor: 'pointer', borderRadius: 2, overflow: 'hidden', aspectRatio: '1', '&:hover .overlay': { opacity: 1 } }}
          onClick={() => onOpen(idx)}
        >
          <Box
            component="img"
            src={photo}
            alt={`Foto ${idx + 1}`}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
          />
          <Box
            className="overlay"
            sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
          >
            <FullscreenIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box sx={{ position: 'absolute', top: 6, left: 6, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', px: 0.75, py: 0.25, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700 }}>
            #{idx + 1}
          </Box>
          {idx === MAX - 1 && overflow > 0 && (
            <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>+{overflow}</Typography>
            </Box>
          )}
        </Box>
      ))}
    </Box>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const InvoiceDetailScreenDesktop: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');

  // ─── Admin check ───────────────────────────────────────────────────────────
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxTitle, setLightboxTitle] = useState('');

  const openLightbox = (photos: string[], index: number, title: string) => {
    setLightboxPhotos(photos);
    setLightboxIndex(index);
    setLightboxTitle(title);
    setLightboxOpen(true);
  };

  const [snackCopied, setSnackCopied] = useState(false);

  const handleShare = async () => {
    if (!id) return;
    const url = getTrackingUrl(id);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setSnackCopied(true);
  };

  useEffect(() => {
    if (id) fetchInvoice();
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
      console.error(err);
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
    return format(date, "dd 'de' MMMM yyyy · HH:mm", { locale: es });
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
      setInvoice({ ...invoice, status: newStatus, updatedAt: new Date(), deliveredAt: newStatus === 'Despachada' ? new Date() : undefined });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!id) return;
    try {
      setUpdating(true);
      await updateDoc(doc(db, 'invoices', id), { clientName, clientPhone, clientAddress, updatedAt: serverTimestamp() });
      if (invoice) setInvoice({ ...invoice, clientName, clientPhone, clientAddress, updatedAt: new Date() });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddDeliveryNote = async (deliveryIndex: number, note: string) => {
    if (!id || !invoice?.deliveries) return;
    try {
      const updated = [...invoice.deliveries];
      updated[deliveryIndex] = { ...updated[deliveryIndex], notes: note };
      await updateDoc(doc(db, 'invoices', id), { deliveries: updated, updatedAt: serverTimestamp() });
      setInvoice({ ...invoice, deliveries: updated, updatedAt: new Date() });
      setEditDialogOpen(false);
      setEditNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress size={52} />
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>Factura no encontrada</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} variant="contained">Volver</Button>
      </Container>
    );
  }

  const totalPhotos = invoice.photos.length + (invoice.deliveries?.reduce((acc, d) => acc + (d.photos?.length || 0), 0) || 0);
  const hasDeliveries = invoice.deliveries && invoice.deliveries.length > 0;

  // ─── Admins can always toggle status; non-admins need at least one delivery ──
  const canMarkAsDispatched = invoice.status === 'Despachada' || isAdmin || hasDeliveries;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none' }}
          >
            Volver
          </Button>
          <Stack spacing={0}>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Factura {invoice.invoiceNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Creada el {formatDate(invoice.createdAt)}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            label={invoice.status}
            color={getStatusColor(invoice.status) as any}
            sx={{ fontWeight: 700, fontSize: '0.85rem', height: 32 }}
          />
          <Tooltip
            title={
              !canMarkAsDispatched
                ? 'Debes registrar al menos una entrega antes de marcar como despachada'
                : ''
            }
          >
            <span>
              <Button
                variant={invoice.status === 'Despachada' ? 'outlined' : 'contained'}
                color={invoice.status === 'Despachada' ? 'inherit' : 'success'}
                startIcon={updating ? <CircularProgress size={16} /> : <CheckIcon />}
                onClick={handleStatusChange}
                disabled={updating || !canMarkAsDispatched}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                {invoice.status === 'Despachada' ? 'Marcar como Pendiente' : 'Marcar como Despachada'}
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<ArrowForwardIcon />}
            onClick={() => navigate(`/quick-delivery/${invoice.id}`)}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Registrar Entrega
          </Button>
          {/* ── SHARE BUTTON ── */}
          <Tooltip title="Copia el enlace de seguimiento al portapapeles">
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={handleShare}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'primary.300',
                color: 'primary.main',
                '&:hover': { bgcolor: '#eff6ff', borderColor: 'primary.main' },
              }}
            >
              Copiar enlace
            </Button>
          </Tooltip>
          <IconButton onClick={() => window.print()} size="small">
            <PrintIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {/* ── Two-column layout ─────────────────────────────────── */}
      <Grid container spacing={3}>

        {/* LEFT COLUMN */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3}>

            {/* Cliente */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: 'primary.50', width: 36, height: 36 }}>
                      <PersonIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight={700}>Datos del Cliente</Typography>
                  </Stack>
                  <IconButton size="small" onClick={() => setIsEditing(!isEditing)} color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Stack>

                {isEditing ? (
                  <Stack spacing={2}>
                    <TextField fullWidth label="Nombre" value={clientName} onChange={(e) => setClientName(e.target.value)} size="small" disabled={updating} />
                    <TextField fullWidth label="Teléfono" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} size="small" disabled={updating} />
                    <TextField fullWidth label="Dirección" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} multiline rows={2} size="small" disabled={updating} />
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained" size="small"
                        startIcon={updating ? <CircularProgress size={14} /> : <SaveIcon />}
                        onClick={handleSaveEdit}
                        disabled={updating || !clientName || !clientPhone}
                        sx={{ textTransform: 'none' }}
                      >
                        Guardar
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => setIsEditing(false)} disabled={updating} sx={{ textTransform: 'none' }}>
                        Cancelar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                        Nombre
                      </Typography>
                      <Typography variant="body1" fontWeight={600} sx={{ mt: 0.25 }}>{invoice.clientName}</Typography>
                    </Box>

                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                        Teléfono
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                        <Typography variant="body1" fontWeight={600}>{invoice.clientPhone}</Typography>
                        <Tooltip title="WhatsApp">
                          <IconButton
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#16a34a', '&:hover': { bgcolor: '#bbf7d0' } }}
                            onClick={() => window.open(`https://wa.me/57${invoice.clientPhone.replace(/\D/g, '')}`, '_blank')}
                          >
                            <WhatsAppIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Llamar">
                          <IconButton
                            size="small"
                            sx={{ bgcolor: '#eff6ff', color: '#2563eb', '&:hover': { bgcolor: '#dbeafe' } }}
                            onClick={() => (window.location.href = `tel:${invoice.clientPhone}`)}
                          >
                            <PhoneIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>

                    {invoice.clientAddress && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                          Dirección de entrega
                        </Typography>
                        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 0.25 }}>
                          <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2 }} />
                          <Typography variant="body2" fontWeight={500}>{invoice.clientAddress}</Typography>
                        </Stack>
                      </Box>
                    )}

                    {/* Quick share from client card */}
                    <Box sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<ShareIcon />}
                        onClick={handleShare}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 600,
                          borderColor: 'primary.200',
                          color: 'primary.main',
                          borderStyle: 'dashed',
                          '&:hover': { bgcolor: '#eff6ff', borderStyle: 'solid' },
                        }}
                      >
                        Copiar enlace de seguimiento
                      </Button>
                    </Box>
                  </Stack>
                )}
              </CardContent>
            </Card>

            {/* Registro del documento */}
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                  <Avatar sx={{ bgcolor: 'grey.100', width: 36, height: 36 }}>
                    <DescriptionIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight={700}>Registro del Documento</Typography>
                </Stack>

                <Stack spacing={1.5}>
                  {[
                    { label: 'Fecha de creación', value: formatDate(invoice.createdAt), Icon: CalendarIcon },
                    { label: 'Última actualización', value: formatDate(invoice.updatedAt), Icon: CalendarIcon },
                    ...(invoice.deliveredAt ? [{ label: 'Fecha de despacho', value: formatDate(invoice.deliveredAt), Icon: CheckIcon }] : []),
                    ...(invoice.userEmail ? [{ label: 'Registrado por', value: invoice.userEmail, Icon: EmailIcon }] : []),
                  ].map(({ label, value, Icon }) => (
                    <Box key={label}>
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem', fontWeight: 500 }}>
                        {label}
                      </Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                        <Icon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        <Typography variant="body2" fontWeight={500}>{value}</Typography>
                      </Stack>
                    </Box>
                  ))}
                </Stack>

                {/* Stats */}
                <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Grid container spacing={1}>
                    {[
                      { label: 'Fotos adjuntas', value: totalPhotos, color: 'primary' },
                      { label: 'Entregas', value: invoice.deliveries?.length || 0, color: 'secondary' },
                    ].map(({ label, value, color }) => (
                      <Grid item xs={6} key={label}>
                        <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                          <Typography variant="h4" fontWeight={800} color={`${color}.main`}>{value}</Typography>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* RIGHT COLUMN */}
        <Grid item xs={12} lg={8}>
          <Stack spacing={3}>

            {/* ── Fotos de la factura ───────────────────────────── */}
            {invoice.photos.length > 0 && (
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: 'primary.50', width: 36, height: 36 }}>
                        <ImageIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>Fotos de la Factura</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {invoice.photos.length} imagen{invoice.photos.length !== 1 ? 'es' : ''} adjunta{invoice.photos.length !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                  <PhotoGrid
                    photos={invoice.photos}
                    onOpen={(idx) => openLightbox(invoice.photos, idx, `Factura ${invoice.invoiceNumber}`)}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── Historial de entregas ─────────────────────────── */}
            {invoice.deliveries && invoice.deliveries.length > 0 ? (
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
                    <Avatar sx={{ bgcolor: 'secondary.50', width: 36, height: 36 }}>
                      <HistoryIcon sx={{ color: 'secondary.main', fontSize: 18 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>Historial de Entregas</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {invoice.deliveries.length} entrega{invoice.deliveries.length !== 1 ? 's' : ''} registrada{invoice.deliveries.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2.5}>
                    {invoice.deliveries.map((delivery: any, index: number) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2.5, border: '1px solid', borderColor: 'divider',
                          borderLeft: '4px solid', borderLeftColor: 'primary.main',
                          borderRadius: '0 12px 12px 0', bgcolor: 'grey.50',
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700} color="primary.main">
                              Entrega #{index + 1}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {delivery.date ? formatDate(delivery.date.toDate()) : 'Fecha no disponible'}
                            </Typography>
                          </Box>
                          <Chip label={`Por: ${delivery.deliveredBy || 'Sistema'}`} size="small" variant="outlined" sx={{ fontSize: '0.72rem', height: 22 }} />
                        </Stack>

                        {delivery.notes && (
                          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                              "{delivery.notes}"
                            </Typography>
                          </Box>
                        )}

                        {/* Delivery photos inline */}
                        {delivery.photos && delivery.photos.length > 0 && (
                          <Box>
                            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem' }}>
                              Fotos de esta entrega ({delivery.photos.length})
                            </Typography>
                            <PhotoGrid
                              photos={delivery.photos}
                              onOpen={(idx) => openLightbox(delivery.photos, idx, `Entrega #${index + 1}`)}
                            />
                          </Box>
                        )}

                        {!delivery.notes && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<NoteAddIcon />}
                            onClick={() => { setSelectedDelivery(index); setEditDialogOpen(true); }}
                            sx={{ textTransform: 'none', mt: delivery.photos?.length ? 1.5 : 0 }}
                          >
                            Añadir nota
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ) : (
              <Card elevation={0} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 2.5 }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <ShippingIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Sin entregas registradas
                  </Typography>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 2.5 }}>
                    Registra la primera entrega para hacer seguimiento al despacho.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(`/quick-delivery/${invoice.id}`)}
                    sx={{ textTransform: 'none' }}
                  >
                    Registrar primera entrega
                  </Button>
                </CardContent>
              </Card>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* ── Lightbox ──────────────────────────────────────────── */}
      <Lightbox
        open={lightboxOpen}
        photos={lightboxPhotos}
        index={lightboxIndex}
        title={lightboxTitle}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />

      {/* ── Snackbar enlace copiado ────────────────────────────── */}
      <Snackbar
        open={snackCopied}
        autoHideDuration={2500}
        onClose={() => setSnackCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2, fontWeight: 600 }}>
          ✓ Enlace copiado — pégalo donde quieras enviarlo
        </Alert>
      </Snackbar>

      {/* ── Add note dialog ────────────────────────────────────── */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Añadir nota a la entrega #{selectedDelivery !== null ? selectedDelivery + 1 : ''}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={5}
            fullWidth
            variant="outlined"
            placeholder="Escribe los detalles de esta entrega…"
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            sx={{ mt: 1.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined" sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => selectedDelivery !== null && handleAddDeliveryNote(selectedDelivery, editNotes)}
            disabled={!editNotes.trim()}
            sx={{ textTransform: 'none' }}
          >
            Guardar nota
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetailScreenDesktop;