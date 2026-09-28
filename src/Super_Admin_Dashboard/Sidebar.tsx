import React, { useState } from 'react';
import './Sidebar.css';
import { SchoolIcon } from './TeacherWorkspace';
import { AssignmentIcon, ClipboardIcon, EmailIcon, EmployeesIcon, IdCardIcon, LeaveIcon, PaymentIcon, ProfileIcon, ReceiptIcon, SchoolIcon as AdminSchoolIcon, StudentsIcon, SubjectsIcon, TimeTableIcon, VehicleIcon } from '../components/Icons/Icons';
import { PAGE_PERMISSIONS, usePermissions } from '../security/Permissions';
import { SECURITY_UI_ENABLED } from '../security/features';
import { profilePictureUrl } from './ProfilePictureInput';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string, attendanceType?: 'student' | 'staff') => void;
  isCollapsed: boolean;
  userRole?: string;
  schoolName?: string;
  schoolLogoUrl?: string | null;
  attendanceType?: 'student' | 'staff' | null;
}

const teacherMenuGroups = [
  {
    group: 'Classes',
    items: [{ label: 'Class Management', children: ['My Classes'] }],
  },
  {
    group: 'Attendance',
    items: [
      { label: 'Students', children: ['Attendance'] },
      { label: 'Staff', children: ['Attendance'] },
    ],
  },
  {
    group: 'Exams',
    items: [{ label: 'Academic Exam', children: ['Unit Test', 'Marks Entry'] }],
  },
];

const menuGroups = [
  {
    group: 'Academics',
    items: [
      { label: 'Academic Sessions', children: ['Academic Year'] },
      { label: 'Student Promotion', children: ['Student Promotion'] },
    ],
  },
  {
    group: 'Management',
    items: [
      { label: 'School', children: ['School List'] },
      { label: 'Classes', children: ['Class List'] },
      { label: 'Staff', children: ['Staff List', 'Attendance'] },
      { label: 'Security', children: ['Role & Permissions'] },
      { label: 'Students', children: ['Student List', 'Student Services', 'Student Messages', 'Hall Tickets', 'Attendance'] },
      { label: 'Parents', children: ['Parent List'] },
      { label: 'Transport', children: ['Transport Management'] },
      { label: 'Subjects', children: ['Subject List'] },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Fees', children: ['Fee Management'] },
      { label: 'Salary', children: ['Salary Management'] },
    ],
  },
  {
    group: 'Exams',
    items: [{ label: 'Academic Exam', children: ['Exam Management'] }],
  },
];

const adminMenuIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  'Dashboard': AdminSchoolIcon, 'Academic Year': LeaveIcon, 'Student Promotion': StudentsIcon,
  'School List': AdminSchoolIcon, 'Class List': TimeTableIcon, 'Staff List': EmployeesIcon,
  'Role & Permissions': IdCardIcon, 'Student List': StudentsIcon, 'Student Services': AssignmentIcon,
  'Student Messages': EmailIcon, 'Hall Tickets': IdCardIcon, 'Parent List': ProfileIcon,
  'Transport Management': VehicleIcon, 'Subject List': SubjectsIcon, 'Fee Management': PaymentIcon,
  'Salary Management': ReceiptIcon, 'Exam Management': ClipboardIcon,
  'Student Attendance': StudentsIcon, 'Staff Attendance': EmployeesIcon,
};

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isCollapsed, userRole, schoolName, schoolLogoUrl, attendanceType }) => {
  const { can } = usePermissions();
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const resolvedLogo = profilePictureUrl(schoolLogoUrl);
  const schoolInitials =
    (schoolName || 'School')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'S';

  const currentMenuGroups = userRole === '2' ? teacherMenuGroups : menuGroups;

  const isActiveChild = (child: string, parentLabel: string) =>
    activePage === child && (child !== 'Attendance' || attendanceType === (parentLabel === 'Students' ? 'student' : 'staff'));
  const getFilteredMenuGroups = () => {
    return currentMenuGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => SECURITY_UI_ENABLED || item.label !== 'Security')
          .map((item) => ({
            ...item,
            children: item.children.filter((child) => {
              if (['1', '7'].includes(userRole) && child === 'Student Messages') return false;
              if (userRole === '1' && item.label === 'Students' && child === 'Attendance') {
                return false;
              }
              const permissionPage = child === 'Attendance' ? (item.label === 'Students' ? 'attendance.students' : 'attendance.staff') : PAGE_PERMISSIONS[child];
              return !permissionPage || can(permissionPage, 'read');
            }),
          }))
          .filter((item) => item.children.length > 0),
      }))
      .filter((group) => group.items.length > 0);
  };

  const filteredMenuGroups = getFilteredMenuGroups();

  const handleAttendanceClick = (child: string, parentLabel: string) => {
    if (child === 'Attendance') {
      const attendanceType = parentLabel === 'Students' ? 'student' : 'staff';
      onNavigate('Attendance', attendanceType);
    } else {
      onNavigate(child);
    }
  };

  if (userRole === '2') {
    const items: {
      label: string;
      page: string;
      icon: string;
      permission: string;
      type?: 'student' | 'staff';
    }[] = [
      {
        label: 'Daily workspace',
        page: 'Dashboard',
        icon: 'home',
        permission: 'dashboard.dashboard',
      },
      {
        label: 'My classes',
        page: 'My Classes',
        icon: 'people',
        permission: 'academics.classes',
      },
      {
        label: 'Student attendance',
        page: 'Attendance',
        icon: 'check',
        permission: 'attendance.students',
        type: 'student',
      },
      {
        label: 'Exams & gradebook',
        page: 'Marks Entry',
        icon: 'book',
        permission: 'exams.academic-exam',
      },
      {
        label: 'Unit tests',
        page: 'Unit Test',
        icon: 'check',
        permission: 'exams.academic-exam',
      },
      {
        label: 'My attendance',
        page: 'Attendance',
        icon: 'clock',
        permission: 'attendance.staff',
        type: 'staff',
      },
      { label: 'Exam Preparation', page: 'Exam Preparation', icon: 'book', permission: 'academics.classes' },
      { label: 'Class Diary', page: 'Class Diary', icon: 'book', permission: 'academics.classes' },
      { label: 'Submissions', page: 'Submissions', icon: 'assignment', permission: 'academics.classes' },
      { label: 'Student requests', page: 'Student Leave Requests', icon: 'assignment', permission: 'academics.classes' },
      { label: 'Announcements', page: 'Announcements', icon: 'material', permission: 'academics.classes' },
      { label: 'Messages', page: 'Messages', icon: 'material', permission: 'dashboard.dashboard' },
      {
        label: 'Syllabus Progress',
        page: 'Syllabus Progress',
        icon: 'book',
        permission: 'academics.classes',
      },
      {
        label: 'Homework & Assignments',
        page: 'Homework & Assignments',
        icon: 'assignment',
        permission: 'academics.classes',
      },
      {
        label: 'Calendar',
        page: 'Calendar',
        icon: 'calendar',
        permission: 'academics.class-schedule',
      },
      {
        label: 'Study Material',
        page: 'Study Material',
        icon: 'material',
        permission: 'academics.classes',
      },
      {
        label: 'My Profile',
        page: 'My Profile',
        icon: 'profile',
        permission: 'dashboard.dashboard',
      },
    ];
    return (
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-icon" title={schoolName || 'School'} aria-label={(schoolName || 'School') + ' logo'}>
            {resolvedLogo && failedLogo !== resolvedLogo ? <img src={resolvedLogo} alt={(schoolName || 'School') + ' logo'} onError={() => setFailedLogo(resolvedLogo)} /> : <span>{schoolInitials}</span>}
          </span>
          <span className="logo-text">Teacher Desk</span>
        </div>
        <nav className="sidebar-nav" aria-label="Teacher navigation">
          {items
            .filter((item) => can(item.permission, 'read'))
            .map((item) => (
              <button key={item.label} title={item.label} className={`nav-item ${activePage === item.page && (!item.type || attendanceType === item.type) ? 'active' : ''}`} onClick={() => onNavigate(item.page, item.type)}>
                <SchoolIcon name={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
        </nav>
      </aside>
    );
  }
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <span className="logo-icon" aria-label={`${schoolName || 'School'} logo`}>
          {resolvedLogo && failedLogo !== resolvedLogo ? <img src={resolvedLogo} alt={`${schoolName || 'School'} logo`} onError={() => setFailedLogo(resolvedLogo)} /> : <span>{schoolInitials}</span>}
        </span>
        <span className="logo-text">SchoolAdmin</span>
      </div>

      <nav className="sidebar-nav admin-sidebar-nav" aria-label="Admin navigation">
        {can('dashboard.dashboard', 'read') && (
          <button className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`} aria-current={activePage === 'Dashboard' ? 'page' : undefined} onClick={() => onNavigate('Dashboard')}>
            <AdminSchoolIcon size={19} />
            <span>Dashboard</span>
          </button>
        )}
        {filteredMenuGroups.map(({ group, items }) => (
          <div key={group} className="nav-group">
            <p className="nav-group-header">{group}</p>
            {items.flatMap(({ label, children }) => children.map((child) => {
              const active = isActiveChild(child, label);
              const name = child === 'Attendance' ? `${label === 'Students' ? 'Student' : 'Staff'} Attendance` : child;
              const Icon = adminMenuIcons[name] || ClipboardIcon;
              return (
                <button key={`${label}-${child}`} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => handleAttendanceClick(child, label)}>
                  <Icon size={19} />
                  <span>{name}</span>
                </button>
              );
            }))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;





