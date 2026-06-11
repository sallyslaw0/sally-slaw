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

// Declare standard Vite client typings so TypeScript understands import.meta.env
declare global {
  interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY?: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
    readonly VITE_FIREBASE_PROJECT_ID?: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
    readonly VITE_FIREBASE_APP_ID?: string;
    [key: string]: any;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// 환경 변수나 치환된 글로벌 상수를 안전하게 로드하는 도우미 함수 (이중 폴백 구조)
const getSafeEnvValue = (metaVal: any, fallbackName: string): string => {
  // 1. 전달된 metaVal (import.meta.env.*) 검증
  if (metaVal && typeof metaVal === 'string') {
    const trimmed = metaVal.trim();
    if (
      trimmed !== '' &&
      trimmed !== 'undefined' &&
      trimmed !== 'null' &&
      !trimmed.includes('[') &&
      !trimmed.includes('placeholder')
    ) {
      return trimmed;
    }
  }

  // 2. process.env를 통한 런타임/빌드타임 직접 바인딩 확인 (브라우저 Uncaught ReferenceError 방지용 타입 가드)
  try {
    if (typeof process !== 'undefined' && process.env) {
      const procVal = (process.env as any)[fallbackName];
      if (procVal && typeof procVal === 'string') {
        const trimmed = procVal.trim();
        if (
          trimmed !== '' &&
          trimmed !== 'undefined' &&
          trimmed !== 'null' &&
          !trimmed.includes('[') &&
          !trimmed.includes('placeholder')
        ) {
          return trimmed;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // 3. 브라우저 글로벌 window 객체에 혹시 모를 바인딩 확인
  try {
    if (typeof window !== 'undefined') {
      const winVal = (window as any)[fallbackName] || (window as any).env?.[fallbackName];
      if (winVal && typeof winVal === 'string') {
        const trimmed = winVal.trim();
        if (
          trimmed !== '' &&
          trimmed !== 'undefined' &&
          trimmed !== 'null' &&
          !trimmed.includes('[') &&
          !trimmed.includes('placeholder')
        ) {
          return trimmed;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return '';
};

// 환경 변수로부터 Firebase 초기화 설정 로드 (고정된 텍스트 치환 및 유연한 런타임 매핑)
const firebaseConfig = {
  apiKey: getSafeEnvValue(import.meta.env.VITE_FIREBASE_API_KEY, 'VITE_FIREBASE_API_KEY'),
  authDomain: getSafeEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getSafeEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID, 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getSafeEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getSafeEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getSafeEnvValue(import.meta.env.VITE_FIREBASE_APP_ID, 'VITE_FIREBASE_APP_ID'),
};

// Firebase 설정이 유효한지 검증하는 헬퍼
export function isFirebaseConfigValid(): boolean {
  const cfg = firebaseConfig;
  
  if (!cfg.apiKey || !cfg.projectId) {
    return false;
  }
  
  const cleanKey = cfg.apiKey.trim();
  const cleanProject = cfg.projectId.trim();

  if (
    cleanKey === '' ||
    cleanProject === '' ||
    cleanKey === 'undefined' ||
    cleanProject === 'undefined' ||
    cleanKey === 'null' ||
    cleanProject === 'null' ||
    cleanKey.includes('[') ||
    cleanProject.includes('[') ||
    cleanKey.toLowerCase().includes('placeholder') ||
    cleanProject.toLowerCase().includes('placeholder')
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

// Firebase 앱 및 Firestore 생성 (유효할 때만 초기화하여 모듈 로드 시의 크래시 예방)
export const app = isFirebaseConfigValid() ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null as any;

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
      10000,
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
  if (!isFirebaseConfigValid()) {
    console.warn("Firebase config is invalid. Skipping remote save, item preserved in localStorage.");
    return Promise.resolve();
  }
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
  if (!isFirebaseConfigValid()) {
    console.warn("Firebase config is invalid. Skipping remote delete, item removed from localStorage.");
    return Promise.resolve();
  }
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
      10000,
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
  if (!isFirebaseConfigValid()) {
    console.warn("Firebase config is invalid. Skipping remote settings save.");
    return Promise.resolve();
  }
  const documentPath = 'settings/main';
  try {
    const docRef = doc(db, 'settings', 'main');
    await setDoc(docRef, settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, documentPath);
  }
}
