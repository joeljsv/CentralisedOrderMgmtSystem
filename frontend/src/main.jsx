import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App.jsx";
import theme from "./theme.js";
import { NotificationProvider } from "./components/Notification.jsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </NotificationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
