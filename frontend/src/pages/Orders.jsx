import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Select,
  FormControl,
  InputLabel,
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
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Customers as CustomersApi, Orders as OrdersApi, Products as ProductsApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const STATUS_COLORS = { placed: "primary", shipped: "warning", delivered: "success", cancelled: "error" };
const NEXT_STATUSES = { placed: ["shipped", "cancelled"], shipped: ["delivered", "cancelled"], delivered: [], cancelled: [] };

function newLine() { return { product_id: "", quantity: 1 }; }

function SortHeader({ label, field, filters, onSort, align = "left" }) {
  const active = filters.sort_by === field;
  return (
    <TableCell align={align} onClick={() => onSort(field)} sx={{ cursor: "pointer", whiteSpace: "nowrap" }}>
      <Stack direction="row" alignItems="center" spacing={0.5} justifyContent={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        {active ? (filters.sort_dir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />) : <UnfoldMoreIcon sx={{ fontSize: 14, opacity: 0.35 }} />}
      </Stack>
    </TableCell>
  );
}

const DEFAULT_FILTERS = { search: "", status: "", customer_id: "", sort_by: "created_at", sort_dir: "desc", page: 1, limit: 20 };

export default function Orders() {
  const qc = useQueryClient();
  const notify = useNotify();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState([newLine()]);
  const [formError, setFormError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [statusMenu, setStatusMenu] = useState({ anchor: null, order: null });
  const debounceRef = useRef(null);

  const ordersQuery = useQuery({ queryKey: ["orders", filters], queryFn: () => OrdersApi.list(filters) });
  const customersQuery = useQuery({ queryKey: ["customers", { limit: 200 }], queryFn: () => CustomersApi.list({ limit: 200 }) });
  const productsQuery = useQuery({ queryKey: ["products", { limit: 200 }], queryFn: () => ProductsApi.list({ limit: 200 }) });

  const productMap = useMemo(() => {
    const m = {};
    (productsQuery.data?.items || []).forEach((p) => (m[p.id] = p));
    return m;
  }, [productsQuery.data]);

  const estimatedTotal = useMemo(() =>
    lines.reduce((sum, l) => {
      const p = productMap[l.product_id];
      return sum + (p ? Number(p.price) * Number(l.quantity || 0) : 0);
    }, 0), [lines, productMap]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["orders"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => OrdersApi.create(payload),
    onSuccess: (order) => { notify(`Order #${order.id} placed — $${Number(order.total_amount).toFixed(2)}`); setOpen(false); invalidate(); },
    onError: (e) => setFormError(apiError(e)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => OrdersApi.updateStatus(id, status),
    onSuccess: (order) => { notify(`Order #${order.id} → ${order.status}`); invalidate(); },
    onError: (e) => notify(apiError(e), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => OrdersApi.remove(id),
    onSuccess: () => { notify("Order cancelled and stock restored"); setConfirm(null); invalidate(); },
    onError: (e) => { notify(apiError(e), "error"); setConfirm(null); },
  });

  const openDialog = () => { setCustomerId(""); setLines([newLine()]); setFormError(""); setOpen(true); };

  const updateLine = (idx, key, value) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));
  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (idx) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setFormError("");
    if (!customerId) return setFormError("Please select a customer");
    const items = lines.filter((l) => l.product_id && Number(l.quantity) > 0).map((l) => ({ product_id: Number(l.product_id), quantity: Number(l.quantity) }));
    if (!items.length) return setFormError("Add at least one product line");
    createMutation.mutate({ customer_id: Number(customerId), items });
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilters((f) => ({ ...f, search: val, page: 1 })), 300);
  };

  const handleSort = (field) => setFilters((f) => ({ ...f, sort_by: field, sort_dir: f.sort_by === field && f.sort_dir === "asc" ? "desc" : "asc", page: 1 }));
  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const clearFilters = () => { setSearchInput(""); setFilters(DEFAULT_FILTERS); };

  const exportCsv = () => {
    if (!ordersQuery.data?.items) return;
    const rows = [["Order #", "Customer", "Items", "Total", "Status", "Date"], ...ordersQuery.data.items.map((o) => [o.id, o.customer_name, o.items.length, o.total_amount, o.status, new Date(o.created_at).toLocaleDateString()])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "orders.csv" });
    a.click();
  };

  const hasFilters = filters.search || filters.status || filters.customer_id;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Orders</Typography>
          <Typography variant="body2" color="text.secondary">Track and manage customer orders</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv} disabled={!ordersQuery.data?.items?.length}>Export</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openDialog}>Create Order</Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack spacing={1.5} mb={2}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
          <TextField
            placeholder="Search order # or customer…"
            value={searchInput}
            onChange={handleSearch}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
              endAdornment: searchInput ? (
                <InputAdornment position="end"><IconButton size="small" onClick={() => { setSearchInput(""); setFilter("search", ""); }}><ClearIcon fontSize="small" /></IconButton></InputAdornment>
              ) : null,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={filters.status} onChange={(e) => setFilter("status", e.target.value)}>
              <MenuItem value="">All statuses</MenuItem>
              {["placed", "shipped", "delivered", "cancelled"].map((s) => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Customer</InputLabel>
            <Select label="Customer" value={filters.customer_id} onChange={(e) => setFilter("customer_id", e.target.value)}>
              <MenuItem value="">All customers</MenuItem>
              {(customersQuery.data?.items || []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
        {hasFilters && (
          <Stack direction="row" flexWrap="wrap" gap={0.75}>
            {filters.search && <Chip size="small" label={`"${filters.search}"`} onDelete={() => { setSearchInput(""); setFilter("search", ""); }} />}
            {filters.status && <Chip size="small" label={`Status: ${filters.status}`} onDelete={() => setFilter("status", "")} />}
            {filters.customer_id && <Chip size="small" label={`Customer filter`} onDelete={() => setFilter("customer_id", "")} />}
            <Chip size="small" variant="outlined" label="Clear all" onClick={clearFilters} />
          </Stack>
        )}
      </Stack>

      {ordersQuery.error && <Alert severity="error" sx={{ mb: 2 }}>{apiError(ordersQuery.error)}</Alert>}

      <TableContainer component={Paper} sx={{ position: "relative" }}>
        {ordersQuery.isFetching && !ordersQuery.isLoading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: 0 }} />}
        <Table>
          <TableHead>
            <TableRow>
              <SortHeader label="Order #" field="id" filters={filters} onSort={handleSort} />
              <TableCell>Customer</TableCell>
              <TableCell align="right">Items</TableCell>
              <SortHeader label="Total" field="total_amount" filters={filters} onSort={handleSort} align="right" />
              <TableCell>Status</TableCell>
              <SortHeader label="Date" field="created_at" filters={filters} onSort={handleSort} />
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordersQuery.isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : ordersQuery.data?.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary", fontStyle: "italic" }}>
                  {hasFilters ? (<>No orders match your filters. <Button size="small" onClick={clearFilters}>Clear</Button></>) : "No orders yet. Create your first order."}
                </TableCell>
              </TableRow>
            ) : (
              (ordersQuery.data?.items ?? []).map((o) => {
                const transitions = NEXT_STATUSES[o.status] ?? [];
                return (
                  <TableRow key={o.id} hover>
                    <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>#{o.id}</TableCell>
                    <TableCell>{o.customer_name}</TableCell>
                    <TableCell align="right">{o.items.length}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(o.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={o.status}
                        color={STATUS_COLORS[o.status] || "default"}
                        variant="outlined"
                        onClick={transitions.length ? (e) => setStatusMenu({ anchor: e.currentTarget, order: o }) : undefined}
                        deleteIcon={transitions.length ? <ExpandMoreIcon /> : undefined}
                        onDelete={transitions.length ? (e) => setStatusMenu({ anchor: e.currentTarget, order: o }) : undefined}
                        sx={{ cursor: transitions.length ? "pointer" : "default" }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View details">
                        <IconButton size="small" onClick={() => navigate(`/orders/${o.id}`)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel order">
                        <IconButton size="small" color="error" onClick={() => setConfirm(o)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {ordersQuery.data && (
          <TablePagination
            component="div"
            count={ordersQuery.data.total}
            page={filters.page - 1}
            rowsPerPage={filters.limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_, p) => setFilters((f) => ({ ...f, page: p + 1 }))}
            onRowsPerPageChange={(e) => setFilters((f) => ({ ...f, limit: Number(e.target.value), page: 1 }))}
          />
        )}
      </TableContainer>

      {/* Status update menu */}
      <Menu anchorEl={statusMenu.anchor} open={Boolean(statusMenu.anchor)} onClose={() => setStatusMenu({ anchor: null, order: null })}>
        {(NEXT_STATUSES[statusMenu.order?.status] ?? []).map((s) => (
          <MenuItem key={s} onClick={() => { updateStatusMutation.mutate({ id: statusMenu.order.id, status: s }); setStatusMenu({ anchor: null, order: null }); }}>
            Mark as <strong style={{ marginLeft: 4 }}>{s}</strong>
          </MenuItem>
        ))}
      </Menu>

      {/* Create order dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create New Order</DialogTitle>
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
              {(customersQuery.data?.items ?? []).map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.full_name} ({c.email})</MenuItem>
              ))}
            </TextField>

            <Divider sx={{ my: 0.5 }}>Line Items</Divider>

            {lines.map((line, idx) => {
              const product = productMap[line.product_id];
              const subtotal = product ? Number(product.price) * Number(line.quantity || 0) : 0;
              return (
                <Grid container spacing={1} alignItems="center" key={idx}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select label="Product" value={line.product_id} fullWidth size="small"
                      onChange={(e) => updateLine(idx, "product_id", e.target.value)}
                    >
                      {(productsQuery.data?.items ?? []).map((p) => (
                        <MenuItem key={p.id} value={p.id} disabled={p.quantity <= 0}>
                          {p.name} — ${Number(p.price).toFixed(2)} ({p.quantity} in stock)
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={5} sm={3}>
                    <TextField label="Qty" type="number" size="small" value={line.quantity} fullWidth
                      onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                      inputProps={{ min: 1, step: 1 }}
                    />
                  </Grid>
                  <Grid item xs={5} sm={2}>
                    <Typography variant="body2" align="right" fontWeight={600}>${subtotal.toFixed(2)}</Typography>
                  </Grid>
                  <Grid item xs={2} sm={1}>
                    <IconButton size="small" color="error" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color="text.secondary" variant="body2">Estimated Total (final calculated by server)</Typography>
              <Typography variant="h6" fontWeight={700}>${estimatedTotal.toFixed(2)}</Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Placing…" : "Place Order"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        title="Cancel order"
        message={`Cancel order #${confirm?.id}? Stock will be restored.`}
        confirmLabel="Cancel Order"
        onCancel={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
      />
    </Box>
  );
}
