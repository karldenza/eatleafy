export function calculateProgramStatus(startDateStr: string, durationDays: number, pausedDates: string[]) {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Jika belum mulai
  if (today < start) {
    return {
      currentDay: 1,
      progressPercentage: 0,
      isCompleted: false,
      daysRemaining: durationDays,
      activeDaysPassed: 0
    };
  }

  let activeDaysPassed = 0;
  let currentDay = 1;
  let checkDate = new Date(start);
  
  // Set aman batas perulangan agar tidak infinite loop
  const maxIterations = durationDays + pausedDates.length + 100; 
  let iterations = 0;

  // Lakukan iterasi hari demi hari dari start_date sampai HARI INI
  while (checkDate <= today && iterations < maxIterations) {
    const yyyy = checkDate.getFullYear();
    const mm = String(checkDate.getMonth() + 1).padStart(2, "0");
    const dd = String(checkDate.getDate()).padStart(2, "0");
    const checkDateStr = `${yyyy}-${mm}-${dd}`;

    // Jika hari ini TIDAK di-pause oleh admin, berarti catering dikirim (hitung sebagai hari aktif)
    if (!pausedDates.includes(checkDateStr)) {
      activeDaysPassed++;
    }
    
    checkDate.setDate(checkDate.getDate() + 1);
    iterations++;
  }

  // Jika hari ini pas tanggal pause, status currentDay adalah hari aktif terakhir yang terpenuhi + 1
  // Tapi tidak boleh melebihi total durasi paket paket
  currentDay = activeDaysPassed === 0 ? 1 : activeDaysPassed;
  if (currentDay > durationDays) currentDay = durationDays;

  const isCompleted = activeDaysPassed >= durationDays;
  const daysRemaining = Math.max(0, durationDays - activeDaysPassed);
  const progressPercentage = Math.min(100, Math.round((currentDay / durationDays) * 100));

  return {
    currentDay,
    progressPercentage,
    isCompleted,
    daysRemaining,
    activeDaysPassed
  };
}