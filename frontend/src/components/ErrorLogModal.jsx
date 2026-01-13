import React, { useState, useEffect } from 'react';

/**
 * 错误日志弹窗组件
 * 用于显示详细的错误信息，包括traceback
 */
export const ErrorLogModal = ({ isOpen, onClose, errorDetails }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !errorDetails) return null;

  const handleCopy = () => {
    const errorText = `
错误类型: ${errorDetails.error_type || 'Unknown'}
错误信息: ${errorDetails.error || errorDetails.message || 'Unknown'}
时间: ${new Date().toLocaleString('zh-CN')}

Traceback:
${errorDetails.traceback || 'No traceback available'}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-gray-800 font-bold text-lg">错误详情</h3>
              <p className="text-gray-400 text-xs">Error Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 内容区 */}
        <div className="p-5 overflow-y-auto max-h-[55vh]">
          {/* 错误类型和消息 */}
          <div className="mb-5 p-4 bg-red-50 rounded-xl border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-600 text-xs font-mono bg-red-100 px-2 py-1 rounded-lg font-medium">
                {errorDetails.error_type || 'Error'}
              </span>
            </div>
            <p className="text-red-700 text-sm font-medium leading-relaxed">
              {errorDetails.error || errorDetails.message || 'Unknown error'}
            </p>
          </div>
          
          {/* Traceback */}
          {errorDetails.traceback && (
            <div className="mb-5">
              <h4 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Traceback / 调用栈
              </h4>
              <pre className="bg-gray-900 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                {errorDetails.traceback}
              </pre>
            </div>
          )}
          
          {/* 额外信息 */}
          {(errorDetails.url || errorDetails.method) && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              {errorDetails.method && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-gray-400 block mb-1">请求方法</span>
                  <span className="text-gray-700 font-mono font-medium">{errorDetails.method}</span>
                </div>
              )}
              {errorDetails.url && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <span className="text-gray-400 block mb-1">请求地址</span>
                  <span className="text-gray-700 font-mono truncate block">{errorDetails.url}</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 底部操作 */}
        <div className="flex items-center justify-between p-5 border-t border-gray-100 bg-gray-50">
          <p className="text-gray-400 text-xs">
            复制错误信息可帮助开发者快速定位问题
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                copied 
                  ? 'bg-green-100 text-green-600 border border-green-200' 
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  复制日志
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 浮动错误通知图标组件
 * 当有错误时在右下角显示一个可点击的图标
 */
export const FloatingErrorIcon = ({ errors = [], onClear }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 当有新错误时触发动画
  useEffect(() => {
    if (errors.length > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [errors.length]);

  if (errors.length === 0) return null;

  const handleErrorClick = (error) => {
    setSelectedError(error);
    setShowModal(true);
    setIsExpanded(false);
  };

  const handleClearAll = () => {
    onClear && onClear();
    setIsExpanded(false);
  };

  return (
    <>
      {/* 浮动图标 */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* 展开的错误列表 */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-2 animate-in slide-in-from-bottom-4 duration-200">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  错误日志 ({errors.length})
                </h4>
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  全部清除
                </button>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {errors.map((error, index) => (
                <div
                  key={index}
                  onClick={() => handleErrorClick(error)}
                  className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 group-hover:bg-red-200 transition-colors">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {error.error_type || 'Error'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {error.message || error.error || '未知错误'}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-gray-50 text-center">
              <p className="text-xs text-gray-400">点击查看详细错误信息</p>
            </div>
          </div>
        )}

        {/* 主图标按钮 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${
            isAnimating ? 'animate-bounce' : ''
          } ${isExpanded ? 'rotate-0' : ''}`}
          style={{
            boxShadow: isAnimating 
              ? '0 0 20px rgba(239, 68, 68, 0.5), 0 10px 25px rgba(239, 68, 68, 0.3)' 
              : '0 10px 25px rgba(239, 68, 68, 0.25)'
          }}
        >
          {/* 脉冲动画 */}
          {isAnimating && (
            <span className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-30"></span>
          )}
          
          {/* 图标 */}
          <svg className="w-6 h-6 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          
          {/* 错误数量徽章 */}
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-white text-red-500 text-xs font-bold rounded-full flex items-center justify-center shadow-md border-2 border-red-500">
            {errors.length > 9 ? '9+' : errors.length}
          </span>
        </button>
      </div>

      {/* 错误详情弹窗 */}
      <ErrorLogModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedError(null);
        }}
        errorDetails={selectedError}
      />
    </>
  );
};

/**
 * 错误提示条组件 - 可点击查看详情 (保留向后兼容)
 */
export const ErrorAlert = ({ message, errorDetails, className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const hasDetails = errorDetails && (errorDetails.traceback || errorDetails.error_type);

  return (
    <>
      <div 
        className={`bg-red-50 border border-red-200 rounded-xl p-4 ${hasDetails ? 'cursor-pointer hover:bg-red-100 transition-colors' : ''} ${className}`}
        onClick={() => hasDetails && setShowModal(true)}
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-red-700 font-medium">{message || '发生错误'}</p>
            {hasDetails && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                点击查看详细错误日志
              </p>
            )}
          </div>
        </div>
      </div>
      
      {hasDetails && (
        <ErrorLogModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          errorDetails={errorDetails} 
        />
      )}
    </>
  );
};

export default ErrorLogModal;
