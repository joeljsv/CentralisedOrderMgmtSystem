import { useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  AppBar,
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DashboardIcon from "@mui/icons-material/Dashboard";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import StorefrontIcon from "@mui/icons-material/Storefront";

const DRAWER_WIDTH = 240;

const NAV = [
  { label: "Dashboard", path: "/", icon: <DashboardIcon /> },
  { label: "Products", path: "/products", icon: <Inventory2Icon /> },
  { label: "Customers", path: "/customers", icon: <PeopleIcon /> },
  { label: "Orders", path: "/orders", icon: <ReceiptLongIcon /> },
];

const PAGE_LABELS = {
  "/": "Dashboard",
  "/products": "Products",
  "/customers": "Customers",
  "/orders": "Orders",
};

function getPageLabel(pathname) {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  if (pathname.startsWith("/orders/")) return "Order Detail";
  if (pathname.startsWith("/customers/")) return "Customer Detail";
  return "OMS";
}

function SidebarContent({ isActive, onNav }) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Brand */}
      <Box sx={{ px: 3, py: 3, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <StorefrontIcon sx={{ color: "#fff", fontSize: 20 }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.01em" }}
            >
              OMS
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", fontSize: "0.65rem" }}>
              Management System
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ mt: 1.5, flexGrow: 1 }}>
        <List disablePadding>
          {NAV.map((item) => (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={isActive(item.path)}
              onClick={onNav}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 2.5, py: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.25)", fontSize: "0.65rem" }}>
          © 2025 OMS Platform
        </Typography>
      </Box>
    </Box>
  );
}

export default function Layout({ children }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const currentNavPath =
    NAV.find((n) => isActive(n.path))?.path ?? "/";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop permanent sidebar */}
      {isDesktop && (
        <Drawer
          variant="permanent"
          data-print="hide"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          <SidebarContent isActive={isActive} onNav={() => {}} />
        </Drawer>
      )}

      {/* Content column */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
        }}
      >
        {/* Top AppBar */}
        <AppBar position="sticky" sx={{ zIndex: (t) => t.zIndex.drawer - 1 }}>
          <Toolbar sx={{ gap: 1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
              {getPageLabel(location.pathname)}
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            pb: { xs: 10, md: 3 },
            bgcolor: "background.default",
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile bottom navigation */}
      {!isDesktop && (
        <Paper
          data-print="hide"
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
            borderRadius: 0,
          }}
          elevation={8}
        >
          <BottomNavigation value={currentNavPath}>
            {NAV.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                value={item.path}
                icon={item.icon}
                component={RouterLink}
                to={item.path}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
