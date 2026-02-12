import "./profile1.css";

const features = [
  "Active missions: 14 global climate and mobility programs",
  "Simulation score: 93.6 mission reliability index",
  "Collaboration graph: Synced with 28 cross-border teams",
];

const tags = ["Verified Identity", "Ops Command", "AI Assisted"];

const expertise = [
  "Digital Twins",
  "Energy Routing",
  "Crisis Simulation",
  "Semantic Mapping",
];

export default function NovaGlobeProfile() {
  return (
    <main className="ng-body">
      <section className="ng-shell">
        <div className="ng-grid">
          <article className="ng-left">
            <h1 className="ng-title">NovaGlobe</h1>
            <p className="ng-headline">
              <span>Profile intelligence for global operators.</span>
              {" "}
              View live expertise signals, mission focus, and readiness across every region.
            </p>

            {features.map((item) => {
              const [label, ...rest] = item.split(": ");
              return (
                <div className="ng-feature" key={item}>
                  <span>{label}:</span> {rest.join(": ")}
                </div>
              );
            })}

            <div className="ng-tag-row">
              {tags.map((tag) => (
                <span className="ng-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </article>

          <aside className="ng-right">
            <div className="ng-profile-head">
              <div className="ng-avatar">RK</div>
              <div>
                <p className="ng-name">Rhea Kline</p>
                <p className="ng-role">Planetary Systems Lead</p>
              </div>
            </div>

            <div className="ng-card">
              <p className="ng-label">Work Email</p>
              <p className="ng-value">rhea.kline@novaglobe.io</p>
            </div>

            <div className="ng-card">
              <p className="ng-label">Primary Region</p>
              <p className="ng-value-highlight">North Atlantic Grid</p>
            </div>

            <div className="ng-card">
              <p className="ng-label">Expertise</p>
              <div className="ng-chip-row">
                {expertise.map((item) => (
                  <span className="ng-chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="ng-actions">
              <button type="button">Update Profile</button>
              <button type="button" className="ng-ghost">
                View Activity
              </button>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}