import { createContext, useCallback, useContext, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const NotificationContext = createContext(() => {});

export function NotificationProvider({ children }) {
  const [state, setState] = useState({ open: false, message: "", severity: "info" });

  const notify = useCallback((message, severity = "success") => {
    setState({ open: true, message, severity });
  }, []);

  const handleClose = (_e, reason) => {
    if (reason === "clickaway") return;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleClose} severity={state.severity} variant="filled" sx={{ width: "100%" }}>
          {state.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  return useContext(NotificationContext);
}
