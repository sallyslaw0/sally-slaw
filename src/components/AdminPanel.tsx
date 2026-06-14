/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PortfolioItem, SiteSettings, HistoryItem, FontFamilyType } from '../types';
import ConfirmModal from './ConfirmModal';
import { 
  Settings, Save, Plus, Trash2, Edit3, Image, Video, Globe, 
  HelpCircle, Sparkles, Check, RefreshCw, Type, Layout, Code2,
  Upload, Star, Trash, Link as LinkIcon, Search, FolderOpen, X,
  ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { 
  savePortfolioItemToFirebase, 
  deletePortfolioItemFromFirebase, 
  saveSiteSettingsToFirebase, 
  isFirebaseConfigValid,
  saveHistoryToFirebase,
  deleteHistoryFromFirebase
} from '../lib/firebase';

interface AdminPanelProps {
  items: PortfolioItem[];
  setItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
  historyItems: HistoryItem[];
  setHistoryItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onResetData: () => void;
}

const COLOR_PRESETS = [
  { name: '골든 옐로우 (대표)', value: '#F3C623' },
  { name: '선플라워 옐로우', value: '#FFD200' },
  { name: '딥 머스터드', value: '#E6B31E' },
  { name: '앤티크 골드', value: '#D4AF37' },
  { name: '시트러스 레몬', value: '#FCD116' },
  { name: '애프리콧 웜', value: '#F4A261' },
];

const BG_PRESETS = [
  { name: '순수 화이트 (기본)', value: '#FFFFFF' },
  { name: '에센셜 그레이', value: '#F9F9F9' },
  { name: '웜 미니멀 백색', value: '#FAF6F0' },
  { name: '샌드 리넨 라이트', value: '#FAF5EA' }
];

// Helper to extract Youtube video ID
function getYoutubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper to detect if an image is one of the default Unsplash placeholder images
const isPlaceholderImage = (url: string): boolean => {
  if (!url) return false;
  return url.includes('images.unsplash.com/photo-151351') || 
         url.includes('images.unsplash.com/photo-154471') || 
         url.includes('images.unsplash.com/photo-158129') || 
         url.includes('images.unsplash.com/photo-152329');
};

// Client-side image compressor of uploaded files to keep Base64 within LocalStorage boundary (~50-120KB per entry max)
const resizeImage = (file: File, maxWidth = 1000, maxHeight = 1000): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('이미지 처리 실패'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsDataURL(file);
  });
};

export default function AdminPanel({ 
  items, 
  setItems, 
  historyItems, 
  setHistoryItems, 
  settings, 
  setSettings, 
  onResetData 
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'history' | 'theme' | 'seo' | 'sync'>('content');
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
  const [editingHistoryItem, setEditingHistoryItem] = useState<Partial<HistoryItem> | null>(null);
  const [formMediaType, setFormMediaType] = useState<'photo' | 'video'>('photo');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isImportLoading, setIsImportLoading] = useState(false);

  const generateInitialDataCode = (): string => {
    // Generate clean output formatting
    const formattedItems = JSON.stringify(items, null, 2);
    const formattedHistory = JSON.stringify(historyItems, null, 2);
    const formattedSettings = JSON.stringify(settings, null, 2);
    return `/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PortfolioItem, SiteSettings, HistoryItem } from '../types';

export const INITIAL_ITEMS: PortfolioItem[] = ${formattedItems};

export const INITIAL_SETTINGS: SiteSettings = ${formattedSettings};

export const INITIAL_HISTORY: HistoryItem[] = ${formattedHistory};
`;
  };

  const handleDownloadInitialData = () => {
    try {
      const code = generateInitialDataCode();
      const blob = new Blob([code], { type: 'text/typescript;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'initialData.ts';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerToast('initialData.ts 파일 다운로드가 완료되었습니다.');
    } catch (err) {
      console.error(err);
      triggerToast('파일 다운로드 실패: ' + String(err));
    }
  };

  const handleCopyInitialData = () => {
    try {
      const code = generateInitialDataCode();
      navigator.clipboard.writeText(code);
      triggerToast('동기화용 TypeScript 코드가 클립보드에 복사되었습니다!');
    } catch {
      triggerToast('클립보드 복사 실패. 텍스트를 선택하여 직접 복사해 주세요.');
    }
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        backupVersion: "1.0",
        backupDate: new Date().toISOString(),
        settings: settings,
        items: items,
        historyItems: historyItems
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const safeTitle = settings.siteTitle ? settings.siteTitle.replace(/[^a-zA-Z0-0ㄱ-ㅎㅏ-ㅣ가-힣_]/g, '_') : 'sallys_law';
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${safeTitle}_backup_${dateStr}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      triggerToast('백업용 JSON 파일 다운로드가 완료되었습니다. 안전한 곳에 보관해 주세요!');
    } catch (err) {
      console.error(err);
      triggerToast('백업 파일 내보내기 실패: ' + String(err));
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const confirmImport = window.confirm(
      "★ 데이터 복원 경고 ★\n\n백업 파일을 가져오면 현재 등록된 모든 포트폴리오(공연 기록), 공연 관람 및 이력, 그리고 사이트 디자인 설정이 백업 시점으로 완전히 덮어씌워지고 대체됩니다.\n\n이 변경은 최신 데이터베이스와 로컬 메모리에 즉각 반영됩니다.\n\n정말로 계속 진행하시겠습니까?"
    );
    if (!confirmImport) {
      event.target.value = '';
      return;
    }

    setIsImportLoading(true);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup || typeof backup !== 'object') {
        throw new Error('유효한 JSON 구조가 아닙니다.');
      }
      if (!backup.items || !Array.isArray(backup.items)) {
        throw new Error('백업 파일에 유효한 포트폴리오 아이템 목록(items)이 누락되었습니다.');
      }
      if (!backup.historyItems || !Array.isArray(backup.historyItems)) {
        throw new Error('백업 파일에 유효한 이력 항목 목록(historyItems)이 누락되었습니다.');
      }
      if (!backup.settings || typeof backup.settings !== 'object') {
        throw new Error('백업 파일에 유효한 사이트 설정(settings) 정보가 누락되었습니다.');
      }

      const importedItems: PortfolioItem[] = backup.items;
      const importedHistory: HistoryItem[] = backup.historyItems;
      const importedSettings: SiteSettings = backup.settings;

      const validConfig = isFirebaseConfigValid();

      if (validConfig) {
        // Overwrite Firebase portfolio items
        for (const item of items) {
          try { await deletePortfolioItemFromFirebase(item.id); } catch (e) { console.error("Item delete error", e); }
        }
        for (const item of importedItems) {
          await savePortfolioItemToFirebase(item);
        }

        // Overwrite Firebase history milestones
        for (const h of historyItems) {
          try { await deleteHistoryFromFirebase(h.id); } catch (e) { console.error("History delete error", e); }
        }
        for (const h of importedHistory) {
          await saveHistoryToFirebase(h);
        }

        // Overwrite settings on Firebase
        await saveSiteSettingsToFirebase(importedSettings);
      }

      // Synchronize in local dynamic React State
      setItems(importedItems);
      setHistoryItems(importedHistory);
      setSettings(importedSettings);

      // Save to localStorage fallback
      localStorage.setItem('sallys_items', JSON.stringify(importedItems));
      localStorage.setItem('sallys_history', JSON.stringify(importedHistory));
      localStorage.setItem('sallys_settings', JSON.stringify(importedSettings));

      triggerToast('🎉 백업 데이터 복원이 아주 성공적으로 완벽하게 완료되었습니다!');
    } catch (err: any) {
      console.error(err);
      triggerToast('백업 복원 실패: ' + (err?.message || String(err)));
    } finally {
      setIsImportLoading(false);
      event.target.value = '';
    }
  };

  // --- History Milestone Event Handlers ---
  const handleStartAddHistory = () => {
    setEditingHistoryItem({
      id: `history-${Date.now()}`,
      year: new Date().getFullYear().toString(),
      projectName: '',
      description: '',
      order: historyItems.length > 0 ? Math.max(...historyItems.map(i => i.order || 0)) + 1 : 0
    });
  };

  const handleStartEditHistory = (item: HistoryItem) => {
    setEditingHistoryItem({ ...item });
  };

  const handleCancelEditHistory = () => {
    setEditingHistoryItem(null);
  };

  const handleSaveHistoryItem = async () => {
    if (!editingHistoryItem || !editingHistoryItem.id || !editingHistoryItem.year || !editingHistoryItem.projectName) {
      triggerToast('연도와 프로젝트 명은 필수 필드입니다.');
      return;
    }

    const itemToSave: HistoryItem = {
      id: editingHistoryItem.id,
      year: editingHistoryItem.year.trim(),
      projectName: editingHistoryItem.projectName.trim(),
      description: (editingHistoryItem.description || '').trim(),
      order: typeof editingHistoryItem.order === 'number' ? editingHistoryItem.order : 0
    };

    try {
      const exists = historyItems.some(i => i.id === itemToSave.id);
      let updatedHistory: HistoryItem[] = [];
      if (exists) {
        updatedHistory = historyItems.map(i => i.id === itemToSave.id ? itemToSave : i);
      } else {
        updatedHistory = [...historyItems, itemToSave];
      }

      // Sort
      updatedHistory.sort((a, b) => {
        if (typeof a.order === 'number' && typeof b.order === 'number' && a.order !== b.order) {
          return a.order - b.order;
        }
        return b.year.localeCompare(a.year);
      });

      setHistoryItems(updatedHistory);
      localStorage.setItem('sallys_history', JSON.stringify(updatedHistory));

      if (isFirebaseConfigValid()) {
        await saveHistoryToFirebase(itemToSave);
        triggerToast('이력 데이터가 Firebase 리얼타임 데이터베이스에 즉각 반영되었습니다.');
      } else {
        triggerToast('로컬 브라우저 저장소에 이력이 안전하게 보관되었습니다.');
      }
      setEditingHistoryItem(null);
    } catch (err: any) {
      console.error('History save error:', err);
      triggerToast(`이력 저장 중 오류: ${err.message || String(err)}`);
    }
  };

  const handleDeleteHistoryItem = async (itemId: string) => {
    if (!window.confirm('선택하신 아카이브 이력을 완전히 영구 삭제하시겠습니까?')) return;

    try {
      const updatedHistory = historyItems.filter(i => i.id !== itemId);
      setHistoryItems(updatedHistory);
      localStorage.setItem('sallys_history', JSON.stringify(updatedHistory));

      if (isFirebaseConfigValid()) {
        await deleteHistoryFromFirebase(itemId);
        triggerToast('선택한 이력이 Firebase 클라우드에서 영구 삭제되었습니다.');
      } else {
        triggerToast('로컬 브라우저 저장소에서 정상 제거되었습니다.');
      }
    } catch (err: any) {
      console.error('History delete error:', err);
      triggerToast(`이력삭제오류: ${err.message || String(err)}`);
    }
  };

  const handleMoveHistory = async (index: number, direction: 'up' | 'down') => {
    const newItems = [...historyItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Force sequence ordering updates
    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setHistoryItems(reordered);
    localStorage.setItem('sallys_history', JSON.stringify(reordered));

    if (isFirebaseConfigValid()) {
      try {
        await Promise.all(reordered.map(item => saveHistoryToFirebase(item)));
        triggerToast('순서 수정 사항이 데이터베이스에 정상적으로 전파 및 적용되었습니다.');
      } catch (err: any) {
        console.error('Firebase order sweep failed:', err);
        triggerToast(`Firebase 저장 중 일부 오류: ${err.message}`);
      }
    } else {
      triggerToast('로컬 표시 순서 변경이 완료되었습니다.');
    }
  };
  
  
  // Custom confirmation modal state for deletion
  const [deleteConfirmState, setDeleteConfirmState] = useState<{ isOpen: boolean; id: string; title: string }>({
    isOpen: false,
    id: '',
    title: ''
  });
  
  // Image Upload and Library handlers
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [tagsInputValue, setTagsInputValue] = useState('');

  // Google Drive Integration States & Helpers
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveImportProgress, setDriveImportProgress] = useState<string | null>(null);
  const [driveSearch, setDriveSearch] = useState('');
  const [customClientId, setCustomClientId] = useState(() => {
    return localStorage.getItem('sallys_google_client_id') || '';
  });
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveNextPageToken, setDriveNextPageToken] = useState<string | null>(null);
  const [isFetchingMoreDrive, setIsFetchingMoreDrive] = useState(false);

  const activeClientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || customClientId;

  const extractUrl = (text: string): string | null => {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0].replace(/[.,;:()]+$/, '') : null;
  };

  // Listen to the OAuth message from our popup
  React.useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Securely check if the message came from our identical origin (safe for local, preview, production)
      if (origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data?.accessToken) {
        setGoogleToken(event.data.accessToken);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [activeClientId]);

  const fetchGoogleDriveFiles = async (token: string, append = false) => {
    if (append) {
      setIsFetchingMoreDrive(true);
    } else {
      setIsDriveLoading(true);
      setDriveError(null);
      setDriveNextPageToken(null);
    }
    try {
      // Query images. Include name match if search query is typed.
      let queryStr = "mimeType contains 'image/' and trashed = false";
      if (driveSearch.trim()) {
        const sanitizedSearch = driveSearch.trim().replace(/'/g, "\\'");
        queryStr += ` and name contains '${sanitizedSearch}'`;
      }
      
      const q = encodeURIComponent(queryStr);
      
      // Use the Google Drive content API subdomain (content.googleapis.com) which correctly supports CORS headers for JS clients
      let url = `https://content.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,thumbnailLink,webViewLink,size)&orderBy=modifiedTime desc&pageSize=30&supportsAllDrives=true&includeItemsFromAllDrives=true`;
      
      if (append && driveNextPageToken) {
        url += `&pageToken=${encodeURIComponent(driveNextPageToken)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        let errorDetails = '';
        try {
          const errData = await response.json();
          errorDetails = errData.error?.message || response.statusText;
        } catch (_) {
          errorDetails = response.statusText;
        }
        
        if (response.status === 401) {
          setGoogleToken(null);
          triggerToast('구글 로그인이 만료되었거나 연동 권한이 필요합니다. 다시 연결을 눌러 주세요.');
          return;
        }
        const fullErr = `[상태코드 ${response.status}] ${errorDetails}`;
        setDriveError(fullErr);
        throw new Error(fullErr);
      }
      
      const data = await response.json();
      const newFiles = data.files || [];
      
      if (append) {
        setDriveFiles(prev => {
          // Prevent duplicates just in case
          const existingIds = new Set(prev.map(f => f.id));
          const filteredNew = newFiles.filter((f: any) => !existingIds.has(f.id));
          return [...prev, ...filteredNew];
        });
      } else {
        setDriveFiles(newFiles);
      }
      setDriveNextPageToken(data.nextPageToken || null);
    } catch (err: any) {
      console.error('Google Drive fetch error:', err);
      const errMsg = err.message || String(err);
      setDriveError(errMsg);
      triggerToast(`구글 드라이브에서 사진 목록을 받아오는 데 실패했습니다: ${errMsg}`);
    } finally {
      setIsDriveLoading(false);
      setIsFetchingMoreDrive(false);
    }
  };

  // Automatically fetch / debounced search based on inputs
  React.useEffect(() => {
    if (!googleToken || !isDriveModalOpen) return;

    // Trigger immediately if empty or single character to keep it super lightweight
    if (!driveSearch.trim()) {
      fetchGoogleDriveFiles(googleToken, false);
      return;
    }

    // Debounce Google Drive API name search to reduce query loads
    const debounceTimer = setTimeout(() => {
      fetchGoogleDriveFiles(googleToken, false);
    }, 400);

    return () => clearTimeout(debounceTimer);
  }, [driveSearch, googleToken, isDriveModalOpen]);

  const handleOpenGoogleDrive = () => {
    setIsDriveModalOpen(true);
    setDriveError(null);
    setDriveSearch('');
    setDriveFiles([]);
    setDriveNextPageToken(null);
  };

  const handleGoogleLogin = () => {
    if (!activeClientId) {
      triggerToast('구글 OAuth 클라이언트 ID를 먼저 구성해야 합니다.');
      return;
    }
    const redirectUri = `${window.location.origin}/oauth-callback.html`;
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
      `client_id=${encodeURIComponent(activeClientId)}` + 
      `&redirect_uri=${encodeURIComponent(redirectUri)}` + 
      `&response_type=token` + 
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly')}` + 
      `&prompt=select_account`;
      
    const popup = window.open(oauthUrl, 'google_oauth_popup', 'width=550,height=650,left=150,top=100');
    if (!popup) {
      triggerToast('팝업 차단이 감지되었습니다. 브라우저 설정에서 팝업 허용 조치를 취해 주세요.');
    }
  };

  const handleGoogleLogout = () => {
    setGoogleToken(null);
    setDriveFiles([]);
    triggerToast('구글 연동 계정이 로그아웃 되었습니다.');
  };

  const handleSaveCustomClientId = (val: string) => {
    const trimmed = val.trim();
    setCustomClientId(trimmed);
    localStorage.setItem('sallys_google_client_id', trimmed);
    triggerToast('수동 설정한 구글 클라이언트 ID가 브라우저에 저장되었습니다.');
  };

  const handleSelectGoogleDriveFile = async (file: any) => {
    if (!googleToken) return;
    
    // Safety guard against Google Docs/Drawings or non-binary Google Apps files
    if (file.mimeType && (file.mimeType.startsWith('application/vnd.google-apps.') || file.mimeType.includes('shortcut'))) {
      triggerToast(`"${file.name}" 파일은 구글 문서/앱 개체 유형이므로 다운로드할 수 없습니다. 이미지 파일(JPG, PNG 등)만 선택해 주세요.`);
      return;
    }

    setDriveImportProgress('구글 드라이브에서 미디어를 로드하고 압축 처리 중...');
    
    try {
      // Use the content.googleapis.com endpoint to get the file media with CORS support
      const response = await fetch(`https://content.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
        headers: {
          Authorization: `Bearer ${googleToken}`
        }
      });
      
      let blob: Blob;
      if (response.ok) {
        blob = await response.blob();
      } else {
        let errorDetails = '';
        try {
          const errData = await response.json();
          errorDetails = errData.error?.message || response.statusText;
        } catch (_) {
          errorDetails = response.statusText;
        }
        throw new Error(`미디어 파일 내려받기 실패 (${response.status}): ${errorDetails}`);
      }
      
      const fileObject = new File([blob], file.name || "drive_image.jpg", { type: blob.type || "image/jpeg" });
      const optimizedBase64 = await resizeImage(fileObject, 850, 850);
      
      let currentImageUrls = editingItem?.imageUrls || (editingItem?.imageUrl ? [editingItem.imageUrl] : []);
      currentImageUrls = currentImageUrls.filter(url => !isPlaceholderImage(url));
      
      const updatedUrls = [optimizedBase64];
      const updatedCover = optimizedBase64;
      
      setEditingItem(prev => prev ? {
        ...prev,
        imageUrl: updatedCover,
        imageUrls: updatedUrls
      } : null);
      
      triggerToast(`구글 드라이브의 "${file.name}" 사진을 다운로드하여 단일 대표 이미지로 설정했습니다.`);
      setIsDriveModalOpen(false);
    } catch (err: any) {
      console.error('File import error:', err);
      triggerToast(`구글 드라이브 사진 가져오기 실패: ${err.message || 'CORS 제한 및 네트워크 토큰 오류'}`);
    } finally {
      setDriveImportProgress(null);
    }
  };


  // Keep local tags input value in sync when the editing item changes
  React.useEffect(() => {
    if (editingItem) {
      const existingTags = editingItem.tags || [];
      setTagsInputValue(existingTags.join(', '));
    } else {
      setTagsInputValue('');
    }
  }, [editingItem?.id]);

  // Helper to trigger stylish toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    const files = Array.from(e.target.files) as File[];
    
    try {
      // 850x850 해상도로 압축하여 용량을 대폭 줄여 LocalStorage 쿼타 초과를 원천 예방
      const uploadPromises = files.map(file => resizeImage(file, 850, 850));
      const base64Images = await Promise.all(uploadPromises);
      
      const updatedCover = base64Images[0] || '';
      const updatedUrls = updatedCover ? [updatedCover] : [];
      
      setEditingItem(prev => prev ? {
        ...prev,
        imageUrl: updatedCover,
        imageUrls: updatedUrls
      } : null);
      
      triggerToast(`단일 대표 이미지가 압축되어 정상 업로드되었습니다.`);
    } catch (error) {
      console.error(error);
      triggerToast('이미지 처리 중 또는 압축 과정에서 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddUrlImage = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!urlInput.trim()) return;
    
    const targetUrl = urlInput.trim();
    const updatedUrls = [targetUrl];
    const updatedCover = targetUrl;
    
    setEditingItem(prev => prev ? {
      ...prev,
      imageUrl: updatedCover,
      imageUrls: updatedUrls
    } : null);
    
    setUrlInput('');
    triggerToast('새 웹 이미지가 등록되어 대표 이미지로 지정되었습니다.');
  };

  const handleDeleteImage = () => {
    setEditingItem(prev => prev ? {
      ...prev,
      imageUrl: '',
      imageUrls: []
    } : null);
    
    triggerToast('등록된 이미지가 해제되었습니다.');
  };

  // 1. Content CRUD Handlers
  const handleStartAddWithMode = (mode: 'photo' | 'video') => {
    setFormMediaType(mode);
    const initialImg = mode === 'photo' ? 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop' : '';
    setEditingItem({
      id: `item-${Date.now()}`,
      title: '',
      category: mode === 'photo' ? 'Artist(아티스트)' : 'Video(영상)',
      summary: '',
      description: '',
      imageUrl: initialImg,
      imageUrls: initialImg ? [initialImg] : [],
      youtubeUrl: '',
      client: '신규 아티스트',
      year: new Date().getFullYear().toString(),
      tags: mode === 'photo' ? ['Design', 'Branding'] : ['Video', 'Motion']
    });
  };

  const handleStartEdit = (item: PortfolioItem) => {
    setFormMediaType(item.youtubeUrl ? 'video' : 'photo');
    setEditingItem({ 
      ...item,
      imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : [])
    });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.id) return;

    let finalImageUrl = editingItem.imageUrl || '';
    let finalYoutubeUrl = editingItem.youtubeUrl || '';

    // If the user pasted a direct URL but forgot to submit, use it
    if (urlInput.trim()) {
      finalImageUrl = urlInput.trim();
    }

    if (formMediaType === 'photo') {
      finalYoutubeUrl = ''; // Clear video URL explicitly
      if (!finalImageUrl || isPlaceholderImage(finalImageUrl)) {
        finalImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200';
      }
    } else {
      // video mode
      const videoId = getYoutubeVideoId(finalYoutubeUrl);
      if (videoId) {
        finalImageUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (!finalImageUrl || isPlaceholderImage(finalImageUrl)) {
        finalImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200';
      }
    }

    const finalImageUrls = finalImageUrl ? [finalImageUrl] : [];

    const validated: PortfolioItem = {
      id: editingItem.id,
      title: editingItem.title || '무제 프로젝트',
      category: editingItem.category || 'etc(기타)',
      summary: editingItem.summary || '',
      description: editingItem.description || '',
      imageUrl: finalImageUrl,
      imageUrls: finalImageUrls,
      youtubeUrl: finalYoutubeUrl,
      client: editingItem.client || '자체 프로젝트',
      year: editingItem.year || '2026',
      tags: Array.isArray(editingItem.tags) ? editingItem.tags : []
    };

    const exists = items.some(item => item.id === validated.id);
    let updatedItems: PortfolioItem[];
    if (exists) {
      updatedItems = items.map(item => item.id === validated.id ? { ...validated, order: item.order } : item);
    } else {
      updatedItems = [validated, ...items];
    }

    // Re-assign explicit order based on their actual array position
    const orderedItems = updatedItems.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(orderedItems);
    
    // Firebase 영구 업로드 및 동기화 (전환 순서 일괄 갱신 필수)
    syncOrderToFirebase(orderedItems)
      .then(() => {
        triggerToast(exists ? '포트폴리오 정보가 파이어베이스에 업데이트 되었습니다.' : '새로운 포트폴리오 프로젝트가 파이어베이스에 정상 등록되었습니다.');
      })
      .catch((err) => {
        triggerToast('파이어베이스 저장 실패: ' + String(err));
      });
    
    try {
      localStorage.setItem('sallys_items', JSON.stringify(orderedItems));
    } catch (error) {
      console.error('LocalStorage 저장 한도 초과 오류:', error);
    }
    
    setUrlInput(''); // Clean text field state securely
    setEditingItem(null);
  };

   const handleDeleteItem = (id: string, title: string) => {
    setDeleteConfirmState({
      isOpen: true,
      id,
      title
    });
  };

  const executeDeleteItem = () => {
    const { id, title } = deleteConfirmState;
    const updated = items.filter(item => item.id !== id);
    setItems(updated);
    
    // Firebase에서 영구 삭제
    deletePortfolioItemFromFirebase(id)
      .then(() => {
        triggerToast(`"${title}" 프로젝트가 파이어베이스에서 영구적으로 삭제되었습니다.`);
      })
      .catch((err) => {
        triggerToast('파이어베이스 삭제 실패: ' + String(err));
      });

    localStorage.setItem('sallys_items', JSON.stringify(updated));
    if (editingItem?.id === id) {
      setEditingItem(null);
    }
    setDeleteConfirmState({ isOpen: false, id: '', title: '' });
  };

  // Firebase에 전체 아이템의 포트폴리오 순서를 동기화하기 위한 헬퍼
  const syncOrderToFirebase = async (updatedList: PortfolioItem[]): Promise<void> => {
    try {
      // 인덱스를 기준으로 각 아이템의 order 필드를 업데이트하여 순차 저장
      const listWithNewOrders = updatedList.map((item, idx) => ({
        ...item,
        order: idx
      }));
      for (const item of listWithNewOrders) {
        await savePortfolioItemToFirebase(item);
      }
    } catch (err) {
      console.error("순서 파이어베이스 동기화 실패:", err);
      throw err;
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;

    // 재정렬된 인덱스를 order로 보정하여 상태 갱신
    const orderedList = updated.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(orderedList);
    localStorage.setItem('sallys_items', JSON.stringify(orderedList));
    syncOrderToFirebase(orderedList);
    triggerToast('게시 순서가 상승하여 파이어베이스에 동기화되었습니다.');
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;

    // 재정렬된 인덱스를 order로 보정하여 상태 갱신
    const orderedList = updated.map((item, idx) => ({
      ...item,
      order: idx
    }));

    setItems(orderedList);
    localStorage.setItem('sallys_items', JSON.stringify(orderedList));
    syncOrderToFirebase(orderedList);
    triggerToast('게시 순서가 하락하여 파이어베이스에 동기화되었습니다.');
  };

  // 2. Settings Handlers
  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('sallys_settings', JSON.stringify(updated));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('sallys_settings', JSON.stringify(settings));
    saveSiteSettingsToFirebase(settings)
      .then(() => {
        triggerToast('디자인 테마 및 소셜 설정이 파이어베이스 서버에 반영·저장되었습니다.');
      })
      .catch((err) => {
        triggerToast('파이어베이스 설정 업로드 실패: ' + String(err));
      });
  };

  return (
    <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-6 shadow-xl backdrop-blur-md">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-color)] text-gray-900 shadow-sm">
            <Settings className="h-5 w-5 animate-[spin_8s_linear_infinite]" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#1A1A1A] flex items-center gap-1.5 font-sans">
              콘텐츠 관리자 대시보드 <Sparkles className="h-4 w-4 text-amber-500 fill-current" />
            </h2>
            <p className="text-xs text-gray-500">
              코딩 없이 누구나 연출하는 샐리의 법칙(Sally's Law) 디자인 맞춤 컨트롤러
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onResetData}
            title="초기 데이터 복원"
            className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 shadow-xs hover:bg-gray-50 hover:text-red-500 transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> 샘플 복원
          </button>
          <button
            onClick={handleSaveSettings}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--accent-color)] dark:text-gray-900 px-4 py-1.5 text-xs font-bold shadow-md hover:filter hover:brightness-105 transition-all"
          >
            <Save className="h-3.5 w-3.5" /> 설정 전면 저장
          </button>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="mt-5 flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'content'
              ? 'border-[var(--accent-color)] text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layout className="h-4 w-4" /> 포트폴리오 관리
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'border-[var(--accent-color)] text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4" /> 연혁 & 이력 관리
        </button>
        <button
          onClick={() => setActiveTab('theme')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'theme'
              ? 'border-[var(--accent-color)] text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Type className="h-4 w-4" /> 실시간 디자인 커스터마이저
        </button>
        <button
          onClick={() => setActiveTab('seo')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'seo'
              ? 'border-[var(--accent-color)] text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Globe className="h-4 w-4" /> SEO 및 소셜 미리보기
        </button>
        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === 'sync'
              ? 'border-[var(--accent-color)] text-amber-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <RefreshCw className="h-4 w-4" /> 깃허브 배포 동기화
        </button>
      </div>

      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-2xl animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Firebase Database Connection Banner */}
      {!isFirebaseConfigValid() && (
        <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/50 p-4 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white font-extrabold text-xs">!</div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-800">
                🚨 로컬 브라우저 저장 모드 가동 중 (스마트폰 연동 안내)
              </h4>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                현재 <strong>파이어베이스(Firebase) 데이터베이스 환경 변수</strong>가 이 브라우저 웹사이트 빌드에 내장되어 있지 않습니다.
                이 상태에서 추가/수정한 포트폴리오는 <strong>현재 등록 작업을 수행한 해당 PC 기기의 브라우저(localStorage)에만 안전하게 보관</strong>됩니다.
              </p>
              <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                👉 그렇기 때문에 스마트폰이나 다른 컴퓨터로 접속했을 때는 업로드된 포트폴리오가 보이지 않습니다!
              </p>
              <div className="text-[10px] text-gray-500 mt-2 bg-white/70 rounded-lg p-3 border border-rose-100 space-y-1.5 leading-relaxed">
                <span className="font-bold text-gray-800 block">💡 다른 기기(스마트폰 등)와 실시간 연동을 활성화하는 두 가지 방법:</span>
                <div>
                  <span className="font-bold text-rose-700">방법 A. [비용 0원] 정적 수동 동기화 (가장 빠르고 강력 추천):</span><br />
                  상단 <strong>[깃허브 배포 동기화]</strong> 탭으로 이동하셔서 <strong>[initialData.ts 파일 즉시 다운로드]</strong> 단추를 클릭해 다운로드받은 파일로 프로젝트 내 <code>src/data/initialData.ts</code> 파일을 교체하고 깃허브에 푸시(Push)하세요! 사이트가 다시 배포되며 스마트폰을 포함한 모든 사람들에게 완벽하게 보입니다.
                </div>
                <div className="pt-1 border-t border-dashed border-gray-200">
                  <span className="font-bold text-rose-700">방법 B. 실시간 파이어베이스 연동:</span><br />
                  깃허브 리포지토리의 <strong>Settings - Secrets and variables - Actions</strong>에 아래 환경 변수(Secrets)들을 등록하고 다시 커밋/빌드하시면 스마트폰과도 실시간으로 포트폴리오 데이터가 무결하게 상호 공유됩니다:
                  <code className="block mt-1 p-1 bg-gray-100 text-[10px] text-gray-850 rounded font-normal font-mono break-all leading-normal">
                    VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dynamic View */}
      <div className="mt-6">
        
        {/* TAB 1: PORTFOLIO CRUD */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">
                현재 등록된 프로젝트 ({items.length}개)
              </h3>
              {!editingItem && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartAddWithMode('photo')}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 text-gray-950 px-3 py-1.5 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> 새 사진 포트폴리오 추가
                  </button>
                  <button
                    onClick={() => handleStartAddWithMode('video')}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-gray-800 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> 새 영상 포트폴리오 추가
                  </button>
                </div>
              )}
            </div>

            {/* EDIT/ADD Form overlay or inline drawer */}
            {editingItem && (
              <form onSubmit={handleSaveItem} className="rounded-xl border border-amber-300 bg-amber-50/20 p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h4 className="text-sm font-bold text-amber-800 flex items-center gap-1.5">
                    <Edit3 className="h-4 w-4" /> 
                    {editingItem.id && items.some(i => i.id === editingItem.id) 
                      ? `${formMediaType === 'photo' ? '사진' : '영상'} 프로젝트 수정하기` 
                      : `새 ${formMediaType === 'photo' ? '사진' : '영상'} 포트폴리오 등록하기`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="text-xs text-gray-400 hover:text-gray-500"
                  >
                    취소
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Left Group */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
                      <select
                        value={editingItem.category || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                      >
                        <option value="Artist(아티스트)">Artist(아티스트)</option>
                        <option value="Stage(무대)">Stage(무대)</option>
                        <option value="Concert hall landscape(공연장)">Concert hall landscape(공연장)</option>
                        <option value="Audience(관람객)">Audience(관람객)</option>
                        <option value="etc(기타)">etc(기타)</option>
                        <option value="Video(영상)">Video(영상)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">프로젝트 명칭</label>
                      <input
                        type="text"
                        required
                        placeholder="예: 샐리의 법칙 스튜디오 브랜드 수립"
                        value={editingItem.title || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">한 줄 설명 (요약)</label>
                      <input
                        type="text"
                        required
                        placeholder="리스트 및 카드 하단에 노출되는 매력적인 소개 문구"
                        value={editingItem.summary || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">아티스트 명</label>
                        <input
                          type="text"
                          placeholder="예: 루미너리 서울"
                          value={editingItem.client || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, client: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">작업 연도</label>
                        <input
                          type="text"
                          placeholder="2026"
                          value={editingItem.year || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, year: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Group */}
                  <div className="space-y-3">
                    <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                      <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 block">지정 프로필 타입</span>
                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5 mt-0.5">
                        {formMediaType === 'photo' ? (
                          <>
                            <Image className="h-3.5 w-3.5 text-amber-500" />
                            <span>사진 단독 포트폴리오</span>
                          </>
                        ) : (
                          <>
                            <Video className="h-3.5 w-3.5 text-amber-500" />
                            <span>유튜브 연동 영상 포트폴리오</span>
                          </>
                        )}
                      </p>
                    </div>

                    {formMediaType === 'video' && (
                      <div className="space-y-1 animate-fadeIn">
                        <label className="block text-xs font-semibold text-gray-600 flex items-center gap-1">
                          <Video className="h-3.5 w-3.5 text-gray-400" /> 관련 유튜브 영상 URL
                        </label>
                        <input
                          type="url"
                          required
                          placeholder="https://www.youtube.com/watch?v=..."
                          value={editingItem.youtubeUrl || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, youtubeUrl: e.target.value })}
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden text-gray-650 font-medium"
                        />
                        <span className="text-[10px] text-gray-400 block mt-0.5">유튜브 주소를 입력하면 비디오 썸네일 커버 이미지가 자동 생성됩니다.</span>
                      </div>
                    )}

                    {/* Single Image Upload & Manager */}
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                          <Image className="h-3.5 w-3.5 text-amber-500" /> 등록된 포트폴리오 이미지 (단일)
                        </label>
                      </div>

                      {/* Image Preview with delete control */}
                      {editingItem.imageUrl ? (
                        <div className="relative rounded-lg border border-gray-150 overflow-hidden bg-white max-w-sm mx-auto shadow-xs">
                          <div className="aspect-video bg-gray-50 overflow-hidden flex items-center justify-center">
                            <img
                              src={editingItem.imageUrl}
                              alt="포트폴리오 단일 이미지"
                              className="max-h-full max-w-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="bg-gray-50 border-t border-gray-150 p-2 flex justify-between items-center text-xs">
                            <span className="text-[10px] text-gray-500 truncate max-w-[200px] font-mono">
                              {editingItem.imageUrl.startsWith('data:') ? '업로드된 파일 이미지' : editingItem.imageUrl}
                            </span>
                            <button
                              type="button"
                              onClick={handleDeleteImage}
                              className="text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded border border-red-200 cursor-pointer transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4 border border-dashed border-gray-250 rounded-lg text-[11px] text-gray-500 bg-white">
                          등록된 이미지가 없습니다. 아래 옵션을 연동하여 이미지를 등록해 주세요.
                        </div>
                      )}

                      {/* Add Image Actions */}
                      <div className="space-y-2 pt-2 border-t border-gray-200/60">
                        {/* 1. File upload from computer */}
                        <div>
                          <label className="relative flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-3 py-1.5 text-center text-xs font-semibold text-gray-600 transition-colors hover:border-amber-400 hover:text-amber-500">
                            {isUploading ? (
                              <span className="flex items-center gap-1.5 animate-pulse text-amber-500">
                                <RefreshCw className="h-3 w-3 animate-spin" /> 이미지를 압축하여 올리는 중...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-gray-700">
                                <Upload className="h-3.5 w-3.5 text-amber-500" /> 
                                <span>내 컴퓨터에서 사진 불러오기 (단일 파일)</span>
                              </span>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploading}
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* 구글 드라이브에서 에셋 가져오기 */}
                        <div>
                          <button
                            type="button"
                            onClick={handleOpenGoogleDrive}
                            className="relative flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-sky-200 bg-sky-50/10 px-3 py-1.5 text-center text-[11px] font-semibold text-sky-700 hover:bg-sky-50 hover:text-sky-850 transition-colors cursor-pointer"
                          >
                            <svg className="h-4 w-4 mr-1.5 shrink-0" viewBox="0 0 48 48">
                              <path fill="#00E676" d="M16 35H4l10-18h12z"/>
                              <path fill="#2979FF" d="M34 35H16l6-11 8-7z"/>
                              <path fill="#FFD600" d="M34 17L24 35l-6-11 12-11z"/>
                            </svg>
                            <span>구글 드라이브 (Google Drive) 사진 가져오기</span>
                          </button>
                        </div>

                        {/* 2. Web URL input */}
                        <div className="flex gap-1.5">
                          <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-2.5 flex items-center text-gray-400">
                              <LinkIcon className="h-3 w-3" />
                            </span>
                            <input
                              type="url"
                              placeholder="웹 이미지의 주소(URL)를 직접 입력"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              className="w-full rounded-md border border-gray-200 bg-white pl-7 pr-2 py-1 text-[11px] focus:border-amber-400 focus:outline-hidden"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddUrlImage}
                            className="rounded-md bg-gray-900 text-white px-3 py-1 text-[11px] font-semibold hover:bg-amber-400 hover:text-gray-900 transition-colors cursor-pointer"
                          >
                            설정
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">관련 검색 태그 (쉼표 `,` 로 구분)</label>
                      <input
                        type="text"
                        placeholder="예: 아티스트, 보컬, 힙합, 콘서트"
                        value={tagsInputValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTagsInputValue(val);
                          const parsed = val.split(/[,\n\/;]|\s+-\s+/).map(t => t.trim()).filter(Boolean);
                          setEditingItem(prev => prev ? { ...prev, tags: parsed } : null);
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden text-gray-700 font-medium"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">쉼표(,)나 세미콜론(;) 등으로 구분하여 여러 개의 검색 태그를 한 번에 입력할 수 있습니다. (예: 아티스트, 무대, 조명)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">전체 상세 소개글 (줄바꿈 가능)</label>
                  <textarea
                    rows={4}
                    placeholder="프로젝트 상세 설명 브리프를 자유롭게 적어주세요. 단락을 띄우려면 엔터를 한 번 더 입력해 빈 줄을 만드세요."
                    value={editingItem.description || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-amber-200/50 pt-3">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-gray-900 text-white px-5 py-2 text-xs font-bold hover:bg-gray-800"
                  >
                    프로젝트 데이터 업로드
                  </button>
                </div>
              </form>
            )}

            {/* List Table of Items */}
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full min-w-[600px] border-collapse text-left text-xs text-gray-500">
                <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-center w-28">게시 순서</th>
                    <th className="px-4 py-3">커버</th>
                    <th className="px-4 py-3">기본 정보</th>
                    <th className="px-4 py-3">분류</th>
                    <th className="px-4 py-3">아티스트/연도</th>
                    <th className="px-4 py-3 text-right">관리 제어</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5 select-none">
                          <button
                            type="button"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-150 bg-white hover:border-amber-400 hover:text-amber-500 disabled:opacity-30 disabled:hover:shadow-none disabled:hover:border-gray-150 disabled:hover:text-current shadow-xs transition-all cursor-pointer"
                            title="위로 이동"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <span className="font-mono text-xs font-bold text-gray-700 min-w-5 text-center">
                            {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === items.length - 1}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-gray-150 bg-white hover:border-amber-400 hover:text-amber-500 disabled:opacity-30 disabled:hover:shadow-none disabled:hover:border-gray-150 disabled:hover:text-current shadow-xs transition-all cursor-pointer"
                            title="아래로 이동"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <img 
                          src={item.imageUrl} 
                          alt="" 
                          className="h-10 w-16 rounded-md object-cover ring-1 ring-gray-100"
                          referrerPolicy="no-referrer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-[#1A1A1A] line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{item.summary}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700 font-sans border border-amber-100">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px]">
                        <div>{item.client}</div>
                        <div className="text-gray-400 mt-0.5">{item.year}</div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-100 bg-white hover:border-amber-400 hover:text-amber-500 shadow-xs"
                          title="상세 수정"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-100 bg-white hover:border-red-400 hover:text-red-500 shadow-xs"
                          title="삭제 제거"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                        표시할 포트폴리오 에셋이 비어 있습니다. 상단의 새 프로젝트 등록을 활용해 채워 넣어 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1.5: HISTORY LIST CRUD */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">
                연혁 및 이력 관리 ({historyItems.length}개)
              </h3>
              {!editingHistoryItem && (
                <button
                  onClick={handleStartAddHistory}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-500 text-gray-950 px-3 py-1.5 text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> 새 이력 작성 추가
                </button>
              )}
            </div>

            {/* EDIT/ADD Form for History */}
            {editingHistoryItem && (
              <div className="rounded-xl border border-amber-200/40 bg-amber-50/20 p-5 space-y-4 font-sans animate-fade-in">
                <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> 이력 항목 편집 / 새로 만들기
                  </span>
                  <button 
                    onClick={handleCancelEditHistory}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 연도 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-600 font-sans">연도 (Year) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="예: 2026"
                      value={editingHistoryItem.year || ''}
                      onChange={(e) => setEditingHistoryItem({ ...editingHistoryItem, year: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                    />
                  </div>

                  {/* 프로젝트 명 */}
                  <div className="space-y-1 md:col-span-2">
                    <label className="block text-xs font-bold text-gray-600 font-sans">프로젝트 명 (Project Name) <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      placeholder="예: 루미너리 서울 신년 제품 어워드 디자인"
                      value={editingHistoryItem.projectName || ''}
                      onChange={(e) => setEditingHistoryItem({ ...editingHistoryItem, projectName: e.target.value })}
                      className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none"
                    />
                  </div>
                </div>

                {/* 내용 */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-600 font-sans">내용 (Content / Description)</label>
                  <textarea 
                    placeholder="프로젝트 세부 사항을 요약 기재하세요."
                    rows={4}
                    value={editingHistoryItem.description || ''}
                    onChange={(e) => setEditingHistoryItem({ ...editingHistoryItem, description: e.target.value })}
                    className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-amber-100">
                  <button 
                    onClick={handleCancelEditHistory}
                    className="rounded-md border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors"
                  >
                    취소
                  </button>
                  <button 
                    onClick={handleSaveHistoryItem}
                    className="rounded-md bg-amber-500 hover:bg-amber-450 px-4 py-1.5 text-xs font-bold text-gray-950 hover:filter hover:brightness-105 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" /> 저장 반영하기
                  </button>
                </div>
              </div>
            )}

            {/* List Table for History Items */}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 font-bold border-b border-gray-100">
                    <th className="px-4 py-3 w-16 text-center">순서</th>
                    <th className="px-4 py-3 w-24">연도</th>
                    <th className="px-4 py-3 w-[55%]">프로젝트 명</th>
                    <th className="px-4 py-3 w-[25%]">세부 내용</th>
                    <th className="px-4 py-3 w-32 text-right">이동 / 편집</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60 text-gray-700">
                  {historyItems
                    .sort((a, b) => {
                      if (typeof a.order === 'number' && typeof b.order === 'number' && a.order !== b.order) {
                        return a.order - b.order;
                      }
                      return b.year.localeCompare(a.year);
                    })
                    .map((item, idx) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Drag order index ranking */}
                        <td className="px-4 py-3 font-mono text-center text-gray-400">
                          {idx + 1}
                        </td>
                        
                        {/* 연도 */}
                        <td className="px-4 py-3 font-mono font-bold text-amber-600">
                          {item.year}
                        </td>
                        
                        {/* 프로젝트명 */}
                        <td className="px-4 py-3 font-bold text-gray-900 leading-snug">
                          {item.projectName}
                        </td>

                        {/* 내용 */}
                        <td className="px-4 py-3 text-gray-500 leading-relaxed font-sans cell-wrap">
                          {item.description}
                        </td>

                        {/* 작업 동작 */}
                        <td className="px-4 py-3 text-right space-x-1">
                          {/* Move up */}
                          <button
                            onClick={() => handleMoveHistory(idx, 'up')}
                            disabled={idx === 0}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-150 bg-white disabled:opacity-30 disabled:pointer-events-none hover:border-gray-300"
                            title="위로 이동"
                          >
                            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          
                          {/* Move down */}
                          <button
                            onClick={() => handleMoveHistory(idx, 'down')}
                            disabled={idx === historyItems.length - 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-150 bg-white disabled:opacity-30 disabled:pointer-events-none hover:border-gray-300"
                            title="아래로 이동"
                          >
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          </button>
                          
                          {/* Edit */}
                          <button
                            onClick={() => handleStartEditHistory(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-150 bg-white hover:border-amber-400 hover:text-amber-500"
                            title="수정"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-gray-150 bg-white hover:border-red-400 hover:text-red-550"
                            title="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {historyItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-400 font-mono">
                        등록된 이력이 없습니다. 우측 상단의 추가 버튼으로 등록해 주세요.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE STYLE CUSTOMIZER */}
        {activeTab === 'theme' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* Visual Variables Box */}
            <div className="space-y-5 rounded-xl border border-gray-100 bg-gray-50/50 p-5">
              <h4 className="text-xs font-bold font-mono tracking-widest text-[#1a1a1a] uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Code2 className="h-4 w-4" /> 실시간 컴포넌트 프리셋 디자인
              </h4>

              {/* Core Accent Select */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-gray-700">포인트 노란색 테마</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateSetting('accentColor', p.value)}
                      className={`flex flex-col items-center gap-2 rounded-lg border p-2 text-center transition-all ${
                        settings.accentColor === p.value 
                          ? 'border-gray-900 bg-white font-bold ring-1 ring-gray-900' 
                          : 'border-gray-200 bg-white hover:border-amber-400'
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full shadow-inner" style={{ backgroundColor: p.value }} />
                      <span className="text-[10px] truncate w-full text-center text-gray-500">{p.name}</span>
                    </button>
                  ))}
                </div>
                
                {/* Custom Color Pip */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-xs text-gray-500">커스텀 색상 피커:</span>
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="h-7 w-12 cursor-pointer rounded-md border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-0.5 text-xs font-mono w-24 text-center focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Background Color Select */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">배경 영역톤</label>
                <div className="grid grid-cols-2 gap-2">
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => updateSetting('bgColor', p.value)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-all text-xs ${
                        settings.bgColor === p.value
                          ? 'border-gray-900 bg-white font-bold ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="h-4 w-4 rounded-md border border-gray-100 shadow-xs shrink-0" style={{ backgroundColor: p.value }} />
                      <span className="truncate text-gray-700">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">대표 폰트 스타일</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['sans', 'serif', 'mono'] as FontFamilyType[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => updateSetting('fontFamily', f)}
                      className={`rounded-lg border py-2.5 text-xs transition-all ${
                        settings.fontFamily === f
                          ? 'border-gray-900 bg-white font-bold ring-1 ring-gray-900'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-center text-xs">
                        {f === 'sans' && '현대적 고딕 (Sans)'}
                        {f === 'serif' && '우아한 명조 (Serif)'}
                        {f === 'mono' && '고급 코딩체 (Mono)'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Pick */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700">기본 가독성 폰트 크기</label>
                  <span className="font-mono text-xs text-amber-600 font-bold">{settings.baseFontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateSetting('baseFontSize', Math.max(12, settings.baseFontSize - 1))}
                    className="flex h-8 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 active:bg-gray-100"
                  >
                    -
                  </button>
                  <input
                    type="range"
                    min={12}
                    max={20}
                    step={1}
                    value={settings.baseFontSize}
                    onChange={(e) => updateSetting('baseFontSize', Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-gray-200 rounded-lg appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateSetting('baseFontSize', Math.min(20, settings.baseFontSize + 1))}
                    className="flex h-8 w-12 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 active:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Typography Content settings */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-mono tracking-widest text-[#1a1a1a] uppercase flex items-center gap-1.5 border-b border-gray-200 pb-2">
                <Globe className="h-4 w-4" /> 사이트 정보 및 텍스트 편집
              </h4>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">사이트 대표 제목 (Main Title)</label>
                <input
                  type="text"
                  value={settings.siteTitle}
                  onChange={(e) => updateSetting('siteTitle', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">사이트 슬로건/설명 (Subtitle)</label>
                <input
                  type="text"
                  value={settings.siteSubtitle}
                  onChange={(e) => updateSetting('siteSubtitle', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">이메일 문의처</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => updateSetting('contactEmail', e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                />
              </div>

              <div className="space-y-3 pt-3 border-t border-gray-50">
                <h5 className="text-xs font-bold text-gray-700">소셜 미디어 외부 채널 링크</h5>
                
                <div>
                  <label className="block text-[10px] font-mono text-gray-400">INSTAGRAM URL</label>
                  <input
                    type="url"
                    value={settings.instagramUrl}
                    onChange={(e) => updateSetting('instagramUrl', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-400">YOUTUBE URL</label>
                  <input
                    type="url"
                    value={settings.youtubeUrl}
                    onChange={(e) => updateSetting('youtubeUrl', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SEO VISUAL PREVIEW MOCK */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-5 space-y-4">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                🖥️ 검색 포털 및 소셜 미디어 Open Graph 미리보기
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                샐리의 법칙 포트폴리오 웹사이트는 내부적으로 검색엔진 최적화(SEO)를 고려하여 의미론적(Semantic) 마크업 태그를 엄격히 구성하고 있습니다.
                아래 영역은 사용자가 카카오톡, 라인, 페이스북, 구글 등에 포트폴리오 링크를 전송했을 때 노출되는 카드 형상을 실시간 렌더링한 형태입니다.
              </p>

              {/* Kakao / Meta Mock Card */}
              <div className="max-w-md mx-auto rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
                {/* Image panel */}
                <div className="h-48 bg-gray-100 relative">
                  <img
                    src={items[0]?.imageUrl || 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200'}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-mono uppercase">
                    og:image
                  </div>
                </div>

                {/* Content Panel */}
                <div className="p-4 bg-gray-50 space-y-1.5 border-t border-gray-100">
                  <p className="text-[10px] font-mono tracking-widest text-[#666666] uppercase">
                    sallyslaw-design.com
                  </p>
                  <h5 className="text-sm font-bold text-[#1A1A1A]">
                    {settings.siteTitle} | {items[0]?.title || 'Premium Art Portfolio'}
                  </h5>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {items[0]?.summary || settings.siteSubtitle}
                  </p>
                  <div className="flex gap-2 pt-2 border-t border-gray-100/50 mt-2 text-[9px] font-mono text-gray-400 transition-colors">
                    <span>og:type = website</span>
                    <span>og:locale = ko_KR</span>
                  </div>
                </div>
              </div>

              {/* Hidden Meta tags table for preview */}
              <div className="rounded-lg bg-gray-900 text-[11px] font-mono text-gray-300 p-4 space-y-1.5">
                <p className="text-amber-400 font-bold mb-1">{"<head>"} 내부 자동 내장 시맨틱 정보</p>
                <p><span className="text-blue-400">{"<title>"}</span>{settings.siteTitle} — {settings.siteSubtitle}{"</title>"}</p>
                <p><span className="text-blue-400">{"<meta name=\"description\" content=\""}</span>{settings.siteSubtitle}{"\" />"}</p>
                <p><span className="text-blue-400">{"<meta property=\"og:title\" content=\""}</span>{settings.siteTitle}{"\" />"}</p>
                <p><span className="text-blue-400">{"<meta property=\"og:description\" content=\""}</span>{items[0]?.summary || settings.siteSubtitle}{"\" />"}</p>
                <p><span className="text-blue-400">{"<meta property=\"og:url\" content=\""}</span>{"https://sallyslaw-design.com"}{"\" />"}</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GITHUB DEPLOYMENT & DATA SYNC */}
        {activeTab === 'sync' && (
          <div className="space-y-6 animate-fadeIn">
            {/* 데이터 백업 & 일괄 복구 카드 */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  💾 전체 웹사이트 데이터 백업 및 복원 (Remodeling / Backup & Restore)
                </h4>
                <span className="text-[10px] font-mono font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-150">
                  JSON v1.0
                </span>
              </div>

              <div className="text-xs text-gray-500 leading-relaxed font-sans space-y-2">
                <p>
                  사이트 구조 개편, 테마 변경 및 리모델링 작업을 하기 전에 <strong>현재 등록된 포트폴리오(공연 기록), 공연 관람 및 이력, 그리고 전체 사이트 디자인 설정 데이터</strong>를 PC에 안전하게 백업 파일로 보관하실 수 있습니다.
                </p>
                <p>
                  현 프로젝트의 코드가 개편/수정된 후에도, 다운로드받은 이 백업 파일(<code>.json</code>)을 아래 [백업 파일 로드하기] 버튼을 통해 선택해주시면 <strong>단 한 번의 클릭만으로 모든 자료가 리마운트 복원되며 즉각 제적용</strong>됩니다.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Export Card */}
                <div className="p-4 rounded-xl border border-dashed border-gray-200 hover:border-amber-400 transition-colors bg-gray-50 flex flex-col justify-between space-y-3">
                  <div>
                    <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      📤 로컬 PC에 전체 백업 복사본 파일 생성하기
                    </h5>
                    <p className="text-[10.5px] text-gray-500 leading-relaxed mt-1">
                      공연 사진/동영상 목록, 상세 이력 및 컬러/폰트 디자인 설정 데이터를 하나의 통합 백업용 파일로 패킹하여 다운로드합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all text-xs cursor-pointer"
                  >
                    📥 전체 데이터 백업 파일 생성 & 다운로드
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl border border-dashed border-gray-200 hover:border-amber-550 transition-colors bg-gray-50 flex flex-col justify-between space-y-3 relative">
                  <div>
                    <h5 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      📥 작성해 둔 백업 파일 선택하여 전체 복원하기
                    </h5>
                    <p className="text-[10.5px] text-gray-500 leading-relaxed mt-1">
                      이전에 내보내어 소장하고 계신 백업 복사본 파일(<code>.json</code>)을 가져와 현재 실시간 데이터로 원터치 복원합니다.
                    </p>
                  </div>
                  
                  <label className="w-full inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-950 text-white font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all text-xs cursor-pointer text-center">
                    {isImportLoading ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin animate-infinite duration-1000" /> 복원 데이터 마이그레이션 중...
                      </span>
                    ) : (
                      "📂 백업 백사본 JSON 파일 로드하기"
                    )}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      disabled={isImportLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-250 bg-amber-50/20 p-5 space-y-4">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                💡 깃허브 배포 시 포트폴리오 정보를 영구 보존하는 방법
              </h4>
              
              <div className="text-xs text-gray-600 space-y-3 leading-relaxed">
                <p>
                  현재 관리자 화면에서 추가/수정하시고 등록하거나 변경하신 <strong>포트폴리오 내용 및 정렬 순서</strong>는 
                  관리자 님의 현재 웹 브라우저(로컬 저장소: <code>localStorage</code>)에 아주 안전하게 임시 보관 중입니다. 
                  따라서 관리자 님 기기에서는 수정한 내용이 즉시 완벽하게 보입니다.
                </p>
                <p className="p-3 bg-white border border-amber-100 rounded-lg text-[11px] text-amber-800 font-medium">
                  ⚠️ <strong>주의하십시오:</strong> 서버 데이터베이스 없이 <strong>평생 100% 무료 서버 비용</strong>으로 구동되는 
                  정적 정형 웹사이트 특성상, 일반 방문객들이나 다른 PC에서 이 변경된 포트폴리오를 똑같이 감상하려면 
                  소스코드 파일 내부에 수정한 데이터를 영구히 입혀주셔야 합니다. 방법은 단 20초 만에 완료될 만큼 간단합니다!
                </p>
              </div>

              {/* Step list instruction panels */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-3.5 bg-gray-50 border border-gray-200/60 rounded-xl space-y-1.5 shadow-2xs">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-400 text-gray-950 text-[10px] font-black">1</span>
                  <h5 className="text-[11px] font-bold text-gray-800">동기화 코드 내려받기</h5>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    아래 <strong className="text-gray-800">[initialData.ts 파일 즉시 다운로드]</strong> 단추를 클릭해 현재 변경사항이 반영된 최신 소스 파일을 PC에 다운로드합니다.
                  </p>
                </div>
                
                <div className="p-3.5 bg-gray-50 border border-gray-200/60 rounded-xl space-y-1.5 shadow-2xs">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-black">2</span>
                  <h5 className="text-[11px] font-bold text-gray-800">폴더에 파일 덮어쓰기</h5>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    내려받은 파일로 프로젝트의 <strong><code>src/data/initialData.ts</code></strong> 파일을 덮어씌웁니다. 
                    혹은 본 대화창에 파일을 드래그하여 코드를 교체하도록 저에게 명령을 내리셔도 됩니다!
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 border border-gray-200/60 rounded-xl space-y-1.5 shadow-2xs">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-black">3</span>
                  <h5 className="text-[11px] font-bold text-gray-800">깃허브 퍼블리싱 전송</h5>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    파일 덮어쓰기 완료 후 변경 사항을 커밋하고 <strong>깃허브(GitHub)에 푸시(Push)</strong> 하십시오. 세팅에 따라 몇 초 뒤 사이트가 재배포되어 모든 전세계 유저에게 완벽히 반영됩니다.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2.5 justify-center pt-4 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={handleDownloadInitialData}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold px-5 py-2.5 rounded-lg shadow-md transition-all text-xs cursor-pointer"
                >
                  📥 initialData.ts 파일 즉시 다운로드
                </button>
                <button
                  type="button"
                  onClick={handleCopyInitialData}
                  className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-950 text-white font-bold px-5 py-2.5 rounded-lg shadow-md transition-all text-xs cursor-pointer"
                >
                  📋 TypeScript 소스 전체 복사하기
                </button>
              </div>
            </div>

            {/* Simulated Live Code Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono tracking-wider text-gray-400">실시간 데이터 빌더 내보내기 결과 프로타입 (src/data/initialData.ts)</p>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">코드 자동 패키징 완료</span>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-900 p-4 font-mono text-[10px] text-emerald-400 overflow-x-auto max-h-[250px] leading-relaxed whitespace-pre select-all">
                {generateInitialDataCode()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Google Drive Photo Picker Modal */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-150 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-sky-50/20">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#00E676" d="M16 35H4l10-18h12z"/>
                  <path fill="#2979FF" d="M34 35H16l6-11 8-7z"/>
                  <path fill="#FFD600" d="M34 17L24 35l-6-11 12-11z"/>
                </svg>
                <h3 className="text-sm font-bold text-gray-900 font-sans">구글 드라이브 사진 가져오기</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setIsDriveModalOpen(false)}
                className="text-gray-400 hover:text-gray-650 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                title="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Scrollable Workspace */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              
              {/* IF No active Client ID is set (Guide screen) */}
              {!activeClientId ? (
                <div className="space-y-4 py-2">
                  <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-xs space-y-2.5">
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <HelpCircle className="h-4 w-4 text-amber-600 animate-pulse" /> 구글 드라이브 설치 가이드
                    </p>
                    <p className="text-gray-650 leading-relaxed">
                      구글 드라이브에서 사진을 실시간으로 탐색·업로드하기 위해서는 <strong>구글 OAuth 동의 클라이언트 ID(Web Client ID)</strong> 정보가 사전에 입력되어 있어야 합니다.
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 text-gray-600 pl-1">
                      <li>
                        <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">Google Cloud Console</a>에 로그인합니다.
                      </li>
                      <li>
                        프로젝트를 만들거나 선택한 후, <strong>'승인된 JavaScript 원본'</strong>에 아래 주소들을 등록합니다:
                        <div className="my-1.5 bg-gray-150 p-2 rounded font-mono text-[10px] break-all text-gray-800 space-y-1 select-all">
                          <div>{window.location.origin}</div>
                        </div>
                      </li>
                      <li>
                        <strong>'승인된 리디렉션 URI'</strong>에 아래 콜백 주소를 등록합니다:
                        <div className="my-1.5 bg-gray-150 p-2 rounded font-mono text-[10px] break-all text-gray-800 select-all font-bold">
                          {window.location.origin}/oauth-callback.html
                        </div>
                      </li>
                      <li>
                        생성 완료된 <strong>'클라이언트 ID (Client ID)'</strong> 문자열 값을 복사하여 아래 입력 패널에 입력해 주세요.
                      </li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">구글 OAuth 클라이언트 ID 주입</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="예: 542563744739-abc123xyz.apps.googleusercontent.com"
                        value={customClientId}
                        onChange={(e) => setCustomClientId(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-amber-400 focus:outline-hidden font-mono text-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveCustomClientId(customClientId)}
                        className="rounded-lg bg-gray-900 text-white px-4 py-2 text-xs font-semibold hover:bg-amber-400 hover:text-gray-900 transition-colors cursor-pointer"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Client ID is configured! Now show connection / lists */
                <div className="space-y-4">
                  
                  {/* Auth Action row */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="text-xs text-gray-500">
                      {googleToken ? (
                        <span className="flex items-center gap-1 font-semibold text-emerald-650">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          구글 클라이언트 연동 활성화 상태
                        </span>
                      ) : (
                        <span>구글 드라이브와 연결하고 사진을 조회하세요.</span>
                      )}
                    </div>
                    <div>
                      {googleToken ? (
                        <button
                          type="button"
                          onClick={handleGoogleLogout}
                          className="text-[11px] font-bold text-gray-500 hover:text-red-500 border border-gray-200 bg-white hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          연동 계정 로그아웃
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="flex items-center gap-1.5 rounded-lg bg-white border border-gray-200 hover:border-sky-300 font-bold text-xs text-gray-700 px-4 py-1.5 shadow-xs hover:bg-sky-50/10 transition-colors cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          </svg>
                          <span>Google 계정으로 위임 권한 연결</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Drive Active Area */}
                  {googleToken ? (
                    <div className="space-y-4">
                      
                      {driveError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 text-xs space-y-3 animate-fadeIn">
                          <p className="font-bold text-rose-900 flex items-center gap-1.5">
                            <span className="block h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                            구글 클라우드 권한/API 설정 오류 감지됨
                          </p>
                          <p className="text-gray-700 leading-relaxed font-sans text-[11px] whitespace-pre-wrap select-all bg-white/70 p-2.5 rounded-lg border border-rose-100">
                            {driveError}
                          </p>
                          {extractUrl(driveError) ? (
                            <div className="pt-2 text-center">
                              <a
                                href={extractUrl(driveError)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2 rounded-lg shadow-md transition-all text-xs"
                              >
                                🚀 클릭하여 구글 클라우드에서 'Google Drive API' 즉시 활성화하기
                              </a>
                              <p className="text-[10px] text-gray-400 mt-2.5 max-w-md mx-auto leading-relaxed">
                                * 위 단추를 눌러 구글 개발자 콘솔에서 <strong>사용(Enable)</strong> 설정을 마친 후, 아래 <strong className="text-rose-750">[다시 시도]</strong> 버튼을 누르시면 정상 조회가 개시됩니다.
                              </p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-500">
                              위의 세부 내용을 참고하셔서 구글 클라우드 콘솔(Google Cloud Console)의 설정을 변경해 주십시오.
                            </p>
                          )}
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => fetchGoogleDriveFiles(googleToken)}
                              className="text-[11px] font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <RefreshCw className="h-3 w-3 animate-spin-once" />
                              다시 시도 / 새로고침
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Search Filter input */}
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                          <Search className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="검색할 사진 파일 이름을 입력하세요..."
                          value={driveSearch}
                          onChange={(e) => setDriveSearch(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
                        />
                      </div>

                      {/* Display Image files grid */}
                      {isDriveLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <RefreshCw className="h-7 w-7 text-sky-500 animate-spin" />
                          <p className="text-xs text-gray-500 font-medium">구글 드라이브 사진 데이터 동기화 중...</p>
                        </div>
                      ) : (
                        (() => {
                          const filtered = driveFiles.filter(f => 
                            !(f.mimeType && (f.mimeType.startsWith('application/vnd.google-apps.') || f.mimeType.includes('shortcut')))
                          );

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-2">
                                <FolderOpen className="h-8 w-8 text-gray-300 mx-auto" />
                                <p className="text-xs font-semibold text-gray-500">
                                  {driveSearch ? '검색어와 일치하는 사진이 없습니다.' : '드라이브에 사진 목록이 없습니다.'}
                                </p>
                                <p className="text-[10px] text-gray-400">구글 드라이브에 이미지 파일(JPG, PNG 등)이 존재하는지 확인하세요.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1 pb-1">
                                {filtered.map((file) => (
                                  <div key={file.id} className="relative rounded-xl border border-gray-150 bg-white overflow-hidden shadow-xs flex flex-col group hover:border-sky-350 transition-all">
                                    <div className="relative aspect-video bg-gray-50 overflow-hidden flex items-center justify-center border-b border-gray-100">
                                      {file.thumbnailLink ? (
                                        <img
                                          src={file.thumbnailLink}
                                          alt={file.name}
                                          className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="text-gray-300">
                                          <Image className="h-8 w-8" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-2.5 flex-1 flex flex-col justify-between bg-gray-50">
                                      <p className="text-xs font-semibold text-gray-800 truncate mb-2" title={file.name}>
                                        {file.name}
                                      </p>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectGoogleDriveFile(file)}
                                        className="w-full text-[11px] font-bold text-sky-700 bg-white border border-sky-150 hover:bg-sky-500 hover:text-white rounded-md py-1.5 transition-all text-center cursor-pointer shadow-xs"
                                      >
                                        가져오기 & 포트폴리오 지정
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Page Pagination loader */}
                              {driveNextPageToken && (
                                <div className="pt-2 flex justify-center">
                                  <button
                                    type="button"
                                    disabled={isFetchingMoreDrive}
                                    onClick={() => fetchGoogleDriveFiles(googleToken!, true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-xs active:bg-gray-100 focus:outline-hidden rounded-lg px-4 py-2 transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    {isFetchingMoreDrive ? (
                                      <>
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-sky-500" />
                                        <span>사진 더 불러오는 중...</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                        <span>더 많은 사진 불러오기</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    /* Initial prompt when not connected yet */
                    <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-50">
                        <svg className="h-6 w-6" viewBox="0 0 48 48">
                          <path fill="#00E676" d="M16 35H4l10-18h12z"/>
                          <path fill="#2979FF" d="M34 35H16l6-11 8-7z"/>
                          <path fill="#FFD600" d="M34 17L24 35l-6-11 12-11z"/>
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-gray-800">구글 계정 연동 대기 중</p>
                        <p className="text-[11px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                          구글 드라이브 연동 로그인 버튼을 클릭하여 위임 동의 처리를 진행하면 계정에 있는 사진들을 직접 탐색하여 포트폴리오 에셋 리스트로 직수입할 수 있습니다.
                        </p>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white px-5 py-2 shadow-md transition-colors cursor-pointer"
                        >
                          구글 드라이브 연동 로그인하기
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manual Client ID edit Option link */}
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setCustomClientId('')}
                      className="text-[10px] text-gray-400 hover:text-amber-600 transition-colors hover:underline"
                    >
                      💡 구글 클라이언트 ID 재설정 가이드 보기
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal loading overlay */}
            {driveImportProgress && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 text-center p-6 animate-fadeIn">
                <RefreshCw className="h-8 w-8 text-sky-500 animate-spin mb-4" />
                <h4 className="text-sm font-bold text-gray-900 mb-1">{driveImportProgress}</h4>
                <p className="text-xs text-gray-500">대용량 파일의 경우 시간이 소요될 수 있으므로 잠시만 기다려 주십시오.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, id: '', title: '' })}
        onConfirm={executeDeleteItem}
        title="포트폴리오 에셋 삭제"
        description={`"${deleteConfirmState.title}" 프로젝트를 정말 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 로컬 저장소에서 즉각 영구 삭제됩니다.`}
        confirmText="삭제하기"
        cancelText="취소"
        isDanger={true}
      />
    </div>
  );
}
