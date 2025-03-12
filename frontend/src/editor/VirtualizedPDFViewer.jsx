import React, { useState, useEffect, useRef, useCallback, memo, forwardRef, useImperativeHandle } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { VariableSizeList as List } from "react-window";
import { debounce } from "lodash";
import { BarsSpinner } from "react-spinners-kit";
import PDFErrorIcon from '../assets/images/pdf error.png';
import "./VirtualizedPDFViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const ZOOM_STEP = 0.11;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.3;

const VirtualizedPDFViewer = ({ file, defaultPageWidth = 600, defaultPageHeight = 800, containerHeight, onVisibleRangeChange, isMobile=false }, ref) => {
    const [numPages, setNumPages] = useState(0);
    const [scaleFactor, setScaleFactor] = useState(0.8);
    const [baseHeights, setBaseHeights] = useState([]);
    const hasMeasured = useRef({});
    const listRef = useRef(null);

    const onDocumentLoadSuccess = useCallback((pdf) => {
        setNumPages(pdf.numPages);
        setBaseHeights(Array(pdf.numPages).fill(defaultPageHeight));
        hasMeasured.current = {};
    }, [defaultPageHeight]);

    // const handlePageRenderSuccess = useCallback((pageIndex, measuredHeight) => {
    //     if (scaleFactor !== 1.0) {
    //         return; 
    //       }
    
    //       if (hasMeasured.current[pageIndex]) {
    //         return;
    //       }

    //     hasMeasured.current[pageIndex] = true;
        
    //     setBaseHeights(prev => {
    //         const updated = [...prev];
    //         updated[pageIndex - 1] = measuredHeight;
    //         return updated;
    //     });
    //     if (listRef.current) {
    //         listRef.current.resetAfterIndex(pageIndex - 1);
    //     }
    // }, [scaleFactor]);

    const getItemSize = useCallback(
        (index) => {
          const base = baseHeights[index] || defaultPageHeight;
          return base * scaleFactor;
        },
        [baseHeights, scaleFactor, defaultPageHeight]
    );

    useImperativeHandle(
      ref,
      () => ({
        zoomIn: () => {
          setScaleFactor((prev) => Math.min(prev + ZOOM_STEP, MAX_SCALE));
          if (listRef.current) {
            listRef.current.resetAfterIndex(0);
          }
        },
        zoomOut: () => {
          setScaleFactor((prev) => Math.max(prev - ZOOM_STEP, MIN_SCALE));
          if (listRef.current) {
            listRef.current.resetAfterIndex(0);
          }
        },
        fitToWidth: (targetWidth) => {
          const proposedScale = targetWidth / defaultPageWidth;
          const clamped = Math.max(Math.min(proposedScale, MAX_SCALE), MIN_SCALE);
          setScaleFactor(clamped);
          if (listRef.current) {
            listRef.current.resetAfterIndex(0);
          }
        },
        changeToDefaultView: () => {
          setScaleFactor(0.8);
          if (listRef.current) {
            listRef.current.resetAfterIndex(0);
          }
        }
      }),
      []
    );

  //   useEffect(() => {
  //     if (isMobile) return;

  //     const handleResize = debounce(() => {
  //         setBaseHeights(Array(numPages).fill(defaultPageHeight));
  //         hasMeasured.current = {};
  
  //         if (listRef.current) {
  //             listRef.current.resetAfterIndex(0);
  //         }
  //     }, 0);
  
  //     window.addEventListener("resize", handleResize);
  //     window.addEventListener("orientationchange", handleResize);
  
  //     return () => {
  //         window.removeEventListener("resize", handleResize);
  //         window.removeEventListener("orientationchange", handleResize);
  //     };
  // }, [numPages, defaultPageHeight, isMobile]);

    const renderPageRow = useCallback(({ index, style }) => {
      const pageNumber = index + 1;
      const finalWidth = defaultPageWidth * scaleFactor;
      const finalHeight = baseHeights[index] * scaleFactor || defaultPageHeight * scaleFactor;

      const combinedStyle = {
          ...style,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          paddingTop: "5px",
          backgroundColor: 'rgba(255, 255, 255, 0)',
      }
      
      return (
          <div className="virtualized-pdf-viewer-page-container" style={combinedStyle}>
              <div
                  style={{
                  width: finalWidth,
                  height: finalHeight,
                  margin: "0 auto",
                  boxShadow: "0 0 4px rgba(0,0,0,0.2)",
                  position: "relative",
                  }}
              >
                  <Page
                      pageNumber={pageNumber}
                      width={finalWidth}
                      renderTextLayer={true}
                      renderAnnotationLayer={false}
                      // onRenderSuccess={(pageObject) => {
                      //     if (scaleFactor === 1.0) {
                      //         const pageDiv = pageObject.canvas?.parentNode;
                      //         const realHeight = pageDiv?.offsetHeight || finalHeight;
                      //         handlePageRenderSuccess(pageNumber, realHeight);
                      //     }
                      // }}
                      loading={null}
                  />
              </div>
          </div>
      );
    }, [defaultPageWidth, baseHeights, scaleFactor]);

    return (
        <div
            className="virtualized-pdf-viewer-container"
            style={{ height: `${containerHeight}px` }}
        >
            <div>
                <Document
                    className="virtualized-pdf-viewer-document"
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={(
                      <div
                      className="virtualized-pdf-viewer-pdf-loading-container"
                      style={{
                        height: containerHeight,
                        width: defaultPageWidth * 0.8
                      }}
                      >
                        <BarsSpinner size={20} color="#1E2A3C" />
                      </div>
                    )}
                    error={
                      <div style={{
                        height: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        <div className="editor-pdf-download-error-container">
                            <img src={PDFErrorIcon} alt="pdf error icon" />
                            <span>Failed to download PDF file. Please try again.</span>
                        </div>
                      </div>
                    }
                    noData={
                      <div className="virtualized-pdf-viewer-document-nodata">Failed to load PDF File.</div>
                  }
                >
                    {numPages && (
                        <List
                            ref={listRef}
                            className="virtualized-pdf-viewer-list"
                            height={containerHeight}
                            itemCount={numPages}
                            itemSize={getItemSize}
                            width={defaultPageWidth * scaleFactor + 12} 
                            overscanCount={2}
                            onItemsRendered={({ visibleStartIndex, visibleStopIndex }) => {
                                if (onVisibleRangeChange) {
                                  onVisibleRangeChange(visibleStartIndex, visibleStopIndex, numPages);
                                }
                              }}
                        >
                            {renderPageRow}
                        </List>
                    )}
                </Document>
            </div>
        </div>
    );
}

export default memo(forwardRef(VirtualizedPDFViewer));