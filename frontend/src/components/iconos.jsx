const trazo = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ children }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...trazo}>
      {children}
    </svg>
  );
}

export function IconoCarga() {
  return (
    <Svg>
      <path d="M12 15V4" />
      <path d="M7 8l5-5 5 5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </Svg>
  );
}

export function IconoHistorial() {
  return (
    <Svg>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export function IconoRevision() {
  return (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </Svg>
  );
}

export function IconoFormulas() {
  return (
    <Svg>
      <path d="M7 4h10" />
      <path d="M9 4l-4 16h4" />
      <path d="M15 4l4 16h-4" />
      <path d="M9 12h6" />
    </Svg>
  );
}

export function IconoPlantillas() {
  return (
    <Svg>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </Svg>
  );
}

export function IconoTrabajadores() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6" />
    </Svg>
  );
}
