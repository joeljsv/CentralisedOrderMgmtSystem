import { useState } from "react";
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
  IconButton,
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
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { Products as ProductsApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const EMPTY = { name: "", sku: "", price: "", quantity: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (form.price === "" || Number(form.price) < 0) errors.price = "Price must be >= 0";
  if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
    errors.quantity = "Quantity must be a whole number >= 0";
  return errors;
}

export default function Products() {
  const qc = useQueryClient();
  const notify = useNotify();
  const [dialog, setDialog] = useState({ open: false, editing: null, form: EMPTY });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["products"],
    queryFn: ProductsApi.list,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ editing, payload }) =>
      editing ? ProductsApi.update(editing, payload) : ProductsApi.create(payload),
    onSuccess: (_d, vars) => {
      notify(vars.editing ? "Product updated" : "Product created");
      setDialog({ open: false, editing: null, form: EMPTY });
      invalidate();
    },
    onError: (e) => notify(apiError(e), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ProductsApi.remove(id),
    onSuccess: () => {
      notify("Product deleted");
      setConfirm(null);
      invalidate();
    },
    onError: (e) => {
      notify(apiError(e), "error");
      setConfirm(null);
    },
  });

  const openCreate = () => {
    setErrors({});
    setDialog({ open: true, editing: null, form: EMPTY });
  };
  const openEdit = (p) => {
    setErrors({});
    setDialog({
      open: true,
      editing: p.id,
      form: { name: p.name, sku: p.sku, price: String(p.price), quantity: String(p.quantity) },
    });
  };

  const handleSave = () => {
    const errs = validate(dialog.form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveMutation.mutate({
      editing: dialog.editing,
      payload: {
        name: dialog.form.name.trim(),
        sku: dialog.form.sku.trim(),
        price: Number(dialog.form.price),
        quantity: Number(dialog.form.quantity),
      },
    });
  };

  const setField = (k) => (e) =>
    setDialog((d) => ({ ...d, form: { ...d.form, [k]: e.target.value } }));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Products
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Product
        </Button>
      </Stack>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error">{apiError(error)}</Alert>}

      {data && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No products yet. Add your first product.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.sku}</TableCell>
                    <TableCell align="right">${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        label={p.quantity}
                        color={p.quantity < 10 ? "warning" : "default"}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => openEdit(p)} size="small">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          onClick={() => setConfirm(p)}
                          size="small"
                          color="error"
                        >
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

      <Dialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.editing ? "Edit Product" : "Add Product"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Name"
              value={dialog.form.name}
              onChange={setField("name")}
              error={!!errors.name}
              helperText={errors.name}
              fullWidth
            />
            <TextField
              label="SKU / Code"
              value={dialog.form.sku}
              onChange={setField("sku")}
              error={!!errors.sku}
              helperText={errors.sku}
              fullWidth
            />
            <TextField
              label="Price"
              type="number"
              value={dialog.form.price}
              onChange={setField("price")}
              error={!!errors.price}
              helperText={errors.price}
              inputProps={{ step: "0.01", min: 0 }}
              fullWidth
            />
            <TextField
              label="Quantity in stock"
              type="number"
              value={dialog.form.quantity}
              onChange={setField("quantity")}
              error={!!errors.quantity}
              helperText={errors.quantity}
              inputProps={{ step: "1", min: 0 }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saveMutation.isPending}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        title="Delete product"
        message={`Delete "${confirm?.name}"? This cannot be undone.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
      />
    </Box>
  );
}
