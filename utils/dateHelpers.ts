// utils/dateHelpers.ts

export interface ProgramStatus {
  currentDay: number;
  isCompleted: boolean;
  daysRemaining: number;
  progressPercentage: number;
}

export function calculateProgramStatus(
  startDateStr: string, 
  durationDays: number = 30,
  pauseDurationDays: number = 0 // ✅ Menampung jeda hari dari database (default 0)
): ProgramStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset waktu ke jam 12 malam untuk akurasi tanggal murni

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  // Hitung selisih hari ril antara hari ini dan tanggal mulai
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // ✅ Program Day dikurangi jeda hari. Jika jeda 5 hari, maka hari berjalan otomatis mundur 5 hari.
  const currentDay = diffDays + 1 - pauseDurationDays;

  // Jika hari berjalan melewati durasi program (Misal: sudah melewati batas durasi)
  if (currentDay > durationDays) {
    return {
      currentDay: durationDays,
      isCompleted: true,
      daysRemaining: 0,
      progressPercentage: 100
    };
  }

  // Jika tanggal pendaftaran diset untuk masa depan ATAU akibat tergeser jeda hari (belum mulai kembali)
  if (currentDay < 1) {
    return {
      currentDay: 0,
      isCompleted: false,
      daysRemaining: durationDays,
      progressPercentage: 0
    };
  }

  const daysRemaining = durationDays - currentDay;
  const progressPercentage = Math.round((currentDay / durationDays) * 100);

  return {
    currentDay,
    isCompleted: false,
    daysRemaining,
    progressPercentage
  };
}