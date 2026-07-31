import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search, Globe, ArrowLeft, Loader2, Award, Shield, Trophy } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

import { API_URL } from '../config.js';

const localT = {
  ar: {
    title: 'دليل الأكاديميات الرياضية',
    subtitle: 'اكتشف وسجل في أفضل أكاديميات كرة القدم القريبة منك',
    searchPlaceholder: 'ابحث باسم الأكاديمية...',
    countryFilter: 'تصفية حسب الدولة',
    cityFilter: 'تصفية حسب المدينة',
    allCountries: 'جميع الدول',
    allCities: 'جميع المدن',
    viewAcademy: 'عرض الأكاديمية',
    noAcademies: 'لم يتم العثور على أكاديميات مطابقة للبحث.',
    loading: 'جاري تحميل الأكاديميات...',
    country: 'الدولة',
    city: 'المدينة',
    backToHome: 'العودة للرئيسية',
    registerNow: 'سجل الآن'
  },
  fr: {
    title: 'Annuaire des Académies',
    subtitle: 'Découvrez et inscrivez-vous dans les meilleures académies de football près de chez vous',
    searchPlaceholder: "Rechercher par nom d'académie...",
    countryFilter: 'Filtrer par pays',
    cityFilter: 'Filtrer par ville',
    allCountries: 'Tous les pays',
    allCities: 'Toutes les villes',
    viewAcademy: "Voir l'académie",
    noAcademies: 'Aucune académie trouvée correspondant à vos critères.',
    loading: 'Chargement des académies...',
    country: 'Pays',
    city: 'Ville',
    backToHome: "Retour à l'accueil",
    registerNow: "S'inscrire"
  },
  en: {
    title: 'Academies Directory',
    subtitle: 'Discover and register in the best football academies near you',
    searchPlaceholder: 'Search by academy name...',
    countryFilter: 'Filter by Country',
    cityFilter: 'Filter by City',
    allCountries: 'All Countries',
    allCities: 'All Cities',
    viewAcademy: 'View Academy',
    noAcademies: 'No academies found matching your search.',
    loading: 'Loading academies...',
    country: 'Country',
    city: 'City',
    backToHome: 'Back to Home',
    registerNow: 'Register Now'
  }
};

export default function AcademyDirectory() {
  const navigate = useNavigate();
  const { lang, isRTL, dir } = useLanguage();
  const t = localT[lang] || localT.en;

  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // Extract unique countries and cities for filters
  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/academies`);
        if (res.ok) {
          const data = await res.json();
          setAcademies(data);
          
          // Get unique countries and cities
          const uniqueCountries = [...new Set(data.map(a => a.country).filter(Boolean))];
          const uniqueCities = [...new Set(data.map(a => a.city).filter(Boolean))];
          setCountries(uniqueCountries);
          setCities(uniqueCities);
        }
      } catch (err) {
        console.error('Failed to fetch academies:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter academies based on search input and selected filters
  const filteredAcademies = academies.filter(academy => {
    const matchesSearch = academy.name?.toLowerCase().includes(search.toLowerCase()) || 
                          academy.city?.toLowerCase().includes(search.toLowerCase());
    const matchesCountry = !selectedCountry || academy.country === selectedCountry;
    const matchesCity = !selectedCity || academy.city === selectedCity;
    return matchesSearch && matchesCountry && matchesCity;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans" dir={dir}>
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white font-bold transition-all text-sm"
          >
            <ArrowLeft size={16} className={isRTL ? 'rotate-180' : ''} />
            {t.backToHome}
          </button>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs">
                FA
              </div>
              <span className="font-black text-sm tracking-tight text-white">AcademyOS</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-20 bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '30px 30px'
        }} />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <span className="inline-block text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg mb-4 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {isRTL ? 'المنصة العامة' : 'Public Directory'}
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight tracking-tight">
            {t.title}
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto font-medium">
            {t.subtitle}
          </p>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">
        {/* Filters and Search */}
        <div className="bg-slate-950/40 border border-slate-800 rounded-3xl p-6 mb-10 backdrop-blur-sm shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-500 ${isRTL ? 'right-4' : 'left-4'}`} size={18} />
              <input 
                type="text" 
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all ${isRTL ? 'pr-11 pl-4' : 'pl-11 pr-4'}`}
              />
            </div>

            {/* Country Filter */}
            <select
              value={selectedCountry}
              onChange={e => { setSelectedCountry(e.target.value); setSelectedCity(''); }}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">{t.allCountries}</option>
              {countries.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* City Filter */}
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-3.5 px-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="">{t.allCities}</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Academies Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 size={36} className="text-indigo-500 animate-spin" />
            <p className="text-slate-400 text-sm font-bold">{t.loading}</p>
          </div>
        ) : filteredAcademies.length === 0 ? (
          <div className="text-center py-20 bg-slate-950/20 border border-slate-800 border-dashed rounded-3xl p-8 max-w-md mx-auto">
            <div className="text-4xl mb-4">⚽</div>
            <p className="text-slate-400 font-bold mb-2">{t.noAcademies}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAcademies.map(academy => {
              const primaryColor = academy.primary_color || '#4f46e5';
              return (
                <div 
                  key={academy.id}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-950/10 hover:border-slate-700 flex flex-col group"
                >
                  {/* Card Header (Branded height strip) */}
                  <div 
                    className="h-24 relative" 
                    style={{ background: `linear-gradient(135deg, ${primaryColor}, #1e1b4b)` }}
                  >
                    {/* Badge showing Plan tier (Enterprise / Pro / Free) */}
                    {academy.plan_id && (
                      <span className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                        {academy.plan_id}
                      </span>
                    )}
                  </div>

                  {/* Logo overlay */}
                  <div className="px-6 -mt-10 relative z-10 flex items-end">
                    {academy.logo_url ? (
                      <img 
                        src={academy.logo_url} 
                        alt={academy.name}
                        className="w-20 h-20 rounded-2xl object-cover bg-slate-900 border-4 border-slate-900 shadow-xl"
                      />
                    ) : (
                      <div 
                        className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black bg-slate-900 border-4 border-slate-900 shadow-xl text-white"
                      >
                        ⚽
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black text-white group-hover:text-indigo-400 transition-colors mb-2">
                      {academy.name}
                    </h3>
                    
                    {/* Location */}
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
                      <MapPin size={14} className="text-indigo-400 shrink-0" />
                      <span>{academy.city || '—'}, {academy.country || '—'}</span>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-900/60 flex items-center justify-between">
                      {/* Button to navigate to public subdomain landing page */}
                      <button
                        onClick={() => {
                          if (academy.subdomain) {
                            navigate(`/academy/${academy.subdomain}`);
                          }
                        }}
                        disabled={!academy.subdomain}
                        className="w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white hover:scale-105 active:scale-95 transition-all text-center"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, #312e81)` }}
                      >
                        {t.viewAcademy}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-slate-500 text-xs">
        <p>© {new Date().getFullYear()} AcademyOS. All rights reserved.</p>
      </footer>
    </div>
  );
}
