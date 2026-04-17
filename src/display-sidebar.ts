export function initSidebar(opts: {
  currentUrl: () => string;
  onUrlLoad: (url: string) => void;
  onReactionsToggle: () => void;
}): void {
  const hoverZone = document.getElementById('sidebar-hover-zone')!;
  const sidebar = document.getElementById('sidebar')!;
  const urlForm = document.getElementById('sidebar-url-form') as HTMLFormElement;
  const urlInput = document.getElementById(
    'sidebar-url-input',
  ) as HTMLInputElement;
  const btnReactions = document.getElementById('btn-reactions')!;
  const btnFullscreen = document.getElementById('btn-fullscreen')!;

  function openSidebar(): void {
    sidebar.classList.add('sidebar-open');
  }

  function closeSidebar(): void {
    sidebar.classList.remove('sidebar-open');
  }

  hoverZone.addEventListener('mouseenter', openSidebar);
  hoverZone.addEventListener('mouseleave', closeSidebar);
  sidebar.addEventListener('mouseenter', openSidebar);
  sidebar.addEventListener('mouseleave', closeSidebar);

  urlInput.value = opts.currentUrl();

  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (url) opts.onUrlLoad(url);
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      urlInput.value = opts.currentUrl();
      urlInput.blur();
    }
  });

  btnReactions.addEventListener('click', () => {
    opts.onReactionsToggle();
    btnReactions.classList.toggle('sb-btn-active');
  });

  btnFullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
}
