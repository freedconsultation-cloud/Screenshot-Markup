import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './components/App';
import Overlay from './components/Overlay';

const isOverlay = window.location.hash === '#overlay';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isOverlay ? <Overlay /> : <App />}
  </StrictMode>
);
