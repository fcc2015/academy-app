import React from 'react';
import { Settings, CheckCircle2, Save } from 'lucide-react';

export default function SaasSettings() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-100 tracking-tight">System Settings</h2>
                    <p className="text-slate-400 mt-1">Configure global SaaS platform settings.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                    <Save className="w-5 h-5" />
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                {/* General Setting Block */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-4 mb-6">General Configuration</h3>
                    
                    <div className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Platform Name</label>
                            <input 
                                type="text"
                                defaultValue="FC Casablanca SaaS Master"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Support Email</label>
                            <input 
                                type="email"
                                defaultValue="support@academy.com"
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Default Free Trial Days</label>
                            <input 
                                type="number"
                                defaultValue={14}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Automation Block */}
                <div className="border border-slate-800 bg-[#1e293b]/50 backdrop-blur rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-4 mb-6">Automations</h3>
                    
                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-200">Auto-provision Academies</h4>
                                <p className="text-sm text-slate-400 mt-1">Automatically create schema and user when payment succeeds.</p>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white"></div>
                            </div>
                        </label>
                        
                        <label className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-200">Email Notifications</h4>
                                <p className="text-sm text-slate-400 mt-1">Send platform updates to all active academy admins.</p>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white"></div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between p-4 bg-slate-800/20 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/40 transition-colors">
                            <div>
                                <h4 className="font-bold text-slate-200">Database Backups</h4>
                                <p className="text-sm text-slate-400 mt-1">Run automatic nightly backups.</p>
                            </div>
                            <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                                <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white"></div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
