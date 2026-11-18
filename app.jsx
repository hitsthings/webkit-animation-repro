// Nested popups shaped like the failing case: a toolbar popup that stays open, a configuration popup inside it whose
// opening is debounced 150ms and whose closing is immediate, and a menu popup inside that. Escape closes the
// innermost open popup and also bumps state in the toolbar, as moving the editor selection does, so the outer
// popup re-renders during the exit.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimatePresence, motion } from 'motion/react';

const variants = {
  top: { initial: { opacity: 0, scale: 0.5, y: 10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.5, y: 10 } },
  bottom: { initial: { opacity: 0, scale: 0.5, y: -10 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.5, y: -10 } },
};

function Popup({ isOpen, label, placement = 'top', children }) {
  const v = variants[placement];
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="content" role="dialog" aria-label={label} {...v} transition={{ duration: 0.08 }}
          style={{ originX: 'center', originY: placement === 'top' ? 1 : 0, background: '#eee', padding: 8, margin: 8 }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function useDebouncedValue(value, ms) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return debounced;
}

function Toolbar() {
  const [selection, setSelection] = useState(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const debouncedConfigOpen = useDebouncedValue(configOpen, 150);
  const isConfigurationOpen = !configOpen ? false : debouncedConfigOpen;

  // A large app re-renders slowly; ?work=<ms> makes each toolbar render that follows Escape cost that much.
  const work = +new URLSearchParams(location.search).get('work') || 0;
  if (work && selection) { const end = performance.now() + work; while (performance.now() < end); }

  useEffect(() => {
    window.openConfig = () => setConfigOpen(true);
    window.openMenu = () => setMenuOpen(true);
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (menuOpen) { setMenuOpen(false); return; }
      if (configOpen) { setConfigOpen(false); setSelection(s => s + 1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, configOpen]);

  return (
    <Popup isOpen label="Toolbar" placement="bottom">
      <div data-selection={selection}>toolbar, selection {selection}</div>
      <Popup isOpen={isConfigurationOpen} label="Config">
        <input id="cfg-input" />
        <Popup isOpen={menuOpen} label="Menu" placement="bottom">
          <div>option A</div><div>option B</div>
        </Popup>
      </Popup>
    </Popup>
  );
}

createRoot(document.getElementById('root')).render(<Toolbar />);
