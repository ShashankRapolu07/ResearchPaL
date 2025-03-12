import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import './TrendingCard_responsive.css';
import DotSeparatorIcon from '../assets/svgs/dot-separator.svg';
import PyTorchLogo from '../assets/images/pytorch-logo.png';
import TensorflowLogo from '../assets/images/tensorflow-logo.png';
import GithubStarIcon from '../assets/images/github-star.png'; 
import PDFPreviewModal from "./PDFPreviewModal";
import { BarsSpinner } from "react-spinners-kit";

const thumbnailCache = new Map();

const TrendingCardResponsive = (props) => {
    const [showPDFPreview, setShowPDFPreview] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pageWidth, setPageWidth] = useState(500);
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(null);
    const isMounted = useRef(true);
    const navigate = useNavigate();

    const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL;

    const updatePageWidth = () => {
        if (window.innerWidth > 500) {
            setPageWidth(250)
        } else if (window.innerWidth > 400) {
            setPageWidth(230)
        } else {
            setPageWidth(210)
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
        <div className="trending-card-responsive" onClick={handlePaperPageNavigation}>
            <div
                className={`trending-pdf-preview-container-responsive ${loading || thumbnailError ? "no-hover" : ""}`}
                title="paper preview"
                onClick={(e) => {
                    e.stopPropagation();
                    openPDFPreview();
                }}
            >
                {loading && (
                    <div className="trending-pdf-loader-responsive">
                        <BarsSpinner size={20} color="#DEDEDE" />
                    </div>
                )}
                {thumbnailError && (
                    <div className="trending-error-container-responsive">
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
            <div className="trending-main-content-responsive">
                <div className="trending-title-and-abstract-container-responsive">
                    <div className="trending-title-container-responsive">
                        <span>{props.paper.title}</span>
                    </div>
                    <div className="trending-abstract-container-responsive">
                        <span>{props.paper.abstract}</span>
                    </div>
                </div>
                <div className="trending-metadata-container-responsive">
                    <div className="trending-date-container-responsive"><span>{props.paper.published}</span></div>
                    <div className="trending-code-stats-container-responsive">
                        <div className="trending-github-profile-responsive">{props.repository.owner === undefined ? <span>{"Code not available"}</span> : <a>{props.repository.owner}/{props.repository.name}</a>}</div>
                        {props.repository.owner === undefined ? null : <div className="trending-dot-separator-responsive"><img src={DotSeparatorIcon} alt="dot"/></div>}
                        {props.repository.owner === undefined ? null : <div className="trending-code-framework-responsive">{props.repository.framework === "tf" ? <img className="trending-code-framework-tf-responsive" src={TensorflowLogo} alt="code framework icon"/> : <img className="trending-code-framework-pytorch-responsive" src={PyTorchLogo} alt="code framework icon"/>}</div>}
                        {props.repository.owner === undefined ? null : <div className="trending-dot-separator-responsive"><img src={DotSeparatorIcon} alt="dot"/></div>}
                        {props.repository.owner === undefined ? null : <div className="trending-github-stars-responsive">
                            <div className="trending-github-stars-img-container-responsive"><img src={GithubStarIcon} alt="GitHub Star"/></div>
                            <span>{props.repository.stars}</span>
                        </div>}
                    </div>    
                </div>
            </div>

            {showPDFPreview && (
                <PDFPreviewModal
                onClose={closePDFPreview}
                pdfUrl={`${proxyBaseUrl}/paper_pdf?url=${encodeURIComponent(props.paper.url_pdf)}`}
                />
            )}
        </div>
    )
}

export default TrendingCardResponsive;