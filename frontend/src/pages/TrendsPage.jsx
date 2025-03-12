import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import "./TrendsPage.css";
import axios from "axios";
import PaperCard from "../components/PaperCard";
import PaperCardResponsive from "../components/PaperCard_responsive";
import PapersLoader from "../components/loaders/PapersLoader";
import PapersLoaderResponsive from "../components/loaders/PapersLoader_responsive";

let trendsPageCache = { data: [], nextPage: 1 };
let trendsPageScrollPosition = 0;

const TrendsPage = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 800);
  const [trendingPapers, setTrendingPapers] = useState(trendsPageCache.data || []);
  const [errorMessage, setErrorMessage] = useState(null);
  const [nextPage, setNextPage] = useState(trendsPageCache.nextPage || 1);
  const [isFetching, setIsFetching] = useState(false);
  const loaderRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();

  const itemsPerPage = 10;

  const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL;

  const paperCards = isDesktop ? trendingPapers.map((paperrepo, index) => (
    <PaperCard
      key={paperrepo.paper.id}
      rank={index + 1}
      paper={{
        title: paperrepo.paper.title,
        abstract: paperrepo.paper.abstract,
        authors: paperrepo.paper.authors,
        published: paperrepo.paper.published,
        url_pdf: paperrepo.paper.url_pdf
      }}
      repository={{
        url: paperrepo.repository?.url,
        owner: paperrepo.repository?.owner,
        name: paperrepo.repository?.name,
        framework: paperrepo.repository?.framework,
        stars: paperrepo.repository?.stars
      }}
    />
  )) : trendingPapers.map((paperrepo, index) => (
    <PaperCardResponsive 
      key={paperrepo.paper.id}
      paper={{
        title: paperrepo.paper.title,
        abstract: paperrepo.paper.abstract,
        authors: paperrepo.paper.authors,
        published: paperrepo.paper.published,
        url_pdf: paperrepo.paper.url_pdf
      }}
      repository={{
        url: paperrepo.repository?.url,
        owner: paperrepo.repository?.owner,
        name: paperrepo.repository?.name,
        framework: paperrepo.repository?.framework,
        stars: paperrepo.repository?.stars
      }}
    />
  ));

  const fetchTrendingPapers = async (page) => {
    if (isFetching || page == null) return;

    try {
      setIsFetching(true);
      const response = await axios.get(
        `${proxyBaseUrl}/?items=${itemsPerPage}&page=${page}`
      );
      const newPapers = response.data.paperrepos || [];
      const nextPageFromResponse = response.data.next_page || null;

      if (newPapers.length > 0) {
        trendsPageCache.data = [...trendsPageCache.data, ...newPapers];
        trendsPageCache.nextPage = nextPageFromResponse;

        setTrendingPapers(trendsPageCache.data);
        setNextPage(trendsPageCache.nextPage);
      }
    } catch (error) {
      console.error("Error fetching data from backend:", error);
      setErrorMessage("Failed to fetch data from the server. Please try again later.");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 800);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const observerCallback = (entries) => {
      if (entries[0].isIntersecting && !isFetching) {
        if (nextPage === 1 && location.state?.trendingPapers?.length > 0) {
          trendsPageCache.data = location.state.trendingPapers;
          trendsPageCache.nextPage = 2;
          setTrendingPapers(trendsPageCache.data);
          setNextPage(trendsPageCache.nextPage);
        } else {
          fetchTrendingPapers(nextPage);
        }
      }
    };
  
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver(observerCallback, observerOptions);
  
    const currentLoader = loaderRef.current;
    if (currentLoader) observer.observe(currentLoader);
  
    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [nextPage, isFetching, location.state?.trendingPapers]);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.scrollTop = trendsPageScrollPosition;
    }

    return () => {
      if (container) {
        trendsPageScrollPosition = container.scrollTop;
      }
    };
  }, []);

  return (
    <div className="trends-main-container" ref={containerRef}>
      <div className="trends-header">
        <div className="trends-header-tabs">
          <button
              className="trends-header-tab trending"
            >
              Trending Papers
            </button>
        </div>
      </div>
      <div className="trends-content-container">
        {paperCards}
        {!errorMessage && (
          <div className="loader-observer" ref={loaderRef}>
            {isDesktop ? <PapersLoader numCards={trendingPapers.length === 0 ? 3 : 1} /> : <PapersLoaderResponsive numCards={trendingPapers.length === 0 ? 3: 1} />}
          </div>
        )}
        {errorMessage && <div className="error-message-container"><span>{errorMessage}</span></div>}
      </div>
    </div>
  );
};

export default TrendsPage;