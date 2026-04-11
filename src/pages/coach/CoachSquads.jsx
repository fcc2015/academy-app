import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import { Users, UserCheck, Shield, ChevronRight, Search, Trophy } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { SkeletonDashboard, EmptyState } from '../../components/Skeleton';

const CoachSquads = () => {
    const { isRTL, dir } = useLanguage();
    const [squads, setSquads] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedSquad, setSelectedSquad] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userId = localStorage.getItem('user_id');
                const [squadsRes, playersRes] = await Promise.all([
                    authFetch(`${API_URL}/squads/coach/${userId}`),
                    authFetch(`${API_URL}/players/`)
                ]);
                if (squadsRes.ok) setSquads(await squadsRes.json());
                if (playersRes.ok) setPlayers(await playersRes.json());
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSquadPlayers = (squadId) => players.filter(p => p.squad_id === squadId);

    const filteredRoster = selectedSquad
        ? getSquadPlayers(selectedSquad.id).filter(p =>
            !searchQuery || p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    if (isLoading) return <SkeletonDashboard />;

    return (
        <div className={`animate-fade-in space-y-8 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Header */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        {isRTL ? 'فرقي' : 'My'} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">{isRTL ? '' : 'Squads'}</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">{isRTL ? 'عرض الفرق المعينة وقائمة اللاعبين' : 'View your assigned squads and player rosters'}</p>
                </div>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2">
                        <Trophy size={16} />
                        {squads.length} {isRTL ? 'فرق' : 'Squads'}
                    </div>
                    <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl font-black text-sm flex items-center gap-2">
                        <Users size={16} />
                        {players.length} {isRTL ? 'لاعب' : 'Players'}
                    </div>
                </div>
            </div>

            {squads.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={isRTL ? 'لا توجد فرق معينة' : 'No Squads Assigned'}
                    description={isRTL ? 'لم يتم تعيين أي فرق لك بعد. تواصل مع الإدارة.' : "You don't have any squads assigned yet. Contact the admin."}
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Squad Cards */}
                    <div className="lg:col-span-1 space-y-4">
                        {squads.map(squad => {
                            const playerCount = getSquadPlayers(squad.id).length;
                            const isActive = selectedSquad?.id === squad.id;
                            return (
                                <button
                                    key={squad.id}
                                    onClick={() => { setSelectedSquad(squad); setSearchQuery(''); }}
                                    className={`w-full text-${isRTL ? 'right' : 'left'} p-5 rounded-[2rem] border transition-all duration-300 ${isActive
                                        ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-lg shadow-emerald-100 scale-[1.02]'
                                        : 'bg-white border-slate-200 hover:border-emerald-200 premium-shadow hover:scale-[1.01]'
                                    }`}
                                >
                                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                {squad.name?.[0] || '?'}
                                            </div>
                                            <div>
                                                <h3 className="font-extrabold text-slate-900 text-lg">{squad.name}</h3>
                                                <p className="text-sm font-medium text-slate-500 mt-0.5">{squad.category || (isRTL ? 'غير محدد' : 'No category')}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                            <span className={`text-xs font-black px-3 py-1.5 rounded-xl ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {playerCount} <Users size={12} className="inline" />
                                            </span>
                                            <ChevronRight size={16} className={`transition-transform ${isActive ? 'text-emerald-600 rotate-90' : 'text-slate-400'} ${isRTL ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Player Roster */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden min-h-[400px]">
                            {!selectedSquad ? (
                                <div className="h-[400px] flex flex-col justify-center items-center text-center p-8">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200 flex items-center justify-center mb-6 shadow-sm">
                                        <Users size={32} className="text-slate-400" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">{isRTL ? 'اختر فريقاً' : 'Select a Squad'}</h3>
                                    <p className="text-slate-500 font-medium max-w-sm">{isRTL ? 'اختر فريقاً من القائمة لعرض تشكيلة اللاعبين' : 'Click on a squad from the left to view its player roster.'}</p>
                                </div>
                            ) : (
                                <>
                                    <div className={`px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                        <h3 className="font-extrabold text-slate-800 text-lg">{selectedSquad.name}</h3>
                                        <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                            {filteredRoster.length} {isRTL ? 'لاعب' : 'Players'}
                                        </span>
                                    </div>

                                    {/* Search */}
                                    {getSquadPlayers(selectedSquad.id).length > 5 && (
                                        <div className="px-6 py-3 border-b border-slate-100">
                                            <div className={`relative flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <Search size={16} className="absolute text-slate-400" style={isRTL ? { right: 16 } : { left: 16 }} />
                                                <input
                                                    type="text"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    placeholder={isRTL ? 'بحث عن لاعب...' : 'Search player...'}
                                                    className={`w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm ${isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4'}`}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="divide-y divide-slate-100">
                                        {filteredRoster.length === 0 ? (
                                            <div className="p-10 text-center text-slate-400 font-bold italic">{isRTL ? 'لا يوجد لاعبون في هذا الفريق' : 'No players in this squad yet.'}</div>
                                        ) : filteredRoster.map((player, idx) => (
                                            <div key={player.user_id} className={`p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-10 h-10 rounded-xl font-black flex items-center justify-center shrink-0 ${player.technical_level === 'A' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                        <h4 className="font-extrabold text-slate-900 text-[15px]">{player.full_name}</h4>
                                                        {player.technical_level === 'A' && (
                                                            <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border border-yellow-200">
                                                                PRO
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500">{player.u_category} • {player.position || (isRTL ? 'بدون مركز' : 'No position')}</p>
                                                </div>
                                                <UserCheck size={18} className="text-emerald-400" />
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoachSquads;
