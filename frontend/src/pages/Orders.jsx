import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Customers as CustomersApi, Orders as OrdersApi, Products as ProductsApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

function newLine() {
  return { product_id: "", quantity: 1 };
}

export default function Orders() {
  const qc = useQueryClient();
  const notify = useNotify();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([newLine()]);
  const [formError, setFormError] = useState("");
  const [confirm, setConfirm] = useState(null);

  const ordersQuery = useQuery({ queryKey: ["orders"], queryFn: OrdersApi.list });
  const customersQuery = useQuery({ queryKey: ["customers"], queryFn: CustomersApi.list });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: ProductsApi.list });

  const productMap = useMemo(() => {
    const m = {};
    (productsQuery.data || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [productsQuery.data]);

  const estimatedTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const p = productMap[l.product_id];
      if (!p) return sum;
      return sum + Number(p.price) * Number(l.quantity || 0);
    }, 0);
  }, [lines, productMap]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => OrdersApi.create(payload),
    onSuccess: (order) => {
      notify(`Order #${order.id} created — total $${Number(order.total_amount).toFixed(2)}`);
      setOpen(false);
      invalidate();
    },
    onError: (e) => setFormError(apiError(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => OrdersApi.remove(id),
    onSuccess: () => {
      notify("Order cancelled and stock restored");
      setConfirm(null);
      invalidate();
    },
    onError: (e) => {
      notify(apiError(e), "error");
      setConfirm(null);
    },
  });

  const openDialog = () => {
    setCustomerId("");
    setLines([newLine()]);
    setFormError("");
    setOpen(true);
  };

  const updateLine = (idx, key, value) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setFormError("");
    if (!customerId) return setFormError("Please select a customer");
    const items = lines
      .filter((l) => l.product_id && Number(l.quantity) > 0)
      .map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    if (items.length === 0) return setFormError("Add at least one product line");
    createMutation.mutate({ customer_id: Number(customerId), items });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Orders
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>
          Create Order
        </Button>
      </Stack>

      {ordersQuery.isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {ordersQuery.error && <Alert severity="error">{apiError(ordersQuery.error)}</Alert>}

      {ordersQuery.data && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order #</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ordersQuery.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No orders yet. Create your first order.
                  </TableCell>
                </TableRow>
              ) : (
                ordersQuery.data.map((o) => (
                  <TableRow key={o.id} hover>
                    <TableCell>#{o.id}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell align="right">{o.items.length}</TableCell>
                    <TableCell align="right">${Number(o.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip size="small" label={o.status} color="success" variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => navigate(`/orders/${o.id}`)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel order">
                        <IconButton size="small" color="error" onClick={() => setConfirm(o)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create Order</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField
              select
              label="Customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              fullWidth
            >
              {(customersQuery.data || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.full_name} ({c.email})
                </MenuItem>
              ))}
            </TextField>

            <Divider>Line Items</Divider>

            {lines.map((line, idx) => {
              const product = productMap[line.product_id];
              const subtotal = product ? Number(product.price) * Number(line.quantity || 0) : 0;
              return (
                <Grid container spacing={1} alignItems="center" key={idx}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      label="Product"
                      value={line.product_id}
                      onChange={(e) => updateLine(idx, "product_id", e.target.value)}
                      fullWidth
                      size="small"
                    >
                      {(productsQuery.data || []).map((p) => (
                        <MenuItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} — ${Number(p.price).toFixed(2)} ({p.quantity} in stock)
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="Qty"
                      type="number"
                      size="small"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={4} sm={2}>
                    <Typography variant="body2" align="right">
                      ${subtotal.toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={2} sm={1}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              );
            })}

            <Button startIcon={<AddIcon />} onClick={addLine} sx={{ alignSelf: "flex-start" }}>
              Add line item
            </Button>

            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle1" fontWeight={600}>
                Estimated Total
              </Typography>
              <Typography variant="subtitle1" fontWeight={700}>
                ${estimatedTotal.toFixed(2)}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Final total is calculated by the backend at submission.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        title="Cancel order"
        message={`Cancel order #${confirm?.id}? Stock will be restored.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
      />
    </Box>
  );
}
