import React from 'react';

export const NEW_WEAPON_ARTWORK_IDS = [
  'w-gs-titan',
  'w-gs-volcanic',
  'w-dag-shadow',
  'w-dag-phantom',
  'w-dual-tempest',
  'w-dual-crimson',
  'w-xbow-arbalest',
  'w-xbow-thunder',
  'w-wand-ember',
  'w-wand-starweave',
  'w-spear-valkyrie',
  'w-spear-storm',
  'w-axe-berserker',
  'w-axe-bloodmoon',
  'w-ham-granite',
  'w-ham-thunder',
  'w-scythe-dusk',
  'w-scythe-eclipse',
  'w-asc-runeblade',
  'w-asc-spear',
  'w-asc-dual',
  'w-div-solaris',
  'w-div-hammer',
  'w-div-bow',
  'w-div-wand',
  'w-cel-aetherblade',
  'w-cel-staff',
  'w-cel-scythe',
  'w-cel-xbow',
  'w-et-chronosword',
  'w-et-eclipse-scythe',
  'w-et-aegis-axe',
] as const;

export type NewWeaponArtworkId = (typeof NEW_WEAPON_ARTWORK_IDS)[number];

export const renderNewWeaponArtwork = (id: string, uid: string): React.ReactNode | null => {
  switch (id) {
    // =========================================================================
    // GREATSWORD, DAGGER, DUAL BLADE, CROSSBOW, WAND, SPEAR, AXE, HAMMER, SCYTHE
    // =========================================================================
    case 'w-gs-titan': // Ironclad Greatsword — heavy two-handed steel claymore
      return (
        <g transform="rotate(38 64 64)">
          <defs>
            <linearGradient id={`${uid}-gstitan`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path d="M64 4 L75 18 L74 82 L54 82 L53 18 Z" fill={`url(#${uid}-gstitan)`} stroke="#0f172a" strokeWidth="2.2" />
          <rect x="62" y="22" width="4" height="54" rx="2" fill="#334155" />
          {/* Twin-angled claymore quillions */}
          <path d="M35 72 L55 81 L73 81 L93 72 L89 86 L39 86 Z" fill="#64748b" stroke="#0f172a" strokeWidth="2" />
          <circle cx="38" cy="76" r="3" fill="#cbd5e1" />
          <circle cx="90" cy="76" r="3" fill="#cbd5e1" />
          <rect x="59" y="86" width="10" height="24" rx="2" fill="#78350f" stroke="#1c1917" strokeWidth="1.6" />
          <circle cx="64" cy="115" r="7" fill="#d97706" stroke="#451a03" strokeWidth="2" />
        </g>
      );

    case 'w-gs-volcanic': // Volcanic Executioner — jagged obsidian magma slab
      return (
        <g transform="rotate(38 64 64)">
          <defs>
            <linearGradient id={`${uid}-gsvolc`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="55%" stopColor="#292524" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
          </defs>
          <path d="M64 5 L78 24 L75 44 L78 52 L74 82 L54 82 L50 56 L53 46 L50 26 Z" fill={`url(#${uid}-gsvolc)`} stroke="#0c0a09" strokeWidth="2.2" />
          {/* Glowing magma cracks */}
          <path d="M64 14 L60 34 L67 48 L61 68 L65 78" fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" />
          <path d="M64 14 L60 34 L67 48 L61 68 L65 78" fill="none" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M36 78 L54 82 L74 82 L92 78 L86 90 L42 90 Z" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
          <rect x="59" y="90" width="10" height="20" fill="#451a03" stroke="#1c1917" strokeWidth="1.6" />
          <polygon points="64,110 73,117 64,124 55,117" fill="#f97316" stroke="#7c2d12" strokeWidth="1.8" />
        </g>
      );

    case 'w-dag-shadow': // Nightfang Kris — serpentine obsidian wavy dagger
      return (
        <g transform="rotate(40 64 64)">
          <path
            d="M64 16 C70 28 57 38 69 50 C72 60 58 68 67 78 L59 78 C53 68 65 58 58 48 C52 38 63 28 64 16 Z"
            fill="#312e81"
            stroke="#090514"
            strokeWidth="2.2"
          />
          <path d="M64 20 C67 30 58 40 66 51 C68 61 59 68 64 76" fill="none" stroke="#c084fc" strokeWidth="1.5" />
          <path d="M45 76 Q64 88 83 76 L79 84 L49 84 Z" fill="#4c1d95" stroke="#090514" strokeWidth="1.8" />
          <rect x="60" y="84" width="8" height="20" rx="2" fill="#1e1b4b" stroke="#090514" strokeWidth="1.5" />
          <circle cx="64" cy="109" r="5" fill="#a855f7" stroke="#090514" strokeWidth="1.8" />
        </g>
      );

    case 'w-dag-phantom': // Phantom Viper Fang — sleek emerald-cyan stiletto + ring pommel
      return (
        <g transform="rotate(40 64 64)">
          <path d="M64 14 L71 32 L68 78 L60 78 L57 32 Z" fill="#2dd4bf" stroke="#0f172a" strokeWidth="2" />
          <path d="M64 14 L64 78" stroke="#ecfeff" strokeWidth="1.8" />
          <path d="M46 77 L82 77 L77 84 L51 84 Z" fill="#0f766e" stroke="#042f2e" strokeWidth="1.8" />
          <rect x="61" y="84" width="6" height="17" fill="#134e4a" stroke="#042f2e" strokeWidth="1.4" />
          <circle cx="64" cy="109" r="7" fill="none" stroke="#5eead4" strokeWidth="3.5" />
        </g>
      );

    case 'w-dual-tempest': // Tempest Twinblades — crossed sky-blue gale scimitars
      return (
        <g>
          <g transform="rotate(-32 64 64)">
            <path d="M64 14 C75 34 73 62 67 84 L58 84 C61 60 62 34 64 14 Z" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="2" />
            <path d="M49 82 L78 82 L75 88 L52 88 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.6" />
            <rect x="60" y="88" width="6" height="18" rx="1.5" fill="#1e3a8a" />
          </g>
          <g transform="rotate(32 64 64)">
            <path d="M64 14 C53 34 55 62 61 84 L70 84 C67 60 66 34 64 14 Z" fill="#e0f2fe" stroke="#0c4a6e" strokeWidth="2" />
            <path d="M50 82 L79 82 L76 88 L53 88 Z" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1.6" />
            <rect x="62" y="88" width="6" height="18" rx="1.5" fill="#0369a1" />
          </g>
        </g>
      );

    case 'w-dual-crimson': // Crimson Lotus Twins — crossed scarlet fire scimitars
      return (
        <g>
          <g transform="rotate(-34 64 64)">
            <path d="M66 12 C78 34 74 62 68 84 L59 84 C63 58 62 32 66 12 Z" fill="#ef4444" stroke="#450a0a" strokeWidth="2" />
            <path d="M65 20 C71 40 69 60 65 80" fill="none" stroke="#fde047" strokeWidth="1.6" />
            <path d="M47 80 Q64 90 80 80" fill="none" stroke="#fbbf24" strokeWidth="4" />
            <rect x="60" y="85" width="7" height="18" rx="2" fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.4" />
          </g>
          <g transform="rotate(34 64 64)">
            <path d="M62 12 C50 34 54 62 60 84 L69 84 C65 58 66 32 62 12 Z" fill="#f97316" stroke="#450a0a" strokeWidth="2" />
            <path d="M63 20 C57 40 59 60 63 80" fill="none" stroke="#fef08a" strokeWidth="1.6" />
            <path d="M48 80 Q64 90 81 80" fill="none" stroke="#fbbf24" strokeWidth="4" />
            <rect x="61" y="85" width="7" height="18" rx="2" fill="#7f1d1d" stroke="#450a0a" strokeWidth="1.4" />
          </g>
        </g>
      );

    case 'w-xbow-arbalest': // Siegewind Arbalest — iron torsion crossbow + bolt
      return (
        <g transform="rotate(-30 64 64)">
          <rect x="60" y="24" width="8" height="86" rx="3" fill="#78350f" stroke="#292524" strokeWidth="2" />
          <path d="M22 48 Q64 26 106 48" fill="none" stroke="#64748b" strokeWidth="7" strokeLinecap="round" />
          <path d="M24 50 L64 76 L104 50" fill="none" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="64" y1="12" x2="64" y2="74" stroke="#e2e8f0" strokeWidth="2.8" />
          <polygon points="64,6 69,18 59,18" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.4" />
          <circle cx="64" cy="40" r="6" fill="#475569" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      );

    case 'w-xbow-thunder': // Stormbolt Repeater — violet & gold arc crossbow
      return (
        <g transform="rotate(-30 64 64)">
          <rect x="59" y="24" width="10" height="86" rx="3" fill="#3b0764" stroke="#f59e0b" strokeWidth="2" />
          <path d="M18 50 Q64 20 110 50" fill="none" stroke="#fbbf24" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M22 52 L64 78 L106 52" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <line x1="64" y1="10" x2="64" y2="76" stroke="#67e8f9" strokeWidth="3.2" />
          <polygon points="64,4 70,18 58,18" fill="#38bdf8" stroke="#ecfeff" strokeWidth="1.5" />
          <circle cx="64" cy="39" r="7" fill="#0ea5e9" stroke="#fde047" strokeWidth="2" />
        </g>
      );

    case 'w-wand-ember': // Emberglass Wand — mahogany spire with ruby fire crystal
      return (
        <g transform="rotate(36 64 64)">
          <path d="M61 36 L67 36 L66 114 L62 114 Z" fill="#7c2d12" stroke="#292524" strokeWidth="2" />
          <path d="M56 36 Q64 26 72 36" fill="none" stroke="#fbbf24" strokeWidth="3" />
          <polygon points="64,10 74,24 64,38 54,24" fill="#ef4444" stroke="#fef08a" strokeWidth="2" />
          <circle cx="64" cy="24" r="3.5" fill="#fde047" />
        </g>
      );

    case 'w-wand-starweave': // Starweave Scepter-Wand — ivory wand with orbiting sapphires
      return (
        <g transform="rotate(36 64 64)">
          <path d="M61 40 L67 40 L66 114 L62 114 Z" fill="#e2e8f0" stroke="#4338ca" strokeWidth="2" />
          <circle cx="64" cy="28" r="14" fill="none" stroke="#818cf8" strokeWidth="2.4" />
          <polygon points="64,14 72,28 64,42 56,28" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="48" cy="28" r="4" fill="#c084fc" />
          <circle cx="80" cy="28" r="4" fill="#c084fc" />
        </g>
      );

    case 'w-spear-valkyrie': // Valkyrie Partisan — winged steel spearhead
      return (
        <g transform="rotate(38 64 64)">
          <rect x="61.5" y="42" width="5" height="76" rx="2" fill="#78350f" stroke="#1c1917" strokeWidth="1.6" />
          <path d="M64 6 L72 28 L84 40 L70 38 L67 46 L61 46 L58 38 L44 40 L56 28 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="2" />
          <path d="M64 10 L64 42" stroke="#38bdf8" strokeWidth="2" />
          <rect x="59" y="44" width="10" height="5" rx="1.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.4" />
        </g>
      );

    case 'w-spear-storm': // Tempest Pike of Skadi — glacial ice crystal spear
      return (
        <g transform="rotate(38 64 64)">
          <rect x="61.5" y="44" width="5" height="74" rx="2" fill="#1e3a8a" stroke="#0f172a" strokeWidth="1.6" />
          <polygon points="64,5 76,26 68,44 60,44 52,26" fill="#38bdf8" stroke="#ecfeff" strokeWidth="2" />
          <polygon points="64,10 69,26 64,39 59,26" fill="#bae6fd" />
          <path d="M48 36 L60 44 M80 36 L68 44" stroke="#67e8f9" strokeWidth="3" strokeLinecap="round" />
          <polygon points="64,116 69,122 64,126 59,122" fill="#38bdf8" />
        </g>
      );

    case 'w-axe-berserker': // Nordic Cleaver — bearded steel battleaxe
      return (
        <g transform="rotate(32 64 64)">
          <rect x="60" y="18" width="8" height="98" rx="3" fill="#78350f" stroke="#292524" strokeWidth="2" />
          <path d="M68 24 C86 18 98 30 94 56 C86 50 76 48 68 46 Z" fill="#94a3b8" stroke="#1e293b" strokeWidth="2.2" />
          <path d="M89 26 C94 34 94 46 90 53" fill="none" stroke="#f8fafc" strokeWidth="2" />
          <rect x="58" y="26" width="12" height="14" rx="2" fill="#475569" stroke="#0f172a" strokeWidth="1.6" />
        </g>
      );

    case 'w-axe-bloodmoon': // Bloodmoon Greataxe — double crimson eclipse blades
      return (
        <g transform="rotate(28 64 64)">
          <rect x="60.5" y="16" width="7" height="100" rx="3" fill="#1c1917" stroke="#7f1d1d" strokeWidth="2" />
          <path d="M60 22 C34 14 22 36 32 60 C42 50 50 48 60 46 Z" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
          <path d="M68 22 C94 14 106 36 96 60 C86 50 78 48 68 46 Z" fill="#dc2626" stroke="#450a0a" strokeWidth="2" />
          <circle cx="64" cy="35" r="7" fill="#fbbf24" stroke="#450a0a" strokeWidth="2" />
        </g>
      );

    case 'w-ham-granite': // Granite Breaker — chiseled monolith war hammer
      return (
        <g transform="rotate(34 64 64)">
          <rect x="60" y="20" width="8" height="96" rx="2.5" fill="#78350f" stroke="#292524" strokeWidth="2" />
          <rect x="34" y="24" width="60" height="26" rx="4" fill="#64748b" stroke="#0f172a" strokeWidth="2.4" />
          <rect x="44" y="24" width="6" height="26" fill="#d97706" />
          <rect x="78" y="24" width="6" height="26" fill="#d97706" />
          <polygon points="64,12 70,24 58,24" fill="#94a3b8" stroke="#0f172a" strokeWidth="1.8" />
        </g>
      );

    case 'w-ham-thunder': // Stormanvil Maul — gilded lightning-runed war hammer
      return (
        <g transform="rotate(34 64 64)">
          <rect x="60" y="22" width="8" height="94" rx="2.5" fill="#1e293b" stroke="#fbbf24" strokeWidth="2" />
          <path d="M30 24 L98 24 L92 52 L36 52 Z" fill="#334155" stroke="#fbbf24" strokeWidth="2.4" />
          <polygon points="64,28 70,36 65,36 69,46 58,37 63,37" fill="#38bdf8" />
          <polygon points="64,10 71,24 57,24" fill="#fbbf24" stroke="#78350f" strokeWidth="1.8" />
        </g>
      );

    case 'w-scythe-dusk': // Duskweaver Scythe — silver crescent moon reaper
      return (
        <g transform="rotate(14 64 64)">
          <path d="M74 22 L64 114" stroke="#312e81" strokeWidth="7" strokeLinecap="round" />
          <path d="M76 22 C44 10 22 30 24 62 C34 40 52 34 74 34 Z" fill="#cbd5e1" stroke="#1e1b4b" strokeWidth="2.2" />
          <circle cx="74" cy="27" r="5" fill="#a855f7" stroke="#f3e8ff" strokeWidth="1.5" />
        </g>
      );

    case 'w-scythe-eclipse': // Eclipse Harvester — crimson-ice twin crescent scythe
      return (
        <g transform="rotate(14 64 64)">
          <path d="M75 20 L63 116" stroke="#1e1b4b" strokeWidth="7.5" strokeLinecap="round" />
          <path d="M78 18 C40 6 14 32 22 68 C33 42 54 34 75 34 Z" fill="#be185d" stroke="#fdf2f8" strokeWidth="2" />
          <path d="M26 56 C32 34 52 24 72 26" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="74" cy="26" r="8" fill="#090514" stroke="#fb7185" strokeWidth="2.5" />
        </g>
      );

    // =========================================================================
    // BEYOND-MYTHICAL PINNACLE WEAPONS (Ascendant, Divine, Celestial, Eternal)
    // =========================================================================
    case 'w-asc-runeblade': // Ascendant Tier VII — Teal Rune Greatsword
      return (
        <g transform="rotate(38 64 64)">
          <defs>
            <linearGradient id={`${uid}-ascblade`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#99f6e4" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#042f2e" />
            </linearGradient>
          </defs>
          <path d="M64 4 L75 20 L73 80 L55 80 L53 20 Z" fill={`url(#${uid}-ascblade)`} stroke="#ccfbf1" strokeWidth="2" />
          <path d="M64 16 L64 72" stroke="#5eead4" strokeWidth="2.6" strokeDasharray="5 3" />
          {/* Winged teal runic guard */}
          <path d="M33 69 L54 79 L74 79 L95 69 L88 86 L40 86 Z" fill="#0f766e" stroke="#2dd4bf" strokeWidth="2" />
          <polygon points="64,74 70,81 64,88 58,81" fill="#5eead4" stroke="#ffffff" strokeWidth="1.4" />
          <rect x="60" y="86" width="8" height="22" fill="#042f2e" stroke="#2dd4bf" strokeWidth="1.6" />
          <polygon points="64,108 72,115 64,122 56,115" fill="#2dd4bf" stroke="#ecfeff" strokeWidth="1.6" />
        </g>
      );

    case 'w-asc-spear': // Ascendant Tier VII — Veridian Dawn Lance
      return (
        <g transform="rotate(38 64 64)">
          <rect x="61" y="44" width="6" height="74" rx="2.5" fill="#042f2e" stroke="#2dd4bf" strokeWidth="1.6" />
          <polygon points="64,4 76,28 69,46 59,46 52,28" fill="#14b8a6" stroke="#ccfbf1" strokeWidth="2" />
          <circle cx="64" cy="46" r="9" fill="none" stroke="#5eead4" strokeWidth="2.4" />
          <path d="M64 10 L64 42" stroke="#ecfeff" strokeWidth="2" />
        </g>
      );

    case 'w-asc-dual': // Ascendant Tier VII — Zephyr Sovereign Twinblades
      return (
        <g>
          <g transform="rotate(-34 64 64)">
            <path d="M65 10 C78 34 74 62 67 86 L58 86 C62 60 61 32 65 10 Z" fill="#14b8a6" stroke="#ccfbf1" strokeWidth="2" />
            <path d="M46 80 L81 80 L76 87 L51 87 Z" fill="#0f766e" stroke="#5eead4" strokeWidth="1.6" />
            <rect x="60" y="87" width="6" height="19" fill="#042f2e" />
          </g>
          <g transform="rotate(34 64 64)">
            <path d="M63 10 C50 34 54 62 61 86 L70 86 C66 60 67 32 63 10 Z" fill="#06b6d4" stroke="#ecfeff" strokeWidth="2" />
            <path d="M47 80 L82 80 L77 87 L52 87 Z" fill="#0e7490" stroke="#67e8f9" strokeWidth="1.6" />
            <rect x="62" y="87" width="6" height="19" fill="#083344" />
          </g>
        </g>
      );

    case 'w-div-solaris': // Divine Tier VIII — Solarian Dawnbreaker
      return (
        <g transform="rotate(38 64 64)">
          <circle cx="64" cy="78" r="24" fill="none" stroke="#fde047" strokeWidth="2.2" strokeDasharray="4 3" />
          <path d="M64 3 L74 20 L71 78 L57 78 L54 20 Z" fill="#fef08a" stroke="#b45309" strokeWidth="2.2" />
          <path d="M64 7 L64 75" stroke="#ffffff" strokeWidth="2.4" />
          <path d="M32 72 Q64 90 96 72 L86 85 L42 85 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          <polygon points="64,72 70,80 64,88 58,80" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
          <rect x="60" y="85" width="8" height="22" fill="#f8fafc" stroke="#b45309" strokeWidth="1.6" />
          <circle cx="64" cy="113" r="6.5" fill="#fde047" stroke="#78350f" strokeWidth="1.8" />
        </g>
      );

    case 'w-div-hammer': // Divine Tier VIII — Solstice Judgment Maul
      return (
        <g transform="rotate(34 64 64)">
          <circle cx="64" cy="37" r="26" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="3 3" />
          <rect x="60" y="20" width="8" height="96" rx="2.5" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
          <path d="M28 22 L100 22 L94 52 L34 52 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2.4" />
          <polygon points="64,26 72,37 64,48 56,37" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" />
          <polygon points="64,8 71,22 57,22" fill="#fef08a" stroke="#b45309" strokeWidth="1.8" />
        </g>
      );

    case 'w-div-bow': // Divine Tier VIII — Seraphim Dawn Longbow
      return (
        <g>
          <path d="M40 12 C94 26 94 102 40 116" fill="none" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
          <path d="M44 16 C86 30 86 98 44 112" fill="none" stroke="#fef9c3" strokeWidth="2.2" />
          <line x1="40" y1="14" x2="40" y2="114" stroke="#fef08a" strokeWidth="1.8" />
          <line x1="36" y1="64" x2="108" y2="64" stroke="#ffffff" strokeWidth="2.8" />
          <polygon points="112,64 98,58 102,64 98,70" fill="#fde047" />
        </g>
      );

    case 'w-div-wand': // Divine Tier VIII — Hallowed Choir Wand
      return (
        <g transform="rotate(36 64 64)">
          <rect x="61.5" y="42" width="5" height="72" rx="2" fill="#fef3c7" stroke="#b45309" strokeWidth="1.8" />
          <path d="M42 26 Q56 16 64 34 Q72 16 86 26 Q74 38 64 42 Q54 38 42 26 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="1.8" />
          <circle cx="64" cy="24" r="9" fill="#ffffff" stroke="#f59e0b" strokeWidth="2.4" />
        </g>
      );

    case 'w-cel-aetherblade': // Celestial Tier IX — Astral Nebula Sovereign
      return (
        <g transform="rotate(38 64 64)">
          <ellipse cx="64" cy="78" rx="28" ry="11" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path d="M64 4 L76 22 L73 80 L55 80 L52 22 Z" fill="#4c1d95" stroke="#c084fc" strokeWidth="2.2" />
          <circle cx="64" cy="38" r="5" fill="#38bdf8" />
          <circle cx="61" cy="54" r="3" fill="#f472b6" />
          <circle cx="68" cy="64" r="2.5" fill="#fde047" />
          <path d="M32 70 L54 80 L74 80 L96 70 L86 87 L42 87 Z" fill="#312e81" stroke="#e9d5ff" strokeWidth="2" />
          <rect x="60" y="87" width="8" height="22" fill="#1e1b4b" stroke="#c084fc" strokeWidth="1.6" />
          <polygon points="64,109 73,116 64,124 55,116" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
        </g>
      );

    case 'w-cel-staff': // Celestial Tier IX — Nebula Sovereign Rod
      return (
        <g transform="rotate(28 64 64)">
          <rect x="61" y="48" width="6" height="68" rx="3" fill="#312e81" stroke="#c084fc" strokeWidth="1.8" />
          <circle cx="64" cy="30" r="21" fill="none" stroke="#c084fc" strokeWidth="2.6" />
          <ellipse cx="64" cy="30" rx="22" ry="9" transform="rotate(-30 64 30)" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="64" cy="30" r="9" fill="#6d28d9" stroke="#f0abfc" strokeWidth="2" />
          <circle cx="62" cy="28" r="3" fill="#ffffff" />
        </g>
      );

    case 'w-cel-scythe': // Celestial Tier IX — Void-Star Reaper
      return (
        <g transform="rotate(14 64 64)">
          <path d="M76 20 L63 116" stroke="#312e81" strokeWidth="7" strokeLinecap="round" />
          <path d="M79 18 C40 4 12 32 22 70 C34 42 54 34 76 34 Z" fill="#6d28d9" stroke="#e9d5ff" strokeWidth="2.2" />
          <circle cx="44" cy="27" r="3" fill="#fde047" />
          <circle cx="32" cy="40" r="2.5" fill="#38bdf8" />
          <circle cx="75" cy="26" r="8" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="2.4" />
        </g>
      );

    case 'w-cel-xbow': // Celestial Tier IX — Astral Singularity Arbalest
      return (
        <g transform="rotate(-30 64 64)">
          <rect x="59" y="24" width="10" height="86" rx="3" fill="#1e1b4b" stroke="#c084fc" strokeWidth="2" />
          <path d="M16 50 Q64 16 112 50" fill="none" stroke="#c084fc" strokeWidth="6" strokeLinecap="round" />
          <path d="M20 52 L64 78 L108 52" fill="none" stroke="#38bdf8" strokeWidth="2.4" />
          <line x1="64" y1="8" x2="64" y2="76" stroke="#e879f9" strokeWidth="3.2" />
          <polygon points="64,3 71,19 57,19" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
        </g>
      );

    case 'w-et-chronosword': // Eternal Tier X — Chronos, Edge of Eternity
      return (
        <g transform="rotate(38 64 64)">
          <defs>
            <linearGradient id={`${uid}-chronos`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          {/* Intersecting chronometer rings */}
          <circle cx="64" cy="76" r="24" fill="none" stroke="#22d3ee" strokeWidth="2" />
          <ellipse cx="64" cy="76" rx="30" ry="12" transform="rotate(-25 64 76)" fill="none" stroke="#f472b6" strokeWidth="2" />
          {/* Prismatic diamond blade */}
          <path d="M64 2 L76 20 L73 78 L55 78 L52 20 Z" fill={`url(#${uid}-chronos)`} stroke="#ffffff" strokeWidth="2" />
          <path d="M64 5 L64 76" stroke="#ffffff" strokeWidth="2.6" />
          <path d="M30 70 L54 79 L74 79 L98 70 L86 88 L42 88 Z" fill="#0f172a" stroke="#67e8f9" strokeWidth="2" />
          <polygon points="64,71 71,80 64,89 57,80" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="60" y="88" width="8" height="21" fill="#0f172a" stroke="#f472b6" strokeWidth="1.6" />
          <polygon points="64,109 73,117 64,125 55,117" fill="#22d3ee" stroke="#ffffff" strokeWidth="1.6" />
        </g>
      );

    case 'w-et-eclipse-scythe': // Eternal Tier X — Eternity's Veil, Cosmic Scythe
      return (
        <g transform="rotate(14 64 64)">
          <defs>
            <linearGradient id={`${uid}-etscy`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#fde047" />
            </linearGradient>
          </defs>
          <circle cx="74" cy="27" r="18" fill="none" stroke="#67e8f9" strokeWidth="2" strokeDasharray="5 3" />
          <path d="M76 20 L62 117" stroke="#0f172a" strokeWidth="7.5" strokeLinecap="round" />
          <path d="M80 16 C38 2 10 34 22 72 C35 42 54 34 76 34 Z" fill={`url(#${uid}-etscy)`} stroke="#ffffff" strokeWidth="2.2" />
          <circle cx="74" cy="27" r="7" fill="#fde047" stroke="#ffffff" strokeWidth="1.6" />
        </g>
      );

    case 'w-et-aegis-axe': // Eternal Tier X — Ouroboros Worldsplitter
      return (
        <g transform="rotate(28 64 64)">
          <defs>
            <linearGradient id={`${uid}-etaxe`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="64" cy="36" r="24" fill="none" stroke="#fde047" strokeWidth="2.4" />
          <rect x="60" y="14" width="8" height="104" rx="3" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.8" />
          <path d="M60 20 C30 10 18 36 30 62 C40 50 50 48 60 46 Z" fill={`url(#${uid}-etaxe)`} stroke="#ffffff" strokeWidth="2" />
          <path d="M68 20 C98 10 110 36 98 62 C88 50 78 48 68 46 Z" fill={`url(#${uid}-etaxe)`} stroke="#ffffff" strokeWidth="2" />
          <polygon points="64,26 72,36 64,46 56,36" fill="#ffffff" stroke="#22d3ee" strokeWidth="1.6" />
        </g>
      );

    default:
      return null;
  }
};
