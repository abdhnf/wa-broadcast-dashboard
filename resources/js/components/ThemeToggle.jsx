import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../lib/theme';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from './ui/DropdownMenu';
import { Button } from './ui/Button';

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-1.5 border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-xs"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="capitalize text-[11px] font-mono hidden sm:inline">{theme}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={`flex items-center gap-2 text-xs cursor-pointer ${theme === 'light' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-2 text-xs cursor-pointer ${theme === 'dark' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
        >
          <Moon className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={`flex items-center gap-2 text-xs cursor-pointer ${theme === 'system' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : ''}`}
        >
          <Laptop className="w-3.5 h-3.5 text-blue-400" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
