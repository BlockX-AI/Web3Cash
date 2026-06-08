import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { WalletProvider } from './WalletProvider';

// Capture Offer18 tracking params from affiliate links and persist for auth.
// e.g. https://web3cash.com/?click_id=ABC123&aff_id=456&offer_id=789
(function captureOffer18Params() {
  const p = new URLSearchParams(window.location.search);
  const clickId = p.get('click_id') ?? p.get('clickid');
  const affId   = p.get('aff_id')   ?? p.get('affid');
  const offerId = p.get('offer_id') ?? p.get('offerid');
  if (clickId)  localStorage.setItem('o18_click_id',  clickId);
  if (affId)    localStorage.setItem('o18_aff_id',    affId);
  if (offerId)  localStorage.setItem('o18_offer_id',  offerId);
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>,
);
