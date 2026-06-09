'use client';

import { 
  BarChart3, Users, ShoppingBag, Leaf, 
  TrendingUp, ArrowUpRight, AlertTriangle 
} from 'lucide-react';

export default function AdminDashboard() {
  // Dati simulati che verranno poi collegati a Supabase Analytics
  const stats = [
    { label: 'Utenti Attivi', value: '1,284', change: '+12%', icon: Users, color: 'text-blue-500' },
    { label: 'Scansioni Oggi', value: '452', change: '+25%', icon: BarChart3, color: 'text-emerald-500' },
    { label: 'Revenue Retail (Est.)', value: '€842.50', change: '+8%', icon: ShoppingBag, color: 'text-amber-500' },
    { label: 'Cibo Salvato (Kg)', value: '124kg', change: '+15%', icon: Leaf, color: 'text-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tighter">Billion Dollar Console</h1>
            <p className="text-white/40 mt-2 font-medium">Monitoraggio in tempo reale dell&apos;ecosistema FrigoChef.</p>
          </div>
          <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-widest text-white/60">Live Analytics</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/10 p-6 rounded-[32px] hover:border-white/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl bg-white/5 ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  {stat.change} <ArrowUpRight size={14} />
                </div>
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-bold mt-1 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Retention & Loops */}
          <div className="lg:col-span-2 bg-white/[0.02] border border-white/10 rounded-[40px] p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
              <TrendingUp className="text-emerald-500" />
              Killer Loops & Retention
            </h3>
            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold">D1 Retention (Daily Habit)</p>
                  <p className="text-xs text-white/40">Utenti che aprono l&apos;app per controllare le scadenze.</p>
                </div>
                <p className="text-2xl font-mono font-bold text-emerald-500">42%</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold">Scan-to-Recipe Conversion</p>
                  <p className="text-xs text-white/40">Efficacia dell&apos;AI nel proporre piatti desiderabili.</p>
                </div>
                <p className="text-2xl font-mono font-bold text-blue-500">68%</p>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex justify-between items-center">
                <div>
                  <p className="font-bold">Retail Checkout Success</p>
                  <p className="text-xs text-white/40">Conversione su Amazon Fresh / Carrefour.</p>
                </div>
                <p className="text-2xl font-mono font-bold text-amber-500">12.5%</p>
              </div>
            </div>
          </div>

          {/* AI Reliability Monitor */}
          <div className="bg-gradient-to-b from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[40px] p-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-emerald-500">
              <ShieldCheck size={24} />
              AI Reliability
            </h3>
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Recipe Sanity Score</span>
                  <span className="text-emerald-500">98.2%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[98.2%]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                  <span className="text-white/40">Ingredient Normalization</span>
                  <span className="text-blue-500">94%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[94%]" />
                </div>
              </div>
              
              <div className="pt-4 mt-4 border-t border-white/5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="text-amber-500 mt-1" size={18} />
                  <div>
                    <p className="text-sm font-bold">Ultimo Alert</p>
                    <p className="text-xs text-white/40 mt-1 italic">&quot;Rilevata dose anomala di sale in: Risotto allo Zafferano. Correzione AI applicata.&quot;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ShieldCheck({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
