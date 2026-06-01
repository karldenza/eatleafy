export interface Customer {
    id: string;
    name: string;
    whatsapp: string;
    address: string;
    address_backup: string; // Fitur Baru: Alamat Cadangan
    is_paused: boolean;     // Fitur Baru: Status Jeda Progres
    startDate: string;
    durationDays: number;
    menuPlan: string[];     // Format baru: "Makan Siang | Snack | Makan Malam"
  }
  
  export let mockCustomers: Customer[] = [
    {
      id: "rafif001",
      name: "Rafif Dian",
      whatsapp: "628123456789",
      address: "Komp. Sukajaya Blok B1, Palembang",
      address_backup: "Kantor Telkom, Jl. Kapten A. Rivai No.9",
      is_paused: false,
      startDate: "2026-05-21",
      durationDays: 30,
      menuPlan: Array.from({ length: 30 }, (_, i) => `Menu Siang Rafif ${i + 1} | Salad Buah | Menu Malam Sehat ${i + 1}`)
    },
    {
      id: "andi001",
      name: "Andi Wijaya",
      whatsapp: "628987654321",
      address: "Komp. Polsri Indah Blok C3, Sukarami",
      address_backup: "",
      is_paused: true, // Contoh pelanggan yang sedang libur/dijeda
      startDate: "2026-05-30",
      durationDays: 30,
      menuPlan: Array.from({ length: 30 }, (_, i) => `Ayam Bakar Madu | Fresh Juice | Salmon Panggang`)
    }
  ];
  
  export const getCustomerById = (id: string): Customer | undefined => {
    if (!id) return undefined;
    return mockCustomers.find(c => c.id && c.id.toLowerCase() === id.toLowerCase());
  };
  
  export const addCustomer = (customer: Customer): void => {
    mockCustomers.push(customer);
  };
  
  export const updatePauseStatus = (id: string, isPaused: boolean): void => {
    const customer = mockCustomers.find(c => c.id.toLowerCase() === id.toLowerCase());
    if (customer) customer.is_paused = isPaused;
  };
  
  export const deleteCustomerFromMock = (id: string): void => {
    mockCustomers = mockCustomers.filter(c => c.id.toLowerCase() !== id.toLowerCase());
  };