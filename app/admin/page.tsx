"use client";

export default function AdminPage() {
    return (
        <main className="flex-1 p-12 overflow-y-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-black text-blue-900 tracking-tight mb-2 uppercase">System Overview</h1>
                <p className="text-blue-700/60 font-bold uppercase tracking-widest text-[10px]">Monitoring laundry operations and user performance.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {[
                    { label: 'Total Revenue', value: '฿128,400', icon: '💰', color: 'blue' },
                    { label: 'Active Orders', value: '42', icon: '🧺', color: 'sky' },
                    { label: 'Online Riders', value: '8', icon: '🛵', color: 'emerald' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-blue-100/50 border border-white relative overflow-hidden group hover:-translate-y-1 transition-all">
                        <div className={`absolute top-0 right-0 h-24 w-24 bg-${stat.color}-50 rounded-bl-full -mr-8 -mt-8`}></div>
                        <span className="text-3xl mb-4 block group-hover:scale-110 transition-transform">{stat.icon}</span>
                        <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest block mb-1">{stat.label}</span>
                        <span className="text-3xl font-black text-blue-900">{stat.value}</span>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-blue-100/50 border border-white">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-blue-900">Recent Activity Log</h3>
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest animate-pulse">Live</span>
                </div>

                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all cursor-default">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform">👤</div>
                                <div>
                                    <p className="text-sm font-bold text-blue-900 line-clamp-1">New order accepted by Rider #00{i}</p>
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">2 mins ago</p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-xl uppercase tracking-widest border border-blue-100 hover:bg-blue-600 hover:text-white transition-colors">Details</span>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
