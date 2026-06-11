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

// Firebase 앱 및 Firestore 생성
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// --- Connection Test (As required by system-skill) ---
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
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
  try {
    const snapshot = await getDocs(collection(db, collectionPath));
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
  try {
    const docRef = doc(db, 'settings', 'main');
    const snapshot = await getDoc(docRef);
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
