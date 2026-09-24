import React, { useState } from 'react';
import './Sidebar.css';
import { SchoolIcon } from './TeacherWorkspace';
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
      { label: 'Students', children: ['Student List', 'Student Services', 'Hall Tickets', 'Attendance'] },
      { label: 'Parents', children: ['Parent List'] },
      { label: 'Transport', children: ['Transport Management'] },
      { label: 'Inventory', children: ['Inventory Management'] },
      { label: 'Study Materials', children: ['Study Materials'] },
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

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isCollapsed, userRole, schoolName, schoolLogoUrl, attendanceType }) => {
  const { can } = usePermissions();
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);
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

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  };

  const toggleItem = (item: string) => {
    setOpenItems((prev) => (prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]));
  };

  const getFilteredMenuGroups = () => {
    return currentMenuGroups
      .map((group) => ({
        ...group,
        items: group.items
          .filter((item) => SECURITY_UI_ENABLED || item.label !== 'Security')
          .map((item) => ({
            ...item,
            children: item.children.filter((child) => {
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
        icon: 'book',
        permission: 'exams.academic-exam',
      },
      {
        label: 'My timetable',
        page: 'My Timetable',
        icon: 'calendar',
        permission: 'academics.class-schedule',
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
      { label: 'Announcements', page: 'Announcements', icon: 'material', permission: 'academics.classes' },
      { label: 'Messages', page: 'Messages', icon: 'material', permission: 'academics.classes' },
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

      <nav className="sidebar-nav">
        {can('dashboard.dashboard', 'read') && (
          <button className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`} onClick={() => onNavigate('Dashboard')}>
            <span className="nav-icon">📊</span>
            <span>Dashboard</span>
          </button>
        )}

        {filteredMenuGroups.map(({ group, items }) => (
          <div key={group} className="nav-group">
            <button className="nav-group-header" onClick={() => toggleGroup(group)}>
              <span>{group}</span>
              <span className={`chevron ${openGroups.includes(group) ? 'open' : ''}`}>›</span>
            </button>
            {openGroups.includes(group) && (
              <div className="nav-group-items">
                {items.map(({ label, children }) => (
                  <div key={label}>
                    <button className="nav-sub-item nav-sub-parent" onClick={() => toggleItem(label)}>
                      <span>{label}</span>
                      <span className={`chevron ${openItems.includes(label) ? 'open' : ''}`}>›</span>
                    </button>
                    {openItems.includes(label) && (
                      <div className="nav-leaf-items">
                        {children.map((child) => (
                          <button key={child} className={`nav-leaf-item ${activePage === child ? 'active' : ''}`} onClick={() => handleAttendanceClick(child, label)}>
                            {child}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;





