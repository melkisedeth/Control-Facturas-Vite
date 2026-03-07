import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Box,
  Typography,
  Chip,
  Stack,
  CircularProgress,
  Divider,
  Avatar,
  Paper,
  Dialog,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

// ─── Lightbox ─────────────────────────────────────────────────────────────────
const Lightbox: React.FC<{
  open: boolean;
  photos: string[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
}> = ({ open, photos, index, onClose, onNavigate }) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowLeft') onNavigate((index - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') onNavigate((index + 1) % photos.length);
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, index, photos.length]);

  if (!photos.length) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(5,5,15,0.97)',
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
          Foto {index + 1} de {photos.length}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          p: 2,
        }}
      >
        {photos.length > 1 && (
          <IconButton
            onClick={() => onNavigate((index - 1 + photos.length) % photos.length)}
            sx={{
              position: 'absolute',
              left: 8,
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        <Box
          component="img"
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          sx={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: 2 }}
        />
        {photos.length > 1 && (
          <IconButton
            onClick={() => onNavigate((index + 1) % photos.length)}
            sx={{
              position: 'absolute',
              right: 8,
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>
      {photos.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 1.5,
            overflowX: 'auto',
            bgcolor: 'rgba(0,0,0,0.3)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            justifyContent: photos.length <= 6 ? 'center' : 'flex-start',
          }}
        >
          {photos.map((p, i) => (
            <Box
              key={i}
              component="img"
              src={p}
              onClick={() => onNavigate(i)}
              sx={{
                width: 52,
                height: 52,
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                flexShrink: 0,
                border: i === index ? '2px solid #60a5fa' : '2px solid transparent',
                opacity: i === index ? 1 : 0.4,
                transition: 'all 0.15s',
              }}
            />
          ))}
        </Box>
      )}
    </Dialog>
  );
};

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pendiente: {
    color: '#dc2626',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: <PendingIcon />,
    label: 'Pendiente de despacho',
    desc: 'Tu pedido está siendo preparado y aún no ha sido enviado.',
    step: 1,
  },
  Parcial: {
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fed7aa',
    icon: <InventoryIcon />,
    label: 'Entrega parcial',
    desc: 'Una parte de tu pedido ya fue despachada. El resto está en camino.',
    step: 2,
  },
  Despachada: {
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    icon: <CheckCircleIcon />,
    label: 'Pedido despachado',
    desc: '¡Tu pedido fue enviado exitosamente! Ya está en camino hacia ti.',
    step: 3,
  },
} as const;

// ─── Timeline steps ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'Pendiente', label: 'En preparación', icon: <PendingIcon sx={{ fontSize: 18 }} /> },
  { key: 'Parcial', label: 'Entrega parcial', icon: <InventoryIcon sx={{ fontSize: 18 }} /> },
  { key: 'Despachada', label: 'Despachado', icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
];

// ─── Main Component ────────────────────────────────────────────────────────────
const InvoiceTrackingScreen: React.FC = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lbOpen, setLbOpen] = useState(false);
  const [lbPhotos, setLbPhotos] = useState<string[]>([]);
  const [lbIndex, setLbIndex] = useState(0);

  const openLightbox = (photos: string[], idx: number) => {
    setLbPhotos(photos);
    setLbIndex(idx);
    setLbOpen(true);
  };

  useEffect(() => {
    if (!invoiceId) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'invoices', invoiceId));
        if (!snap.exists()) { setError(true); return; }
        const d = snap.data();
        setInvoice({
          id: snap.id,
          invoiceNumber: d.invoiceNumber || '',
          clientName: d.clientName || '',
          clientPhone: d.clientPhone || '',
          clientAddress: d.clientAddress || '',
          status: d.status || 'Pendiente',
          photos: d.photos || [],
          deliveries: d.deliveries || [],
          createdAt: d.createdAt?.toDate() || new Date(),
          updatedAt: d.updatedAt?.toDate() || new Date(),
          deliveredAt: d.deliveredAt?.toDate(),
        });
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [invoiceId]);

  const fmt = (date?: Date) =>
    date ? format(date, "dd 'de' MMMM yyyy, HH:mm", { locale: es }) : '—';

  const fmtShort = (date?: Date) =>
    date ? format(date, 'dd MMM · HH:mm', { locale: es }) : '—';

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          gap: 2,
        }}
      >
        <CircularProgress size={40} sx={{ color: '#3b82f6' }} />
        <Typography variant="body2" color="text.secondary">
          Cargando información de tu pedido…
        </Typography>
      </Box>
    );
  }

  if (error || !invoice) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f8fafc',
          p: 3,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            bgcolor: '#fef2f2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <AssignmentIcon sx={{ fontSize: 32, color: '#dc2626' }} />
        </Box>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Pedido no encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
          El enlace puede estar vencido o el número de pedido no existe. Contacta con nosotros para más información.
        </Typography>
      </Box>
    );
  }

  const statusConf = STATUS_CONFIG[invoice.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Pendiente;
  const currentStep = statusConf.step;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f1f5f9', fontFamily: 'inherit' }}>
      {/* ── Header brand bar ───────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: 'white',
          borderBottom: '1px solid #e2e8f0',
          px: { xs: 2, sm: 4 },
          py: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            bgcolor: '#3b82f6',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShippingIcon sx={{ color: 'white', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.2 }}>
            Seguimiento de Pedido
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Estado en tiempo real
          </Typography>
        </Box>
      </Box>

      {/* ── Main content ───────────────────────────────────────── */}
      <Box sx={{ maxWidth: 680, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>

        {/* Status hero card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `2px solid ${statusConf.border}`,
            bgcolor: statusConf.bg,
            p: { xs: 3, sm: 4 },
            mb: 3,
            textAlign: 'center',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'white',
              border: `2px solid ${statusConf.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2,
              color: statusConf.color,
              '& svg': { fontSize: 30 },
            }}
          >
            {statusConf.icon}
          </Box>
          <Typography variant="caption" sx={{ color: statusConf.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem' }}>
            Estado del pedido
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: statusConf.color, mt: 0.5, mb: 1 }}>
            {statusConf.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: 'auto' }}>
            {statusConf.desc}
          </Typography>

          <Divider sx={{ my: 3, borderColor: statusConf.border }} />

          <Stack direction="row" justifyContent="center" spacing={1} flexWrap="wrap">
            <Chip
              label={`Factura: ${invoice.invoiceNumber}`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: 'white', border: `1px solid ${statusConf.border}`, color: statusConf.color }}
            />
            <Chip
              label={`Actualizado: ${fmtShort(invoice.updatedAt)}`}
              size="small"
              sx={{ fontWeight: 600, bgcolor: 'white', border: `1px solid ${statusConf.border}`, color: 'text.secondary' }}
            />
          </Stack>
        </Paper>

        {/* Progress timeline */}
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: 'white', p: 3, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2.5, color: 'text.primary' }}>
            Progreso del despacho
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            {STEPS.map((step, i) => {
              const done = currentStep > i + 1;
              const active = currentStep === i + 1;
              const pending = currentStep < i + 1;
              return (
                <React.Fragment key={step.key}>
                  <Stack alignItems="center" spacing={0.75} sx={{ flex: i === 1 ? 'none' : 1, zIndex: 1 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: done ? '#16a34a' : active ? statusConf.color : '#f1f5f9',
                        color: done || active ? 'white' : '#94a3b8',
                        border: active ? `3px solid ${statusConf.color}33` : '3px solid transparent',
                        boxShadow: active ? `0 0 0 4px ${statusConf.color}20` : 'none',
                        transition: 'all 0.3s',
                        '& svg': { fontSize: 18 },
                      }}
                    >
                      {done ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : step.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: active ? 700 : done ? 600 : 400,
                        color: active ? statusConf.color : done ? '#16a34a' : '#94a3b8',
                        fontSize: '0.68rem',
                        textAlign: 'center',
                        maxWidth: 70,
                        lineHeight: 1.3,
                      }}
                    >
                      {step.label}
                    </Typography>
                  </Stack>

                  {i < STEPS.length - 1 && (
                    <Box
                      sx={{
                        flex: 1,
                        height: 3,
                        bgcolor: done ? '#16a34a' : '#e2e8f0',
                        mx: 1,
                        borderRadius: 2,
                        mb: 2.5,
                        transition: 'background-color 0.3s',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Box>
        </Paper>

        {/* Client + order info */}
        <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: 'white', p: 3, mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: 'text.primary' }}>
            Información del pedido
          </Typography>
          <Stack spacing={2}>
            {[
              { icon: <AssignmentIcon sx={{ fontSize: 16, color: '#64748b' }} />, label: 'N° Factura', value: invoice.invoiceNumber },
              { icon: <CalendarIcon sx={{ fontSize: 16, color: '#64748b' }} />, label: 'Fecha de registro', value: fmt(invoice.createdAt) },
              ...(invoice.clientAddress ? [{ icon: <LocationIcon sx={{ fontSize: 16, color: '#64748b' }} />, label: 'Dirección de entrega', value: invoice.clientAddress }] : []),
              ...(invoice.deliveredAt ? [{ icon: <CheckCircleIcon sx={{ fontSize: 16, color: '#16a34a' }} />, label: 'Fecha de despacho', value: fmt(invoice.deliveredAt) }] : []),
            ].map(({ icon, label, value }) => (
              <Stack key={label} direction="row" spacing={1.5} alignItems="flex-start">
                <Box sx={{ mt: 0.25, flexShrink: 0 }}>{icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.65rem' }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.1 }}>
                    {value}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>

        {/* Delivery history */}
        {invoice.deliveries && invoice.deliveries.length > 0 && (
          <Paper elevation={0} sx={{ borderRadius: 2.5, border: '1px solid #e2e8f0', bgcolor: 'white', p: 3, mb: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <ShippingIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                Historial de entregas
              </Typography>
              <Chip label={invoice.deliveries.length} size="small" color="primary" sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }} />
            </Stack>

            <Stack spacing={2}>
              {invoice.deliveries.map((d: any, i: number) => (
                <Box
                  key={i}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #e2e8f0',
                    borderLeft: '4px solid #3b82f6',
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: d.notes || d.photos?.length ? 1.5 : 0 }}>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      Entrega #{i + 1}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {d.date ? fmtShort(d.date.toDate()) : '—'}
                    </Typography>
                  </Stack>

                  {d.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: d.photos?.length ? 1.5 : 0 }}>
                      "{d.notes}"
                    </Typography>
                  )}

                  {d.photos && d.photos.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                      {d.photos.slice(0, 4).map((photo: string, pi: number) => (
                        <Box
                          key={pi}
                          component="img"
                          src={photo}
                          alt={`Foto ${pi + 1}`}
                          onClick={() => openLightbox(d.photos, pi)}
                          sx={{
                            width: 60,
                            height: 60,
                            objectFit: 'cover',
                            borderRadius: 1.5,
                            cursor: 'pointer',
                            border: '2px solid transparent',
                            transition: 'all 0.2s',
                            '&:hover': { border: '2px solid #3b82f6', transform: 'scale(1.05)' },
                          }}
                        />
                      ))}
                      {d.photos.length > 4 && (
                        <Box
                          onClick={() => openLightbox(d.photos, 4)}
                          sx={{
                            width: 60,
                            height: 60,
                            borderRadius: 1.5,
                            bgcolor: '#eff6ff',
                            border: '2px solid #bfdbfe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <Typography variant="caption" fontWeight={700} color="primary.main">
                            +{d.photos.length - 4}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {/* Footer */}
        <Box sx={{ textAlign: 'center', pt: 1, pb: 4 }}>
          <Typography variant="caption" color="text.disabled">
            Esta página es de solo lectura · Los datos se actualizan en tiempo real
          </Typography>
        </Box>
      </Box>

      <Lightbox
        open={lbOpen}
        photos={lbPhotos}
        index={lbIndex}
        onClose={() => setLbOpen(false)}
        onNavigate={setLbIndex}
      />
    </Box>
  );
};

export default InvoiceTrackingScreen;