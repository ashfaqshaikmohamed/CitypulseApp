// FILE: frontend/components/AuthButton.tsx
// ROLE: Renders the custom glass-panel Google Sign-In trigger or the matching dropdown interactive state when authenticated.

'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface UserData {
  id: string;
  email: string;
  name: string;
  avatar_url: string;
}

export const AuthButton: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read local storage on mount
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('citypulse_token');
    const storedUser = localStorage.getItem('citypulse_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed parsing cached user profile: ", e);
      }
    }
  }, []);

  // Load GIS client library
  useEffect(() => {
    if (!mounted) return;

    // Load GIS script
    const scriptId = 'google-gsi-client';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    const initGsi = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id_placeholder',
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Also render standard button inside a hidden div, so if prompt fails we have standard trigger or can render it
        const btnDiv = document.getElementById('gsi-hidden-button');
        if (btnDiv) {
          google.accounts.id.renderButton(btnDiv, {
            type: 'standard',
            theme: 'dark',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
      }
    };

    script.onload = () => {
      initGsi();
    };

    // If script already loaded
    if ((window as any).google?.accounts?.id) {
      initGsi();
    }
  }, [mounted]);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    if (!response.credential) return;

    try {
      const apiBaseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const fetchResp = await fetch(`${apiBaseURL}/api/auth/verify-google-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      });

      if (!fetchResp.ok) {
        throw new Error(`Auth verification failed with status: ${fetchResp.status}`);
      }

      const data = await fetchResp.json();
      localStorage.setItem('citypulse_token', data.token);
      localStorage.setItem('citypulse_user', JSON.stringify(data.user));

      // Refresh to flush application-wide auth context
      window.location.reload();
    } catch (err) {
      console.error("Backend login verification failure: ", err);
      alert("Verification failed with the municipal database. Please try again.");
    }
  };

  const handleSignInClick = () => {
    const google = (window as any).google;
    if (google?.accounts?.id) {
      // Trigger prompt
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("GSI prompt suppressed or skipped. Triggering hidden original button.");
          const btn = document.querySelector('#gsi-hidden-button [role="button"]') as HTMLElement;
          if (btn) {
            btn.click();
          } else {
            // Find any iframe inside gsi-hidden-button and post click or just render it visible
            const container = document.getElementById('gsi-hidden-button');
            if (container) {
              container.style.display = 'block';
              container.style.opacity = '1';
            }
          }
        }
      });
    } else {
      console.warn("Google Sign-In API is still bootstrapping...");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('citypulse_token');
    localStorage.removeItem('citypulse_user');
    window.location.reload();
  };

  if (!mounted) {
    return <div className="w-[150px] h-9 rounded-lg bg-[var(--navy3)] animate-pulse" />;
  }

  // Not signed-in State
  if (!user) {
    return (
      <div className="relative flex items-center">
        <button
          id="auth-gsi-signin"
          onClick={handleSignInClick}
          className="glass-panel flex items-center gap-2.5 px-4 py-2 hover:bg-[var(--navy3)] transition-all cursor-pointer text-left"
          style={{
            borderRadius: '8px',
            fontFamily: 'var(--font-dm-sans), sans-serif',
          }}
        >
          {/* SVG Google logo */}
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-[12px] font-normal text-[var(--offwhite2)] tracking-wide">
            Sign in with Google
          </span>
        </button>

        {/* Real hidden container for the official GSI iframe button callback fallback */}
        <div 
          id="gsi-hidden-button" 
          className="absolute left-0 top-full mt-1 z-50 pointer-events-auto"
          style={{ display: 'none', opacity: 0, width: '200px' }}
        />
      </div>
    );
  }

  const truncatedName = user.name.length > 14 ? `${user.name.substring(0, 12)}...` : user.name;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="auth-profile-dropdown-trigger"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="glass-panel flex items-center gap-2 px-3 py-1.5 hover:bg-[var(--navy3)] transition-all cursor-pointer"
        style={{ borderRadius: '8px' }}
      >
        <img
          src={user.avatar_url || 'https://www.gravatar.com/avatar/?d=mp'}
          alt={user.name}
          className="w-6 h-6 rounded-full border border-[var(--blue3)] shrink-0 object-cover"
        />
        <span 
          className="text-xs font-semibold text-[var(--offwhite)] hidden sm:inline"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {truncatedName}
        </span>
      </button>

      {/* Interactive Dropdown List */}
      {dropdownOpen && (
        <div
          id="auth-profile-dropdown"
          className="glass-panel absolute right-0 mt-2 w-44 shadow-2xl border border-[var(--border)] py-1.5 z-50 flex flex-col items-stretch"
          style={{ 
            background: 'rgba(7,21,40,0.96)', 
            borderRadius: '8px',
            fontFamily: 'var(--font-dm-sans), sans-serif'
          }}
        >
          <div className="px-3 py-2 border-b border-[var(--border)]/40 mb-1">
            <p className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">Citizen Account</p>
            <p className="text-xs font-bold text-[var(--offwhite)] truncate mt-0.5">{user.name}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setDropdownOpen(false)}
            className="px-3 py-2 text-[11px] text-[var(--offwhite2)] hover:bg-[var(--navy3)] hover:text-white transition-colors text-left font-medium"
          >
            My Reports
          </Link>

          <button
            onClick={handleSignOut}
            className="px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-left font-medium border-t border-[var(--border)]/40 mt-1"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthButton;
