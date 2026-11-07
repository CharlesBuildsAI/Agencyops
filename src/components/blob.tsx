export function Blob({ color, size = 36 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <path
        d="M8 18.5C8 10.5 13.5 5 20 5s12 5.5 12 13.5c0 7.2-5.4 13-12 14.8C13.4 31.5 8 25.7 8 18.5z"
        fill={color}
      />
      <ellipse cx="14" cy="12" rx="3.2" ry="1.8" fill="#fff" opacity=".28" transform="rotate(-18 14 12)" />
      <ellipse cx="15.2" cy="19.2" rx="2" ry="2.5" fill="#1C1C1B" />
      <ellipse cx="24.8" cy="19.2" rx="2" ry="2.5" fill="#1C1C1B" />
      <ellipse cx="15.7" cy="18.6" rx=".55" ry=".65" fill="#fff" />
      <ellipse cx="25.3" cy="18.6" rx=".55" ry=".65" fill="#fff" />
      <path d="M16.6 25.2c1.7 1.5 5 1.5 6.8 0" fill="none" stroke="#1C1C1B" strokeWidth="1.45" strokeLinecap="round" />
      <path d="M8.5 16.2c0-5.5 4.6-8.8 11.5-8.8s11.5 3.3 11.5 8.8" fill="none" stroke="#3A3A38" strokeWidth="2.3" strokeLinecap="round" />
      <rect x="5" y="14.5" width="6" height="9.2" rx="3" fill="#3A3A38" />
      <rect x="29" y="14.5" width="6" height="9.2" rx="3" fill="#3A3A38" />
    </svg>
  );
}
