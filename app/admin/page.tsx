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
  pause_duration_days: number; 
  menu_plan: string[];
  order_type?: "ONLINE" | "OFFLINE"; // Penanda jenis orderan
  note?: string; // Catatan tambahan untuk offline order
}

export default function AdminDashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Filter Tipe Paket & Tampilan Global Stats Modal/Section
  const [packageFilter, setPackageFilter] = useState<"ALL" | "MONTHLY" | "24DAYS" | "WEEKLY" | "OFFLINE">("ALL");
  const [showGlobalStats, setShowGlobalStats] = useState(false); 

  // Form State
  const [orderType, setOrderType] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState("");
  const [addressBackup, setAddressBackup] = useState("");
  const [instagram, setInstagram] = useState("");
  const [pauseDurationDays, setPauseDurationDays] = useState(0); 
  const [note, setNote] = useState("");

  const [startDate, setStartDate] = useState("2026-06-01");
  const [durationDays, setDurationDays] = useState(30);

  // Template Berubah Dinamis Tergantung Durasi yang Dipilih
  const generateMenuTemplate = (days: number) => {
    const finalDays = orderType === "OFFLINE" ? 1 : days;
    return Array.from({ length: finalDays }, (_, i) =>
      orderType === "OFFLINE" 
        ? `Menu: Custom Offline Healthy Pack`
        : `Day ${i + 1}: Lemon Herb Salmon | Avocado Smoothie | Grilled Chicken Breast`
    ).join("\n");
  };

  const [menuPlanText, setMenuPlanText] = useState(generateMenuTemplate(30));

  // Sinkronisasi Perubahan Durasi/Jenis Order ke Template Menu Form
  useEffect(() => {
    setMenuPlanText(generateMenuTemplate(durationDays));
  }, [durationDays, orderType]);

  // Fetch Data dari Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setCustomers(data || []);
        setFilteredCustomers(data || []);
      } else {
        alert(error.message);
      }
      setIsLoading(false);
    };

    fetchCustomers();
  }, []);

  // Efek Menangani Penyaringan Filter List
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

  // Perhitungan Statistik Keseluruhan
  const totalActive = customers.filter((c) => !c.is_paused && c.order_type !== "OFFLINE").length;
  const totalPaused = customers.filter((c) => c.is_paused && c.order_type !== "OFFLINE").length;
  const totalWeekly = customers.filter((c) => c.duration_days === 7 && c.order_type !== "OFFLINE").length;
  const total24Days = customers.filter((c) => c.duration_days === 24 && c.order_type !== "OFFLINE").length;
  const totalMonthly = customers.filter((c) => c.duration_days === 30 && c.order_type !== "OFFLINE").length;
  const totalOffline = customers.filter((c) => c.order_type === "OFFLINE").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi kondisional berdasarkan tipe order
    if (orderType === "ONLINE") {
      if (!customerId || !name || !whatsapp || !address) {
        alert("Required fields missing for Online Order");
        return;
      }
    } else {
      if (!customerId || !name) {
        alert("ID Pelanggan dan Nama Lengkap wajib diisi untuk Offline Order");
        return;
      }
    }

    const rawLines = menuPlanText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const processedMenu: string[] = [];
    const iterations = orderType === "OFFLINE" ? 1 : durationDays;

    for (let i = 0; i < iterations; i++) {
      if (rawLines[i]) {
        processedMenu.push(
          rawLines[i].replace(/^day\s*\d+\s*:\s*/i, "").replace(/^menu\s*:\s*/i, "")
        );
      } else {
        processedMenu.push("Balanced Meal | Juice | Protein Dinner");
      }
    }

    const newCustomer: Customer = {
      id: customerId.toLowerCase().trim(),
      name: name.trim(),
      whatsapp: orderType === "ONLINE" ? whatsapp.replace(/[^0-9]/g, "") : "",
      address: orderType === "ONLINE" ? address.trim() : "Offline Order Drop",
      address_backup: orderType === "ONLINE" ? addressBackup.trim() : "",
      instagram: orderType === "ONLINE" ? instagram.trim() : "",
      is_paused: false,
      start_date: orderType === "ONLINE" ? startDate : new Date().toISOString().split('T')[0],
      duration_days: orderType === "ONLINE" ? durationDays : 0, // 0 menandakan offline/no duration tracking
      pause_duration_days: orderType === "ONLINE" ? pauseDurationDays : 0,
      menu_plan: processedMenu,
      order_type: orderType,
      note: orderType === "OFFLINE" ? note.trim() : "",
    };

    const { error } = await supabase
      .from("customers")
      .insert([newCustomer]);

    if (error) return alert(error.message);

    setCustomers([newCustomer, ...customers]);

    // Reset Form
    setCustomerId("");
    setName("");
    setWhatsapp("");
    setAddress("");
    setAddressBackup("");
    setInstagram("");
    setNote("");
    setPauseDurationDays(0); 
    setMenuPlanText(generateMenuTemplate(durationDays));

    alert("Order saved successfully");
  };

  const togglePause = async (id: string) => {
    const c = customers.find((x) => x.id === id);
    if (!c || c.order_type === "OFFLINE") return;

    const updated = !c.is_paused;

    const { error } = await supabase
      .from("customers")
      .update({ is_paused: updated })
      .eq("id", id);

    if (error) return alert(error.message);

    setCustomers(
      customers.map((x) =>
        x.id === id ? { ...x, is_paused: updated } : x
      )
    );
  };

  const handleUpdatePauseDays = async (id: string, days: number) => {
    const { error } = await supabase
      .from("customers")
      .update({ pause_duration_days: days })
      .eq("id", id);

    if (error) return alert(error.message);

    setCustomers(
      customers.map((x) =>
        x.id === id ? { ...x, pause_duration_days: days } : x
      )
    );
  };

  const handleDelete = async (id: string, isDone = false) => {
    const message = isDone ? "Tandai orderan ini selesai dan hapus dari list?" : "Delete this customer?";
    if (!confirm(message)) return;

    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (error) return alert(error.message);

    setCustomers(customers.filter((x) => x.id !== id));
    if (isDone) alert("Order marked as DONE & cleared.");
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] p-4 md:p-8 text-slate-900 antialiased font-sans selection:bg-emerald-200">
      <div className="max-w-md lg:max-w-7xl mx-auto space-y-6">

        {/* TOP BRAND BAR */}
        <div className="flex items-center justify-between bg-white rounded-3xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-white">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              className="w-12 h-12 rounded-2xl object-cover ring-4 ring-emerald-50"
              alt="EatLeafy"
            />
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                EatLeafy <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.5 rounded-md tracking-wider uppercase">HQ</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400 tracking-wide">
                Track & Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGlobalStats(!showGlobalStats)}
              className={`p-2.5 rounded-xl text-base transition-all border ${
                showGlobalStats
                  ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent"
              }`}
              title="Lihat Detail Seluruh Orderan & Progress"
            >
              🏠
            </button>
            <div className="bg-slate-900 text-white text-[11px] font-black font-mono px-3 py-2 rounded-xl tracking-wider shadow-sm">
              LIVE: {customers.length}
            </div>
          </div>
        </div>

        {/* LIVE GLOBAL STATS DRAWER PANEL */}
        {showGlobalStats && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black tracking-wider text-emerald-400 uppercase">📊 Global Progress & Active Orders Detail</h3>
                <p className="text-xs text-slate-400">Daftar manifestasi detail seluruh menu orderan konsumen saat ini</p>
              </div>
              <button 
                onClick={() => setShowGlobalStats(false)}
                className="text-xs font-bold font-mono bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg text-slate-300"
              >
                ✕ Close
              </button>
            </div>

            {/* Panel Statistik */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl">
                <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">Total Konsumen</span>
                <p className="text-xl font-black font-mono mt-1 text-white">{customers.length}</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl">
                <span className="text-[9px] font-bold text-emerald-400 tracking-wider uppercase block">Aktif Berjalan</span>
                <p className="text-xl font-black font-mono mt-1 text-emerald-400">{totalActive}</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl">
                <span className="text-[9px] font-bold text-amber-400 tracking-wider uppercase block">Sedang Dijeda</span>
                <p className="text-xl font-black font-mono mt-1 text-amber-400">{totalPaused}</p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl col-span-2 md:col-span-2">
                <span className="text-[9px] font-bold text-blue-400 tracking-wider uppercase block">Tier Paket Online</span>
                <p className="text-[13px] font-black font-mono mt-1 text-slate-200">
                  <span className="text-blue-400">{totalWeekly}W</span> / <span className="text-orange-400">{total24Days}D24</span> / <span className="text-emerald-400">{totalMonthly}M</span>
                </p>
              </div>
              <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl col-span-2 md:col-span-1">
                <span className="text-[9px] font-bold text-purple-400 tracking-wider uppercase block">Offline Orders</span>
                <p className="text-xl font-black font-mono mt-1 text-purple-400">{totalOffline}</p>
              </div>
            </div>

            {/* DETAIL DETAIL ORDERAN LIVE */}
            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-700">
                      <th className="p-3">ID / Tipe</th>
                      <th className="p-3">Nama Pelanggan</th>
                      <th className="p-3">Menu Plan Saat Ini / Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 font-medium text-slate-200">
                    {customers.map((c) => {
                      const isOffline = c.order_type === "OFFLINE";
                      let displayMenu = "";
                      
                      if (isOffline) {
                        displayMenu = c.menu_plan?.[0] || "No Menu Input";
                      } else {
                        const status = calculateProgramStatus(c.start_date, c.duration_days, c.pause_duration_days);
                        displayMenu = c.menu_plan?.[status.currentDay - 1] || "Menu Selesai/Belum Terjadwal";
                      }

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono">
                            <span className="block font-bold">#{c.id}</span>
                            <span className={`text-[9px] font-bold px-1 py-0.2 rounded ${isOffline ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'}`}>
                              {isOffline ? 'OFFLINE' : 'ONLINE'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">
                            {c.name}
                            {!isOffline && <span className="block text-[10px] text-slate-400 font-normal">{c.whatsapp}</span>}
                          </td>
                          <td className="p-3">
                            <span className="text-emerald-400 font-semibold">{isOffline ? "[Catatan Menu Offline]:" : `[Day ${calculateProgramStatus(c.start_date, c.duration_days, c.pause_duration_days).currentDay} Menu]:`}</span> {displayMenu}
                            {c.note && <span className="block text-[11px] text-amber-300 italic mt-0.5">Note: {c.note}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* CUSTOMERS TRACKING LIST */}
          <div className="lg:col-span-2 space-y-4 order-1">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">
                  Active Challenges & Lists
                </h2>
              </div>
              
              {/* FILTER LIST */}
              <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-sm overflow-x-auto">
                {(["ALL", "MONTHLY", "24DAYS", "WEEKLY", "OFFLINE"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setPackageFilter(type)}
                    className={`px-3 py-1 text-[10px] font-black tracking-tight rounded-lg uppercase whitespace-nowrap transition-all ${
                      packageFilter === type
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {type === "ALL" ? "All" : type === "MONTHLY" ? "Monthly" : type === "24DAYS" ? "24 Days" : type === "WEEKLY" ? "Weekly" : "Offline"}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <div className="bg-white p-16 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-bold tracking-wider uppercase">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Syncing Database...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-200 text-center text-sm font-medium text-slate-400">
                No active tracking packages found for this filter tier.
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const isOffline = cust.order_type === "OFFLINE";
                const status = !isOffline ? calculateProgramStatus(
                  cust.start_date,
                  cust.duration_days,
                  cust.pause_duration_days
                ) : { currentDay: 1, progressPercentage: 100 };

                return (
                  <div 
                    key={cust.id} 
                    className={`bg-white transition-all duration-300 rounded-[28px] p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.012)] border-2 ${
                      isOffline ? "border-purple-200 bg-purple-50/5" : cust.is_paused ? "border-amber-300/60 bg-amber-50/5" : "border-transparent hover:border-emerald-500/20"
                    }`}
                  >
                    {/* Header Card */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight">{cust.name}</h3>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">
                            #{cust.id}
                          </span>
                          
                          <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded ${
                            isOffline ? "bg-purple-100 text-purple-700" : cust.duration_days === 7 ? "bg-blue-100 text-blue-700" : cust.duration_days === 24 ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {isOffline ? "OFFLINE ORDER" : cust.duration_days === 7 ? "7 DAYS PLAN" : cust.duration_days === 24 ? "24 DAYS PLAN" : "30 DAYS PLAN"}
                          </span>
                        </div>
                        {!isOffline && cust.instagram && (
                          <p className="text-xs font-bold text-teal-600 bg-teal-50/50 inline-block px-2 py-0.5 rounded-md">
                            @{cust.instagram.replace('@', '')}
                          </p>
                        )}
                        {isOffline && cust.note && (
                          <p className="text-xs font-medium text-amber-700 bg-amber-50 inline-block px-2 py-1 rounded-md border border-amber-200">
                            📝 <b>Note:</b> {cust.note}
                          </p>
                        )}
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        {isOffline ? (
                          <span className="text-[9px] font-black bg-purple-600 text-white px-2.5 py-1 rounded-full tracking-wider uppercase shadow-sm">
                            OFFLINE NO-PAUSE
                          </span>
                        ) : cust.is_paused ? (
                          <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full tracking-wider uppercase">
                            HOLD
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-emerald-500 text-white px-2.5 py-1 rounded-full tracking-wider uppercase shadow-sm shadow-emerald-200">
                            RUNNING
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (Hanya Tampil Jika ONLINE) */}
                    {!isOffline ? (
                      <>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 space-y-2">
                          <div className="flex justify-between items-end text-xs">
                            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">CHALLENGE CYCLE</span>
                            <span className="font-black font-mono text-sm text-slate-800">
                              Day <span className="text-emerald-600">{status.currentDay}</span>/{cust.duration_days}
                            </span>
                          </div>
                          
                          <div className="h-3 bg-slate-200/70 rounded-full overflow-hidden p-[2px]">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${
                                cust.is_paused 
                                  ? "bg-gradient-to-r from-amber-400 to-orange-400" 
                                  : "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500"
                              }`}
                              style={{ width: `${status.progressPercentage}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-[9px] font-bold text-slate-400 font-mono">
                            <span>EST. START: {cust.start_date}</span>
                            <span className="text-slate-600">{status.progressPercentage}% DELIVERED</span>
                          </div>
                        </div>

                        {/* Inline Adjustment untuk Pause Days */}
                        <div className="mb-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                          <span className="font-bold text-slate-500">Adjust Auto Pause Days:</span>
                          <div className="flex items-center gap-1">
                            <input 
                              type="number" 
                              min="0" 
                              value={cust.pause_duration_days || 0}
                              onChange={(e) => handleUpdatePauseDays(cust.id, Number(e.target.value))}
                              className="w-14 text-center font-bold p-1 border rounded bg-white"
                            />
                            <span className="font-semibold text-slate-400">days</span>
                          </div>
                        </div>

                        {/* Package Route / Address */}
                        <div className="relative pl-4 space-y-3 border-l-2 border-dashed border-slate-200 my-4 ml-2">
                          <div className="relative">
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"></span>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{cust.address}</p>
                            <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mt-0.5">HUB UTAMA DELIVERY</p>
                          </div>
                          {cust.address_backup && (
                            <div className="relative">
                              <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white"></span>
                              <p className="text-xs font-semibold text-slate-500 leading-tight">{cust.address_backup}</p>
                              <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mt-0.5">CADANGAN HUB</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 mb-4 space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-purple-400 uppercase">OFFLINE MENU MANIFEST</span>
                        <p className="text-xs font-bold text-slate-800">{cust.menu_plan?.[0] || "Custom Menu Pack"}</p>
                      </div>
                    )}

                    {/* Action Panel */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      {!isOffline ? (
                        <a 
                          href={`https://wa.me/${cust.whatsapp}`} 
                          target="_blank" 
                          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors px-3 py-2 rounded-xl flex items-center gap-1.5"
                        >
                          📱 <span className="font-mono">+{cust.whatsapp}</span>
                        </a>
                      ) : (
                        <div className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-xl">
                          📍 Walk-in / Direct Order
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!isOffline ? (
                          <>
                            <button 
                              onClick={() => togglePause(cust.id)}
                              className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                                cust.is_paused 
                                  ? "bg-amber-500 text-white border-transparent hover:bg-amber-600" 
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {cust.is_paused ? "▶ Resume" : "⏸ Manual Hold"}
                            </button>
                            <a 
                              href={`/customer/${cust.id}`} 
                              target="_blank"
                              className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all"
                            >
                              🔗 Portal
                            </a>
                            <button 
                              onClick={() => handleDelete(cust.id)}
                              className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                            >
                              🗑️
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleDelete(cust.id, true)}
                              className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                            >
                              ✅ Done
                            </button>
                            <button 
                              onClick={() => handleDelete(cust.id)}
                              className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                              title="Hapus Pesanan"
                            >
                              🗑️ Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* ENTRY SUBSCRIPTION FORM PANEL */}
          <div className="space-y-4 order-2 lg:sticky lg:top-6">
            <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase px-1">
              Add New Plan / Order
            </h2>
            
            <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.012)] border border-white">
              
              {/* TOGGLE TIPE INPUT ORDER */}
              <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-2">
                <button
                  type="button"
                  onClick={() => setOrderType("ONLINE")}
                  className={`w-1/2 py-2 text-xs font-extrabold rounded-lg tracking-wide transition-all ${
                    orderType === "ONLINE" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                  }`}
                >
                  🌐 Online Plan
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("OFFLINE")}
                  className={`w-1/2 py-2 text-xs font-extrabold rounded-lg tracking-wide transition-all ${
                    orderType === "OFFLINE" ? "bg-purple-600 text-white shadow-sm" : "text-slate-400"
                  }`}
                >
                  🏪 Offline Order
                </button>
              </div>

              {/* INPUT FIELDS UTAMA */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">ID Pelanggan (Unique Key)</label>
                <input placeholder="e.g. raihan24hari" value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Nama Lengkap</label>
                <input placeholder="Nama User" value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* TAMPIL HANYA JIKA ONLINE ORDER */}
              {orderType === "ONLINE" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Nomor WhatsApp</label>
                    <input placeholder="628xxxxxxxx" value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  {/* SELEKTOR DURASI PAKET */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Durasi Paket (Days Tier)</label>
                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                      {[7, 24, 30].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDurationDays(d)}
                          className={`py-2 text-xs font-black rounded-lg transition-all ${
                            durationDays === d ? "bg-slate-900 text-white shadow-sm" : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {d === 7 ? "7 Days (W)" : d === 24 ? "24 Days" : "30 Days (M)"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Tanggal Mulai</label>
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Auto Pause (Days)</label>
                      <input type="number" min="0" value={pauseDurationDays} onChange={(e) => setPauseDurationDays(Number(e.target.value))} className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Alamat Pengiriman Utama</label>
                    <input placeholder="Detail Lokasi Droppoint" value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Alamat Cadangan</label>
                    <input placeholder="Optional Backup Address" value={addressBackup}
                      onChange={(e) => setAddressBackup(e.target.value)}
                      className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Username Instagram</label>
                    <input placeholder="@username" value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </>
              )}

              {/* TAMPIL HANYA JIKA OFFLINE ORDER */}
              {orderType === "OFFLINE" && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Catatan Pesanan Offline</label>
                  <textarea 
                    placeholder="Contoh: Ambil langsung ke toko jam 12 siang, bawa tas belanja sendiri." 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full p-3 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  />
                </div>
              )}

              {/* MANIFEST GENERATOR TEXTAREA */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Manifest Setup Menu Plan</label>
                  <span className="text-[9px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {orderType === "OFFLINE" ? "1 Line" : `${durationDays} Lines`}
                  </span>
                </div>
                <textarea
                  value={menuPlanText}
                  onChange={(e) => setMenuPlanText(e.target.value)}
                  rows={8}
                  className="w-full p-3 text-xs font-mono bg-slate-900 text-emerald-400 rounded-2xl border border-transparent focus:outline-none focus:ring-4 focus:ring-emerald-500/10 leading-relaxed shadow-inner"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide text-white shadow-md transition-all active:scale-[0.99] ${
                  orderType === "OFFLINE" ? "bg-purple-600 hover:bg-purple-700 shadow-purple-100" : "bg-slate-950 hover:bg-slate-900 shadow-slate-200"
                }`}
              >
                {orderType === "OFFLINE" ? "🛒 Simpan Order Offline" : "🚀 Save & Deploy Active Challenge"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}