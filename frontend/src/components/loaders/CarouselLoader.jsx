import React from "react";
import "./CarouselLoader.css";

const CarouselLoader = () => {
  const placeholderIndices = [-2, -1, 0, 1, 2];

  const getLevelClass = (index) => {
    switch (index) {
      case 0:
        return "sk-level0";
      case 1:
        return "sk-level1";
      case 2:
        return "sk-level2";
      case -1:
        return "sk-level-1";
      case -2:
        return "sk-level-2";
      default:
        return "sk-level-outside";
    }
  };

  return (
    <div className="trending-carousel carousel-loader">
      <div className="sk-carousel-items">
        {placeholderIndices.map((index) => {
          const levelClass = `sk-item ${getLevelClass(index)}`;

          return (
            <div key={index} className={levelClass}>
              <div className="skeleton-card">
                <div className="sk-index" />
                <div className="sk-divider-left" />
                <div className="sk-main-content">
                  <div className="sk-title" />
                  
                  <div className="sk-abstract">
                    <div />
                    <div />
                    <div />
                  </div>
                  
                  <div className="sk-meta" />
                </div>
                <div className="sk-divider-right" />
                <div className="sk-pdf" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CarouselLoader;