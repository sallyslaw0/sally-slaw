/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SiteSettings } from '../types';
import { Mail, Instagram, Youtube, Send, CheckCircle2, Award, Smile } from 'lucide-react';
import { motion } from 'motion/react';

interface ContactSectionProps {
  settings: SiteSettings;
}

export default function ContactSection({ settings }: ContactSectionProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorOccurred, setErrorOccurred] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorOccurred(false);
    
    try {
      const response = await fetch('https://formspree.io/f/mdajrzdv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
        }),
      });

      if (response.ok) {
        // Also log locally as backup
        const existingInquiries = JSON.parse(localStorage.getItem('sallys_inquiries') || '[]');
        const newInquiry = {
          ...formData,
          id: `inq-${Date.now()}`,
          date: new Date().toLocaleDateString('ko-KR')
        };
        localStorage.setItem('sallys_inquiries', JSON.stringify([newInquiry, ...existingInquiries]));

        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', email: '', message: '' });
        }, 5000);
      } else {
        throw new Error('Formspree response not OK');
      }
    } catch (err) {
      console.error('Submission failed to Formspree', err);
      setErrorOccurred(true);
      
      // Fallback: Save local since Formspree is having issues
      const existingInquiries = JSON.parse(localStorage.getItem('sallys_inquiries') || '[]');
      const newInquiry = {
        ...formData,
        id: `inq-${Date.now()}`,
        date: new Date().toLocaleDateString('ko-KR')
      };
      localStorage.setItem('sallys_inquiries', JSON.stringify([newInquiry, ...existingInquiries]));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 border-t border-gray-100 bg-gray-50/30">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          
          {/* Left Column: Brand Statement & Connections */}
          <div className="space-y-8 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-xs font-bold font-mono tracking-widest text-amber-500 uppercase flex items-center gap-1.5">
                <Smile className="h-4 w-4" /> COLLABORATION
              </span>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1A1A1A] sm:text-4xl">
                샐리의 법칙 디자인 스튜디오와 <br />
                행운의 첫 걸음을 동행하세요
              </h2>
              <p className="text-sm leading-relaxed text-[#666666] max-w-md">
                "일이 항상 유리하게 풀리는 현상." 샐리의 법칙처럼, 우리의 모든 디자인 고민은 브랜드의 성공적인 흐름으로 환원됩니다. 
                차분하고 심도 깊은 파트너십을 위해 언제나 메일과 대화가 열려 있습니다.
              </p>
            </div>

            {/* Practical Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-xs text-amber-500">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">Email Contact</p>
                  <a href={`mailto:${settings.contactEmail}`} className="text-sm font-semibold text-gray-800 hover:underline">
                    {settings.contactEmail}
                  </a>
                </div>
              </div>
            </div>

            {/* Social icons row */}
            <div className="space-y-3">
              <p className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">CONNECT CHANNELS</p>
              <div className="flex items-center gap-2.5">
                {settings.instagramUrl && (
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-500 hover:shadow-xs"
                    title="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {settings.youtubeUrl && (
                  <a
                    href={settings.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:border-amber-400 hover:text-amber-500 hover:shadow-xs"
                    title="YouTube Channel"
                  >
                    <Youtube className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Custom Interactive Form */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl sm:p-8">
            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex h-full flex-col items-center justify-center text-center py-10 space-y-4"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <CheckCircle2 className="h-10 w-10 shrink-0" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900">프로젝트 문의가 전송되었습니다!</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                    접수된 제안서는 샐리의 법칙 아틀리에 고객 응대 전담팀에서 24시간 이내에 꼼꼼히 확인해 답변드리겠습니다.
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                  SUBMITTED TO FORMSPREE & SAVED LOCALLY
                </span>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-50 pb-2">
                  커스텀 프로젝트 제안 및 상담 신청
                </h3>

                {errorOccurred && (
                  <div className="rounded-lg bg-amber-50 p-3.5 border border-amber-200 text-xs text-amber-850 leading-relaxed">
                    ⚠️ <strong>안내:</strong> 실시간 양식 서버(Formspree)와 일시적인 통신 상태 불안정으로 인해 문의가 <strong>로컬 인박스 대시보드</strong>에 임시 안전 저장되었습니다. 관리자 패널의 문의 보관함을 통해 정상 조회가 유효합니다!
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">성함 또는 기업명</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="예: 홍길동 팀장 (주식회사 디자인)"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">이메일 주소</label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="example@design-lab.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">상세 제안 내용</label>
                  <textarea
                    name="message"
                    rows={4}
                    required
                    placeholder="구상하고 계신 방향성, 대략 선호하시는 일정 및 예산 범위를 편안하게 명시해 주세요."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs focus:bg-white focus:border-amber-400 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 text-xs font-bold shadow-md transition-all ${
                    submitting 
                      ? 'bg-gray-400 text-gray-105 cursor-not-allowed' 
                      : 'bg-gray-900 text-white hover:bg-gray-850 active:scale-98 cursor-pointer'
                  }`}
                >
                  <Send className={`h-3.5 w-3.5 ${submitting ? 'animate-pulse' : ''}`} /> 
                  {submitting ? '문의 제안 전송 중...' : '문의 제안서 제출하기'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
