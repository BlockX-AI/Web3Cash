import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer relative bg-[#F5F5F5]">
      <div className="footer-inner mx-auto w-full mb-4 px-12 md:px-20 py-24 rounded-2xl bg-[#2B2644] text-white relative overflow-hidden" style={{ maxWidth: 'calc(100% - 2rem)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-6">
          <div>
            <h3 className="text-4xl font- mb-4">Contacts</h3>
            <a href="mailto:client@web3cash.com" className="hover:underline" style={{ color: '#f97316' }}>client@web3cash.com</a>
          </div>

          <div className="flex items-start justify-end gap-6 text-sm opacity-90">
            <a href="#" className="hover:underline">Instagram↗</a>
            <a href="#" className="hover:underline">Github↗</a>
            <a href="#" className="hover:underline">Twitter↗</a>
            <a href="#" className="hover:underline">LinkedIn↗</a>
          </div>
        </div>

        <div className="footer-watermark pointer-events-none">Web3CAsh</div>
        <div className="footer-dot top-left" />
        <div className="footer-dot top-right" />
        <div className="footer-dot bottom-left" />
        <div className="footer-dot bottom-right" />
      </div>
    </footer>
  );
}
