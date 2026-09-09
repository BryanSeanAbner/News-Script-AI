import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import QuickNewsPage from './pages/QuickNewsPage';
import SessionsPage from './pages/SessionsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/article/:id" element={<Layout><ArticleDetailPage /></Layout>} />
        <Route path="/new" element={<Layout><QuickNewsPage /></Layout>} />
        <Route path="/quick-news" element={<Layout><QuickNewsPage /></Layout>} />
        <Route path="/sessions" element={<Layout><SessionsPage /></Layout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

