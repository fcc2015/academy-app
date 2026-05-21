import React from 'react';
import { Tag, Plus, Trash2 } from 'lucide-react';

const CouponsSection = ({
    settings,
    newCoupon,
    setNewCoupon,
    handleCreateCoupon,
    coupons,
    handleToggleCoupon,
    handleDeleteCoupon
}) => {
    return (
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 premium-shadow overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Tag className="text-indigo-600" size={20} />
                    <h3 className="font-extrabold text-slate-800">Promo & Coupons</h3>
                </div>
            </div>
            <div className="p-8">
                {/* Create New Coupon */}
                <form onSubmit={handleCreateCoupon} className="flex flex-wrap gap-4 items-end mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Code</label>
                        <input
                            required
                            value={newCoupon.code}
                            onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                            placeholder="e.g. SUMMER20"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold uppercase"
                        />
                    </div>
                    <div className="w-[150px]">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Type</label>
                        <select
                            value={newCoupon.discount_type}
                            onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold"
                        >
                            <option value="percentage">Percentage %</option>
                            <option value="fixed">Fixed {settings?.currency}</option>
                        </select>
                    </div>
                    <div className="w-[150px]">
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Value</label>
                        <input
                            required
                            type="number"
                            min="1"
                            value={newCoupon.discount_value}
                            onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                            placeholder={newCoupon.discount_type === 'percentage' ? '20' : '500'}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold"
                        />
                    </div>
                    <button
                        type="submit"
                        className="h-[50px] px-6 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Coupon
                    </button>
                </form>

                {/* Coupons List */}
                <div className="space-y-3">
                    {coupons.length === 0 ? (
                        <div className="text-center p-8 text-slate-400 font-medium">No coupons created yet</div>
                    ) : (
                        coupons.map(coupon => (
                            <div key={coupon.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${coupon.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 opacity-60 border-slate-200'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 font-black px-4 py-2 rounded-lg tracking-widest uppercase">
                                        {coupon.code}
                                    </div>
                                    <div>
                                        <p className="font-extrabold text-slate-800">
                                            {coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : `${coupon.discount_value} ${settings?.currency} OFF`}
                                        </p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                            {coupon.is_active ? 'Active' : 'Disabled'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleToggleCoupon(coupon.id, coupon.is_active)}
                                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${coupon.is_active ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                                    >
                                        {coupon.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCoupon(coupon.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CouponsSection;
