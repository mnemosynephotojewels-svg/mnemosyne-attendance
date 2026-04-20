// Mock data for the attendance system

export interface Employee {
  id: string;
  employee_number?: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  team: string;
  avatar?: string;
  profile_picture_url?: string; // Add profile picture URL
  status: 'in-office' | 'late' | 'absent' | 'on-leave';
  lastCheckIn?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  team: string; // The team this admin leads
  avatar?: string;
  profile_picture_url?: string; // Add profile picture URL
  employee_number: string; // Admin also has employee number for attendance
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'late' | 'absent';
  avatar?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedDate: string;
}

export const employees: Employee[] = [
  {
    id: 'EMP001',
    name: 'Sarah Johnson',
    email: 'sarah.j@mnemosyne.com',
    phone: '+1 234 567 8901',
    position: 'Senior Designer',
    team: 'Creative',
    status: 'in-office',
    lastCheckIn: '08:00 AM',
  },
  {
    id: 'EMP002',
    name: 'Michael Chen',
    email: 'michael.c@mnemosyne.com',
    phone: '+1 234 567 8902',
    position: 'Lead Developer',
    team: 'Engineering',
    status: 'in-office',
    lastCheckIn: '08:15 AM',
  },
  {
    id: 'EMP003',
    name: 'Emily Davis',
    email: 'emily.d@mnemosyne.com',
    phone: '+1 234 567 8903',
    position: 'Marketing Manager',
    team: 'Marketing',
    status: 'late',
    lastCheckIn: '09:30 AM',
  },
  {
    id: 'EMP004',
    name: 'James Wilson',
    email: 'james.w@mnemosyne.com',
    phone: '+1 234 567 8904',
    position: 'Product Manager',
    team: 'Product',
    status: 'in-office',
    lastCheckIn: '08:10 AM',
  },
  {
    id: 'EMP005',
    name: 'Maria Garcia',
    email: 'maria.g@mnemosyne.com',
    phone: '+1 234 567 8905',
    position: 'UX Researcher',
    team: 'Creative',
    status: 'in-office',
    lastCheckIn: '08:05 AM',
  },
  {
    id: 'EMP006',
    name: 'David Lee',
    email: 'david.l@mnemosyne.com',
    phone: '+1 234 567 8906',
    position: 'Backend Developer',
    team: 'Engineering',
    status: 'in-office',
    lastCheckIn: '08:20 AM',
  },
  {
    id: 'EMP007',
    name: 'Lisa Anderson',
    email: 'lisa.a@mnemosyne.com',
    phone: '+1 234 567 8907',
    position: 'HR Specialist',
    team: 'Human Resources',
    status: 'in-office',
    lastCheckIn: '08:00 AM',
  },
  {
    id: 'EMP008',
    name: 'Robert Taylor',
    email: 'robert.t@mnemosyne.com',
    phone: '+1 234 567 8908',
    position: 'Sales Lead',
    team: 'Sales',
    status: 'absent',
  },
  {
    id: 'EMP009',
    name: 'Jennifer White',
    email: 'jennifer.w@mnemosyne.com',
    phone: '+1 234 567 8909',
    position: 'HR Coordinator',
    team: 'Human Resources',
    status: 'in-office',
    lastCheckIn: '08:15 AM',
  },
  {
    id: 'EMP010',
    name: 'Thomas Brown',
    email: 'thomas.b@mnemosyne.com',
    phone: '+1 234 567 8910',
    position: 'Frontend Developer',
    team: 'Engineering',
    status: 'in-office',
    lastCheckIn: '08:25 AM',
  },
  {
    id: 'EMP011',
    name: 'Amanda Martinez',
    email: 'amanda.m@mnemosyne.com',
    phone: '+1 234 567 8911',
    position: 'Graphic Designer',
    team: 'Creative',
    status: 'in-office',
    lastCheckIn: '08:30 AM',
  },
  {
    id: 'EMP012',
    name: 'Christopher Davis',
    email: 'chris.d@mnemosyne.com',
    phone: '+1 234 567 8912',
    position: 'Content Writer',
    team: 'Marketing',
    status: 'in-office',
    lastCheckIn: '08:10 AM',
  },
];

// Team Leader Admins - Each admin manages their specific team
export const admins: Admin[] = [
  {
    id: 'ADM001',
    name: 'Lisa Anderson',
    email: 'lisa.a@mnemosyne.com',
    phone: '+1 234 567 8907',
    position: 'HR Manager',
    team: 'Human Resources', // Manages HR team
    employee_number: 'EMP-ADM001', // Admin also has employee number for attendance
  },
  {
    id: 'ADM002',
    name: 'Michael Chen',
    email: 'michael.c@mnemosyne.com',
    phone: '+1 234 567 8902',
    position: 'Engineering Lead',
    team: 'Engineering', // Manages Engineering team
    employee_number: 'EMP-ADM002', // Admin also has employee number for attendance
  },
  {
    id: 'ADM003',
    name: 'Sarah Johnson',
    email: 'sarah.j@mnemosyne.com',
    phone: '+1 234 567 8901',
    position: 'Messaging Lead',
    team: 'Messaging', // Manages Messaging team
    employee_number: 'EMP-ADM003', // Admin also has employee number for attendance
  },
  {
    id: 'ADM004',
    name: 'Emily Davis',
    email: 'emily.d@mnemosyne.com',
    phone: '+1 234 567 8903',
    position: 'Marketing Head',
    team: 'Marketing', // Manages Marketing team
    employee_number: 'EMP-ADM004', // Admin also has employee number for attendance
  },
  {
    id: 'ADM005',
    name: 'Robert Taylor',
    email: 'robert.t@mnemosyne.com',
    phone: '+1 234 567 8908',
    position: 'Sales Director',
    team: 'Sales', // Manages Sales team
    employee_number: 'EMP-ADM005', // Admin also has employee number for attendance
  },
];

export const attendanceRecords: AttendanceRecord[] = [
  {
    id: 'ATT001',
    employeeId: 'EMP001',
    employeeName: 'Sarah Johnson',
    date: '2026-03-15',
    checkIn: '08:00 AM',
    checkOut: '05:00 PM',
    status: 'present',
  },
  {
    id: 'ATT002',
    employeeId: 'EMP002',
    employeeName: 'Michael Chen',
    date: '2026-03-15',
    checkIn: '08:15 AM',
    status: 'present',
  },
  {
    id: 'ATT003',
    employeeId: 'EMP003',
    employeeName: 'Emily Davis',
    date: '2026-03-15',
    checkIn: '09:30 AM',
    status: 'late',
  },
  {
    id: 'ATT004',
    employeeId: 'EMP004',
    employeeName: 'James Wilson',
    date: '2026-03-15',
    checkIn: '08:10 AM',
    status: 'present',
  },
  {
    id: 'ATT005',
    employeeId: 'EMP005',
    employeeName: 'Maria Garcia',
    date: '2026-03-15',
    checkIn: '08:05 AM',
    status: 'present',
  },
  {
    id: 'ATT006',
    employeeId: 'EMP001',
    employeeName: 'Sarah Johnson',
    date: '2026-03-14',
    checkIn: '08:05 AM',
    checkOut: '05:10 PM',
    status: 'present',
  },
  {
    id: 'ATT007',
    employeeId: 'EMP002',
    employeeName: 'Michael Chen',
    date: '2026-03-14',
    checkIn: '08:20 AM',
    checkOut: '05:15 PM',
    status: 'present',
  },
];

export const leaveRequests: LeaveRequest[] = [
  {
    id: 'LVE001',
    employeeId: 'EMP008',
    employeeName: 'Robert Taylor',
    leaveType: 'Sick Leave',
    startDate: '2026-03-15',
    endDate: '2026-03-16',
    reason: 'Medical appointment',
    status: 'approved',
    submittedDate: '2026-03-13',
  },
  {
    id: 'LVE002',
    employeeId: 'EMP003',
    employeeName: 'Emily Davis',
    leaveType: 'Annual Leave',
    startDate: '2026-03-20',
    endDate: '2026-03-22',
    reason: 'Personal travel',
    status: 'pending',
    submittedDate: '2026-03-14',
  },
];

export const weeklyStats = [
  { day: 'Mon', attendance: 95 },
  { day: 'Tue', attendance: 92 },
  { day: 'Wed', attendance: 88 },
  { day: 'Thu', attendance: 90 },
  { day: 'Fri', attendance: 85 },
  { day: 'Sat', attendance: 0 },
  { day: 'Sun', attendance: 93 },
];

// Current user session (mock)
export const currentEmployee = employees[0]; // Sarah Johnson as default employee
export const currentAdmin = admins[0]; // Lisa Anderson as admin - HR Manager managing Human Resources team
export const currentSuperAdmin = {
  id: 'SUPER001',
  name: 'Admin User',
  email: 'admin@mnemosyne.com',
  position: 'Super Administrator',
  team: 'Management',
};