import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import './PDFPreviewModel.css';
import { Document, Page } from "react-pdf";

const PDFPreviewModal = ({ onClose, pdfUrl=null, extPdfData=null, numPages=3 }) => {
  const [loading, setLoading] = useState(true);
  const [pageWidth, setPageWidth] = useState(800);
  const [pdfData, setPdfData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation() // to stop navigating to PaperPage
      onClose();
    }
  };

  const updatePageWidth = () => {
    if (window.innerWidth > 1200) {
      setPageWidth(570);
    } else if (window.innerWidth > 1000) {
      setPageWidth(510);
    } else if (window.innerWidth > 900) {
      setPageWidth(460);
    }else if (window.innerWidth > 800) {
      setPageWidth(430);
    } else if (window.innerWidth > 700) {
      setPageWidth(430);
    } else if (window.innerWidth > 600) {
      setPageWidth(370);
    } else if (window.innerWidth > 540) {
      setPageWidth(330);
    } else if (window.innerWidth > 500) {
      setPageWidth(290);
    } else {
      setPageWidth(240);
    }
  };

  const handleLoadSuccess = () => {
    setLoading(false);
  };

  useEffect(() => {
    updatePageWidth();
    window.addEventListener("resize", updatePageWidth);

    return () => window.removeEventListener("resize", updatePageWidth);
  }, []);

  useEffect(() => {
    if (pdfUrl === null) return;

    const fetchPdf = async () => {
      setLoading(true);
      setFetchError(null);
      setPdfData(null);

      try {
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
        }
        const blob = await response.blob();
        const pdfObjectUrl = URL.createObjectURL(blob);
        setPdfData(pdfObjectUrl);
      } catch (error) {
        console.error("Error fetching PDF:", error);
        setFetchError("Failed to load PDF. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      if (pdfData) {
        URL.revokeObjectURL(pdfData);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    if (extPdfData === null) return;
    setPdfData(extPdfData);
    setLoading(false);
    setFetchError(null);
  }, [extPdfData])

  return ReactDOM.createPortal(
    <div className="pdf-preview-open-container"  onClick={handleOverlayClick}>
      <div className="pdf-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header"><span>Paper Preview</span></div>
        <div className="pdf-holder">
          {loading && (
            <div className="loader-container">
              <div className="spinner"></div>
              <span>Loading Paper might take some time depending on your network speed.</span>
            </div>
          )}
          {fetchError && (
            <div className="pdf-preview-modal-error-container">
              <span>{fetchError}</span>
            </div>
          )}
          {!loading && !fetchError && pdfData && (
            <Document
              file={pdfData}
              onLoadSuccess={handleLoadSuccess}
              loading={null}
              onLoadError={(error) => {
                console.error("Error loading PDF document:", error);
                setFetchError("Error rendering PDF. Please try again later.");
              }}
            >
              {Array.from({ length: Math.min(numPages, 5) }, (_, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={null}
                />
              ))}
            </Document>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PDFPreviewModal;