/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PortfolioItem } from '../types';
import { X, Calendar, User, Tag, Link2, Play } from 'lucide-react';
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
          <div className="flex-[2.2] md:flex-[1.5] overflow-y-auto bg-gray-50 p-3 md:p-8 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col justify-start min-h-[350px] md:min-h-0 space-y-4 md:space-y-6">
            <div className="space-y-4 md:space-y-6 w-full my-auto">
               {videoId ? (
                <div className="space-y-3">
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
                <div className="relative w-full overflow-hidden rounded-xl shadow-md bg-gray-150 group select-none flex items-center justify-center min-h-[220px] sm:min-h-[300px] md:min-h-[440px] aspect-[4/3] md:aspect-auto">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-contain rounded-lg p-0.5"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>
          </div>
 
          {/* Right Panel: Project Details & Context */}
          <div className="flex-[1] md:flex-[0.8] overflow-y-auto p-4 md:p-8 flex flex-col justify-between bg-white md:border-l border-gray-100 max-h-[35vh] md:max-h-none">
            <div className="space-y-4">
              {/* Category Badging */}
              <div className="flex flex-wrap gap-2 items-center">
                <span className="inline-block rounded-md bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-800">
                  {item.category}
                </span>
                <span className="text-gray-300 text-[10px]">•</span>
                <span className="text-gray-400 font-mono text-[10px]">
                  {item.year}
                </span>
              </div>
 
              {/* Title & Metadata (2024 • 서울) */}
              <div className="space-y-1.5 md:space-y-2">
                <h2 className="text-base md:text-xl font-bold tracking-tight text-gray-900 leading-snug">
                  {item.title}
                </h2>
                <p className="text-xs font-mono font-bold text-amber-600/90 tracking-wide">
                  {item.year} &middot; {item.workType}
                </p>
                {item.summary && (
                  <p className="text-xs text-gray-400 italic">
                    {item.summary}
                  </p>
                )}
              </div>
 
              {/* Minimal Description */}
              <div className="space-y-2 text-xs leading-relaxed text-gray-600">
                <h4 className="text-[9px] font-mono tracking-widest text-[#999999] border-b border-gray-100 pb-1 uppercase">
                  Photo & Video Note
                </h4>
                <p className="whitespace-pre-line text-gray-700 leading-relaxed text-[12px] md:text-[13px]">
                  {item.description}
                </p>
              </div>
            </div>
 
            {/* Bottom Tag List */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-mono text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
 
              {item.youtubeUrl && (
                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-600 font-mono w-full overflow-hidden">
                  <Link2 className="h-3 w-3 shrink-0" />
                  <a href={item.youtubeUrl} target="_blank" rel="noopener noreferrer" className="hover:underline break-all truncate text-[10px] block">
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
