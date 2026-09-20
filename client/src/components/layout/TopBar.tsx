import { Menu } from 'lucide-react';
import { useTheme } from '../theme-provider';

interface TopBarProps {
  title: string;
  userName: string;
  userRole: string;
  onMenuToggle: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, userName, userRole, onMenuToggle }) => {

  return (
    <header className="sticky top-0 h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 z-30 shadow-sm">
      <button
        className="lg:hidden text-slate-500 hover:text-[#004b93] p-1"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="flex-1 text-[15px] font-bold text-[#004b93] truncate uppercase tracking-tight">{title}</h1>

      <div className="flex items-center gap-4">


        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 rounded bg-[#004b93] flex items-center justify-center text-white font-bold text-xs">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[13px] font-bold text-slate-700">{userName}</span>
            <span className="text-[10px] text-[#004b93] font-bold uppercase tracking-wider">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
