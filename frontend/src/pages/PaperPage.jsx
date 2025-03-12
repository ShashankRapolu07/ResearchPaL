import React, { useState, useEffect, useRef } from "react";
import './PaperPage.css';
import { useLocation, useNavigate } from "react-router-dom";
import DotSeparator from '../assets/svgs/dot-separator.svg';
import GithubStarIcon from '../assets/images/github-star.png';
import TensorflowLogo from '../assets/images/tensorflow-logo.png';
import PyTorchLogo from '../assets/images/pytorch-logo.png';
import ResearchPalIcon from '../assets/images/researchpal.png';
import PDFIcon from '../assets/images/pdf.png';
import GithubIcon from '../assets/images/github.png';
import PDFPreviewModal from "../components/PDFPreviewModal";
import { BarsSpinner } from "react-spinners-kit";
import { Document, Page} from "react-pdf";
import { waveform, ring2, dotPulse } from "ldrs";
import ReactMarkdown from "react-markdown";

waveform.register();
ring2.register();
dotPulse.register();

const CHUNK_SIZE = 1;
const REVEAL_INTERVAL_MS = 15;
const BLINK_INTERVAL_MS = 250;
const QUERY_LENGTH_LIMIT = 150;
const COOLDOWN_MS = 2000;

const chunkify = (str, size = CHUNK_SIZE) => {
    const result = [];
    for (let i = 0; i < str.length; i += size) {
      result.push(str.slice(i, i + size));
    }
    return result;
  };

const PaperPage = () => {
    const [showPDFPreview, setShowPDFPreview] = useState(false);
    const [numPages, setNumPages] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageWidth, setPageWidth] = useState(790);
    const [isTyping, setIsTyping] = useState(false);
    const [question, setQuestion] = useState("");
    const [paperData, setPaperData] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [pdfDataURL, setPdfDataURL] = useState(null);
    const [isAgentActive, setIsAgentActive] = useState(false);
    const [isAgentLoading, setIsAgentLoading] = useState(false);
    const [displayedResponse, setDisplayedResponse] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamError, setStreamError] = useState(null);
    const [isHoveringOnResponseContainer, setIsHoveringOnResponseContainer] = useState(false);
    const [blinkingCursor, setBlinkingCursor] = useState(true);
    const [coolingDown, setCoolingDown] = useState(false);
    const [keepPdfBlobUrlAlive, setKeepPdfBlobUrlAlive] = useState(false);
    const incomingChunksQueueRef = useRef([]);
    const streamingInProgressRef = useRef(false);
    const abortControllerRef = useRef(null);
    const answerContainerRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const pdfDownloadAbortControllerRef = useRef(null);

    const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL;

    const updatePageWidth = () => {
        if (window.innerWidth > 1300) {
            setPageWidth(950);
        } else if (window.innerWidth > 1000) {
            setPageWidth(window.innerWidth - 492);
        } else if (window.innerWidth > 900) {
            setPageWidth(window.innerWidth - 460);
        } else if (window.innerWidth > 830) {
            setPageWidth(window.innerWidth - 450);
        } else if (window.innerWidth > 420) {
            setPageWidth(window.innerWidth - 120)
        } else {
            setPageWidth(window.innerWidth - 100);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const openPDFPreview = () => {
        if (!loading) {
          window.dispatchEvent(new CustomEvent("pdf-opened"));
          setShowPDFPreview(true);
        }
    };
    
    const closePDFPreview = () => {
        window.dispatchEvent(new CustomEvent("pdf-closed"));
        setShowPDFPreview(false);
    };
    
    const handleLoadSuccess = (pages) => {
        onDocumentLoadSuccess(pages);
        setLoading(false);
    };

    const handleTyping = (e) => {
        let inputVal = e.target.value;
        if (inputVal.length > QUERY_LENGTH_LIMIT) {
            inputVal = inputVal.slice(0, QUERY_LENGTH_LIMIT);
        }
        setQuestion(inputVal);
        setIsTyping(inputVal > 0);
    };

    const handleSuggestionClick = (suggestion) => {
        setQuestion(suggestion);
    };

    const handleMouseEnterOnResponseContainer = () => setIsHoveringOnResponseContainer(true);
    const handleMouseLeaveOnResponseContainer = () => setIsHoveringOnResponseContainer(false);

    const handleSubmit = async () => {
        if (coolingDown) return;
        if (isAgentLoading || !isAgentActive || !question || !paperData?.paper?.url_pdf) return;

        setQuestion(question.trim());
        if (!question) return;

        if (isStreaming) {
            setCoolingDown(true);
            setTimeout(() => setCoolingDown(false), COOLDOWN_MS);

            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            setIsStreaming(false);
            streamingInProgressRef.current = false;
            incomingChunksQueueRef.current = [];
            setStreamError("*interrupted*");
            return;
        }

        setCoolingDown(true);
        setTimeout(() => setCoolingDown(false), COOLDOWN_MS);

        setIsTyping(true);
        setDisplayedResponse("");
        setStreamError(null);
        setIsStreaming(true);
        incomingChunksQueueRef.current = [];
        streamingInProgressRef.current = true;

        const abortController = new AbortController();
        abortController.current = abortController;

        try {
            const now = new Date();
            const simplifiedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

            const requestBody = {
                query: question,
                url: paperData.paper.url_pdf,
                title: paperData?.paper?.title || "",
                published: paperData?.paper?.published || "",
                authors: paperData?.paper?.authors || [], // ensure this is an array
                code_url: paperData?.repository?.url || "",
                framework: paperData?.repository?.framework || "",
                stars: paperData?.repository?.stars ? paperData.repository.stars.toString() : "",
                time_of_asking: simplifiedTime
            };

            const responseStream = await fetch(`${proxyBaseUrl}/ask_ai_agent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: abortController.signal
            });
            
            if (!responseStream.body) {
                throw new Error("Stream body is not available.");
            }

            const reader = responseStream.body.getReader();
            const decoder = new TextDecoder("utf-8");

            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    streamingInProgressRef.current = false;
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });

                const subChunks = chunkify(chunk);
                for (const sub of subChunks) {
                    incomingChunksQueueRef.current.push(sub);
                }
            }
        } catch (error) {
            if (error.name === "AbortError") {
                console.log("Streaming was aborted by the user.");
            } else {
                setStreamError("*some unexpected error occurred*");
                console.error("Error streaming AI response:", error);
            }
            streamingInProgressRef.current = false;
        }
    };

    const handleEditorClick = () => {
        if (!paperData) return;

        if (pdfDownloadAbortControllerRef.current) {
            pdfDownloadAbortControllerRef.current.abort();
            pdfDownloadAbortControllerRef.current = null;
        }

        if (pdfDataURL) {
            setKeepPdfBlobUrlAlive(true);
        }

        navigate('/editor', { state: { paper: paperData.paper, repository: paperData.repository, pdfDataURL } });
    }

    useEffect(() => {
        updatePageWidth();
        window.addEventListener("resize", updatePageWidth);
    
        return () => window.removeEventListener("resize", updatePageWidth);
    }, []);

    useEffect(() => {
        if (location.state !== null) {
            setPaperData({
                paper: {
                    title: location.state.paper.title,
                    abstract: location.state.paper.abstract,
                    authors: location.state.paper.authors,
                    published: location.state.paper.published,
                    url_pdf: location.state.paper.url_pdf
                },
                repository: {
                    url: location.state.repository?.url,
                    owner: location.state.repository?.owner,
                    name: location.state.repository?.name,
                    framework: location.state.repository?.framework,
                    stars: location.state.repository?.stars
                }
            });
        }
    }, [location.state]);

    useEffect(() => {
        if (paperData === null) return;

        const abortController = new AbortController();
        pdfDownloadAbortControllerRef.current = abortController;

        const fetchPdf = async () => {
          setLoading(true);
          setFetchError(null);
    
          try {
            const response = await fetch(
                `${proxyBaseUrl}/paper_pdf?url=${encodeURIComponent(paperData.paper.url_pdf)}`,
                { signal: abortController.signal }
            );

            if (response.status !== 200) {
              throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
            }

            const blob = await response.blob();
            const pdfObjectUrl = URL.createObjectURL(blob);

            setPdfDataURL(pdfObjectUrl);
          } catch (error) {
            console.error("Error fetching PDF:", error);
            setFetchError("Failed to load PDF.");
          } finally {
            setLoading(false);
          }
        };
    
        fetchPdf();
    
        return () => {
            abortController.abort();
            pdfDownloadAbortControllerRef.current = null;

            if (!keepPdfBlobUrlAlive && pdfDataURL) {
              URL.revokeObjectURL(pdfDataURL);
            }
        };
      }, [paperData, keepPdfBlobUrlAlive]);

    useEffect(() => {
        if (!paperData?.paper?.url_pdf) return;
    
        const prepareRag = async () => {
            setIsAgentLoading(true);
            try {
                const response = await fetch(`${proxyBaseUrl}/prepare_paper_for_rag?url=${encodeURIComponent(paperData.paper.url_pdf)}`);
                if (!response.ok) {
                    throw new Error(`Failed to prepare paper for RAG. Status: ${response.status}`);
                }
                setIsAgentActive(true);
            } catch (error) {
                console.error("Error preparing paper for RAG:", error);
                setIsAgentActive(false);
            } finally {
                setIsAgentLoading(false);
            }
        };
    
        prepareRag();
    }, [paperData?.paper?.url_pdf]);

    useEffect(() => {
        if (isStreaming) {
            const intervalId = setInterval(() => {
                if (incomingChunksQueueRef.current.length > 0) {
                    const nextSubChunk = incomingChunksQueueRef.current.shift();
                    setDisplayedResponse(prev => prev + nextSubChunk);
                    if (!isHoveringOnResponseContainer && answerContainerRef.current) {
                        answerContainerRef.current.scrollTo({ top: answerContainerRef.current.scrollHeight, behavior: 'smooth' });
                    }
                } else if (!streamingInProgressRef.current) {
                    clearInterval(intervalId);
                    setIsStreaming(false);
                }
            }, REVEAL_INTERVAL_MS);

            return () => clearInterval(intervalId);
        }
    }, [isStreaming, isHoveringOnResponseContainer]);

    useEffect(() => {
        if (isStreaming) {
            const interval = setInterval(() => {
                setBlinkingCursor((prev) => !prev);
            }, BLINK_INTERVAL_MS);
    
            return () => clearInterval(interval);
        }
    }, [isStreaming]);

    useEffect(() => {
        return () => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        };
      }, []);

    return (
        <div className="paperpage-main-container-wrapper">
            {
                paperData ?
                (<div className="paperpage-main-container">
                <div className="paperpage-container">
                    <div className="paperpage-left-content">
                        <div className="paperpage-left-main">
                            <div
                                className="paperpage-pdf-preview-container"
                                onClick={() => openPDFPreview()}
                                style={{ backgroundColor: pdfDataURL ? 'white' : 'rgba(255, 255, 255, 0.2)', pointerEvents: pdfDataURL ? 'auto' : 'none' }}
                            >
                                {loading && (
                                    <div className="trending-pdf-loader">
                                    <BarsSpinner size={20} color="#DEDEDE" />
                                    </div>
                                )}
                                {fetchError && (
                                <div className="paperpage-pdf-preview-error-container">
                                    <span>{fetchError}</span>
                                </div>
                                )}
                                {!loading && !fetchError && pdfDataURL && (
                                    <Document
                                        file={pdfDataURL}
                                        onLoadSuccess={handleLoadSuccess}
                                        loading={null}
                                        onLoadError={(error) => {
                                            console.error("Error loading PDF document:", error);
                                            setFetchError("Failed to load PDF file.");
                                        }}
                                    >
                                        {Array.from({ length: Math.min(numPages, 1) }, (_, index) => (
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
                            <div className="paperpage-title">
                                <span>
                                    {paperData.paper.title}
                                </span>
                            </div>
                            <div className="paperpage-metadata">
                                <div className="paperpage-date-container">
                                    <span>{paperData.paper.published}</span>
                                </div>
                                {paperData.repository.url === undefined ? (
                                    <div className="paperpage-dot-container"><img src={DotSeparator} alt="dot" /></div>
                                ) : null}
                                {paperData.repository.url === undefined ? (
                                    <div className="paperpage-no-code-container"><span>{"Code not available"}</span></div>
                                ) : null}
                                {paperData.repository.url === undefined ? null : window.innerWidth > 300 ? <div className="paperpage-dot-container">
                                    <img src={DotSeparator} alt="dot" />
                                </div> : null}
                                {paperData.repository.owner === undefined ? null : window.innerWidth > 300 ? <div className="paperpage-github-profile-container">
                                    <span>{paperData.repository.owner}/{paperData.repository.name}</span>
                                </div> : null}
                                {paperData.repository.stars === undefined ? null : window.innerWidth >= 382 ? <div className="paperpage-dot-container">
                                    <img src={DotSeparator} alt="dot" />
                                </div> : null}
                                {paperData.repository.framework === undefined ? null : window.innerWidth >= 382 ? <div className="paperpage-code-framework-container">
                                    {paperData.repository.framework === "tf" ? <img className="paperpage-code-framework-tf" src={TensorflowLogo} alt="tf-icon"/> : <img className="paperpage-code-framework-pytorch" src={PyTorchLogo} alt="pytorch-icon" />}
                                </div> : null}
                                {paperData.repository.url === undefined ? null : <div className="paperpage-dot-container">
                                    <img src={DotSeparator} alt="dot" />
                                </div>}
                                {paperData.repository.stars === undefined ? null : <div className="paperpage-github-stars-container">
                                    <div><img src={GithubStarIcon} alt="star icon" /></div>
                                    <span>{paperData.repository.stars}</span>
                                </div>}
                            </div>
                            <div className="paperpage-authors-container">
                                <div className="paperpage-authors-title-container">
                                    <span>Authors</span>
                                </div>
                                <div className="paperpage-authors-content">
                                    {paperData.paper.authors.length === 0 ? (
                                        <div className="paperpage-no-authors-container"><span>{"-- no data --"}</span></div>
                                    ) : (
                                        <span>
                                            {paperData.paper.authors.map((author, index) => {
                                                if (index < paperData.paper.authors.length - 1) {
                                                    return author + ', '
                                                } else {
                                                    return author
                                                }
                                            })}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="paperpage-abstract-container">
                                <div className="paperpage-abstract-title-container">
                                    <span>Abstract</span>
                                </div>
                                <div className="paperpage-abstract-content">
                                    <span>
                                    {paperData.paper.abstract}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="paperpage-right-content">
                        <div className="paperpage-ai-container">
                            <div className="paperpage-ask-ai-agent">
                                <span>Ask AI Agent</span>
                            </div>
                            <div className="paperpage-ai-question-container">
                                <textarea 
                                    placeholder={(!isAgentLoading && isAgentActive) ? "Ask a question..." : ""}
                                    className="paperpage-ai-question-input"
                                    rows={2}
                                    onChange={handleTyping}
                                    value={question}
                                    disabled={isAgentLoading || !isAgentActive || isStreaming}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                />
                                {question.length > 0 && (
                                    <div className="paperpage-ai-question-counter">
                                        {question.length}/{QUERY_LENGTH_LIMIT}
                                    </div>
                                )}
                            </div>
                            <div className={`paperpage-ai-suggestions-container ${isTyping ? 'hidden' : ''}`}>
                                <div className="paperpage-ai-suggestions-title">
                                    <span>Suggestions</span>
                                </div>
                                <div className="paperpage-ai-suggestions-questions-container">
                                    <div
                                        className={`paperpage-ai-suggestions-question ${(isAgentLoading || !isAgentActive) ? 'disabled': ''}`}
                                        onClick={() => {
                                            if (isAgentLoading || !isAgentActive) return;
                                            handleSuggestionClick("What is the goal of the paper?")
                                            }}
                                        >
                                        <span>What is the goal of the paper?</span>
                                    </div>
                                    <div
                                        className={`paperpage-ai-suggestions-question ${(isAgentLoading || !isAgentActive) ? 'disabled': ''}`}
                                        onClick={() => {
                                            if (isAgentLoading || !isAgentActive) return;
                                            handleSuggestionClick("What are the key results of the paper?")
                                            }}
                                        >
                                        <span>What are the key results of the paper?</span>
                                    </div>
                                    <div
                                        className={`paperpage-ai-suggestions-question ${(isAgentLoading || !isAgentActive) ? 'disabled': ''}`}
                                        onClick={() => {
                                            if (isAgentLoading || !isAgentActive) return;
                                            handleSuggestionClick("What are the methods used?")
                                            }}
                                        >
                                        <span>What are the methods used?</span>
                                    </div>
                                </div>
                            </div>
                            <div
                                className={`paperpage-ai-answer-container ${(isAgentLoading || !isAgentActive) ? 'disabled' : ''}`}
                                ref={answerContainerRef}
                                onMouseEnter={handleMouseEnterOnResponseContainer}
                                onMouseLeave={handleMouseLeaveOnResponseContainer}
                            >
                                {isAgentLoading ? <div className="paperpage-agent-loader">
                                    <l-ring-2 size="17" speed="0.4" stroke="2.5" color="rgb(58, 80, 103)"></l-ring-2>
                                    <div className="paperpage-agent-loader-text">
                                        <span>Getting Agent ready</span>
                                        <div className="paperpage-agent-loader-dotpulse"><l-dot-pulse size="12" speed="1.3" color="rgb(58, 80, 103)"></l-dot-pulse></div>
                                    </div>
                                </div>
                                : isAgentActive ?
                                    displayedResponse.length === 0 && !streamError ? (
                                        <div className="paperpage-agent-active-message-placeholder">
                                          {!isStreaming ? <span>{"AI Agent's responses might not always be accurate. Please cross-check for accuracy."}</span> : (
                                            <span className="paperpage-stream-loader-inline">
                                                {/* <l-waveform size="12" speed="0.8" stroke="2.3" color="rgba(44, 62, 81, 1)"></l-waveform> */}
                                                {blinkingCursor ? "|" : ""}
                                            </span>
                                            )}
                                        </div>
                                      ) : (
                                        <div className="paperpage-agent-active-message-response">
                                            <ReactMarkdown className="paperpage-response-markdown">
                                            {`${displayedResponse}${isStreaming && blinkingCursor ? "|" : ""}`}
                                            </ReactMarkdown>
                                        </div>
                                      )
                                : (
                                    <span className="paperpage-agent-inactive-message">AI Agent offline due to PDF loading error.</span>
                                )}
                                {streamError !== null ? <span className="paperpage-streamerror">{streamError}</span> : null}
                            </div>
                            <button 
                                className="paperpage-ai-submit-button"
                                onClick={handleSubmit}
                                disabled={isAgentLoading || !isAgentActive}
                                title={(isAgentLoading || !isAgentActive) ? null : !isStreaming ? "ask ai agent" : "interrupt ai agent"}
                            >
                                {
                                    isStreaming ? 
                                        <span className="paperpage-stream-loader-inline">
                                            <l-waveform size="16" speed="0.8" stroke="2.3" color="rgba(255, 255, 255, 1)"></l-waveform>
                                        </span>
                                            : "Submit"
                                }
                            </button>
                        </div>
                        <div className="paperpage-right-content-filler"></div>
                        <div className="paperpage-buttons-container">
                            <div className="paperpage-researchpal-button-container">
                                <button className="paperpage-researchpal-button" onClick={handleEditorClick}>
                                    <img src={ResearchPalIcon} alt="github icon" />
                                    <span>Open with ResearchPaL</span>
                                </button>
                            </div>
                            <div className="paperpage-meta-buttons-container">
                                <button
                                    className="paperpage-pdf-button"
                                    onClick={() => {
                                        if (paperData.paper?.url_pdf) {
                                            window.open(paperData.paper.url_pdf, "_blank", "noopener noreferrer");
                                        }
                                    }}
                                    disabled={!paperData.paper?.url_pdf}
                                >
                                    <img src={PDFIcon} alt="pdf icon" />
                                    <span>PDF</span>
                                </button>
                                {
                                    paperData.repository?.url === undefined ?
                                    null :
                                    <button
                                        className="paperpage-github-button"
                                        onClick={() => {
                                            if (paperData.repository?.url) {
                                                window.open(paperData.repository.url, "_blank", "noopener noreferrer");
                                            }
                                        }}
                                        disabled={!paperData.repository?.url}
                                    >
                                        <img src={GithubIcon} alt="github icon" />
                                        <span>Code</span>
                                    </button>
                                }
                            </div>
                        </div>
                    </div>
                    {showPDFPreview && (
                    <PDFPreviewModal
                        onClose={closePDFPreview}
                        extPdfData={pdfDataURL}
                        numPages={numPages}
                    />
                )}
                </div>
            </div>) : <div className="paperpage-no-data-container"><span>{"Failed to fetch the paper data. Please try again."}</span></div>
            }
        </div>
    );
};

export default PaperPage;