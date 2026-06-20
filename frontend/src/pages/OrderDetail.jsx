import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Paper,
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
import { Orders as OrdersApi } from "../api/resources";
import { apiError } from "../api/client";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => OrdersApi.get(id),
  });

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{apiError(error)}</Alert>;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/orders")} sx={{ mb: 2 }}>
        Back to orders
      </Button>

      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Order #{data.id}
        </Typography>
        <Chip label={data.status} color="success" variant="outlined" />
      </Stack>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary">
            Customer
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {data.customer_name} (ID: {data.customer_id})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Placed: {new Date(data.created_at).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

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
                <TableCell>{item.product_name || `Product #${item.product_id}`}</TableCell>
                <TableCell align="right">${Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell align="right">{item.quantity}</TableCell>
                <TableCell align="right">${Number(item.line_total).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="flex-end">
        <Typography variant="h6" fontWeight={700}>
          Total: ${Number(data.total_amount).toFixed(2)}
        </Typography>
      </Stack>
    </Box>
  );
}
