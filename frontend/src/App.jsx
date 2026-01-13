import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import AiAssistant from './components/AiAssistant';
import { ErrorProvider, useErrorContext } from './context/ErrorContext';
import { FloatingErrorIcon } from './components/ErrorLogModal';

// 全局错误通知图标包装组件
const GlobalErrorNotification = () => {
  const { errors, clearErrors } = useErrorContext();
  
  return (
    <FloatingErrorIcon 
      errors={errors} 
      onClear={clearErrors}
    />
  );
};

function App() {
  return (
    <ErrorProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/project/:projectKey" element={<ProjectPage />} />
        </Routes>
        {/* AI小助手 - 全局显示在所有页面 */}
        <AiAssistant />
        {/* 全局错误通知图标 */}
        <GlobalErrorNotification />
      </BrowserRouter>
    </ErrorProvider>
  );
}

export default App;
