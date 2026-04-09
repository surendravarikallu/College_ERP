import React from 'react';
import { Menu, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../theme-provider';

interface TopBarProps {
  title: string;
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, userName, userRole, onMenuToggle }) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border flex items-center px-6 gap-4 z-30">
      <button
        className="lg:hidden text-muted-foreground hover:text-foreground p-1"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="flex-1 text-lg font-semibold text-foreground truncate">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <div className="flex items-center bg-muted rounded-full p-1 border border-border">
          {[
            { id: 'light', icon: <Sun className="w-4 h-4" /> },
            { id: 'dark', icon: <Moon className="w-4 h-4" /> },
            { id: 'system', icon: <Laptop className="w-4 h-4" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as any)}
              className={`p-1.5 rounded-full transition-all ${
                theme === t.id 
                  ? 'bg-background shadow-sm text-foreground scale-110' 
                  : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm ring-2 ring-background">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-sm font-semibold text-foreground">{userName}</span>
            <span className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
