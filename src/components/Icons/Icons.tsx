import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number | string };

const transportIcon = (path: string): React.FC<IconProps> => ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d={path} />
  </svg>
);

export const VehicleIcon = transportIcon('M5 18H4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v13h-1M7 18h10M4 7h16M4 13h16M12 7v6M7 16h.01M17 16h.01M5 18v3h2v-3M17 18v3h2v-3');
export const DriverIcon = transportIcon('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 10h18M12 14v7M10 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z');
export const ConductorIcon = transportIcon('M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4V6ZM15 6v2m0 3v2m0 3v2M6 10h5M6 14h3');
export const RouteIcon = transportIcon('M5 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM19 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9');
export const AssignmentIcon = transportIcon('M9 3H5v18h14V3h-4M9 2h6v4H9V2ZM8 11h8M8 15l2 2 5-5');
export const PaymentIcon = transportIcon('M3 5h18v14H3V5ZM3 9h18M6 15h3M13 15h5');
export const FuelIcon = transportIcon('M3 21V4h10v17M2 21h12M3 11h10M13 13h2a2 2 0 0 1 2 2v3a2 2 0 0 0 4 0V9l-4-4M18 6v4h3');
export const MaintenanceIcon = transportIcon('M14 6a5 5 0 0 0-6 6L2 18a2.8 2.8 0 0 0 4 4l6-6a5 5 0 0 0 6-6l-3 3-4-4 3-3Z');
export const RemoveIcon = transportIcon('M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7');
export const CloseIcon = transportIcon('m6 6 12 12M6 18 18 6');
export const FeeTypeIcon = transportIcon('M13 3H3v10l8 8L21 11l-8-8ZM7 7h.01M16 2v6M13 5h6');
export const ReceiptIcon = transportIcon('M5 3l2 1 2-1 3 1 3-1 2 1 2-1v18l-2-1-2 1-3-1-3 1-2-1-2 1V3ZM8 8h8M8 12h8M8 16h5');
export const PrintIcon = transportIcon('M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7v-7ZM17 11h.01');
export const MenuIcon = transportIcon('M4 6h16M4 12h16M4 18h16');
export const BellIcon = transportIcon('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4');
export const TeacherIcon = transportIcon('M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-2a7 7 0 0 1 14 0v2M19 4h3v10h-3M19 8h3');
export const StudentsIcon = transportIcon('M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-2a6 6 0 0 1 12 0v2M17 11a4 4 0 0 0 0-8M17 15a6 6 0 0 1 5 6');
export const EmployeesIcon = transportIcon('M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-3a8 8 0 0 1 16 0v3M10 12h4l-1 5h-2l-1-5Z');
export const LeaveIcon = transportIcon('M7 3v3M17 3v3M4 8h16v13H4V5h16M8 13h8M8 17h5');
export const ClipboardIcon = transportIcon('M9 3h6v3H9V3ZM6 5H4v16h16V5h-2M8 11h8M8 15h8');

export const AddStudentIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="m2 5 8-3 8 3-8 3-8-3ZM18 5v5M6 7v3a4 4 0 0 0 8 0V7M2 21v-2a7 7 0 0 1 11-5.7M19 14v8M15 18h8" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <circle cx="10.5" cy="10.5" r="7" /><path d="m16 16 5 5" />
  </svg>
);

export const ResetIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M3 3v6h6M3 9a9 9 0 1 1 0 6" />
  </svg>
);

export const TemplateIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8l-6-6Z M14 2v6h6M8 12h8M8 16h8M8 19h4" />
  </svg>
);

export const ImportIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M12 16V3m-5 8 5 5 5-5M4 16v5h16v-5" />
  </svg>
);

export const ExportIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />
  </svg>
);

export const AddStaffIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <circle cx="9" cy="7" r="4" /><path d="M2 21v-3a7 7 0 0 1 12-4.9M19 14v8M15 18h8" />
  </svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" />
  </svg>
);

export const SubjectsIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M12 6C9 4 6 4 2 5v14c4-1 7-1 10 1 3-2 6-2 10-1V5c-4-1-7-1-10 1v14M5 9h4M5 13h4M15 9h4M15 13h4" />
  </svg>
);

export const TimeTableIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M7 3v4M17 3v4M3 10h18M9 10v11M15 10v11M3 15.5h18" />
  </svg>
);

export const AddClassIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M13 16H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v8M6 7h10M6 11h5M8 16l-2 5M12 16v5M19 15v7M15.5 18.5h7" />
  </svg>
);

export const CreateSchoolIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="m2 9 8-6 8 6M4 8v13h9M16 8v5M8 21v-6h4v6M10 3V1h4" />
    <path d="M7 11h.01M13 11h.01M19 15v7M15.5 18.5h7" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="m16 3 5 5L8 21H3v-5L16 3Z" />
    <path d="m13 6 5 5M3 16l5 5" />
  </svg>
);

export const PreviewIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const AddCircleIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 50 50"
    fill="currentColor" aria-hidden="true" focusable="false"
    style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M 25 2 C 12.309295 2 2 12.309295 2 25 C 2 37.690705 12.309295 48 25 48 C 37.690705 48 48 37.690705 48 25 C 48 12.309295 37.690705 2 25 2 z M 25 4 C 36.609824 4 46 13.390176 46 25 C 46 36.609824 36.609824 46 25 46 C 13.390176 46 4 36.609824 4 25 C 4 13.390176 13.390176 4 25 4 z M 24 13 L 24 24 L 13 24 L 13 26 L 24 26 L 24 37 L 26 37 L 26 26 L 37 26 L 37 24 L 26 24 L 26 13 L 24 13 z" />
  </svg>
);

export const LoadIcon: React.FC<IconProps> = ({ size = 20, style, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" style={{ flexShrink: 0, verticalAlign: 'middle', ...style }} {...props}>
    <path d="M20 7v5h-5M4 17v-5h5" />
    <path d="M6.1 6.1a8 8 0 0 1 13.2 3.1L20 12M4 12l.7 2.8a8 8 0 0 0 13.2 3.1" />
  </svg>
);

export const BackIcon = transportIcon('M19 12H5m7-7-7 7 7 7');
export const EmailIcon = transportIcon('M3 5h18v14H3V5Zm0 0 9 7 9-7');
export const PhoneIcon = transportIcon('M5 3h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z');
export const SchoolIcon = transportIcon('M3 21V8l9-5 9 5v13H3ZM9 21v-6h6v6M7 10h2m6 0h2M11 7h2');
export const ProfileIcon = transportIcon('M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0ZM4 21v-3a8 8 0 0 1 16 0v3');
export const IdCardIcon = transportIcon('M3 5h18v14H3V5ZM6 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM5 16a3 3 0 0 1 6 0M14 9h4m-4 4h4');
export const LogoutIcon = transportIcon('M10 5V3H4v18h6v-2M14 8l4 4-4 4M8 12h10');
