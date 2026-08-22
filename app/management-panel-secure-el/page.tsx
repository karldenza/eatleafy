"use client";
import React, { useState, useEffect } from "react";
import { calculateProgramStatus } from "@/utils/dateHelpers";
import { supabase } from "@/utils/supabase";

interface Customer {
  id: string;
  name: string;
  whatsapp: string;
  address: string;
  address_backup: string;
  instagram?: string;
  is_paused: boolean;
  start_date: string;
  duration_days: number;
  paused_dates: string[]; 
  menu_plan: string[];
  order_type?: "ONLINE" | "OFFLINE";
  note?: string;
  payment_proof_url?: string;
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [packageFilter, setPackageFilter] = useState<"ALL" | "MONTHLY" | "24DAYS" | "WEEKLY" | "OFFLINE">("ALL");
  const [activeCalendarCustomerId, setActiveCalendarCustomerId] = useState<string | null>(null);

  // State untuk Fitur Edit Menu
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editMenuText, setEditMenuText] = useState("");

  // Form State
  const [orderType, setOrderType] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [addressBackup, setAddressBackup] = useState("");
  const [instagram, setInstagram] = useState("");
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState("2026-06-01");
  const [durationDays, setDurationDays] = useState(30);

  const generateMenuTemplate = (days: number) => {
    const finalDays = orderType === "OFFLINE" ? 1 : days;
  
    const menuList = [
      "Nasi Merah dengan Dada Ayam Panggang dan Brokoli Kukus + Buah",
      "Chicken Steak with Lemonilo Noodles + Buah",
      "Chicken Steak with Potato Wedges + Buah",
      "Nasi Merah dengan Ikan Nila Bakar dan Sayur Bening + Buah",
      "Nasi Putih dengan Ikan Tongkol Bakar dan Lalapan + Buah",
      "Baso Louha + Buah",
      "Nasi Merah dengan Tumis Udang, Buncis, dan Wortel + Buah",
      "Nasi Putih dengan Dada Ayam Rebus dan Sayur Bayam + Buah",
      "Carbonara Chicken Steak with Potato Wedges + Buah",
      "Nasi Merah dengan 2 Telur Rebus dan Capcay + Buah",
      "Nasi Putih dengan Pepes Tahu dan Sayur Asem + Buah",
      "Nasi Goreng Merah + Buah",
      "Nasi Putih dengan Udang Saus Bawang Putih dan Brokoli + Buah",
      "Salad Wrap + Buah",
      "Nasi Putih dengan Ayam Suwir dan Tumis Sawi + Buah",
      "Sweet & Spicy Shrimp with Potato Wedges + Buah",
      "Grilled Chicken Salad with Spring Roll + Buah",
      "Kimbap Nasi Merah + Buah",
      "Chicken Roulade with Rice + Buah",
      "Nasi Merah dengan Dada Ayam Panggang dan Brokoli Kukus + Buah",
      "Chicken Steak with Lemonilo Noodles + Buah",
      "Chicken Steak with Potato Wedges + Buah",
      "Nasi Merah dengan Ikan Nila Bakar dan Sayur Bening + Buah",
      "Nasi Putih dengan Ikan Tongkol Bakar dan Lalapan + Buah",
      "Baso Louha + Buah",
      "Nasi Merah dengan Tumis Udang, Buncis, dan Wortel + Buah",
      "Nasi Putih dengan Dada Ayam Rebus dan Sayur Bayam + Buah",
      "Carbonara Chicken Steak with Potato Wedges + Buah",
      "Nasi Goreng Merah + Buah",
      "Sweet & Spicy Shrimp with Potato Wedges + Buah"
    ];
  
    return Array.from({ length: finalDays }, (_, i) => {
      if (orderType === "OFFLINE") {
        return `Menu: Custom Offline Healthy Pack`;
      }
      const currentMenu = menuList[i % menuList.length];
      return `Day ${i + 1}: ${currentMenu}`;
    }).join("\n");
  };

  const [menuPlanText, setMenuPlanText] = useState(generateMenuTemplate(30));

  useEffect(() => {
    setMenuPlanText(generateMenuTemplate(durationDays));
  }, [durationDays, orderType]);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        const formattedData = (data || []).map((c: any) => ({
          ...c,
          paused_dates: Array.isArray(c.paused_dates) ? c.paused_dates : [],
        }));
        setCustomers(formattedData);
        setFilteredCustomers(formattedData);
      } else {
        alert(error.message);
      }
      setIsLoading(false);
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    let result = customers;
    if (packageFilter === "MONTHLY") {
      result = customers.filter((c) => c.order_type !== "OFFLINE" && c.duration_days === 30);
    } else if (packageFilter === "24DAYS") {
      result = customers.filter((c) => c.order_type !== "OFFLINE" && c.duration_days === 24);
    } else if (packageFilter === "WEEKLY") {
      result = customers.filter((c) => c.order_type !== "OFFLINE" && c.duration_days === 7);
    } else if (packageFilter === "OFFLINE") {
      result = customers.filter((c) => c.order_type === "OFFLINE");
    }
    setFilteredCustomers(result);
  }, [packageFilter, customers]);

  const stats = {
    total: customers.length,
    running: customers.filter(c => !c.is_paused && c.order_type !== "OFFLINE").length,
    hold: customers.filter(c => c.is_paused && c.order_type !== "OFFLINE").length,
    monthly: customers.filter(c => c.order_type !== "OFFLINE" && c.duration_days === 30).length,
    twentyFourDays: customers.filter(c => c.order_type !== "OFFLINE" && c.duration_days === 24).length,
    weekly: customers.filter(c => c.order_type !== "OFFLINE" && c.duration_days === 7).length,
    offline: customers.filter(c => c.order_type === "OFFLINE").length,
  };

  const handleToggleDatePause = async (customer: Customer, dateStr: string) => {
    let updatedPausedDates = Array.isArray(customer.paused_dates) ? [...customer.paused_dates] : [];
    
    if (updatedPausedDates.includes(dateStr)) {
      updatedPausedDates = updatedPausedDates.filter((d) => d !== dateStr);
    } else {
      updatedPausedDates.push(dateStr);
    }

    const { error } = await supabase
      .from("customers")
      .update({ paused_dates: updatedPausedDates })
      .eq("id", customer.id);

    if (error) return alert(error.message);

    setCustomers(
      customers.map((c) =>
        c.id === customer.id ? { ...c, paused_dates: updatedPausedDates } : c
      )
    );
  };

  const handleOpenEditMenu = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditMenuText(Array.isArray(cust.menu_plan) ? cust.menu_plan.join("\n") : "");
  };

  const handleSaveMenu = async () => {
    if (!editingCustomer) return;

    const rawLines = editMenuText.split("\n").map((l) => l.trim()).filter(Boolean);
    const processedMenu: string[] = [];
    const iterations = editingCustomer.order_type === "OFFLINE" ? 1 : editingCustomer.duration_days;

    for (let i = 0; i < iterations; i++) {
      if (rawLines[i]) {
        processedMenu.push(rawLines[i].replace(/^day\s*\d+\s*:\s*/i, "").replace(/^menu\s*:\s*/i, ""));
      } else {
        processedMenu.push("Balanced Meal | Juice | Protein Dinner");
      }
    }

    const { error } = await supabase
      .from("customers")
      .update({ menu_plan: processedMenu })
      .eq("id", editingCustomer.id);

    if (error) {
      alert(error.message);
      return;
    }

    setCustomers(
      customers.map((c) => (c.id === editingCustomer.id ? { ...c, menu_plan: processedMenu } : c))
    );
    setEditingCustomer(null);
  };

  const renderCalendarDays = (customer: Customer) => {
    const start = new Date(customer.start_date || "2026-06-01");
    const validPausedCount = Array.isArray(customer.paused_dates) ? customer.paused_dates.length : 0;
    const totalDaysToDisplay = customer.duration_days + Math.max(validPausedCount + 15, 30);
    
    const daysArray = [];
    for (let i = 0; i < totalDaysToDisplay; i++) {
      const nextDate = new Date(start);
      nextDate.setDate(start.getDate() + i);
      const yyyy = nextDate.getFullYear();
      const mm = String(nextDate.getMonth() + 1).padStart(2, "0");
      const dd = String(nextDate.getDate()).padStart(2, "0");
      const dateString = `${yyyy}-${mm}-${dd}`;
      daysArray.push({
        dateStr: dateString,
        dayLabel: nextDate.getDate(),
        monthLabel: nextDate.toLocaleString("en-US", { month: "short" }),
      });
    }
    return daysArray;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderType === "ONLINE" && (!customerId || !name || !whatsapp || !address)) {
      alert("Missing required fields");
      return;
    }

    const rawLines = menuPlanText.split("\n").map((l) => l.trim()).filter(Boolean);
    const processedMenu: string[] = [];
    const iterations = orderType === "OFFLINE" ? 1 : durationDays;

    for (let i = 0; i < iterations; i++) {
      if (rawLines[i]) {
        processedMenu.push(rawLines[i].replace(/^day\s*\d+\s*:\s*/i, "").replace(/^menu\s*:\s*/i, ""));
      } else {
        processedMenu.push("Balanced Meal | Juice | Protein Dinner");
      }
    }

    const cleanedWhatsapp = whatsapp.replace(/[^0-9]/g, "");

    const newCustomer: Customer = {
      id: customerId.toLowerCase().trim(),
      name: name.trim(),
      whatsapp: orderType === "ONLINE" ? (cleanedWhatsapp.startsWith("0") ? "62" + cleanedWhatsapp.slice(1) : cleanedWhatsapp) : "",
      address: orderType === "ONLINE" ? address.trim() : "Offline Order Drop",
      address_backup: orderType === "ONLINE" ? addressBackup.trim() : "",
      instagram: orderType === "ONLINE" ? instagram.trim() : "",
      is_paused: false,
      start_date: orderType === "ONLINE" ? startDate : new Date().toISOString().split('T')[0],
      duration_days: orderType === "ONLINE" ? durationDays : 0,
      paused_dates: [],
      menu_plan: processedMenu,
      order_type: orderType,
      note: orderType === "OFFLINE" ? note.trim() : "",
    };

    const { error } = await supabase.from("customers").insert([newCustomer]);
    if (error) return alert(error.message);

    setCustomers([newCustomer, ...customers]);
    setCustomerId(""); setName(""); setWhatsapp(""); setAddress(""); setAddressBackup(""); setInstagram(""); setNote("");
  };

  const togglePause = async (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c || c.order_type === "OFFLINE") return;
    const updated = !c.is_paused;
    const { error } = await supabase.from("customers").update({ is_paused: updated }).eq("id", id);
    if (error) return alert(error.message);
    setCustomers(customers.map((x) => (x.id === id ? { ...x, is_paused: updated } : x)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) setCustomers(customers.filter((x) => x.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] p-4 md:p-8 text-slate-900 antialiased font-sans">
      <div className="max-w-md lg:max-w-7xl mx-auto space-y-6">

        {/* Top Header Branding Banner */}
        <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-sm border border-white">
          <div className="flex items-center gap-3">
            <img 
              src="/logo.jpeg" 
              alt="Leafy Group Logo" 
              className="w-12 h-12 rounded-2xl object-cover"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">Leafy Group</h1>
              <p className="text-xs font-semibold text-slate-400">Track & Live Management</p>
            </div>
          </div>
        </div>

        {/* Dashboard Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Users</span>
            <span className="text-2xl font-black text-slate-800 mt-2">{stats.total}</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Running</span>
            <span className="text-2xl font-black text-emerald-700 mt-2">{stats.running}</span>
          </div>
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">On Hold</span>
            <span className="text-2xl font-black text-amber-700 mt-2">{stats.hold}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Monthly (30D)</span>
            <span className="text-2xl font-black text-slate-700 mt-2">{stats.monthly}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">24 Days Plan</span>
            <span className="text-2xl font-black text-slate-700 mt-2">{stats.twentyFourDays}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Weekly (7D)</span>
            <span className="text-2xl font-black text-slate-700 mt-2">{stats.weekly}</span>
          </div>
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">Offline</span>
            <span className="text-2xl font-black text-purple-700 mt-2">{stats.offline}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Active Cards Processing Stream */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center px-1">
              <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">Active Challenges & Lists</h2>
              <div className="bg-white border p-1 rounded-xl flex gap-1 text-[10px] font-black overflow-x-auto">
                {["ALL", "MONTHLY", "24DAYS", "WEEKLY", "OFFLINE"].map((t) => (
                  <button key={t} onClick={() => setPackageFilter(t as any)} className={`px-2.5 py-1 rounded-lg uppercase whitespace-nowrap ${packageFilter === t ? "bg-slate-900 text-white" : "text-slate-400"}`}>{t}</button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white p-12 rounded-3xl border text-center text-xs font-bold text-slate-400">Syncing...</div>
            ) : (
              filteredCustomers.map((cust) => {
                const isOffline = cust.order_type === "OFFLINE";
                const safePausedDates = Array.isArray(cust.paused_dates) ? cust.paused_dates : [];
                const status = !isOffline ? calculateProgramStatus(cust.start_date, cust.duration_days, safePausedDates) : { currentDay: 1, progressPercentage: 100 };

                return (
                  <div key={cust.id} className={`bg-white rounded-[28px] p-5 md:p-6 shadow-sm border-2 ${isOffline ? "border-purple-100" : cust.is_paused ? "border-amber-300 bg-amber-50/5" : "border-transparent"}`}>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-lg text-slate-900">{cust.name}</h3>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">#{cust.id}</span>
                          {!isOffline && <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md uppercase">{cust.duration_days} Days Plan</span>}
                        </div>
                        {!isOffline && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Total Specific Paused Days: <span className="text-red-500 font-bold">{safePausedDates.length} days</span>
                          </p>
                        )}
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${cust.is_paused ? "bg-amber-100 text-amber-800" : "bg-emerald-500 text-white"}`}>
                        {cust.is_paused ? "HOLD" : "RUNNING"}
                      </span>
                    </div>

                    {!isOffline && (
                      <div className="bg-slate-50 p-4 rounded-2xl border mb-4 space-y-2">
                        <div className="flex justify-between items-end text-xs">
                          <span className="text-[9px] font-black text-slate-400 uppercase">CHALLENGE CYCLE</span>
                          <span className="font-black font-mono">Day <span className="text-emerald-600">{status.currentDay || 1}</span>/{cust.duration_days}</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${status.progressPercentage || 0}%` }} />
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 font-mono">EST. START: {cust.start_date}</div>
                      </div>
                    )}

                    <div className="text-xs text-slate-600 space-y-1 mb-4 border-b pb-4 border-slate-100">
                      <div><span className="text-[9px] font-black text-slate-400 block uppercase">Hub Utama Delivery</span> {cust.address}</div>
                      {cust.address_backup && <div><span className="text-[9px] font-black text-slate-400 block uppercase">Cadangan Hub</span> {cust.address_backup}</div>}
                    </div>

                    {/* Lower Operational Action Control Row Area (Added flex-wrap so buttons won't get cut off) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 relative">
                      
                      {cust.whatsapp ? (
                        <a 
                          href={`https://wa.me/${cust.whatsapp}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all group"
                          title="Chat via WhatsApp"
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:animate-ping" />
                          <span className="text-xs font-mono font-bold text-emerald-700">+{cust.whatsapp}</span>
                        </a>
                      ) : (
                        <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                          <span className="text-xs font-mono font-semibold text-slate-400">No WhatsApp</span>
                        </div>
                      )}

                      {/* Action Buttons Container with flex-wrap */}
                      <div className="flex flex-wrap items-center gap-1.5 relative">
                        {/* Action 1: Manual Hold */}
                        <button onClick={() => togglePause(cust.id)} className="text-xs font-bold px-3 py-2 rounded-xl border bg-white text-slate-700 hover:bg-slate-50 transition-all">
                          {cust.is_paused ? "Resume" : "Manual Hold"}
                        </button>

                        {/* Action 2: Calendar Pause Dropdown Panel */}
                        {!isOffline && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveCalendarCustomerId(activeCalendarCustomerId === cust.id ? null : cust.id)}
                              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                                safePausedDates.length > 0 
                                  ? "bg-red-50 border-red-200 text-red-600 font-black" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              Pause Calendar ({safePausedDates.length})
                            </button>

                            {activeCalendarCustomerId === cust.id && (
                              <div className="absolute right-0 bottom-12 z-50 bg-white border border-slate-200 shadow-xl rounded-2xl p-4 w-72 sm:w-80">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b">
                                  <div>
                                    <h4 className="text-xs font-black text-slate-900">Program Range Schedule</h4>
                                    <p className="text-[10px] text-slate-400">Select programmatic pause days</p>
                                  </div>
                                  <button type="button" onClick={() => setActiveCalendarCustomerId(null)} className="text-xs font-bold font-mono text-slate-400 hover:text-slate-600">✕</button>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1">
                                  {renderCalendarDays(cust).map((day) => {
                                    const isSelected = safePausedDates.includes(day.dateStr);
                                    return (
                                      <button
                                        key={day.dateStr}
                                        type="button"
                                        onClick={() => handleToggleDatePause(cust, day.dateStr)}
                                        className={`p-1.5 rounded-lg flex flex-col items-center justify-center border text-center transition-all ${
                                          isSelected
                                            ? "bg-red-500 border-red-500 text-white font-bold scale-95"
                                            : "bg-slate-50 border-slate-100 text-slate-800 hover:bg-slate-200/60"
                                        }`}
                                      >
                                        <span className="text-[11px] font-black leading-none">{day.dayLabel}</span>
                                        <span className={`text-[8px] tracking-tight ${isSelected ? "text-red-100" : "text-slate-400"}`}>{day.monthLabel}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action 3: Bukti Pay */}
                        {cust.payment_proof_url ? (
                          <a 
                            href={cust.payment_proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs font-bold px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white transition-all text-center shadow-sm"
                          >
                            Bukti Pay
                          </a>
                        ) : (
                          <button 
                            disabled 
                            className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-200 text-slate-400 cursor-not-allowed"
                            title="Belum mengunggah bukti"
                          >
                            No Pay
                          </button>
                        )}

                        <a href={`/customer/${cust.id}`} target="_blank" className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500 text-white">Portal</a>
                        
                        {/* Tombol Edit Menu (Dibuat mencolok dengan warna Indigo agar langsung terlihat) */}
                        <button 
                          type="button" 
                          onClick={() => handleOpenEditMenu(cust)} 
                          className="text-xs font-bold px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all shadow-sm"
                        >
                           Edit Menu
                        </button>

                        <button type="button" onClick={() => handleDelete(cust.id)} className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-all">Delete</button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Sticky Manifest Addition Engine */}
          <div className="space-y-4 lg:sticky lg:top-6">
            <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase px-1">Add New Plan</h2>
            <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-5 space-y-4 border shadow-sm">
              <div className="bg-slate-100 p-1 rounded-xl flex text-xs font-bold">
                <button type="button" onClick={() => setOrderType("ONLINE")} className={`w-1/2 py-2 rounded-lg ${orderType === "ONLINE" ? "bg-white shadow-sm text-slate-950" : "text-slate-400"}`}>Online</button>
                <button type="button" onClick={() => setOrderType("OFFLINE")} className={`w-1/2 py-2 rounded-lg ${orderType === "OFFLINE" ? "bg-purple-600 text-white" : "text-slate-400"}`}>Offline</button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Customer ID</label>
                <input placeholder="e.g. dea01" value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Name</label>
                <input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
              </div>

              {orderType === "ONLINE" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">WhatsApp</label>
                    <input placeholder="628xxxxxx atau 08xxxxxx" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Duration (Days)</label>
                    <div className="grid grid-cols-3 gap-1 mb-1.5">
                      <button type="button" onClick={() => setDurationDays(30)} className={`py-1.5 rounded-lg border text-xs font-bold ${durationDays === 30 ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}>30 Days</button>
                      <button type="button" onClick={() => setDurationDays(24)} className={`py-1.5 rounded-lg border text-xs font-bold ${durationDays === 24 ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}>24 Days</button>
                      <button type="button" onClick={() => setDurationDays(7)} className={`py-1.5 rounded-lg border text-xs font-bold ${durationDays === 7 ? "bg-slate-900 border-slate-900 text-white" : "bg-slate-50 text-slate-600"}`}>7 Days (Wk)</button>
                    </div>
                    <input type="number" value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Start Date</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Main Address Delivery</label>
                    <input placeholder="Jl. Anggrek No. 12" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Backup Address</label>
                    <input placeholder="Office / Alternative address" value={addressBackup} onChange={(e) => setAddressBackup(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Instagram (Optional)</label>
                    <input placeholder="@username" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl" />
                  </div>
                </>
              )}

              {orderType === "OFFLINE" && (
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Note / Offline Description</label>
                  <textarea placeholder="Write catering note here..." value={note} onChange={(e) => setNote(e.target.value)} className="w-full p-2.5 text-sm bg-slate-50 border rounded-xl min-h-[100px]" required />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">Generated Menu Plan Preview ({orderType === "OFFLINE" ? 1 : durationDays} lines)</label>
                <textarea value={menuPlanText} onChange={(e) => setMenuPlanText(e.target.value)} className="w-full p-2.5 text-xs bg-slate-50 border rounded-xl font-mono min-h-[150px] leading-relaxed" />
              </div>

              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-md hover:bg-slate-800 transition-all">
                SAVE
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* Modal Popup untuk Edit Menu */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Edit Menu Plan</h3>
                <p className="text-xs text-slate-400 font-mono">Customer: {editingCustomer.name} (#{editingCustomer.id})</p>
              </div>
              <button type="button" onClick={() => setEditingCustomer(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 tracking-wider uppercase">
                Menu Lines ({editingCustomer.order_type === "OFFLINE" ? 1 : editingCustomer.duration_days} Days)
              </label>
              <textarea 
                value={editMenuText} 
                onChange={(e) => setEditMenuText(e.target.value)} 
                className="w-full p-3 text-xs bg-slate-50 border rounded-2xl font-mono min-h-[220px] leading-relaxed" 
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setEditingCustomer(null)} 
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveMenu} 
                className="px-4 py-2 rounded-xl text-xs font-black uppercase bg-slate-900 text-white hover:bg-slate-800 shadow-md"
              >
                Save Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}