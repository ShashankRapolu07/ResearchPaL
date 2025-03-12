import React from "react";
import "./PapersLoader.css";

const PapersLoader = ({numCards = 5}) => {
  const skeletonCount = numCards;

  const placeholders = Array.from({ length: skeletonCount }, (_, i) => i);

  return (
    <div className="papersLoader-container">
      {placeholders.map((index) => (
        <div key={index} className="papersLoader-card">
          <div className="papersLoader-indexCol" />
          <div className="papersLoader-dividerLeft" />
          <div className="papersLoader-mainContent">
            <div className="papersLoader-title" />
            <div className="papersLoader-abstract">
              <div />
              <div />
              <div />
            </div>
            <div className="papersLoader-meta" />
          </div>
          <div className="papersLoader-dividerRight" />
          <div className="papersLoader-pdfPreview" />
        </div>
      ))}
    </div>
  );
};

export default PapersLoader;