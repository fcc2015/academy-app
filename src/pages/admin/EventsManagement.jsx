import { API_URL } from '../../config';
import { authFetch } from '../../api';
import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    MapPin,
    Trash2,
    Plus,
    Trophy,
    Activity,
    CheckCircle,
    XCircle,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const EventsManagement = () => {
    const [events, setEvents] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        title: '',
        type: 'Match',
        event_date: '',
        event_time: '',
        location: '',
        opponent: '',
        status: 'Scheduled'
    });
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/events/`);
            if (res.ok) {
                const data = await res.json();
                setEvents(data || []);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Ensure date is in YYYY-MM-DD
            const finalData = { ...formData };
            if (!finalData.event_date) {
                showBanner("Please select a date", "error");
                return;
            }

            const res = await authFetch(`${API_URL}/events/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData)
            });

            if (res.ok) {
                setIsAddModalOpen(false);
                setFormData({
                    title: '',
                    type: 'Match',
                    event_date: '',
                    event_time: '',
                    location: '',
                    opponent: '',
                    status: 'Scheduled'
                });
                showBanner('Event saved successfully!', 'success');
                fetchEvents();
            } else {
                const err = await res.json();
                showBanner(`Error: ${err.detail || 'Failed to save event'}`, 'error');
            }
        } catch (error) {
            console.error('Error saving event:', error);
            showBanner('Failed to connect to server.', 'error');
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const res = await authFetch(`${API_URL}/events/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                showBanner('Status updated!', 'success');
                fetchEvents();
            }
        } catch (error) {
            console.error('Error updating status:', error);
            showBanner('Failed to update status', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/events/${id}`, { method: 'DELETE' });
            if (res.ok) { showBanner('Event deleted successfully', 'success'); fetchEvents(); }
        } catch (error) {
            console.error('Error deleting event:', error);
            showBanner('Failed to delete event', 'error');
        }
    };

    return (
        <div className="animate-fade-in pb-10">
            {/* Toast handled by global provider */}
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mb-1">
                        Matches <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">& Events</span>
                    </h1>
                    <p className="text-[15px] font-medium text-slate-500">Schedule and manage academy activities</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus size={20} />
                    <span>Create Event</span>
                </button>
            </div>

            {/* Content Area */}
            {isLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-400 font-bold">
                    Loading academy schedule...
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center premium-shadow">
                    <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2">No events scheduled</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mb-6">Start by adding matches, training sessions or tournaments.</p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="text-indigo-600 font-bold hover:underline"
                    >
                        Schedule your first event
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Event List */}
                    <div className="lg:col-span-2 space-y-4">
                        {events.map((event) => (
                            <div key={event.id} className="relative bg-white rounded-2xl border border-slate-200 premium-shadow group hover:border-indigo-300 transition-all overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center p-6 gap-6">
                                    {/* Date Column */}
                                    <div className="flex sm:flex-col items-center justify-center bg-indigo-50 rounded-xl px-4 py-3 sm:w-20 min-w-[5rem]">
                                        <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest leading-none mb-1">
                                            {new Date(event.event_date).toLocaleDateString('default', { month: 'short' })}
                                        </span>
                                        <span className="text-2xl font-black text-indigo-700 leading-none">
                                            {new Date(event.event_date).getDate()}
                                        </span>
                                    </div>

                                    {/* Info Column */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                                event.type === 'Match' ? 'bg-orange-100 text-orange-700' :
                                                event.type === 'Training' ? 'bg-blue-100 text-blue-700' :
                                                event.type === 'Tournament' ? 'bg-purple-100 text-purple-700' :
                                                event.type === 'Tryouts' ? 'bg-amber-100 text-amber-700' :
                                                event.type === 'Meeting' ? 'bg-teal-100 text-teal-700' :
                                                event.type === 'Holiday' ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {event.type}
                                            </span>
                                            {event.status === 'Completed' && (
                                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                                                    <CheckCircle size={10} /> Done
                                                </span>
                                            )}
                                        </div>
                                        <h4 className="text-lg font-extrabold text-slate-800 truncate mb-1">
                                            {event.title}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-500">
                                            <span className="flex items-center gap-1.5"><Clock size={14} className="text-slate-400" /> {event.event_time.substring(0, 5)}</span>
                                            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-400" /> {event.location}</span>
                                            {event.opponent && <span className="flex items-center gap-1.5"><Trophy size={14} className="text-slate-400" /> vs {event.opponent}</span>}
                                        </div>
                                    </div>

                                    {/* Action Column */}
                                    <div className="flex sm:flex-col items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6">
                                        {event.status === 'Scheduled' ? (
                                            <button
                                                onClick={() => updateStatus(event.id, 'Completed')}
                                                className="flex-1 sm:w-full px-3 py-1.5 rounded-lg text-[13px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                Complete
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateStatus(event.id, 'Scheduled')}
                                                className="flex-1 sm:w-full px-3 py-1.5 rounded-lg text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                            >
                                                Revert
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(event.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stats/Filter Column */}
                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white premium-shadow">
                            <h3 className="text-lg font-extrabold mb-4 flex items-center gap-2">
                                <Activity size={20} />
                                Staff Insight
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                                    <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Total Activities</div>
                                    <div className="text-3xl font-black">{events.length}</div>
                                </div>
                                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                                    <div className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Upcoming Matches</div>
                                    <div className="text-3xl font-black">{events.filter(e => e.type === 'Match' && e.status === 'Scheduled').length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 premium-shadow">
                            <h4 className="font-extrabold text-slate-800 mb-3">Management Tip</h4>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Always mark matches as "Completed" to keep your history clean. Tournament events will automatically appear in reports.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Event Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg premium-shadow overflow-hidden transform scale-100 transition-all">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-left">
                            <div>
                                <h3 className="font-black text-slate-800 text-xl">New Academy Event</h3>
                                <p className="text-sm font-medium text-slate-400">Schedule a match, training or tournament</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5 text-left">
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Event Title</label>
                                    <input
                                        name="title"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. U14 Friendly Match"
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Event Type</label>
                                    <select
                                        name="type"
                                        value={formData.type}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="Match">Official Match / مباراة</option>
                                        <option value="Training">Training Session / تدريب</option>
                                        <option value="Tournament">Tournament / دوري</option>
                                        <option value="Tryouts">Tryouts & Testing / اختبار لاعبين</option>
                                        <option value="Meeting">Meeting / اجتماع</option>
                                        <option value="Holiday">Holiday / عطلة</option>
                                        <option value="Other">Special Event / أخرى</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Date</label>
                                    <input
                                        type="date"
                                        name="event_date"
                                        value={formData.event_date}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Time</label>
                                    <input
                                        type="time"
                                        name="event_time"
                                        value={formData.event_time}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Location</label>
                                <input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="e.g. Grand Stade d'Agadir"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Opponent (Optional)</label>
                                <input
                                    name="opponent"
                                    value={formData.opponent}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] font-bold focus:ring-2 focus:ring-indigo-500/20"
                                    placeholder="e.g. Hassania Agadir"
                                />
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 rounded-2xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all font-bold"
                                >
                                    Schedule Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={false}
                title="Delete Event"
                message="Are you sure you want to delete this event? This cannot be undone."
            />
        </div>
    );
};

export default EventsManagement;
