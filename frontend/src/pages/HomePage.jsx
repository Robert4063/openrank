import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProjects, getTopProjects, getHealthRanking } from '../api/github';
import { useErrorContext } from '../context/ErrorContext';
import HelpModal, { HelpIcon } from '../components/HelpModal';

// 搜索图标组件
const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

// OP Logo 组件 - 适合白色背景
const OPLogo = ({ size = 48 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* 背景圆 - 渐变填充 */}
    <circle cx="50" cy="50" r="48" fill="url(#logoBgGradient)"/>
    
    {/* 外圈装饰 */}
    <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
    
    {/* O - 左侧圆形 */}
    <circle cx="35" cy="50" r="16" stroke="white" strokeWidth="3.5" fill="none"/>
    {/* O 内部光点 */}
    <circle cx="35" cy="50" r="4" fill="white" opacity="0.9"/>
    
    {/* P - 右侧 */}
    <path d="M50 34 L50 66 M50 34 L63 34 C72 34 76 40 76 46 C76 52 72 58 63 58 L50 58" 
          stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    {/* P 内部装饰点 */}
    <circle cx="63" cy="46" r="3" fill="#22d3ee"/>
    
    {/* 脉冲动画线 */}
    <path d="M53 50 L58 50" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round">
      <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
    </path>
    
    {/* 渐变定义 */}
    <defs>
      <linearGradient id="logoBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed"/>
        <stop offset="50%" stopColor="#8b5cf6"/>
        <stop offset="100%" stopColor="#06b6d4"/>
      </linearGradient>
    </defs>
  </svg>
);

// 加载动画组件
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="relative">
      <div className="w-10 h-10 rounded-full border-2 border-gray-200"></div>
      <div className="absolute top-0 left-0 w-10 h-10 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"></div>
    </div>
    <span className="ml-4 text-gray-500" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>加载中...</span>
  </div>
);

// 潜力项目卡片组件（适合侧边栏）- 显示健康度评分
const PotentialProjectCard = ({ project, rank, onClick }) => {
  const getRankStyle = (rank) => {
    if (rank === 1) return { bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (rank === 2) return { bg: 'bg-blue-50', border: 'border-blue-200' };
    if (rank === 3) return { bg: 'bg-purple-50', border: 'border-purple-200' };
    return { bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  const style = getRankStyle(rank);
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  // 健康度颜色
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100';
    if (score >= 60) return 'text-blue-600 bg-blue-100';
    if (score >= 40) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const scoreColor = getScoreColor(project.final_score);

  return (
    <div 
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md
                  ${style.bg} ${style.border} border rounded-lg p-3`}
    >
      <div className="flex items-center gap-2">
        {/* 排名 */}
        <span className="text-lg flex-shrink-0" style={{ minWidth: '24px' }}>{medal}</span>
        
        {/* 项目信息 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-gray-800 truncate">
            {project.repo_name?.split('/')[1] || project.repo_name}
          </h4>
          <p className="text-xs text-gray-500 truncate">
            {project.repo_name?.split('/')[0]}
          </p>
        </div>
        
        {/* 健康度评分 */}
        <div className="flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${scoreColor}`}>
            {Math.round(project.final_score)}分
          </span>
        </div>
      </div>
    </div>
  );
};

// 最具潜力项目 - 左侧侧边栏组件（基于健康度排名）
const PotentialProjectsSidebar = ({ projects, onProjectClick, isLoading, error }) => {
  return (
    <div className="fixed left-0 top-0 h-[75vh] w-[12.5%] min-w-[160px] max-w-[200px] 
                    bg-white/95 backdrop-blur-sm border-r border-gray-200 shadow-sm z-30
                    flex flex-col">
      {/* 标题 */}
      <div className="p-3 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-1.5"
            style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
          <span className="text-emerald-500">🌟</span>
          <span>最具潜力</span>
        </h2>
      </div>
      
      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isLoading ? (
          // 加载骨架屏
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse"></div>
          ))
        ) : error || !projects?.length ? (
          // 错误状态
          <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
            <div className="text-2xl mb-2 opacity-50">⚠️</div>
            <p className="text-gray-500 text-xs">
              {error || '暂无数据'}
            </p>
          </div>
        ) : (
          // 项目列表
          projects.map((project, index) => (
            <PotentialProjectCard
              key={project.project || index}
              project={project}
              rank={index + 1}
              onClick={() => onProjectClick(project)}
            />
          ))
        )}
      </div>
      
      {/* 底部信息 */}
      <div className="p-2 border-t border-gray-100 text-center">
        <span className="text-[10px] text-gray-400">基于健康度评分排名</span>
      </div>
    </div>
  );
};

// 项目卡片组件 - 浅色风格
const ProjectCard = ({ project, onClick }) => (
  <div
    onClick={onClick}
    className="p-5 rounded-xl cursor-pointer transition-all duration-300
              bg-white border border-gray-200 
              hover:bg-gray-50 hover:border-purple-300 
              hover:shadow-lg hover:shadow-purple-100 hover:-translate-y-1"
    style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}
  >
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-semibold text-gray-800 text-base truncate pr-2">{project.repo_name}</h3>
      <span className="text-gray-400 text-sm group-hover:text-purple-500">→</span>
    </div>
    <div className="flex gap-5 text-sm text-gray-600">
      <span className="flex items-center gap-1.5">
        <span className="text-amber-500">⭐</span>
        <span className="text-amber-600 font-medium">{project.stars?.toLocaleString() || 0}</span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-cyan-600">🍴</span>
        <span className="text-cyan-700 font-medium">{project.forks?.toLocaleString() || 0}</span>
      </span>
    </div>
    {project.updated_at && (
      <p className="text-xs text-gray-500 mt-3">
        更新于 {project.updated_at}
      </p>
    )}
  </div>
);

// 热门项目轮播卡片 - 更大更精美的卡片
const CarouselCard = ({ project, rank, onClick }) => {
  const getRankBadge = (rank) => {
    if (rank === 1) return { emoji: '🥇', bg: 'from-amber-400 to-yellow-500', text: '第1名' };
    if (rank === 2) return { emoji: '🥈', bg: 'from-slate-300 to-slate-400', text: '第2名' };
    if (rank === 3) return { emoji: '🥉', bg: 'from-orange-400 to-amber-500', text: '第3名' };
    return { emoji: '🏅', bg: 'from-purple-400 to-indigo-500', text: `第${rank}名` };
  };

  const badge = getRankBadge(rank);

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-72 p-5 rounded-2xl cursor-pointer transition-all duration-300
                bg-white border border-gray-200 
                hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100 hover:-translate-y-2
                group"
      style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}
    >
      {/* 排名徽章 */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${badge.bg} text-white text-xs font-bold shadow-sm`}>
          <span>{badge.emoji}</span>
          <span>{badge.text}</span>
        </div>
        <span className="text-gray-300 group-hover:text-purple-400 transition-colors text-lg">→</span>
      </div>

      {/* 项目名称 */}
      <h3 className="font-bold text-gray-800 text-lg mb-1 truncate group-hover:text-purple-600 transition-colors">
        {project.repo_name?.split('/')[1] || project.repo_name}
      </h3>
      <p className="text-sm text-gray-400 mb-4 truncate">
        {project.repo_name?.split('/')[0]}
      </p>

      {/* 统计数据 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg">
          <span className="text-amber-500">⭐</span>
          <span className="text-amber-600 font-bold text-sm">
            {project.stars >= 1000 ? `${(project.stars / 1000).toFixed(1)}k` : project.stars}
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-50 px-3 py-1.5 rounded-lg">
          <span className="text-cyan-500">🍴</span>
          <span className="text-cyan-600 font-bold text-sm">
            {project.forks >= 1000 ? `${(project.forks / 1000).toFixed(1)}k` : project.forks || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

// 热门项目轮播组件
const TopProjectsCarousel = ({ projects, onProjectClick, isLoading }) => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // 检查滚动状态
  const checkScrollButtons = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  useEffect(() => {
    checkScrollButtons();
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkScrollButtons);
      return () => scrollEl.removeEventListener('scroll', checkScrollButtons);
    }
  }, [checkScrollButtons, projects]);

  // 自动滚动
  useEffect(() => {
    if (!projects?.length || isDragging) return;
    
    const interval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const maxScroll = scrollWidth - clientWidth;
        
        if (scrollLeft >= maxScroll - 10) {
          // 回到开头
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // 向右滚动一个卡片宽度
          scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [projects, isDragging]);

  // 按钮滚动
  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 鼠标拖拽滚动
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="text-2xl">🔥</span>
          <h2 className="text-xl font-bold text-gray-700">热门项目排行</h2>
        </div>
        <div className="flex gap-4 overflow-hidden px-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-72 h-44 rounded-2xl bg-gray-100 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!projects?.length) return null;

  return (
    <div className="py-8 relative">
      {/* 标题 */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-2xl animate-pulse">🔥</span>
        <h2 className="text-xl font-bold text-gray-700" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
          热门项目排行
        </h2>
        <span className="text-sm text-gray-400 ml-2">基于 Star 数量排序</span>
      </div>

      {/* 轮播容器 */}
      <div className="relative group">
        {/* 左滚动按钮 */}
        <button
          onClick={() => scroll('left')}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full 
                     bg-white/90 border border-gray-200 shadow-lg
                     flex items-center justify-center
                     transition-all duration-300
                     ${canScrollLeft 
                       ? 'opacity-0 group-hover:opacity-100 hover:bg-purple-50 hover:border-purple-300' 
                       : 'opacity-0 cursor-not-allowed'}`}
          disabled={!canScrollLeft}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* 右滚动按钮 */}
        <button
          onClick={() => scroll('right')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full 
                     bg-white/90 border border-gray-200 shadow-lg
                     flex items-center justify-center
                     transition-all duration-300
                     ${canScrollRight 
                       ? 'opacity-0 group-hover:opacity-100 hover:bg-purple-50 hover:border-purple-300' 
                       : 'opacity-0 cursor-not-allowed'}`}
          disabled={!canScrollRight}
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* 渐变遮罩 */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-gray-50 to-transparent z-[5] pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 to-transparent z-[5] pointer-events-none"></div>

        {/* 滚动区域 */}
        <div
          ref={scrollRef}
          className={`flex gap-5 overflow-x-auto px-8 py-2 scrollbar-hide scroll-smooth ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {projects.map((project, index) => (
            <CarouselCard
              key={project.id || index}
              project={project}
              rank={index + 1}
              onClick={() => !isDragging && onProjectClick(project)}
            />
          ))}
        </div>
      </div>

      {/* 滚动提示 */}
      <p className="text-center text-xs text-gray-400 mt-4">
        ← 拖拽或使用按钮滑动查看更多 →
      </p>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { addError } = useErrorContext();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(null);
  const [topProjects, setTopProjects] = useState([]);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [topError, setTopError] = useState(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // 健康度排名数据（用于左侧侧边栏）
  const [healthRanking, setHealthRanking] = useState([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // 防抖搜索
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // 加载健康度排名（用于左侧侧边栏"最具潜力"）
  useEffect(() => {
    const fetchHealthRanking = async () => {
      setIsLoadingHealth(true);
      setHealthError(null);
      try {
        const result = await getHealthRanking(5); // 只加载前5个
        if (!result.items || result.items.length === 0) {
          setHealthError('暂无健康度数据');
        }
        setHealthRanking(result.items || []);
      } catch (err) {
        console.error('获取健康度排名失败:', err);
        setHealthError(err.message || '无法获取健康度排名');
        if (err.details) {
          addError(err.details);
        }
      } finally {
        setIsLoadingHealth(false);
      }
    };
    fetchHealthRanking();
  }, [addError]);

  // 加载Top项目 - 用于轮播（基于 Star 数量）
  useEffect(() => {
    const fetchTopProjects = async () => {
      setIsLoadingTop(true);
      setTopError(null);
      try {
        const result = await getTopProjects(15);
        if (!result.items || result.items.length === 0) {
          setTopError('数据库连接失败或暂无数据');
        }
        setTopProjects(result.items || []);
      } catch (err) {
        console.error('获取Top项目失败:', err);
        setTopError(err.message || '无法连接到服务器，请检查后端服务');
        if (err.details) {
          addError(err.details);
        } else {
          addError({
            error_type: 'NetworkError',
            message: err.message || '获取Top项目失败',
            traceback: null
          });
        }
      } finally {
        setIsLoadingTop(false);
      }
    };
    fetchTopProjects();
  }, [addError]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 搜索项目
  const handleSearch = useCallback(async () => {
    if (!debouncedKeyword.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const result = await searchProjects({
        keyword: debouncedKeyword,
        limit: 50
      });
      setSearchResults(result.items || []);
    } catch (err) {
      console.error('搜索失败:', err);
      setError(err.message || '搜索失败，请确保后端服务已启动');
      if (err.details) {
        addError(err.details);
      } else {
        addError({
          error_type: 'SearchError',
          message: err.message || '搜索失败',
          traceback: null
        });
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [debouncedKeyword, addError]);

  // 当关键词变化时触发搜索
  useEffect(() => {
    handleSearch();
  }, [debouncedKeyword, handleSearch]);

  // 点击项目跳转详情页
  const handleProjectClick = (project) => {
    // 健康度排名的项目格式可能不同
    const projectKey = project.project_key || project.project || project.repo_name?.replace('/', '_');
    navigate(`/project/${encodeURIComponent(projectKey)}`);
  };

  return (
    <div className="min-h-screen grid-bg">
      {/* 左侧最具潜力项目侧边栏（基于健康度排名） */}
      <PotentialProjectsSidebar 
        projects={healthRanking} 
        onProjectClick={handleProjectClick}
        isLoading={isLoadingHealth}
        error={healthError}
      />

      {/* 右上角帮助按钮 */}
      <button
        onClick={() => setShowHelpModal(true)}
        className="fixed top-4 right-4 z-40 p-3 rounded-xl 
                   bg-white/90 backdrop-blur-sm border border-gray-200
                   text-gray-500 hover:text-purple-600 hover:border-purple-300
                   transition-all duration-300 group shadow-sm"
        title="帮助文档"
      >
        <HelpIcon />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 
                        bg-gray-800 text-xs text-gray-100 rounded whitespace-nowrap
                        opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          使用帮助
        </span>
      </button>

      {/* 帮助弹窗 */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

      {/* 主内容区域 - 添加左侧边距避开侧边栏 */}
      <div className="ml-[12.5%] min-w-0">
        {/* 顶部 Hero 区域 */}
        <div className="relative overflow-hidden">
          {/* 顶部装饰线 */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-300/40 to-transparent"></div>
          
          <div className="max-w-4xl mx-auto px-6 py-14 text-center relative">
            {/* OP Logo */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <OPLogo size={72} />
              </div>
            </div>
            
            {/* 标题 */}
            <h1 className="text-5xl font-bold mb-3 tracking-tight">
              <span className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent"
                    style={{ fontFamily: '"Noto Sans SC", "PingFang SC", sans-serif' }}>
                OpenPulse
              </span>
            </h1>
            <p className="text-lg text-slate-500 mb-10" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
              探索开源项目数据，发现社区趋势
            </p>

            {/* 大搜索框 - 浅色风格 */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索项目 (例如: react, vue, tensorflow...)"
                className="w-full pl-14 pr-6 py-4 bg-white border border-gray-200 rounded-xl 
                         text-gray-800 text-lg placeholder-gray-400
                         focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100
                         transition-all duration-300 shadow-sm"
                style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}
              />
              {isSearching && (
                <div className="absolute inset-y-0 right-0 pr-5 flex items-center">
                  <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* 快捷标签 */}
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {['react', 'vue', 'tensorflow', 'pytorch', 'rust'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchKeyword(tag)}
                  className="px-4 py-1.5 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 
                           hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 热门项目轮播 - 只在没有搜索时显示 */}
        {!searchKeyword && searchResults.length === 0 && (
          <TopProjectsCarousel 
            projects={topProjects}
            onProjectClick={handleProjectClick}
            isLoading={isLoadingTop}
          />
        )}

        {/* 分隔线 */}
        <div className="max-w-4xl mx-auto px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
        </div>

        {/* 搜索结果 */}
        <main className="max-w-6xl mx-auto px-6 py-8 pb-12">
          {/* 错误简单提示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
              <p className="text-red-400 text-xs mt-2 ml-11">
                点击右下角的错误图标查看详细日志
              </p>
            </div>
          )}

          {/* 搜索提示 - 只在没有搜索关键词时显示 */}
          {!searchKeyword && searchResults.length === 0 && !isLoadingTop && topProjects.length > 0 && (
            <div className="text-center py-8">
              <p className="text-slate-500 text-sm" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
                👆 浏览上方热门项目，或输入关键词搜索
              </p>
            </div>
          )}

          {/* 搜索提示 - 当没有数据时显示 */}
          {!searchKeyword && searchResults.length === 0 && !isLoadingTop && topProjects.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-6 opacity-40">🔍</div>
              <p className="text-slate-600 text-lg" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>输入关键词搜索开源项目</p>
              <p className="text-slate-400 mt-2" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
                支持搜索 Star 数 Top 300 的热门项目
              </p>
            </div>
          )}

          {/* 搜索中 */}
          {isSearching && <LoadingSpinner />}

          {/* 无结果 */}
          {!isSearching && searchKeyword && searchResults.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-6 opacity-40">📭</div>
              <p className="text-slate-600 text-lg" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>未找到相关项目</p>
              <p className="text-slate-400 mt-2" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>试试其他关键词</p>
            </div>
          )}

          {/* 结果网格 */}
          {!isSearching && searchResults.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-700" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
                  搜索结果
                  <span className="text-slate-400 font-normal ml-3 text-base">
                    ({searchResults.length} 个项目)
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((project, index) => (
                  <ProjectCard
                    key={project.id || index}
                    project={project}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* 底部 */}
        <footer className="py-8 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-6 text-center text-slate-400 text-sm" style={{ fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>
            <p>OpenPulse - 开源项目数据分析平台</p>
            <p className="mt-1">基于 GitHub 开源数据构建</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
