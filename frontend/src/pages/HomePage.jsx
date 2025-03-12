import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import axios from "axios";
import TrendingCarousel from '../components/TrendingCarousel';
import TrendingCard from '../components/TrendingCard';
import TrendingCardResponsive from "../components/TrendingCard_responsive";
import CarouselLoader from '../components/loaders/CarouselLoader';
import CarouselLoaderResponsive from '../components/loaders/CarouselLoader_responsive';
import logogif2 from '../assets/gifs/logo2.gif';
import TrendingIcon from '../assets/images/trending 2.png';
import ElongatedArrowIcon from '../assets/svgs/elongated arrow.svg';
import PapersLoader from '../components/loaders/PapersLoader';
import PapersLoaderResponsive from '../components/loaders/PapersLoader_responsive';
import PaperCard from '../components/PaperCard';
import PaperCardResponsive from '../components/PaperCard_responsive';

let homePageTrendingDataCache = [];
let homePageSearchDataCache = {};
let lastSearchInput = "";
let homePageScrollPosition = 0;

function gatherAllCachedPapers(query) {
  let allPapers = [];
  let lastKnownNextPage = 1;

  if (query && homePageSearchDataCache[query]) {
    const sortedPages = Object.keys(homePageSearchDataCache[query])
      .map(Number)
      .sort((a, b) => a - b);

    for (const pageNum of sortedPages) {
      const entry = homePageSearchDataCache[query][pageNum];
      allPapers = allPapers.concat(entry.papers);
      lastKnownNextPage = entry.nextPage; 
    }
  }
  return [allPapers, lastKnownNextPage];
}

const HomePage = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 800);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [trendingPapers, setTrendingPapers] = useState(homePageTrendingDataCache || []);
  const [searchInput, setSearchInput] = useState(lastSearchInput || "");
  const [initialCachedPapers, initialCachedNextPage] = gatherAllCachedPapers(lastSearchInput);
  const [searchPapers, setSearchPapers] = useState(initialCachedPapers);
  const [nextPage, setNextPage] = useState(initialCachedNextPage);
  const [isSearching, setIsSearching] = useState(false);
  const loaderRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  const itemsPerPage = 5;

  const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL;

  const trending_items = isDesktop ? trendingPapers.map((paperrepo, index) => (
    <TrendingCard
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
    <TrendingCardResponsive
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

  const searchCards = isDesktop ? searchPapers.map((paperrepo, index) => (
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
  )) : searchPapers.map((paperrepo, index) => (
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

  const handleArrowClick = (route) => {
    if (trendingPapers.length > 0) {
      navigate(route, { state: { trendingPapers }});
    } else {
      navigate(route);
    }
  };

  const fetchSearchPapers = async (query, page) => {
    try {
      setIsSearching(true);

      if (homePageSearchDataCache[query] && homePageSearchDataCache[query][page]) {
        setSearchPapers(prev => [...prev, ...homePageSearchDataCache[query][page].papers]);
        setNextPage(homePageSearchDataCache[query][page].nextPage);
        return;
      }

      const response = await axios.get(`${proxyBaseUrl}/search?items=${itemsPerPage}&page=${page}&query=${query}`);

      if (!homePageSearchDataCache[query]) {
        homePageSearchDataCache[query] = {};
      }
      homePageSearchDataCache[query][page] = {
        papers: response.data.paperrepos,
        nextPage: response.data.next_page
      };

      setSearchPapers(prev => [...prev, ...response.data.paperrepos]);
      setNextPage(response.data.next_page);
    } catch (error) {
      console.error("Error fetching data from backend:", error);
      setErrorMessage("Failed to fetch data from the server. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  }

  const handleInitialSearch = () => {
    document.activeElement.blur();

    const trimmedInput = searchInput.trim();

    if (trimmedInput === "") {
      setSearchPapers([]);
      setNextPage(1);
      setErrorMessage("");
      lastSearchInput = "";
      return;
    }

    setErrorMessage("");
    setNextPage(1);
    setSearchPapers([]);

    lastSearchInput = trimmedInput;
    fetchSearchPapers(searchInput.trim(), 1);
  }

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value);
  };

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 800);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchTrendingPapers = async (items = 10, page = 1) => {
      if (homePageTrendingDataCache.length > 0) {
        setTrendingPapers(homePageTrendingDataCache);
        setIsLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${proxyBaseUrl}/?items=${items}&page=${page}`);
        homePageTrendingDataCache = response.data.paperrepos
        setTrendingPapers(homePageTrendingDataCache);
      } catch (error) {
        console.error("Error fetching data from backend:", error);
        setErrorMessage("Failed to fetch data from the server. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchTrendingPapers(10, 1);
  }, []);

  useEffect(() => {
    const observerCallback = (entries) => {
      if (entries[0].isIntersecting && !isSearching && nextPage !== null) {
        fetchSearchPapers(searchInput.trim(), nextPage);
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
  }, [nextPage, isSearching, searchInput]);

  useLayoutEffect(() => {
    const container = containerRef.current;
  
    if (container) {
      container.scrollTop = homePageScrollPosition;
    }
  
    return () => {
      if (container) {
        homePageScrollPosition = container.scrollTop;
      }
    };
  }, []);

  return (
    <div className='home-main-container' ref={containerRef}>
      <div className="sub-container">
        <div className="content-main-container">
          <div className="logo-title-wrapper">
            <div className="logo-container">
              <img src={logogif2} alt="ResearchPaL Logo" className="logo-image" />
              <h1 className="app-title">ResearchPaL</h1>
            </div>
          </div> 

          <div className="sub-title-container">
            <h2>Your AI-Powered Research Assistant Tool</h2>
            <p>
              <strong>ResearchPaL</strong> strives to assist you in staying updated
              with rapid advancements while overcoming the challenges of
              information overload in the AI research community.
            </p>
          </div>
        </div>

        <div className="search-bar-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for a paper title or abstract"
              className="search-input"
              aria-label="Search"
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleInitialSearch();
                }
              }}
            />
            <button className="search-button" aria-label="Search Button" onClick={handleInitialSearch}>
              Search
            </button>
          </div>
        </div>
      </div>

      {isSearching && searchPapers.length === 0 ? 
      <div className='search-loading-container'>
        {isDesktop ? <PapersLoader numCards={3} /> : <PapersLoaderResponsive numCards={3} />}
      </div>
      : searchPapers.length ? 
        <div className='search-results-container'>
          {searchCards}
          {nextPage === null && <div className='error-message-container'><span>{"--- End of Results ---"}</span></div>}
          {nextPage !== null && errorMessage && <div className="error-message-container"><span>{errorMessage}</span></div>}
          {nextPage !== null && !errorMessage && (
            <div className="loader-observer" ref={loaderRef}>
              {isDesktop ? <PapersLoader numCards={1} /> : <PapersLoaderResponsive numCards={1} />}
            </div>
          )}
        </div>
      : nextPage === null ? <div className='error-message-container'><span>{"Cannot find the paper you are looking for :("}</span></div>
      : errorMessage ? <div className='error-message-container'><span>{errorMessage}</span></div>
      : <div className='trending-container'>
          <div className='trending-label-container'>
            <div className='trending-label'>
              <img src={TrendingIcon} alt="trending icon" />
              <span>Trending Papers</span>
            </div>
            <div
              className='trending-arrow-button'
              title='go to Trending page'
              onClick={() => handleArrowClick('/trending')}
            >
              <img src={ElongatedArrowIcon} alt='elongated arrow' />
            </div>
          </div>
          <div className='trending-content'>
            {isLoading ? (
              isDesktop ? <CarouselLoader /> : <CarouselLoaderResponsive />
            ) : (
              <TrendingCarousel items={trending_items} />
            )}
          </div>
      </div>
      }
    </div>
  );
};

export default HomePage;