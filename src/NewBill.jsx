import React, { useState, useEffect } from "react";
import api from "./api";

export default function NewBill() {
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState("");
  const [salesmanQuery, setSalesmanQuery] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchSalesmen = async () => {
      try {
        const response = await api.get("/salesman");
        setSalesmen(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.error("Salesman load failed:", err);
        setSalesmen([]);
      }
    };

    fetchSalesmen();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const response = await api.get(
            `/products/search?name=${searchQuery}`,
          );
          setSearchResults(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
          console.error("Search failed:", err);
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      updateQty(product.id, 1);
    } else {
      setCart([...cart, { ...product, qty: 1, discount: 0 }]);
    }

    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQty = (id, delta) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item,
      ),
    );
  };

  const updateDiscount = (id, value) => {
    const numValue =
      value === "" ? 0 : Math.min(100, Math.max(0, parseFloat(value) || 0));

    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, discount: numValue } : item,
      ),
    );
  };

  const getDiscountedPrice = (item) => {
    const price = Number(item.price) || 0;
    const discountPercent = Number(item.discount) || 0;
    return price - (price * discountPercent) / 100;
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const filteredSalesmen = salesmen.filter((salesman) =>
    salesman.name?.toLowerCase().includes(salesmanQuery.toLowerCase()),
  );

  const handleSalesmanSelect = (salesman) => {
    setSelectedSalesman(salesman.employeeId);
    setSalesmanQuery(salesman.name || "");
  };

  const getTotals = () => {
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;

    cart.forEach((item) => {
      const qty = Number(item.qty) || 0;
      const itemTaxable = getDiscountedPrice(item) * qty;
      taxable += itemTaxable;
      cgst += itemTaxable * 0.09;
      sgst += itemTaxable * 0.09;
    });

    const grandTotal = taxable + cgst + sgst;
    return { taxable, cgst, sgst, grandTotal };
  };

  const totals = getTotals();
  const formattedDayTime = currentTime.toLocaleString("en-IN", {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formattedDate = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleCompleteBilling = async () => {
    if (!selectedSalesman || cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const billData = {
        salesMan: { employeeId: selectedSalesman }, // Correctly nested for @ManyToOne
        items: cart.map((item) => ({
          productName: item.name,
          quantity: item.qty,
          discount: item.discount, // Percentage as per your getDiscountedPrice logic
          priceAtSale: Number(item.price) || 0,
        })),
        customerName: customerName.trim() || "Guest",
        contactInfo: contactNumber.trim() || "N/A",
      };

      const response = await api.post("/bills", billData);

      if (response.status === 200 || response.status === 201) {
        alert("Bill Generated Successfully!");

        // OPTIONAL: Automatically open the PDF after saving
        if (response.data?.id) {
          window.open(
            `${api.defaults.baseURL}/bills/${response.data.id}/pdf`,
            "_blank",
          );
        }

        // Reset state
        setCart([]);
        setSalesmanQuery("");
        setSelectedSalesman("");
        setCustomerName("");
        setContactNumber("");
        setSearchQuery("");
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Billing Error:", err);
      alert(err.response?.data?.message || "Failed to save bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 font-sans">
      <div className="min-h-full w-full rounded-none border-0 bg-transparent p-0 shadow-none">
        <div className="mb-8 border-b pb-4">
          <div className="mb-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-700">
                {formattedDayTime}
              </div>
              <div className="text-xs text-slate-500">{formattedDate}</div>
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-center gap-4">
              <label className="w-36 shrink-0 text-sm font-bold text-slate-600">
                Customer Name
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                className="w-1/4 min-w-56 rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-36 shrink-0 text-sm font-bold text-slate-600">
                Contact Number
              </label>
              <input
                type="tel"
                placeholder="Enter contact number"
                className="w-1/4 min-w-56 rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative">
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Salesman
            </label>
            <input
              type="text"
              placeholder="Search salesman..."
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={salesmanQuery}
              onChange={(e) => {
                setSalesmanQuery(e.target.value);
                setSelectedSalesman("");
              }}
            />
            {salesmanQuery.trim().length > 0 && !selectedSalesman && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-2xl">
                {filteredSalesmen.length > 0 ? (
                  filteredSalesmen.map((salesman) => (
                    <button
                      key={salesman.employeeId}
                      type="button"
                      onClick={() => handleSalesmanSelect(salesman)}
                      className="flex w-full justify-between border-b p-3 text-left hover:bg-blue-50"
                    >
                      <span>{salesman.name}</span>
                      <span className="text-sm text-slate-500">
                        {salesman.employeeId}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-slate-500">
                    No salesman found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="mb-2 block text-sm font-bold text-slate-600">
              Product Search
            </label>
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-xl border-2 border-slate-200 p-3 outline-none focus:border-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white shadow-2xl">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex cursor-pointer justify-between border-b p-3 hover:bg-blue-50"
                  >
                    <span>{p.name}</span>
                    <span className="font-bold text-blue-600">
                      Rs {p.price}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-left">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 font-bold text-slate-600">Item</th>
                <th className="p-4 text-center font-bold text-slate-600">
                  Qty
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Price
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Disc (%)
                </th>
                <th className="p-4 text-right font-bold text-slate-600">
                  Total
                </th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-4 text-slate-800">{item.name}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="hover:text-blue-600"
                        aria-label={`Decrease quantity for ${item.name}`}
                      >
                        <span aria-hidden="true">-</span>
                      </button>
                      <span className="font-bold">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="hover:text-blue-600"
                        aria-label={`Increase quantity for ${item.name}`}
                      >
                        <span aria-hidden="true">+</span>
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right">Rs {item.price}</td>
                  <td className="p-4 text-right">
                    <input
                      type="number"
                      className="w-16 border-b text-right"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount === 0 ? "" : item.discount}
                      onChange={(e) => updateDiscount(item.id, e.target.value)}
                    />
                  </td>
                  <td className="p-4 text-right font-bold text-blue-600">
                    Rs {(getDiscountedPrice(item) * item.qty).toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-400 hover:text-red-600"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <span aria-hidden="true">x</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-2 border-t pt-6">
          <div className="text-right text-sm text-slate-500">
            <p>CGST (9%): Rs {totals.cgst.toFixed(2)}</p>
            <p>SGST (9%): Rs {totals.sgst.toFixed(2)}</p>
          </div>
          <h2 className="text-5xl font-black text-slate-900">
            Rs {Math.round(totals.grandTotal)}
          </h2>
          <button
            type="button"
            onClick={handleCompleteBilling}
            disabled={cart.length === 0 || !selectedSalesman || isSubmitting}
            className="mt-4 rounded-xl bg-blue-600 px-12 py-4 font-bold text-white hover:bg-blue-700 disabled:bg-slate-200"
          >
            {isSubmitting ? "SAVING..." : "COMPLETE BILLING"}
          </button>
        </div>
      </div>
    </div>
  );
}
