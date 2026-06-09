/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PortfolioItem, SiteSettings, FontFamilyType } from '../types';
import ConfirmModal from './ConfirmModal';
import { 
  Settings, Save, Plus, Trash2, Edit3, Image, Video, Globe, 
  HelpCircle, Sparkles, Check, RefreshCw, Type, Layout, Code2,
  Upload, Star, Trash, Link as LinkIcon, Search, FolderOpen, X,
  ChevronDown, ChevronUp
} from 'lucide-react';

interface AdminPanelProps {
  items: PortfolioItem[];
  setItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
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

export default function AdminPanel({ items, setItems, settings, setSettings, onResetData }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'seo'>('content');
  const [editingItem, setEditingItem] = useState<Partial<PortfolioItem> | null>(null);
  const [formMediaType, setFormMediaType] = useState<'photo' | 'video'>('photo');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
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
      
      const updatedUrls = [...currentImageUrls, optimizedBase64];
      const updatedCover = optimizedBase64;
      
      setEditingItem(prev => prev ? {
        ...prev,
        imageUrl: updatedCover,
        imageUrls: updatedUrls
      } : null);
      
      triggerToast(`구글 드라이브의 "${file.name}" 사진을 다운로드하여 정상 동기화했습니다.`);
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
      
      let currentImageUrls = editingItem?.imageUrls || (editingItem?.imageUrl ? [editingItem.imageUrl] : []);
      // 임시 플레이스홀더 이미지(샘플 이미지)는 새 커스텀 이미지를 올렸으므로 완전히 교체하기 위해 리스트에서 비웁니다.
      currentImageUrls = currentImageUrls.filter(url => !isPlaceholderImage(url));
      
      const updatedUrls = [...currentImageUrls, ...base64Images];
      
      // 새 사진을 컴퓨터에서 업로드한 경우, 사용자가 수정한 주 사진으로 즉시 판단하여 
      // 대표 표지 이미지(cover / imageUrl)를 방금 올린 이미지로 자동 지정합니다.
      const updatedCover = base64Images[0] || (currentImageUrls.length > 0 ? currentImageUrls[0] : '');
      
      setEditingItem(prev => prev ? {
        ...prev,
        imageUrl: updatedCover,
        imageUrls: updatedUrls
      } : null);
      
      triggerToast(`${files.length}개의 새로운 사진이 압축되어 정상 업로드되었습니다.`);
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
    let currentUrls = editingItem?.imageUrls || (editingItem?.imageUrl ? [editingItem.imageUrl] : []);
    // 임시 플레이스홀더 이미지(샘플 이미지)는 새 커스텀 이미지를 추가했으므로 제거합니다.
    currentUrls = currentUrls.filter(url => !isPlaceholderImage(url));

    if (currentUrls.some(url => url === targetUrl)) {
      triggerToast('이미 등록된 이미지 주소입니다.');
      return;
    }
    
    const updatedUrls = [...currentUrls, targetUrl];
    // 웹 주소 추가 시에도 새 이미지를 편리하게 즉시 대표 표지 이미지로 설정합니다.
    const updatedCover = targetUrl;
    
    setEditingItem(prev => prev ? {
      ...prev,
      imageUrl: updatedCover,
      imageUrls: updatedUrls
    } : null);
    
    setUrlInput('');
    triggerToast('새 웹 이미지가 추가되었으며, 대표 이미지로 자동 지정되었습니다.');
  };

  const handleSetCoverImage = (url: string) => {
    setEditingItem(prev => prev ? {
      ...prev,
      imageUrl: url
    } : null);
    triggerToast('선택한 이미지가 대표/커버 이미지로 설정되었습니다.');
  };

  const handleDeleteImage = (indexToDelete: number) => {
    const currentUrls = editingItem?.imageUrls || (editingItem?.imageUrl ? [editingItem.imageUrl] : []);
    const urlToDelete = currentUrls[indexToDelete];
    const updatedUrls = currentUrls.filter((_, idx) => idx !== indexToDelete);
    
    let updatedCover = editingItem?.imageUrl || '';
    if (updatedCover === urlToDelete) {
      updatedCover = updatedUrls[0] || '';
    }
    
    setEditingItem(prev => prev ? {
      ...prev,
      imageUrl: updatedCover,
      imageUrls: updatedUrls
    } : null);
    
    triggerToast('이미지가 리스트에서 삭제되었습니다.');
  };

  // 1. Content CRUD Handlers
  const handleStartAddWithMode = (mode: 'photo' | 'video') => {
    setFormMediaType(mode);
    const initialImg = mode === 'photo' ? 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop' : '';
    setEditingItem({
      id: `item-${Date.now()}`,
      title: '',
      category: mode === 'photo' ? '아티스트' : '기타',
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
    let finalImageUrls = [...(editingItem.imageUrls || [])];

    // 사용자가 입력 칸에 웹 이미지 주소를 넣어놓고 실수로 [추가] 버튼을 안 눌렀을 때를 대비해 자동 임포트 처리
    if (urlInput.trim()) {
      const typedUrl = urlInput.trim();
      // 기존에 들어있던 플레이스홀더(샘플 이미지)는 커스텀 이미지가 수동 등록되었으므로 말끔히 제거
      finalImageUrls = finalImageUrls.filter(url => !isPlaceholderImage(url));
      
      if (!finalImageUrls.includes(typedUrl)) {
        finalImageUrls.push(typedUrl);
      }
      if (isPlaceholderImage(finalImageUrl) || !finalImageUrl) {
        finalImageUrl = typedUrl;
      }
    }

    if (formMediaType === 'photo') {
      finalYoutubeUrl = ''; // Clear video URL explicitly
      
      // 만약 플레이스홀더만 들어있는 상태라면, 그리고 다른 커스텀 사진 입력/업로드가 이미 되었다면 플레이스홀더를 완전히 걸러냅니다.
      const hasCustomImages = finalImageUrls.some(url => !isPlaceholderImage(url));
      if (hasCustomImages) {
        finalImageUrls = finalImageUrls.filter(url => !isPlaceholderImage(url));
        if (isPlaceholderImage(finalImageUrl)) {
          finalImageUrl = finalImageUrls[0] || '';
        }
      }

      if (finalImageUrls.length === 0) {
        if (finalImageUrl && !isPlaceholderImage(finalImageUrl)) {
          finalImageUrls = [finalImageUrl];
        } else {
          finalImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200';
          finalImageUrls = [finalImageUrl];
        }
      } else if (!finalImageUrl && finalImageUrls.length > 0) {
        finalImageUrl = finalImageUrls[0];
      }
    } else {
      // video mode
      // Auto-generate high quality YouTube poster from video ID
      const videoId = getYoutubeVideoId(finalYoutubeUrl);
      if (videoId) {
        const posterUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        if (!finalImageUrl || isPlaceholderImage(finalImageUrl)) finalImageUrl = posterUrl;
        
        // Remove placeholder to clean up
        finalImageUrls = finalImageUrls.filter(url => !isPlaceholderImage(url));
        if (!finalImageUrls.includes(posterUrl)) {
          finalImageUrls = [posterUrl, ...finalImageUrls];
        }
      } else {
        if (!finalImageUrl) finalImageUrl = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200';
      }
    }

    const validated: PortfolioItem = {
      id: editingItem.id,
      title: editingItem.title || '무제 프로젝트',
      category: editingItem.category || '기타',
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
      updatedItems = items.map(item => item.id === validated.id ? validated : item);
      triggerToast('포트폴리오 정보가 업데이트 되었습니다.');
    } else {
      updatedItems = [validated, ...items];
      triggerToast('새로운 포트폴리오 프로젝트가 등록되었습니다.');
    }

    setItems(updatedItems);
    
    try {
      localStorage.setItem('sallys_items', JSON.stringify(updatedItems));
    } catch (error) {
      console.error('LocalStorage 저장 한도 초과 오류:', error);
      triggerToast('로컬 브라우저 저장 한도가 가득 찼습니다. 불필요한 기존 프로젝트를 삭제하거나 저용량 이미지를 업로드해 주세요.');
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
    localStorage.setItem('sallys_items', JSON.stringify(updated));
    triggerToast(`"${title}" 프로젝트가 영구적으로 삭제되었습니다.`);
    if (editingItem?.id === id) {
      setEditingItem(null);
    }
    setDeleteConfirmState({ isOpen: false, id: '', title: '' });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setItems(updated);
    localStorage.setItem('sallys_items', JSON.stringify(updated));
    triggerToast('게시 순서가 한 단계 상승했습니다.');
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setItems(updated);
    localStorage.setItem('sallys_items', JSON.stringify(updated));
    triggerToast('게시 순서가 한 단계 하락했습니다.');
  };

  // 2. Settings Handlers
  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('sallys_settings', JSON.stringify(updated));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('sallys_settings', JSON.stringify(settings));
    triggerToast('디자인 테마 및 소셜 설정이 즉각 반영·저장 테이블에 저장되었습니다.');
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
      </div>

      {/* Toast Notification Banner */}
      {showToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-2xl animate-bounce">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
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
                        <option value="아티스트">아티스트</option>
                        <option value="무대">무대</option>
                        <option value="공연장">공연장</option>
                        <option value="관람객">관람객</option>
                        <option value="기타">기타</option>
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

                    {/* Integrated Multiple Image Upload & Manager */}
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-700 flex items-center gap-1">
                          <Image className="h-3.5 w-3.5 text-amber-500" /> 등록된 포트폴리오 이미지
                        </label>
                        <span className="text-[10px] text-gray-400 font-mono">
                          총 {(editingItem.imageUrls || []).length}개
                        </span>
                      </div>

                      {/* Image Preview List with Touch-Friendly Layout (No Hover Barrier) */}
                      {editingItem.imageUrls && editingItem.imageUrls.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 overflow-y-auto max-h-[220px] pr-1 pb-1">
                          {editingItem.imageUrls.map((url, idx) => {
                            const isCover = editingItem.imageUrl === url;
                            return (
                              <div key={idx} className="relative rounded-lg border border-gray-200 overflow-hidden bg-white flex flex-col shadow-xs group">
                                <div className="relative aspect-video bg-gray-50 overflow-hidden">
                                  <img
                                    src={url}
                                    alt="미리보기"
                                    className="h-full w-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  {isCover && (
                                    <div className="absolute top-1 left-1 bg-amber-400 text-gray-900 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5 select-none">
                                      <Star className="h-2 w-2 fill-current animate-pulse" /> 대표
                                    </div>
                                  )}
                                </div>
                                <div className="flex bg-gray-50 border-t border-gray-100 p-1 gap-1">
                                  {!isCover ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSetCoverImage(url)}
                                      className="flex-1 text-[9px] font-semibold text-gray-650 bg-white hover:bg-amber-400 hover:text-gray-900 border border-gray-200 rounded py-1 transition-all cursor-pointer text-center"
                                    >
                                      대표로 지정
                                    </button>
                                  ) : (
                                    <span className="flex-1 text-[9px] font-bold text-amber-600 bg-amber-50/50 rounded py-1 text-center select-none border border-amber-200/40">
                                      대표 설정됨
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteImage(idx)}
                                    className="text-[9px] font-semibold text-red-650 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded px-1.5 py-1 transition-all cursor-pointer text-center"
                                    title="이미지 삭제"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 border border-dashed border-gray-250 rounded-lg text-[11px] text-gray-500 bg-white">
                          등록된 이미지가 없습니다. 아래에서 이미지를 추가하세요.
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
                                <span>내 컴퓨터에서 사진 올리기 (여러 장 선택 가능)</span>
                              </span>
                            )}
                            <input
                              type="file"
                              multiple
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
                            className="relative flex min-h-[46px] w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-sky-200 bg-sky-50/10 px-3 py-1.5 text-center text-[11px] font-semibold text-sky-700 hover:bg-sky-50 hover:text-sky-850 transition-colors"
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
                            추가
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
