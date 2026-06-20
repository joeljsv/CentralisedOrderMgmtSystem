import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { Products as ProductsApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const EMPTY = { name: "", sku: "", price: "", quantity: "" };

function validate(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Name is required";
  if (!form.sku.trim()) errors.sku = "SKU is required";
  if (form.price === "" || Number(form.price) < 0) errors.price = "Price must be ≥ 0";
  if (form.quantity === "" || !Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0)
    errors.quantity = "Quantity must be a whole number ≥ 0";
  return errors;
}

function SortHeader({ label, field, filters, onSort, align = "left" }) {
  const active = filters.sort_by === field;
  return (
    <TableCell align={align} onClick={() => onSort(field)} sx={{ cursor: "pointer", whiteSpace: "nowrap" }}>
      <Stack direction="row" alignItems="center" spacing={0.5} justifyContent={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        {active ? (
          filters.sort_dir === "asc" ? (
            <ArrowUpwardIcon sx={{ fontSize: 14 }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 14 }} />
          )
        ) : (
          <UnfoldMoreIcon sx={{ fontSize: 14, opacity: 0.35 }} />
        )}
      </Stack>
    </TableCell>
  );
}

const DEFAULT_FILTERS = {
  search: "", min_price: "", max_price: "", low_stock: false,
  sort_by: "name", sort_dir: "asc", page: 1, limit: 20,
};

export default function Products() {
  const qc = useQueryClient();
  const notify = useNotify();
  const [dialog, setDialog] = useState({ open: false, editing: null, form: EMPTY });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["products", filters],
    queryFn: () => ProductsApi.list(filters),
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
    onSuccess: () => { notify("Product deleted"); setConfirm(null); invalidate(); },
    onError: (e) => { notify(apiError(e), "error"); setConfirm(null); },
  });

  const openCreate = () => { setErrors({}); setDialog({ open: true, editing: null, form: EMPTY }); };
  const openEdit = (p) => {
    setErrors({});
    setDialog({ open: true, editing: p.id, form: { name: p.name, sku: p.sku, price: String(p.price), quantity: String(p.quantity) } });
  };

  const handleSave = () => {
    const errs = validate(dialog.form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    saveMutation.mutate({
      editing: dialog.editing,
      payload: { name: dialog.form.name.trim(), sku: dialog.form.sku.trim(), price: Number(dialog.form.price), quantity: Number(dialog.form.quantity) },
    });
  };

  const setField = (k) => (e) => setDialog((d) => ({ ...d, form: { ...d.form, [k]: e.target.value } }));

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilters((f) => ({ ...f, search: val, page: 1 })), 300);
  };

  const handleSort = (field) => {
    setFilters((f) => ({
      ...f,
      sort_by: field,
      sort_dir: f.sort_by === field && f.sort_dir === "asc" ? "desc" : "asc",
      page: 1,
    }));
  };

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val, page: 1 }));

  const clearFilters = () => {
    setSearchInput("");
    setFilters(DEFAULT_FILTERS);
  };

  const exportCsv = () => {
    if (!data?.items) return;
    const rows = [["Name", "SKU", "Price", "Quantity"], ...data.items.map((p) => [p.name, p.sku, p.price, p.quantity])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "products.csv" });
    a.click();
  };

  const hasFilters = filters.search || filters.min_price || filters.max_price || filters.low_stock;

  return (
    <Box>
      {/* Page header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Products</Typography>
          <Typography variant="body2" color="text.secondary">Manage your product catalogue</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv} disabled={!data?.items?.length}>
            Export
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add Product
          </Button>
        </Stack>
      </Stack>

      {/* Search + filters */}
      <Stack spacing={1.5} mb={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            placeholder="Search name or SKU…"
            value={searchInput}
            onChange={handleSearch}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
              endAdornment: searchInput ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setSearchInput(""); setFilter("search", ""); }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <TextField
            placeholder="Min $"
            type="number"
            value={filters.min_price}
            onChange={(e) => setFilter("min_price", e.target.value)}
            sx={{ width: { xs: "100%", sm: 110 } }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            placeholder="Max $"
            type="number"
            value={filters.max_price}
            onChange={(e) => setFilter("max_price", e.target.value)}
            sx={{ width: { xs: "100%", sm: 110 } }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <Chip
            label="Low stock"
            color={filters.low_stock ? "warning" : "default"}
            variant={filters.low_stock ? "filled" : "outlined"}
            onClick={() => setFilter("low_stock", !filters.low_stock)}
            sx={{ alignSelf: "center", cursor: "pointer" }}
          />
        </Stack>

        {/* Active filter chips */}
        {hasFilters && (
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {filters.search && <Chip size="small" label={`"${filters.search}"`} onDelete={() => { setSearchInput(""); setFilter("search", ""); }} />}
            {filters.min_price && <Chip size="small" label={`Min $${filters.min_price}`} onDelete={() => setFilter("min_price", "")} />}
            {filters.max_price && <Chip size="small" label={`Max $${filters.max_price}`} onDelete={() => setFilter("max_price", "")} />}
            {filters.low_stock && <Chip size="small" label="Low stock" color="warning" onDelete={() => setFilter("low_stock", false)} />}
            <Chip size="small" variant="outlined" label="Clear all" onClick={clearFilters} />
          </Stack>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{apiError(error)}</Alert>}

      {/* Table */}
      <TableContainer component={Paper} sx={{ position: "relative" }}>
        {isFetching && !isLoading && (
          <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: 0 }} />
        )}
        <Table>
          <TableHead>
            <TableRow>
              <SortHeader label="Name" field="name" filters={filters} onSort={handleSort} />
              <SortHeader label="SKU" field="sku" filters={filters} onSort={handleSort} />
              <SortHeader label="Price" field="price" filters={filters} onSort={handleSort} align="right" />
              <SortHeader label="Quantity" field="quantity" filters={filters} onSort={handleSort} align="right" />
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell align="right"><Skeleton width={60} /></TableCell>
                  <TableCell align="right"><Skeleton width={40} /></TableCell>
                  <TableCell align="right"><Skeleton width={70} /></TableCell>
                </TableRow>
              ))
            ) : data?.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary", fontStyle: "italic" }}>
                  {hasFilters ? (
                    <>No products match your filters. <Button size="small" onClick={clearFilters}>Clear filters</Button></>
                  ) : "No products yet. Add your first product."}
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{p.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontFamily: "monospace", fontSize: "0.8rem" }}>{p.sku}</TableCell>
                  <TableCell align="right">${Number(p.price).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Chip size="small" label={p.quantity} color={p.quantity < 5 ? "error" : p.quantity < 10 ? "warning" : "default"} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton onClick={() => openEdit(p)} size="small"><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setConfirm(p)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && (
          <TablePagination
            component="div"
            count={data.total}
            page={filters.page - 1}
            rowsPerPage={filters.limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_, p) => setFilters((f) => ({ ...f, page: p + 1 }))}
            onRowsPerPageChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
          />
        )}
      </TableContainer>

      {/* Add/Edit dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>{dialog.editing ? "Edit Product" : "Add Product"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Name" value={dialog.form.name} onChange={setField("name")} error={!!errors.name} helperText={errors.name} fullWidth />
            <TextField label="SKU / Code" value={dialog.form.sku} onChange={setField("sku")} error={!!errors.sku} helperText={errors.sku} fullWidth />
            <TextField label="Price" type="number" value={dialog.form.price} onChange={setField("price")} error={!!errors.price} helperText={errors.price} inputProps={{ step: "0.01", min: 0 }} fullWidth />
            <TextField label="Quantity in stock" type="number" value={dialog.form.quantity} onChange={setField("quantity")} error={!!errors.quantity} helperText={errors.quantity} inputProps={{ step: "1", min: 0 }} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
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
