import { useState, useEffect } from 'react';
import './Header.css';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? 'header--scrolled' : ''}`} id="main-header">
      <div className="header__inner">
        <div className="header__brand">
          <div className="header__logo" aria-label="logo">
            <div className="header__logo-icon">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="10" height="10" rx="2" fill="url(#grad1)" opacity="0.9"/>
                <rect x="16" y="2" width="10" height="10" rx="2" fill="url(#grad2)" opacity="0.6"/>
                <rect x="2" y="16" width="10" height="10" rx="2" fill="url(#grad2)" opacity="0.6"/>
                <rect x="16" y="16" width="10" height="10" rx="2" fill="url(#grad1)" opacity="0.9"/>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#0284c7"/>
                    <stop offset="1" stopColor="#38bdf8"/>
                  </linearGradient>
                  <linearGradient id="grad2" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#0ea5e9"/>
                    <stop offset="1" stopColor="#7dd3fc"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="header__logo-text">
              <span className="header__title">Image Analysis</span>
            </div>
          </div>
        </div>

        <nav className="header__nav" aria-label="Main navigation">
          <div className="header__status">
            <span className="header__status-dot"></span>
            <span className="header__status-text">System Ready</span>
          </div>
        </nav>
      </div>
    </header>
  );
}
