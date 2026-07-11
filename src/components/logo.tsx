export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* tilted paddle: blade + handle */}
      <g transform="rotate(-35 12 13)">
        <ellipse cx="12" cy="9" rx="5.3" ry="5.9" />
        <rect x="10.3" y="13.6" width="3.4" height="7.4" rx="1.7" />
      </g>
      {/* ball tucked into the open upper-right */}
      <circle cx="18.6" cy="8" r="2.5" />
    </svg>
  );
}
