import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { RequireAuth } from "./layout/RequireAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { DevicePage } from "./pages/DevicePage";
import { LoginPage } from "./pages/LoginPage";
import { StoresPage } from "./pages/StoresPage";
import { StorePage } from "./pages/StorePage";
import { ConfigPage } from "./pages/ConfigPage";
import { DeviceCreatePage } from "./pages/DeviceCreatePage";
import { DevicesPage } from "./pages/DevicesPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="lojas" element={<StoresPage />} />
          <Route path="lojas/:id" element={<StorePage />} />
          <Route path="configuracao" element={<ConfigPage />} />
          <Route path="dispositivos" element={<DevicesPage />} />
          <Route path="dispositivos/novo" element={<DeviceCreatePage />} />
          <Route path="dispositivos/:id" element={<DevicePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
