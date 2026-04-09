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
              <span className="text-lg font-bold tracking-tight text-foreground leading-tight">
                Kits Akshar
              </span>
            </div>
            <span className="text-[10px] font-semibold text-primary uppercase tracking-[0.2em] opacity-80 pl-1 leading-none">
              Inst Of Tech
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-1">
          {items.map((item) => (
            item.label.startsWith('──') ? (
              <div key={item.label} className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                {item.label.replace(/─/g, '')}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.split('/').length <= 2}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
                onClick={onClose}
              >
                <span className={`w-5 h-5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </NavLink>
            )
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-6 border-t border-border bg-accent/20">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full px-4 py-2.5 rounded-xl text-[13px] font-bold text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200 shadow-sm shadow-destructive/5"
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
