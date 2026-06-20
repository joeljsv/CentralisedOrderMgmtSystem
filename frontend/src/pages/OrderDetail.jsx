import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PrintIcon from "@mui/icons-material/Print";
import EditIcon from "@mui/icons-material/Edit";
import { Orders as OrdersApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";

const STATUS_COLORS = { placed: "primary", shipped: "warning", delivered: "success", cancelled: "error" };
const NEXT_STATUSES = { placed: ["shipped", "cancelled"], shipped: ["delivered", "cancelled"], delivered: [], cancelled: [] };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const notify = useNotify();
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => OrdersApi.get(id),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status) => OrdersApi.updateStatus(id, status),
    onSuccess: (updated) => {
      notify(`Order status updated to "${updated.status}"`);
      qc.invalidateQueries({ queryKey: ["orders", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      setStatusDialog(false);
    },
    onError: (e) => notify(apiError(e), "error"),
  });

  const openStatusDialog = () => {
    setNewStatus(NEXT_STATUSES[data?.status]?.[0] || "");
    setStatusDialog(true);
  };

  if (isLoading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton height={80} sx={{ mb: 2 }} />
        <Skeleton height={200} />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{apiError(error)}</Alert>;

  const transitions = NEXT_STATUSES[data.status] ?? [];

  return (
    <Box>
      {/* Back + actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5} sx={{ displayPrint: "none" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")}>
          Back to Orders
        </Button>
        <Stack direction="row" spacing={1}>
          {transitions.length > 0 && (
            <Button variant="outlined" startIcon={<EditIcon />} onClick={openStatusDialog}>
              Update Status
            </Button>
          )}
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
            Print
          </Button>
        </Stack>
      </Stack>

      {/* Order header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={2.5}>
        <Typography variant="h5" fontWeight={700}>
          Order #{data.id}
        </Typography>
        <Chip label={data.status} color={STATUS_COLORS[data.status] || "default"} variant="outlined" />
      </Stack>

      {/* Info grid */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Customer
              </Typography>
              <Typography variant="body1" fontWeight={600} mt={0.5}>
                {data.customer_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">Customer ID #{data.customer_id}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Order Details
              </Typography>
              <Typography variant="body2" mt={0.5}>
                <strong>Placed:</strong> {new Date(data.created_at).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>Items:</strong> {data.items.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Line items */}
      <Typography variant="subtitle1" mb={1}>Line Items</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Quantity</TableCell>
              <TableCell align="right">Line Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell sx={{ fontWeight: 500 }}>{item.product_name || `Product #${item.product_id}`}</TableCell>
                <TableCell align="right">${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(item.line_total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Total */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            ORDER TOTAL
          </Typography>
          <Typography variant="h5" fontWeight={800} color="primary.main">
            ${Number(data.total_amount).toFixed(2)}
          </Typography>
        </Stack>
      </Box>

      {/* Status update dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Current status: <strong>{data.status}</strong>
          </Typography>
          <Select
            fullWidth
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            size="small"
          >
            {transitions.map((s) => (
              <MenuItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => updateStatusMutation.mutate(newStatus)}
            disabled={!newStatus || updateStatusMutation.isPending}
            color={newStatus === "cancelled" ? "error" : "primary"}
          >
            {updateStatusMutation.isPending ? "Updating…" : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
