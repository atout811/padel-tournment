// Small, local vector artwork shared by the welcome animation and mobile banner.
export default function PadelArtwork({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <circle cx="120" cy="120" r="102" stroke="currentColor" strokeOpacity=".15" />
      <circle cx="120" cy="120" r="82" stroke="currentColor" strokeOpacity=".12" strokeDasharray="3 8" />
      <g className="racket racket-back" transform="rotate(32 120 120)">
        <rect x="109" y="131" width="22" height="67" rx="9" fill="#FBA76F" />
        <path d="M108 159H132M108 167H132M108 175H132" stroke="#244C42" strokeWidth="3" />
        <rect x="76" y="41" width="88" height="111" rx="42" fill="#E97843" stroke="#FFC18F" strokeWidth="5" />
        <path d="M94 76H146M91 93H149M95 110H145M104 59V126M120 57V133M136 59V126" stroke="#93482B" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className="racket racket-front" transform="rotate(-29 120 120)">
        <rect x="107" y="138" width="24" height="67" rx="9" fill="#EAE9D1" />
        <path d="M107 169H131M107 177H131M107 185H131" stroke="#8EAA8B" strokeWidth="3" />
        <rect x="73" y="43" width="92" height="117" rx="44" fill="#D8F36A" stroke="#F1FFA8" strokeWidth="5" />
        {[77, 96, 115, 134].map((y) => [100, 119, 138].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4.5" fill="#285E48" />))}
      </g>
      <g className="art-ball">
        <circle cx="184" cy="57" r="21" fill="#F3F99C" />
        <path d="M173 40C191 51 174 63 192 76" stroke="#A6B63C" strokeWidth="2.5" />
      </g>
      <path d="M48 164L39 178M190 136L202 144M48 58L37 48" stroke="#F7F0DE" strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}
