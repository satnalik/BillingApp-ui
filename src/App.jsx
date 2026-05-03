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
            <Route
              path="/add-products"
              element={<AddProducts />}
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
