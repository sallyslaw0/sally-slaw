/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[]; // e.g., list of images for gallery
  youtubeUrl?: string; // e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/...
  client: string;
  year: string;
  tags: string[];
  order?: number;
}

export type FontFamilyType = 'sans' | 'serif' | 'mono';

export interface HistoryItem {
  id: string;
  year: string;
  projectName: string;
  description: string;
  order?: number; // For fallback custom sorting if needed, but defaults to descending string/year sorting or list reverse
}

export interface SiteSettings {
  accentColor: string;
  bgColor: string;
  fontFamily: FontFamilyType;
  baseFontSize: number; // in pixels (e.g., 16)
  siteTitle: string;
  siteSubtitle: string;
  contactEmail: string;
  contactPhone: string;
  instagramUrl: string;
  youtubeUrl: string;
  behanceUrl: string;
}
