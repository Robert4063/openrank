import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSimilarProjects, getProjectLanguages } from '../api/github';

// 关闭图标
const CloseIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * 相似项目模态框 - 白色主题风格
 */
const SimilarProjectsModal = ({ isOpen, onClose, projectName, currentScore, currentGrade }) => {
  const navigate = useNavigate();
  const [similarProjects, setSimilarProjects] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('similar'); // 'similar' | 'languages'

  useEffect(() => {
    if (isOpen && projectName) {
      fetchData();
    }
  }, [isOpen, projectName]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 并行获取数据，但分别处理错误
      const [similarResult, langResult] = await Promise.allSettled([
        getSimilarProjects(projectName, 5),
        getProjectLanguages(projectName)
      ]);
      
      // 处理相似项目数据
      if (similarResult.status === 'fulfilled') {
        const similarData = similarResult.value;
        const projects = (similarData.similar_projects || []).map(p => ({
          ...p,
          // 将分数差距转换为相似度百分比（差距越小，相似度越高）
          similarity: Math.max(0, (100 - p.score_diff) / 100)
        }));
        setSimilarProjects(projects);
      } else {
        console.error('获取相似项目失败:', similarResult.reason);
        setSimilarProjects([]);
      }
      
      // 处理语言数据（即使有错误也尝试提取数据）
      if (langResult.status === 'fulfilled') {
        const langData = langResult.value;
        // 检查是否有 GitHub API 错误
        if (langData.error) {
          console.warn('GitHub API 限制:', langData.error);
          setLanguages([]);
        } else {
          setLanguages(langData.languages || []);
        }
      } else {
        console.error('获取语言数据失败:', langResult.reason);
        setLanguages([]);
      }
    } catch (err) {
      console.error('获取数据失败:', err);
      setError(err.message || '获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectClick = (project) => {
    const projectKey = project.project_key || project.project?.replace('/', '_');
    if (projectKey) {
      onClose();
      navigate(`/project/${encodeURIComponent(projectKey)}`);
    }
  };

  const getGradeColor = (grade) => {
    const colors = {
      'S': '#fbbf24',
      'A': '#a855f7',
      'B': '#3b82f6',
      'C': '#22c55e',
      'D': '#6b7280'
    };
    return colors[grade] || '#6b7280';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-orange-500 rounded" />
            <div>
              <h3 className="text-slate-600 uppercase tracking-widest text-sm font-medium">
                PROJECT ANALYSIS
              </h3>
              <p className="text-slate-400 text-xs mt-0.5 font-mono">{projectName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors rounded-lg"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('similar')}
            className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-widest transition-colors ${
              activeTab === 'similar'
                ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            相似项目
          </button>
          <button
            onClick={() => setActiveTab('languages')}
            className={`flex-1 px-4 py-3 text-sm font-medium uppercase tracking-widest transition-colors ${
              activeTab === 'languages'
                ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            技术栈
          </button>
        </div>
        
        {/* 内容区 */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
              <span className="ml-3 text-slate-400 text-sm uppercase tracking-wider">Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : activeTab === 'similar' ? (
            /* 相似项目列表 */
            <div className="space-y-2">
              {similarProjects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm uppercase tracking-wider">
                  NO SIMILAR PROJECTS
                </div>
              ) : (
                similarProjects.map((project, index) => (
                  <div
                    key={index}
                    onClick={() => handleProjectClick(project)}
                    className="p-4 bg-slate-50 border border-slate-200 hover:border-orange-300 
                             cursor-pointer transition-all group rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-mono text-sm">#{index + 1}</span>
                        <div>
                          <h4 className="text-slate-700 font-medium font-mono group-hover:text-orange-500 transition-colors">
                            {project.project?.replace('_', '/') || project.project_key?.replace('_', '/')}
                          </h4>
                          <p className="text-slate-400 text-xs mt-1">
                            分数差: <span className="text-cyan-600 font-mono">{project.score_diff?.toFixed(1) || '-'}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-slate-400 text-[10px] uppercase tracking-wider">Score</p>
                          <p className="font-mono font-bold text-lg" style={{ color: getGradeColor(project.grade) }}>
                            {project.final_score?.toFixed(0) || '-'}
                          </p>
                        </div>
                        <div 
                          className="w-10 h-10 flex items-center justify-center border-2 font-mono text-xl font-bold rounded-lg"
                          style={{ borderColor: getGradeColor(project.grade), color: getGradeColor(project.grade) }}
                        >
                          {project.grade || '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* 技术栈分布 */
            <div className="space-y-3">
              {languages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">
                    暂无语言数据
                  </div>
                  <p className="text-slate-400 text-xs">
                    GitHub API 速率限制，请稍后再试
                  </p>
                </div>
              ) : (
                languages.map((lang, index) => (
                  <div key={index} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: lang.color || '#6b7280' }}
                        />
                        <span className="text-slate-600 text-sm font-mono">{lang.name}</span>
                      </div>
                      <span className="text-slate-400 text-xs font-mono">{lang.percentage?.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${lang.percentage || 0}%`,
                          backgroundColor: lang.color || '#6b7280'
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="uppercase tracking-wider">
              {activeTab === 'similar' ? `${similarProjects.length} SIMILAR` : `${languages.length} LANGUAGES`}
            </span>
            <div className="flex items-center gap-4">
              <span>当前评分: <span className="text-slate-700 font-mono">{currentScore?.toFixed(0) || '-'}</span></span>
              <span 
                className="font-mono font-bold px-2 py-0.5 border rounded"
                style={{ borderColor: getGradeColor(currentGrade), color: getGradeColor(currentGrade) }}
              >
                {currentGrade || '-'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarProjectsModal;
