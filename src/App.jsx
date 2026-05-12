import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import NewBill from "./NewBill";
import BillingLayout from "./BillingLayout";
import AddSalesman from "./AddSalesman";
import AddProducts from "./AddProducts";
import GetBill from "./GetBill";
import Reports from "./Reports";
import BillHistory from "./BillHistory";
import Dues from "./Dues";
import TenantSettings from "./TenantSettings";
import AddUser from "./AddUser";
import SettingsLayout from "./SettingsLayout";
import Suppliers from "./Suppliers";
import { PurchaseDetail, PurchaseForm, PurchaseList } from "./Purchases";

function App() {
  console.log("App component is rendering with Routes...");

  return (
    <BrowserRouter>
      <main className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<BillingLayout />}>
            <Route path="/bill/new" element={<NewBill />} />
            <Route path="/bill/get" element={<GetBill />} />
            <Route path="/bill/history" element={<BillHistory />} />
            <Route path="/bill/dues" element={<Dues />} />
            <Route path="/new-bill" element={<Navigate to="/bill/new" replace />} />
            <Route path="/get-bill" element={<Navigate to="/bill/get" replace />} />
            <Route path="/masters" element={<Navigate to="/masters/products" replace />} />
            <Route path="/masters/products" element={<AddProducts />} />
            <Route path="/masters/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<PurchaseList />} />
            <Route path="/purchases/new" element={<PurchaseForm />} />
            <Route path="/purchases/:id" element={<PurchaseDetail />} />
            <Route path="/reports" element={<Reports />} />

            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/gst" replace />} />
              <Route path="gst" element={<TenantSettings />} />
              <Route path="users" element={<AddUser />} />
              <Route path="salesmen" element={<AddSalesman />} />
            </Route>

            {/* Backward-compatible routes */}
            <Route
              path="/tenant-settings"
              element={<Navigate to="/settings/gst" replace />}
            />
            <Route
              path="/add-products"
              element={<Navigate to="/masters/products" replace />}
            />
            <Route
              path="/add-salesman"
              element={<Navigate to="/settings/salesmen" replace />}
            />
            <Route
              path="/masters/salesmen"
              element={<Navigate to="/settings/salesmen" replace />}
            />
            <Route
              path="/suppliers"
              element={<Navigate to="/masters/suppliers" replace />}
            />
            <Route
              path="/users/new"
              element={<Navigate to="/settings/users" replace />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
