import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { PrintReceipt } from '@/components/PrintReceipt';
import { 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  LogOut, 
  Shield,
  Printer,
  FileText
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, voiceEnabled, setVoiceEnabled, printEnabled, setPrintEnabled } = useTheme();
  const { counter, logout } = useAuth();

  const sampleItems = [
    { id: 'sample1', orderId: 'SAMPLE-789012', menuItemId: 'm1', itemName: 'Crispy Chicken Wings', quantity: 2, price: 220, category: 'Starters', kitchen: 'Restaurant' as const, status: 'Completed' as const, notes: null, createdAt: Date.now() },
    { id: 'sample2', orderId: 'SAMPLE-789012', menuItemId: 'm2', itemName: 'Classic Cheese Burger', quantity: 1, price: 150, category: 'Fast Food', kitchen: 'Fast Food' as const, status: 'Completed' as const, notes: null, createdAt: Date.now() },
    { id: 'sample3', orderId: 'SAMPLE-789012', menuItemId: 'm3', itemName: 'Cold Coffee', quantity: 2, price: 80, category: 'Beverages', kitchen: 'Fast Food' as const, status: 'Completed' as const, notes: null, createdAt: Date.now() },
  ];

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your interface theme, announcements, and active session
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-xl text-emerald-500 dark:text-emerald-400">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">Appearance</h3>
              <p className="text-xs text-slate-400">Customize the application color theme</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <span className="text-sm font-medium">Dark Mode</span>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Announcements Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-xl text-emerald-500 dark:text-emerald-400">
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold">Notifications</h3>
              <p className="text-xs text-slate-400">Voice broadcast settings for billing actions</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
            <span className="text-sm font-medium">Voice Announcements</span>
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                voiceEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Printing Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-xl text-emerald-500 dark:text-emerald-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Printing</h3>
              <p className="text-xs text-slate-400">Configure receipt and billing print options</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enable Print Button</span>
              <button
                onClick={() => setPrintEnabled(!printEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  printEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    printEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {printEnabled && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center">
                <span className="text-xs text-slate-400">Test receipt layout (80mm)</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Test Print / Preview
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Session Info / Sign Out Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-xl text-emerald-500 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Session & Security</h3>
              <p className="text-xs text-slate-400">Active counter billing configuration</p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 font-light">Active Counter:</span>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-xs ${
                    counter === 'B1'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-400/10'
                      : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 dark:bg-indigo-400/10'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${counter === 'B1' ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`} />
                  {counter === 'B1' ? 'Restaurant Counter' : 'Fast Food Counter'}
                </div>
              </div>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/30 font-semibold text-sm transition-all cursor-pointer shadow-xs font-sans"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Receipt Sample for Testing */}
      {printEnabled && (
        <PrintReceipt
          tableName="Sample Table S1"
          orderId="SAMPLE-789012"
          counterName={counter === 'B1' ? 'Restaurant Counter B1' : 'Fast Food Counter B2'}
          items={sampleItems}
          grandTotal={730}
          paymentStatus="Paid"
        />
      )}
    </div>
  );
};
