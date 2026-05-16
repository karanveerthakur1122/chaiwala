export default function ChaiLoader({ size = 120, text = '' }) {
  const w = size
  const h = size * 1.3

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={w}
        height={h}
        viewBox="0 0 120 156"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Loading"
      >
        {/* Steam wisps */}
        <g opacity="0.6">
          <path
            d="M52 38 C52 30, 58 28, 58 20 C58 12, 52 10, 52 2"
            stroke="#C4956A"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M52 38 C52 30, 58 28, 58 20 C58 12, 52 10, 52 2;M52 38 C52 30, 46 28, 46 20 C46 12, 52 10, 52 2;M52 38 C52 30, 58 28, 58 20 C58 12, 52 10, 52 2"
              dur="2s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="2s" repeatCount="indefinite" />
          </path>
          <path
            d="M60 40 C60 32, 66 30, 66 22 C66 14, 60 12, 60 4"
            stroke="#B8845A"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M60 40 C60 32, 66 30, 66 22 C66 14, 60 12, 60 4;M60 40 C60 32, 54 30, 54 22 C54 14, 60 12, 60 4;M60 40 C60 32, 66 30, 66 22 C66 14, 60 12, 60 4"
              dur="2.5s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="2.5s" repeatCount="indefinite" />
          </path>
          <path
            d="M68 36 C68 28, 74 26, 74 18 C74 10, 68 8, 68 0"
            stroke="#C4956A"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          >
            <animate
              attributeName="d"
              values="M68 36 C68 28, 74 26, 74 18 C74 10, 68 8, 68 0;M68 36 C68 28, 62 26, 62 18 C62 10, 68 8, 68 0;M68 36 C68 28, 74 26, 74 18 C74 10, 68 8, 68 0"
              dur="1.8s"
              repeatCount="indefinite"
            />
            <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.8s" repeatCount="indefinite" />
          </path>
        </g>

        {/* Cup body — kulhar/clay cup shape */}
        <g>
          <animateTransform
            attributeName="transform"
            type="scale"
            values="1 1;1.01 1.01;1 1"
            dur="3s"
            repeatCount="indefinite"
            additive="sum"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -1;0 0"
            dur="3s"
            repeatCount="indefinite"
            additive="sum"
          />

          {/* Cup shadow */}
          <ellipse cx="60" cy="148" rx="30" ry="5" fill="#00000020">
            <animate attributeName="rx" values="30;28;30" dur="3s" repeatCount="indefinite" />
          </ellipse>

          {/* Cup body */}
          <path
            d="M35 65 L40 135 C40 140, 80 140, 80 135 L85 65 Z"
            fill="#D4956A"
            stroke="#B8784A"
            strokeWidth="1"
          />

          {/* Cup vertical stripes */}
          <line x1="45" y1="68" x2="46" y2="133" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="50" y1="67" x2="51" y2="134" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="55" y1="66" x2="56" y2="135" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="60" y1="65" x2="60" y2="135" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="65" y1="66" x2="64" y2="135" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="70" y1="67" x2="69" y2="134" stroke="#C4854E" strokeWidth="1" opacity="0.5" />
          <line x1="75" y1="68" x2="74" y2="133" stroke="#C4854E" strokeWidth="1" opacity="0.5" />

          {/* Bottom silver rim */}
          <rect x="38" y="132" rx="2" ry="2" width="44" height="8" fill="#E8E8E8" stroke="#CCCCCC" strokeWidth="0.5" />

          {/* Chai liquid at top */}
          <path
            d="M36 68 C36 62, 84 62, 84 68"
            fill="#C9915A"
          >
            <animate
              attributeName="d"
              values="M36 68 C36 62, 84 62, 84 68;M36 68 C36 64, 84 64, 84 68;M36 68 C36 62, 84 62, 84 68"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>

          {/* Foam/cream layer */}
          <path d="M36 65 C36 58, 84 58, 84 65 L84 68 C84 62, 36 62, 36 68 Z" fill="#F5E6D3" opacity="0.9" />
        </g>

        {/* Mustache */}
        <g>
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -1.5;0 0"
            dur="3s"
            repeatCount="indefinite"
          />
          <path
            d="M10 78 C20 70, 35 65, 48 72 C52 74, 55 76, 60 76 C65 76, 68 74, 72 72 C85 65, 100 70, 110 78 C100 82, 85 80, 72 76 C68 74, 65 73, 60 73 C55 73, 52 74, 48 76 C35 80, 20 82, 10 78 Z"
            fill="#1A1A1A"
            stroke="#000000"
            strokeWidth="0.5"
          />
        </g>

        {/* Text: BAPU CHAIWALA */}
        <text x="60" y="57" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="9" fill="#8B5E3C" letterSpacing="0.5">
          CHAIWALA
        </text>
        <text x="60" y="67" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="9" fill="#8B5E3C" letterSpacing="0.5">
          BABU
        </text>
      </svg>
      {text && (
        <p className="text-sm text-chai-500 animate-pulse">{text}</p>
      )}
    </div>
  )
}
