import React, { useState, useEffect, useRef } from "react";
import "./TrendingCarousel.css";

const TrendingCarousel = ({ items, autoPlayInterval = 5000 }) => {
  const [active, setActive] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const carouselRef = useRef(null);

  const moveLeft = () => {
    setActive((prev) => (prev - 1 + items.length) % items.length);
  };

  const moveRight = () => {
    setActive((prev) => (prev + 1) % items.length);
  };

  const getLevelClass = (index) => {
    const diff = (index - active + items.length) % items.length;
    switch (diff) {
      case 0:
        return "level0"; 
      case 1:
        return "level1";
      case 2:
        return "level2";
      case 3:
        return "level3";
      case 4:
        return "level4";
      case items.length - 1:
        return "level-1";
      case items.length - 2:
        return "level-2";
      case items.length - 3:
        return "level-3";
      case items.length - 4:
        return "level-4";
      default:
        return "level-outside";
    }
  };

  useEffect(() => {
    const handlePdfOpened = () => {
      setPdfPreviewOpen(true);
      setIsHovered(true);
    };
    const handlePdfClosed = () => {
      setPdfPreviewOpen(false);
      setIsHovered(false);
    };

    window.addEventListener("pdf-opened", handlePdfOpened);
    window.addEventListener("pdf-closed", handlePdfClosed);

    return () => {
      window.removeEventListener("pdf-opened", handlePdfOpened);
      window.removeEventListener("pdf-closed", handlePdfClosed);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setIsInView(true);
        else setIsInView(false);
      },
      { threshold: 0.1 }
    );

    if (carouselRef.current) observer.observe(carouselRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView || isHovered || pdfPreviewOpen) return;

    const intervalId = setInterval(() => {
      moveRight();
    }, autoPlayInterval);

    return () => clearInterval(intervalId);
  }, [isInView, isHovered, pdfPreviewOpen, autoPlayInterval]);

  return (
    <div
      className="trending-carousel"
      ref={carouselRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="arrow-carousel arrow-carousel-left" onClick={moveLeft}>
        &#10094;
      </div>
      <div className="carousel-items">
        {items.map((item, index) => {
          const levelClass = `item ${getLevelClass(index)}`;
          return (
            <div key={index} className={levelClass}>
              {item}
            </div>
          );
        })}
      </div>
      <div className="arrow-carousel arrow-carousel-right" onClick={moveRight}>
        &#10095;
      </div>
    </div>
  );
};

export default TrendingCarousel;