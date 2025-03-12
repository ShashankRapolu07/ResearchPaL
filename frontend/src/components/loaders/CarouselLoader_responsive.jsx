import React from "react";
import "./CarouselLoader_responsive.css";


const CarouselLoaderResponsive = () => {
  const placeholderIndices = [-2, -1, 0, 1, 2];

  const getLevelClass = (index) => {
    switch (index) {
      case 0:
        return "sk-level0-responsive";
      case 1:
        return "sk-level1-responsive";
      case 2:
        return "sk-level2-responsive";
      case -1:
        return "sk-level-1-responsive";
      case -2:
        return "sk-level-2-responsive";
      default:
        return "sk-level-outside-responsive";
    }
  };

  return (
    <div className="trending-carousel-responsive carousel-loader-responsive">
      <div className="sk-carousel-items-responsive">
        {placeholderIndices.map((index) => {
          const levelClass = `sk-item-responsive ${getLevelClass(index)}`;

          return (
            <div key={index} className={levelClass}>
              <div className="skeleton-card-responsive">
                <div className="sk-pdf-container-responsive">
                  <div className="sk-pdf-loader-responsive" />
                </div>

                <div className="sk-content-area-responsive">
                  <div className="sk-title-responsive" />

                  <div className="sk-abstract-responsive">
                    <div />
                    <div />
                    <div />
                  </div>

                  <div className="sk-date-responsive" />
                  <div className="sk-code-stats-responsive">
                    <div className="sk-line-responsive" />
                    <div className="sk-line-responsive" />
                    <div className="sk-line-responsive" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CarouselLoaderResponsive;