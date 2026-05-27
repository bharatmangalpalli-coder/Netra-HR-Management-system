export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  mobile?: string;
  address?: string;
  aadhaar?: string;
  joiningDate: string;
  exitDate?: string;
  designation?: string;
  monthlySalary: number;
  role: UserRole;
  status: 'active' | 'inactive';
  photoUrl?: string;
  shiftStart?: string; // HH:mm
  shiftEnd?: string;   // HH:mm
  isFlexibleShift?: boolean;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  inTime: string | null;
  outTime: string | null;
  lunchOutTime?: string | null;
  lunchInTime?: string | null;
  location?: {
    lat: number;
    lng: number;
  };
  selfieUrl?: string;
  outSelfieUrl?: string;
  lunchOutSelfieUrl?: string;
  lunchInSelfieUrl?: string;
  status: 'present' | 'absent' | 'half-day' | 'late';
  totalHours?: number;
  markedAt: any;
  isManualTime?: boolean;
  clientDrift?: number;
  permissionUsed?: boolean;
}

export interface PermissionRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  timeSlot: string; // e.g. "10:00 AM - 11:00 AM"
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'Casual' | 'Sick' | 'Emergency';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employeeId
  assignedToName: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  comments: TaskComment[];
  createdAt: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: string;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  month: string; // YYYY-MM
  workingDays: number;
  presentDays: number;
  actualAttendance?: number;
  paidLeaves?: number;
  lwpDays?: number;
  absentDays: number;
  perDaySalary: number;
  baseSalary: number; // Monthly fixed salary
  calculatedSalary: number; // baseSalary / workingDays * presentDays
  overtimeHours: number;
  overtimePay: number;
  bonus: number;
  incentive: number;
  pf: number;
  esi: number;
  professionalTax: number;
  deduction: number; // Other deductions
  netSalary: number;
  generatedAt: string;
}
