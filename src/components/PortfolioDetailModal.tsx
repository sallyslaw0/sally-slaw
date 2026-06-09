/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types';
import { X, Calendar, User, Tag, Link2, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PortfolioDetailModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
}

// Extract Youtube video ID helper
function getYoutubeVideoId(url?: string): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function PortfolioDetailModal({ item, onClose }: PortfolioDetailModalProps) {
  if (!item) return null;
  const videoId = getYoutubeVideoId(item.youtubeUrl);
  const [activeIdx, setActiveIdx] = useState(0);

  // Extract all images associated with this project
  const images = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [item.imageUrl];

  useEffect(() => {
    setActiveIdx(0);
  }, [item?.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      {/* Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative z-10 flex h-full max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:flex-row"
      >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-800 shadow-md hover:bg-amber-400 hover:text-gray-900 transition-colors duration-300"
            aria-label="모달 닫기"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Left Panel: Visuals (Media stream - Title cover / Videos) */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-8 border-r border-gray-100 flex flex-col justify-start min-h-[300px] md:min-h-0 space-y-6">
            <div className="space-y-6 w-full my-auto">
              {videoId ? (
                <div className="space-y-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
                      title={item.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute top-0 left-0 h-full w-full rounded-xl"
                    />
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-end italic">
                    <Play className="h-3 w-3 text-amber-500 fill-current" /> 유튜브 비디오 플레이어 인터랙티브 탑재
                  </p>
                </div>
              ) : (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lg bg-black group select-none flex items-center justify-center">
                  <img
                    src={images[activeIdx]}
                    alt={`${item.title} - 이미지 ${activeIdx + 1}`}
                    className="h-full w-full object-contain max-h-[400px] md:max-h-[500px]"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Prev/Next navigation overlay for multiple images */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-amber-400 hover:text-gray-900 transition-all duration-200 cursor-pointer"
                        aria-label="이전 이미지"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-amber-400 hover:text-gray-900 transition-all duration-200 cursor-pointer"
                        aria-label="다음 이미지"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white">
                        {activeIdx + 1} / {images.length}
                      </span>
                    </>
                  )}
                </div>
              )}

              {/* Multiple Images Sub Thumbnail Row */}
              {images.length > 1 && (
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <p className="text-[9px] text-gray-400 font-mono tracking-wider uppercase select-none">포트폴리오 갤러리 썸네일 ({images.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                    {images.map((imgUrl, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`relative h-14 w-20 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                          activeIdx === i 
                            ? 'border-amber-400 ring-2 ring-amber-100/30' 
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={imgUrl}
                          alt={`${item.title} 썸네일 ${i + 1}`}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub Image if video exists */}
              {videoId && (
                <div className="space-y-1 pt-2 border-t border-gray-100">
                  <p className="text-[9px] text-gray-400 font-mono tracking-wide uppercase select-none">스틸 이미지 뷰 ({images.length})</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((imgUrl, i) => (
                      <div
                        key={i}
                        className="relative h-12 w-18 flex-shrink-0 overflow-hidden rounded-lg border border-gray-250 opacity-80"
                      >
                        <img
                          src={imgUrl}
                          alt={`${item.title} 대표`}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Project Details & Context */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col justify-between">
            <div className="space-y-6">
              {/* Category Badging */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-block rounded-md bg-[var(--accent-color)]/20 px-3 py-1 text-xs font-semibold tracking-wider text-[#1a1a1a]">
                  {item.category}
                </span>
                <span className="inline-block rounded-md bg-gray-100 px-3 py-1 text-xs font-mono text-gray-500">
                  {item.year}
                </span>
              </div>

              {/* Title & Sub */}
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                  {item.title}
                </h2>
                <p className="text-sm font-medium text-amber-600/90 leading-relaxed border-l-2 border-[var(--accent-color)] pl-3">
                  {item.summary}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-xs font-medium text-gray-600">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-mono">ARTIST</p>
                    <p className="text-gray-800 text-[13px]">{item.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-mono">TIMELINE</p>
                    <p className="text-gray-800 text-[13px]">{item.year} 년</p>
                  </div>
                </div>
              </div>

              {/* Detailed Description Paragraph Blocks */}
              <div className="space-y-4 text-sm leading-relaxed text-gray-700">
                <h4 className="text-xs font-mono tracking-widest text-[#666666] border-b border-gray-100 pb-2 uppercase">
                  Project Brief
                </h4>
                {item.description.split('\n\n').map((para, i) => (
                  <p key={i} className="whitespace-pre-line text-[14px]">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Bottom Tag List */}
            <div className="mt-8 pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Tag className="h-3.5 w-3.5" />
                <span>관련 태그</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-gray-50 px-2.5 py-1 text-xs font-mono text-gray-500 transition-colors duration-300 hover:bg-amber-100 hover:text-amber-800 select-none cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {item.youtubeUrl && (
                <div className="flex items-center gap-1.5 pt-2 text-xs text-amber-600 font-mono">
                  <Link2 className="h-3.5 w-3.5" />
                  <a href={item.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline break-all">
                    {item.youtubeUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
  );
}
