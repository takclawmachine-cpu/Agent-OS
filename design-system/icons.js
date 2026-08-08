/* Central Agent OS icon registry: 24px grid, 1.8 stroke width. */
(() => {
  const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  sprite.setAttribute('width', '0');
  sprite.setAttribute('height', '0');
  sprite.setAttribute('aria-hidden', 'true');
  sprite.style.position = 'absolute';
  sprite.innerHTML = `<defs>
<symbol id="i-mail" viewBox="0 0 24 24"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></symbol>
<symbol id="i-code" viewBox="0 0 24 24"><path d="M8 6l-5 6 5 6"/><path d="M16 6l5 6-5 6"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3.5 3 14.5 0 18"/><path d="M12 3c-3 3.5-3 14.5 0 18"/></symbol>
<symbol id="i-users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6"/><circle cx="17" cy="8" r="2.6"/><path d="M15 14.2c2.7.5 5 2.6 5 5.8"/></symbol>
<symbol id="i-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9 12h6M12 9v6"/></symbol>
<symbol id="i-plug" viewBox="0 0 24 24"><path d="M9 3v6M15 3v6"/><path d="M6 9h12v3a6 6 0 0 1-12 0z"/><path d="M12 18v3"/></symbol>
<symbol id="i-git" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="9" r="2.5"/><path d="M6 8.5v7"/><path d="M6 15c0-4 4-4 8-4.5"/></symbol>
<symbol id="i-chat" viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z"/></symbol>
<symbol id="i-vault" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/></symbol>
<symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/></symbol>
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></symbol>
<symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></symbol>
<symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/></symbol>
<symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></symbol>
<symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></symbol>
<symbol id="i-terminal" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 10l3 3-3 3M13 16h4"/></symbol>
<symbol id="i-report" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6z"/><path d="M9 12h6M9 16h6M9 8h3"/></symbol>
<symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></symbol>
<symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
<symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></symbol>
<symbol id="i-inbox" viewBox="0 0 24 24"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v7H3v-7z"/></symbol>
<symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17h.01"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></symbol>
<symbol id="i-wifi-off" viewBox="0 0 24 24"><path d="M2 2l20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3-2.1M19 12.5a10 10 0 0 0-3.6-2.4"/><path d="M12 20h.01"/></symbol>
<symbol id="i-list" viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></symbol>
<symbol id="i-sparkles" viewBox="0 0 24 24"><path d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4z"/><path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7z"/></symbol>
<symbol id="i-activity" viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></symbol>
<symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></symbol>
<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></symbol>
</defs>`;
  document.body.prepend(sprite);
})();
