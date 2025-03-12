import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import TrendsPage from './pages/TrendsPage';
import AboutPage from './pages/AboutPage';
import PaperPage from './pages/PaperPage';
import EditorPage from './editor/EditorPage';
import LogoIcon from './assets/images/logo navbar.png';
import HomeIcon from './assets/images/home navbar.png';
import TrendIcon from './assets/images/trending navbar.png';
import AboutIcon from './assets/images/about icon white.png';
import AboutIconBlack from './assets/images/about icon black.png';
import HelpIcon from './assets/images/help navbar.png';
import logogif1 from './assets/gifs/logo1.gif';
import logogif_black from './assets/gifs/logo-black2.gif';
import HomeIconBlack from './assets/images/home navbar black.png';
import TrendIconBlack from './assets/images/trending navbar black.png';
import { appActivityManager } from './appActivityManager';
import { pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

const NavBar = ({ isHelpVisible, setIsHelpVisible }) => {
  const [logoSrc, setLogoSrc] = useState(LogoIcon);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggleHelpOverlay = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  return (
    <nav className="left-navbar">
      <div
        className="navbar-logo"
        onMouseEnter={() => setLogoSrc(logogif1)}
        onMouseLeave={() => setLogoSrc(LogoIcon)}
        onClick={() => navigate('/')}
      >
        <img src={logoSrc} alt="Logo" />
      </div>

      <ul className="nav-icons">
        <li className={isActive('/') ? 'active' : ''} onClick={() => navigate('/')}>
          <img src={HomeIcon} alt="Home Icon" />
        </li>
        <li className={isActive('/trending') ? 'active' : ''} onClick={() => navigate('/trending')}>
          <img src={TrendIcon} alt="Trend Icon" />
        </li>
        <li className={isActive('/about') ? 'active' : ''} onClick={() => navigate('/about')}>
          <img src={AboutIcon} alt="About Icon" />
        </li>
      </ul>

      <div className="help-button" onClick={toggleHelpOverlay}>
        <img src={HelpIcon} alt="Help Icon" />
      </div>
    </nav>
  );
};

const ExpandedNavBar = ({ closeOverlay }) => {
  const navRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const pageDescriptions = {
    "/": "This is the home page",
    "/trending": "Explore the latest AI trends",
    "/about": "About ResearchPaL",
  };

  const [currentDescription, setCurrentDescription] = useState(pageDescriptions[location.pathname] || pageDescriptions["/"]);

  useEffect(() => {
    setCurrentDescription(pageDescriptions[location.pathname] || pageDescriptions["/"]);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsClosing(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAnimationEnd = () => {
    if (isClosing) {
      closeOverlay();
    }
  };

  return (
    <nav
      ref={navRef}
      className={`expanded-navbar ${isClosing ? "slide-out" : "slide-in"}`}
      onAnimationEnd={handleAnimationEnd}
    >
      <div className="expanded-navbar-logo-container" onClick={() => navigate('/')}>
        <div>
          <img src={logogif_black} alt="logo-black" />
          <span>ResearchPaL</span>
        </div>
      </div>
      <ul className="expanded-nav-icons">
        <li
          className={isActive('/') ? 'active' : ''}
          onMouseEnter={() => setCurrentDescription(pageDescriptions["/"])}
          onMouseLeave={() => setCurrentDescription(pageDescriptions[location.pathname] || pageDescriptions["/"])}
          onClick={() => navigate('/')}
        >
          <img src={HomeIconBlack} alt="Home Icon black" />
          <div>
            <span>Home</span>
          </div>
        </li>

        <li
          className={isActive('/trending') ? 'active' : ''}
          onMouseEnter={() => setCurrentDescription(pageDescriptions["/trending"])}
          onMouseLeave={() => setCurrentDescription(pageDescriptions[location.pathname] || pageDescriptions["/"])}
          onClick={() => navigate('/trending')}
        >
          <img src={TrendIconBlack} alt="Trend Icon black" />
          <div>
            <span>Trending</span>
          </div>
        </li>

        <li
          className={isActive('/about') ? 'active' : ''}
          onMouseEnter={() => setCurrentDescription(pageDescriptions["/about"])}
          onMouseLeave={() => setCurrentDescription(pageDescriptions[location.pathname] || pageDescriptions["/"])}
          onClick={() => navigate('/about')}
        >
          <img src={AboutIconBlack} alt="About Icon black" />
          <div>
            <span>About</span>
          </div>
        </li>
      </ul>

      <div className="expanded-navbar-page-info">
        <span>{currentDescription}</span>
      </div>
    </nav>
  );
};

function App() {
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [localEncryptionKey, setLocalEncryptionKey] = useState(null);
  const location = useLocation();

  const storeLocalEncryptionKey = (value) => {
    setLocalEncryptionKey(value);
  };

  useEffect(() => {
    document.title = "ResearchPaL";
    appActivityManager();
  }, []);

  const isEditorRoute = location.pathname === "/editor";

  return (
    <div className="App">
      {!isEditorRoute && <NavBar isHelpVisible={isHelpVisible} setIsHelpVisible={setIsHelpVisible} />}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/trending" element={<TrendsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/paper" element={<PaperPage />} />
        <Route path="/editor" element={<EditorPage localEncryptionKey={localEncryptionKey} storeLocalEncryptionKey={storeLocalEncryptionKey} />}/>
      </Routes>

      {!isEditorRoute && isHelpVisible && (
        <div className="help-overlay">
          <ExpandedNavBar closeOverlay={() => setIsHelpVisible(false)} />
        </div>
      )}
    </div>
  );
}

export default App;