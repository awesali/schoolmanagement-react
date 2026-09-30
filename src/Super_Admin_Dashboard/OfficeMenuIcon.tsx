// Office Menu Icon: imports and dependencies
import React from "react";
import {
  AssignmentIcon,
  ClipboardIcon,
  EmailIcon,
  EmployeesIcon,
  FeeTypeIcon,
  LeaveIcon,
  PaymentIcon,
  PrintIcon,
  ReceiptIcon,
  SchoolIcon,
  StudentsIcon,
  SubjectsIcon,
} from "../components/Icons/Icons";

// Constants and helper functions
const icons: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  Dashboard: SchoolIcon,
  "Daily school brief": ClipboardIcon,
  "Academic audit": SubjectsIcon,
  "Student attendance": StudentsIcon,
  Examinations: AssignmentIcon,
  "Teachers & staff": EmployeesIcon,
  "Leave requests": LeaveIcon,
  "Student requests": AssignmentIcon,
  Messages: EmailIcon,
  Finance: PaymentIcon,
  Overview: SchoolIcon,
  Accounting: ClipboardIcon,
  "Collection register": ReceiptIcon,
  "Outstanding fees": FeeTypeIcon,
  "Fee management": PaymentIcon,
  Payroll: EmployeesIcon,
  Reports: PrintIcon,
};

// Main component and state
export default function OfficeMenuIcon({ page }: { page: string }) {
  // Constants and helper functions
  const Icon = icons[page] || ClipboardIcon;
  return <Icon size={18} className="principal-nav-icon" />;
}
