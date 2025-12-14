import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AppProvider } from './context/AppContext';
import { HabitsProvider } from './context/HabitsContext';
import { PlannerProvider } from './context/PlannerContext';
import './index.css';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.log('SW registration failed:', error);
        });
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <BrowserRouter>
            <AppProvider>
                <PlannerProvider>
                    <HabitsProvider>
                        <App />
                    </HabitsProvider>
                </PlannerProvider>
            </AppProvider>
        </BrowserRouter>
    </React.StrictMode>
);
