import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: SidebarItem[];
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ items, isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('erp_access_token');
    localStorage.removeItem('erp_refresh_token');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 w-64 h-screen bg-card border-r border-border flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-border">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">🎓</span>
              <span className="text-lg font-bold tracking-tight text-[#004b93] leading-tight">
                Kits Akshar
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] pl-1 leading-none">
              Inst Of Tech
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">
          {items.map((item) => (
            item.label.startsWith('──') ? (
              <div key={item.label} className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {item.label.replace(/─/g, '')}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.split('/').length <= 2}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-[13px] font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#004b93] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-[#004b93]'
                  }`
                }
                onClick={onClose}
              >
                <span className={`w-4 h-4 flex items-center justify-center`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            )
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 text-[13px] font-bold text-rose-600 hover:bg-rose-50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
