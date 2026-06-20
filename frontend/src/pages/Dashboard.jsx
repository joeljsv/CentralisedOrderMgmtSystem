import { useQuery } from "@tanstack/react-query";
import { alpha } from "@mui/material/styles";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
  XAxis,
  YAxis,
} from "recharts";
import { Dashboard as DashboardApi } from "../api/resources";
import { apiError } from "../api/client";

const STATUS_COLORS = {
  placed: "#4F46E5",
  shipped: "#F59E0B",
  delivered: "#10B981",
  cancelled: "#EF4444",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function StatCard({ icon, label, value, color, loading }) {
  return (
    <Card>
      <CardContent sx={{ p: "20px !important" }}>
        {loading ? (
          <>
            <Skeleton width={60} height={42} />
            <Skeleton width={100} />
          </>
        ) : (
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box>
              <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1, mb: 0.5 }}>
                {value}
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {label}
              </Typography>
            </Box>
            <Box
              sx={{
                bgcolor: (t) => alpha(t.palette[color].main, 0.12),
                color: `${color}.main`,
                borderRadius: 2.5,
                p: 1.25,
                display: "flex",
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function getBarColor(qty) {
  if (qty < 5) return "#EF4444";
  if (qty < 10) return "#F59E0B";
  return "#10B981";
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: DashboardApi.summary,
  });

  if (error) return <Alert severity="error">{apiError(error)}</Alert>;

  const cards = [
    { label: "Total Products", value: data?.total_products ?? "–", icon: <Inventory2Icon />, color: "primary" },
    { label: "Total Customers", value: data?.total_customers ?? "–", icon: <PeopleIcon />, color: "secondary" },
    { label: "Total Orders", value: data?.total_orders ?? "–", icon: <ReceiptLongIcon />, color: "success" },
    { label: "Low Stock Items", value: data?.low_stock_products?.length ?? "–", icon: <WarningAmberIcon />, color: "warning" },
  ];

  const pieData = (data?.order_status_counts ?? []).map((s) => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count,
    key: s.status,
  }));

  const barData = (data?.stock_chart ?? []).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name,
    quantity: p.quantity,
  }));

  return (
    <Box>
      {/* Greeting */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>
          {greeting()} 👋
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {todayLabel()} · Here's what's happening in your store.
        </Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} mb={3}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <StatCard {...c} loading={isLoading} />
          </Grid>
        ))}
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} mb={3}>
        {/* Stock levels bar chart */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Stock Levels (lowest first)
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : barData.length === 0 ? (
                <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography color="text.secondary">No products yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v) => [v, "Qty in stock"]}
                      contentStyle={{ borderRadius: 8, fontSize: 13 }}
                    />
                    <Bar dataKey="quantity" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={getBarColor(entry.quantity)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order status donut */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Orders by Status
              </Typography>
              {isLoading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : pieData.length === 0 ? (
                <Box sx={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography color="text.secondary">No orders yet</Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={85}
                      dataKey="value"
                      paddingAngle={3}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.key] || "#94A3B8"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 13 }} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Low stock table */}
      <Box mb={1} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="subtitle1">Low Stock Products</Typography>
        <Chip
          size="small"
          label={`< ${data?.low_stock_threshold ?? "–"} units`}
          color="warning"
          variant="outlined"
        />
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Qty</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton width={80} /></TableCell>
                  <TableCell><Skeleton width={40} /></TableCell>
                </TableRow>
              ))
            ) : data?.low_stock_products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 3, color: "text.secondary", fontStyle: "italic" }}>
                  All products are sufficiently stocked ✓
                </TableCell>
              </TableRow>
            ) : (
              (data?.low_stock_products ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell fontWeight={500}>{p.name}</TableCell>
                  <TableCell sx={{ color: "text.secondary", fontFamily: "monospace" }}>{p.sku}</TableCell>
                  <TableCell align="right">
                    <Chip label={p.quantity} color={p.quantity < 5 ? "error" : "warning"} size="small" />
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
