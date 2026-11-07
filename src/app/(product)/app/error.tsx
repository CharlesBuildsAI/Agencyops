"use client";

export default function DeskError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel grow">
      <div className="empty">
        <h2>The desk hit a snag.</h2>
        <p>{error.message || "Something failed while loading this view."}</p>
        <button className="btn btn-accent" onClick={reset}>Try again</button>
      </div>
    </section>
  );
}
