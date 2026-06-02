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
    menu_plan: string[];
  }

  export default function AdminDashboard() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [customerId, setCustomerId] = useState("");
    const [name, setName] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [address, setAddress] = useState("");
    const [addressBackup, setAddressBackup] = useState("");
    const [instagram, setInstagram] = useState("");

    // ✅ CUSTOM DATE TETAP ADA (JANGAN DIHAPUS)
    const [startDate, setStartDate] = useState("2026-06-01");
    const [durationDays, setDurationDays] = useState(30);

    const defaultMenuTemplate = Array.from({ length: 30 }, (_, i) =>
      `Day ${i + 1}: Lemon Herb Salmon | Avocado Smoothie | Grilled Chicken Breast`
    ).join("\n");

    const [menuPlanText, setMenuPlanText] = useState(defaultMenuTemplate);

    useEffect(() => {
      const fetchCustomers = async () => {
        setIsLoading(true);

        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error) setCustomers(data || []);
        else alert(error.message);

        setIsLoading(false);
      };

      fetchCustomers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!customerId || !name || !whatsapp || !address) {
        alert("Required fields missing");
        return;
      }

      const rawLines = menuPlanText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const processedMenu: string[] = [];

      for (let i = 0; i < durationDays; i++) {
        if (rawLines[i]) {
          processedMenu.push(
            rawLines[i].replace(/^day\s*\d+\s*:\s*/i, "")
          );
        } else {
          processedMenu.push("Balanced Meal | Juice | Protein Dinner");
        }
      }

      const newCustomer: Customer = {
        id: customerId.toLowerCase().trim(),
        name: name.trim(),
        whatsapp: whatsapp.replace(/[^0-9]/g, ""),
        address: address.trim(),
        address_backup: addressBackup.trim(),
        instagram: instagram.trim(),
        is_paused: false,
        start_date: startDate,
        duration_days: durationDays,
        menu_plan: processedMenu,
      };

      const { error } = await supabase
        .from("customers")
        .insert([newCustomer]);

      if (error) return alert(error.message);

      setCustomers([newCustomer, ...customers]);

      setCustomerId("");
      setName("");
      setWhatsapp("");
      setAddress("");
      setAddressBackup("");
      setInstagram("");
      setMenuPlanText(defaultMenuTemplate);

      alert("Customer saved successfully");
    };

    const togglePause = async (id: string) => {
      const c = customers.find((x) => x.id === id);
      if (!c) return;

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

    const handleDelete = async (id: string) => {
      if (!confirm("Delete this customer?")) return;

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", id);

      if (error) return alert(error.message);

      setCustomers(customers.filter((x) => x.id !== id));
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

            <div className="bg-slate-900 text-white text-[11px] font-black font-mono px-3 py-2 rounded-xl tracking-wider shadow-sm">
              LIVE: {customers.length}
            </div>
          </div>

          {/* LAYOUT GRID (Mobile-First: Form stays below list or easily scrollable) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* CUSTOMERS TRACKING LIST */}
            <div className="lg:col-span-2 space-y-4 order-1">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-black text-slate-400 tracking-widest uppercase">
                </h2>
                <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded-md">
                  Sorted by newest
                </span>
              </div>

              {isLoading ? (
                <div className="bg-white p-16 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 text-slate-400 text-xs font-bold tracking-wider uppercase">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Syncing Database...</span>
                </div>
              ) : customers.length === 0 ? (
                <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-200 text-center text-sm font-medium text-slate-400">
                  No active tracking packages at the moment.
                </div>
              ) : (
                customers.map((cust) => {
                  const status = calculateProgramStatus(
                    cust.start_date,
                    cust.duration_days
                  );

                  return (
                    <div 
                      key={cust.id} 
                      className={`bg-white transition-all duration-300 rounded-[28px] p-5 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.012)] border-2 ${
                        cust.is_paused ? "border-amber-300/60 bg-amber-50/5" : "border-transparent hover:border-emerald-500/20"
                      }`}
                    >
                      {/* Header Card (Subscription Style) */}
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-lg text-slate-900 tracking-tight leading-tight">{cust.name}</h3>
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase">
                              #{cust.id}
                            </span>
                          </div>
                          
                          {cust.instagram && (
                            <p className="text-xs font-bold text-teal-600 bg-teal-50/50 inline-block px-2 py-0.5 rounded-md">
                              @{cust.instagram.replace('@', '')}
                            </p>
                          )}
                        </div>

                        {/* Fitness Badge Style Status */}
                        <div className="text-right">
                          {cust.is_paused ? (
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

                      {/* Progress Bar (Fitness Challenge Style) */}
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
                          <span>WIB. START: {cust.start_date}</span>
                          <span className="text-slate-600">{status.progressPercentage}% DELIVERED</span>
                        </div>
                      </div>

                      {/* Package Route / Address (Package Tracking Style) */}
                      <div className="relative pl-4 space-y-3 border-l-2 border-dashed border-slate-200 my-4 ml-2">
                        {/* Node 1 */}
                        <div className="relative">
                          <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white"></span>
                          <p className="text-xs font-bold text-slate-800 leading-tight">{cust.address}</p>
                          <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mt-0.5">PRIORITY LOCATION</p>
                        </div>

                        {/* Node 2 */}
                        {cust.address_backup && (
                          <div className="relative">
                            <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white"></span>
                            <p className="text-xs font-semibold text-slate-500 leading-tight">{cust.address_backup}</p>
                            <p className="text-[9px] font-black tracking-wider text-slate-400 uppercase mt-0.5">SECONDARY LOCATION</p>
                          </div>
                        )}
                      </div>

                      {/* Quick Contact & Action Trigger Panel */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                        <a 
                          href={`https://wa.me/${cust.whatsapp}`} 
                          target="_blank" 
                          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 transition-colors px-3 py-2 rounded-xl flex items-center gap-1.5"
                        >
                          WA: <span className="font-mono">+{cust.whatsapp}</span>
                        </a>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => togglePause(cust.id)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all ${
                              cust.is_paused 
                                ? "bg-amber-500 text-white border-transparent hover:bg-amber-600" 
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {cust.is_paused ? "▶ Resume" : "⏸ Pause"}
                          </button>

                          <a 
                            href={`/customer/${cust.id}`} 
                            target="_blank"
                            className="text-xs font-bold px-3 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all"
                          >
                            🔗 GENERATE LINK
                          </a>

                          <button 
                            onClick={() => handleDelete(cust.id)}
                            className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                          >
                            🗑️
                          </button>
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
                Add New Plan
              </h2>
              
              <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-6 space-y-4 shadow-[0_8px_30px_rgb(0,0,0,0.012)] border border-white">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">CUSTOMER ID (Unique Key)</label>
                  <input placeholder="e.g. BOBBY30" value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">FULL NAME</label>
                  <input placeholder="FULL NAME" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">WHATSAPP</label>
                  <input placeholder="628xxxxxxxx" value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">PRIORITY LOCATION</label>
                  <input placeholder="MAIN LOCATION" value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">SECONDARY LOCATION</label>
                  <input placeholder="ALTERNATE/BACKUP LOCATION" value={addressBackup}
                    onChange={(e) => setAddressBackup(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">INSTAGRAM</label>
                  <input placeholder="WITHOUT @ (OPTIONAL)" value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="input-premium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">START DATE</label>
                    <input type="date" value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="input-premium font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">DURATION (Hari)</label>
                    <input type="number" value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="input-premium font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">DAILY MENU</label>
                  <textarea
                    value={menuPlanText}
                    onChange={(e) => setMenuPlanText(e.target.value)}
                    className="input-premium h-36 font-mono text-xs leading-relaxed focus:bg-slate-900 focus:text-emerald-400 transition-colors"
                  />
                </div>

                <button className="w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md hover:shadow-xl active:scale-[0.99] text-xs tracking-widest uppercase mt-2">
                  🚀 Aktifkan Paket Berlangganan
                </button>

              </form>
            </div>

          </div>
        </div>

        {/* TAILWIND UTILITY STYLE INJECTION */}
        <style jsx>{`
          .input-premium {
            width: 100%;
            padding: 12px 16px;
            border-radius: 16px;
            border: 1px solid #E2E8F0;
            background: #F8FAFC;
            font-size: 13px;
            font-weight: 600;
            color: #0F172A;
            outline: none;
            transition: all 0.2s ease-in-out;
          }
          .input-premium:focus {
            background: #FFFFFF;
            border-color: #10B981;
            box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.08);
          }
          .input-premium::placeholder {
            color: #94A3B8;
            font-weight: 500;
          }
        `}</style>
      </div>
    );
  }