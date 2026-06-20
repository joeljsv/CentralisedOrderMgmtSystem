import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

const DRAWER_WIDTH = 230;

const NAV = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Products", path: "/products", icon: <Inventory2Icon /> },
  { label: "Customers", path: "/customers", icon: <PeopleIcon /> },
  { label: "Orders", path: "/orders", icon: <ReceiptLongIcon /> },
];

export default function Layout({ children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap fontWeight={700} color="primary">
          OMS
        </Typography>
      </Toolbar>
      <List>
        {NAV.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={isActive(item.path)}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen((o) => !o)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap fontWeight={600}>
            Inventory & Order Management
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? "permanent" : "temporary"}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
