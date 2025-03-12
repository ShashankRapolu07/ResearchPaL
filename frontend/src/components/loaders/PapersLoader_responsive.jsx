import React from "react";
import "./PapersLoader_responsive.css";

const PapersLoaderResponsive = ({numCards = 5}) => {
  const skeletonCount = numCards;
  const placeholders = Array.from({ length: skeletonCount }, (_, i) => i);

  return (
    <div className="papersLoaderResponsive-container">
      {placeholders.map((index) => (
        <div key={index} className="papersLoaderResponsive-card">
          <div className="papersLoaderResponsive-pdfBlock">
            <div className="papersLoaderResponsive-pdfShimmer" />
          </div>

          <div className="papersLoaderResponsive-mainContent">
            <div className="papersLoaderResponsive-titleBar" />

            <div className="papersLoaderResponsive-abstractLines">
              <div />
              <div />
              <div />
            </div>

            <div className="papersLoaderResponsive-metadata">
              <div className="papersLoaderResponsive-dateLine" />
              <div className="papersLoaderResponsive-codeStats">
                <div />
                <div />
                <div />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PapersLoaderResponsive;
