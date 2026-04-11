import { authFetch } from '../../api';
import React, { useState, useEffect, useCallback } from 'react';
import {
    Package,
    AlertTriangle,
    CheckCircle,
    XCircle,
    PlusCircle,
    Search,
    Edit2,
    Trash2,
    Box,
    X
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../components/Toast';

const API_URL = import.meta.env.VITE_API_URL;

const InventoryManagement = () => {
    const { isRTL, dir } = useLanguage();
    
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, id: null });
    const toast = useToast();

    const [formData, setFormData] = useState({
        item_name: '',
        category: 'Balls',
        quantity: 1,
        condition: 'Good'
    });

    const fetchInventory = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await authFetch(`${API_URL}/inventory/`);
            if (res.ok) {
                const data = await res.json();
                setItems(data || []);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
            showBanner('خطأ في تحميل البيانات', 'error');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const showBanner = (message, type = 'success') => {
        if (type === 'error') toast.error(message);
        else toast.success(message);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClick = () => {
        setFormData({
            item_name: '',
            category: 'Balls',
            quantity: 1,
            condition: 'Good'
        });
        setIsEditMode(false);
        setEditingId(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (item) => {
        setFormData({
            item_name: item.item_name,
            category: item.category,
            quantity: item.quantity,
            condition: item.condition
        });
        setIsEditMode(true);
        setEditingId(item.id);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = isEditMode ? `${API_URL}/inventory/${editingId}` : `${API_URL}/inventory/`;
            const method = isEditMode ? 'PATCH' : 'POST';
            
            const payload = {
                ...formData,
                quantity: parseInt(formData.quantity)
            };

            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to save item');
            
            setIsModalOpen(false);
            fetchInventory();
            showBanner(isEditMode ? 'تم تحديث المعدات بنجاح' : 'تم إضافة المعدات بنجاح', 'success');
        } catch { showBanner('خطأ في حفظ البيانات', 'error');
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ isOpen: true, id });
    };

    const confirmDelete = async () => {
        const id = confirmDialog.id;
        setConfirmDialog({ isOpen: false, id: null });
        try {
            const res = await authFetch(`${API_URL}/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setItems(prev => prev.filter(i => i.id !== id));
                showBanner('تم الحذف بنجاح', 'success');
            } else {
                throw new Error('Failed to delete');
            }
        } catch {
            showBanner('خطأ في الحذف', 'error');
        }
    };

    const filteredItems = items.filter(i => 
        i.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const lowStockItems = items.filter(item => item.quantity <= 5 && item.quantity > 0).length;
    const outOfStockItems = items.filter(item => item.quantity === 0 || item.condition === 'Lost').length;

    const getConditionBadge = (condition) => {
        switch (condition) {
            case 'New': return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-black tracking-widest uppercase">جديد</span>;
            case 'Good': return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black tracking-widest uppercase">جيد</span>;
            case 'Fair': return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black tracking-widest uppercase">متوسط</span>;
            case 'Poor': return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black tracking-widest uppercase">سيء</span>;
            case 'Lost': return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-black tracking-widest uppercase">مفقود</span>;
            default: return null;
        }
    };
    
    const getCategoryName = (category) => {
        const mapping = {
            'Balls': 'كرات',
            'Bibs': 'صدريات',
            'Cones': 'أقماع',
            'Jerseys': 'أقمصة',
            'Medical': 'معدات طبية',
            'Other': 'أخرى'
        };
        return mapping[category] || category;
    };

    return (
        <div className={`animate-fade-in pb-10 ${isRTL ? 'text-right' : 'text-left'}`} dir={dir}>
            {/* Toast handled by global provider */}

            <div className={`flex flex-col md:flex-row justify-between items-center mb-8 gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                <div>
                    <h2 className={`text-4xl font-black text-slate-800 tracking-tight flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
                            <Box size={32} />
                        </div>
                        إدارة المعدات
                    </h2>
                    <p className="text-slate-400 font-bold mt-2 tracking-widest text-sm uppercase">تتبع المستودع وتجهيزات الأكاديمية</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        onClick={handleAddClick}
                        className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <PlusCircle size={20} />
                        <span>معدات جديدة</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-indigo-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <Package size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                            <Package size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                            {totalItems}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">إجمالي القطع المتوفرة</p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-amber-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <AlertTriangle size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm">
                            <AlertTriangle size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                            {lowStockItems}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">عناصر قاربت النفاذ (5 أو أقل)</p>
                    </div>
                </div>

                <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 premium-shadow relative overflow-hidden group hover:border-red-400 transition-all ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="absolute top-0 left-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:-rotate-12 group-hover:scale-110">
                        <XCircle size={80} />
                    </div>
                    <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="p-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 shadow-sm">
                            <XCircle size={20} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">
                            {outOfStockItems}
                        </h4>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">عناصر مفقودة أو نافذة</p>
                    </div>
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 premium-shadow overflow-hidden border-b-8 border-b-indigo-900 animate-fade-in">
                <div className={`px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <h3 className={`font-extrabold text-slate-800 text-lg flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Box size={20} className="text-indigo-500" /> جرد المعدات
                    </h3>

                    <div className={`relative w-full sm:w-80`}>
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={18} />
                        <input
                            type="text"
                            placeholder="ابحث عن معدات..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'} py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm`}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className={`w-full ${isRTL ? 'text-right' : 'text-left'} border-collapse`} dir={dir}>
                        <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-[0.2em] font-black border-b border-slate-100">
                                <th className="px-8 py-6">الاسم والصنف</th>
                                <th className="px-8 py-6">الكمية</th>
                                <th className="px-8 py-6">الحالة</th>
                                <th className="px-8 py-6">تاريخ التحديث</th>
                                <th className="px-8 py-6">تعديل</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">تحميل البيانات...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-8 py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xs opacity-50">
                                        لا توجد معدات مسجلة
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-extrabold text-slate-900 text-[15px] tracking-tight mb-1">
                                                {item.item_name}
                                            </div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {getCategoryName(item.category)}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`font-black text-lg tracking-tighter ${item.quantity <= 5 ? 'text-red-500' : 'text-slate-900'}`}>
                                                {item.quantity}
                                            </span>
                                            <span className="text-slate-400 text-xs mr-1">وحدة</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {getConditionBadge(item.condition)}
                                        </td>
                                        <td className="px-8 py-6 text-[10px] font-bold text-slate-400">
                                            {new Date(item.last_updated).toLocaleString('ar-MA')}
                                        </td>
                                        <td className="px-8 py-6 text-left">
                                            <div className={`flex justify-start gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                                <button onClick={() => handleEditClick(item)} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-slate-100/50 rounded-xl transition-all"><Edit2 size={18} /></button>
                                                <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in text-right" dir="rtl">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg premium-shadow overflow-hidden border border-slate-200">
                        <div className="px-10 py-8 border-b border-slate-100 bg-indigo-50 flex justify-between items-center flex-row-reverse">
                            <h3 className="font-black text-indigo-900 text-2xl tracking-tight flex items-center gap-3">
                                <Package size={24} /> {isEditMode ? 'تعديل المعدات' : 'تسجيل معدات جديدة'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-indigo-400 hover:text-indigo-600 p-2 hover:bg-white rounded-full transition-all"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6 text-right">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">اسم المعدات / العنصر</label>
                                <input
                                    type="text"
                                    name="item_name"
                                    value={formData.item_name}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm"
                                    placeholder="مثلا: كرات حجم 5، صدريات حمراء..."
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الصنف</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleInputChange}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                                    >
                                        <option value="Balls">كرات</option>
                                        <option value="Bibs">صدريات</option>
                                        <option value="Cones">أقماع</option>
                                        <option value="Jerseys">أقمصة</option>
                                        <option value="Medical">معدات طبية</option>
                                        <option value="Other">أخرى</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الكمية المتوفرة</label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        required min="0" step="1"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-slate-500/10 text-right shadow-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">الحالة العامة</label>
                                <select
                                    name="condition"
                                    value={formData.condition}
                                    onChange={handleInputChange}
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none shadow-sm cursor-pointer appearance-none text-right"
                                >
                                    <option value="New">جديد (New)</option>
                                    <option value="Good">جيد (Good)</option>
                                    <option value="Fair">متوسط (Fair)</option>
                                    <option value="Poor">سيء / تالف (Poor)</option>
                                    <option value="Lost">مفقود (Lost)</option>
                                </select>
                            </div>

                            <div className="pt-8 flex gap-4 justify-end items-center border-t border-slate-100 mt-4 flex-row-reverse">
                                <button type="submit" className="flex-1 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all transform active:scale-95">
                                    {isEditMode ? 'تحديث البيانات' : 'إضافة للمعرض'}
                                </button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-10 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-2xl transition-all">إلغاء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ isOpen: false, id: null })}
                isRTL={isRTL}
                title={isRTL ? 'حذف المعدات' : 'Delete Equipment'}
                message={isRTL ? 'هل أنت متأكد من حذف هذه المعدات؟' : 'Are you sure you want to delete this equipment?'}
            />
        </div>
    );
};

export default InventoryManagement;
