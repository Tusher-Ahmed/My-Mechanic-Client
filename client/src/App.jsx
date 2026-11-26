import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import { LogIn } from "lucide-react";
import Layout from "./components/Layout";
import { PageLoader } from "./components/mech";
import { Button, EmptyState } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Store from "./pages/Store";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

// pages that use the map library are loaded on demand
const MapPage = lazy(() => import("./pages/MapPage"));
const MechanicRegister = lazy(() => import("./pages/MechanicRegister"));
const MechanicDashboard = lazy(() => import("./pages/MechanicDashboard"));
const DemoCheckout = lazy(() => import("./pages/DemoCheckout"));

function RequireRole({ role, children }) {
  const auth = useAuth();
  if (auth.loading) return <PageLoader />;
  if (auth.role === role) return children;
  const who = role === "mechanic" ? "mechanic" : "car owner";
  return (
    <div className="container-page py-20">
      <EmptyState
        icon={<LogIn className="size-6" />}
        title={`Please log in as a ${who}`}
        action={<Button onClick={() => auth.openAuth("login", role)}>Log in</Button>}
      >
        {auth.role ? `You're logged in as a ${auth.role}. This page is for ${who}s.` : "You need to be logged in to see this page."}
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="map" element={<MapPage />} />
          <Route path="store/:id" element={<Store />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route
            path="account"
            element={
              <RequireRole role="user">
                <Account />
              </RequireRole>
            }
          />
          <Route path="mechanic/register" element={<MechanicRegister />} />
          <Route
            path="mechanic"
            element={
              <RequireRole role="mechanic">
                <MechanicDashboard />
              </RequireRole>
            }
          />
          <Route
            path="checkout/:tranId"
            element={
              <RequireRole role="mechanic">
                <DemoCheckout />
              </RequireRole>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
