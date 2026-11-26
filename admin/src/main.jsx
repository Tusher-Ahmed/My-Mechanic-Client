import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { ConfirmProvider } from "./components/admin-ui";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
          <Toaster position="top-center" offset={{ top: 76 }} mobileOffset={{ top: 72 }} richColors closeButton toastOptions={{ className: "font-sans" }} />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>
);
