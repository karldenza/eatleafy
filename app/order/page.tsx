"use client";
import React, { useState, useEffect } from "react";
import { supabase } from "../../utils/supabase"; // Sesuaikan path utils supabase Anda

export default function CustomerOrderPortal() {
  // State Kendali Alur Formulir & Step
  const [step, setStep] = useState<number>(1); // Step 1: Form, Step 2: Benefit, Step 3: Payment
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  
  // State File Bukti Pembayaran
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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

  // Fungsi Hitung Harga dan Keterangan Berdasarkan Paket
  const getPackageDetails = () => {
    if (formData.order_type === "MONTHLY") {
      return { price: "Rp 1.350.000", duration: "Monthly (30 Days)", info: "Selama 30 hari include sabtu dan minggu" };
    } else {
      return { price: "Rp 235.000", duration: "Weekly 5 Days", info: "Senin sampai jumat" };
    }
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

  // Handler Perubahan File Gambar Bukti Transfer
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // HANDLER: Membuat Pesanan Baru atau Memperbarui ke Supabase
  const handleSubmitFinalOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    let uploadedImageUrl = null;

    // Proses upload gambar bukti transfer jika ada file baru yang dimasukkan
    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      
      const { data: storageData, error: storageError } = await supabase.storage
        .from("payment-proofs")
        .upload(fileName, imageFile);

      if (storageError) {
        setMessage({ type: "error", text: "Gagal mengunggah bukti transfer: " + storageError.message });
        setLoading(false);
        return;
      }

      // Ambil Public URL hasil upload gambar
      if (storageData) {
        const { data: urlData } = supabase.storage
          .from("payment-proofs")
          .getPublicUrl(fileName);
        uploadedImageUrl = urlData.publicUrl;
      }
    }

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
      ...(uploadedImageUrl && { payment_proof_url: uploadedImageUrl }) // Simpan URL foto ke kolom DB jika ada
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
        setMessage({ type: "success", text: "Pesanan & bukti pembayaran Anda berhasil diperbarui!" });
        setStep(1);
      }
    } else {
      try {
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
          setMessage({ type: "success", text: "Pesanan & Bukti Transfer Berhasil Dikirim ke Admin EatLeafy!" });
          setStep(1);
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
      setImageFile(null);
      setImagePreview(null);
      setStep(1);
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
            CUSTOMER ORDER
          </h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {step === 1 && "MONTHLY - WEEKLY CATERING"}
            {step === 2 && "BENEFIT & PACKAGE INFO"}
            {step === 3 && "SECURE PAYMENT PORTAL"}
          </p>
        </div>

        {/* Notifikasi Status Feedback */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* ================= STEP 1: FORM INPUT UTAMA ================= */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">FULL NAME</label>
              <input
                type="text"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  placeholder="08xxxxxxxx"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">INSTAGRAM (OPTIONAL)</label>
                <input
                  type="text"
                  placeholder="@username"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
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
                  <option value="WEEKLY">Weekly (5 Days)</option>
                  
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
                placeholder="TYPE YOUR DETAIL LOCATION..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1 px-1">SECONDARY LOCATION (OPTIONAL)</label>
              <textarea
                rows={2}
                placeholder="TYPE YOUR ALTERNATE LOCATION..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                value={formData.address_backup}
                onChange={(e) => setFormData({ ...formData, address_backup: e.target.value })}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if(formData.name && formData.whatsapp && formData.start_date && formData.address) {
                  setStep(2);
                } else {
                  alert("Mohon lengkap pengisian form bertanda wajib terlebih dahulu.");
                }
              }}
              className="w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs tracking-widest uppercase"
            >
              Next
            </button>
          </div>
        )}

        {/* ================= STEP 2: BOX KETERANGAN BENEFIT DAN DETAIL HARGA ================= */}
        {step === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-emerald-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paket Terpilih:</span>
                <span className="text-sm font-black text-emerald-800">{getPackageDetails().duration}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Harga:</span>
                <span className="text-lg font-black text-slate-900">{getPackageDetails().price}</span>
              </div>
              <p className="text-[11px] italic font-semibold text-emerald-700 bg-white/60 p-2 rounded-lg border border-emerald-50 text-center">
                "{getPackageDetails().info}"
              </p>
            </div>

            {/* Box Keterangan Benefit */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <label className="block text-[10px] font-black text-slate-500 tracking-widest uppercase border-b pb-1.5">
                BENEFIT
              </label>
              <ul className="space-y-2 text-xs font-bold text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-base">✓</span> Free Ongkir
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-base">✓</span> Bisa Dijeda (Pause)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-base">✓</span> Alamat Pengantaran Bisa Diubah
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-500 text-base">✓</span> Tracking Menu & Hari Pakai Sistem
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3.5 rounded-2xl text-xs tracking-widest uppercase transition-all"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full bg-slate-950 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-2xl text-xs tracking-widest uppercase transition-all shadow-md"
              >
                Next to Payment
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: HALAMAN PEMBAYARAN & UPLOAD BUKTI ================= */}
        {step === 3 && (
          <form onSubmit={handleSubmitFinalOrder} className="space-y-5 animate-fadeIn">
            {/* Box Informasi Transfer Bank Mandiri */}
            <div className="bg-[#5C462B] text-white rounded-2xl p-5 text-center space-y-4 shadow-inner relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[10px] font-black tracking-widest opacity-30">PAYMENT</div>
              <p className="text-sm font-bold tracking-wider text-amber-200 uppercase">Transfer Melalui :</p>
              <div className="space-y-1">
                <h3 className="text-base font-black tracking-tight">a/n Muhammad Rafif Falah</h3>
                <p className="text-sm font-extrabold text-amber-100">Bank Mandiri</p>
                <p className="text-xl font-mono font-black tracking-widest text-amber-300 mt-2">1120025095824</p>
              </div>
              <div className="pt-2 text-[10px] font-bold text-amber-200/80 tracking-wide">
                Leafy - Healthy Food
              </div>
            </div>

            {/* Input Upload Bukti Foto */}
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 tracking-widest uppercase px-1">
                UPLOAD BUKTI SS TRANSFER *
              </label>
              <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-4 text-center hover:border-emerald-500 transition-colors relative">
                <input
                  type="file"
                  accept="image/*"
                  required={!orderId} // Wajib diisi jika pesanan baru
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {imagePreview ? (
                  <div className="space-y-2">
                    <img src={imagePreview} alt="Preview Bukti" className="max-h-40 mx-auto rounded-lg object-contain border bg-white" />
                    <p className="text-[11px] font-bold text-emerald-600">Gambar Terpilih! Klik untuk mengubah.</p>
                  </div>
                ) : (
                  <div className="space-y-1 py-2">
                    <div className="text-slate-400 text-2xl">📷</div>
                    <p className="text-xs font-bold text-slate-600">Klik / Seret Foto Bukti Transfer Ke Sini</p>
                    <p className="text-[10px] font-semibold text-slate-400">Format: JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setStep(2)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3.5 rounded-2xl text-xs tracking-widest uppercase transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs tracking-widest uppercase disabled:opacity-50"
              >
                {loading ? "Uploading..." : orderId ? "Update & Submit" : "Submit"}
              </button>
            </div>
          </form>
        )}

        {/* ================= AREA FITUR UTAMA LAMA (PORTAL AKSES MANDIRI) ================= */}
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
              className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-extrabold py-3 rounded-2xl transition-all text-xs tracking-widest uppercase disabled:opacity-50"
            >
              Cancel & Delete My Order
            </button>
          </div>
        )}

      </div>
    </div>
  );
}