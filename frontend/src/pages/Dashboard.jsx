import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
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
import { Dashboard as DashboardApi } from "../api/resources";
import { apiError } from "../api/client";

function StatCard({ icon, label, value, color }) {
  return (
    <Card elevation={2}>
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            color: `${color}.dark`,
            borderRadius: 2,
            p: 1.5,
            display: "flex",
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: DashboardApi.summary,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{apiError(error)}</Alert>;
  }

  const cards = [
    { label: "Total Products", value: data.total_products, icon: <Inventory2Icon />, color: "primary" },
    { label: "Total Customers", value: data.total_customers, icon: <PeopleIcon />, color: "secondary" },
    { label: "Total Orders", value: data.total_orders, icon: <ReceiptLongIcon />, color: "success" },
    { label: "Low Stock Items", value: data.low_stock_products.length, icon: <WarningAmberIcon />, color: "warning" },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.label}>
            <StatCard {...c} />
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" fontWeight={600} gutterBottom>
        Low Stock Products{" "}
        <Chip
          size="small"
          label={`< ${data.low_stock_threshold} units`}
          color="warning"
          variant="outlined"
        />
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Quantity</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.low_stock_products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  All products are sufficiently stocked.
                </TableCell>
              </TableRow>
            ) : (
              data.low_stock_products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.sku}</TableCell>
                  <TableCell align="right">
                    <Chip label={p.quantity} color="warning" size="small" />
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
