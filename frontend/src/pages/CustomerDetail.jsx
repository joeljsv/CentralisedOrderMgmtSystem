import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
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
import EmailIcon from "@mui/icons-material/Email";
import PhoneIcon from "@mui/icons-material/Phone";
import { Customers as CustomersApi } from "../api/resources";
import { apiError } from "../api/client";

const STATUS_COLORS = { placed: "primary", shipped: "warning", delivered: "success", cancelled: "error" };

const AVATAR_COLORS = ["#4F46E5", "#059669", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
const avatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

function initials(name) {
  return (name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const customerQuery = useQuery({
    queryKey: ["customers", id],
    queryFn: () => CustomersApi.get(id),
  });

  const ordersQuery = useQuery({
    queryKey: ["customer-orders", id],
    queryFn: () => CustomersApi.orders(id),
    enabled: !!id,
  });

  const c = customerQuery.data;
  const orders = ordersQuery.data ?? [];

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/customers")} sx={{ mb: 2 }}>
        Back to Customers
      </Button>

      {/* Customer profile card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {customerQuery.isLoading ? (
            <Stack direction="row" spacing={2} alignItems="center">
              <Skeleton variant="circular" width={64} height={64} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width={160} height={28} />
                <Skeleton width={220} />
                <Skeleton width={120} />
              </Box>
            </Stack>
          ) : customerQuery.error ? (
            <Alert severity="error">{apiError(customerQuery.error)}</Alert>
          ) : (
            <Stack direction="row" spacing={2.5} alignItems="flex-start">
              <Avatar
                sx={{ width: 64, height: 64, fontSize: "1.4rem", fontWeight: 800, bgcolor: avatarColor(c?.id) }}
              >
                {initials(c?.full_name)}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{c?.full_name}</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.25}>
                  <EmailIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">{c?.email}</Typography>
                </Stack>
                {c?.phone && (
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={0.25}>
                    <PhoneIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">{c.phone}</Typography>
                  </Stack>
                )}
                <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
                  Customer since {c ? new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "—"}
                </Typography>
              </Box>

              {/* Quick stats */}
              <Box sx={{ ml: "auto !important" }}>
                <Grid container spacing={2}>
                  <Grid item>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h5" fontWeight={800} color="primary.main">{orders.length}</Typography>
                      <Typography variant="caption" color="text.secondary">Orders</Typography>
                    </Box>
                  </Grid>
                  <Grid item>
                    <Box sx={{ textAlign: "center" }}>
                      <Typography variant="h5" fontWeight={800} color="success.main">
                        ${orders.reduce((s, o) => s + Number(o.total_amount), 0).toFixed(0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Total spent</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Order history */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle1">Order History</Typography>
        <Chip size="small" label={`${orders.length} order${orders.length !== 1 ? "s" : ""}`} />
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell align="right">Items</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordersQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: "text.secondary", fontStyle: "italic" }}>
                  No orders for this customer yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <TableCell sx={{ fontWeight: 600, color: "primary.main" }}>#{o.id}</TableCell>
                  <TableCell align="right">{o.items.length}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>${Number(o.total_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={o.status} color={STATUS_COLORS[o.status] || "default"} variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary", fontSize: "0.82rem" }}>
                    {new Date(o.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
