import React, { useState } from 'react';
import {
  IconButton,
  Button,
  Snackbar,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Share as ShareIcon,
  ContentCopy as CopyIcon,
  WhatsApp as WhatsAppIcon,
  Check as CheckIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface ShareTrackingButtonProps {
  invoiceId: string | undefined;
  invoiceNumber?: string;
  clientPhone?: string;
  /** 'icon' renders an IconButton, 'button' renders a full Button */
  variant?: 'icon' | 'button';
}

const BASE_URL = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}`;

export const getTrackingUrl = (invoiceId: string) =>
  `${window.location.origin}/Control-Facturas-Vite/tracking/${invoiceId}`;

const ShareTrackingButton: React.FC<ShareTrackingButtonProps> = ({
  invoiceId,
  invoiceNumber,
  clientPhone,
  variant = 'icon',
}) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [snack, setSnack] = useState(false);

  if (!invoiceId) return null;

  const url = getTrackingUrl(invoiceId);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setSnack(true);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setSnack(true);
    }
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Hola${invoiceNumber ? ` — Factura *${invoiceNumber}*` : ''}, puedes ver el estado de tu pedido aquí:\n${url}`
    );
    const phone = clientPhone ? `57${clientPhone.replace(/\D/g, '')}` : '';
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: `Estado del pedido${invoiceNumber ? ` #${invoiceNumber}` : ''}`,
        text: 'Sigue el estado de tu pedido en tiempo real',
        url,
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <Tooltip title="Compartir enlace al cliente">
          <IconButton
            size="small"
            onClick={handleNativeShare}
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ShareIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShareIcon />}
          onClick={handleNativeShare}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Compartir
        </Button>
      )}

      {/* Share dialog (fallback when Web Share API not available) */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShareIcon sx={{ color: '#3b82f6', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Compartir seguimiento
              </Typography>
              {invoiceNumber && (
                <Typography variant="caption" color="text.secondary">
                  Factura {invoiceNumber}
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Comparte este enlace con tu cliente para que pueda ver el estado de su pedido en tiempo real.
          </Typography>

          {/* URL field */}
          <TextField
            fullWidth
            value={url}
            size="small"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace', fontSize: '0.82rem', bgcolor: '#f8fafc' },
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title={copied ? '¡Copiado!' : 'Copiar enlace'}>
                    <IconButton size="small" onClick={handleCopy} color={copied ? 'success' : 'default'}>
                      {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Quick share actions */}
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.68rem', display: 'block', mb: 1.5 }}>
            Compartir vía
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="contained"
              startIcon={<WhatsAppIcon />}
              onClick={handleWhatsApp}
              sx={{
                bgcolor: '#16a34a',
                '&:hover': { bgcolor: '#15803d' },
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
              }}
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
              <IconButton
                size="small"
                onClick={() => window.open(url, '_blank')}
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpen(false)} variant="outlined" sx={{ textTransform: 'none' }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack}
        autoHideDuration={2500}
        onClose={() => setSnack(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: 2 }}>
          Enlace copiado al portapapeles
        </Alert>
      </Snackbar>
    </>
  );
};

export default ShareTrackingButton;