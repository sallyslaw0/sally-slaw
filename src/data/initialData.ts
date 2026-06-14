/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PortfolioItem, SiteSettings, HistoryItem } from '../types';

export const INITIAL_ITEMS: PortfolioItem[] = [
  {
    id: 'sallys-identity',
    title: '샐리의 법칙 (Sally\'s Law) 크리에이티브 스튜디오 브랜드 아이덴티티',
    category: 'Artist(아티스트)',
    summary: '긍정적인 우연과 조화로운 균형을 시각화한 스튜디오 자체 리브랜딩 및 브랜드 에셋 패키지 개발',
    description: '샐리의 법칙 (Sally\'s Law) 크리에이티브 아틀리에의 통합 아이덴티티 시스템입니다. 머피의 법칙과 반대되는 "일이 항상 유리하고 긍정적으로 진행되는 현상"을 디자인 메커니즘으로 환원하여, 정형화된 형태를 깨부수고 자유롭게 뻗어나가는 선과 면을 노란색과 순수 화이트 컬러의 대비로 정교하게 표현했습니다.\n\n사용자 인터페이스, 스테이셔너리 카드, 금박 가공 봉투, 그리고 굿즈 디자인 전반에 걸쳐 하이엔드 미니멀리즘 감각을 주입했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZeaM68cK3v4', // Beautiful architectural / graphic design vibe placeholder
    client: '샐리의 법칙 아틀리에',
    year: '2026',
    tags: ['Branding', 'Typography', 'Stationery', 'Gold Foil'],
    order: 0
  },
  {
    id: 'minimal-editorial',
    title: '오가닉 아키텍처: 자연과 기하학의 접점 화보집 에디토리얼',
    category: 'Stage(무대)',
    summary: '여백의 미학을 극대화하여 스위스 타이포그래피 스타일과 그리드 시스템을 정립한 프리미엄 서적 디자인',
    description: '아름다운 오가닉 건축물들의 단면과 실루엣을 깊이 있게 수록한 한정판 단행본 에디토리얼 디자인 프로젝트입니다. 서체 크기의 격차, 극단적인 비대칭 그리드, 고대비 지질 선택 및 골드 메탈릭 실크스크린 바인딩 등 촉각적인 완성도에 초점을 정밀하게 투사하였습니다.\n\n각 챕터 도입부에는 샐리의 밝은 옐로우 액센트 간지를 배치하여 책을 연 순간 독자에게 극적인 시각 경험을 전달하도록 구동했습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=1200&auto=format&fit=crop',
    youtubeUrl: 'https://www.youtube.com/watch?v=vVkaAnY1QYI', // High quality abstract video
    client: '도서출판 아침향기',
    year: '2025',
    tags: ['Editorial Book', 'Swiss Typo', 'Lay-out', 'Print Design'],
    order: 1
  },
  {
    id: 'fortuna-uiux',
    title: '포르투나 (Fortuna) - 일상의 기분 좋은 성취를 이끄는 하이엔드 모바일 앱',
    category: 'Concert hall landscape(공연장)',
    summary: '사용자 중심의 부드러운 스태거 마이크로 애니메이션 and 빛나는 황금빛 톤 시스템을 융합한 웰니스 앱',
    description: '바쁜 일상에서 주도성과 긍정적인 생각의 습관을 배양하기 위한 미디테이션 & 해빗 트래커 모바일 플랫폼 UI/UX 설계 프로세스입니다. 직관적이면서도 고급스러운 그래디언트 위젯, 터치 리액티브 다이얼 휠, 그리고 성과를 달성했을 때 아우라처럼 번지는 노란빛 블러 광원 이펙트를 메인 테마로 탑재했습니다. 다크 모드와 라이트 모드 간의 유려한 스키마 전환을 고려한 가독성 확보에 심혈을 기울였습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?q=80&w=1200&auto=format&fit=crop',
    youtubeUrl: 'https://www.youtube.com/watch?v=hID_O_tL9Qg', // App interactive presentation vibe placeholder
    client: '포르투나 랩스',
    year: '2026',
    tags: ['Mobile Application', 'UX Research', 'Micro-Interactions', 'Figma Wireframe'],
    order: 2
  },
  {
    id: 'luminary-packaging',
    title: '루미너리 (Luminary) 프리미엄 수제 홈 프래그런스 패키징',
    category: 'Audience(관람객)',
    summary: '재생 한지와 천연 콩기름 잉크를 결합한 친환경 럭셔리 퍼퓸 센트 스ティック 패키징 프로젝트',
    description: '자연에서 온 향을 집안에 물들인다는 컨셉을 가진 하이엔드 디퓨저 브랜드 루미너리의 패키지 리뉴얼입니다. 장인이 제작한 천연 한지박스 위에 한 줄기 찬란한 노란 광선이 지나가는 모습을 정밀 인쇄 기법으로 표현하여 기대를 한껏 증폭시켰습니다. 내부 고정재 또한 분해성이 높은 천연 펄프 몰드를 형상화하여 우아한 오픈박스 경험(Unboxing Experience)을 조각해냈습니다.',
    imageUrl: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=1200&auto=format&fit=crop',
    client: '루미너리 서울',
    year: '2025',
    tags: ['Package Design', 'Eco-Luxury', 'Eco-Paper', 'Gold Stamp'],
    order: 3
  }
];

export const INITIAL_SETTINGS: SiteSettings = {
  accentColor: '#F3C623', // Clean sophisticated yellow/gold
  bgColor: '#FFFFFF', // Pure white default
  fontFamily: 'sans', // Modern sans-serif Inter style
  baseFontSize: 16, // Comfortable 16px
  siteTitle: '샐리의 법칙',
  siteSubtitle: 'Sally\'s Law - 프리미엄 디자인 & 크리에이티브 포트폴리오 아틀리에',
  contactEmail: 'sallyslaw0@daum.net',
  contactPhone: '02-543-2026',
  instagramUrl: 'https://instagram.com/sallyslaw.design',
  youtubeUrl: 'https://www.youtube.com/@SallysLaw-sx3cg',
  behanceUrl: 'https://behance.net/sallyslaw'
};

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'history-1',
    year: '2026',
    projectName: '샐리의 법칙 (Sally\'s Law) 크리에이티브 디자인 아틀리에 개편',
    description: '디자인 철학과 미니멀 포트폴리오를 디지털 쇼케이스로 일원화 구축 완료'
  },
  {
    id: 'history-2',
    year: '2025',
    projectName: '오가닉 아키텍처 한정판 아트 에디토리얼 화보집',
    description: '도서출판 아침향기 아트 에렉션 및 아카이브 서적 타이포그래피 개발'
  },
  {
    id: 'history-3',
    year: '2025',
    projectName: '포르투나 (Fortuna) 웰니스 라이브러리 UI/UX 설계',
    description: '포르투나 랩스 모바일 애플리케이션 화면 마이크로 인터랙션 특화 모듈 개발'
  },
  {
    id: 'history-4',
    year: '2024',
    projectName: '루미너리 서울 패키징 신년 리미티드 세트',
    description: '전국 온/오프라인 전시장 전량 매진 달성 및 친환경 콩기름 지질 어워드 디자인 선정'
  }
];

