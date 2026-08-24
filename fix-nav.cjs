const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

if (!code.includes('isNavVisible')) {
  const stateInjection = `  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY.current + 10) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current - 10) {
        setIsNavVisible(true);
      }
      // Keep it visible if near the top
      if (currentScrollY < 50) {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
`;
  
  code = code.replace('const [isFetchingNote, setIsFetchingNote] = useState(false);', 'const [isFetchingNote, setIsFetchingNote] = useState(false);\n' + stateInjection);
  code = code.replace('<nav className={`fixed bottom-0 left-0 right-0 border-t pb-safe z-40 px-6 py-2 ${t.nav}`}>', '<nav className={`fixed left-0 right-0 border-t pb-safe z-40 px-6 py-2 transition-all duration-300 ${t.nav} ${isNavVisible ? "bottom-0" : "-bottom-24"}`}>');
  
  fs.writeFileSync('src/app/page.tsx', code);
  console.log('Added auto-hide nav');
}
