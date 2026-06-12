import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { WalletProvider } from './WalletProvider';
import { BrowserRouter } from 'react-router-dom';

// Capture Offer18 tracking params from affiliate links and persist for auth.
// e.g. https://web3cash.com/?click_id=ABC123&aff_id=456&offer_id=789
(function captureOffer18Params() {
  const p = new URLSearchParams(window.location.search);
  const clickId = p.get('click_id') ?? p.get('clickid');
  const affId   = p.get('aff_id')   ?? p.get('affid');
  const offerId = p.get('offer_id') ?? p.get('offerid');
  if (clickId) {
    localStorage.setItem('o18_click_id',  clickId);
    console.log('[Offer18] Captured click_id:', clickId);
  }
  if (affId) {
    localStorage.setItem('o18_aff_id',    affId);
    console.log('[Offer18] Captured aff_id:', affId);
  }
  if (offerId) {
    localStorage.setItem('o18_offer_id',  offerId);
    console.log('[Offer18] Captured offer_id:', offerId);
  }
  if (clickId || affId || offerId) {
    console.log('[Offer18] All captured params:', {
      clickId: localStorage.getItem('o18_click_id'),
      affId: localStorage.getItem('o18_aff_id'),
      offerId: localStorage.getItem('o18_offer_id'),
    });
  }
})();

// Capture referral code from ?ref= and persist for auth.
(function captureReferralCode() {
  const p = new URLSearchParams(window.location.search);
  const ref = p.get('ref');
  if (ref) localStorage.setItem('w3c_ref', ref);
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
