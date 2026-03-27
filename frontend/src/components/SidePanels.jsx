import React from 'react';

const SidePanels = ({ 
  semanticResults, 
  twinSliderVisible, 
  setTwinSliderVisible, 
  liveFeed 
}) => {
  return (
    <>
      <section className="panel left">
        <h3>Semantic Search Results</h3>
        <div className="list">
          {semanticResults.map((item) => (
            <div className="list-item" key={item.title}>
              <div>
                <div className="list-title">{item.title}</div>
                <div className="list-detail">{item.detail}</div>
              </div>
              <div className={`score ${item.tone}`}>{item.score}</div>
            </div>
          ))}
        </div>
        <div className="panel-footer">
          <button 
            className="chip" 
            type="button" 
            onClick={() => setTwinSliderVisible(!twinSliderVisible)}
          >
            Digital Twin Simulation
          </button>
        </div>
      </section>

      <section className="panel right">
        <h3>Live Data Feed</h3>
        <div className="feed">
          {liveFeed.map((item) => (
            <div className="feed-row" key={item.label}>
              <span>{item.label}</span>
              <span className="value">{item.value}</span>
            </div>
          ))}
        </div>
        <div className="panel-footer search-footer">
          <input
            className="panel-search"
            placeholder="Search feed"
            aria-label="Search feed"
          />
          <button className="search-btn" type="button">Search</button>
        </div>
      </section>
    </>
  );
};

export default SidePanels;
