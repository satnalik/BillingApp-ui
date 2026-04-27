import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./Login";
import NewBill from "./NewBill";
import BillingLayout from "./BillingLayout";
import PlaceholderPage from "./PlaceholderPage";
import AddSalesman from "./AddSalesman";
import AddProducts from "./AddProducts";
import GetBill from "./GetBill";
import Reports from "./Reports";

function App() {
  console.log("App component is rendering with Routes...");

  return (
    <BrowserRouter>
      <main className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<BillingLayout />}>
            <Route path="/new-bill" element={<NewBill />} />
            <Route
              path="/get-bill"
              element={<GetBill />}
            />
            <Route
              path="/add-products"
              element={<AddProducts />}
            />
            <Route
              path="/check-inventory"
              element={
                <PlaceholderPage
                  title="Check Inventory"
                  description="Monitor available stock, review product movement, and spot low inventory before the counter runs into issues."
                />
              }
            />
            <Route
              path="/add-salesman"
              element={<AddSalesman />}
            />
            <Route path="/reports" element={<Reports />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
