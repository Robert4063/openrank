import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * 全局错误状态管理 Context
 * 用于在应用程序任何地方记录和显示错误
 */
const ErrorContext = createContext(null);

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([]);

  // 添加错误
  const addError = useCallback((errorDetails) => {
    const newError = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...errorDetails
    };
    setErrors(prev => [...prev, newError]);
  }, []);

  // 清除所有错误
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // 清除单个错误
  const removeError = useCallback((errorId) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, addError, clearErrors, removeError }}>
      {children}
    </ErrorContext.Provider>
  );
};

// 自定义 Hook 用于访问错误上下文
export const useErrorContext = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};

export default ErrorContext;
