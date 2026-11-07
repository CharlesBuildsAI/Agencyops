const STARS = (() => {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 72 }, () => ({
    left: rnd() * 100,
    top: rnd() * 100,
    size: rnd() > 0.9 ? 2 : 1.2,
    opacity: 0.25 + rnd() * 0.6,
  }));
})();

export function StarField() {
  return (
    <div className="stars" aria-hidden>
      {STARS.map((star, index) => (
        <i
          key={index}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  );
}

export function Wave({ hot = false }: { hot?: boolean }) {
  return (
    <span className={hot ? "wave hot" : "wave"} aria-hidden>
      <i /><i /><i /><i /><i />
    </span>
  );
}
