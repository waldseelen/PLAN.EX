import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import {
    CalendarPage,
    CourseDetailPage,
    CoursesPage,
    HabitDetailPage,
    HabitsDashboardPage,
    OverviewPage,
    StatisticsPage,
} from './pages';

function App() {
    return (
        <Layout>
            <Routes>
                {/* Planner Routes */}
                <Route path="/" element={<OverviewPage />} />
                <Route path="/courses" element={<CoursesPage />} />
                <Route path="/courses/:courseId" element={<CourseDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />

                {/* Habits Routes */}
                <Route path="/habits" element={<HabitsDashboardPage />} />
                <Route path="/habits/:habitId" element={<HabitDetailPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Layout>
    );
}

export default App;
