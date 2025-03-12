import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import useWindowDimensions from "./useWindowDimensions";
import "./EditorPage.css";
import VirtualizedPDFViewer from "./VirtualizedPDFViewer";
import ChatContainer from "./ChatContainer";
import APIDialogOverlay from "./APIDialogOverlay";
import CSVModal from "./file_modals/CSVModal";
import PyModal from "./file_modals/PyModal";
import JsModal from './file_modals/JsModal';
import HtmlModal from './file_modals/HtmlModal';
import CssModal from "./file_modals/CssModal";
import ChatImagePreviewModal from './image_modals/ChatImagePreviewModal';
import MenuIcon from '../assets/images/menu.png';
import ZoomInIcon from '../assets/images/zoom-in.png';
import ZoomOutIcon from '../assets/images/zoom-out.png';
import MaximizeIcon from '../assets/images/maximize.png';
import MinimizeIcon from '../assets/images/minimize.png';
import FitWidthIcon from '../assets/images/fit-width.png';
import GalleryIcon from '../assets/images/gallery.png';
import GitHubIcon from '../assets/images/github 2.png';
import ThreeDotsIcon from '../assets/images/three dots.png';
import ChatOpenIcon from '../assets/images/chat-open.png';
import PDFErrorIcon from '../assets/images/pdf error.png';
import LeftArrowIcon from '../assets/images/left-arrow.png';
import BigDotRed from '../assets/images/big-dot red.png';
import BigDotGreen from '../assets/images/big-dot green.png';
import BigDotYellow from '../assets/images/big-dot yellow.png';
import { ring2, dotPulse } from "ldrs";
import CryptoJS from "crypto-js";
import axios from "axios";
import Dexie from 'dexie';
import { createDefaultVectorstore, createAdvancedVectorstore, loadDefaultVectorstore, loadAdvancedVectorstore } from "../rag/vectorstore/createVectorstore.tsx";
import { Settings } from "../rag/config.tsx";
import { getInitialSugesstions } from "../rag/suggestionsGenerator.tsx";
import { Toaster, toast } from 'sonner';
import { getMultipleEmbeddings } from "../rag/services/embeddingsService.tsx";
import { v4 as uuidv4 } from 'uuid';

ring2.register();
dotPulse.register();

const CHAT_CONTAINER_WIDTH_MIN = window.innerWidth > 1100 ? 300 : window.innerWidth > 1000 ? 220 : 190;
const CHAT_CONTAINER_WIDTH_MAX = window.innerWidth > 1700 ? 1100 : window.innerWidth > 1300 ? 1000 : window.innerWidth > 1100 ? 800 : window.innerWidth > 1000 ? 700 : window.innerWidth > 900 ? 650 : window.innerWidth > 800 ? 550 : window.innerWidth > 750 ? 380 : window.innerWidth > 630 ? 450 : 400;
const CHAT_CONTAINER_HEIGHT_MIN = 150;
const CHAT_CONTAINER_HEIGHT_MAX = window.innerHeight * 0.85;
const PAGE_INDICATOR_DURATION = 1000;
const TRANSITION_DURATION = 100;

const LLMOptionsExtension = ({
    company,
    options,
    isChatMenuExpanded,
    currentLLM,
    toggleSetCurrentLLM,
    toggleSetCurrentLLMAPIKey,
    toggleLLMOptions,
    toggleShowAPIDialogBox,
    localEncryptionKey,
    toggleTempLLMOptionChosenByLLMOptionsExtension,
    toggleModifyHasAPIKey,
    isMobile,
    pdfContainerHeight
}) => {
    const handleOnClick = (option) => {
        const encryptedApiKey = sessionStorage.getItem(`${company}-API-Key`);

        if (encryptedApiKey) {
            if (!localEncryptionKey) {
                sessionStorage.removeItem("OpenAI-API-Key");
                sessionStorage.removeItem("Anthropic-API-Key");
                sessionStorage.removeItem("Google-API-Key");
                sessionStorage.removeItem("Groq-API-Key");
                sessionStorage.removeItem("Adobe-CLIENT-ID");
                sessionStorage.removeItem("Adobe-CLIENT-SECRET");
                alert("Local encryption key lost from memory! Please re-enter all your API keys details by clicking on \"Choose Model\" button.");
                toggleModifyHasAPIKey({ OpenAI: false, Anthropic: false, Google: false, Groq: false, Adobe: false });
                toggleSetCurrentLLM(null);
                toggleSetCurrentLLMAPIKey(null);
                toggleTempLLMOptionChosenByLLMOptionsExtension(null);
                toggleLLMOptions();
                toggleShowAPIDialogBox(company);
                return;
            }

            try {
                const bytes = CryptoJS.AES.decrypt(encryptedApiKey, localEncryptionKey);
                const decryptedApiKey = bytes.toString(CryptoJS.enc.Utf8);

                if (!decryptedApiKey) {
                    alert("Failed to decrypt the API key. Please ensure the correct encryption key is used or re-enter your API and encryption key details..");
                } else {
                    toggleSetCurrentLLMAPIKey(decryptedApiKey);
                }
                toggleSetCurrentLLM(option);
                toggleLLMOptions();
            } catch (error) {
                sessionStorage.removeItem("OpenAI-API-Key");
                sessionStorage.removeItem("Anthropic-API-Key");
                sessionStorage.removeItem("Google-API-Key");
                sessionStorage.removeItem("Groq-API-Key");
                sessionStorage.removeItem("Adobe-CLIENT-ID");
                sessionStorage.removeItem("Adobe-CLIENT-SECRET");
                alert("Local encryption key lost from memory! Please re-enter all your API keys details by clicking on \"Choose Model\" button.");
                toggleModifyHasAPIKey({ OpenAI: false, Anthropic: false, Google: false, Groq: false, Adobe: false });
                toggleSetCurrentLLM(null);
                toggleSetCurrentLLMAPIKey(null);
                toggleTempLLMOptionChosenByLLMOptionsExtension(null);
                toggleLLMOptions();
            }
        } else {
            toggleTempLLMOptionChosenByLLMOptionsExtension(option);
            toggleShowAPIDialogBox(company);
        }
    };
    
    return (
        <div
            className="chat-llmoptions-extension-container"
            style={{
                right: isChatMenuExpanded ? 315 : 200,
                top: isMobile ? (pdfContainerHeight + 11 + 2) : null
            }}
        >
            {
                options.map((option, index) => {
                    return (
                        <div
                            key={option + index}
                            className={`chat-llmoptions-extension-option-button ${index === 0 ? 'top' : index === options.length - 1 ? 'bottom' : null}`} onClick={() => handleOnClick(option)}
                            style={
                                currentLLM === option ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <span>{option}</span>
                        </div>
                    );
                })
            }
        </div>
    );
};

const EditorCSVFileTemplate = ({ tableObj, toggleOpenCSVFileModal, chatContainerRef, providerName }) => {
    const handleClick = (e) => {
        if ((e.ctrlKey || e.metaKey) && chatContainerRef.current && chatContainerRef.current.attachPaperTable) {
            if (providerName === 'Groq') {
                toast.warning("Files not supported with current model");
                return;
            }
            const file = new File([new Uint8Array(tableObj.data)], tableObj.name, { type: "text/csv" });
            chatContainerRef.current.attachPaperTable(file);
        } else {
            toggleOpenCSVFileModal(tableObj);
        }
    };
  
    return (
      <div className="editor-csvfile-template-container" onClick={handleClick} title="CTRL (Windows/Linux) / Command (Mac) + click to attach">
        <span>{tableObj.name}</span>
      </div>
    );
};

const EditorPage = ({ localEncryptionKey, storeLocalEncryptionKey }) => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);

    const getDefaultChatWidth = (width) => {
        if (width > 1500) return 750;
        if (width > 1300) return 650;
        if (width > 1100) return 600;
        if (width > 1000) return 500;
        if (width > 900) return 450;
        if (width > 800) return 400;
        if (width > 650) return 370;
        if (width > 600) return 250;
        return width;
    };

    const getDefaultPageWidth = (width) => {
        if (width > 1800) return 900;
        if (width > 1300) return 800;
        if (width > 850) return 550;
        if (width > 800) return 450;
        if (width > 750) return 450;
        if (width > 700) return 400;
        if (width > 600) return 350;
        return width - 30;
    };

    const getDefaultChatHeight = (width, height) => {
        return width <= 600 ? height * 0.5 : height;
    };

    const DEFAULT_CHAT_WIDTH = getDefaultChatWidth(windowWidth);
    const DEFAULT_PAGE_WIDTH = getDefaultPageWidth(windowWidth);
    const DEFAULT_CHAT_HEIGHT = getDefaultChatHeight(windowWidth, windowHeight);
    const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
    const [savedChatWidth, setSavedChatWidth] = useState(DEFAULT_CHAT_WIDTH);
    const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
    const [savedChatHeight, setSavedChatHeight] = useState(DEFAULT_CHAT_HEIGHT);
    const [pageWidth, setPageWidth] = useState(DEFAULT_PAGE_WIDTH);
    const [paperData, setPaperData] = useState(null);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [pdfDataURL, setPdfDataURL] = useState(null);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [pdfDownloadError, setPdfDownloadError] = useState(null);
    const [isChatMinimized, setIsChatMinimized] = useState(false);
    const [showChatOpenButton, setShowChatOpenButton] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
    const [pdfContainerHeight, setPdfContainerHeight] = useState(
        isMobile ? window.innerHeight - chatHeight : window.innerHeight
    );
    const [showLLMOptions, setShowLLMOptions] = useState(false);
    const [LLMOptionsChoice, setLLMOptionsChoice] = useState(null);
    const [hasAPIKey, setHasAPIKey] = useState({
        OpenAI: false,
        Anthropic: false,
        Google: false,
        Groq: false,
        Adobe: false
    });
    const [wantToChangeAPIKey, setWantToChangeAPIKey] = useState({
        OpenAI: false,
        Anthropic: false,
        Google: false,
        Groq: false,
        Adobe: false,
    });
    const [isChatMenuExpanded, setIsChatMenuExpanded] = useState(false);
    const [currentLLM, setCurrentLLM] = useState(null);
    const [currentLLMAPIKey, setCurrentLLMAPIKey] = useState(null);
    const [showAPIDialogBox, setShowAPIDialogBox] = useState(null);
    const [tempLLMOptionChosenByLLMOptionsExtension, setTempLLMOptionChosenByLLMOptionsExtension] = useState(null);
    const [showParseOptions, setShowParseOptions] = useState(false);
    const [currentParseOption, setCurrentParseOption] = useState(null);
    const [showCSVModal, setShowCSVModal] = useState(false);
    const [csvFileToView, setCSVFileToView] = useState(null);
    const [showPyModal, setShowPyModal] = useState(false);
    const [pyFileToView, setPyFileToView] = useState(null);
    const [showJsModal, setShowJsModal] = useState(false);
    const [jsFileToView, setJsFileToView] = useState(null);
    const [showHtmlModal, setShowHtmlModal] = useState(false);
    const [htmlFileToView, setHtmlFileToView] = useState(null);
    const [showCssModal, setShowCssModal] = useState(false);
    const [cssFileToView, setCssFileToView] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [isGalleryContainerExpanded, setIsGalleryContainerExpanded] = useState(false);
    const [isCodeFilesContainerExpanded, setIsCodeFilesContainerExpanded] = useState(false);
    const [galleryOrCodeUpper, setGalleryOrCodeUpper] = useState(null);
    const [vectorstoreDetails, setVectorstoreDetails] = useState({vectorstore: null, error: null});
    const [sessionId, setSessionId] = useState(null);
    const [fetchingVectorstore, setFetchingVectorstore] = useState(false);
    const [initialSuggestions, setInitialSuggestions] = useState(null);
    const [loadingInitialSuggestions, setLoadingInitialSuggestions] = useState(false);
    const [advancedParsedPaperData, setAdvancedParsedPaperData] = useState(null)
    const [fetchingParsedData, setFetchingParsedData] = useState(false);
    const [galleryKeepOpen, setGalleryKeepOpen] = useState(false);
    const [embeddingApiKey, setEmbeddingApiKey] = useState(null);
    const isDragging = useRef(false);
    const startPos = useRef(0);
    const startSize = useRef(isMobile ? chatHeight : chatWidth);
    const scrollTimeoutRef = useRef(null);
    const viewerRef = useRef(null);
    const chatLLMOptionsRef = useRef(null);
    const chatLLMOptionsExtensionRef = useRef(null);
    const chatLLMButtonRef = useRef(null);
    const chatParseOptionsRef = useRef(null);
    const chatParseButtonRef = useRef(null);
    const chatMenuExpandButtonRef = useRef(null);
    const chatMenuCollapseButtonRef = useRef(null);
    const galleryButtonRef = useRef(null);
    const galleryContentContainerRef = useRef(null);
    const codeFilesButtonRef = useRef(null);
    const codeFilesContentContaierRef = useRef(null);
    const chatContainerRef = useRef(null);
    const location = useLocation();

    const db = new Dexie('ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==');
    db.version(1).stores({
        Sessions: 'id'
    });

    const proxyBaseUrl = process.env.REACT_APP_BACKEND_URL;

    const openAIModels = ["GPT-4o mini", "GPT-4o"];
    const anthropicModels = ["Claude 3.5 Haiku", "Claude 3.5 Sonnet", "Claude 3.5 Opus"];
    const googleModels = ["Gemini 2.0 Flash-Lite", "Gemini 2.0 Flash", "Gemini 2.0 Pro", "Gemini 1.5 Flash-8B", "Gemini 1.5 Flash", "Gemini 1.5 Pro"];
    const groqModels = ["Llama 3.1-8B", "Llama 3.3-70B", "Mixtral-8x7B"];

    const generateUniqueSessionId = () => {
        return `${uuidv4()}-${Date.now()}`;
    };

    const fetchAPIKey = (company) => {
        if (!localEncryptionKey) {
            return "Encryption key lost from memory.";
        }

        const encryptedApiKey = sessionStorage.getItem(`${company}-API-Key`);

        if (encryptedApiKey) {
            try {
                const bytes = CryptoJS.AES.decrypt(encryptedApiKey, localEncryptionKey);
                const decryptedApiKey = bytes.toString(CryptoJS.enc.Utf8);

                if (!decryptedApiKey) {
                    return "Encryption key lost from memory.";
                } else {
                    return decryptedApiKey;
                }
            } catch (error) {
                return "Failed to fetch API key.";
            }
        } else {
            return "No encryption key present in session storage.";
        }
    };

    const saveVectorstoreToIndexedDB = async (key, defaultData = null, advancedData = null) => {
        if (!defaultData && !advancedData) return;
        try {
            const existing = await db.Sessions.get(key);
            if (!existing) {
                await db.Sessions.put({ id: key, default: defaultData, advanced: advancedData });
            } else {
                if (defaultData !== null) existing.default = defaultData;
                if (advancedData !== null) existing.advanced = advancedData;
                await db.Sessions.put(existing);
            }
            console.log(`Vectorstore for session ${key} saved successfully in IndexedDB.`);
        } catch (error) {
            console.error(`Failed to save vectorstore to IndexedDB for session ${key}:`, error);
        }
    };

    const loadVectorstoreFromIndexedDB = async (key, parseMode = "Default") => {
        try {
            const result = await db.Sessions.get(key);
            if (result) {
                if (parseMode === "Advanced" && result.advanced) {
                    console.log(`Successfully loaded "Advanced" vectorstore for session ${key}.`);
                    return result.advanced;
                } else if (parseMode === "Default" && result.default) {
                    console.log(`Successfully loaded "Default" vectorstore for session ${key}.`);
                    return result.default;
                }
            }
            console.log(`Vectorstore for session ${key} [${parseMode}] not found in IndexedDB.`);
            return null;
        } catch (error) {
            console.error(`Failed to load vectorstore from IndexedDB for session ${key}:`, error);
            return null;
        }
    };

    const base64ToBlob = (base64, contentType = "", sliceSize = 512) => {
        const byteCharacters = atob(base64);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
          const slice = byteCharacters.slice(offset, offset + sliceSize);
          const byteNumbers = new Array(slice.length);
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    };

    const regenerateLocalUrls = (advancedData) => {
        const newImages = advancedData.images.map((img) => {
          const blob = base64ToBlob(img.data, "image/png");
          const url = URL.createObjectURL(blob);
          return { ...img, url };
        });
        const newTables = advancedData.tables.map((tbl) => {
          const blob = new Blob([tbl.data], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          return { ...tbl, url };
        });
        return {
          ...advancedData,
          images: newImages,
          tables: newTables
        };
    };

    const getProviderName = (llm) => {
        if (openAIModels.includes(llm)) {
            return "OpenAI";
        } else if (anthropicModels.includes(llm)) {
            return "Anthropic";
        } else if (googleModels.includes(llm)) {
            return "Google";
        } else if (groqModels.includes(llm)) {
            return "Groq";
        }
        return null;
    };

    const toggleOpenImagePreview = (imageObj, fromGallery = false) => {
        if (fromGallery) {
            setGalleryKeepOpen(true);
        }
        setPreviewImage(imageObj);
    };
    
    const closeImagePreview = () => {
        setTimeout(() => setGalleryKeepOpen(false), 100);
      setPreviewImage(null);
    };

    const toggleOpenCSVFileModal = (file, fromGallery = false) => {
        if (fromGallery) {
            setGalleryKeepOpen(true);
        }
        setCSVFileToView(file);
        setShowCSVModal(true);
      };

    const closeCSVFileModal = () => {
        setTimeout(() => setGalleryKeepOpen(false), 100);
        setCSVFileToView(null);
        setShowCSVModal(false);
    };

    const toggleOpenPyFileModal = (file) => {
        setPyFileToView(file);
        setShowPyModal(true);
      };
      
    const closePyFileModal = () => {
        setPyFileToView(null);
        setShowPyModal(false);
    };

    const toggleOpenJsFileModal = (file) => {
        setJsFileToView(file);
        setShowJsModal(true);
      };
      
    const closeJsFileModal = () => {
      setJsFileToView(null);
      setShowJsModal(false);
    };

    const toggleOpenHtmlFileModal = (file) => {
        setHtmlFileToView(file);
        setShowHtmlModal(true);
      };
      
    const closeHtmlFileModal = () => {
      setHtmlFileToView(null);
      setShowHtmlModal(false);
    };

    const toggleOpenCssFileModal = (file) => {
        setCssFileToView(file);
        setShowCssModal(true);
      };
      
    const closeCssFileModal = () => {
      setCssFileToView(null);
      setShowCssModal(false);
    };

    const handleVisibleRangeChange = (startIndex, stopIndex, numPages) => {
        const newPage = startIndex + 1;
        setCurrentPage(newPage);
    
        if (numPages && totalPages !== numPages) {
          setTotalPages(numPages);
        }

        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, PAGE_INDICATOR_DURATION);
      };

    const handleZoomOut = () => {
        viewerRef.current?.zoomOut();
    };

    const handleZoomIn = () => {
        viewerRef.current?.zoomIn();
    };

    const handleFitWidth = () => {
        const wrapper = document.querySelector(".editor-pdf-wrapper");
        if (!wrapper || !viewerRef.current) return;

        const availableWidth = wrapper.offsetWidth - 20;
        if (availableWidth > 0) {
            viewerRef.current.fitToWidth(availableWidth);
        }
    };

    const handleChatMinimize = () => {
        if (fetchingParsedData) return;
        
        if (!isChatMinimized) {
            if (isMobile) {
                setSavedChatHeight(chatHeight);
                setChatHeight(0);
                setPdfContainerHeight(window.innerHeight);
            } else {
                setSavedChatWidth(chatWidth);
                setChatWidth(0);
            }
            setIsChatMinimized(true);

            setTimeout(() => {
                setShowChatOpenButton(true);
            }, TRANSITION_DURATION);
        }
        else {
            setShowChatOpenButton(false);
            if (isMobile) {
                setChatHeight(savedChatHeight);
                setPdfContainerHeight(window.innerHeight - savedChatHeight);
            } else {
                setChatWidth(savedChatWidth);
            }
            setIsChatMinimized(false);
        }
    };

    const handleMouseDown = (e) => {
        isDragging.current = true;
        startPos.current = isMobile ? e.clientY : e.clientX;
        startSize.current = isMobile ? chatHeight:  chatWidth;
        document.body.style.cursor = isMobile ? 'ns-resize' : 'ew-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const currentPos = isMobile ? e.clientY : e.clientX;
        const delta = currentPos - startPos.current;
        if (isMobile) {
            let newHeight = startSize.current - delta;
            if (newHeight < CHAT_CONTAINER_HEIGHT_MIN) {
                newHeight = CHAT_CONTAINER_HEIGHT_MIN;
            } else if (newHeight > CHAT_CONTAINER_HEIGHT_MAX) {
                newHeight = CHAT_CONTAINER_HEIGHT_MAX;
            }
            setChatHeight(newHeight);
            setPdfContainerHeight(window.innerHeight - newHeight);
        } else {
            let newWidth = startSize.current - delta;
            if (newWidth < CHAT_CONTAINER_WIDTH_MIN) {
                newWidth = CHAT_CONTAINER_WIDTH_MIN;
            } else if (newWidth > CHAT_CONTAINER_WIDTH_MAX) {
                newWidth = CHAT_CONTAINER_WIDTH_MAX;
            }
            setChatWidth(newWidth);
        }
    };

    const handleMouseUp = () => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleLLMOptionsExtension = (option) => {
        setLLMOptionsChoice(option);
    };

    const storeEmbeddingsInBackend = async (pdfUrl, embeddings, parseMode) => {
        try {
          await axios.post(`${proxyBaseUrl}/store_embeddings`, {
            pdf_url: pdfUrl,
            embeddings: embeddings,
            parse_mode: parseMode,
          });
          console.log("Embeddings stored successfully in backend.");
        } catch (error) {
          console.error("Failed to store embeddings in backend:", error);
        }
    };

    const fetchEmbeddingsFromBackend = async (pdfUrl, parseMode) => {
        try {
          const resp = await axios.get(`${proxyBaseUrl}/get_embeddings`, {
            params: {
              pdf_url: pdfUrl,
              parse_mode: parseMode
            }
          });
          return resp.data.embeddings;
        } catch (error) {
          if (error.response && error.response.status === 404) {
            return null;
          }
          console.error("Error fetching embeddings from backend:", error);
          return null;
        }
    };

    const storeSuggestionsInBackend = async (pdfUrl, suggestions, parseMode) => {
        try {
          const formData = new FormData();
          formData.append("suggestions_str", JSON.stringify(suggestions));
    
          await axios.post(`${proxyBaseUrl}/store_suggestions`, formData, {
            params: { pdf_url: pdfUrl, parse_mode: parseMode }
          });
          console.log("Suggestions stored successfully in backend.");
        } catch (error) {
          console.error("Failed to store suggestions in backend:", error);
        }
    };

    const fetchSuggestionsFromBackend = async (pdfUrl, parseMode = "Default") => {
        try {
          const resp = await axios.get(`${proxyBaseUrl}/get_suggestions`, {
            params: { pdf_url: pdfUrl, parse_mode: parseMode }
          });
          return resp.data.suggestions;
        } catch (error) {
          console.error("Error fetching suggestions from backend:", error);
          return null;
        }
    };

    const fetchDefaultVectorstore = async () => {
        if (!pdfBlob) return;

        if (sessionId) {
            setFetchingVectorstore(true);

            const serializedSavedData = await loadVectorstoreFromIndexedDB(sessionId, "Default");

            if (serializedSavedData !== null) {
                try {
                    let googleApiKey = fetchAPIKey("Google");

                    let fromUser = true;
                    if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                        fromUser = false;
                    }

                    if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                        const response = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });

                        if (response.status !== 200) {
                            throw new Error(`Error: ${response.status} - ${response.statusText}`);
                        }

                        googleApiKey = response.data.key;
                    }

                    let savedData = null;
                    try {
                        savedData = JSON.parse(serializedSavedData);
                    } catch (error) {
                        savedData = serializedSavedData;
                    }

                    let savedEmbeddings = [], savedTextChunks = [], savedMetadatas = [];

                    savedData.forEach(item => {
                        savedEmbeddings.push(item.embedding);
                        savedTextChunks.push(item.content);
                        savedMetadatas.push(item.metadata);
                    });

                    const res = await loadDefaultVectorstore(savedEmbeddings, savedTextChunks, savedMetadatas, googleApiKey);

                    if (res === "Failed to load vectorstore.") {
                        setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                        setCurrentParseOption(null);
                        setEmbeddingApiKey(null);
                        setFetchingVectorstore(false);
                        return;
                    } else {
                        setVectorstoreDetails({ vectorstore: res, error: null });
                        setCurrentParseOption("Default");
                        setEmbeddingApiKey(googleApiKey);
                        setFetchingVectorstore(false);

                        setLoadingInitialSuggestions(true);
                        try {
                            let suggestions = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf);
                            if (suggestions && Array.isArray(suggestions)) {
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: suggestions
                                }));
                            } else {
                                const newSuggestions = await getInitialSugesstions(savedTextChunks, googleApiKey, fromUser);
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: newSuggestions
                                }));

                                if (newSuggestions && newSuggestions.length > 0) {
                                    await storeSuggestionsInBackend(paperData?.paper?.url_pdf, newSuggestions, "Default");
                                }
                            }
                        } catch (error) {
                            console.error("Failed to fetch or generate suggestions for default parse:", error);
                        }
                        setLoadingInitialSuggestions(false);

                        toast.message('Paper parsed in Default mode.', {
                            description: "You can switch to Advanced from parse options.",
                        });

                        return;
                    }
                } catch (error) {
                    setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                    setCurrentParseOption(null);
                    setEmbeddingApiKey(null);
                    setFetchingVectorstore(false);
                    return;
                }
            } else if (pdfBlob) {
                let textChunks;

                try {
                    const formData = new FormData();
                    formData.append("file", pdfBlob);
                    formData.append("chunk_size", Settings.CHUNK_SIZE);
                    formData.append("chunk_overlap", Settings.CHUNK_OVERLAP);

                    const response = await axios.post(`${proxyBaseUrl}/parse_and_split_pdf`, formData, {
                        headers: {
                        "Content-Type": "multipart/form-data",
                        },
                    });

                    textChunks = response.data.chunks;
                } catch (error) {
                    setVectorstoreDetails({ vectorstore: null, error: "Failed to create vectorstore." });
                    setCurrentParseOption(null);
                    setEmbeddingApiKey(null);
                    setFetchingVectorstore(false);
                    return;
                }

                let googleApiKey = fetchAPIKey("Google");

                let fromUser = true;
                if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                    fromUser = false;
                }

                if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                    try {
                        const response = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });

                        if (response.status !== 200) {
                            throw new Error(`Error: ${response.status} - ${response.statusText}`);
                        }

                        googleApiKey = response.data.key;
                    } catch (error) {
                        setVectorstoreDetails({ vectorstore: null, error: "Failed to create vectorstore." });
                        setCurrentParseOption(null);
                        setEmbeddingApiKey(null);
                        setFetchingVectorstore(false);
                        return;
                    }

                    let defaultBackendEmbeddings = null;
                    try {
                        defaultBackendEmbeddings = await fetchEmbeddingsFromBackend(paperData?.paper?.url_pdf, "Default");
                    } catch (error) {
                        console.error("Error checking backend for default embeddings:", error);
                    }

                    let res = "Failed to create vectorstore.";
                    if (defaultBackendEmbeddings && Array.isArray(defaultBackendEmbeddings) && defaultBackendEmbeddings.length > 0) {
                        const metadatas = defaultBackendEmbeddings.map((embedding, index) => ({
                            type: "text",
                            docId: String(index),
                            sessionId: sessionId
                        }));
                        res = await loadDefaultVectorstore(defaultBackendEmbeddings, textChunks, metadatas, googleApiKey);
                    } else {
                        res = await createDefaultVectorstore(sessionId, textChunks, googleApiKey);
                    }

                    res = await createDefaultVectorstore(sessionId, textChunks, googleApiKey);

                    if (res === "Failed to create vectorstore." || res === "Failed to load vectorstore.") {
                        setVectorstoreDetails({ vectorstore: null, error: res });
                        setCurrentParseOption(null);
                        setEmbeddingApiKey(null);
                        setFetchingVectorstore(false);
                        return;
                    } else {
                        setVectorstoreDetails({ vectorstore: res, error: null });
                        setCurrentParseOption("Default");
                        setEmbeddingApiKey(googleApiKey);

                        const parsedMemoryVectors = JSON.stringify(res.memoryVectors);
                        saveVectorstoreToIndexedDB(sessionId, parsedMemoryVectors, null);

                        let embeddingsToStoreInBackend = null;
                        if (!defaultBackendEmbeddings || !Array.isArray(defaultBackendEmbeddings) || defaultBackendEmbeddings.length === 0) {
                            embeddingsToStoreInBackend = res.memoryVectors.map(memVec => memVec.embedding);
                            if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                storeEmbeddingsInBackend(paperData?.paper?.url_pdf, embeddingsToStoreInBackend, "Default");
                            }
                        }

                        setFetchingVectorstore(false);

                        setLoadingInitialSuggestions(true);
                        try {
                            let suggestions = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf);
                            if (suggestions && Array.isArray(suggestions)) {
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: suggestions
                                }));
                            } else {
                                const newSuggestions = await getInitialSugesstions(textChunks, googleApiKey, fromUser);
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: newSuggestions
                                }));

                                if (newSuggestions && newSuggestions.length > 0) {
                                    await storeSuggestionsInBackend(paperData?.paper?.url_pdf, newSuggestions, "Default");
                                }
                            }
                        } catch (error) {
                            console.error("Failed to fetch or generate suggestions for default parse:", error);
                        }
                        setLoadingInitialSuggestions(false);

                        toast.message('Paper parsed in Default mode.', {
                            description: "You can switch to Advanced from parse options.",
                        });

                        return;
                    }
                } else {
                    let defaultBackendEmbeddings = null;
                    try {
                        defaultBackendEmbeddings = await fetchEmbeddingsFromBackend(paperData?.paper?.url_pdf, "Default");
                    } catch (error) {
                        console.error("Error checking backend for default embeddings:", error);
                    }

                    let res = "Failed to create vectorstore.";
                    if (defaultBackendEmbeddings && Array.isArray(defaultBackendEmbeddings) && defaultBackendEmbeddings.length > 0) {
                        const metadatas = defaultBackendEmbeddings.map((embedding, index) => ({
                            type: "text",
                            docId: String(index),
                            sessionId: sessionId
                        }));
                        res = await loadDefaultVectorstore(defaultBackendEmbeddings, textChunks, metadatas, googleApiKey);
                    } else {
                        res = await createDefaultVectorstore(sessionId, textChunks, googleApiKey);
                    }

                    if (res === "Failed to create vectorstore." || res === "Failed to load vectorstore.") {
                        setVectorstoreDetails({ vectorstore: null, error: res });
                        setCurrentParseOption(null);
                        setEmbeddingApiKey(null);
                        setFetchingVectorstore(false);
                        return;
                    } else {
                        setVectorstoreDetails({ vectorstore: res, error: null });
                        setCurrentParseOption("Default");
                        setEmbeddingApiKey(googleApiKey);

                        const parsedMemoryVectors = JSON.stringify(res.memoryVectors);
                        saveVectorstoreToIndexedDB(sessionId, parsedMemoryVectors, null);

                        if (!defaultBackendEmbeddings || !Array.isArray(defaultBackendEmbeddings) || defaultBackendEmbeddings.length === 0) {
                            const embeddingsToStoreInBackend = res.memoryVectors.map(memVec => memVec.embedding);
                            if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                storeEmbeddingsInBackend(paperData?.paper?.url_pdf, embeddingsToStoreInBackend, "Default");
                            }
                        }

                        setFetchingVectorstore(false);

                        setLoadingInitialSuggestions(true);
                        try {
                            let suggestions = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf);
                            if (suggestions && Array.isArray(suggestions)) {
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: suggestions
                                }));
                            } else {
                                const newSuggestions = await getInitialSugesstions(textChunks, googleApiKey, fromUser);
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    default: newSuggestions
                                }));

                                if (newSuggestions && newSuggestions.length > 0) {
                                    await storeSuggestionsInBackend(paperData?.paper?.url_pdf, newSuggestions, "Default");
                                }
                            }
                        } catch (error) {
                            console.error("Failed to fetch or generate suggestions for default parse:", error);
                        }
                        setLoadingInitialSuggestions(false);

                        toast.message('Paper parsed in Default mode.', {
                            description: "You can switch to Advanced from parse options.",
                        });

                        return;
                    }
                }
            }
        }
    };

    const fetchAdvancedVectorstore = async () => {
        if (!pdfBlob) return;

        if (sessionId) {
            const serializedSavedData = await loadVectorstoreFromIndexedDB(sessionId, "Advanced");

            if (serializedSavedData !== null) {
                try {
                    setFetchingVectorstore(true);

                    let googleApiKey = fetchAPIKey("Google");

                    let fromUser = true;
                    if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                        fromUser = false;
                    }

                    if (googleApiKey === "Encryption key lost from memory." || googleApiKey === "Failed to fetch API key." || googleApiKey === "No encryption key present in session storage.") {
                        const response = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });

                        if (response.status !== 200) {
                            throw new Error(`Error: ${response.status} - ${response.statusText}`);
                        }

                        googleApiKey = response.data.key;
                    }

                    let savedData = null;
                    try {
                        savedData = JSON.parse(serializedSavedData);
                    } catch (error) {
                        savedData = serializedSavedData;
                    }

                    const { embeddings, chunks, headings, labels, references, images, tables } = savedData;

                    const advancedData = {
                        chunks: chunks || [],
                        headings: headings || [],
                        labels: labels || [],
                        references: references || [],
                        images: images || [],
                        tables: tables || []
                    };
                    const advancedDataWithUrls = regenerateLocalUrls(advancedData);

                    let hybridRes = null;

                    const serializedDefaultData = await loadVectorstoreFromIndexedDB(sessionId, "Default");

                    if (serializedDefaultData !== null) {
                        let defaultData = null;
                        try {
                            defaultData = JSON.parse(serializedDefaultData);
                        } catch(error) {
                            defaultData = serializedDefaultData;
                        }

                        const advancedImageAndTableChunks = advancedDataWithUrls.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                        let defaultTextChunks = [], defaultTextEmbeddings = [];
                        defaultData.forEach(item => {
                            defaultTextChunks.push({
                                id: item.metadata.docId,
                                type: "text",
                                bounds: null,
                                page: null,
                                content: item.content
                            });
                            defaultTextEmbeddings.push(item.embedding);
                        });

                        const numAdvancedTextChunks = embeddings.length - advancedImageAndTableChunks.length;
                        const advancedImageAndTableEmbeddings = embeddings.slice(numAdvancedTextChunks);
                        const hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];

                        hybridRes = await loadAdvancedVectorstore(
                            sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                        );
                    } else {
                        try {
                            const formData = new FormData();
                            formData.append("file", pdfBlob);
                            formData.append("chunk_size", Settings.CHUNK_SIZE);
                            formData.append("chunk_overlap", Settings.CHUNK_OVERLAP);

                            const response = await axios.post(`${proxyBaseUrl}/parse_and_split_pdf`, formData, {
                                headers: {
                                "Content-Type": "multipart/form-data",
                                },
                            });

                            const defaultTextSplits = response.data.chunks;
                            const defaultTextEmbeddings = await getMultipleEmbeddings(defaultTextSplits, "RETRIEVAL_DOCUMENT", googleApiKey);
                            
                            if (!defaultTextEmbeddings || defaultTextEmbeddings.length === 0) {
                                throw new Error("Failed to get [Default] text embeddings.");
                            }

                            const advancedImageAndTableChunks = advancedDataWithUrls.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                            const defaultTextChunks = defaultTextSplits.map((split, idx) => {
                                return {
                                    id: String(idx),
                                    type: "text",
                                    bounds: null,
                                    page: null,
                                    content: split
                                };
                            });

                            const numAdvancedTextChunks = embeddings.length - advancedImageAndTableChunks.length;
                            const advancedImageAndTableEmbeddings = embeddings.slice(numAdvancedTextChunks);
                            const hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];

                            hybridRes = await loadAdvancedVectorstore(
                                sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                            );
                        } catch(error) {
                            console.error("Failed to load advanced parsed data:", error);
                            toast.error("Failed to perform Advanced parsing", {
                                description: "Ensure your Adobe keys are valid if provided.",
                                className: "editor-sonner-error-toast"
                            });
                            setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                            setCurrentParseOption(null);
                            setFetchingParsedData(false);
                            setEmbeddingApiKey(null);
                            setFetchingVectorstore(false);
                            return;
                        }
                    }

                    if (!hybridRes || hybridRes === "Failed to load load vectorstore.") {
                        throw new Error("Failed to load [Advanced] vectorstore.");
                    }

                    setVectorstoreDetails({ vectorstore: hybridRes, error: null });
                    setAdvancedParsedPaperData(advancedDataWithUrls);
                    setCurrentParseOption("Advanced");
                    setEmbeddingApiKey(googleApiKey);
                    setFetchingVectorstore(false);
                    setShowParseOptions(false);

                    try {
                        if (!initialSuggestions || !initialSuggestions.advanced) {
                            setLoadingInitialSuggestions(true);

                            const suggestionsFromBackend = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf, "Advanced");
                            if (suggestionsFromBackend && Array.isArray(suggestionsFromBackend)) {
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    advanced: suggestionsFromBackend,
                                }));
                            } else {
                                const textChunks = chunks.map(ch => ch.content || "");
                                const paperSuggestions = await getInitialSugesstions(textChunks, googleApiKey, fromUser, "Advanced");
                                setInitialSuggestions(prev => ({
                                    ...prev,
                                    advanced: paperSuggestions,
                                }));
                
                                if (paperSuggestions && paperSuggestions.length > 0) {
                                await storeSuggestionsInBackend(paperData?.paper?.url_pdf, paperSuggestions, "Advanced");
                                }
                            }

                            setLoadingInitialSuggestions(false);
                        }
                    } catch (error) {
                        console.error("Failed to get initial suggestions:", error);
                    }

                    toast.message('Paper parsed in Advanced mode.', {
                        description: "You can switch to Default from parse options.",
                    });

                    return;
                } catch (error) {
                    console.error("Failed to load advanced parsed data:", error);
                    toast.error("Failed to perform Advanced parsing", {
                        description: "Ensure your Adobe keys are valid if provided.",
                        className: "editor-sonner-error-toast"
                    });
                    setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                    setCurrentParseOption(null);
                    setEmbeddingApiKey(null);
                    setFetchingVectorstore(false);
                    await fetchDefaultVectorstore();
                    return;
                }
            } else if (pdfBlob) {
                const encryptedAdobeClientID = sessionStorage.getItem("Adobe-CLIENT-ID");
                const encryptedAdobeClientSecret = sessionStorage.getItem("Adobe-CLIENT-SECRET");

                if (encryptedAdobeClientID && encryptedAdobeClientSecret) {
                    if (!localEncryptionKey) {
                        alert("Failed to decrypt your adobe keys. Trying with free version. Please re-enter your credentials if error occurs.");
                        sessionStorage.removeItem("OpenAI-API-Key");
                        sessionStorage.removeItem("Anthropic-API-Key");
                        sessionStorage.removeItem("Google-API-Key");
                        sessionStorage.removeItem("Groq-API-Key");
                        sessionStorage.removeItem("Adobe-CLIENT-ID");
                        sessionStorage.removeItem("Adobe-CLIENT-SECRET");
                        toggleModifyHasAPIKey({ OpenAI: false, Anthropic: false, Google: false, Groq: false, Adobe: false });
                        setCurrentLLM(null);
                        setCurrentLLMAPIKey(null);
                        setTempLLMOptionChosenByLLMOptionsExtension(null);
                    } else {
                        const idBytes = CryptoJS.AES.decrypt(encryptedAdobeClientID, localEncryptionKey);
                        const secretBytes = CryptoJS.AES.decrypt(encryptedAdobeClientSecret, localEncryptionKey);
                        const decryptedAdobeClientID = idBytes.toString(CryptoJS.enc.Utf8);
                        const decryptedAdobeClientSecret = secretBytes.toString(CryptoJS.enc.Utf8);

                        if (!decryptedAdobeClientID || !decryptedAdobeClientSecret) {
                            alert("Failed to decrypt your adobe keys. Please re-enter your credentials. For now we will proceed without the keys...");
                            sessionStorage.removeItem("OpenAI-API-Key");
                            sessionStorage.removeItem("Anthropic-API-Key");
                            sessionStorage.removeItem("Google-API-Key");
                            sessionStorage.removeItem("Groq-API-Key");
                            sessionStorage.removeItem("Adobe-CLIENT-ID");
                            sessionStorage.removeItem("Adobe-CLIENT-SECRET");
                            toggleModifyHasAPIKey({ OpenAI: false, Anthropic: false, Google: false, Groq: false, Adobe: false });
                            setCurrentLLM(null);
                            setCurrentLLMAPIKey(null);
                            setTempLLMOptionChosenByLLMOptionsExtension(null);
                        }

                        setFetchingParsedData(true);
                        try {
                            const formData = new FormData();

                            formData.append("pdf_file", pdfBlob, "uploaded.pdf");

                            if (paperData) {
                                formData.append("paper_details_str", JSON.stringify(paperData));
                            }

                            if (decryptedAdobeClientID && decryptedAdobeClientSecret) {
                                formData.append("adobe_credentials_str", JSON.stringify({
                                    client_id: decryptedAdobeClientID,
                                    client_str: decryptedAdobeClientSecret
                                }));
                            }

                            let googleApiKey = fetchAPIKey("Google");
                            let fromUser = true;
                            if (
                                googleApiKey === "Encryption key lost from memory." ||
                                googleApiKey === "Failed to fetch API key." ||
                                googleApiKey === "No encryption key present in session storage."
                            ) {
                                fromUser = false;
                            }
                            if (!fromUser) {
                                const keyResponse = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });
                                if (keyResponse.status === 200) {
                                    googleApiKey = keyResponse.data.key;
                                }
                            }

                            formData.append("google_api_key", googleApiKey);

                            const response = await axios.post(`${proxyBaseUrl}/advanced_parse`, formData, {
                                headers: { "Content-Type": "multipart/form-data" },
                                responseType: "json"
                            });
                            const advancedData = response.data;
                            const advancedDataWithUrls = regenerateLocalUrls(advancedData);

                            const advancedBackendEmbeddings = await fetchEmbeddingsFromBackend(paperData?.paper?.url_pdf, "Advanced");

                            setFetchingParsedData(false);
                            setFetchingVectorstore(true);

                            let res = "Failed to create vectorstore.";
                            if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                                const chunks = advancedData.chunks || [];
                                res = await loadAdvancedVectorstore(sessionId, advancedBackendEmbeddings, chunks, googleApiKey);
                            } else {
                                res = await createAdvancedVectorstore(sessionId, advancedData.chunks, googleApiKey);
                            }

                            console.log("res:", res)

                            if (res === "Failed to create vectorstore." || res === "Failed to load vectorstore.") {
                                throw new Error(`[Advanced] ${res}`);
                            } else {
                                const fullDataToSave = {
                                    embeddings: res.memoryVectors.map(memVec => memVec.embedding),
                                    chunks: advancedData.chunks || [],
                                    headings: advancedData.headings || [],
                                    labels: advancedData.labels || [],
                                    references: advancedData.references || [],
                                    images: advancedData.images.map(img => ({
                                        name: img.name,
                                        data: img.data
                                    })),
                                    tables: advancedData.tables.map(tbl => ({
                                        name: tbl.name,
                                        data: tbl.data
                                    }))
                                };
                                saveVectorstoreToIndexedDB(sessionId, null, JSON.stringify(fullDataToSave));

                                let embeddingsToStoreInBackend = null;
                                if (!advancedBackendEmbeddings || !Array.isArray(advancedBackendEmbeddings) || advancedBackendEmbeddings.length === 0) {
                                    embeddingsToStoreInBackend = res.memoryVectors.map(memVec => memVec.embedding);
                                    if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                        storeEmbeddingsInBackend(paperData?.paper?.url_pdf, embeddingsToStoreInBackend, "Advanced");
                                    }
                                }

                                let hybridRes = null;

                                const serializedDefaultData = await loadVectorstoreFromIndexedDB(sessionId, "Default");
                                if (serializedDefaultData !== null) {
                                    let defaultData = null;
                                    try {
                                        defaultData = JSON.parse(serializedDefaultData);
                                    } catch(error) {
                                        defaultData = serializedDefaultData;
                                    }

                                    const advancedImageAndTableChunks = advancedData.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                                    let defaultTextChunks = [], defaultTextEmbeddings = [];
                                    defaultData.forEach(item => {
                                        defaultTextChunks.push({
                                            id: item.metadata.docId,
                                            type: "text",
                                            bounds: null,
                                            page: null,
                                            content: item.content
                                        });
                                        defaultTextEmbeddings.push(item.embedding);
                                    });

                                    let hybridEmbeddings = null;
                                    if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                                        const numAdvancedTextChunks = advancedBackendEmbeddings.length - advancedImageAndTableChunks.length;
                                        const advancedImageAndTableEmbeddings = advancedBackendEmbeddings.slice(numAdvancedTextChunks);
                                        hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                    } else if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                        const numAdvancedTextChunks = embeddingsToStoreInBackend.length - advancedImageAndTableChunks.length;
                                        const advancedImageAndTableEmbeddings = embeddingsToStoreInBackend.slice(numAdvancedTextChunks);
                                        hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                    } else {
                                        throw new Error("Unable to find advanced embeddings.");
                                    }

                                    hybridRes = await loadAdvancedVectorstore(
                                        sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                                    );
                                } else {
                                    try {
                                        const formData = new FormData();
                                        formData.append("file", pdfBlob);
                                        formData.append("chunk_size", Settings.CHUNK_SIZE);
                                        formData.append("chunk_overlap", Settings.CHUNK_OVERLAP);

                                        const response = await axios.post(`${proxyBaseUrl}/parse_and_split_pdf`, formData, {
                                            headers: {
                                            "Content-Type": "multipart/form-data",
                                            },
                                        });

                                        const defaultTextSplits = response.data.chunks;
                                        const defaultTextEmbeddings = await getMultipleEmbeddings(defaultTextSplits, "RETRIEVAL_DOCUMENT", googleApiKey);
                                        
                                        if (!defaultTextEmbeddings || defaultTextEmbeddings.length === 0) {
                                            throw new Error("Failed to get [Default] text embeddings.");
                                        }

                                        const advancedImageAndTableChunks = advancedData.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                                        const defaultTextChunks = defaultTextSplits.map((split, idx) => {
                                            return {
                                                id: String(idx),
                                                type: "text",
                                                bounds: null,
                                                page: null,
                                                content: split
                                            };
                                        });

                                        let hybridEmbeddings = null;
                                        if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                                            const numAdvancedTextChunks = advancedBackendEmbeddings.length - advancedImageAndTableChunks.length;
                                            const advancedImageAndTableEmbeddings = advancedBackendEmbeddings.slice(numAdvancedTextChunks);
                                            hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                        } else if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                            const numAdvancedTextChunks = embeddingsToStoreInBackend.length - advancedImageAndTableChunks.length;
                                            const advancedImageAndTableEmbeddings = embeddingsToStoreInBackend.slice(numAdvancedTextChunks);
                                            hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                        } else {
                                            throw new Error("Unable to find advanced embeddings.");
                                        }

                                        hybridRes = await loadAdvancedVectorstore(
                                            sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                                        );
                                    } catch(error) {
                                        console.error("Failed to load advanced parsed data:", error);
                                        toast.error("Failed to perform Advanced parsing", {
                                            description: "Ensure your Adobe keys are valid if provided.",
                                            className: "editor-sonner-error-toast"
                                        });
                                        setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                                        setCurrentParseOption(null);
                                        setFetchingParsedData(false);
                                        setEmbeddingApiKey(null);
                                        setFetchingVectorstore(false);
                                        return;
                                    }
                                }

                                if (!hybridRes || hybridRes === "Failed to load load vectorstore.") {
                                    throw new Error("Failed to load [Advanced] vectorstore.");
                                }

                                setVectorstoreDetails({ vectorstore: hybridRes, error: null });
                                setAdvancedParsedPaperData(advancedDataWithUrls);
                                setCurrentParseOption("Advanced");
                                setEmbeddingApiKey(googleApiKey);
                                setFetchingVectorstore(false);
                                setShowParseOptions(false);

                                try {
                                    if (!initialSuggestions || !initialSuggestions.advanced) {
                                        setLoadingInitialSuggestions(true);
        
                                        const suggestionsFromBackend = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf, "Advanced");
                                        if (suggestionsFromBackend && Array.isArray(suggestionsFromBackend)) {
                                            setInitialSuggestions(prev => ({
                                                ...prev,
                                                advanced: suggestionsFromBackend,
                                            }));
                                        } else {
                                            const textChunks = advancedData.chunks.map(ch => ch.content || "");
                                            const paperSuggestions = await getInitialSugesstions(textChunks, googleApiKey, fromUser, "Advanced");
                                            setInitialSuggestions(prev => ({
                                                ...prev,
                                                advanced: paperSuggestions,
                                            }));
                            
                                            if (paperSuggestions && paperSuggestions.length > 0) {
                                            await storeSuggestionsInBackend(paperData?.paper?.url_pdf, paperSuggestions, "Advanced");
                                            }
                                        }
        
                                        setLoadingInitialSuggestions(false);
                                    }
                                } catch (error) {
                                    console.error("Failed to get initial suggestions:", error);
                                }

                                toast.message('Paper parsed in Advanced mode.', {
                                    description: "You can switch to Default from parse options.",
                                });

                                return;
                            }
                        } catch (error) {
                            console.error("Failed to load advanced parsed data:", error);
                            toast.error("Failed to perform Advanced parsing", {
                                description: "Ensure your Adobe keys are valid if provided.",
                                className: "editor-sonner-error-toast"
                            });
                            setVectorstoreDetails({ vectorstore: null, error: "Failed to load [Advanced] vectorstore." });
                            setCurrentParseOption(null);
                            setFetchingParsedData(false);
                            setEmbeddingApiKey(null);
                            setFetchingVectorstore(false);
                            await fetchDefaultVectorstore();
                            return;
                        }
                    }
                } else {
                    setFetchingParsedData(true);
                    try {
                        const formData = new FormData();

                        formData.append("pdf_file", pdfBlob, "uploaded.pdf");

                        if (paperData) {
                            formData.append("paper_details_str", JSON.stringify(paperData));
                        }

                        let googleApiKey = fetchAPIKey("Google");
                        let fromUser = true;
                        if (
                            googleApiKey === "Encryption key lost from memory." ||
                            googleApiKey === "Failed to fetch API key." ||
                            googleApiKey === "No encryption key present in session storage."
                        ) {
                            fromUser = false;
                        }
                        if (!fromUser) {
                            const keyResponse = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });
                            if (keyResponse.status === 200) {
                                googleApiKey = keyResponse.data.key;
                            }
                        }

                        formData.append("google_api_key", googleApiKey);

                        const response = await axios.post(`${proxyBaseUrl}/advanced_parse`, formData, {
                            headers: { "Content-Type": "multipart/form-data" },
                            responseType: "json"
                        });
                        const advancedData = response.data;

                        const advancedDataWithUrls = regenerateLocalUrls(advancedData);

                        const advancedBackendEmbeddings = await fetchEmbeddingsFromBackend(paperData?.paper?.url_pdf, "Advanced");

                        setFetchingParsedData(false);
                        setFetchingVectorstore(true);

                        let res = "Failed to create vectorstore.";
                        if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                            const chunks = advancedData.chunks || [];
                            res = await loadAdvancedVectorstore(sessionId, advancedBackendEmbeddings, chunks, googleApiKey);
                        } else {
                            res = await createAdvancedVectorstore(sessionId, advancedData.chunks, googleApiKey);
                        }

                        if (res === "Failed to create vectorstore." || res === "Failed to load vectorstore.") {
                            throw new Error(`[Advanced] ${res}`);
                        } else {
                            const fullDataToSave = {
                                embeddings: res.memoryVectors.map(memVec => memVec.embedding),
                                chunks: advancedData.chunks || [],
                                headings: advancedData.headings || [],
                                labels: advancedData.labels || [],
                                references: advancedData.references || [],
                                images: advancedData.images.map(img => ({
                                    name: img.name,
                                    data: img.data
                                })),
                                tables: advancedData.tables.map(tbl => ({
                                    name: tbl.name,
                                    data: tbl.data
                                }))
                            };
                            saveVectorstoreToIndexedDB(sessionId, null, JSON.stringify(fullDataToSave));

                            let embeddingsToStoreInBackend = null;
                            if (!advancedBackendEmbeddings || !Array.isArray(advancedBackendEmbeddings) || advancedBackendEmbeddings.length === 0) {
                                embeddingsToStoreInBackend = res.memoryVectors.map(memVec => memVec.embedding);
                                if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                    storeEmbeddingsInBackend(paperData?.paper?.url_pdf, embeddingsToStoreInBackend, "Advanced");
                                }
                            }

                            let hybridRes = null;

                            const serializedDefaultData = await loadVectorstoreFromIndexedDB(sessionId, "Default");
                            if (serializedDefaultData !== null) {
                                let defaultData = null;
                                try {
                                    defaultData = JSON.parse(serializedDefaultData);
                                } catch(error) {
                                    defaultData = serializedDefaultData;
                                }

                                const advancedImageAndTableChunks = advancedData.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                                let defaultTextChunks = [], defaultTextEmbeddings = [];
                                defaultData.forEach(item => {
                                    defaultTextChunks.push({
                                        id: item.metadata.docId,
                                        type: "text",
                                        bounds: null,
                                        page: null,
                                        content: item.content
                                    });
                                    defaultTextEmbeddings.push(item.embedding);
                                });

                                let hybridEmbeddings = null;
                                if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                                    const numAdvancedTextChunks = advancedBackendEmbeddings.length - advancedImageAndTableChunks.length;
                                    const advancedImageAndTableEmbeddings = advancedBackendEmbeddings.slice(numAdvancedTextChunks);
                                    hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                } else if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                    const numAdvancedTextChunks = embeddingsToStoreInBackend.length - advancedImageAndTableChunks.length;
                                    const advancedImageAndTableEmbeddings = embeddingsToStoreInBackend.slice(numAdvancedTextChunks);
                                    hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                } else {
                                    throw new Error("Unable to find advanced embeddings.");
                                }

                                hybridRes = await loadAdvancedVectorstore(
                                    sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                                );
                            } else {
                                try {
                                    const formData = new FormData();
                                    formData.append("file", pdfBlob);
                                    formData.append("chunk_size", Settings.CHUNK_SIZE);
                                    formData.append("chunk_overlap", Settings.CHUNK_OVERLAP);

                                    const response = await axios.post(`${proxyBaseUrl}/parse_and_split_pdf`, formData, {
                                        headers: {
                                        "Content-Type": "multipart/form-data",
                                        },
                                    });

                                    const defaultTextSplits = response.data.chunks;
                                    const defaultTextEmbeddings = await getMultipleEmbeddings(defaultTextSplits, "RETRIEVAL_DOCUMENT", googleApiKey);

                                    if (!defaultTextEmbeddings || defaultTextEmbeddings.length === 0) {
                                        throw new Error("Failed to get [Default] text embeddings.");
                                    }

                                    const advancedImageAndTableChunks = advancedData.chunks.filter(chunk => chunk.type === "image" || chunk.type === "table");
                                    const defaultTextChunks = defaultTextSplits.map((split, idx) => {
                                        return {
                                            id: String(idx),
                                            type: "text",
                                            bounds: null,
                                            page: null,
                                            content: split
                                        };
                                    });

                                    let hybridEmbeddings = null;
                                    if (advancedBackendEmbeddings && Array.isArray(advancedBackendEmbeddings) && advancedBackendEmbeddings.length > 0) {
                                        const numAdvancedTextChunks = advancedBackendEmbeddings.length - advancedImageAndTableChunks.length;
                                        const advancedImageAndTableEmbeddings = advancedBackendEmbeddings.slice(numAdvancedTextChunks);
                                        hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                    } else if (embeddingsToStoreInBackend && embeddingsToStoreInBackend.length > 0) {
                                        const numAdvancedTextChunks = embeddingsToStoreInBackend.length - advancedImageAndTableChunks.length;
                                        const advancedImageAndTableEmbeddings = embeddingsToStoreInBackend.slice(numAdvancedTextChunks);
                                        hybridEmbeddings = [...defaultTextEmbeddings, ...advancedImageAndTableEmbeddings];
                                    } else {
                                        throw new Error("Unable to find advanced embeddings.");
                                    }

                                    hybridRes = await loadAdvancedVectorstore(
                                        sessionId, hybridEmbeddings, [...defaultTextChunks, ...advancedImageAndTableChunks], googleApiKey
                                    );
                                } catch(error) {
                                    console.error("Failed to load advanced parsed data:", error);
                                    toast.error("Failed to perform Advanced parsing", {
                                        description: "Ensure your Adobe keys are valid if provided.",
                                        className: "editor-sonner-error-toast"
                                    });
                                    setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                                    setCurrentParseOption(null);
                                    setFetchingParsedData(false);
                                    setEmbeddingApiKey(null);
                                    setFetchingVectorstore(false);
                                    return;
                                }
                            }

                            if (!hybridRes || hybridRes === "Failed to load load vectorstore.") {
                                throw new Error("Failed to load [Advanced] vectorstore.");
                            }

                            setVectorstoreDetails({ vectorstore: hybridRes, error: null });
                            setAdvancedParsedPaperData(advancedDataWithUrls);
                            setCurrentParseOption("Advanced");
                            setEmbeddingApiKey(googleApiKey);
                            setFetchingVectorstore(false);
                            setShowParseOptions(false);

                            try {
                                if (!initialSuggestions || !initialSuggestions.advanced) {
                                    setLoadingInitialSuggestions(true);
    
                                    const suggestionsFromBackend = await fetchSuggestionsFromBackend(paperData?.paper?.url_pdf, "Advanced");
                                    if (suggestionsFromBackend && Array.isArray(suggestionsFromBackend)) {
                                        setInitialSuggestions(prev => ({
                                            ...prev,
                                            advanced: suggestionsFromBackend,
                                        }));
                                    } else {
                                        const textChunks = advancedData.chunks.map(ch => ch.content || "");
                                        const paperSuggestions = await getInitialSugesstions(textChunks, googleApiKey, fromUser, "Advanced");
                                        setInitialSuggestions(prev => ({
                                            ...prev,
                                            advanced: paperSuggestions,
                                        }));
                        
                                        if (paperSuggestions && paperSuggestions.length > 0) {
                                        await storeSuggestionsInBackend(paperData?.paper?.url_pdf, paperSuggestions, "Advanced");
                                        }
                                    }
    
                                    setLoadingInitialSuggestions(false);
                                }
                            } catch (error) {
                                console.error("Failed to get initial suggestions:", error);
                            }

                            toast.message('Paper parsed in Advanced mode.', {
                                description: "You can switch to Default from parse options.",
                            });

                            return;
                        }
                    } catch (error) {
                        console.error("Failed to load advanced parsed data:", error);
                        toast.error("Failed to perform Advanced parsing", {
                            description: "Ensure your Adobe keys are valid if provided.",
                            className: "editor-sonner-error-toast"
                        });
                        setVectorstoreDetails({ vectorstore: null, error: "Failed to load vectorstore." });
                        setCurrentParseOption(null);
                        setFetchingParsedData(false);
                        setEmbeddingApiKey(null);
                        setFetchingVectorstore(false);
                        await fetchDefaultVectorstore();
                        return;
                    }
                }
            }
        }
    };

    const handleParseOptionSelection = (option) => {
        if (fetchingVectorstore || fetchingParsedData) {
            toast.info(`Parsing already in progress. Please wait.`);
            return;
        }

        try {
            if (option === "Advanced") {
                if (currentParseOption === "Advanced") {
                    toast.info("Paper already parsed in Advanced mode.");
                    return;
                }
                fetchAdvancedVectorstore();
            } else {
                if (currentParseOption === "Default") {
                    toast.info("Paper already parsed in Default mode.");
                    return;
                }
                fetchDefaultVectorstore();
            }
        } catch (error) {
            if (option === "Advanced") {
                toast.error("Failed to perform Advanced parsing", {
                    description: "Ensure your Adobe keys are valid if provided.",
                    className: "editor-sonner-error-toast"
                });
                fetchDefaultVectorstore();
            }
        }
        setShowParseOptions(false);
    };

    const toggleSetCurrentLLM = (llm) => {
        setCurrentLLM(llm);
    };

    const toggleSetCurrentLLMAPIKey = (api_key) =>{
        setCurrentLLMAPIKey(api_key);
    };

    const toggleLLMOptions = () => {
        setShowParseOptions(false);
        setShowLLMOptions(prev => !prev);
        setLLMOptionsChoice(null);
    };

    const toggleShowParseOptions = () => {
        setShowLLMOptions(false);
        setShowParseOptions(prev => !prev);
    };

    const toggleChatMenuExpanded = () => {
        setIsChatMenuExpanded(prev => !prev);
    };

    const toggleShowAPIDialogBox = (value) => {
        setShowAPIDialogBox(value);
    };

    const toggleTempLLMOptionChosenByLLMOptionsExtension = (value) => {
        setTempLLMOptionChosenByLLMOptionsExtension(value);
    };

    const toggleModifyHasAPIKey = (company) => {
        if (company === "OpenAI") {
            setHasAPIKey(prev => ({...prev, OpenAI: true}));
        } else if (company === "Anthropic") {
            setHasAPIKey(prev => ({...prev, Anthropic: true}));
        } else if (company === "Google") {
            setHasAPIKey(prev => ({...prev, Google: true}));
        } else if (company === "Groq") {
            setHasAPIKey(prev => ({...prev, Groq: true}));
        } else if (company === "Adobe") {
            setHasAPIKey(prev => ({...prev, Adobe: true}));
        } else {
            setHasAPIKey(company);
        }
    };

    const handleGalleryExpansion = (e) => {
        e.stopPropagation();
        setIsGalleryContainerExpanded(!isGalleryContainerExpanded);
        if (!isGalleryContainerExpanded) {
            setIsCodeFilesContainerExpanded(false);
        }
      };

    const handleCodeFilesExpansion = (e) => {
        e.stopPropagation();
        setIsCodeFilesContainerExpanded(!isCodeFilesContainerExpanded);
        if (!isCodeFilesContainerExpanded) {
            setIsGalleryContainerExpanded(false);
        }
    };

    useEffect(() => {
        if (!pdfBlob || !vectorstoreDetails.vectorstore) return;

        if (localEncryptionKey && (hasAPIKey.OpenAI || hasAPIKey.Anthropic || hasAPIKey.Google || hasAPIKey.Groq)) return;

        const assignFreeAgent = async () => {
            let googleApiKey = null;
            try {
                const response = await axios.get(`${proxyBaseUrl}/get_key`, { params: { type: "Google" } });

                if (response.status !== 200) {
                    throw new Error(`Error: ${response.status} - ${response.statusText}`);
                }

                googleApiKey = response.data.key;
            } catch (error) {
                toast.error("Error occurred while assigning free agent", {
                    description: "Try again or use your own API credentials to access agents."
                });
            }

            setCurrentLLMAPIKey(googleApiKey);
            if (googleApiKey) setCurrentLLM("Gemini 1.5 Flash-8B");

            setTimeout(() => {
                toast.message("Currently using Free agent  (limited)", {
                    description: "You've been assigned Gemini 1.5 Flash-8B as free agent. For access to better and advanced agents, use your own API keys."
                });
            }, 1000);
        };

        if (!currentLLMAPIKey) assignFreeAgent();
    }, [currentLLMAPIKey, pdfBlob, vectorstoreDetails, localEncryptionKey, hasAPIKey]);

    useEffect(() => {
        if (isMobile) toast.warning("Use a larger screen for better experience.")
    }, [isMobile]);

    useEffect(() => {
        let tempPaperData = paperData;

        if (location.state !== null && tempPaperData === null) {
            tempPaperData = {
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
            };
            setPaperData(tempPaperData);
        }

        if (pdfDataURL === null && location.state !== null && location.state.pdfDataURL !== null) {
            setPdfDataURL(location.state.pdfDataURL);

            fetch(location.state.pdfDataURL)
              .then(response => response.blob())
              .then(blob => setPdfBlob(blob))
              .catch(error => {
                if (tempPaperData === null) {
                    setPdfDownloadError("Failed to download PDF file. Please try again.");
                    setDownloadingPdf(false);
                    return;
                }
    
                const fetchPdf = async () => {
                    setDownloadingPdf(true);
                    setPdfDownloadError(null);
                
                    try {
                        const response = await fetch(
                            `${proxyBaseUrl}/paper_pdf?url=${encodeURIComponent(tempPaperData.paper.url_pdf)}`
                        );

                        if (!response.ok) {
                        throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
                        }
            
                        const blob = await response.blob();
                        const pdfObjectUrl = URL.createObjectURL(blob);
    
                        setPdfBlob(blob);
                        setPdfDataURL(pdfObjectUrl);
                        setPdfDownloadError(null);
                    } catch (error) {
                        console.error("Error fetching PDF:", error);
                        setPdfDownloadError("Failed to download PDF file. Please try again.");
                    } finally {
                        setDownloadingPdf(false);
                    }
                };
                
                fetchPdf();
              });
        } else if (pdfDataURL === null) {
            if (tempPaperData === null) {
                setPdfDownloadError("Failed to download PDF file. Please try again.");
                setDownloadingPdf(false);
                return;
            }

            const fetchPdf = async () => {
                setDownloadingPdf(true);
                setPdfDownloadError(null);
            
                try {
                    const response = await fetch(
                        `${proxyBaseUrl}/paper_pdf?url=${encodeURIComponent(tempPaperData.paper.url_pdf)}`
                    );

                    if (!response.ok) {
                    throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
                    }
        
                    const blob = await response.blob();
                    const pdfObjectUrl = URL.createObjectURL(blob);

                    setPdfBlob(blob);
                    setPdfDataURL(pdfObjectUrl);
                    setPdfDownloadError(null);
                } catch (error) {
                    console.error("Error fetching PDF:", error);
                    setPdfDownloadError("Failed to download PDF file. Please try again.");
                } finally {
                    setDownloadingPdf(false);
                }
            };
            
            fetchPdf();
        }

        return () => {
            if (pdfDataURL) {
              URL.revokeObjectURL(pdfDataURL);
            }
        };      
    }, []);
    
    useEffect(() => {
        if (paperData) {
            try {
                let existingSessionId = localStorage.getItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_${paperData.paper.url_pdf}`);

                if (!existingSessionId) {
                    const newSessionId = generateUniqueSessionId();
                    try {
                        localStorage.setItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_${paperData.paper.url_pdf}`, newSessionId);
                        setSessionId(newSessionId);
                    } catch (error) {
                        console.error("Unable to create session id:", error);
                    }
                } else {
                    setSessionId(existingSessionId);
                }
            } catch (error) {
                console.error("Unable to create session id:", error);
            }
        }
    }, [paperData]);

    useEffect(() => {
        if (!sessionId || !pdfBlob) return;
        (async () => {
            const advancedData = await loadVectorstoreFromIndexedDB(sessionId, "Advanced");
            if (advancedData) {
                await fetchAdvancedVectorstore();
            } else {
                await fetchDefaultVectorstore();
            }
        })();
    }, [sessionId, pdfBlob]);

    useEffect(() => {
        if (!localEncryptionKey) return;

        let hasOpenAIApiKey = false, hasAnthropicApiKey = false, hasGoogleApiKey = false, hasGroqApiKey = false, hasAdobeApiKey = false;

        if (sessionStorage.getItem("OpenAI-API-Key")) {
            hasOpenAIApiKey = true;
        }
        if (sessionStorage.getItem("Anthropic-API-Key")) {
            hasAnthropicApiKey = true;
        }
        if (sessionStorage.getItem("Google-API-Key")) {
            hasGoogleApiKey = true;
        }
        if (sessionStorage.getItem("Groq-API-Key")) {
            hasGroqApiKey = true;
        }
        if (sessionStorage.getItem("Adobe-CLIENT-ID") && sessionStorage.getItem("Adobe-CLIENT-SECRET")) {
            hasAdobeApiKey = true;
        }

        setHasAPIKey(prev => {
            let newState = {...prev};
            newState.OpenAI = hasOpenAIApiKey
            newState.Anthropic = hasAnthropicApiKey;
            newState.Google = hasGoogleApiKey;
            newState.Groq = hasGroqApiKey;
            newState.Adobe = hasAdobeApiKey;
            return newState;
        })
    }, []);
    
    useEffect(() => {
        if (showAPIDialogBox) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = 'auto';
        }

        return () => {
          document.body.style.overflow = 'auto';
        };
    }, [showAPIDialogBox]);
    
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 600;
            setIsMobile(mobile);
            if (mobile) {
                if (!isChatMinimized) {
                    setSavedChatWidth(chatWidth);
                    setChatHeight(chatHeight === 0 ? DEFAULT_CHAT_HEIGHT : chatHeight || DEFAULT_CHAT_HEIGHT);
                }
                setPdfContainerHeight(Math.max(window.innerHeight - chatHeight, CHAT_CONTAINER_HEIGHT_MIN));
            } else {
                if (!isChatMinimized) {
                    setSavedChatHeight(chatHeight);
                    setChatWidth(chatWidth === 0 ? DEFAULT_CHAT_WIDTH : chatWidth || DEFAULT_CHAT_WIDTH);
                }
                setPdfContainerHeight(window.innerHeight);
            }
            
            const newDefaultChatWidth = getDefaultChatWidth(windowWidth);
            const newDefaultChatHeight = getDefaultChatHeight(windowWidth, windowHeight);
            const newDefaultPageWidth = getDefaultPageWidth(windowWidth);

            setChatWidth(newDefaultChatWidth);
            setChatHeight(newDefaultChatHeight);
            setPageWidth(newDefaultPageWidth);
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", handleResize);

        handleResize();

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        }
    }, [windowWidth, windowHeight]);

    useEffect(() => {
        return () => {
            if (isDragging.current) {
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
          if (showLLMOptions) {
            const mainMenu = chatLLMOptionsRef.current;
            const subMenu = chatLLMOptionsExtensionRef.current;
            const chatLLMButton = chatLLMButtonRef.current;
            const chatMenuExpandButton = chatMenuExpandButtonRef.current;
            const chatMenuCollapseButton = chatMenuCollapseButtonRef.current;
    
            if (
              (mainMenu && !mainMenu.contains(e.target)) &&
              (!subMenu || !subMenu.contains(e.target)) &&
              (chatLLMButton && !chatLLMButton.contains(e.target)) &&
              (chatMenuExpandButton && !chatMenuExpandButton.contains(e.target)) &&
              (isMobile || (chatMenuCollapseButton && !chatMenuCollapseButton.contains(e.target)))
            ) {
              setShowLLMOptions(false);
              setLLMOptionsChoice(null);
            }
          } else if (showParseOptions) {
            const parseMenu = chatParseOptionsRef.current;
            const chatParseButton = chatParseButtonRef.current;
            const chatMenuExpandButton = chatMenuExpandButtonRef.current;
            const chatMenuCollapseButton = chatMenuCollapseButtonRef.current;

            if (
                (parseMenu && !parseMenu.contains(e.target)) &&
                (chatParseButton && !chatParseButton.contains(e.target)) &&
                (chatMenuExpandButton && !chatMenuExpandButton.contains(e.target)) &&
                (isMobile || (chatMenuCollapseButton && !chatMenuCollapseButton.contains(e.target)))
            ) {
                setShowParseOptions(false);
            }
          }
        }
    
        if (showLLMOptions || LLMOptionsChoice || showParseOptions) {
          document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }, [showLLMOptions, LLMOptionsChoice, showParseOptions]);

    useEffect(() => {
        if (isGalleryContainerExpanded) {
            setGalleryOrCodeUpper("gallery");
        } else if (isCodeFilesContainerExpanded) {
            setGalleryOrCodeUpper("code");
        } else if (!isGalleryContainerExpanded) {
            setTimeout(() => {
                setGalleryOrCodeUpper(null);
            }, 250);
        } else if (!isCodeFilesContainerExpanded) {
            setTimeout(() => {
                setGalleryOrCodeUpper(null);
            }, 250);
        }
    }, [isGalleryContainerExpanded, isCodeFilesContainerExpanded]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (galleryKeepOpen) return;

            const galleryButton = galleryButtonRef.current;
            const galleryContentContainer = galleryContentContainerRef.current;
            const codeFilesButton = codeFilesButtonRef.current;
            const codeFilesContentContainer = codeFilesContentContaierRef.current;
            const chatContainer = chatContainerRef.current;

            if (
                galleryButton && !galleryButton.contains(e.target) &&
                galleryContentContainer && !galleryContentContainer.contains(e.target) &&
                codeFilesButton && !codeFilesButton.contains(e.target) &&
                codeFilesContentContainer && !codeFilesContentContainer.contains(e.target) &&
                chatContainer && chatContainer.attachImageTemplateRef.current && !chatContainer.attachImageTemplateRef.current.contains(e.target) &&
                chatContainer && chatContainer.attachFileTemplateRef.current && !chatContainer.attachFileTemplateRef.current.contains(e.target)
            ) {
                setIsGalleryContainerExpanded(false);
                setIsCodeFilesContainerExpanded(false);
                setTimeout(() => {
                    setGalleryOrCodeUpper(null);
                }, 250);
            }
        };

        if (isGalleryContainerExpanded || isCodeFilesContainerExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isGalleryContainerExpanded, isCodeFilesContainerExpanded, galleryOrCodeUpper, galleryKeepOpen, chatContainerRef]);

    return (
        <div className="editor-main-container">
            <Toaster position="bottom-center" toastOptions={{
                classNames: {
                    toast: 'editor-sonner-toast',
                    title: 'editor-sonner-title',
                    description: 'editor-sonner-description'
                }
            }} />

            <div
                className="editor-pdf-container"
                style={{
                    width: isMobile 
                        ? '100dvw' 
                        : isChatMinimized 
                            ? '100dvw' 
                            : `calc(100% - ${chatWidth}px)`,
                    height: isMobile 
                        ? `${pdfContainerHeight}px` 
                        : '100dvh',
                    overflowY: 'hidden'
                }}
            >
                <div className="editor-pdf-left-container-wrapper">
                    <div className="editor-pdf-left-container">
                        <div className="menu-button-wrapper" title="default view" onClick={() => viewerRef.current?.changeToDefaultView()}>
                            <div className="menu-button">
                                <img src={MenuIcon} alt="menu" />
                            </div>
                        </div>
                        <div className="zoom-in-button-wrapper" title="zoom in">
                            <div className="zoom-in-button" onClick={handleZoomIn}>
                                <img src={ZoomInIcon} alt="zoom-in" />
                            </div>
                        </div>
                        <div className="zoom-out-button-wrapper" title="zoom out">
                            <div className="zoom-out-button" onClick={handleZoomOut}>
                                <img src={ZoomOutIcon} alt="zoom-out" />
                            </div>
                        </div>
                        <div className="fit-width-button-wrapper" title="fit to width">
                            <div className="fit-width-button" onClick={handleFitWidth}>
                                <img src={FitWidthIcon} alt="fit-width" />
                            </div>
                        </div>
                        {
                            isChatMinimized ? (
                                <div className="minimize-button-wrapper" title="expand ResearchPaL">
                                    <div className="minimize-button" onClick={handleChatMinimize}>
                                        <img src={MinimizeIcon} alt="minimize" />
                                    </div>
                                </div>
                            ) : (
                                <div className="maximize-button-wrapper" title="collapse ResearchPaL">
                                    <div className="maximize-button" onClick={handleChatMinimize}>
                                        <img src={MaximizeIcon} alt="maximize" />
                                    </div>
                                </div>
                            )
                        }
                    </div>
                </div>

                <div className="editor-pdf-content-wrapper">
                    {
                        downloadingPdf ? 
                        <div className="editor-pdf-downloading-container">
                            <l-ring-2 size="17" speed="0.4" stroke="2.5" color="#f7f7f7"></l-ring-2>
                            <div className="editor-pdf-downloading-text">
                                <span>Downloading PDF file</span>
                                <div className="editor-pdf-downloader-dotpulse"><l-dot-pulse size="12.5" speed="1.3" color="#f7f7f7"></l-dot-pulse></div>
                            </div>
                        </div> :
                        pdfDownloadError ? 
                        <div className="editor-pdf-download-error-container">
                            <img src={PDFErrorIcon} alt="pdf error icon" />
                            <span>{pdfDownloadError}</span>
                        </div> :
                        <div className="editor-pdf-content-container">
                            {
                                <div className="editor-page-container">
                                    <div
                                        className={`editor-page-indicator ${isScrolling ? "visible" : "hidden"}`}
                                    >
                                        {currentPage} / {totalPages > 0 ? totalPages : "..."}
                                    </div>

                                    <div className="editor-pdf-wrapper">
                                        <VirtualizedPDFViewer
                                        ref={viewerRef}
                                        file={pdfDataURL}
                                        defaultPageWidth={pageWidth}
                                        defaultPageHeight={1.37 * pageWidth}
                                        containerHeight={pdfContainerHeight}
                                        onVisibleRangeChange={handleVisibleRangeChange}
                                        isMobile={isMobile}
                                        />
                                    </div>
                                </div>
                            }
                        </div>
                    }
                </div>

                {
                    !isChatMinimized && !isMobile && (
                        <div
                            className="editor-pdf-right-container-1"
                            style={{
                                transform: isGalleryContainerExpanded ? 'translate(0px)' :  'translate(140px)',
                                zIndex: galleryOrCodeUpper  === 'gallery' ? 13 : 12
                            }}
                        >
                            <div className="gallery-content-wrapper">
                                <div
                                    ref={galleryButtonRef}
                                    className={`gallery-button ${isGalleryContainerExpanded ? 'open' : ''}`}
                                    title="access paper figures & tables"
                                    style={{
                                        zIndex: galleryOrCodeUpper === 'gallery' ? 15 : null
                                    }}
                                    onClick={handleGalleryExpansion}
                                >
                                    <img src={GalleryIcon} alt="gallery" />
                                </div>
                                <div
                                    ref={galleryContentContainerRef}
                                    className="gallery-content-container"
                                    style={{
                                        boxShadow: galleryOrCodeUpper === 'gallery' ? '-2px 2px 6px rgba(0, 0, 0, 0.5)' : null,
                                        justifyContent: currentParseOption === 'Default' ? 'center' : 'flex-start'
                                    }}
                                >
                                    {
                                        currentParseOption === "Advanced" && (
                                            <div className="gallery-figures-container">
                                                <div className="gallery-content-title">
                                                    <span>Figures/Equations</span>
                                                </div>
                                                <div
                                                    className="gallery-images-container"
                                                    style={{
                                                        justifyContent: (
                                                            currentParseOption === "Default" || !advancedParsedPaperData?.images?.length
                                                        ) ? 'center' : null
                                                    }}
                                                >
                                                    {
                                                        advancedParsedPaperData?.images?.length ? (
                                                            advancedParsedPaperData?.images
                                                                ?.sort((a, b) => {
                                                                const numA = parseInt(a.name.replace('chunk_', ''), 10);
                                                                const numB = parseInt(b.name.replace('chunk_', ''), 10);
                                                                return numA - numB;
                                                                })
                                                                .map((imgObj) => (
                                                                <div
                                                                    key={imgObj.name}
                                                                    className="gallery-image-wrapper"
                                                                    onClick={(e) => {
                                                                        if (e.ctrlKey || e.metaKey) {
                                                                            if (getProviderName(currentLLM) === 'Groq') {
                                                                                toast.warning("Files not supported with current model");
                                                                                return;
                                                                            }
                                                                            const file = new File([new Uint8Array(imgObj.data)], imgObj.name, { type: "image/png" });
                                                                            if (chatContainerRef.current && chatContainerRef.current.attachPaperImage) {
                                                                                chatContainerRef.current.attachPaperImage(file);
                                                                            }
                                                                        } else {
                                                                            toggleOpenImagePreview(imgObj, true);
                                                                        }
                                                                    }}
                                                                >
                                                                    <img
                                                                        className="gallery-image"
                                                                        src={imgObj.url}
                                                                        alt="gallery-image"
                                                                        title="CTRL (Windows/Linux) / Command (Mac) + click to attach"
                                                                    />
                                                                </div>
                                                                ))
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 12
                                                                }}
                                                            >
                                                                No figures detected
                                                            </span>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        currentParseOption === "Advanced" && (
                                            <div className="gallery-tables-container">
                                                <div className="gallery-content-title">
                                                    <span>Tables</span>
                                                </div>
                                                <div
                                                    className="gallery-images-container"
                                                    style={{
                                                        justifyContent: (
                                                            currentParseOption === "Default" || !advancedParsedPaperData?.tables?.length
                                                        ) ? 'center' : null
                                                    }}
                                                >
                                                    {
                                                        advancedParsedPaperData?.tables?.length ? (
                                                            advancedParsedPaperData?.tables
                                                                ?.sort((a, b) => {
                                                                const numA = parseInt(a.name.replace('chunk_', ''), 10);
                                                                const numB = parseInt(b.name.replace('chunk_', ''), 10);
                                                                return numA - numB;
                                                                })
                                                                .map((tblObj, idx) => {
                                                                    let modtblObj = { ...tblObj, name: `Table ${idx + 1}.csv` };
                                                                    return (
                                                                        <EditorCSVFileTemplate
                                                                            key={tblObj.name}
                                                                            tableObj={modtblObj}
                                                                            toggleOpenCSVFileModal={(file) => toggleOpenCSVFileModal(file, true)}
                                                                            chatContainerRef={chatContainerRef}
                                                                            providerName={getProviderName(currentLLM)}
                                                                        />
                                                                    );
                                                                })
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 12
                                                                }}
                                                            >
                                                                No tables detected
                                                            </span>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        currentParseOption === "Default" && (
                                            <span
                                                style={{
                                                    fontSize: 12
                                                }}
                                            >
                                                Available only with Advanced mode
                                            </span>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    !isChatMinimized && !isMobile && (
                        <div
                            className="editor-pdf-right-container-2"
                            style={{
                                transform: isCodeFilesContainerExpanded ? 'translate(0px)' :  'translate(170px)',
                                zIndex: galleryOrCodeUpper  === 'code' ? 13 : 12,
                                top: galleryOrCodeUpper === 'code' ? 20 : 86
                            }}
                        >
                            <div className="code-files-content-wrapper">
                                <div
                                    ref={codeFilesButtonRef}
                                    className={`code-files-button ${isCodeFilesContainerExpanded ? 'open' : ''}`}
                                    title="access paper code"
                                    style={{
                                        marginTop: galleryOrCodeUpper === 'code' ? 66 : null,
                                        zIndex: galleryOrCodeUpper === 'code' ? 15 : null
                                    }}
                                    onClick={handleCodeFilesExpansion}
                                >
                                    <img src={GitHubIcon} alt="code" />
                                </div>
                                <div
                                    ref={codeFilesContentContaierRef}
                                    className="code-files-content-container"
                                    style={{
                                        boxShadow: galleryOrCodeUpper === 'code' ? '-2px 2px 5px rgba(0, 0, 0, 0.3)' : null
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 12
                                        }}
                                    >
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                }

                {
                    showChatOpenButton && !isMobile && (
                        <div className="chatopen-button-wrapper" title="expand ResearchPaL">
                            <div className="chatopen-button" onClick={handleChatMinimize}>
                                <img src={ChatOpenIcon} alt="chat open" />
                            </div>
                        </div>
                    )
                }
            </div>

            <div
                className="editor-chat-container"
                style={{
                    width: isMobile ? '100dvw' : (isChatMinimized ? 0 : `${chatWidth}px`),
                    height: isMobile ? (isChatMinimized ? 0 : `${chatHeight}px`) : '100dvh',
                }}
            >
                {
                    isMobile ? ( showChatOpenButton ? null :
                        <div className="editor-chat-top-container-wrapper">
                            <div
                                className="editor-chat-top-container"
                                onMouseDown={handleMouseDown}
                                title="Drag to resize"
                            >
                                <img src={ThreeDotsIcon} alt="three dots" />
                            </div>
                        </div>
                    ) : (
                        <div className="editor-chat-left-container-wrapper">
                            <div
                                className="editor-chat-left-container"
                                onMouseDown={handleMouseDown}
                                title="Drag to resize"
                            >
                                <img src={ThreeDotsIcon} alt="three dots" />
                            </div>
                        </div>
                    )
                }

                {chatWidth && chatHeight && (
                    <ChatContainer
                        ref={chatContainerRef}
                        showLLMOptions={showLLMOptions}
                        showParseOptions={showParseOptions}
                        toggleChatMenuExpanded={toggleChatMenuExpanded}
                        toggleLLMOptions={toggleLLMOptions}
                        toggleShowParseOptions={toggleShowParseOptions}
                        chatLLMButtonRef={chatLLMButtonRef}
                        chatParseButtonRef={chatParseButtonRef}
                        chatLLMOptionsRef={chatLLMOptionsRef}
                        chatLLMOptionsExtensionRef={chatLLMOptionsExtensionRef}
                        chatParseOptionsRef={chatParseOptionsRef}
                        currentLLM={currentLLM}
                        chatWidth={chatWidth}
                        chatMenuExpandButtonRef={chatMenuExpandButtonRef}
                        chatMenuCollapseButtonRef={chatMenuCollapseButtonRef}
                        toggleOpenCSVFileModal={toggleOpenCSVFileModal}
                        toggleOpenPyFileModal={toggleOpenPyFileModal}
                        toggleOpenJsFileModal={toggleOpenJsFileModal}
                        toggleOpenHtmlFileModal={toggleOpenHtmlFileModal}
                        toggleOpenCssFileModal={toggleOpenCssFileModal}
                        toggleOpenImagePreview={toggleOpenImagePreview}
                        isMobile={isMobile}
                        pdfContainerHeight={pdfContainerHeight}
                        fetchingVectorstore={fetchingVectorstore}
                        errorFetchingVectorstore={vectorstoreDetails.error === null ? false : true}
                        downloadingPdf={downloadingPdf}
                        pdfDownloadError={pdfDownloadError}
                        isVectorstoreReady={vectorstoreDetails.vectorstore !== null}
                        initialSuggestions={initialSuggestions}
                        loadingSuggestions={loadingInitialSuggestions}
                        fetchingParsedData={fetchingParsedData}
                        parseMode={currentParseOption}
                        sessionId={sessionId}
                        providerName={getProviderName(currentLLM)}
                        providerApiKey={currentLLMAPIKey}
                        paperDetails={paperData || advancedParsedPaperData?.paper_details}
                        advancedParsedPaperData={advancedParsedPaperData}
                        embeddingApiKey={embeddingApiKey}
                        vectorstore={vectorstoreDetails.vectorstore}
                    />
                )}
            </div>

            {
                !isChatMinimized && isMobile && (
                    <div
                            className="editor-main-right-container-1"
                            style={{
                                transform: isGalleryContainerExpanded ? 'translate(0px)' :  'translate(140px)',
                                zIndex: galleryOrCodeUpper  === 'gallery' ? 150 : 12
                            }}
                        >
                            <div className="gallery-content-wrapper">
                                <div
                                    ref={galleryButtonRef}
                                    className={`gallery-button ${isGalleryContainerExpanded ? 'open' : ''}`}
                                    style={{
                                        zIndex: galleryOrCodeUpper === 'gallery' ? 15 : null
                                    }}
                                    onClick={handleGalleryExpansion}
                                >
                                    <img src={GalleryIcon} alt="gallery" />
                                </div>
                                <div
                                    ref={galleryContentContainerRef}
                                    className="gallery-content-container"
                                    title="access paper figures & tables"
                                    style={{
                                        boxShadow: galleryOrCodeUpper === 'gallery' ? '-2px 2px 6px rgba(0, 0, 0, 0.5)' : null,
                                        justifyContent: currentParseOption === 'Default' ? 'center' : 'flex-start'
                                    }}
                                >
                                    {
                                        currentParseOption === "Advanced" && (
                                            <div className="gallery-figures-container">
                                                <div className="gallery-content-title">
                                                    <span>Figures/Equations</span>
                                                </div>
                                                <div
                                                    className="gallery-images-container"
                                                    style={{
                                                        justifyContent: (
                                                            currentParseOption === "Default" || !advancedParsedPaperData?.images?.length
                                                        ) ? 'center' : null
                                                    }}
                                                >
                                                    {
                                                        advancedParsedPaperData?.images?.length ? (
                                                            advancedParsedPaperData?.images
                                                                ?.sort((a, b) => {
                                                                const numA = parseInt(a.name.replace('chunk_', ''), 10);
                                                                const numB = parseInt(b.name.replace('chunk_', ''), 10);
                                                                return numA - numB;
                                                                })
                                                                .map((imgObj) => (
                                                                <div
                                                                    key={imgObj.name}
                                                                    className="gallery-image-wrapper"
                                                                    onClick={(e) => {
                                                                        if (e.ctrlKey || e.metaKey) {
                                                                            if (getProviderName(currentLLM) === 'Groq') {
                                                                                toast.warning("Files not supported with current model");
                                                                                return;
                                                                            }
                                                                            const file = new File([new Uint8Array(imgObj.data)], imgObj.name, { type: "image/png" });
                                                                            if (chatContainerRef.current && chatContainerRef.current.attachPaperImage) {
                                                                                chatContainerRef.current.attachPaperImage(file);
                                                                            }
                                                                        } else {
                                                                            toggleOpenImagePreview(imgObj, true);
                                                                        }
                                                                    }}
                                                                >
                                                                    <img
                                                                        className="gallery-image"
                                                                        src={imgObj.url}
                                                                        alt="gallery-image"
                                                                        title="CTRL (Windows/Linux) / Command (Mac) + click to attach"
                                                                    />
                                                                </div>
                                                                ))
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 12
                                                                }}
                                                            >
                                                                No figures detected
                                                            </span>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        currentParseOption === "Advanced" && (
                                            <div className="gallery-tables-container">
                                                <div className="gallery-content-title">
                                                    <span>Tables</span>
                                                </div>
                                                <div
                                                    className="gallery-images-container"
                                                    style={{
                                                        justifyContent: (
                                                            currentParseOption === "Default" || !advancedParsedPaperData?.tables?.length
                                                        ) ? 'center' : null
                                                    }}
                                                >
                                                    {
                                                        advancedParsedPaperData?.tables?.length ? (
                                                            advancedParsedPaperData?.tables
                                                                ?.sort((a, b) => {
                                                                const numA = parseInt(a.name.replace('chunk_', ''), 10);
                                                                const numB = parseInt(b.name.replace('chunk_', ''), 10);
                                                                return numA - numB;
                                                                })
                                                                .map((tblObj, idx) => {
                                                                    let modtblObj = { ...tblObj, name: `Table ${idx + 1}.csv` };
                                                                    return (
                                                                        <EditorCSVFileTemplate
                                                                            key={tblObj.name}
                                                                            tableObj={modtblObj}
                                                                            toggleOpenCSVFileModal={(file) => toggleOpenCSVFileModal(file, true)}
                                                                            chatContainerRef={chatContainerRef}
                                                                            providerName={getProviderName(currentLLM)}
                                                                        />
                                                                    );
                                                                })
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    fontSize: 12
                                                                }}
                                                            >
                                                                No tables detected
                                                            </span>
                                                        )
                                                    }
                                                </div>
                                            </div>
                                        )
                                    }
                                    {
                                        currentParseOption === "Default" && (
                                            <span
                                                style={{
                                                    fontSize: 12
                                                }}
                                            >
                                                Available only with Advanced mode
                                            </span>
                                        )
                                    }
                                </div>
                            </div>
                        </div>
                )
            }

            {
                !isChatMinimized && isMobile && (
                    <div
                        className="editor-main-right-container-2"
                        style={{
                            transform: isCodeFilesContainerExpanded ? 'translate(0px)' :  'translate(170px)',
                            zIndex: galleryOrCodeUpper  === 'code' ? 150 : 12,
                            top: galleryOrCodeUpper === 'code' ? 20 : 86
                        }}
                    >
                        <div className="code-files-content-wrapper">
                            <div
                                ref={codeFilesButtonRef}
                                className={`code-files-button ${isCodeFilesContainerExpanded ? 'open' : ''}`}
                                title="access paper code"
                                style={{
                                    marginTop: galleryOrCodeUpper === 'code' ? 66 : null,
                                    zIndex: galleryOrCodeUpper === 'code' ? 15 : null
                                }}
                                onClick={handleCodeFilesExpansion}
                            >
                                <img src={GitHubIcon} alt="code" />
                            </div>
                            <div
                                ref={codeFilesContentContaierRef}
                                className="code-files-content-container"
                                style={{
                                    boxShadow: galleryOrCodeUpper === 'code' ? '-2px 2px 5px rgba(0, 0, 0, 0.3)' : null
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 12
                                    }}
                                >
                                    Coming Soon
                                </span>
                            </div>
                        </div>
                    </div>
                )
                }

            {
                showChatOpenButton && isMobile && (
                    <div className="chatopen-button-wrapper-mobile" title="expand ResearchPaL">
                        <div className="chatopen-button-mobile" onClick={handleChatMinimize}>
                            <img src={ChatOpenIcon} alt="chat open" />
                        </div>
                    </div>
                )
            }

            {
                showLLMOptions && (
                    <div
                        ref={chatLLMOptionsRef}
                        className="chat-llmoptions-container"
                        style={{
                            right: isChatMenuExpanded ? 160 : 45,
                            top: isMobile ? (pdfContainerHeight + 11 + 2) : null
                        }}
                    >
                        <div
                            className="chat-llmoptions-button-chatgpt"
                            onClick={() => handleLLMOptionsExtension("OpenAI")}
                            style={
                                LLMOptionsChoice === "OpenAI" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div
                                className="chat-llmoptions-leftarrow-container"
                                style={
                                    LLMOptionsChoice === "OpenAI" ? {
                                        opacity: '1'
                                    } : null
                                }
                            >
                                <img src={LeftArrowIcon} alt="left arrow icon" />
                            </div>
                            <div className="chat-llmoptions-text-container">
                                <span>OpenAI</span>
                            </div>
                            <div
                                className="chat-llmoptions-availability"
                                title={wantToChangeAPIKey.OpenAI ? "change openai api key" : (localEncryptionKey && hasAPIKey.OpenAI) ? "available" : "provide openai api key"}
                                onMouseEnter={() => {
                                    setWantToChangeAPIKey((prev) => ({ OpenAI: true, Anthropic: false, Google: false, Groq: false, Adobe: prev.Adobe }));
                                }}
                                onMouseLeave={() => {
                                    setWantToChangeAPIKey(prev => ({...prev, OpenAI: false}))
                                }}
                                onClick={(e) => {
                                    setLLMOptionsChoice(null);
                                    setShowAPIDialogBox("OpenAI");
                                    e.stopPropagation();
                                }}
                            >
                                <img src={wantToChangeAPIKey.OpenAI ? BigDotYellow : (localEncryptionKey && hasAPIKey.OpenAI) ? BigDotGreen : BigDotRed} alt="red dot" />
                            </div>
                        </div>
                        <div
                            className="chat-llmoptions-button-claude"
                            onClick={() => handleLLMOptionsExtension("Anthropic")}
                            style={
                                LLMOptionsChoice === "Anthropic" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div
                                className="chat-llmoptions-leftarrow-container"
                                style={
                                    LLMOptionsChoice === "Anthropic" ? {
                                        opacity: '1'
                                    } : null
                                }
                            >
                                <img src={LeftArrowIcon} alt="left arrow icon" />
                            </div>
                            <div className="chat-llmoptions-text-container">
                                <span>Anthropic</span>
                            </div>
                            <div
                                className="chat-llmoptions-availability"
                                title={wantToChangeAPIKey.Anthropic ? "change anthropic api key" : (localEncryptionKey && hasAPIKey.Anthropic) ? "available" : "provide anthropic api key"}
                                onMouseEnter={() => {
                                    setWantToChangeAPIKey((prev) => ({ OpenAI: false, Anthropic: true, Google: false, Groq: false, Adobe: prev.Adobe }));
                                }}
                                onMouseLeave={() => {
                                    setWantToChangeAPIKey(prev => ({...prev, Anthropic: false}))
                                }}
                                onClick={(e) => {
                                    setLLMOptionsChoice(null);
                                    setShowAPIDialogBox("Anthropic");
                                    e.stopPropagation();
                                }}
                            >
                                <img src={wantToChangeAPIKey.Anthropic ? BigDotYellow : (localEncryptionKey && hasAPIKey.Anthropic) ? BigDotGreen : BigDotRed} alt="red dot" />
                            </div>
                        </div>
                        <div
                            className="chat-llmoptions-button-gemini"
                            onClick={() => handleLLMOptionsExtension("Google")}
                            style={
                                LLMOptionsChoice === "Google" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div
                                className="chat-llmoptions-leftarrow-container"
                                style={
                                    LLMOptionsChoice === "Google" ? {
                                        opacity: '1'
                                    } : null
                                }
                            >
                                <img src={LeftArrowIcon} alt="left arrow icon" />
                            </div>
                            <div className="chat-llmoptions-text-container">
                                <span>Google</span>
                            </div>
                            <div
                                className="chat-llmoptions-availability"
                                title={wantToChangeAPIKey.Google ? "change google api key" : (localEncryptionKey && hasAPIKey.Google) ? "available" : "provide google api key"}
                                onMouseEnter={() => {
                                    setWantToChangeAPIKey((prev) => ({ OpenAI: false, Anthropic: false, Google: true, Groq: false, Adobe: prev.Adobe }));
                                }}
                                onMouseLeave={() => {
                                    setWantToChangeAPIKey(prev => ({...prev, Google: false}))
                                }}
                                onClick={(e) => {
                                    setLLMOptionsChoice(null);
                                    setShowAPIDialogBox("Google");
                                    e.stopPropagation();
                                }}
                            >
                                <img src={wantToChangeAPIKey.Google ? BigDotYellow : (localEncryptionKey && hasAPIKey.Google) ? BigDotGreen : BigDotRed} alt="red dot" />
                            </div>
                        </div>
                        <div
                            className="chat-llmoptions-button-llama"
                            onClick={() => handleLLMOptionsExtension("Groq")}
                            style={
                                LLMOptionsChoice === "Groq" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div
                                className="chat-llmoptions-leftarrow-container"
                                style={
                                    LLMOptionsChoice === "Groq" ? {
                                        opacity: '1'
                                    } : null
                                }
                            >
                                <img src={LeftArrowIcon} alt="left arrow icon" />
                            </div>
                            <div className="chat-llmoptions-text-container">
                                <span>Groq</span>
                            </div>
                            <div
                                className="chat-llmoptions-availability"
                                title={wantToChangeAPIKey.Groq ? "change groq api key" : (localEncryptionKey && hasAPIKey.Groq) ? "available" : "provide groq api key"}
                                onMouseEnter={() => {
                                    setWantToChangeAPIKey((prev) => ({ OpenAI: false, Anthropic: false, Google: false, Groq: true, Adobe: prev.Adobe }));
                                }}
                                onMouseLeave={() => {
                                    setWantToChangeAPIKey(prev => ({...prev, Groq: false}))
                                }}
                                onClick={(e) => {
                                    setLLMOptionsChoice(null);
                                    setShowAPIDialogBox("Groq");
                                    e.stopPropagation();
                                }}
                            >
                                <img src={wantToChangeAPIKey.Groq ? BigDotYellow : (localEncryptionKey && hasAPIKey.Groq) ? BigDotGreen : BigDotRed} alt="red dot" />
                            </div>
                        </div>
                    </div>
                )
            }

            {
                LLMOptionsChoice === "OpenAI" ? (
                    <div ref={chatLLMOptionsExtensionRef}>
                        <LLMOptionsExtension
                            company="OpenAI"
                            options={openAIModels}
                            isChatMenuExpanded={isChatMenuExpanded}
                            currentLLM={currentLLM}
                            toggleSetCurrentLLM={toggleSetCurrentLLM}
                            localEncryptionKey={localEncryptionKey}
                            toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                            toggleLLMOptions={toggleLLMOptions}
                            toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                            toggleTempLLMOptionChosenByLLMOptionsExtension={toggleTempLLMOptionChosenByLLMOptionsExtension}
                            toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                            isMobile={isMobile}
                            pdfContainerHeight={pdfContainerHeight}
                        />
                    </div>
                ) : LLMOptionsChoice === "Anthropic" ? (
                    <div ref={chatLLMOptionsExtensionRef}>
                        <LLMOptionsExtension
                            company="Anthropic"
                            options={anthropicModels}
                            isChatMenuExpanded={isChatMenuExpanded}
                            currentLLM={currentLLM}
                            toggleSetCurrentLLM={toggleSetCurrentLLM}
                            localEncryptionKey={localEncryptionKey}
                            toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                            toggleLLMOptions={toggleLLMOptions}
                            toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                            toggleTempLLMOptionChosenByLLMOptionsExtension={toggleTempLLMOptionChosenByLLMOptionsExtension}
                            toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                            isMobile={isMobile}
                            pdfContainerHeight={pdfContainerHeight}
                        />
                    </div>
                ) : LLMOptionsChoice === "Google" ? (
                    <div ref={chatLLMOptionsExtensionRef}>
                        <LLMOptionsExtension
                            company="Google"
                            options={googleModels}
                            isChatMenuExpanded={isChatMenuExpanded}
                            currentLLM={currentLLM}
                            toggleSetCurrentLLM={toggleSetCurrentLLM}
                            localEncryptionKey={localEncryptionKey}
                            toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                            toggleLLMOptions={toggleLLMOptions}
                            toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                            toggleTempLLMOptionChosenByLLMOptionsExtension={toggleTempLLMOptionChosenByLLMOptionsExtension}
                            toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                            isMobile={isMobile}
                            pdfContainerHeight={pdfContainerHeight}
                        />
                    </div>
                ) : LLMOptionsChoice === "Groq" ? (
                    <div ref={chatLLMOptionsExtensionRef}>
                        <LLMOptionsExtension
                            company="Groq"
                            options={groqModels}
                            isChatMenuExpanded={isChatMenuExpanded}
                            currentLLM={currentLLM}
                            toggleSetCurrentLLM={toggleSetCurrentLLM}
                            localEncryptionKey={localEncryptionKey}
                            toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                            toggleLLMOptions={toggleLLMOptions}
                            toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                            toggleTempLLMOptionChosenByLLMOptionsExtension={toggleTempLLMOptionChosenByLLMOptionsExtension}
                            toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                            isMobile={isMobile}
                            pdfContainerHeight={pdfContainerHeight}
                        />
                    </div>
                ) : null
            }

            {
                showParseOptions && (
                    <div
                        ref={chatParseOptionsRef}
                        className="chat-parseoptions-container"
                        style={{
                            right: isChatMenuExpanded ? 160 : 45,
                            top: isMobile ? (pdfContainerHeight + 11 + 40) : null
                        }}
                    >
                        <div
                            className="chat-parseoptions-button-default"
                            onClick={() => handleParseOptionSelection("Default")}
                            style={
                                currentParseOption === "Default" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div className="chat-parseoptions-text-container">
                                <span>Default</span>
                            </div>
                        </div>

                        <div
                            className="chat-parseoptions-button-adobe"
                            onClick={() => handleParseOptionSelection("Advanced")}
                            style={
                                currentParseOption === "Advanced" ? {
                                    backgroundColor: '#16202e'
                                } : null
                            }
                        >
                            <div className="chat-parseoptions-text-container">
                                <span>Advanced</span>
                            </div>
                            <div
                                className="chat-parseoptions-availability"
                                title={wantToChangeAPIKey.Adobe ? "change adobe api key" : (localEncryptionKey && hasAPIKey.Adobe) ? "available" : "provide adobe api key"}
                                onMouseEnter={() => {
                                    setWantToChangeAPIKey((prev) => ({ OpenAI: prev.OpenAI, Anthropic: prev.Anthropic, Google: prev.Google, Groq: prev.Groq, Adobe: true }));
                                }}
                                onMouseLeave={() => {
                                    setWantToChangeAPIKey(prev => ({...prev, Adobe: false}))
                                }}
                                onClick={(e) => {
                                    setLLMOptionsChoice(null);
                                    setShowAPIDialogBox("Adobe");
                                    e.stopPropagation();
                                }}
                            >
                                <img src={wantToChangeAPIKey.Adobe ? BigDotYellow : (localEncryptionKey && hasAPIKey.Adobe) ? BigDotGreen : BigDotRed} alt="red dot" />
                            </div>
                        </div>
                    </div>
                )
            }

            {showAPIDialogBox && (
                <APIDialogOverlay
                    showAPIDialogBox={showAPIDialogBox}
                    localEncryptionKey={localEncryptionKey}
                    toggleShowAPIDialogBox={toggleShowAPIDialogBox}
                    storeLocalEncryptionKey={storeLocalEncryptionKey}
                    toggleSetCurrentLLM={toggleSetCurrentLLM}
                    toggleSetCurrentLLMAPIKey={toggleSetCurrentLLMAPIKey}
                    toggleLLMOptions={toggleLLMOptions}
                    tempLLMOptionChosenByLLMOptionsExtension={tempLLMOptionChosenByLLMOptionsExtension}
                    toggleModifyHasAPIKey={toggleModifyHasAPIKey}
                    toggleShowParseOptions={toggleShowParseOptions}
                />
            )}

            {previewImage && (
                <ChatImagePreviewModal
                    imageObj={previewImage}
                    onClose={closeImagePreview}
                />
            )}

            {showCSVModal && (
                <CSVModal
                    file={csvFileToView}
                    onClose={closeCSVFileModal}
                />
            )}

            {showPyModal && (
                <PyModal
                file={pyFileToView}
                onClose={closePyFileModal}
                />
            )}

            {showJsModal && <JsModal file={jsFileToView} onClose={closeJsFileModal} />}

            {showHtmlModal && <HtmlModal file={htmlFileToView} onClose={closeHtmlFileModal} />}

            {showCssModal && <CssModal file={cssFileToView} onClose={closeCssFileModal} />}
        </div>
    );
}

export default EditorPage;