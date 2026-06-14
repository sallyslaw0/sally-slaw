/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PortfolioItem } from '../types';
import PortfolioCard from './PortfolioCard';
import { Search, SlidersHorizontal, Sparkles, Image as ImageIcon, Film, Layers } from 'lucide-react';

interface PortfolioGridProps {
  items: PortfolioItem[];
  onItemClick: (item: PortfolioItem) => void;
  mediaType: 'all' | 'photo' | 'video';
  setMediaType: (type: 'all' | 'photo' | 'video') => void;
}

export default function PortfolioGrid({ items, onItemClick, mediaType, setMediaType }: PortfolioGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    '전체',
    'Artist(아티스트)',
    'Stage(무대)',
    'Concert hall landscape(공연장)',
    'Audience(관람객)',
    'etc(기타)',
    'Video(영상)'
  ];

  // Helper matching function for backward compatibility
  const matchesCategorySelection = (itemCategory: string, selected: string, isVideo: boolean) => {
    if (selected === '전체') return true;
    
    const cat = itemCategory ? itemCategory.trim() : '';

    if (selected === 'Artist(아티스트)') {
      return cat === 'Artist(아티스트)' || cat === '아티스트';
    }
    if (selected === 'Stage(무대)') {
      return cat === 'Stage(무대)' || cat === '무대';
    }
    if (selected === 'Concert hall landscape(공연장)') {
      return cat === 'Concert hall landscape(공연장)' || cat === '공연장';
    }
    if (selected === 'Audience(관람객)') {
      return cat === 'Audience(관람객)' || cat === '관람객';
    }
    if (selected === 'etc(기타)') {
      return cat === 'etc(기타)' || cat === '기타';
    }
    if (selected === 'Video(영상)') {
      return cat === 'Video(영상)' || cat === '영상' || isVideo;
    }

    return cat === selected;
  };

  // Filtering combined algorithm
  const filteredItems = items.filter(item => {
    // 1. Category Filter
    const matchesCategory = matchesCategorySelection(item.category, selectedCategory, !!item.youtubeUrl);

    // 2. Search Filter
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* 2. Sub-categories and Search Hub Panel */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-y border-gray-100 py-5">
        
        {/* Dynamic Category Buttons */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all duration-300 select-none cursor-pointer ${
                selectedCategory === category
                  ? 'bg-gray-905 text-white shadow-xs font-bold'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-800'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Floating Custom Search */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="제목, 아티스트, 태그 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-gray-250 bg-white pl-9 pr-4 py-2 text-xs focus:border-amber-400 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid rendering list */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {filteredItems.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              onClick={() => onItemClick(item)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20 text-center space-y-3">
          <SlidersHorizontal className="h-8 w-8 text-gray-300 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">조건에 맞는 포트폴리오 에셋이 없습니다.</p>
            <p className="text-xs text-gray-500 mt-1">다른 검색어 혹은 카테고리 필터를 지정해 보세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
