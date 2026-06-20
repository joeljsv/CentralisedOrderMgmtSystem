import { createTheme } from "@mui/material/styles";

const INDIGO = "#4F46E5";
const BORDER = "#E2E8F0";
const SIDEBAR_BG = "#0F172A";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: INDIGO, light: "#818CF8", dark: "#3730A3", contrastText: "#fff" },
    secondary: { main: "#059669", light: "#34D399", dark: "#047857", contrastText: "#fff" },
    success: { main: "#10B981", light: "#34D399", dark: "#059669" },
    warning: { main: "#F59E0B", light: "#FCD34D", dark: "#D97706" },
    error: { main: "#EF4444", light: "#FCA5A5", dark: "#DC2626" },
    background: { default: "#F1F5F9", paper: "#FFFFFF" },
    text: { primary: "#0F172A", secondary: "#64748B" },
    divider: BORDER,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: ["Inter", "Roboto", "Helvetica", "Arial", "sans-serif"].join(","),
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    h5: { fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "default" },
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#0F172A",
          borderBottom: `1px solid ${BORDER}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR_BG,
          color: "rgba(255,255,255,0.85)",
          border: "none",
          boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: "none", border: `1px solid ${BORDER}` } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: `1px solid ${BORDER}`, backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600, borderRadius: 8 },
        contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: "#F8FAFC",
            color: "#64748B",
            fontWeight: 600,
            fontSize: "0.72rem",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            borderBottom: `1px solid ${BORDER}`,
            userSelect: "none",
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { "&:last-child td": { borderBottom: 0 } },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BORDER, padding: "10px 16px" },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: { borderTop: `1px solid ${BORDER}` },
        toolbar: { paddingLeft: 16 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: "0.75rem" } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: "none", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, fontSize: "1.1rem" } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: BORDER },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#94A3B8" },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 10px",
          padding: "9px 12px",
          color: "rgba(255,255,255,0.60)",
          transition: "all 0.15s",
          "& .MuiListItemIcon-root": { color: "rgba(255,255,255,0.55)", minWidth: 36 },
          "&.Mui-selected": {
            backgroundColor: INDIGO,
            color: "#FFFFFF",
            "& .MuiListItemIcon-root": { color: "#FFFFFF" },
            "&:hover": { backgroundColor: "#4338CA" },
          },
          "&:hover": {
            backgroundColor: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.90)",
            "& .MuiListItemIcon-root": { color: "rgba(255,255,255,0.85)" },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontWeight: 500, fontSize: "0.9rem" },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: "#FFFFFF", borderTop: `1px solid ${BORDER}`, height: 62 },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: "#94A3B8",
          "&.Mui-selected": { color: INDIGO },
          "& .MuiBottomNavigationAction-label": { fontWeight: 600, fontSize: "0.68rem" },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 4, height: 3 } },
    },
    MuiSkeleton: { defaultProps: { animation: "wave" } },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontWeight: 600, fontSize: "0.72rem", borderRadius: 6 } },
    },
  },
});

export default theme;
