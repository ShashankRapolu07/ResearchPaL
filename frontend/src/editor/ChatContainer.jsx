import React, { useState, useRef, useEffect, useImperativeHandle, useCallback } from "react";
import './ChatContainer.css';
import ToggleSwitch from "./ToggleSwitch";
import { UserMessageBlock, AgentMessageBlock } from './MessageBlockComponents';
import FollowUpBlock from './FollowUpBlock';
import { streamGraph } from "../rag/ragSystemBuilder.tsx";
import RightDoubleArrowsIcon from '../assets/images/right double arrows.png';
import LLMsIcon from '../assets/images/LLMs.png';
import ParserIcon from '../assets/images/parser.png';
// import QueryEnhancerIcon from '../assets/images/query enhancer.png';
import RetrievalQualityEnhancerIcon from '../assets/images/retrieval quality enhancer.png';
import CitationIcon from '../assets/images/citation-icon.png';
import DownloadIcon from '../assets/images/download.png';
import UploadIcon from '../assets/images/upload.png';
import AttachIcon from '../assets/images/attach.png';
import SendIcon from '../assets/images/send.png';
import CloseIcon from '../assets/images/image close.png';
import AgentIcon from '../assets/images/researchpal.png';
import SadRobotIcon from '../assets/images/sad robot.png';
import ScrollArrowIcon from '../assets/images/scroll arrow.png';
import { v4 as uuidv4 } from 'uuid';
import { ring2, dotPulse, waveform } from "ldrs";
import { toast } from 'sonner';
import Dexie from 'dexie';
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";

ring2.register();
dotPulse.register();
waveform.register();

const validImageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
const validFileExtensions = ['csv', 'py', 'html', 'css', 'js'];
const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB
const MAX_FILE_SIZE_BYTES = 50 * 1024; // 50KB
const IMAGES_AND_FILES_ANIMATION_DURATION = 0;

const CHAT_MENU_EXPANDED_WIDTH = 155;
const CHAT_MENU_COMPRESSED_WIDTH = 40;
const MAX_QUERY_LENGTH = 2000;
const SCROLL_BUTTON_THRESHOLD = 2000;

const RESPONSE_REVEAL_SIZE = 5;
const RESPONSE_REVEAL_FREQUENCY = 30;
const UPDATE_REVEAL_FREQUENCY = 200;

function createImageObject(file) {
    return {
      id: uuidv4(),
      file,
      url: URL.createObjectURL(file),
      status: "entering"
    };
  };
  
function createFileObject(file) {
    return {
        id: uuidv4(),
        file,
        status: "entering"
    };
};

const AttachImageTemplate = ({ ref, imageObj, handleRemoveImage, toggleOpenImagePreview }) => {
    return (
        <div
            ref={ref}
            key={imageObj.id}
            className={`chat-input-image-wrapper ${imageObj.status}`}
            onClick={(e) => {
                e.stopPropagation();
                if (imageObj.status !== "exiting") {
                  toggleOpenImagePreview(imageObj, true);
                }
              }}
            onTransitionEnd={(e) => {
                if (imageObj.status === "exiting") {
                    handleRemoveImage(imageObj.id, true);
                }
            }}
        >
            <img className="chat-input-image-wrapper-img" src={imageObj.url} alt={imageObj.file.name} />
            <div
                className="chat-image-close-button"
                onClick={(e) => {
                    e.stopPropagation();
                    if (imageObj.status !== "exiting") {
                      handleRemoveImage(imageObj.id, false);
                    }
                  }}
            >
                <img className="chat-image-close-button-img" src={CloseIcon} alt="close icon" />
            </div>
        </div>
    );
};

const AttachFileTemplate = ({
    ref,
    fileObj, // { id, file, status }
    isHovering,
    onMouseEnter,
    onMouseLeave,
    onRemove,
    toggleOpenCSVFileModal,
    toggleOpenPyFileModal,
    toggleOpenJsFileModal,
    toggleOpenHtmlFileModal,
    toggleOpenCssFileModal
}) => {
    const { file, status } = fileObj;
    const fileName = file.name;
    const fileType = fileName.split('.').pop().toLowerCase();

    const containerClass = `attachfile-template-container ${status}`;

    const containerStyle = (
        fileType === "csv" ? { border: `1.5px solid ${isHovering ? 'rgb(25, 210, 90, 1)' : 'rgb(23, 173, 76, 1)'}` }
        : fileType === "py" ? { border: `1.5px solid ${isHovering ? 'rgb(86, 190, 255, 1)' : 'rgb(72, 155, 206, 1)'}` }
        : fileType === "js" ? { border: `1.5px solid ${isHovering ? 'rgba(241, 224, 90, 1)' : 'rgb(190, 176, 68, 1)'}` }
        : fileType === "html" ? { border: `1.5px solid ${isHovering ? 'rgb(255, 65, 17, 1)' : 'rgb(206, 54, 16, 1)'}` }
        : fileType === "css" ? { border: `1.5px solid ${isHovering ? 'rgb(166, 66, 254, 1)' : 'rgba(130, 60, 190, 1)'}` }
        : null
    );

    const spanStyle = (
        fileType === "csv" ? { color: `${isHovering ? 'rgb(25, 210, 90, 1)' : 'rgb(23, 173, 76, 1)'}` }
        : fileType === "py" ? { color: `${isHovering ? 'rgb(86, 190, 255, 1)' : 'rgb(72, 155, 206, 1)'}` }
        : fileType === "js" ? { color: `${isHovering ? 'rgba(241, 224, 90, 1)' : 'rgb(190, 176, 68, 1)'}` }
        : fileType === "html" ? { color: `${isHovering ? 'rgb(255, 65, 17, 1)' : 'rgb(206, 54, 16, 1)'}` }
        : fileType === "css" ? { color: `${isHovering ? 'rgb(166, 66, 254, 1)' : 'rgba(130, 60, 190, 1)'}` }
        : null
    );

    const handleTransitionEnd = (e) => {
        if (status === "exiting") {
          onRemove(true);
        }
    };

    const handleFileClick = () => {
        if (fileType === 'csv') {
            toggleOpenCSVFileModal(file, true);
        } else if (fileType === 'py') {
            toggleOpenPyFileModal(file);
        } else if (fileType === 'js') {
            toggleOpenJsFileModal(file);
        } else if (fileType === 'html') {
            toggleOpenHtmlFileModal(file);
        } else if (fileType === 'css') {
            toggleOpenCssFileModal(file);
        }
    };

    const handleFileClose = (e) => {
        e.stopPropagation();
        onRemove(false);
    };

    return (
        <div
            ref={ref}
            className={containerClass}
            style={containerStyle}
            onTransitionEnd={handleTransitionEnd}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={handleFileClick}
        >
            <span style={spanStyle}>{fileName}</span>
            <div className="attachfile-close-button" onClick={handleFileClose}>
                <img className="attachfile-close-button-img" src={CloseIcon} alt="file close icon" />
            </div>
        </div>
    );
};

const SuggestionsQuestionTile = ({ question, toggleUserInput }) => {
    const handleClick = () => {
        toggleUserInput(question);
    }

    return (
        <div className="chat-suggestions-question-tile" onClick={handleClick}>
            <span className="chat-suggestions-question-span">{question}</span>
        </div>
    );
};

const ChatContainer = React.forwardRef((props, ref) => {
    const {
        showLLMOptions,
        showParseOptions,
        toggleLLMOptions,
        toggleShowParseOptions,
        toggleChatMenuExpanded,
        currentLLM,
        chatLLMButtonRef,
        chatParseButtonRef,
        chatLLMOptionsRef,
        chatLLMOptionsExtensionRef,
        chatParseOptionsRef,
        chatWidth,
        chatMenuExpandButtonRef,
        chatMenuCollapseButtonRef,
        toggleOpenCSVFileModal,
        toggleOpenPyFileModal,
        toggleOpenJsFileModal,
        toggleOpenHtmlFileModal,
        toggleOpenCssFileModal,
        toggleOpenImagePreview,
        isMobile,
        pdfContainerHeight,
        fetchingVectorstore,
        errorFetchingVectorstore,
        downloadingPdf = false,
        pdfDownloadError,
        isVectorstoreReady = false,
        initialSuggestions = null,
        loadingSuggestions = true,
        fetchingParsedData = false,
        parseMode,
        sessionId,
        providerName,
        providerApiKey,
        paperDetails,
        advancedParsedPaperData,
        embeddingApiKey,
        vectorstore
    } = props;

    // const [queryEnhancerActive, setQueryEnhancerActive] = useState(false);
    const [retrievalQualityEnhancerActive, setRetrievalQualityEnhancerActive] = useState(false);
    const [citationModeActive, setCitationModeActive] = useState(false);
    const [chatMenuExpanded, setChatMenuExpanded] = useState(false);
    const [followUpSuggestionsEnabled, setFollowUpSuggestionsEnabled] = useState(false);
    const [followUpSuggestions, setFollowUpSuggestions] = useState(null);
    const [userInput, setUserInput] = useState("");
    const [textAreaRows, setTextAreaRows] = useState(1);
    const [animatedLLM, setAnimatedLLM] = useState(currentLLM);
    const [userImages, setUserImages] = useState([]);
    const [userFiles, setUserFiles] = useState([]);
    const [userFilesHoveringList, setUserFilesHoveringList] = useState([false, false]);
    const [chatCentralTopContainerPaddingRight, setChatCentralTopContainerPaddingRight] = useState("5px");
    const [showScrollToBottomButton, setShowScrollToBottomButton] = useState(false);
    const [chatMessageBlocks, setChatMessageBlocks] = useState([]);
    const [chatMessagesLangChain, setChatMessagesLangChain] = useState([]);
    const [processedPaperData, setProcessedPaperData] = useState({
        images: [],
        tables: [],
        imageLabels: [],
        tableLabels: []
    });
    const [isStreaming, setIsStreaming] = useState(false);
    const [preUpdateIntervalRunning, setPreUpdateIntervalRunning] = useState(false);
    const [fetchingFromIndexedDB, setFetchingFromIndexedDB] = useState(false);
    const [finishedGenerating, setFinishedGenerating] = useState(true);
    const [hoveringOnChatCentralTopContainer, setHoveringOnChatCentralTopContainer] = useState(false);
    const [interruptedGeneration, setInterruptedGeneration] = useState(false);
    // const [interruptedForQueryEnhancement, setInterruptedForQueryEnhancement] = useState(false);
    // const [turnNumAtInterrupt, setTurnNumAtInterrupt] = useState(null);
    const textAreaRef = useRef(null);
    const spanRef = useRef(null);
    const fileInputRef = useRef(null);
    const chatMenuRef = useRef(null);
    const chatCentralTopContainerRef = useRef(null);
    const attachImageTemplateRef = useRef(null);
    const attachFileTemplateRef = useRef(null);
    const latestAgentMessageBlockRef = useRef(null);
    const accumulatedTextRef = useRef("");
    const incomingBufferRef = useRef("");
    const incomingPreUpdatesRef = useRef([]);
    const incomingPostUpdatesRef = useRef([]);
    const interruptedStreamingRef = useRef(false);
    // const turnNumAtInterruptRef = useRef(turnNumAtInterrupt);

    const db = new Dexie('ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==');
    db.version(1).stores({
        Sessions: 'id'
    });

    const MAX_LINES = userImages.length ? 7 : userFiles.length ? 9 : 10;
    const lineHeightPx = 18; 
    const MAX_IMAGES = 5;
    const MAX_FILES = 5;

    const suggestionQuestions = (!initialSuggestions || !parseMode) ? [
        "Could you briefly summarize the paper for me?",
        "Summarize the paper in detail for me.",
        "Give a section-wise summary of the paper.",
        "Explain the methodology used in this study."
    ] : parseMode === "Default" ? initialSuggestions.default : initialSuggestions.advanced;

    const saveChatHistoryToIndexedDB = async (key, turn, messages) => {
        try {
            const existing = await db.Sessions.get(key);
            if (!existing) {
                await db.Sessions.put({ id: key, chatHistory: messages });
            } else {
                existing.chatHistory = messages;
                await db.Sessions.put(existing);
            }
            console.log(`Chat history of turn ${turn} for session ${key} saved successfully in IndexedDB.`);
        } catch (error) {
            console.error(`Failed to save chat history for turn ${turn} in Indexed DB for session ${key}`);
        }
    };

    const loadChatHistoryFromIndexedDB = async (key) => {
        try {
            const existing = await db.Sessions.get(key);
            if (existing && existing.chatHistory && existing.chatHistory.length > 0) {
                console.log(`Successfully loaded chat history for session ${key} from IndexedDB.`);
                return existing.chatHistory;
            }
        } catch (error) {
            console.error(`Failed to load chat history for session ${key} from IndexedDB.`);
        }
        return null;
    };

    const fetchChatHistoryFromIndexedDB = async () => {
        setFetchingFromIndexedDB(true);
        try {
            const serializedChatMessages = JSON.parse(await loadChatHistoryFromIndexedDB(sessionId));
            if (!serializedChatMessages) return;
            const deserializedChatMessages = mapStoredMessagesToChatMessages(serializedChatMessages);
            setChatMessagesLangChain(prev => deserializedChatMessages);
            setChatMessageBlocks(prev => getMessageBlocksFromChatHistory(deserializedChatMessages));
        } catch (error) {
            console.error("Failed to load conversation history:", error);
            toast.warning("Failed to load conversation history");
        } finally {
            setFetchingFromIndexedDB(false);
        }
    };

    const getMimeTypeByExtension = (ext) => {
        switch (ext.toLowerCase()) {
          case "csv":
            return "text/csv";
          case "js":
            return "text/javascript";
          case "py":
            return "text/x-python";
          case "html":
            return "text/html";
          case "css":
            return "text/css";
          default:
            return "text/plain";
        }
    };

    const base64ToFile = (base64String, fileName) => {
        const matches = base64String.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
        if (!matches) {
          const fallbackBlob = new Blob([], { type: "image/png" });
          return new File([fallbackBlob], fileName, { type: "image/png" });
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        const byteChars = atob(base64Data);
        const byteNumbers = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) {
          byteNumbers[i] = byteChars.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        return new File([blob], fileName, { type: mimeType });
    };

    const textToFile = (content, fileName) => {
        const extension = fileName.split(".").pop() || "";
        const mimeType = getMimeTypeByExtension(extension);
        const blob = new Blob([content], { type: mimeType });
        return new File([blob], fileName, { type: mimeType });
    };

    const getMessageBlocksFromChatHistory = (messagesLangChain) => {
        return messagesLangChain.map((msgObj, idx) => {
          if (idx % 2 === 0) {
            const imageObjs = msgObj?.response_metadata?.attachedImageObjects || [];
            const fileObjs  = msgObj?.response_metadata?.attachedFileObjects || [];
        
            const convertedImages = imageObjs.map((img) => {
                const file = base64ToFile(img.data, img.name);
                const blob = new Blob([file], { type: file.type });
                const url = URL.createObjectURL(blob);
                return {
                    file,
                    id: Math.random().toString(36).slice(2),
                    status: "mounted",
                    url
                };
            });
        
            const convertedFiles = fileObjs.map((f) => {
                const file = textToFile(f.data, f.name);
                return {
                    file,
                    id: Math.random().toString(36).slice(2),
                    status: "mounted"
                };
            });

            return (
              <UserMessageBlock
                key={idx}
                message={msgObj.content}
                images={convertedImages}
                files={convertedFiles}
                toggleOpenImagePreview={toggleOpenImagePreview}
                toggleOpenCSVFileModal={toggleOpenCSVFileModal}
                toggleOpenPyFileModal={toggleOpenPyFileModal}
                toggleOpenJsFileModal={toggleOpenJsFileModal}
                toggleOpenHtmlFileModal={toggleOpenHtmlFileModal}
                toggleOpenCssFileModal={toggleOpenCssFileModal}
              />
            );
          } else {
            return (
                // need to pass other response_metadata props also
              <AgentMessageBlock
                key={idx}
                ref={null}
                messageFromChatHistory={msgObj?.content}
                // enabledQueryEnhancer={msgObj?.response_metadata?.isQueryEnhancerEnabled || false}
                enabledRetrievalQualityEnhancer={msgObj?.response_metadata?.isRetrievalQualityEnhancerEnabled || false}
                decomposedQueriesFromChatHistory={msgObj?.response_metadata?.retrievalQualityEnhancements}
                rqeSubQueryStatusesFromChatHistory={msgObj?.response_metadata?.rqeSubQueryStatuses}
                toggleSmoothScrollToBottom={smoothScrollToBottom}
                isMobile={isMobile}
              />
            );
          }
        });
    };

    const convertFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                resolve({
                    name: file.name,
                    data: reader.result
                });
            };
            reader.onerror = error => reject(error);
        });
    };

    const readFileAsText = (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
          reader.readAsText(file);
        });
    };

    const bifurcateFigureAndTableLabels = (labelObjects) => {
        let figureLabels = [], tableLabels = [];
        labelObjects.forEach(lblObj => {
            const type = lblObj?.type?.trim().toLowerCase();
            const content = lblObj?.content;
            if (type && content) {
                if (["figure", "fig"].includes(type)) {
                    figureLabels.push(content);
                } else if (["table", "tbl", "tab"].includes(type)) {
                    tableLabels.push(content);
                }
            }
        });
        return [figureLabels, tableLabels];
    };

    const attachPaperImage = (file) => {
        if (!currentLLM) {
            toast.info("Please choose a model first");
            return;
        }

        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!validImageExtensions.includes(fileExtension)) {
            toast.warning(`Image type .${fileExtension} not supported`, {
                description: `Supported types: ${validImageExtensions.map(ext => "." + ext).join(", ")}`
            });
            return;
        }

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            toast.info(`Image "${file.name}" exceeds ${parseInt(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB and skipped`);
            return;
        }

        if (userImages.length >= MAX_IMAGES) {
            toast.warning(`Cannot attach more than ${MAX_IMAGES} images`);
            return;
        }

        const newImgObj = createImageObject(file);
        setUserImages(prev => [...prev, newImgObj]);
        setTimeout(() => {
            setUserImages(prev => {
              const updated = [...prev];
              const idx = updated.findIndex(i => i.id === newImgObj.id);
              if (idx !== -1 && updated[idx].status === "entering") {
                updated[idx] = { ...updated[idx], status: "mounted" };
              }
              return updated;
            });
        }, IMAGES_AND_FILES_ANIMATION_DURATION);
    };

    const attachPaperTable = (file) => {
        if (!currentLLM) {
            toast.info("Please choose a model first");
            return;
        }

        const ext = file.name.split('.').pop().toLowerCase();
        if (!validFileExtensions.includes(ext)) {
            toast.warning(`File type .${ext} is not supported`, {
              description: `Supported types: ${[...validImageExtensions, ...validFileExtensions].map(e => "." + e).join(", ")}`
            });
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.warning(`File "${file.name}" exceeds ${parseInt(MAX_FILE_SIZE_BYTES / 1024)}KB and skipped`);
            return;
        }

        if (userFiles.length >= MAX_FILES) {
            toast.warning(`Cannot attach more than ${MAX_FILES} files`);
            return;
        }

        const newFileObj = createFileObject(file);
        setUserFiles(prev => [...prev, newFileObj]);
        setTimeout(() => {
        setUserFiles(prev => {
            const arr = [...prev];
            const idx = arr.findIndex(f => f.id === newFileObj.id);
            if (idx !== -1 && arr[idx].status === "entering") {
            arr[idx] = { ...arr[idx], status: "mounted" };
            }
            return arr;
        });
        }, IMAGES_AND_FILES_ANIMATION_DURATION);
    };

    useImperativeHandle(ref, () => ({
        attachPaperImage,
        attachPaperTable,
        attachImageTemplateRef,
        attachFileTemplateRef
    }));

    const smoothScrollToBottom = () => {
        if (chatCentralTopContainerRef.current) {
            chatCentralTopContainerRef.current.scrollTo({
                top: chatCentralTopContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    };

    const updateChatCentralTopContainerPaddingRight = () => {
        if (chatCentralTopContainerRef.current) {
            const { scrollHeight, clientHeight } = chatCentralTopContainerRef.current;
            if (scrollHeight > clientHeight) {
                setChatCentralTopContainerPaddingRight("0px");
            } else {
                setChatCentralTopContainerPaddingRight("5px");
            }
        }
    };

    const recalcTextareaHeight = () => {
        const textarea = textAreaRef.current;
        if (!textarea) return;
    
        textarea.style.height = "auto";
    
        const maxHeight = lineHeightPx * MAX_LINES;
        const newHeight = Math.min(textarea.scrollHeight - 1, maxHeight);
    
        textarea.style.height = `${newHeight}px`;
    };

    // const handleQueryEnhancer = () => setQueryEnhancerActive(prev => !prev);

    const handleRetrievalQualityEnhancer = () => {
        if (isStreaming) return;
        setRetrievalQualityEnhancerActive(prev => !prev);
    };

    const handleCitationMode = () => {
        if (isStreaming) return;
        setCitationModeActive(prev => !prev);
    };

    const handleChatMenuExpanded = () => {
        if (chatMenuExpanded) return;
        setChatMenuExpanded(true);
        toggleChatMenuExpanded();
    };

    const handleChatMenuCompressed = () => {
        if (!chatMenuExpanded) return;
        setChatMenuExpanded(false);
        toggleChatMenuExpanded();
    };

    const handleToggleSwitch = () => {
        if (downloadingPdf || pdfDownloadError || fetchingVectorstore || errorFetchingVectorstore || fetchingParsedData) return;
        if (isStreaming) return;
        setFollowUpSuggestionsEnabled(prev => !prev);
    };

    const handleUserInputChange = (e) => {
        const input = e.target.value;
        if (input.length > MAX_QUERY_LENGTH) {
            toast.warning(`Maximum character limit of ${MAX_QUERY_LENGTH} reached.`);
            setUserInput(input.slice(0, MAX_QUERY_LENGTH));
        } else {
            setUserInput(input);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const clipboardData = e.clipboardData;
        const items = clipboardData.items;

        let foundImage = false;
        let pastedText = "";

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.type.startsWith("image/")) {
                if (!currentLLM) {
                    toast.info("Please choose a model first");
                    return;
                } else if (currentLLM === "Llama 3.1-8B" || currentLLM === "Llama 3.3-70B" || currentLLM === "Mixtral-8x7B" || currentLLM === "Claude 3.5 Haiku") {
                    toast.warning("Files not supported with current model", {
                        description: "Please use OpenAI, Anthropic (except Haiku) or Google models instead."
                    });
                    return;
                }

                const file = item.getAsFile();

                if (file) {
                    foundImage = true;

                    const fileExtension = file.name.split(".").pop().toLowerCase();
                    if (!validImageExtensions.includes(fileExtension)) {
                        toast.warning(`Image type .${fileExtension} not supported`, {
                            description: `Supported types: ${validImageExtensions.map(imgExt => `.${imgExt}`).join(", ").trim()}`
                        })
                        continue;
                    }

                    if (file.size > MAX_IMAGE_SIZE_BYTES) {
                        toast.info(`Image "${file.name}" exceeds ${parseInt(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB and skipped`);
                        continue;
                    }

                    if (userImages.length >= MAX_IMAGES) {
                        toast.warning(`Cannot attach more than ${MAX_IMAGES} images`);
                        continue;
                    }

                    const newImgObj = createImageObject(file);
                    setUserImages((prev) => [...prev, newImgObj]);

                    setTimeout(() => {
                        setUserImages((prev) => {
                            const updated = [...prev];
                            const idx = updated.findIndex((img) => img.id === newImgObj.id);
                            if (idx !== -1 && updated[idx].status === "entering") {
                                updated[idx] = { ...updated[idx], status: "mounted" };
                            }
                            return updated;
                        });
                    }, IMAGES_AND_FILES_ANIMATION_DURATION);
                }
            }

            if (item.type === "text/plain") {
                pastedText = clipboardData.getData("text");
            }
        }

        if (pastedText) {
            const combinedText = userInput + pastedText;
            if (combinedText.length > MAX_QUERY_LENGTH) {
                toast.warning(`Query exceeds ${parseInt(MAX_QUERY_LENGTH / 1000)}K charaters and truncated`);
                setUserInput(combinedText.slice(0, MAX_QUERY_LENGTH));
            } else {
                setUserInput(combinedText);
            }
        }

        if (!foundImage && !pastedText) {
            toast.warning("Invalid content. Paste either text or images.");
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleRemoveImage = (imageId, finalize = false) => {
        setUserImages(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(i => i.id === imageId);
          if (idx === -1) return updated;
          if (!finalize) {
            updated[idx] = { ...updated[idx], status: "exiting" };
          } else {
            updated.splice(idx, 1);
          }
          return updated;
        });
    };

    const handleRemoveFile = (fileId, finalize = false) => {
        setUserFiles(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(f => f.id === fileId);
          if (idx === -1) return updated;
          if (!finalize) {
            updated[idx] = { ...updated[idx], status: "exiting" };
          } else {
            updated.splice(idx, 1);
          }
          return updated;
        });
    };

    // const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // const toggleContinueFromQueryEnhancement = async (chosenEnhancement) => {
    //     // if (!interruptedForQueryEnhancement) // need to throw an error

    //     // if turnNumAtInterrupt === null -> show error message in the frontend
    //     // localStorage.setItem(`ResearchPaL_SESSION_turnNum_${sessionId}`, String(chatMessagesLangChain.length + 1));

    //     if (retrievalQualityEnhancerActive) {
    //         await pause(1000);
    //     } else if (queryEnhancerActive) {
    //         await pause(700);

    //     }

    //     incomingPreUpdatesRef.current = [];

    //     setIsStreaming(true);
    //     setPreUpdateIntervalRunning(true);
    //     setInterruptedForQueryEnhancement(false);
    //     try {
    //         let finalMessages = null;
    //         let stopCollecting = false;

    //         console.log("toggleContinueFromQueryEnhancement turnNumAtInterrupt:", turnNumAtInterruptRef.current);
    //         const stream = await continueFromQueryEnhancement(sessionId, turnNumAtInterruptRef.current, chosenEnhancement, vectorstore);
    //         for await (const chunk of stream) {
    //             console.log("chunk 2:", chunk);
    //             if (!chunk) continue;
    //             if (chunk[1] === 'updates' && chunk[2]?.generateResponse && chunk[2].generateResponse?.messages?.length === 2) {
    //                 finalMessages = chunk[2].generateResponse.messages;
    //                 continue;
    //             } else if (chunk[1] !== 'messages') {
    //                 if (retrievalQualityEnhancerActive) incomingPreUpdatesRef.current.push(chunk[2]);
    //                 continue;
    //             }

    //             if (chunk[2][0].response_metadata?.fromHuman) stopCollecting = true;

    //             if (stopCollecting) continue;

    //             const lastArray = chunk[2];
    //             if (!Array.isArray(lastArray) || lastArray.length < 2) continue;

    //             const aiMsg = lastArray[0];
    //             const meta = lastArray[1];
    //             if (meta?.langgraph_node !== 'generateResponse') continue;

    //             const partialContent = aiMsg.content || "";
    //             if (!partialContent) continue;

    //             accumulatedTextRef.current += partialContent;
    //             incomingBufferRef.current += partialContent;
    //         }

    //         if (finalMessages && finalMessages.length > 0) {
    //             setChatMessagesLangChain(prev => {
    //                 const updatedMessages = [...prev, ...finalMessages];
    //                 const serializedMessages = mapChatMessagesToStoredMessages(updatedMessages);
    //                 saveChatHistoryToIndexedDB(sessionId, turnNumAtInterruptRef.current, JSON.stringify(serializedMessages));
    //                 return updatedMessages;
    //             });
    //         }
    //     } catch (error) {
    //         setChatMessageBlocks(prev => {
    //             let updatedBlocks = [...prev];
    //             updatedBlocks = updatedBlocks.slice(0, -2);
    //             return updatedBlocks;
    //         });
            
    //         console.error("Error occurred while invoking graph:", error);
    //         toast.error(`Error occurred while invoking graph: ${error}`);
    //     } finally {
    //         setIsStreaming(false);
    //     }
    //     localStorage.setItem(`ResearchPaL_SESSION_turnNum_${sessionId}`, String(turnNumAtInterruptRef.current + 1));
    // };

    const handleStopGeneration = () => setInterruptedGeneration(true);

    const handleSend = async (followUpQuestion = null) => {
        if (fetchingFromIndexedDB || isStreaming || incomingBufferRef.current.length > 0) return;

        if (downloadingPdf || pdfDownloadError || fetchingVectorstore || errorFetchingVectorstore || fetchingParsedData) return;

        if (!currentLLM) {
            toast.info("Choose a model first");
            return;
        }

        const trimmedUserInput = userInput.trim();
        if (!followUpQuestion && !trimmedUserInput) {
            toast.info("Text query is necessary");
            return;
        }

        if (!sessionId || !providerName || !providerApiKey || !vectorstore || !paperDetails || !embeddingApiKey ||
            !parseMode || (parseMode === "Advanced" && !advancedParsedPaperData)) {
            toast.error("Unable to ask ResearchPaL");
            return;
        }

        latestAgentMessageBlockRef.current = null;
        const newAgentMessageBlockRef = React.createRef();

        const newMessageBlocks = [
            <UserMessageBlock
                key={chatMessageBlocks.length}
                message={followUpQuestion ? followUpQuestion : trimmedUserInput}
                images={userImages}
                files={userFiles}
                toggleOpenImagePreview={toggleOpenImagePreview}
                toggleOpenCSVFileModal={toggleOpenCSVFileModal}
                toggleOpenPyFileModal={toggleOpenPyFileModal}
                toggleOpenJsFileModal={toggleOpenJsFileModal}
                toggleOpenHtmlFileModal={toggleOpenHtmlFileModal}
                toggleOpenCssFileModal={toggleOpenCssFileModal}
            />,
            <AgentMessageBlock
                key={chatMessageBlocks.length + 1}
                ref={newAgentMessageBlockRef}
                // enabledQueryEnhancer={queryEnhancerActive}
                enabledRetrievalQualityEnhancer={retrievalQualityEnhancerActive}
                toggleSmoothScrollToBottom={smoothScrollToBottom}
                isMobile={isMobile}
                // toggleContinueFromQueryEnhancement={toggleContinueFromQueryEnhancement}
            />
        ];
        setChatMessageBlocks(prev => [...prev, ...newMessageBlocks]);

        setUserInput("");
        setTextAreaRows(1);
        if (userImages.length > 0) {
            setUserImages([]);
        }
        if (userFiles.length > 0) {
            setUserFiles([]);
        }

        setTimeout(() => {
            smoothScrollToBottom();
        }, 200);

        setTimeout(() => {
            if (newAgentMessageBlockRef.current) {
              latestAgentMessageBlockRef.current = newAgentMessageBlockRef.current;
            }
        }, 0);

        accumulatedTextRef.current = "";
        incomingPreUpdatesRef.current = [];
        incomingPostUpdatesRef.current = [];
        interruptedStreamingRef.current = false;

        const turnNum = parseInt(localStorage.getItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_turnNum_${sessionId}`));
        try {
            const paperDetailsToGraph = {
                title: paperDetails?.paper?.title,
                datePublished: paperDetails?.paper?.published,
                authors: paperDetails?.paper?.authors || [],
                codeURL: paperDetails?.repository?.url,
                codeFramework: paperDetails?.repository?.framework,
                githubStars: paperDetails?.repository?.stars
            };

            let attachedImageObjects = [], attachedFileObjects = [];
            for (const imgObj of userImages) {
                try {
                    const res = await convertFileToBase64(imgObj.file);
                    if (res.data.startsWith("data:image/") && res.data.includes("base64,")) {
                        attachedImageObjects.push({
                            name: res.name,
                            data: res.data
                        });
                    } else {
                        console.warn(`Invalid base64 string for file: ${imgObj.file.name}`);
                    }
                } catch (error) {
                    console.error(`Failed to convert file ${imgObj.file.name} to base64:`, error);
                }
            }
            for (const fileObj of userFiles) {
                try {
                const textData = await readFileAsText(fileObj.file);
                attachedFileObjects.push({
                    name: fileObj.file.name,
                    data: textData
                });
                } catch (error) {
                console.error(`Failed to read file ${fileObj.file.name} as text:`, error);
                }
            }

            const stream = await streamGraph(
                turnNum,
                chatMessagesLangChain,
                sessionId,
                providerName,
                providerApiKey,
                currentLLM,
                paperDetailsToGraph,
                followUpQuestion ? followUpQuestion : trimmedUserInput,
                attachedImageObjects,
                attachedFileObjects,
                processedPaperData.images,
                processedPaperData.tables,
                processedPaperData.imageLabels,
                processedPaperData.tableLabels,
                embeddingApiKey,
                // queryEnhancerActive,
                retrievalQualityEnhancerActive,
                followUpSuggestionsEnabled,
                vectorstore,
                providerName === "Groq" ? true : false,
                citationModeActive,
                parseMode
            );

            let finalMessages = null;
            let stopCollecting = false;

            setInterruptedGeneration(false);
            setIsStreaming(true);
            setPreUpdateIntervalRunning(true);
            setFollowUpSuggestions(null);
            setFinishedGenerating(false);
            incomingBufferRef.current = "";
            for await (const chunk of stream) {
                if (interruptedStreamingRef.current) break;

                if (!chunk) continue;
                else if (chunk[1] === 'updates' && chunk[2]?.generateResponse && chunk[2].generateResponse?.messages?.length === 2) {
                    finalMessages = chunk[2].generateResponse.messages;
                    continue;
                } else if (chunk[1] !== 'messages') {
                    // removed queryEnhancerActive
                    incomingPreUpdatesRef.current.push(chunk[2]);
                    incomingPostUpdatesRef.current.push(chunk[2]);
                    continue;
                }

                // else if (chunk[1] === 'updates' && chunk[2]?.__interrupt__) {
                //     // if previous chunk is not getQueryEnhancements -> need to throw an error or inappropriate message
                //     setInterruptedForQueryEnhancement(true);
                //     setTurnNumAtInterrupt(prev => turnNum);
                //     setIsStreaming(false);
                //     console.log("handleSend turnNum:", turnNum);
                //     return;
                // }

                if (chunk[2][0].response_metadata?.fromHuman) stopCollecting = true;

                if (stopCollecting) continue;

                const lastArray = chunk[2];
                if (!Array.isArray(lastArray) || lastArray.length < 2) continue;

                const aiMsg = lastArray[0];
                const meta = lastArray[1];
                if (meta?.langgraph_node !== 'generateResponse') continue;

                const partialContent = aiMsg.content || "";
                if (!partialContent) continue;

                accumulatedTextRef.current += partialContent;
                incomingBufferRef.current += partialContent;
            }

            // if (incomingPreUpdatesRef.current.at(-1)?.__interrupt__) {
            //     console.log("Interrupted for Query Enhancement.");
            //     setInterruptedForQueryEnhancement(true);
            //     setTurnNumAtInterrupt(turnNum);
            //     setIsStreaming(false);
            //     return;
            // }

            // need to also handle inappropriate detection, rate limit and invalid API key errors

            if (finalMessages && finalMessages.length > 0) {
                setChatMessagesLangChain(prev => {
                    const updatedMessages = [...prev, ...finalMessages];
                    const serializedMessages = mapChatMessagesToStoredMessages(updatedMessages);
                    saveChatHistoryToIndexedDB(sessionId, turnNum, JSON.stringify(serializedMessages));
                    return updatedMessages;
                });
            }
        } catch (error) {
            setChatMessageBlocks(prev => {
                let updatedBlocks = [...prev];
                updatedBlocks = updatedBlocks.slice(0, -2);
                return updatedBlocks;
            });
            
            console.error("Error occurred while invoking graph:", error);
            toast.error(`Error occurred while invoking graph: ${error}`);
        } finally {
            setIsStreaming(false);
        }
        localStorage.setItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_turnNum_${sessionId}`, String(turnNum + 1));
    };

    const toggleUserFilesEnter = (index) => {
        setUserFilesHoveringList((prevState) => {
            const newState = [...prevState];
            newState[index] = true;
            return newState;
        });
    };
    
    const toggleUserFilesLeave = (index) => {
        setUserFilesHoveringList((prevState) => {
            const newState = [...prevState];
            newState[index] = false;
            return newState;
        });
    };

    const toggleUserInput = (input) => setUserInput(input);

    const handleAttachClick = () => {
        if (downloadingPdf || pdfDownloadError || fetchingVectorstore || errorFetchingVectorstore || fetchingParsedData) return;

        if (!currentLLM) {
            toast.info("Please choose a model first");
            return;
        } else if (currentLLM === "Llama 3.1-8B" || currentLLM === "Llama 3.3-70B" || currentLLM === "Mixtral-8x7B" || currentLLM === "Claude 3.5 Haiku") {
            toast.warning("Files not supported with current model", {
                description: "Please use OpenAI, Anthropic (except Haiku) or Google models instead."
            });
            return;
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleFileInputChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        let numImages = 0, numFiles = 0;
        files.forEach(file => {
            if (numImages === -1 || numFiles === -1) return;

            const ext = file.name.split('.').pop().toLowerCase();

            if (validImageExtensions.includes(ext)) {
                if (file.size > MAX_IMAGE_SIZE_BYTES) {
                    toast.info(`Image "${file.name}" exceeds ${parseInt(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB and skipped`);
                    return;
                }

                if (userImages.length >= MAX_IMAGES || numImages >= MAX_IMAGES) {
                    toast.warning(`Cannot attach more than ${MAX_IMAGES} images`);
                    numImages = -1;
                    return;
                }

                const newImgObj = createImageObject(file);
                setUserImages(prev => [...prev, newImgObj]);

                setTimeout(() => {
                    setUserImages(p => {
                      const arr = [...p];
                      const idx = arr.findIndex(i => i.id === newImgObj.id);
                      if (idx !== -1 && arr[idx].status === "entering") {
                        arr[idx] = { ...arr[idx], status: "mounted" };
                      }
                      return arr;
                    });
                }, IMAGES_AND_FILES_ANIMATION_DURATION);

                numImages += 1;
            } else if (validFileExtensions.includes(ext)) {
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    toast.warning(`File "${file.name}" exceeds ${parseInt(MAX_FILE_SIZE_BYTES / 1024)}KB and skipped`);
                    return;
                }

                if (userFiles.length >= MAX_FILES || numFiles >= MAX_FILES) {
                    toast.warning(`Cannot attach more than ${MAX_FILES} files`);
                    numFiles = -1;
                    return;
                }

                const newFileObj = createFileObject(file);
                setUserFiles(prev => [...prev, newFileObj]);

                setTimeout(() => {
                    setUserFiles(p => {
                      const arr = [...p];
                      const idx = arr.findIndex(f => f.id === newFileObj.id);
                      if (idx !== -1 && arr[idx].status === "entering") {
                        arr[idx] = { ...arr[idx], status: "mounted" };
                      }
                      return arr;
                    });
                }, IMAGES_AND_FILES_ANIMATION_DURATION);

                numFiles += 1
            } else {
                toast.warning(`Image/File type .${ext} is not supported`, {
                    description: `Supported types: ${[...validImageExtensions, ...validFileExtensions].map(ext => `.${ext}`).join(", ").trim()}`
                });
            }
        });
    };

    // useEffect(() => {
    //     turnNumAtInterruptRef.current = turnNumAtInterrupt;
    //     console.log("useEffect turnNumAtInterrupt:", turnNumAtInterruptRef.current);
    //   }, [turnNumAtInterrupt]);

    useEffect(() => {
        if (interruptedGeneration) interruptedStreamingRef.current = true;
    }, [interruptedGeneration]);

    useEffect(() => {
        if (interruptedGeneration && latestAgentMessageBlockRef.current) {
            latestAgentMessageBlockRef.current.setGeneratingResponse(false);
            latestAgentMessageBlockRef.current.setShowSkeletons(false);
            latestAgentMessageBlockRef.current.stopRetrievalQualityEnhancer();
        }
    }, [interruptedGeneration, latestAgentMessageBlockRef.current, retrievalQualityEnhancerActive]);

    // removed queryEnhancerActive from dependency variable
    useEffect(() => {
        if (interruptedGeneration) {
            if (incomingPreUpdatesRef.current.length === 0) return;

            const intervalId = setInterval(() => {
                if (!isStreaming) {
                    if (incomingPreUpdatesRef.current.length > 0) {
                        const currUpdate = incomingPreUpdatesRef.current.shift();

                        if (retrievalQualityEnhancerActive && currUpdate?.performRetrievalQualityEnhancement) {
                            if (
                                !currUpdate.performRetrievalQualityEnhancement?.retrievalQualityEnhancements
                                || currUpdate.performRetrievalQualityEnhancement.retrievalQualityEnhancements.length === 0
                            ) {
                                latestAgentMessageBlockRef.current.stopRetrievalQualityEnhancer();
                                latestAgentMessageBlockRef.current.setShowRetrievalQualityEnhancerBlock(false);
                                toast.info("ResearchPaL could not perform RQE process");
                                setPreUpdateIntervalRunning(false);
                                return;
                            }
                            latestAgentMessageBlockRef.current.setDecomposedQueries(currUpdate.performRetrievalQualityEnhancement.retrievalQualityEnhancements);
                        } else if (retrievalQualityEnhancerActive && currUpdate?.retrieveFromVectorstore) {
                            if (
                                currUpdate.retrieveFromVectorstore?.rqeSubQueryStatuses
                                && currUpdate.retrieveFromVectorstore.rqeSubQueryStatuses.length > 0
                            ) {
                                currUpdate.retrieveFromVectorstore.rqeSubQueryStatuses.forEach(stsObj => latestAgentMessageBlockRef.current.updateRQEStatus(stsObj));
                            }
                        }
                    }
        
                    if (incomingPreUpdatesRef.current.length === 0) {
                        setPreUpdateIntervalRunning(false);
                        clearInterval(intervalId);
                    }
                } else {
                    incomingPreUpdatesRef.current = [];
                    setPreUpdateIntervalRunning(false);
                    setIsStreaming(false);
                    clearInterval(intervalId);
                }
            }, 0);

            return () => clearInterval(intervalId);
        } else {
            const intervalId = setInterval(() => {
                // removed !queryEnhancerActive
                if (!latestAgentMessageBlockRef.current || finishedGenerating) {
                    setPreUpdateIntervalRunning(false);
                    clearInterval(intervalId);
                    return;
                }

                if (!retrievalQualityEnhancerActive) setPreUpdateIntervalRunning(false);
    
                if (incomingPreUpdatesRef.current.length > 0) {
                    const currUpdate = incomingPreUpdatesRef.current.shift();
    
                    // if (queryEnhancerActive && currUpdate?.getQueryEnhancements) {
                    //     if (!currUpdate.getQueryEnhancements?.queryEnhancements || currUpdate.getQueryEnhancements.queryEnhancements.length === 0) {
                    //         latestAgentMessageBlockRef.current.stopQueryEnhancer();
                    //         latestAgentMessageBlockRef.current.setShowQueryEnhancerBlock(false);
                    //         toast.info("ResearchPaL could not perform QE process");
                    //         if (!retrievalQualityEnhancerActive) {
                    //             latestAgentMessageBlockRef.current.setGeneratingResponse(true);
                    //             setTimeout(() => latestAgentMessageBlockRef.current.setShowSkeletons(true), 50);
                    //             setPreUpdateIntervalRunning(false);
                    //         }
                    //         return;
                    //     }
                    //     latestAgentMessageBlockRef.current.setEnhancedQueries(
                    //         [
                    //             ...currUpdate.getQueryEnhancements.queryEnhancements.map(query => ({ query: query, selected: false })),
                    //             { query: "continue with your query", selected: false }
                    //         ]
                    //     );
                    // } else if (queryEnhancerActive && !retrievalQualityEnhancerActive && currUpdate?.userSelectQueryEnhancement) {
                    //     console.log("why?");
                    //     latestAgentMessageBlockRef.current.setGeneratingResponse(true);
                    //     setTimeout(() => latestAgentMessageBlockRef.current.setShowSkeletons(true), 250);
                    //     setPreUpdateIntervalRunning(false);
                    // }

                    if (currUpdate?.__interrupt__ && currUpdate.__interrupt__[0].value) {
                        if (currUpdate.__interrupt__[0].value === "One or more of the user images are inappropriate.") {
                            latestAgentMessageBlockRef.current.setIsInappropriate(true);
                            latestAgentMessageBlockRef.current.setGeneratingResponse(false);
                            latestAgentMessageBlockRef.current.setShowSkeletons(false);
                        } else if (currUpdate.__interrupt__[0].value === "Invalid API key.") {
                            latestAgentMessageBlockRef.current.setGeneratingResponse(false);
                            latestAgentMessageBlockRef.current.setShowSkeletons(false);
                            toast.error(`Invalid ${providerName} API key`);
                            setChatMessageBlocks(prev => {
                                let updated = [...prev].slice(0, -2);
                                return updated;
                            });
                        } else if (currUpdate.__interrupt__[0].value === "API rate limit reached.") {
                            latestAgentMessageBlockRef.current.setGeneratingResponse(false);
                            latestAgentMessageBlockRef.current.setShowSkeletons(false);
                            toast.error(`Rate limits reached for ${providerName}`, {
                                description: `Use your own ${providerName} API key if using free version.`
                            });
                            setChatMessageBlocks(prev => {
                                let updated = [...prev].slice(0, -2);
                                return updated;
                            });
                        } else {
                            latestAgentMessageBlockRef.current.setGeneratingResponse(false);
                            latestAgentMessageBlockRef.current.setShowSkeletons(false);
                            toast.error("Some unexpected error occurred");
                            setChatMessageBlocks(prev => {
                                let updated = [...prev].slice(0, -2);
                                return updated;
                            });
                        }
                    } else if (retrievalQualityEnhancerActive && currUpdate?.performRetrievalQualityEnhancement) {
                        if (
                            !currUpdate.performRetrievalQualityEnhancement?.retrievalQualityEnhancements
                            || currUpdate.performRetrievalQualityEnhancement.retrievalQualityEnhancements.length === 0
                        ) {
                            latestAgentMessageBlockRef.current.stopRetrievalQualityEnhancer();
                            latestAgentMessageBlockRef.current.setShowRetrievalQualityEnhancerBlock(false);
                            toast.info("ResearchPaL could not perform RQE process");
                            latestAgentMessageBlockRef.current.setGeneratingResponse(true);
                            setTimeout(() => latestAgentMessageBlockRef.current.setShowSkeletons(true), 50);
                            setPreUpdateIntervalRunning(false);
                            return;
                        }
                        latestAgentMessageBlockRef.current.setDecomposedQueries(currUpdate.performRetrievalQualityEnhancement.retrievalQualityEnhancements);
                    } else if (retrievalQualityEnhancerActive && currUpdate?.retrieveFromVectorstore) {
                        if (
                            currUpdate.retrieveFromVectorstore?.rqeSubQueryStatuses
                            && currUpdate.retrieveFromVectorstore.rqeSubQueryStatuses.length > 0
                        ) {
                            currUpdate.retrieveFromVectorstore.rqeSubQueryStatuses.forEach(stsObj => latestAgentMessageBlockRef.current.updateRQEStatus(stsObj));
                        }
                    } else if (currUpdate?.performRagFusion) {
                        if (retrievalQualityEnhancerActive) {
                            latestAgentMessageBlockRef.current.stopRetrievalQualityEnhancer();
                            latestAgentMessageBlockRef.current.setGeneratingResponse(true);
                            setTimeout(() => latestAgentMessageBlockRef.current.setShowSkeletons(true), 250);
                            setPreUpdateIntervalRunning(false);
                        }
                    }
                }
    
                if (!isStreaming && incomingPreUpdatesRef.current.length === 0) {
                    setPreUpdateIntervalRunning(false);
                    clearInterval(intervalId);
                }
            }, UPDATE_REVEAL_FREQUENCY);

            return () => clearInterval(intervalId);
        }
    }, [isStreaming, retrievalQualityEnhancerActive, interruptedGeneration, finishedGenerating]);

    useEffect(() => {
        if (interruptedGeneration) {
            if (incomingPostUpdatesRef.current.length === 0) return;

            if (!isStreaming) {
                const intervalId = setInterval(() => {
                    if (!followUpSuggestionsEnabled || (followUpSuggestions && followUpSuggestions.length > 0)) {
                        incomingPostUpdatesRef.current = [];
                        clearInterval(intervalId);
                        return;
                    }
                    if (incomingPostUpdatesRef.current.length > 0) {
                        const currUpdate = incomingPostUpdatesRef.current.shift();
                        if (currUpdate?.generateFollowUpSuggestions) {
                            if (!currUpdate.generateFollowUpSuggestions?.followUpSuggestions || currUpdate.generateFollowUpSuggestions.followUpSuggestions.length === 0) {
                                clearInterval(intervalId);
                                return;
                            }
                            setFollowUpSuggestions(currUpdate.generateFollowUpSuggestions.followUpSuggestions);
                            clearInterval(intervalId);
                            return;
                        }
                    }
                    if (incomingPostUpdatesRef.current.length === 0) clearInterval(intervalId);
                }, 0);

                return () => clearInterval(intervalId);
            } else {
                incomingPostUpdatesRef.current = [];
            }
        } else {
            const intervalId = setInterval(() => {
                if (!followUpSuggestionsEnabled || (followUpSuggestions && followUpSuggestions.length > 0)) {
                    incomingPostUpdatesRef.current = [];
                    clearInterval(intervalId);
                    return;
                }
    
                if (incomingPostUpdatesRef.current.length > 0) {
                    const currUpdate = incomingPostUpdatesRef.current.shift();
    
                    if (currUpdate?.generateFollowUpSuggestions) {
                        if (!currUpdate.generateFollowUpSuggestions?.followUpSuggestions || currUpdate.generateFollowUpSuggestions.followUpSuggestions.length === 0) {
                            toast.info("ResearchPaL failed to generate follow-ups");
                            clearInterval(intervalId);
                            return;
                        }
                        setFollowUpSuggestions(currUpdate.generateFollowUpSuggestions.followUpSuggestions);
                        clearInterval(intervalId);
                        return;
                    }
                }
    
                if (!isStreaming && incomingPostUpdatesRef.current.length === 0) clearInterval(intervalId);
            }, UPDATE_REVEAL_FREQUENCY);

            return () => clearInterval(intervalId);
        }
    }, [isStreaming, followUpSuggestionsEnabled, followUpSuggestions, interruptedGeneration]);

    useEffect(() => {
        if (interruptedGeneration) {
            if (incomingBufferRef.current.length === 0) return;

            if (!isStreaming) {
                const intervalId = setInterval(() => {
                    if (!latestAgentMessageBlockRef.current) {
                        clearInterval(intervalId);
                        return;
                    }

                    if (incomingBufferRef.current.length >= RESPONSE_REVEAL_SIZE) {
                        const piece = incomingBufferRef.current.slice(0, RESPONSE_REVEAL_SIZE);
                        incomingBufferRef.current = incomingBufferRef.current.slice(RESPONSE_REVEAL_SIZE);
                        latestAgentMessageBlockRef.current.pushStreamChunk(piece);
                    } else if (!isStreaming && incomingBufferRef.current.length > 0) {
                        const leftover = incomingBufferRef.current;
                        incomingBufferRef.current = "";
                        latestAgentMessageBlockRef.current.pushStreamChunk(leftover);
                    } else if (!isStreaming && incomingBufferRef.current.length === 0) {
                        latestAgentMessageBlockRef.current.finalizeResponse(accumulatedTextRef.current);
                        clearInterval(intervalId);
                    }
                }, 0);

                return () => clearInterval(intervalId);
            } else {
                incomingBufferRef.current = "";
            }
        } else {
            const intervalId = setInterval(() => {
                // removed interruptedForQueryEnhancement from here and also as dependency variable
                if (!latestAgentMessageBlockRef.current || preUpdateIntervalRunning) {
                    clearInterval(intervalId);
                    return;
                }
    
                if (incomingBufferRef.current.length >= RESPONSE_REVEAL_SIZE) {
                    const piece = incomingBufferRef.current.slice(0, RESPONSE_REVEAL_SIZE);
                    incomingBufferRef.current = incomingBufferRef.current.slice(RESPONSE_REVEAL_SIZE);
                    latestAgentMessageBlockRef.current.pushStreamChunk(piece);
                } else if (!isStreaming && incomingBufferRef.current.length > 0) {
                    const leftover = incomingBufferRef.current;
                    incomingBufferRef.current = "";
                    latestAgentMessageBlockRef.current.pushStreamChunk(leftover);
                } else if (!isStreaming && incomingBufferRef.current.length === 0) {
                    latestAgentMessageBlockRef.current.finalizeResponse(accumulatedTextRef.current);
                    clearInterval(intervalId);
                }
            }, RESPONSE_REVEAL_FREQUENCY);

            return () => clearInterval(intervalId);
        }
    }, [isStreaming, preUpdateIntervalRunning, interruptedGeneration]);

    useEffect(() => {
        if (interruptedGeneration) {
            if (finishedGenerating) {
                return;
            }
            setFinishedGenerating(true);
        } else {
            const intervalId = setInterval(() => {
                if (finishedGenerating) {
                    clearInterval(intervalId);
                    return;
                }
    
                if (!isStreaming && incomingPreUpdatesRef.current.length === 0 && incomingPostUpdatesRef.current.length === 0 && incomingBufferRef.current.length === 0) {
                    // setTimeout(() => {
                    //     if (!hoveringOnChatCentralTopContainer && !isMobile && !isTablet) smoothScrollToBottom();
                    // }, 350);
                    setFinishedGenerating(true);
                    clearInterval(intervalId);
                    return;
                }
            }, UPDATE_REVEAL_FREQUENCY);

            return () => clearInterval(intervalId);
        }
    }, [isStreaming, hoveringOnChatCentralTopContainer, finishedGenerating, interruptedGeneration]);

    // useEffect(() => {
    //     if (interruptedGeneration && !isStreaming && !isMobile && !isTablet) setTimeout(() => smoothScrollToBottom(), 500);
    // }, [isStreaming, interruptedGeneration]);

    useEffect(() => {
        if (!sessionId) return;
        const turnNum = localStorage.getItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_turnNum_${sessionId}`);
        if (!turnNum) {
            localStorage.setItem(`ResearchPaL_iXOeFfNg0NX5grQWr-4tsOjMk5vYxR079JdYtENc4WCworXtwtJO-NnzsOWvnmpzK9PS1r3n8H0DrtnesOBDeA==_SESSION_turnNum_${sessionId}`, String(0));
        }
    }, [sessionId]);

    useEffect(() => {
        fetchChatHistoryFromIndexedDB();
    }, [parseMode]);

    useEffect(() => {
        if (!sessionId || chatMessagesLangChain.length > 0) return;

        fetchChatHistoryFromIndexedDB();
    }, [sessionId, chatMessagesLangChain]);

    useEffect(() => {
        if (!advancedParsedPaperData || parseMode === "Default") {
            setProcessedPaperData({
                images: [],
                tables: [],
                imageLabels: [],
                tableLabels: []
            });
            return;
        };

        let figObjs = [], tblObjs = [];

        advancedParsedPaperData.images.forEach(figObj => {
            let newFigObj = { ...figObj };
            newFigObj.data = 'data:image/png;base64,' + figObj.data;
            figObjs.push(newFigObj);
        });

        advancedParsedPaperData.tables.forEach(tblObj => {
            tblObjs.push(tblObj);
        });

        const tuple = bifurcateFigureAndTableLabels(advancedParsedPaperData.labels);
        const figureLabels = tuple[0];
        const tableLabels = tuple[1];

        setProcessedPaperData({
            images: figObjs,
            tables: tblObjs,
            imageLabels: figureLabels,
            tableLabels: tableLabels
        });
    }, [advancedParsedPaperData, parseMode]);

    useEffect(() => {
        if (currentLLM === 'Llama 3.1-8B' || currentLLM === 'Llama 3.3-70B' || currentLLM === 'Mixtral-8x7B') {
            if (userImages.length > 0 || userFiles.length > 0) {
                toast.warning("Files not supported with current model", {
                    description: "Please use OpenAI, Anthropic (except Haiku) or Google models instead."
                });
                setUserImages([]);
                setUserFiles([]);
            }
        }
    }, [currentLLM]);

    useEffect(() => {
        recalcTextareaHeight();
      }, [userInput, chatWidth]);

    useEffect(() => {
        updateChatCentralTopContainerPaddingRight();

        const observer = new ResizeObserver(updateChatCentralTopContainerPaddingRight);
        if (chatCentralTopContainerRef.current) {
            observer.observe(chatCentralTopContainerRef.current);
        }

        return () => {
            if (chatCentralTopContainerRef.current) {
                observer.unobserve(chatCentralTopContainerRef.current);
            }
        };
    }, [chatMessageBlocks]);

    useEffect(() => {
        if (spanRef.current) {
            spanRef.current.classList.remove("animate");
            void spanRef.current.offsetWidth;
            spanRef.current.classList.add("animate");
        }

        setAnimatedLLM(currentLLM);
    }, [currentLLM]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            const chatMenu = chatMenuRef.current;
            const chatLLMOptions = chatLLMOptionsRef.current;
            const chatLLMOptionsExtension = chatLLMOptionsExtensionRef.current;
            const chatParseOptions = chatParseOptionsRef.current;

            if (
                chatMenu && !chatMenu.contains(e.target) &&
                (!chatLLMOptions || (chatLLMOptions && !chatLLMOptions.contains(e.target))) &&
                (!chatLLMOptionsExtension || (chatLLMOptionsExtension && !chatLLMOptionsExtension.contains(e.target))) &&
                (!chatParseOptions || (chatParseOptions && !chatParseOptions.contains(e.target)))
            ) {
                setChatMenuExpanded(false);
                toggleChatMenuExpanded();
            }
        };

        if (chatMenuExpanded) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [chatMenuExpanded]);

    useEffect(() => {
        const container = chatCentralTopContainerRef.current;
        if (!container) return;
    
        const handleScroll = () => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
          if (distanceFromBottom > SCROLL_BUTTON_THRESHOLD) {
            setShowScrollToBottomButton(true);
          } else {
            setShowScrollToBottomButton(false);
          }
        };
    
        container.addEventListener('scroll', handleScroll);
        handleScroll();
    
        return () => {
          container.removeEventListener('scroll', handleScroll);
        };
    }, [chatCentralTopContainerRef, chatCentralTopContainerRef?.current]);

    return (
        <div
            className="chat-main-container"
            style={{
                height: isMobile ? `calc(100dvh - ${pdfContainerHeight}px - 11px)` : '100dvh',
            }}
        >
            <div className="chat-central-container">
                {
                    downloadingPdf ? (
                        <div className="vectorstore-loading-screen">
                            <div className="vectorstore-loading-top-filler"></div>
                            <div className="vectorstore-loading-contents">
                                <div className="vectorstore-loading-text">
                                    <span>ResearchPaL is waiting for PDF file</span>
                                    <div className="vectorstore-loading-dotpulse"><l-dot-pulse size="11" speed="1.3" color="#f7f7f7"></l-dot-pulse></div>
                                </div>
                            </div>
                            <div className="vectorstore-loading-bottom-filler"></div>
                        </div>
                    ) : fetchingParsedData ? (
                        <div className="vectorstore-loading-screen">
                            <div className="vectorstore-loading-top-filler"></div>
                            <div className="vectorstore-loading-contents">
                                <l-ring-2 size="17" speed="0.7" stroke="2.5" color="#f7f7f7"></l-ring-2>
                                <div className="vectorstore-loading-text">
                                    <span>Applying Advanced Parsing to PDF</span>
                                    <div className="vectorstore-loading-dotpulse"><l-dot-pulse size="11" speed="1.3" color="#f7f7f7"></l-dot-pulse></div>
                                </div>
                                <div className="vectorstore-loading-subtext">
                                    <span>Can take upto 5 minutes. Thank you for your patience.</span>
                                </div>
                            </div>
                            <div className="vectorstore-loading-bottom-filler"></div>
                        </div>
                    ) : fetchingVectorstore ? (
                        <div className="vectorstore-loading-screen">
                            <div className="vectorstore-loading-top-filler"></div>
                            <div className="vectorstore-loading-contents">
                                <l-ring-2 size="17" speed="0.4" stroke="2.5" color="#f7f7f7"></l-ring-2>
                                <div className="vectorstore-loading-text">
                                    <span>Getting ResearchPaL ready</span>
                                    <div className="vectorstore-loading-dotpulse"><l-dot-pulse size="11" speed="1.3" color="#f7f7f7"></l-dot-pulse></div>
                                </div>
                            </div>
                            <div className="vectorstore-loading-bottom-filler"></div>
                        </div>
                    ) : pdfDownloadError || errorFetchingVectorstore ? (
                        <div className="vectorstore-error-container">
                            <div className="vectorstore-loading-top-filler"></div>
                            <div className="vectorstore-error-contents">
                                <img src={SadRobotIcon} alt=" icon" />
                                <span>Failed to get ResearchPaL ready.</span>
                                <div className="vectorstore-error-possible-reasons-container">
                                    <span>Possible reasons could be:</span>
                                    <div className="vectorstore-error-possible-reasons">
                                        <span>Invalid Google API key. Ensure you are using valid one.</span>
                                        <span>Free API rate limit reached. Use personal <a style={{color: 'white'}} href="https://ai.google.dev/pricing#1_5flash" target="_blank" rel="noopener noreferrer">api key</a> instead.</span>
                                        <span>Free Advanced Parsing limit reached. Use your <a style={{color: 'white'}} href="https://developer.adobe.com/document-services/pricing/main/" target="_blank" rel="noopener noreferrer">keys</a> instead.</span>
                                        <span>Invalid Adobe credentials incase of Advanced Parsing.</span>
                                        <span>Slow or unstable internet connection.</span>
                                        <span>Failed to download PDF file.</span>
                                    </div>
                                </div>
                            </div>
                            <div className="vectorstore-loading-bottom-filler"></div>
                        </div>
                    ) : isVectorstoreReady ? (
                        <div
                            ref={chatCentralTopContainerRef}
                            className="chat-central-top-container"
                            style={{
                                display: chatMessageBlocks.length === 0 ? 'flex' : 'block',
                                alignItems: chatMessageBlocks.length === 0 ? (isMobile || window.innerHeight < 420) ? 'start' : 'center' : null,
                                flexGrow: chatMessageBlocks.length === 0 ? '1' : null,
                                justifyContent: (chatMessageBlocks.length === 0 && chatMessageBlocks.length === 0) ? 'center' : null,
                                paddingRight: chatCentralTopContainerPaddingRight,
                                paddingBottom: ((isMobile || window.innerHeight < 420) && chatMessageBlocks.length === 0) ? 20 : 0,
                                paddingTop: (isMobile || window.innerHeight < 420) ? 20 : 0
                            }}
                            onMouseEnter={() => {
                                if (!latestAgentMessageBlockRef?.current) return;
                                latestAgentMessageBlockRef.current.stopAutoScroll(true);
                                setHoveringOnChatCentralTopContainer(prev => true);
                            }}
                            onMouseLeave={() => {
                                if (!latestAgentMessageBlockRef?.current) return;
                                latestAgentMessageBlockRef.current.stopAutoScroll(false);
                                setHoveringOnChatCentralTopContainer(prev => false);
                            }}
                        >
                            {
                                chatMessageBlocks.length === 0 ? (
                                    <div className="chat-central-content-container">
                                        <div className="chat-intro-and-description-wrapper">
                                            <div className="chat-intro-container">
                                                <span>Hi there! I'm ResearchPaL</span>
                                                <img src={AgentIcon} alt="researchpal icon" />
                                            </div>
                                            <div className="chat-description-container">
                                                <span>Ask me to summarize 📜, analyze 🔍, or clarify 💡 any part of this paper.</span>
                                            </div>
                                        </div>

                                        <div className="chat-suggestions-container">
                                            <div className="chat-suggestions-title">
                                                <span>Suggestions</span>
                                            </div>
                                            {
                                                loadingSuggestions ? (
                                                    <div className="chat-suggestions-questions-skeleton">
                                                        <div className="chat-suggestion-skeleton-tile"></div>
                                                        <div className="chat-suggestion-skeleton-tile"></div>
                                                        <div className="chat-suggestion-skeleton-tile"></div>
                                                        <div className="chat-suggestion-skeleton-tile"></div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="chat-suggestions-questions"
                                                    >
                                                        {
                                                            suggestionQuestions.map((question, index) => <SuggestionsQuestionTile key={index} question={question} toggleUserInput={toggleUserInput} />)
                                                        }
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>
                                ) : (
                                    chatMessageBlocks
                                )
                            }

                            {
                                !isStreaming && followUpSuggestions && followUpSuggestions.length > 0 && chatMessageBlocks.length > 1
                                && finishedGenerating && <FollowUpBlock suggestions={followUpSuggestions} onSelect={handleSend} />
                            }
                        </div>
                    ) : null
                }
                <div
                    className="chat-central-bottom-container"
                    style={{
                        width: chatWidth - CHAT_MENU_COMPRESSED_WIDTH - (isMobile ? 0 : 10),
                        paddingTop: userImages.length > 0 ? 10 : userFiles.length > 0 ? 10 : 15
                    }}
                >
                    {
                        showScrollToBottomButton && (
                            <div
                                className="scroll-to-bottom-button"
                                title="scroll to bottom"
                                onClick={smoothScrollToBottom}
                            >
                                <img
                                  className="scroll-to-bottom-arrow"
                                  src={ScrollArrowIcon}
                                  alt="↓"
                                />
                            </div>
                        )
                    }

                    <div
                        ref={attachImageTemplateRef}
                        className="chat-input-images-container"
                        style = {{
                            marginBottom: userImages.length > 0 ? 10 : 0
                        }}
                    >
                        { userImages.map((imageObj, index) => {
                            return (
                                <AttachImageTemplate
                                    key={imageObj.name + '_' + String(index)}
                                    imageObj={imageObj}
                                    handleRemoveImage={handleRemoveImage}
                                    toggleOpenImagePreview={toggleOpenImagePreview}
                                />
                            );
                        }) }
                    </div>

                    <div
                        ref={attachFileTemplateRef}
                        className="chat-input-files-container"
                        style={
                            userFiles.length > 0 ? {
                                marginBottom: userFiles.length > 0 ? 10 : 0,
                            } : {
                                height: 0
                            }
                        }
                    >
                        {userFiles.map((fileObj, index) => (
                            <AttachFileTemplate
                                key={fileObj.id}
                                fileObj={fileObj}
                                isHovering={userFilesHoveringList[index] === true}
                                onMouseEnter={() => toggleUserFilesEnter(index)}
                                onMouseLeave={() => toggleUserFilesLeave(index)}
                                onRemove={(finalize) => {
                                    if (!finalize) {
                                        if (fileObj.status !== "exiting") {
                                            handleRemoveFile(fileObj.id, false);
                                        }
                                    } else {
                                        handleRemoveFile(fileObj.id, true);
                                    }
                                }}
                                toggleOpenCSVFileModal={toggleOpenCSVFileModal}
                                toggleOpenPyFileModal={toggleOpenPyFileModal}
                                toggleOpenJsFileModal={toggleOpenJsFileModal}
                                toggleOpenHtmlFileModal={toggleOpenHtmlFileModal}
                                toggleOpenCssFileModal={toggleOpenCssFileModal}
                            />
                        ))}
                    </div>

                    <div className="chat-user-input-container">
                        <textarea
                            ref={textAreaRef}
                            className={`chat-user-input-textarea ${(fetchingVectorstore || errorFetchingVectorstore) ? 'inactive' : 'active'}`}
                            placeholder="Ask ResearchPaL"
                            rows={textAreaRows}
                            value={userInput}
                            onChange={handleUserInputChange}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            disabled={downloadingPdf || pdfDownloadError || fetchingVectorstore || errorFetchingVectorstore || fetchingParsedData}
                        />
                    </div>

                    <div className="chat-central-bottom-buttons-container">
                        <div className="attach-and-toggle-buttons-wrapper">
                            <div
                                className="attach-button"
                                title={`attach images and tables.\nAttached images will consume extra tokens and +1 API request for ALL attached images in a SINGLE turn. Similarly, attached files consume extra tokens and +1 API request separately as a batch.`}
                                onClick={handleAttachClick}
                            >
                                <img src={AttachIcon} alt="attach icon" />
                            </div>
                            <input
                                type="file"
                                multiple
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={handleFileInputChange}
                                disabled={downloadingPdf || pdfDownloadError || fetchingVectorstore || errorFetchingVectorstore || fetchingParsedData}
                            />

                            <div
                                className="toggle-button"
                                title={followUpSuggestionsEnabled ? "disable follow-up suggestions" : "enable follow-up suggestions\nActivate Follow-Up Suggestions for Enhanced Guidance. These intelligent suggestions will assist you in navigating through paper, though they will incur additional token usage and +1 API request."}
                            >
                                <ToggleSwitch isOn={followUpSuggestionsEnabled} onToggle={handleToggleSwitch} />
                            </div>
                        </div>
                        <div className="bottom-buttons-filler"></div>
                        <div
                            className="send-button"
                            title={finishedGenerating ? "Ask ResearchPaL" : "Interrupt ResearchPaL"}
                            onClick={finishedGenerating ? () => handleSend() : () => handleStopGeneration()}
                            style={
                                finishedGenerating ? {
                                    background: 'linear-gradient(to bottom, #5096FF, #3d74e2)'
                                } : {
                                    background: 'linear-gradient(to bottom, #F5BA1E, #CC9100)'
                                }
                            }
                        >
                            {
                                finishedGenerating ? (
                                    <img src={SendIcon} alt="send icon" />
                                ) : (<l-waveform size="16" speed="0.8" stroke="2.3" color="rgba(255, 255, 255, 1)"></l-waveform>)
                            }
                        </div>
                    </div>

                    <div className="current-llm-container">
                        <span ref={spanRef} className="animate">{animatedLLM}</span>
                    </div>
                </div>
            </div>

            <div
                ref={chatMenuRef}
                className="chat-right-container"
                style={{
                    width: chatMenuExpanded ? CHAT_MENU_EXPANDED_WIDTH : CHAT_MENU_COMPRESSED_WIDTH,
                    height: isMobile ? `calc(100dvh - ${pdfContainerHeight}px - 11px)` : '100dvh'
                }}
            >
                <div className="chat-right-top-container">
                    {
                        !isMobile && (
                            <div
                                ref={chatMenuCollapseButtonRef}
                                className="chat-right-top-collapse-button"
                                title="collapse menu"
                                onClick={handleChatMenuCompressed}>
                                    <img src={RightDoubleArrowsIcon} alt="collapse icon" />
                                    {chatMenuExpanded ? <span className="chat-menu-expanded-span">Collapse Menu</span> : null}
                            </div>
                        )
                    }
                    <div
                        ref={chatLLMButtonRef}
                        className="chat-right-top-llms-button"
                        title="choose model"
                        onClick={toggleLLMOptions}
                        style={
                            showLLMOptions ? {
                                backgroundColor: '#16202e'
                            } : null
                        }
                    >
                        <img src={LLMsIcon} alt="llms icon" />
                        {chatMenuExpanded ? <span className="chat-menu-expanded-span">Choose Model</span> : null}
                    </div>
                    <div
                        ref={chatParseButtonRef}
                        className="chat-right-top-parser-button"
                        title="parse options"
                        onClick={toggleShowParseOptions}
                        style={
                            showParseOptions ? {
                                backgroundColor: '#16202e'
                            } : null
                        }
                    >
                        <img src={ParserIcon} alt="parser icon" />
                        {chatMenuExpanded ? <span className="chat-menu-expanded-span">Choose Parser</span> : null}
                    </div>
                </div>

                <div className="chat-right-container-filler"></div>

                <div
                    className="chat-right-bottom-container"
                    style={{
                        gap: isMobile ? 0 : 15
                    }}
                >
                    <div
                        className="chat-right-bottom-top-mid-wrapper"
                        style={{
                            gap: isMobile ? 0 : 20
                        }}
                    >
                        <div className="chat-right-bottom-container-top">
                            <div
                                className="chat-upload-button"
                                title="upload chat"
                                onClick={() => toast.info("Coming soon")}
                            >
                                <img src={UploadIcon} alt="upload icon" />
                                {chatMenuExpanded ? <span className="chat-menu-expanded-span">Upload Chat</span> : null}
                            </div>
                            <div
                                className="chat-download-button"
                                title="download chat"
                                onClick={() => toast.info("Coming soon")}
                            >
                                <img src={DownloadIcon} alt="download icon" />
                                {chatMenuExpanded ? <span className="chat-menu-expanded-span">Download Chat</span> : null}
                            </div>
                        </div>

                        <div className="chat-right-bottom-container-mid">
                            {/* <div
                                className="query-enhancer-button-wrapper"
                                title="query enhancer"
                                onClick={handleQueryEnhancer}
                                style={{
                                    justifyContent: chatMenuExpanded ? 'flex-start' : 'center'
                                }}
                            >
                                <div className={`query-enhancer-button ${queryEnhancerActive ? 'active' : ''}`}>
                                    <img src={QueryEnhancerIcon} alt="query enhancer icon" />
                                </div>
                                {chatMenuExpanded ? <span className="chat-menu-expanded-span">Query Enhancer</span> : null}
                            </div> */}
                            <div
                                className="retrieval-quality-enhancer-button-wrapper"
                                title={`retrieval quality enhancer\nActivate Retrieval Quality Enhancer for more detailed explanations and cases where the agent might require large contexts from the paper to better answer your queries. This feature consumes additional tokens and +1 API request.`}
                                onClick={handleRetrievalQualityEnhancer}
                                style={{
                                    justifyContent: chatMenuExpanded ? 'flex-start' : 'center'
                                }}
                            >
                                <div className={`retrieval-quality-enhancer-button ${retrievalQualityEnhancerActive ? 'active' : ''}`}>
                                    <img src={RetrievalQualityEnhancerIcon} alt="retrieval quality enhancer icon" />
                                </div>
                                {chatMenuExpanded ? <span className="chat-menu-expanded-span">Retrieval Enhancer</span> : null}
                            </div>
                            <div
                                className="citation-mode-button-wrapper"
                                title={`citation mode\nActivate Citation Mode for Verified Explanations. This mode directly cites exact statements & location from the paper for each explanation, ensuring authenticity of Agent's responses. No additional tokens or API requests are required for this mode.`}
                                onClick={handleCitationMode}
                                style={{
                                    justifyContent: chatMenuExpanded ? 'flex-start' : 'center'
                                }}
                            >
                                <div className={`citation-mode-button ${citationModeActive ? 'active' : ''}`}>
                                    <img src={CitationIcon} alt="citation mode icon" />
                                </div>
                                {chatMenuExpanded ? <span className="chat-menu-expanded-span">Citation Mode</span> : null}
                            </div>
                        </div>
                    </div>

                    <div className="chat-right-bottom-container-low">
                        <div
                            ref={chatMenuExpandButtonRef}
                            className="chat-right-bottom-expand-button"
                            title="expand menu"
                            onClick={handleChatMenuExpanded}
                        >
                            <img src={RightDoubleArrowsIcon} alt="expand icon" />
                            {chatMenuExpanded ? <span className="chat-menu-expanded-span">Expand Menu</span> : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default ChatContainer;