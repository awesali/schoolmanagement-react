// Student Icon: imports and dependencies
import React from "react";
import {
  IconProps,
  AssignmentIcon,
  BackIcon,
  BellIcon,
  ClipboardIcon,
  CloseIcon,
  EmailIcon,
  IdCardIcon,
  LeaveIcon,
  MenuIcon,
  PaymentIcon,
  PreviewIcon,
  PrintIcon,
  ProfileIcon,
  ReceiptIcon,
  RemoveIcon,
  ResetIcon,
  RouteIcon,
  SchoolIcon,
  SearchIcon,
  StudentsIcon,
  TeacherIcon,
  TimeTableIcon,
  VehicleIcon,
} from "../components/Icons/Icons";

// Constants and helper functions
const paths: Record<string, string> = {
  home: "M3 10 12 3l9 7v11H3V10Zm6 11v-7h6v7",
  book: "M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 0V4Zm16 0h-3a3 3 0 0 0-3 3v14h3a3 3 0 0 1 3 0V4Z",
  calendar: "M4 6h16v15H4V6Zm0 4h16M8 3v5m8-5v5",
  trophy:
    "M7 3h10v6a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4m-4 2v4m-4 3h8m-9-3h10",
  document: "M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7m-7 4h7",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 17v4h16v-4",
  external: "M14 4h6v6m0-6-9 9M20 13v7H4V4h7",
  bookmark: "M6 3h12v18l-6-4-6 4V3Z",
  send: "m3 12 18-9-5 18-4-7-9-2Zm9 2 9-11",
  plus: "M12 5v14M5 12h14",
  check: "m4 12 5 5L20 6",
  list: "M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01",
  chat: "M4 4h16v13H8l-4 4V4Zm4 5h8m-8 4h6",
};
const existing: Record<string, React.FC<IconProps>> = {
  assignment: AssignmentIcon,
  back: BackIcon,
  bell: BellIcon,
  clipboard: ClipboardIcon,
  close: CloseIcon,
  email: EmailIcon,
  id: IdCardIcon,
  leave: LeaveIcon,
  menu: MenuIcon,
  payment: PaymentIcon,
  preview: PreviewIcon,
  print: PrintIcon,
  profile: ProfileIcon,
  receipt: ReceiptIcon,
  remove: RemoveIcon,
  retry: ResetIcon,
  route: RouteIcon,
  school: SchoolIcon,
  search: SearchIcon,
  students: StudentsIcon,
  teacher: TeacherIcon,
  timetable: TimeTableIcon,
  vehicle: VehicleIcon,
};

// Data types and contracts
export type StudentIconName = keyof typeof paths | keyof typeof existing;

// Main component and state
export default function StudentIcon({
  name,
  size = 17,
  className = "",
}: {
  name: StudentIconName;
  size?: number;
  className?: string;
}) {
  // Constants and helper functions
  const Icon = existing[name];
  if (Icon)
    return <Icon size={size} className={"sp-action-icon " + className} />;
  return (
    <svg
      className={"sp-action-icon " + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
