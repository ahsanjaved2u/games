'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import SignupRewardModal from '@/components/SignupRewardModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Shows the signup reward modal once per session for first-time / not-logged-in visitors.
 * Only shows if the user is not logged in.
 * Respects the admin-configured signupReward (hides if 0 but still prompts to sign up).
 */
export default function FirstVisitPrompt() {
  const { isLoggedIn, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [reward, setReward] = useState(0);

  useEffect(() => {
    if (loading || isLoggedIn) return;

    // Check if already dismissed this session
    if (sessionStorage.getItem('gz_signup_dismissed')) return;

    // Check if this is a first-time visitor (never visited before)
    const hasVisited = localStorage.getItem('gz_has_visited');

    // Fetch signup reward setting
    (async () => {
      try {
        const res = await fetch(`${API}/settings/public`);
        const data = await res.json();
        const amount = Number(data.signupReward) || 0;
        setReward(amount);

        // Show modal for first-time visitors, or if there's a reward to offer
        if (!hasVisited || amount > 0) {
          // Small delay so the page loads first
          setTimeout(() => setShow(true), 1500);
          localStorage.setItem('gz_has_visited', '1');
        }
      } catch { /* ignore */ }
    })();
  }, [loading, isLoggedIn]);

  // Hide when user logs in
  useEffect(() => {
    if (isLoggedIn) setShow(false);
  }, [isLoggedIn]);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('gz_signup_dismissed', '1');
  };

  return (
    <SignupRewardModal
      show={show}
      rewardAmount={reward}
      onClose={handleClose}
      context="first-visit"
    />
  );
}
