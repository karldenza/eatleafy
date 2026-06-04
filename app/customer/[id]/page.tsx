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
  pause_duration_days: number; // ✅ Tambahkan properti kolom baru dari database
  menu_plan: string[];
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

      if (!error && data) setCustomer(data);
      else setCustomer(null);

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

  // ✅ Berikan parameter ketiga agar perhitungan hari berjalan akurat dikurangi masa jeda
  const status = calculateProgramStatus(
    customer.start_date,
    customer.duration_days,
    customer.pause_duration_days
  );

  const todayMenuIndex = status.currentDay - 1;
  const todayMenuRaw = customer.menu_plan?.[todayMenuIndex] || "";
  const [meal] = [todayMenuRaw]; // unified meal

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
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col items-center justify-between p-4 antialiased selection:bg-emerald-100">
      
      {/* CONTAINER UTAMA */}
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-white/60 overflow-hidden flex flex-col font-sans my-auto">

        {/* HEADER BRANDING */}
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpeg"
              alt="EatLeafy"
              className="w-12 h-12 rounded-2xl object-cover ring-4 ring-emerald-50"
            />
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-1">
                EatLeafy <span className="text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-mono tracking-widest">LIVE</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Meal Tracking & Delivery System
              </p>
            </div>
          </div>
        </div>

        {/* CONTENT LAYOUT */}
        <div className="p-5 space-y-6">

          {/* CUSTOMER CARD */}
          <div className="rounded-3xl p-5 text-white bg-slate-950 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-emerald-600/20 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <span className="text-[9px] font-black text-emerald-400 tracking-widest uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/20">
                  Premium Member
                </span>
                <h2 className="text-xl font-black tracking-tight text-white mt-2 leading-tight">
                  {customer.name}
                </h2>
                
                {customer.instagram && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium mt-1">
                    <span className="text-[10px]">📸</span>
                    <span className="hover:text-emerald-400 transition-colors">@{customer.instagram.replace('@', '')}</span>
                  </div>
                )}
              </div>
              <StatusBadge />
            </div>

            {/* Package Tracker Address Style */}
            <div className="mt-5 pt-4 border-t border-slate-800 text-xs text-slate-300 space-y-2 font-medium">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400">📍</span>
                <p className="leading-relaxed"><span className="text-[10px] font-bold text-slate-500 block tracking-wider">PRIMARY LOCATION</span>{customer.address}</p>
              </div>
              {customer.address_backup && (
                <div className="flex items-start gap-1.5 pt-1">
                  <span className="text-slate-500">📍</span>
                  <p className="leading-relaxed text-slate-400"><span className="text-[10px] font-bold text-slate-500 block tracking-wider">SECONDARY LOCATION</span>{customer.address_backup}</p>
                </div>
              )}
            </div>
          </div>

          {/* ✅ BOX INFORMASI JEDA OTOMATIS (Akan muncul jika ada total jeda > 0 hari) */}
          {customer.pause_duration_days > 0 && (
            <div className="bg-blue-50 border border-blue-200/60 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <div className="text-lg bg-blue-500 text-white rounded-xl w-8 h-8 flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
                ⏸️
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wide">
                  Siklus Diperpanjang (Auto-Pause)
                </h4>
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Paket Anda dijeda oleh admin selama <span className="font-extrabold text-blue-900 font-mono text-sm bg-blue-100/80 px-1.5 py-0.5 rounded">{customer.pause_duration_days} Hari</span>. Durasi berlangganan Anda akan mundur otomatis dan lanjut normal tanpa hangus.
                </p>
              </div>
            </div>
          )}

          {/* PROGRESS CHALLENGE */}
          {!customer.is_paused && !status.isCompleted && (
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2">
              <div className="flex justify-between items-end text-xs">
                <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Challenge Progress</span>
                <span className="font-mono font-black text-slate-950">
                  Day <span className="text-emerald-600">{status.currentDay}</span> / {customer.duration_days}
                </span>
              </div>

              <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden p-[2px]">
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

          {/* TODAY'S MEAL MANIFEST */}
          {!customer.is_paused && !status.isCompleted && (
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase px-0.5">
                Today's Fuel Delivery
              </h3>

              <div className="p-4 rounded-2xl border-2 border-emerald-500/10 bg-emerald-50/20 shadow-sm relative">
                <span className="absolute top-3 right-3 text-sm">🥗</span>
                <p className="text-[9px] font-black tracking-widest text-emerald-700 uppercase mb-1">
                  Active Manifest Menu
                </p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {meal || "Balanced healthy meal prepared for your plan."}
                </p>
              </div>
            </div>
          )}

          {/* FITNESS CHALLENGE HISTORY */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase px-0.5">
              Program History Timeline
            </h3>

            <div className="grid grid-cols-5 gap-1.5">
              {customer.menu_plan.map((_, index) => {
                const day = index + 1;
                const done = day < status.currentDay;
                const today = day === status.currentDay;

                return (
                  <div
                    key={index}
                    className={`relative rounded-xl py-2.5 px-1 text-center font-mono text-[11px] font-black transition-all
                      ${
                        done
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-600 opacity-60"
                          : today && !customer.is_paused
                          ? "bg-slate-900 border-transparent text-white ring-4 ring-emerald-500/20 scale-105 z-10"
                          : "bg-slate-50 border border-slate-100 text-slate-400"
                      }
                    `}
                  >
                    <span className="block text-[8px] tracking-tighter opacity-50 uppercase">D-{day}</span>
                    {done ? "✔" : today && customer.is_paused ? "⏸" : "⚡"}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* FOOTER & CALL TO ACTION */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-4">
          <a
            href={`https://wa.me/628971056400`}
            target="_blank"
            className="block text-center w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs tracking-widest uppercase active:scale-[0.99]"
          >
            💬 Contact WhatsApp Support
          </a>

          <footer className="text-center text-[10px] text-slate-400 font-semibold tracking-wide pb-1">
            &copy; {new Date().getFullYear()} EatLeafy. All Rights Reserved.
          </footer>
        </div>

      </div>
    </div>
  );
}