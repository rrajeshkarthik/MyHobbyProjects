
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import StatsCard from './components/StatsCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RateHistoryItem, AlertLog } from './types';
import { analyzeAppreciation } from './services/geminiService';

const App: React.FC = () => {
  const [currentRate, setCurrentRate] = useState<number>(0.6842);
  const [history, setHistory] = useState<RateHistoryItem[]>([]);
  const [email, setEmail] = useState<string>('user@example.com');
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [nextCheckIn, setNextCheckIn] = useState<number>(3600);
  const [isEmailSentModal, setIsEmailSentModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'chart' | 'logs'>('chart');

  // Fix: Use ReturnType<typeof setInterval> instead of NodeJS.Timeout to resolve the namespace error in browser environment
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to get Singapore Time
  const getSGTTime = () => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Singapore" }));
  };

  const isWithinWorkingHours = () => {
    const sgt = getSGTTime();
    const hour = sgt.getHours();
    return hour >= 8 && hour < 17; // 8 AM to 5 PM
  };

  const fetchExchangeRate = useCallback(async () => {
    // In a real app, you'd fetch from an API like ExchangeRate-API or Open Exchange Rates
    // For this demo, we simulate a realistic fluctuation around 0.68 EUR per SGD
    const fluctuation = (Math.random() - 0.45) * 0.002; // Slightly biased towards appreciation
    const newRate = Number((currentRate + fluctuation).toFixed(5));
    
    const now = getSGTTime();
    const timeString = now.toLocaleTimeString('en-SG', { hour12: false, hour: '2-digit', minute: '2-digit' });

    const newHistoryItem = {
      time: timeString,
      rate: newRate,
      unix: Date.now()
    };

    setHistory(prev => [...prev.slice(-23), newHistoryItem]);
    
    // Check for appreciation
    if (newRate > currentRate && isWithinWorkingHours()) {
      const analysis = await analyzeAppreciation(newRate, currentRate, history);
      
      if (analysis?.isAppreciating) {
        const newLog: AlertLog = {
          id: Date.now().toString(),
          timestamp: now.toLocaleString(),
          message: `SGD Appreciated: ${analysis.subject}`,
          rate: newRate,
          type: 'appreciation'
        };
        setLogs(prev => [newLog, ...prev]);
        setIsEmailSentModal(true);
      }
    }

    setCurrentRate(newRate);
    setNextCheckIn(3600);
  }, [currentRate, history]);

  // Initial setup and clock
  useEffect(() => {
    const initialHistory = Array.from({ length: 12 }, (_, i) => ({
      time: `${8 + i}:00`,
      rate: 0.68 + (Math.random() * 0.01),
      unix: Date.now() - (12 - i) * 3600000
    }));
    setHistory(initialHistory);
    setCurrentRate(initialHistory[initialHistory.length - 1].rate);

    const clockTimer = setInterval(() => {
      const clockEl = document.getElementById('clock-display');
      if (clockEl) {
        clockEl.innerText = getSGTTime().toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      }
      setNextCheckIn(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(clockTimer);
  }, []);

  // Monitoring Scheduler logic
  useEffect(() => {
    if (isMonitoring) {
      checkIntervalRef.current = setInterval(() => {
        if (isWithinWorkingHours()) {
          fetchExchangeRate();
        }
      }, 3600000); // Hourly
    } else {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    }
    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isMonitoring, fetchExchangeRate]);

  const toggleMonitoring = () => setIsMonitoring(!isMonitoring);

  const formatTimeRemaining = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            label="Current SGD/EUR" 
            value={currentRate.toFixed(4)} 
            change="+0.24%" 
            isPositive={true}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-9 9-4-4-6 6" /></svg>}
          />
          <StatsCard 
            label="Next Scheduled Check" 
            value={formatTimeRemaining(nextCheckIn)}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatsCard 
            label="Active Monitoring" 
            value={isMonitoring ? "Enabled" : "Paused"} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
          />
          <StatsCard 
            label="Alert History" 
            value={logs.filter(l => l.type === 'appreciation').length} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Visualizer Area */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('chart')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'chart' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Trend View
                  </button>
                  <button 
                    onClick={() => setActiveTab('logs')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'logs' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Alert Logs
                  </button>
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Live Real-time Data</span>
              </div>
              
              <div className="p-6">
                {activeTab === 'chart' ? (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history}>
                        <defs>
                          <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="time" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12}}
                          dy={10}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 12}}
                          dx={-10}
                        />
                        <Tooltip 
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          itemStyle={{color: '#4f46e5', fontWeight: 'bold'}}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="#4f46e5" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorRate)" 
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[400px] overflow-y-auto space-y-4 pr-2">
                    {logs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <svg className="w-12 h-12 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p>No alerts triggered yet</p>
                      </div>
                    ) : (
                      logs.map(log => (
                        <div key={log.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-4 transition-all hover:border-indigo-200">
                          <div className={`mt-1 p-2 rounded-lg ${log.type === 'appreciation' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                            {log.type === 'appreciation' ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-9 9-4-4-6 6" /></svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold text-slate-400 uppercase">{log.timestamp}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-500 uppercase">Rate: {log.rate}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700">{log.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Automation Settings
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Notification Email</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-slate-700 font-medium"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-900 uppercase mb-1">Schedule Rule</h3>
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    Automated checks run every 1 hour during Singapore Business Hours (08:00 - 17:00 SGT).
                  </p>
                </div>

                <button 
                  onClick={toggleMonitoring}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isMonitoring ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200'}`}
                >
                  {isMonitoring ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Pause Monitoring
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Start Monitoring
                    </>
                  )}
                </button>

                <button 
                  onClick={fetchExchangeRate}
                  className="w-full py-3 rounded-xl font-bold border-2 border-slate-100 text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Check Rates Now
                </button>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="font-bold">AI Insight</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "SGD is showing strong resistance at 0.682 EUR. Historical data suggests a 0.5% appreciation trend over the next 4 hours due to favorable regional market signals."
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal Simulation */}
      {isEmailSentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">Alert Email Sent!</h3>
            <p className="text-center text-slate-500 text-sm mb-6">
              SGD appreciation detected. A detailed notification has been sent to <span className="font-bold text-slate-700">{email}</span>.
            </p>
            <button 
              onClick={() => setIsEmailSentModal(false)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <footer className="py-6 border-t border-slate-200 bg-white text-center text-slate-400 text-xs">
        &copy; 2024 SGD-EUR Smart Tracker • Real-time Monitoring Active
      </footer>
    </div>
  );
};

export default App;
