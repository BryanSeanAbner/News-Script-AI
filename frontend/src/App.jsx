import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ArticleDetailPage from './pages/ArticleDetailPage';
import Step1Page from './pages/Step1Page';
import AIStepPage from './pages/AIStepPage';
import Step5Page from './pages/Step5Page';
import Step9Page from './pages/Step9Page';
import Step10Page from './pages/Step10Page';
import SessionsPage from './pages/SessionsPage';

// AI steps: 2 (Fact Extraction), 3 (Gap Analysis & Angle Mapping), 5 (Draft Generation), 6 (Grounding Check)
const AI_STEPS = [2, 3, 5, 6];

function StepRouter() {
  const { id, stepNumber } = useParams();
  const step = parseInt(stepNumber, 10);

  if (step === 1) return <Step1Page key={`${id}-1`} />;
  if (step === 4) return <Step5Page key={`${id}-4`} />;
  if (step === 7) return <Step9Page key={`${id}-7`} />;
  if (step === 8) return <Step10Page key={`${id}-8`} />;
  if (AI_STEPS.includes(step)) return <AIStepPage key={`${id}-${stepNumber}`} />;

  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><DashboardPage /></Layout>} />
        <Route path="/article/:id" element={<Layout><ArticleDetailPage /></Layout>} />
        <Route path="/new" element={<Layout><Step1Page /></Layout>} />
        <Route path="/sessions" element={<Layout><SessionsPage /></Layout>} />
        <Route
          path="/session/:id/step/:stepNumber"
          element={<Layout><StepRouter /></Layout>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
