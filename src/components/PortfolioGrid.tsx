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

  // Count items for headers
  const totalCount = items.length;
  const photoCount = items.filter(item => !item.youtubeUrl).length;
  const videoCount = items.filter(item => !!item.youtubeUrl).length;

  // Extract all categories dynamically to prevent desync based on current mediaType
  const currentMediaItems = items.filter(item => {
    if (mediaType === 'photo') return !item.youtubeUrl;
    if (mediaType === 'video') return !!item.youtubeUrl;
    return true;
  });

  const categories = ['전체', '아티스트', '무대', '공연장', '관람객', '기타'];

  // Filtering combined algorithm
  const filteredItems = currentMediaItems.filter(item => {
    // 1. Category Filter
    const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory;

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
      {/* 1. Primary Global Board Segregation Tabs: Photo vs Video */}
      <div className="flex justify-center p-1 bg-gray-100 rounded-2xl max-w-xl mx-auto shadow-inner border border-gray-200/50">
        <button
          onClick={() => {
            setMediaType('all');
            setSelectedCategory('전체');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            mediaType === 'all'
              ? 'bg-white text-gray-950 shadow-md transform scale-[1.02]'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>전체 통합 포트폴리오</span>
          <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full font-mono text-gray-600 font-bold">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => {
            setMediaType('photo');
            setSelectedCategory('전체');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            mediaType === 'photo'
              ? 'bg-amber-400 text-gray-950 shadow-md transform scale-[1.02]'
              : 'text-gray-500 hover:text-amber-500'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>사진 포트폴리오</span>
          <span className="text-[10px] bg-black/5 px-1.5 py-0.5 rounded-full font-mono text-gray-700 font-bold">
            {photoCount}
          </span>
        </button>

        <button
          onClick={() => {
            setMediaType('video');
            setSelectedCategory('전체');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
            mediaType === 'video'
              ? 'bg-amber-400 text-gray-950 shadow-md transform scale-[1.02]'
              : 'text-gray-500 hover:text-amber-500'
          }`}
        >
          <Film className="h-4 w-4" />
          <span>영상 포트폴리오</span>
          <span className="text-[10px] bg-black/5 px-1.5 py-0.5 rounded-full font-mono text-gray-700 font-bold">
            {videoCount}
          </span>
        </button>
      </div>

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
                  ? 'bg-gray-905 text-white shadow-xs'
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
