/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import { PortfolioItem, SiteSettings } from '../types';

// 환경 변수로부터 Firebase 초기화 설정 로드
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
};

// Firebase 설정이 유효한지 검증하는 헬퍼
export function isFirebaseConfigValid(): boolean {
  const cfg = firebaseConfig;
  // 빈 문자열이거나 플레이스홀더 껍데기가 남아있는 경우 비활성화 처리
  if (
    !cfg.apiKey || 
    !cfg.projectId || 
    cfg.apiKey.trim() === '' || 
    cfg.apiKey.includes('[') || 
    cfg.projectId.includes('[')
  ) {
    return false;
  }
  return true;
}

// 1.5초 타임아웃을 강제하여 무한 로딩을 완벽하게 예방하는 제네릭 헬퍼
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage = 'Timeout'): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Firebase 앱 및 Firestore 생성 (유효할 때만 초기화 권장, 혹은 기본 초기화 진행)
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Connection Test (As required by system-skill) ---
export async function testConnection() {
  if (!isFirebaseConfigValid()) {
    console.warn("Invalid Firebase Config - Skinned Connection Test.");
    return;
  }
  try {
    await withTimeout(getDocFromServer(doc(db, 'test', 'connection')), 1500, 'Test connection timeout');
    console.log("Firebase Connection verified successfully.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration and network parameters.");
    }
  }
}
testConnection();

// --- Operation and Error Logger structures ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * 포트폴리오 아이템 영구 로드 (Firebase)
 */
export async function fetchPortfolioItemsFromFirebase(): Promise<PortfolioItem[]> {
  const collectionPath = 'portfolioItems';
  if (!isFirebaseConfigValid()) {
    throw new Error('Firebase configuration is missing or invalid.');
  }
  try {
    const snapshot = await withTimeout(
      getDocs(collection(db, collectionPath)),
      2000,
      'Firebase load items timed out'
    );
    const items: PortfolioItem[] = [];
    snapshot.forEach((document) => {
      const data = document.data();
      items.push({
        id: document.id,
        title: data.title || '',
        category: data.category || '',
        summary: data.summary || '',
        description: data.description || '',
        imageUrl: data.imageUrl || '',
        imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : []),
        youtubeUrl: data.youtubeUrl || '',
        client: data.client || '',
        year: data.year || '',
        tags: data.tags || [],
      });
    });
    return items;
  } catch (error) {
    return handleFirestoreError(error, OperationType.LIST, collectionPath);
  }
}

/**
 * 포트폴리오 개별 아이템 저장 또는 업데이트
 */
export async function savePortfolioItemToFirebase(item: PortfolioItem): Promise<void> {
  const documentPath = `portfolioItems/${item.id}`;
  try {
    const docRef = doc(db, 'portfolioItems', item.id);
    await setDoc(docRef, {
      title: item.title,
      category: item.category,
      summary: item.summary,
      description: item.description,
      imageUrl: item.imageUrl,
      imageUrls: item.imageUrls || [item.imageUrl],
      youtubeUrl: item.youtubeUrl || '',
      client: item.client,
      year: item.year,
      tags: item.tags || []
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, documentPath);
  }
}

/**
 * 포트폴리오 아이템 삭제
 */
export async function deletePortfolioItemFromFirebase(itemId: string): Promise<void> {
  const documentPath = `portfolioItems/${itemId}`;
  try {
    const docRef = doc(db, 'portfolioItems', itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, documentPath);
  }
}

/**
 * 사이트 글로벌 설정 로드
 */
export async function fetchSiteSettingsFromFirebase(): Promise<SiteSettings | null> {
  const documentPath = 'settings/main';
  if (!isFirebaseConfigValid()) {
    throw new Error('Firebase configuration is missing or invalid.');
  }
  try {
    const docRef = doc(db, 'settings', 'main');
    const snapshot = await withTimeout(
      getDoc(docRef),
      2000,
      'Firebase load settings timed out'
    );
    if (snapshot.exists()) {
      return snapshot.data() as SiteSettings;
    }
    return null;
  } catch (error) {
    return handleFirestoreError(error, OperationType.GET, documentPath);
  }
}

/**
 * 사이트 글로벌 설정 저장
 */
export async function saveSiteSettingsToFirebase(settings: SiteSettings): Promise<void> {
  const documentPath = 'settings/main';
  try {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, documentPath);
  }
}
