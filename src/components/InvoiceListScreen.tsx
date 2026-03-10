import React, { useState, useEffect, useCallback } from 'react';
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
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  Alert,
  LinearProgress,
  Fade,
  Zoom,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Drawer,
  Snackbar,
  Pagination,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  Visibility as VisibilityIcon,
  Logout as LogoutIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Inventory as InventoryIcon,
  PhotoCamera as PhotoCameraIcon,
  MoreVert as MoreVertIcon,
  Sort as SortIcon,
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  Dashboard as DashboardIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Image as ImageIcon,
  Share as ShareIcon,
  WhatsApp as WhatsAppIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

// ─── Pagination config ─────────────────────────────────────────────────────────
const DISPATCHED_PAGE_SIZE = 20;

// ─── Thumbnail URL helper ──────────────────────────────────────────────────────
/**
 * Returns a degraded-quality URL for thumbnails.
 * Firebase Storage supports image resizing via the `?w=&h=` query params
 * when the "Resize Images" extension is installed (common setup).
 * For other CDNs / plain URLs we just append nothing extra but still
 * use the browser's native lazy-loading.
 *
 * Strategy: append `w=120` to Firebase Storage URLs so the extension
 * can serve a small cached variant. For any other URL, return as-is.
 */
const toThumbnailUrl = (url: string): string => {
  try {
    const u = new URL(url);
    // Firebase Storage direct URLs contain "firebasestorage.googleapis.com"
    // or "storage.googleapis.com"
    if (
      u.hostname.includes('firebasestorage.googleapis.com') ||
      u.hostname.includes('storage.googleapis.com')
    ) {
      // The Firebase Resize Images extension serves thumbnails under a
      // path like …/thumb@200_<filename>. However, since that requires
      // the extension to be configured, we use a safer approach:
      // just append the Google Cloud Storage image-serving size token.
      // If the extension is NOT installed this param is silently ignored
      // and the full image is served – no breakage, just no speedup.
      u.searchParams.set('w', '120');
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
};

// ─── Tracking URL helper ───────────────────────────────────────────────────────
const getTrackingUrl = (invoiceId: string) =>
  `${window.location.origin}/tracking/${invoiceId}`;

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
          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
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
            startIcon={copied ? <CheckIcon /> : <CopyIcon />}
            onClick={handleCopy}
            color={copied ? 'success' : 'inherit'}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
          >
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
          <Tooltip title="Abrir en nueva pestaña">
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

// ─── Image Preview Modal ──────────────────────────────────────────────────────
const ImagePreviewModal: React.FC<{
  open: boolean;
  photos: string[];       // full-resolution URLs
  initialIndex: number;
  invoiceNumber: string;
  onClose: () => void;
}> = ({ open, photos, initialIndex, invoiceNumber, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, open]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowLeft') setCurrentIndex((p) => (p - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setCurrentIndex((p) => (p + 1) % photos.length);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, photos.length, onClose]);

  if (!photos.length) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(10,10,20,0.97)',
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
        },
      }}
    >
      <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <ImageIcon sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }} />
          <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 600 }}>
            Factura {invoiceNumber}
          </Typography>
          <Chip
            label={`${currentIndex + 1} / ${photos.length}`}
            size="small"
            sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.75rem' }}
          />
        </Stack>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)', '&:hover': { color: 'white' } }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 480, bgcolor: 'rgba(0,0,0,0.4)', p: 2 }}>
        {photos.length > 1 && (
          <IconButton
            onClick={handlePrev}
            sx={{ position: 'absolute', left: 12, zIndex: 2, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', backdropFilter: 'blur(6px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        {/* Full-resolution image — NO thumbnail URL here */}
        <Box
          component="img"
          src={photos[currentIndex]}
          alt={`Foto ${currentIndex + 1}`}
          sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 2, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        />
        {photos.length > 1 && (
          <IconButton
            onClick={handleNext}
            sx={{ position: 'absolute', right: 12, zIndex: 2, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', backdropFilter: 'blur(6px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      {photos.length > 1 && (
        <Box sx={{ display: 'flex', gap: 1, p: 2, overflowX: 'auto', bgcolor: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.06)', justifyContent: photos.length <= 6 ? 'center' : 'flex-start' }}>
          {photos.map((photo, idx) => (
            <Box
              key={idx}
              component="img"
              // Thumbnails in the film strip can be low-res
              src={toThumbnailUrl(photo)}
              alt={`Miniatura ${idx + 1}`}
              loading="lazy"
              onClick={() => setCurrentIndex(idx)}
              sx={{
                width: 64, height: 64, objectFit: 'cover', borderRadius: 1.5, cursor: 'pointer', flexShrink: 0,
                border: idx === currentIndex ? '2px solid #60a5fa' : '2px solid transparent',
                opacity: idx === currentIndex ? 1 : 0.5,
                transition: 'all 0.2s',
                '&:hover': { opacity: 0.9, transform: 'scale(1.05)' },
              }}
            />
          ))}
        </Box>
      )}
    </Dialog>
  );
};

// ─── Photo Strip Preview ───────────────────────────────────────────────────────
const PhotoStrip: React.FC<{
  photos: string[];         // full-resolution URLs stored in Firestore
  onPhotoClick: (index: number) => void;
}> = ({ photos, onPhotoClick }) => {
  const MAX_VISIBLE = 4;
  const visible = photos.slice(0, MAX_VISIBLE);
  const overflow = photos.length - MAX_VISIBLE;

  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      {visible.map((photo, idx) => (
        <Box
          key={idx}
          component="img"
          // ← Low-quality thumbnail for the list view
          src={toThumbnailUrl(photo)}
          alt={`Foto ${idx + 1}`}
          // ← Native lazy-load: browser skips off-screen images
          loading="lazy"
          decoding="async"
          onClick={(e) => { e.stopPropagation(); onPhotoClick(idx); }}
          sx={{
            width: 52, height: 52, objectFit: 'cover', borderRadius: 1.5, cursor: 'pointer',
            border: '2px solid transparent', transition: 'all 0.2s',
            '&:hover': { border: '2px solid', borderColor: 'primary.main', transform: 'scale(1.08)', boxShadow: 3 },
          }}
        />
      ))}
      {overflow > 0 && (
        <Box
          onClick={(e) => { e.stopPropagation(); onPhotoClick(MAX_VISIBLE); }}
          sx={{
            width: 52, height: 52, borderRadius: 1.5, bgcolor: 'primary.50', border: '2px solid', borderColor: 'primary.200',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            transition: 'all 0.2s', '&:hover': { bgcolor: 'primary.100', transform: 'scale(1.05)' },
          }}
        >
          <Typography variant="caption" fontWeight={700} color="primary.main">+{overflow}</Typography>
        </Box>
      )}
    </Stack>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const [stats, setStats] = useState({ pending: 0, delivered: 0, partial: 0, total: 0 });

  // ── Pagination state (only used in Despachadas tab) ──────────────────────
  const [dispatchedPage, setDispatchedPage] = useState(1);

  // Image preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewInvoiceNumber, setPreviewInvoiceNumber] = useState('');

  // Share snack state
  const [snackCopied, setSnackCopied] = useState(false);

  const menuOpen = Boolean(anchorEl);

  const openPhotoPreview = (invoice: Invoice, index: number) => {
    // Always pass full-resolution URLs to the modal
    setPreviewPhotos(invoice.photos);
    setPreviewIndex(index);
    setPreviewInvoiceNumber(invoice.invoiceNumber);
    setPreviewOpen(true);
  };

  const handleShare = async (e: React.MouseEvent, invoice: Invoice) => {
    e.stopPropagation();
    if (!invoice.id) return;
    const url = getTrackingUrl(invoice.id);
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
    const pending = invoices.filter((inv) => inv.status === 'Pendiente').length;
    const delivered = invoices.filter((inv) => inv.status === 'Despachada').length;
    const partial = invoices.filter((inv) => inv.status === 'Parcial').length;
    setStats({ pending, delivered, partial, total: invoices.length });
  }, [invoices]);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setDispatchedPage(1);
  }, [search, sortBy, tabIndex]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(200));
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

  /** Returns ALL matching invoices (no pagination slicing). */
  const getFilteredInvoices = useCallback(() => {
    let filtered = invoices;
    filtered = tabIndex === 0
      ? filtered.filter((inv) => inv.status !== 'Despachada')
      : filtered.filter((inv) => inv.status === 'Despachada');

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(s) ||
          inv.clientName.toLowerCase().includes(s) ||
          inv.clientPhone.includes(search) ||
          (inv.userEmail?.toLowerCase().includes(s) ?? false)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date': return b.createdAt.getTime() - a.createdAt.getTime();
        case 'client': return a.clientName.localeCompare(b.clientName);
        case 'status': return a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return filtered;
  }, [invoices, tabIndex, search, sortBy]);

  const getPriorityColor = (invoice: Invoice) => {
    const days = Math.floor((new Date().getTime() - invoice.createdAt.getTime()) / 86400000);
    if (days > 7) return '#ef4444';
    if (days > 3) return '#f97316';
    return '#22c55e';
  };

  const formatDate = (date: Date) => format(date, 'dd MMM yyyy · HH:mm', { locale: es });

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      setAnchorEl(null);
    } catch (e) {
      console.error(e);
    }
  };

  const getInitials = (email: string | null) => (email ? email.charAt(0).toUpperCase() : '?');

  // ── Derived display lists ───────────────────────────────────────────────────
  const allFiltered = getFilteredInvoices();

  // For Despachadas (tab 1): paginate. For tab 0: show all.
  const isDispatchedTab = tabIndex === 1;
  const totalPages = isDispatchedTab
    ? Math.max(1, Math.ceil(allFiltered.length / DISPATCHED_PAGE_SIZE))
    : 1;
  const displayedInvoices = isDispatchedTab
    ? allFiltered.slice(
        (dispatchedPage - 1) * DISPATCHED_PAGE_SIZE,
        dispatchedPage * DISPATCHED_PAGE_SIZE,
      )
    : allFiltered;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc' }}>
      {/* ── AppBar ─────────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ px: { xs: 2, md: 4 }, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ flexGrow: 1 }}>
            <Box sx={{ width: 38, height: 38, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssignmentIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                Gestión de Facturas
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Control de entregas y despachos
              </Typography>
            </Box>
          </Stack>

          {/* Quick stats */}
          <Stack direction="row" spacing={3} sx={{ display: { xs: 'none', lg: 'flex' }, mr: 4 }}>
            {[
              { label: 'Pendientes', value: stats.pending, color: 'error', Icon: PendingIcon },
              { label: 'Parciales', value: stats.partial, color: 'warning', Icon: InventoryIcon },
              { label: 'Despachadas', value: stats.delivered, color: 'success', Icon: CheckCircleIcon },
            ].map(({ label, value, color, Icon }) => (
              <Tooltip key={label} title={label}>
                <Stack alignItems="center" spacing={0.5}>
                  <Badge badgeContent={value} color={color as any} max={99}>
                    <Icon color="action" fontSize="small" />
                  </Badge>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                </Stack>
              </Tooltip>
            ))}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/capture')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Nueva Factura
            </Button>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                {getInitials(currentUserEmail)}
              </Avatar>
            </IconButton>
          </Stack>

          <Menu anchorEl={anchorEl} open={menuOpen} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { mt: 1.5, minWidth: 220, borderRadius: 2 } }}>
            <MenuItem disabled sx={{ opacity: 1 }}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={500}>{currentUserEmail}</Typography>
                <Chip
                  label={isAdmin ? 'Administrador' : 'Usuario'}
                  size="small"
                  color={isAdmin ? 'primary' : 'default'}
                  sx={{ height: 18, fontSize: '0.68rem' }}
                />
              </Stack>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { navigate('/admin'); setAnchorEl(null); }} disabled={!isAdmin}>
              <DashboardIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
              Panel Administrativo
            </MenuItem>
            <MenuItem onClick={() => { navigate('/clients'); setAnchorEl(null); }}>
              <GroupIcon fontSize="small" sx={{ mr: 2, color: 'primary.main' }} />
              Clientes
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 2, color: 'error.main' }} />
              <Typography color="error.main">Cerrar Sesión</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Content ────────────────────────────────────────────── */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Filter bar */}
        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 2.5 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                placeholder="Buscar por número, cliente o teléfono…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" fontSize="small" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<SortIcon />}
                  onClick={() => {
                    const sorts = ['date', 'client', 'status'] as const;
                    setSortBy(sorts[(sorts.indexOf(sortBy) + 1) % sorts.length]);
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  {sortBy === 'date' && 'Por Fecha'}
                  {sortBy === 'client' && 'Por Cliente'}
                  {sortBy === 'status' && 'Por Estado'}
                </Button>
                <Tooltip title="Actualizar">
                  <IconButton onClick={fetchInvoices} disabled={loading} size="small" sx={{ bgcolor: 'primary.50' }}>
                    <RefreshIcon fontSize="small" color="primary" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            sx={{
              bgcolor: 'grey.100', borderRadius: 2, p: 0.5, minHeight: 44,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                textTransform: 'none', fontSize: '0.9rem', fontWeight: 500, minHeight: 36, borderRadius: 1.5, color: 'text.secondary',
                '&.Mui-selected': { bgcolor: 'white', color: 'primary.main', fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' },
              },
            }}
          >
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PendingIcon sx={{ fontSize: 16 }} />
                  <span>Pendientes y Parciales</span>
                  {stats.pending + stats.partial > 0 && (
                    <Chip label={stats.pending + stats.partial} size="small" color="error" sx={{ height: 18, fontSize: '0.7rem' }} />
                  )}
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CheckCircleIcon sx={{ fontSize: 16 }} />
                  <span>Despachadas</span>
                  {stats.delivered > 0 && (
                    <Chip label={stats.delivered} size="small" color="success" sx={{ height: 18, fontSize: '0.7rem' }} />
                  )}
                </Stack>
              }
            />
          </Tabs>

          {loading && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
        </Paper>

        {/* Results info */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, px: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Mostrando{' '}
            <strong>
              {isDispatchedTab
                ? `${Math.min((dispatchedPage - 1) * DISPATCHED_PAGE_SIZE + 1, allFiltered.length)}–${Math.min(dispatchedPage * DISPATCHED_PAGE_SIZE, allFiltered.length)}`
                : allFiltered.length}
            </strong>{' '}
            de <strong>{allFiltered.length}</strong> facturas
            {search && ` · búsqueda: "${search}"`}
          </Typography>

          {/* Page indicator for dispatched tab */}
          {isDispatchedTab && totalPages > 1 && (
            <Typography variant="caption" color="text.secondary">
              Página {dispatchedPage} de {totalPages}
            </Typography>
          )}
        </Stack>

        {/* ── Invoice List ─────────────────────────────────────── */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress size={48} />
          </Box>
        ) : allFiltered.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" color="text.secondary">
              {search ? 'Sin resultados para esa búsqueda' : tabIndex === 0 ? '¡Todo al día!' : 'Sin facturas despachadas'}
            </Typography>
          </Paper>
        ) : (
          <>
            <Stack spacing={1.5}>
              {displayedInvoices.map((invoice, index) => (
                <Fade in key={invoice.id} timeout={200} style={{ transitionDelay: `${Math.min(index * 20, 200)}ms` }}>
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      '&:hover': { borderColor: 'primary.300', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transform: 'translateY(-1px)' },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr auto' },
                        alignItems: 'center',
                        p: 2.5,
                        gap: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => invoice.id && navigate(`/invoice/${invoice.id}`)}
                    >
                      {/* Col 1: Invoice info */}
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getPriorityColor(invoice), flexShrink: 0 }} />
                          <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                            {invoice.invoiceNumber}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(invoice.status)}
                            label={invoice.status}
                            color={getStatusColor(invoice.status) as any}
                            size="small"
                            sx={{ fontWeight: 600, height: 22, fontSize: '0.7rem' }}
                          />
                        </Stack>
                        <Typography variant="body2" fontWeight={500}>{invoice.clientName}</Typography>
                        <Stack direction="row" spacing={2}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <PhoneIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{invoice.clientPhone}</Typography>
                          </Stack>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <CalendarIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.secondary">{formatDate(invoice.createdAt)}</Typography>
                          </Stack>
                          {invoice.deliveries?.length > 0 && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <ShippingIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                              <Typography variant="caption" color="primary.main" fontWeight={600}>
                                {invoice.deliveries.length} entrega{invoice.deliveries.length !== 1 ? 's' : ''}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Stack>

                      {/* Col 2: Photos inline */}
                      <Box onClick={(e) => e.stopPropagation()}>
                        {invoice.photos.length > 0 ? (
                          <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                              {invoice.photos.length} foto{invoice.photos.length !== 1 ? 's' : ''}
                            </Typography>
                            <PhotoStrip photos={invoice.photos} onPhotoClick={(idx) => openPhotoPreview(invoice, idx)} />
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">Sin fotos adjuntas</Typography>
                        )}
                      </Box>

                      {/* Col 3: empty spacer on md */}
                      <Box sx={{ display: { xs: 'none', md: 'block' } }} />

                      {/* Col 4: Actions */}
                      <Stack direction="row" spacing={1} alignItems="center" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Registrar entrega">
                          <span>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<ShippingIcon />}
                              onClick={() => invoice.id && navigate(`/quick-delivery/${invoice.id}`)}
                              disabled={invoice.status === 'Despachada'}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, fontSize: '0.8rem' }}
                            >
                              Despachar
                            </Button>
                          </span>
                        </Tooltip>
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => invoice.id && navigate(`/invoice/${invoice.id}`)}
                            sx={{ border: '1px solid', borderColor: 'divider' }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copiar enlace de seguimiento">
                          <IconButton
                            size="small"
                            onClick={(e) => handleShare(e, invoice)}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              '&:hover': { bgcolor: '#eff6ff', borderColor: 'primary.300' },
                            }}
                          >
                            <ShareIcon fontSize="small" sx={{ color: 'primary.main' }} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Paper>
                </Fade>
              ))}
            </Stack>

            {/* ── Pagination (Despachadas only) ───────────────── */}
            {isDispatchedTab && totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
                <Pagination
                  count={totalPages}
                  page={dispatchedPage}
                  onChange={(_, page) => {
                    setDispatchedPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  color="primary"
                  shape="rounded"
                  showFirstButton
                  showLastButton
                  siblingCount={1}
                  sx={{
                    '& .MuiPaginationItem-root': { fontWeight: 600, borderRadius: 2 },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* FAB */}
      <Zoom in>
        <Fab
          color="primary"
          onClick={() => navigate('/capture')}
          sx={{ position: 'fixed', bottom: 28, right: 28, boxShadow: '0 8px 24px rgba(41,98,255,0.35)' }}
        >
          <AddIcon />
        </Fab>
      </Zoom>

      {/* Image Preview Modal — always full-resolution */}
      <ImagePreviewModal
        open={previewOpen}
        photos={previewPhotos}
        initialIndex={previewIndex}
        invoiceNumber={previewInvoiceNumber}
        onClose={() => setPreviewOpen(false)}
      />

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
    </Box>
  );
};

export default InvoiceListScreenDesktop;