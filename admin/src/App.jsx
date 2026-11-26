import { Navigate, Route, Routes } from "react-router";
import Layout from "./components/Layout";
import { PageLoader } from "./components/mech";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Mechanics from "./pages/Mechanics";
import Users from "./pages/Users";
import Messages from "./pages/Messages";
import Admins from "./pages/Admins";
import Revenue from "./pages/Revenue";

export default function App() {
  const { admin, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!admin) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="mechanics" element={<Mechanics />} />
        <Route path="users" element={<Users />} />
        <Route path="messages" element={<Messages />} />
        <Route path="admins" element={<Admins />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
