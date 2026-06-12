/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PortfolioItem } from '../types';
import { ArrowUpRight, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface PortfolioCardProps {
  key?: string;
  item: PortfolioItem;
  onClick: () => void;
}

export default function PortfolioCard({ item, onClick }: PortfolioCardProps) {
  return (
    <motion.div
      layoutId={`card-container-${item.id}`}
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-xs transition-all duration-500 hover:border-amber-400 hover:shadow-lg cursor-pointer"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      whileHover={{ y: -6 }}
    >
      <div className="space-y-4">
        {/* Visual Cover */}
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg bg-gray-50/50">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          {/* Subtle golden yellow light gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--accent-color)]/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          {/* If there is a video, show a small play indicator badge */}
          {item.youtubeUrl && (
            <div className="absolute right-3 bottom-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-md backdrop-blur-xs transition-transform duration-300 group-hover:scale-110">
              <Play className="h-4 w-4 fill-current text-amber-500" />
            </div>
          )}
          
          {/* Tag Category Overlay */}
          <span className="absolute top-3 left-3 rounded-md bg-white/90 px-2.5 py-1 text-[11px] font-medium tracking-wider text-gray-800 shadow-sm backdrop-blur-xs">
            {item.category}
          </span>
        </div>

        {/* Text Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono tracking-widest text-[#666666] uppercase">
              {item.client} • {item.year}
            </span>
            <span className="text-gray-400 group-hover:text-[var(--accent-color)] transition-colors duration-300">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          
          <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-[#1A1A1A] group-hover:text-[var(--accent-color)] transition-colors duration-300">
            {item.title}
          </h3>
        </div>
      </div>

      {/* Decorative Bottom Line Anchor */}
      <div className="mt-4 flex flex-wrap gap-1.5 pt-3 border-t border-gray-50">
        {item.tags.slice(0, 3).map((tag, idx) => (
          <span 
            key={idx} 
            className="text-[10px] bg-gray-50 px-2 py-0.5 rounded-full text-gray-500 font-mono"
          >
            #{tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
