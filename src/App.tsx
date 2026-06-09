/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PortfolioItem, SiteSettings } from './types';
import { INITIAL_ITEMS, INITIAL_SETTINGS } from './data/initialData';
import { 
  Sparkles, Lock, Unlock, ArrowDown, Compass, Heart, Github, ExternalLink, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Components
import PortfolioGrid from './components/PortfolioGrid';
import PortfolioDetailModal from './components/PortfolioDetailModal';
import AdminPanel from './components/AdminPanel';
import ContactSection from './components/ContactSection';
import AdminPasswordModal from './components/AdminPasswordModal';
import ConfirmModal from './components/ConfirmModal';

export default function App() {
  // Load State from LocalStorage with sensible initial fallbacks
  const [items, setItems] = useState<PortfolioItem[]>(() => {
    try {
      const saved = localStorage.getItem('sallys_items');
      return saved ? JSON.parse(saved) : INITIAL_ITEMS;
    } catch {
      return INITIAL_ITEMS;
    }
  });

  const [settings, setSettings] = useState<SiteSettings>(() => {
    try {
      const saved = localStorage.getItem('sallys_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        let updated = false;
        if (parsed.contactEmail === 'contact@sallyslaw-design.com') {
          parsed.contactEmail = 'sallyslaw0@daum.net';
          updated = true;
        }
        if (parsed.siteTitle === '샐리의법') {
          parsed.siteTitle = '샐리의 법칙';
          updated = true;
        }
        if (updated) {
          localStorage.setItem('sallys_settings', JSON.stringify(parsed));
        }
        return parsed;
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [mediaType, setMediaType] = useState<'all' | 'photo' | 'video'>('all');

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
    } else {
      setIsPasswordModalOpen(true);
    }
  };

  // Dynamically load premium Google font subsets on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;650;700;850&family=Noto+Sans+KR:wght@300;400;500;700;900&family=Song+Myung&family=JetBrains+Mono:wght@300;400;500;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Sync settings properties into top-level HTML page nodes for ultimate body styling
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-color', settings.bgColor);
    root.style.setProperty('--accent-color', settings.accentColor);
    
    const mappedFont = settings.fontFamily === 'sans'
      ? '"Inter", "Noto Sans KR", sans-serif'
      : settings.fontFamily === 'serif'
        ? '"Song Myung", serif'
        : '"JetBrains Mono", monospace';
    root.style.setProperty('--font-family', mappedFont);
    root.style.fontSize = `${settings.baseFontSize}px`;
  }, [settings]);

  // Reset to initial sample data
  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const executeResetData = () => {
    setItems(INITIAL_ITEMS);
    setSettings(INITIAL_SETTINGS);
    localStorage.setItem('sallys_items', JSON.stringify(INITIAL_ITEMS));
    localStorage.setItem('sallys_settings', JSON.stringify(INITIAL_SETTINGS));
    localStorage.removeItem('sallys_inquiries');
  };

  return (
    <div 
      className="min-h-screen text-[#1A1A1A] selection:bg-[var(--accent-color)] selection:text-gray-900 transition-all duration-300"
    >
      {/* Dynamic Inline CSS Injection for Accent Shadows and States */}
      <style>{`
        :root {
          --accent-hover: color-mix(in srgb, var(--accent-color) 85%, black);
          --accent-light: color-mix(in srgb, var(--accent-color) 15%, #FFFFFF);
        }
        .bg-accent-hover:hover { background-color: var(--accent-hover); }
        .text-accent { color: var(--accent-color); }
        .border-accent { border-color: var(--accent-color); }
        .bg-accent-light { background-color: var(--accent-light); }
        .focus-ring-accent:focus { --tw-ring-color: var(--accent-color); }
        .bg-gray-905 { background-color: #1A1A1A; }
        .bg-gray-850:hover { background-color: #2D2D2D; }
        .bg-gray-905:hover { background-color: #2D2D2D; }
      `}</style>

      {/* Floating Header */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100/80 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          
          {/* Logo Brand Title */}
          <div className="flex items-center gap-2">
            <span 
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-905 font-mono text-sm font-bold text-white uppercase shadow-sm"
              style={{ backgroundColor: settings.accentColor, color: '#1A1A1A' }}
            >
              S
            </span>
            <div>
              <h1 className="text-base font-black tracking-tight text-[#1A1A1A] font-custom-heading">
                {settings.siteTitle}
              </h1>
              <p className="text-[9px] text-[#666666] tracking-widest font-mono uppercase">Sally's Law studio</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-6 text-xs font-semibold text-gray-500 sm:flex">
            <a 
              href="#showcase" 
              onClick={() => setMediaType('photo')}
              className={`hover:text-gray-900 transition-colors ${mediaType === 'photo' ? 'text-amber-500 font-bold' : ''}`}
            >
              사진 포트폴리오
            </a>
            <a 
              href="#showcase" 
              onClick={() => setMediaType('video')}
              className={`hover:text-gray-900 transition-colors ${mediaType === 'video' ? 'text-amber-500 font-bold' : ''}`}
            >
              영상 포트폴리오
            </a>
            <a href="#contact" className="hover:text-gray-900 transition-colors">포트폴리오 문의</a>
          </nav>

          {/* Controls Panel (Admin toggle with gorgeous icon indicators) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleAdminToggle}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 select-none cursor-pointer ${
                isAdmin 
                  ? 'bg-amber-400 text-gray-900 shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {isAdmin ? (
                <>
                  <Unlock className="h-3 w-3 animate-pulse" />
                  <span>관리 도크 활성화</span>
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3" />
                  <span>관리자 로그인</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Intro Billboard */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6 relative z-10 text-center space-y-8">
          
          {/* Accent Label */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1 text-xs font-semibold tracking-wider text-gray-800 bg-accent-light"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-current" />
            <span>일이 기분 좋게 술술 풀리는 법칙 • 샐리의 법칙</span>
          </motion.div>

          {/* Display Slogan Heading */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="text-4xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-5xl lg:text-6xl font-custom-heading leading-tight"
            >
              <span className="relative inline-block">
                Sally's Law
                <span 
                  className="absolute bottom-1.5 left-0 -z-10 h-3 w-full opacity-60"
                  style={{ backgroundColor: settings.accentColor }} 
                />
              </span>의 공연기록
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-sm md:text-base leading-relaxed text-[#666666] max-w-2xl mx-auto whitespace-pre-line"
            >
              찰나의 공기, 피부로 스미는 진동, 그리고 온몸을 휘감는 현장의 열기까지,{"\n"}
              공연이 선사하는 날것 그대로의 전율은{"\n"}
              그 어떤 정밀한 렌즈와 스크린으로도 온전히 담아낼 수 없습니다.{"\n"}
              카메라는 순간을 붙잡을 뿐, 그 공간의 공기마저 가둘 수는 없기 때문입니다.{"\n"}
              그럼에도 불구하고, 이 작은 기록에 담긴 불씨가 당신에게 닿아{"\n"}
              그날의 뜨거웠던 감동을 다시금 피워내기를 소망합니다.
            </motion.p>
          </div>

          {/* Bottom Down Arrow */}
          <div className="pt-8 flex justify-center animate-bounce">
            <a href="#showcase" className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-150 text-gray-400 hover:text-gray-900 hover:border-gray-900 shadow-md transition-all">
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Ambient Subtle Gold blur in background */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-200/20 blur-3xl" />
      </section>

      {/* Admin Panel Section (Conditionally shown) */}
      <AnimatePresence>
        {isAdmin && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50/50 border-y border-amber-200/40 py-10"
          >
            <div className="mx-auto max-w-6xl px-6">
              <AdminPanel
                items={items}
                setItems={setItems}
                settings={settings}
                setSettings={setSettings}
                onResetData={handleResetData}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PORTFOLIO GRID SHOWCASE AREA */}
      <main id="showcase" className="py-16 scroll-mt-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 space-y-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#666666] uppercase flex items-center gap-1">
              <Compass className="h-3.5 w-3.5" /> SELECTED PORTFOLIO WORKS
            </span>
            <h2 className="text-2xl font-black tracking-tight text-[#1A1A1A] sm:text-3xl font-custom-heading">
              공연의 기록
            </h2>
            <p className="text-xs text-[#666666] max-w-xl whitespace-pre-line leading-relaxed">
              'Sally's Law'는 공연장에서 느끼는 순간들을 기록하여,{"\n"}
              이 기록이 누군가에게 감동으로 전달되길 바라는 마음까지 기록을 남기고 있습니다.{"\n"}
              클릭 시 사진 및 비디오를 보실 수 있습니다.
            </p>
          </div>

           <PortfolioGrid
            items={items}
            onItemClick={(item) => setSelectedItem(item)}
            mediaType={mediaType}
            setMediaType={setMediaType}
          />
        </div>
      </main>

      {/* Collaboration Contact Area */}
      <ContactSection settings={settings} />

      {/* Premium Footer */}
      <footer className="bg-gray-905 text-white/90 py-16">
        <div className="mx-auto max-w-6xl px-6 space-y-10">
          
          {/* Top row */}
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between border-b border-white/10 pb-10">
            <div className="space-y-3 max-w-xs">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold text-gray-950 font-mono bg-[var(--accent-color)]">
                  S
                </span>
                <span className="font-bold tracking-tight text-white font-custom-heading">{settings.siteTitle}</span>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">
                샐리의 법칙 소셜 크리에이티브 스튜디오는 가치와 기술, 감성이 합치하는 지점에서 가장 빛나는 성과를 도출해 내는 정밀 파트너입니다.
              </p>
            </div>

            {/* Sitemap/Index lines */}
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-2">
                <p className="font-bold text-white/40 uppercase tracking-widest text-[9px] font-mono">Directory</p>
                <ul className="space-y-1.5 text-white/70">
                  <li>
                    <a 
                      href="#showcase" 
                      onClick={() => setMediaType('photo')}
                      className="hover:text-white transition-colors"
                    >
                      사진 포트폴리오
                    </a>
                  </li>
                  <li>
                    <a 
                      href="#showcase" 
                      onClick={() => setMediaType('video')}
                      className="hover:text-white transition-colors"
                    >
                      영상 포트폴리오
                    </a>
                  </li>
                  <li><a href="#contact" className="hover:text-white transition-colors">비즈니스 협업 제안</a></li>
                  <li><button onClick={() => { if (!isAdmin) setIsPasswordModalOpen(true); }} className="hover:text-white transition-colors text-left">브랜드 대시보드</button></li>
                </ul>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-white/40 uppercase tracking-widest text-[9px] font-mono">Office channels</p>
                <ul className="space-y-1.5 text-white/70">
                  {settings.instagramUrl && (
                    <li><a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">Instagram <ExternalLink className="h-2.5 w-2.5" /></a></li>
                  )}
                  {settings.youtubeUrl && (
                    <li><a href={settings.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1">YouTube <ExternalLink className="h-2.5 w-2.5" /></a></li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-[11px] text-white/40">
            <p>© {new Date().getFullYear()} 샐리의 법칙 (Sally's Law) Creative Studio. All Rights Reserved.</p>
            <p className="flex items-center gap-1 font-mono">
              Crafted with <Heart className="h-3 w-3 text-red-500 fill-current" /> in Seoul, South Korea
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Detailed Visual Card Dialog Modal */}
      <AnimatePresence>
        {selectedItem && (
          <PortfolioDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>

      {/* Admin Login Verification Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <AdminPasswordModal
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordModalOpen(false)}
            onSuccess={() => setIsAdmin(true)}
          />
        )}
      </AnimatePresence>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <ConfirmModal
            isOpen={isResetConfirmOpen}
            onClose={() => setIsResetConfirmOpen(false)}
            onConfirm={executeResetData}
            title="데이터 초기화 경고"
            description="정말 사이트의 전체 데이터를 초기 샘플 상태로 복구하시겠습니까? 지금까지 업로드한 커스텀 등록 정보 및 이미지가 모두 삭제되며, 즉각 리셋 제어 테이블에 반영됩니다."
            confirmText="초기화 실행"
            cancelText="취소"
            isDanger={true}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
