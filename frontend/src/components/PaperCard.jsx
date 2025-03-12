import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./PaperCard.css";
import DotSeparatorIcon from '../assets/svgs/dot-separator.svg';
import PyTorchLogo from '../assets/images/pytorch-logo.png';
import TensorflowLogo from '../assets/images/tensorflow-logo.png';
import GithubStarIcon from '../assets/images/github-star.png';
import PDFPreviewModal from "./PDFPreviewModal";
import { BarsSpinner } from "react-spinners-kit";

const thumbnailCache = new Map();

const PaperCard = (props) => { 
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageWidth, setPageWidth] = useState(200);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [thumbnailError, setThumbnailError] = useState(null);
  const isMounted = useRef(true);
  const navigate = useNavigate();

  const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL; // Update to production URL when deployed

  const updatePageWidth = () => {
    if (window.innerWidth > 1000) {
      setPageWidth(200);
    } else if (window.innerWidth > 950) {
      setPageWidth(165)
    } else if (window.innerWidth > 900) {
      setPageWidth(146)
    } else if (window.innerWidth > 830) {
      setPageWidth(137)
    } else {
      setPageWidth(125)
    }
  };

  const openPDFPreview = () => {
    if (thumbnailUrl && !loading && !thumbnailError) {
      window.dispatchEvent(new CustomEvent("pdf-opened"));
      setShowPDFPreview(true);
    }
  };

  const closePDFPreview = () => {
    window.dispatchEvent(new CustomEvent("pdf-closed"));
    setShowPDFPreview(false);
  };

  const handlePaperPageNavigation = () => {
    navigate('/paper', { state: props });
  }

  const fetchThumbnail = async () => {
    if (!props.paper.url_pdf) return;

    setLoading(true);
    setThumbnailError(null);

    const cacheKey = props.paper.url_pdf;

    if (thumbnailCache.has(cacheKey)) {
      setThumbnailUrl(thumbnailCache.get(cacheKey));
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${proxyBaseUrl}/paper_thumbnail?url=${encodeURIComponent(props.paper.url_pdf)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      thumbnailCache.set(cacheKey, imageUrl);
      if (isMounted.current) {
        setThumbnailUrl(imageUrl);
        setLoading(false);
      }
      setThumbnailUrl(imageUrl);
    } catch (error) {
      console.error("Error fetching thumbnail:", error);
      if (isMounted.current) {
        setThumbnailError("Failed to load thumbnail.");
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updatePageWidth();
    window.addEventListener("resize", updatePageWidth);

    return () => window.removeEventListener("resize", updatePageWidth);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchThumbnail();

    return () => {
      isMounted.current = false;
    };
  }, [props.paper.url_pdf]);

  return (
    <div className="paper-card" onClick={handlePaperPageNavigation}>
      <div className="index-container">
        <div className="index-text">{props.rank}</div>
      </div>

      <div className="left-divider-container">
        <div className="left-dividing-line"></div>
      </div>

      <div className="main-content">
        <div className="title-and-abstract-container">
          <div className="title-container">
            <div className="title-text">{props.paper.title}</div>
          </div>
          <div className="abstract-container">
            <div className="abstract-text">{props.paper.abstract}</div>
          </div>
        </div>

        <div className="metadata-container">
          <div className="code-stats-container">
            <div className="date-container"><span>{props.paper.published}</span></div>
            <div className="dot-separator"><img src={DotSeparatorIcon} alt="dot"/></div>
            <div className="github-profile">
              {props.repository.owner === undefined ? <span>{"Code not available"}</span> : <a>{props.repository.owner}/{props.repository.name}</a>}
            </div>
            {props.repository.owner === undefined ? null : <div className="dot-separator"><img src={DotSeparatorIcon} alt="dot"/></div>}
            {props.repository.owner === undefined ? null : <div className="code-framework">{props.repository.framework === "tf" ? <img className="code-framework-tf" src={TensorflowLogo} alt="code framework icon"/> : <img className="code-framework-pytorch" src={PyTorchLogo} alt="code framework icon"/>}</div>}
            {props.repository.owner === undefined ? null : <div className="dot-separator"><img src={DotSeparatorIcon} alt="dot"/></div>}
            {props.repository.owner === undefined ? null : <div className="github-stars">
                <div className="github-stars-img-container"><img src={GithubStarIcon} alt="GitHub Star"/></div>
                <span>{props.repository.stars}</span>
            </div>}
          </div> 
        </div>
      </div>

      <div className="right-divider-container">
        <div className="right-dividing-line"></div>
      </div>

      <div
        className={`pdf-preview-container ${loading || thumbnailError ? "no-hover" : ""}`}
        title="paper preview"
        onClick={(e) => {
          e.stopPropagation();
          openPDFPreview();
        }}
      >
        {loading && (
          <div className="pdf-loader">
            <BarsSpinner size={20} color="#DEDEDE" />
          </div>
        )}
        {thumbnailError && (
            <div className="papercard-error-container">
              Failed to load Paper thumbnail.
            </div>
          )}
        {thumbnailUrl && !loading && !thumbnailError && (
          <img
            src={thumbnailUrl}
            alt={"paper thumbnail"}
            width={pageWidth}
            height="auto"
            loading="lazy"
          />
        )}
      </div>

      {showPDFPreview && (
        <PDFPreviewModal
          onClose={closePDFPreview}
          pdfUrl={`${proxyBaseUrl}/paper_pdf?url=${encodeURIComponent(props.paper.url_pdf)}`}
        />
      )}
    </div>
  );
};

export default PaperCard;