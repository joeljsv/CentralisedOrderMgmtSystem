import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
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
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Customers as CustomersApi } from "../api/resources";
import { apiError } from "../api/client";
import { useNotify } from "../components/Notification.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";

const EMPTY = { full_name: "", email: "", phone: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = "Full name is required";
  if (!form.email.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email";
  return errors;
}

function SortHeader({ label, field, filters, onSort, align = "left" }) {
  const active = filters.sort_by === field;
  return (
    <TableCell align={align} onClick={() => onSort(field)} sx={{ cursor: "pointer", whiteSpace: "nowrap" }}>
      <Stack direction="row" alignItems="center" spacing={0.5} justifyContent={align === "right" ? "flex-end" : "flex-start"}>
        <span>{label}</span>
        {active ? (
          filters.sort_dir === "asc" ? <ArrowUpwardIcon sx={{ fontSize: 14 }} /> : <ArrowDownwardIcon sx={{ fontSize: 14 }} />
        ) : (
          <UnfoldMoreIcon sx={{ fontSize: 14, opacity: 0.35 }} />
        )}
      </Stack>
    </TableCell>
  );
}

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = ["#4F46E5", "#059669", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

const DEFAULT_FILTERS = { search: "", sort_by: "full_name", sort_dir: "asc", page: 1, limit: 20 };

export default function Customers() {
  const qc = useQueryClient();
  const notify = useNotify();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState({ open: false, form: EMPTY });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["customers", filters],
    queryFn: () => CustomersApi.list(filters),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => CustomersApi.create(payload),
    onSuccess: () => { notify("Customer created"); setDialog({ open: false, form: EMPTY }); invalidate(); },
    onError: (e) => notify(apiError(e), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => CustomersApi.remove(id),
    onSuccess: () => { notify("Customer deleted"); setConfirm(null); invalidate(); },
    onError: (e) => { notify(apiError(e), "error"); setConfirm(null); },
  });

  const setField = (k) => (e) => setDialog((d) => ({ ...d, form: { ...d.form, [k]: e.target.value } }));

  const handleSave = () => {
    const errs = validate(dialog.form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    createMutation.mutate({ full_name: dialog.form.full_name.trim(), email: dialog.form.email.trim(), phone: dialog.form.phone.trim() || null });
  };

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setFilters((f) => ({ ...f, search: val, page: 1 })), 300);
  };

  const handleSort = (field) => {
    setFilters((f) => ({ ...f, sort_by: field, sort_dir: f.sort_by === field && f.sort_dir === "asc" ? "desc" : "asc", page: 1 }));
  };

  const clearFilters = () => { setSearchInput(""); setFilters(DEFAULT_FILTERS); };

  const exportCsv = () => {
    if (!data?.items) return;
    const rows = [["Name", "Email", "Phone"], ...data.items.map((c) => [c.full_name, c.email, c.phone || ""])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: "customers.csv" });
    a.click();
  };

  const hasFilters = !!filters.search;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Customers</Typography>
          <Typography variant="body2" color="text.secondary">View and manage your customer accounts</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv} disabled={!data?.items?.length}>Export</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setErrors({}); setDialog({ open: true, form: EMPTY }); }}>
            Add Customer
          </Button>
        </Stack>
      </Stack>

      {/* Search */}
      <Stack spacing={1.5} mb={2}>
        <TextField
          placeholder="Search name or email…"
          value={searchInput}
          onChange={handleSearch}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} /></InputAdornment>,
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchInput(""); setFilters((f) => ({ ...f, search: "", page: 1 })); }}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ maxWidth: 400 }}
        />
        {hasFilters && (
          <Stack direction="row" gap={0.75}>
            <Chip size="small" label={`"${filters.search}"`} onDelete={clearFilters} />
            <Chip size="small" variant="outlined" label="Clear all" onClick={clearFilters} />
          </Stack>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{apiError(error)}</Alert>}

      <TableContainer component={Paper} sx={{ position: "relative" }}>
        {isFetching && !isLoading && <LinearProgress sx={{ position: "absolute", top: 0, left: 0, right: 0, borderRadius: 0 }} />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 52 }} />
              <SortHeader label="Name" field="full_name" filters={filters} onSort={handleSort} />
              <SortHeader label="Email" field="email" filters={filters} onSort={handleSort} />
              <TableCell>Phone</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton variant="circular" width={32} height={32} /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton width={160} /></TableCell>
                  <TableCell><Skeleton width={100} /></TableCell>
                  <TableCell align="right"><Skeleton width={70} /></TableCell>
                </TableRow>
              ))
            ) : data?.items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary", fontStyle: "italic" }}>
                  {hasFilters ? (
                    <>No customers match your search. <Button size="small" onClick={clearFilters}>Clear</Button></>
                  ) : "No customers yet. Add your first customer."}
                </TableCell>
              </TableRow>
            ) : (
              (data?.items ?? []).map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 700, bgcolor: avatarColor(c.id) }}>
                      {initials(c.full_name)}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{c.full_name}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{c.email}</TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{c.phone || "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View orders">
                      <IconButton size="small" onClick={() => navigate(`/customers/${c.id}`)}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton onClick={() => setConfirm(c)} size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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

      {/* Add dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>Add Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField label="Full Name" value={dialog.form.full_name} onChange={setField("full_name")} error={!!errors.full_name} helperText={errors.full_name} fullWidth />
            <TextField label="Email" type="email" value={dialog.form.email} onChange={setField("email")} error={!!errors.email} helperText={errors.email} fullWidth />
            <TextField label="Phone (optional)" value={dialog.form.phone} onChange={setField("phone")} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        title="Delete customer"
        message={`Delete "${confirm?.full_name}"? Their orders will also be removed.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => deleteMutation.mutate(confirm.id)}
      />
    </Box>
  );
}
