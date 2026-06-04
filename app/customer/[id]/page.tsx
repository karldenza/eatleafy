"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabase";
import { calculateProgramStatus } from "../../../utils/dateHelpers";
import { notFound } from "next/navigation";

interface CustomerData {
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
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerTrackingPage({ params }: PageProps) {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const resolved = await params;
      const id = resolved?.id?.toLowerCase();

      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setCustomer({
          ...data,
          paused_dates: Array.isArray(data.paused_dates) ? data.paused_dates : [],
        });
      } else {
        setCustomer(null);
      }
      setLoading(false);
    };
    load();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7F6]">
        <div className="text-center space-y-3">
          <div className="h-9 w-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-bold tracking-widest uppercase animate-pulse">
            Syncing Active Plan...
          </p>
        </div>
      </div>
    );
  }

  if (!customer) notFound();

  const isOffline = customer.order_type === "OFFLINE";
  const safeDates = Array.isArray(customer.paused_dates) ? customer.paused_dates : [];
  
  const status = !isOffline 
    ? calculateProgramStatus(customer.start_date, customer.duration_days, safeDates)
    : { currentDay: 1, progressPercentage: 100, isCompleted: false, daysRemaining: 0 };

  const todayMenuIndex = (status.currentDay || 1) - 1;
  const todayMenuRaw = customer.menu_plan?.[todayMenuIndex] || "";

  const StatusBadge = () => {
    if (customer.is_paused)
      return (
        <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-amber-400 text-slate-950 uppercase tracking-wider">
          PAUSED
        </span>
      );

    if (status.isCompleted)
      return (
        <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-slate-700 text-slate-200 uppercase tracking-wider">
          COMPLETED
        </span>
      );

    return (
      <span className="text-[10px] font-black px-2.5 py-1 rounded-md bg-emerald-400 text-slate-950 uppercase tracking-wider shadow-sm shadow-emerald-400/20">
        ACTIVE
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col items-center p-4 md:p-8 antialiased selection:bg-emerald-100">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col font-sans my-auto">

        {/* Header Branding */}
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            {/* LOGO BARU ANDA DISINI */}
          <img 
            src="/logo.jpeg" 
            alt="Leafy Group Logo" 
            className="w-12 h-12 rounded-2xl object-cover"
          />
  
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1">
                Leafy Group <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono tracking-widest">LIVE</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Meal Tracking & Delivery System
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-5 space-y-6">
          
          {/* Member Card */}
          <div className="rounded-3xl p-5 text-white bg-slate-950 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/20">
                  Member
                </span>
                <h2 className="text-xl font-black tracking-tight text-white mt-2 leading-tight">
                  {customer.name}
                </h2>
                {customer.instagram && (
                  <div className="text-xs text-slate-400 font-medium mt-1">
                    <span>@{customer.instagram.replace('@', '')}</span>
                  </div>
                )}
              </div>
              <StatusBadge />
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-2 font-medium">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block tracking-wider uppercase">PRIMARY LOCATION</span>
                <p className="leading-relaxed">{customer.address}</p>
              </div>
              {customer.address_backup && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 block tracking-wider uppercase">SECONDARY LOCATION</span>
                  <p className="leading-relaxed text-slate-400">{customer.address_backup}</p>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar Challenge */}
          {!customer.is_paused && !status.isCompleted && !isOffline && (
            <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-2">
              <div className="flex justify-between items-end text-xs">
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Challenge Progress</span>
                <span className="font-mono font-black text-slate-950">
                  Day <span className="text-emerald-600">{status.currentDay}</span> / {customer.duration_days}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-[2px] border">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                  style={{ width: `${status.progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-bold font-mono text-slate-400">
                <span>{status.daysRemaining} DAYS REMAINING</span>
                <span className="text-emerald-600">{status.progressPercentage}% COMPLETE</span>
              </div>
            </div>
          )}

          {/* Today's Menu Box */}
          {!customer.is_paused && !status.isCompleted && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase px-0.5">
                Today's Fuel Delivery
              </h3>
              <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/30 shadow-sm">
                <p className="text-[9px] font-black tracking-widest text-emerald-700 uppercase mb-1">
                  Active Manifest Menu
                </p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {todayMenuRaw || "Balanced healthy meal prepared for your plan."}
                </p>
              </div>
            </div>
          )}

          {/* Program History Timeline Grid Berbasis Penjaminan Hari Aktif Utuh */}
          {!isOffline && (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase px-0.5">
                Program History Timeline
              </h3>

              <div className="grid grid-cols-5 gap-2">
                {(() => {
                  const cardsElements = [];
                  
                  // Inisialisasi tanggal awal program katering
                  const runningDate = new Date(customer.start_date || "2026-06-01");
                  runningDate.setHours(0, 0, 0, 0);

                  let activeDayCounter = 0;
                  let extensionCounter = 0;
                  let iterations = 0;

                  // Looping terus berjalan sampai jumlah HARI AKTIF terpenuhi seutuhnya (misal 30 hari)
                  while (activeDayCounter < customer.duration_days && iterations < 150) {
                    const yyyy = runningDate.getFullYear();
                    const mm = String(runningDate.getMonth() + 1).padStart(2, "0");
                    const dd = String(runningDate.getDate()).padStart(2, "0");
                    const currentCardDateStr = `${yyyy}-${mm}-${dd}`;

                    const isDatePausedByAdmin = safeDates.includes(currentCardDateStr);

                    let cardLabel = "";
                    let cardStatusText = "";
                    let isExtensionCard = false;

                    if (isDatePausedByAdmin) {
                      cardLabel = `${dd}/${mm}`;
                      cardStatusText = "HOLD";
                      // Catatan: activeDayCounter TIDAK bertambah jika hari ini di-HOLD
                    } else {
                      activeDayCounter++;
                      cardLabel = `D-${activeDayCounter}`;
                      cardStatusText = "RUN";
                    }

                    // Cek status perbandingan tanggal riil hari ini
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const isDayPassed = runningDate < today;
                    const isDayToday = runningDate.getTime() === today.getTime();

                    cardsElements.push(
                      <div
                        key={`normal-${iterations}`}
                        className={`relative rounded-2xl py-3 px-1 text-center font-mono text-[11px] font-black border transition-all overflow-hidden
                          ${
                            isDatePausedByAdmin
                              ? "bg-red-50 border-red-200 text-red-500 shadow-sm" // Kondisi HOLD (Merah)
                              : isDayPassed
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" // Selesai (Hijau Pekat)
                              : isDayToday && !customer.is_paused
                              ? "bg-slate-900 border-transparent text-white ring-4 ring-emerald-500/20 scale-105 z-10 shadow-md" // Hari ini aktif berjalan
                              : "bg-emerald-50/60 border-emerald-100 text-emerald-700 font-bold" // Hari kedepan (Hijau Muda)
                          }
                        `}
                      >
                        {isDatePausedByAdmin && (
                          <svg className="absolute inset-0 w-full h-full text-red-400/70 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <line x1="0" y1="0" x2="100" y2="100" stroke="currentColor" strokeWidth="2.5" />
                            <line x1="100" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="2.5" />
                          </svg>
                        )}
                        <span className="block text-[8px] tracking-tighter uppercase mb-0.5 opacity-75">
                          {cardLabel}
                        </span>
                        <span className="text-[10px] tracking-tight uppercase">
                          {isDatePausedByAdmin ? "HOLD" : (isDayPassed ? "OK" : cardStatusText)}
                        </span>
                      </div>
                    );

                    runningDate.setDate(runningDate.getDate() + 1);
                    iterations++;
                  }

                  // KUNCI UTAMA: Tambahkan kartu kompensasi sebanyak jumlah tanggal yang di-hold di akhir grid!
                  for (let e = 0; e < safeDates.length; e++) {
                    extensionCounter++;
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const isDayPassed = runningDate < today;
                    const isDayToday = runningDate.getTime() === today.getTime();

                    cardsElements.push(
                      <div
                        key={`ext-${e}`}
                        className={`relative rounded-2xl py-3 px-1 text-center font-mono text-[11px] font-black border transition-all overflow-hidden
                          ${
                            isDayToday && !customer.is_paused
                              ? "bg-purple-600 border-transparent text-white ring-4 ring-purple-500/20 scale-105 z-10 shadow-sm"
                              : "bg-purple-50 border-purple-200 text-purple-700" // Warna Ungu Kompensasi
                          }
                        `}
                      >
                        <span className="block text-[8px] tracking-tighter uppercase mb-0.5 opacity-75">
                          EXT-{(e + 1)}
                        </span>
                        <span className="text-[9px] tracking-tight uppercase">
                          {isDayToday ? "RUN" : isDayPassed ? "OK" : "COMPENSATED"}
                        </span>
                      </div>
                    );
                    
                    runningDate.setDate(runningDate.getDate() + 1);
                  }

                  return cardsElements;
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Action Button & Footer Support Area */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-4">
          <a
            href={`https://wa.me/628971056400`}
            target="_blank"
            className="block text-center w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs tracking-widest uppercase active:scale-[0.99]"
          >
            Contact WhatsApp Support
          </a>
          <footer className="text-center text-[10px] text-slate-400 font-semibold tracking-wide pb-1">
            &copy; {new Date().getFullYear()} EatLeafy. All Rights Reserved.
          </footer>
        </div>

      </div>
    </div>
  );
}