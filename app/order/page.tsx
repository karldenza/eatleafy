"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase"; // Sesuaikan path utils supabase Anda

export default function CustomerOrderPortal() {
  // State Kendali Alur Formulir
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  // State Input Form Pelanggan
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    instagram: "",
    order_type: "MONTHLY",
    start_date: "",
    address: "",
    address_backup: "",
  });

  // Mendapatkan domain asal secara dinamis di client-side
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  // Sinkronisasi Sesi ID Pelanggan via LocalStorage agar jika halaman di-refresh data tidak hilang
  useEffect(() => {
    const savedId = localStorage.getItem("eatleafy_customer_order_id");
    if (savedId) {
      setOrderId(savedId);
      fetchExistingOrder(savedId);
    }
  }, []);

  // Fungsi mengambil data pesanan milik sendiri jika ID ditemukan
  const fetchExistingOrder = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setFormData({
        name: data.name || "",
        whatsapp: data.whatsapp || "",
        instagram: data.instagram || "",
        order_type: data.order_type || "MONTHLY",
        start_date: data.start_date || "",
        address: data.address || "",
        address_backup: data.address_backup || "",
      });
    } else {
      // Jika ID tidak valid di database, bersihkan localstorage
      localStorage.removeItem("eatleafy_customer_order_id");
      setOrderId(null);
    }
    setLoading(false);
  };

  // Fungsi Generate Menu Otomatis EatLeafy untuk database admin
  const generateMenuPlan = (type: string) => {
    const menuTemplates = [
      "Nasi Merah dengan Dada Ayam Panggang dan Brokoli Kukus + Buah",
      "Chicken Steak with Lemonilo Noodles + Buah",
      "Chicken Steak with Potato Wedges + Buah",
      "Nasi Merah dengan Ikan Nila Bakar dan Sayur Bening + Buah",
      "Nasi Putih dengan Ikan Tongkol Bakar dan Lalapan + Buah",
      "Baso Louha + Buah",
      "Nasi Merah dengan Tumis Udang, Buncis, dan Wortel + Buah"
    ];

    const length = type === "MONTHLY" ? 30 : type === "WEEKLY" ? 7 : 1;
    if (type === "OFFLINE") return ["Menu: Custom Offline Healthy Pack"];

    return Array.from({ length }, (_, i) => {
      const menu = menuTemplates[i % menuTemplates.length];
      return `Day ${i + 1}: ${menu}`;
    });
  };

  // HANDLER: Membuat Pesanan Baru atau Memperbarui (Create & Edit)
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Tentukan durasi berdasarkan tipe paket yang dipilih pelanggan
    const duration = formData.order_type === "MONTHLY" ? 30 : formData.order_type === "WEEKLY" ? 7 : 1;
    const generatedMenu = generateMenuPlan(formData.order_type);

    const payload = {
      name: formData.name,
      whatsapp: formData.whatsapp,
      instagram: formData.instagram,
      order_type: formData.order_type,
      duration_days: duration,
      start_date: formData.start_date,
      address: formData.address,
      address_backup: formData.address_backup,
      menu_plan: generatedMenu,
    };

    if (orderId) {
      // MODE EDIT: Update pesanan yang sudah ada berdasarkan ID miliknya sendiri
      const { error } = await supabase
        .from("customers")
        .update(payload)
        .eq("id", orderId);

      if (error) {
        setMessage({ type: "error", text: "Gagal memperbarui pesanan: " + error.message });
      } else {
        setMessage({ type: "success", text: "Pesanan Anda berhasil diperbarui!" });
      }
    } else {
      try {
        // PERBAIKAN FRONTEND: Membuat UUID rahasia secara mandiri sebelum dikirim
        const clientGeneratedId = crypto.randomUUID();

        // MODE CREATE: Menyisipkan ID buatan client untuk mengatasi error not-null
        const { data, error } = await supabase
          .from("customers")
          .insert([{ 
            id: clientGeneratedId, 
            ...payload, 
            is_paused: false, 
            paused_dates: [] 
          }])
          .select()
          .single();

        if (error) {
          setMessage({ type: "error", text: "Gagal membuat pesanan: " + error.message });
        } else if (data) {
          localStorage.setItem("eatleafy_customer_order_id", data.id);
          setOrderId(data.id);
          setMessage({ type: "success", text: "Pesanan berhasil dikirim ke Admin EatLeafy!" });
        }
      } catch (cryptoError) {
        setMessage({ type: "error", text: "Browser tidak mendukung pengamanan UUID lingkungan lokal." });
      }
    }
    setLoading(false);
  };

  // HANDLER: Menghapus Pesanan Sendiri (Delete)
  const handleDeleteOrder = async () => {
    if (!orderId) return;
    
    const confirmDelete = window.confirm("Apakah Anda yakin ingin membatalkan & menghapus seluruh data pesanan katering Anda?");
    if (!confirmDelete) return;

    setLoading(true);
    const { error } = await supabase
      .from("customers")
      .delete()
      .eq("id", orderId);

    if (error) {
      setMessage({ type: "error", text: "Gagal menghapus pesanan: " + error.message });
    } else {
      localStorage.removeItem("eatleafy_customer_order_id");
      setOrderId(null);
      setFormData({
        name: "",
        whatsapp: "",
        instagram: "",
        order_type: "MONTHLY",
        start_date: "",
        address: "",
        address_backup: "",
      });
      setMessage({ type: "success", text: "Pesanan Anda telah berhasil dihapus dari sistem." });
    }
    setLoading(false);
  };

  // FUNGSI BARU: Copy Tautan Unik Portal ke Clipboard Salinan Pengguna
  const uniquePortalLink = `${baseUrl}/customer/${orderId}`;

  const handleCopyLink = async () => {
    if (!orderId) return;
    try {
      await navigator.clipboard.writeText(uniquePortalLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset label status setelah 2 detik
    } catch (err) {
      console.error("Gagal menyalin tautan: ", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex flex-col items-center justify-center p-4 md:p-8 antialiased">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden p-6 space-y-6">
        
        {/* Header Portal */}
        <div className="text-center space-y-1">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center mx-auto mb-2 shadow-sm border border-slate-100 bg-slate-50">
            <img 
              src="/logo.jpeg" 
              alt="EatLeafy Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {orderId ? "CUSTOMER ORDER" : "CUSTOMER ORDER"}
          </h1>
          <p className="text-xs font-semibold text-slate-400">
            {orderId ? "MONTHLY & WEEKLY CATERING" : "MONTHLY - WEEKLY CATERING"}
          </p>
        </div>

        {/* Notifikasi Status Feedback */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* Form Input Utama */}
        <form onSubmit={handleSubmitOrder} className="space-y-4">
          
          <div>
            <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">FULL NAME</label>
            <input
              type="text"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder=""
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">WhatsApp</label>
              <input
                type="tel"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="08xxxxxxxx"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">INSTAGRAM (OPTIONAL)</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="@username"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">PACKET TYPE</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors appearance-none"
                value={formData.order_type}
                onChange={(e) => setFormData({ ...formData, order_type: e.target.value })}
                disabled={!!orderId}
              >
                <option value="MONTHLY">Monthly (30 Days)</option>
                <option value="WEEKLY">Weekly (7 Days)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">START DATE</label>
              <input
                type="date"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">MAIN LOCATION</label>
            <textarea
              required
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="TYPE YOUR DETAIL LOCATION..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">SECONDARY LOCATION (OPTIONAL )</label>
            <textarea
              rows={2}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
              placeholder="TYPE YOUR ALTERNATE LOCATION..."
              value={formData.address_backup}
              onChange={(e) => setFormData({ ...formData, address_backup: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs tracking-widest uppercase disabled:opacity-50"
          >
            {loading ? "Processing..." : orderId ? "Update My Order" : "Submit & Register Order"}
          </button>
        </form>

        {/* FITUR BARU: Tampilan Tautan Unik Portal Akses Mandiri Konsumen */}
        {orderId && (
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
            
            {/* Card Tampilan Link Unik */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase px-0.5">
                YOUR UNIQUE PORTAL LINK
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={uniquePortalLink}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase transition-all whitespace-nowrap border ${
                    copied 
                      ? "bg-emerald-500 text-white border-emerald-500" 
                      : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-normal px-0.5">
              Save this unique link to track your catering menu
              </p>
            </div>

            {/* Navigasi Live Tracker */}
            <a
              href={`/customer/${orderId}`}
              target="_blank"
              className="block text-center w-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold py-3 rounded-2xl text-xs tracking-widest uppercase transition-all"
            >
              View Live Tracker Timeline
            </a>
            
            <button
              type="button"
              onClick={handleDeleteOrder}
              disabled={loading}
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-extrabold py-3 rounded-2xl transition-all text-xs tracking-widest uppercase"
            >
              Cancel & Delete My Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}