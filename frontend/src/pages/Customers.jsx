import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
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
import DeleteIcon from "@mui/icons-material/Delete";
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

export default function Customers() {
  const qc = useQueryClient();
  const notify = useNotify();
  const [dialog, setDialog] = useState({ open: false, form: EMPTY });
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["customers"],
    queryFn: CustomersApi.list,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["customers"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => CustomersApi.create(payload),
    onSuccess: () => {
      notify("Customer created");
      setDialog({ open: false, form: EMPTY });
      invalidate();
    },
    onError: (e) => notify(apiError(e), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => CustomersApi.remove(id),
    onSuccess: () => {
      notify("Customer deleted");
      setConfirm(null);
      invalidate();
    },
    onError: (e) => {
      notify(apiError(e), "error");
      setConfirm(null);
    },
  });

  const setField = (k) => (e) =>
    setDialog((d) => ({ ...d, form: { ...d.form, [k]: e.target.value } }));

  const handleSave = () => {
    const errs = validate(dialog.form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    createMutation.mutate({
      full_name: dialog.form.full_name.trim(),
      email: dialog.form.email.trim(),
      phone: dialog.form.phone.trim() || null,
    });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setErrors({});
            setDialog({ open: true, form: EMPTY });
          }}
        >
          Add Customer
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
                <TableCell>Full Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No customers yet. Add your first customer.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((c) => (
                  <TableRow key={c.id} hover>
                    <TableCell>{c.full_name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone || "—"}</TableCell>
                    <TableCell align="right">
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
        </TableContainer>
      )}

      <Dialog open={dialog.open} onClose={() => setDialog((d) => ({ ...d, open: false }))} fullWidth maxWidth="sm">
        <DialogTitle>Add Customer</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Full Name"
              value={dialog.form.full_name}
              onChange={setField("full_name")}
              error={!!errors.full_name}
              helperText={errors.full_name}
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={dialog.form.email}
              onChange={setField("email")}
              error={!!errors.email}
              helperText={errors.email}
              fullWidth
            />
            <TextField
              label="Phone"
              value={dialog.form.phone}
              onChange={setField("phone")}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={createMutation.isPending}>
            Save
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
