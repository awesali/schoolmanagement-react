import React, { useState } from 'react';
import './Sidebar.css';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isCollapsed: boolean;
}

const menuGroups = [
  {
    group: 'Management',
    items: [
      { label: 'School', children: ['Add School', 'School List', 'Academic Year'] },
      { label: 'Staff', children: ['Create Staff', 'Staff List', 'Roles', 'Attendance', 'Payroll'] },
      { label: 'Students', children: ['Add Student', 'Student List', 'Attendance', 'Promote Student'] },
      { label: 'Parents', children: ['Parent List'] },
      { label: 'Subjects', children: ['Add Subject', 'Subject List'] },
    ],
  },
  {
    group: 'Finance',
    items: [
      { label: 'Fees', children: ['Fees Structure', 'Collect Fees', 'Fees History', 'Pending Fees'] },
    ],
  },
  {
    group: 'Exams',
    items: [
      { label: 'Academic Exam', children: ['Add Exam', 'Marks Entry', 'Result'] },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate, isCollapsed }) => {
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [openItems, setOpenItems] = useState<string[]>([]);

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const toggleItem = (item: string) => {
    setOpenItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-logo">
        <span className="logo-icon">🏫</span>
        <span className="logo-text">SchoolAdmin</span>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('Dashboard')}
        >
          <span className="nav-icon">📊</span>
          <span>Dashboard</span>
        </button>

        {menuGroups.map(({ group, items }) => (
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
                          <button
                            key={child}
                            className={`nav-leaf-item ${activePage === child ? 'active' : ''}`}
                            onClick={() => onNavigate(child)}
                          >
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
