import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import './MessageBlockComponents.css';
import UserIcon from '../assets/images/user.png';
import AgentIcon from '../assets/images/researchpal.png';
import InappropriateIcon from '../assets/images/inappropriate.png';
// import QueryEnhancerIcon from '../assets/images/query enhancer.png';
import RetrievalQualityEnhancerIcon from '../assets/images/retrieval quality enhancer.png';
import GearIcon from '../assets/images/gear.png';
import ArrowIcon from '../assets/images/query-enhancer-arrow.png';
// import BackspaceIcon from '../assets/images/backspace.png';
import AcceptIcon from '../assets/images/accept.png';
// import ExampleImage1 from '../assets/images/1.png';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const ChatImageTemplate = ({ imgObj, toggleOpenImagePreview }) => {
    return (
        <div className="chat-agent-image-wrapper" onClick={() => toggleOpenImagePreview(imgObj)}>
            <img src={imgObj.url} alt="reference image icon" />
        </div>
    );
};

const ChatFileTemplate = ({
    fileObj,
    fileType,
    fileName,
    toggleOpenCSVFileModal,
    toggleOpenPyFileModal,
    toggleOpenJsFileModal,
    toggleOpenHtmlFileModal,
    toggleOpenCssFileModal
}) => {
    const [isHovering, setIsHovering] = useState(false);

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

    const handleClick = () => {
        if (fileType === "csv") {
            toggleOpenCSVFileModal(fileObj);
        } else if (fileType === "py") {
            toggleOpenPyFileModal(fileObj);
        } else if (fileType === "js") {
            toggleOpenJsFileModal(fileObj);
        } else if (fileType === "html") {
            toggleOpenHtmlFileModal(fileObj);
        } else if (fileType === "css") {
            toggleOpenCssFileModal(fileObj);
        } else {
            toast.info(`Unable to open ${fileName} file`);
        }
    };

    return (
        <div
            className="chat-agent-file-wrapper"
            style={containerStyle}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={handleClick}
        >
            <span style={spanStyle}>{fileName}</span>
        </div>
    )
};

const AgentInappropriateResponse = () => {
    return (
        <div className="chat-agentmessage-inappropriate-message-container">
            <img src={InappropriateIcon} alt="inappropraite icon" />
            <span>Your query cannot be answered due to inappropriate content</span>
        </div>
    );
};

// const QueryEnhancerBlock = ({
//     isExpanded,
//     toggleExpansion,
//     queries,
//     isActive,
//     isRetrievalQualityEnhancerEnabled,
//     isRetrievalQualityEnhancerBlockShowing,
//     // fetchedResponse,
//     // generatingResponse,
//     isEnhancedQuerySelected,
//     toggleEnhancedQuerySelection
// }) => {
//     const [animationState, setAnimationState] = useState('idle');
//     const [animatingAcceptIcon, setAnimatingAcceptIcon] = useState(false);
//     const [isHovering, setIsHovering] = useState(false);
//     const bottomContainerRef = useRef(null);

//     const animateAcceptIcon = () => {
//         setAnimatingAcceptIcon(true);
//         setTimeout(() => {
//             setAnimatingAcceptIcon(false);
//         }, 1000);
//     };

//     useEffect(() => {
//         if (!bottomContainerRef.current) return;

//         if (isExpanded) {
//             bottomContainerRef.current.style.maxHeight = `${bottomContainerRef.current.scrollHeight}px`;
//         } else {
//             bottomContainerRef.current.style.maxHeight = `${bottomContainerRef.current.scrollHeight}px`;
//             setTimeout(() => {
//                 bottomContainerRef.current.style.maxHeight = '0px';
//             }, 10);
//         }

//         const transitionEndHandler = () => setAnimationState('idle');
//         const container = bottomContainerRef.current;

//         container.addEventListener('transitionend', transitionEndHandler);

//         return () => {
//             container.removeEventListener('transitionend', transitionEndHandler);
//         };
//     }, [isExpanded]);

//     return (
//         <div
//             className={`query-enhancer-block ${isActive && !isExpanded ? "blink" : ""}`}
//             style={
//                 isRetrievalQualityEnhancerEnabled ? {
//                     marginBottom: isRetrievalQualityEnhancerBlockShowing ? 2 : 0,
//                     borderColor: isActive ? null : isExpanded ? 'rgba(255, 255, 255, 0.35)' : isHovering ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.07)'
//                 } : {
//                     // marginBottom: fetchedResponse ? 15 : generatingResponse ? 15 : 0,
//                     marginBottom: 15,
//                     borderColor: isActive ? null : isExpanded ? 'rgba(255, 255, 255, 0.35)' : isHovering ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.07)'
//                 }
//             }
//             onMouseEnter={() => setIsHovering(true)}
//             onMouseLeave={() => setIsHovering(false)}
//         >
//             <div
//                 className="query-enhancer-top-container"
//                 onClick={() => toggleExpansion(!isExpanded)} 
//             >
//                 <div className="query-enhancer-title-and-icon-wrapper">
//                     <img className={`query-enhancer-icon ${isActive ? 'scale' : ''}`} src={QueryEnhancerIcon} alt="query enhancer icon" />
//                     <div
//                         className={`query-enhancer-text ${
//                             isActive
//                                 ? "text-shimmer"
//                                 : isEnhancedQuerySelected
//                                 ? "text-selected"
//                                 : "text-unselected"
//                         }`}
//                     >
//                         {isActive
//                             ? "Enhancing your Query"
//                             : !isEnhancedQuerySelected
//                             ? "Choose an Enhancement"
//                             : "Query Enhancer"}
//                     </div>
//                 </div>
//                 <div className="query-enhancer-filler"></div>
//                 <div className="query-enhancer-status-container">
//                     {
//                         !isActive ? (
//                             <img
//                                 className={`query-enhancer-arrow-icon ${isExpanded ? 'expanded' : ''}`}
//                                 src={ArrowIcon}
//                                 alt="arrow icon"
//                             />
//                         ) : (
//                             <img
//                                 className={`query-enhancer-gear-icon ${isActive ? "rotate" : ""}`}
//                                 src={GearIcon}
//                                 alt="gear icon"
//                             />
//                         )
//                     }
//                 </div>
//             </div>

//             <div
//                 ref={bottomContainerRef}
//                 className={`query-enhancer-bottom-container ${animationState}`}
//                 style={{ maxHeight: '0px' }}
//             >
//                 {
//                     !isActive && queries && queries.map((queryObj, index) => {
//                         if (queryObj.query === "continue with your query") {
//                             return (
//                                 <div
//                                     key={index}
//                                     className={`query-enhancer-query-container ${index === 0 ? 'top' : index === queries.length - 1 ? 'bottom' : 'middle'}`}
//                                     title={queryObj.query}
//                                     onClick={() => {
//                                         toggleEnhancedQuerySelection(-1);
//                                         animateAcceptIcon();
//                                     }}
//                                 >
//                                     <div className="query-enhancer-query-container-text">
//                                         <img src={BackspaceIcon} alt="backspace icon" />
//                                         <span>{queryObj.query}</span>
//                                     </div>
//                                     <div className="query-enhancer-query-status-container">
//                                     {
//                                             queryObj.selected ? (
//                                                 <img className={`query-enhancer-accept-icon ${animatingAcceptIcon ? 'animate' : ''}`} src={AcceptIcon} alt="accept icon" />
//                                             ) : null
//                                         }
//                                     </div>
//                                 </div>
//                             );
//                         } else {
//                             return (
//                                 <div
//                                     key={index}
//                                     className={`query-enhancer-query-container ${index === 0 ? 'top' : index === queries.length - 1 ? 'bottom' : 'middle'}`}
//                                     title={queryObj.query}
//                                     onClick={() => {
//                                         toggleEnhancedQuerySelection(index);
//                                         animateAcceptIcon();
//                                     }}
//                                 >
//                                     <div className="query-enhancer-query-container-text">
//                                         <span>{queryObj.query}</span>
//                                     </div>
//                                     <div className="query-enhancer-query-status-container">
//                                         {
//                                             queryObj.selected ? (
//                                                 <img className={`query-enhancer-accept-icon ${animatingAcceptIcon ? 'animate' : ''}`} src={AcceptIcon} alt="accept icon" />
//                                             ) : null
//                                         }
//                                     </div>
//                                 </div>
//                             );
//                         }
//                     })
//                 }
//             </div>
//         </div>
//     );
// };

const RetrievalQualityEnhancerBlock = ({
    isExpanded,
    toggleExpansion,
    queries,
    queryStatus,
    queryAnimations,
    isActive,
}) => {
    const [animationState, setAnimationState] = useState('idle');
    const [isHovering, setIsHovering] = useState(false);
    const bottomContainerRef = useRef(null);

    useEffect(() => {
        if (!bottomContainerRef.current) return;

        if (isExpanded) {
            bottomContainerRef.current.style.maxHeight = `${bottomContainerRef.current.scrollHeight}px`;
        } else {
            bottomContainerRef.current.style.maxHeight = `${bottomContainerRef.current.scrollHeight}px`;
            setTimeout(() => {
                bottomContainerRef.current.style.maxHeight = '0px';
            }, 10);
        }

        const transitionEndHandler = () => setAnimationState('idle');
        const container = bottomContainerRef.current;

        container.addEventListener('transitionend', transitionEndHandler);

        return () => {
            container.removeEventListener('transitionend', transitionEndHandler);
        };
    }, [isExpanded]);

    return (
        <div
            className={`retrieval-quality-enhancer-block ${isActive ? 'blink' : ''}`}
            style={
                {
                    marginBottom: 15,
                    borderColor: isActive ? null : isExpanded ? 'rgba(255, 255, 255, 0.35)' : isHovering ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.07)'
                }
            }
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div
                className="retrieval-quality-enhancer-top-container"
                onClick={() => toggleExpansion(!isExpanded)}
            >
                <div className="retrieval-quality-enhancer-title-and-icon-wrapper">
                    <img className={`retrieval-quality-enhancer-icon ${isActive ? "rotate" : ""}`} src={RetrievalQualityEnhancerIcon} alt="retrieval quality enhancer icon" />
                    <div
                        className={`retrieval-quality-enhancer-text ${isActive ? 'text-shimmer' : 'done'}`}
                    >
                        {
                            isActive ? "Enhancing Retrieval Quality" : "Retrieval Quality Enhancer"
                        }
                    </div>
                </div>
                <div className="retrieval-quality-enhancer-filler"></div>
                <div className="retrieval-quality-enhancer-status-container">
                    {
                        (
                            <img
                                className={`retrieval-quality-enhancer-arrow-icon ${isExpanded ? 'expanded' : ''}`}
                                src={ArrowIcon}
                                alt="arrow icon"
                            />
                        )
                    }
                </div>
            </div>
            <div
                ref={bottomContainerRef}
                className={`retrieval-quality-enhancer-bottom-container ${animationState}`}
                style={{ maxHeight: '0px' }}
            >
                {
                    queries && queryStatus && queries.map((query, index) => {
                        return (
                            <div
                                key={index}
                                className={`retrieval-quality-enhancer-query-container ${index === 0 ? 'top' : index === queries.length - 1 ? 'bottom' : 'middle'}`}
                                title={query}
                            >
                                <div className="retrieval-quality-enhancer-query-container-text">
                                    <span className={`${isActive && !queryStatus[index] ? "text-shimmer" : ""}`}>{query}</span>
                                </div>
                                <div
                                    className="retrieval-quality-enhancer-query-status-container"
                                >
                                    {
                                        (!isActive || queryStatus[index]) ? (
                                            <img
                                                className={`retrieval-quality-enhancer-accept-icon ${
                                                    queryAnimations[index] ? "animate" : ""
                                                }`}
                                                src={AcceptIcon}
                                                alt="gear icon"
                                            />
                                        ) : (
                                            <img
                                                className={`retrieval-quality-enhancer-gear-icon ${isActive ? "rotate" : ""}`}
                                                src={GearIcon}
                                                alt="gear icon"
                                            />
                                        )
                                    }
                                </div>
                            </div>
                        );
                    })
                }
            </div>
        </div>
    );
}

export const AgentMessageBlock = forwardRef((props, ref) => {
    const {
        // enabledQueryEnhancer,
        enabledRetrievalQualityEnhancer,
        toggleSmoothScrollToBottom,
        messageFromChatHistory = null,
        // enhancedQueriesFromChatHistory = null,
        // chosenEnhancementFromChatHistory = null,
        decomposedQueriesFromChatHistory = null,
        rqeSubQueryStatusesFromChatHistory = null,
        isMobile=false
        // toggleContinueFromQueryEnhancement
    } = props;

    // const [showQueryEnhancerBlock, setShowQueryEnhancerBlock] = useState(false);
    // const [isQueryEnhancerBlockExpanded, setIsQueryEnhancerBlockExpanded] = useState(false);
    // const [isQueryEnhancerBlockActive, setIsQueryEnhancerBlockActive] = useState(false);
    // const [enhancedQueries, setEnhancedQueries] = useState(null);
    // const [isEnhancedQuerySelected, setIsEnhancedQuerySelected] = useState(false);
    const [isRetrievalQualityEnhancerBlockExpanded, setIsRetrievalQualityEnhancerBlockExpanded] = useState(false);
    const [isRetrievalQualityEnhancerBlockActive, setIsRetrievalQualityEnhancerBlockActive] = useState(false);
    const [showRetrievalQualityEnhancerBlock, setShowRetrievalQualityEnhancerBlock] = useState(false);
    const [decomposedQueries, setDecomposedQueries] = useState(null);
    const [decomposedQueryStatus, setDecomposedQueryStatus] = useState(null);
    const [decomposedQueryAnimations, setDecomposedQueryAnimations] = useState(null);
    const [isRetrievalQualityEnhanced, setIsRetrievalQualityEnhanced] = useState(false);
    const [showSkeletons, setShowSkeletons] = useState(enabledRetrievalQualityEnhancer ? false : true); // removed enabledQueryEnhancer
    const [generatingResponse, setGeneratingResponse] = useState(enabledRetrievalQualityEnhancer ? false : true); // removed enabledQueryEnhancer
    const [isInappropriate, setIsInappropriate] = useState(false);
    const [partialMessage, setPartialMessage] = useState("");
    const [finalMessage, setFinalMessage] = useState("");
    const [hoveringOnChatCentralTopContainer, setHoveringOnChatCentralTopContainer] = useState(false);
    const decomposedQueriesRef = useRef(decomposedQueries);
    const showRQEBlockRef = useRef(showRetrievalQualityEnhancerBlock);

    // removed setShowQueryEnhancerBlock, setEnhancedQueries
    useImperativeHandle(ref, () => ({
        setGeneratingResponse,
        setShowSkeletons,
        setIsInappropriate,
        pushStreamChunk: (chunkString) => {
            setPartialMessage(prev => prev + chunkString);
        },
        finalizeResponse: (fullResponse) => {
            setPartialMessage("");
            setFinalMessage(fullResponse);
        },
        stopAutoScroll: (value) => {
            setHoveringOnChatCentralTopContainer(value);
        },
        // setShowQueryEnhancerBlock,
        // setEnhancedQueries,
        setShowRetrievalQualityEnhancerBlock,
        setDecomposedQueries,
        setIsRetrievalQualityEnhanced,
        // need to handle retrieval failure also
        updateRQEStatus: (statusObj) => {
            if (!showRQEBlockRef.current || decomposedQueriesRef.current?.length === 0 || !statusObj?.fromRQE) return;
            setDecomposedQueryStatus(prev => {
                let updated = !prev || prev.length === 0 ? Array(decomposedQueriesRef.current.length).fill(false) : [...prev];
                if (statusObj?.subQueryIdx === null || statusObj.subQueryIdx >= decomposedQueriesRef.current.length) return;
                if (statusObj?.success) updated[statusObj.subQueryIdx] = true;
                else updated[statusObj.subQueryIdx] = false; // need to do something else incase of retrieval failure
                return updated;
            });
            setDecomposedQueryAnimations(prev => {
                let updated = !prev || prev.length === 0 ? Array(decomposedQueriesRef.current.length).fill(false) : [...prev];
                if (statusObj?.subQueryIdx === null || statusObj.subQueryIdx >= decomposedQueriesRef.current.length) return;
                if (statusObj?.success) updated[statusObj.subQueryIdx] = true; // we will animate even incase of failure but with different icon
                else updated[statusObj.subQueryIdx] = false;
                return updated;
            });
        },
        // stopQueryEnhancer: () => {
        //     setIsEnhancedQuerySelected(true);
        // },
        stopRetrievalQualityEnhancer: () => {
            setIsRetrievalQualityEnhanced(true);
        }
    }), [[setGeneratingResponse, setShowSkeletons, setIsInappropriate, setShowRetrievalQualityEnhancerBlock, setDecomposedQueries]]);

    // const toggleEnhancedQuerySelection = (index) => {
    //     if (isEnhancedQuerySelected || !enhancedQueries || enhancedQueries.length === 0) return;
    //     setEnhancedQueries(prev => {
    //         const updatedState = [...prev];
    //         if (index === -1) {
    //             updatedState[enhancedQueries.length - 1] = { ...updatedState[enhancedQueries.length - 1], selected: true };
    //         } else {
    //             for (let i = 0; i < enhancedQueries.length; i++) {
    //                 if (i === index) {
    //                     updatedState[i] = { ...updatedState[i], selected: true }
    //                 }
    //             }
    //         }
    //         return updatedState;
    //     });
    //     setIsEnhancedQuerySelected(true);
    //     toggleContinueFromQueryEnhancement(index);
    // };

    // const toggleQueryEnhancerBlockExpansion = (value) => {
    //     if (!isEnhancedQuerySelected) {
    //         setIsQueryEnhancerBlockExpanded(true);
    //     } else {
    //         setIsQueryEnhancerBlockExpanded(value);
    //         if (value) {
    //             setIsRetrievalQualityEnhancerBlockExpanded(false);
    //         }
    //     }
    // };

    const toggleRetrievalEnhancerBlockExpansion = (value) => {
        setIsRetrievalQualityEnhancerBlockExpanded(value);
        // if (value) {
        //     setIsQueryEnhancerBlockExpanded(false);
        // }
    };

    useEffect(() => {
        if (isInappropriate) return;
        decomposedQueriesRef.current = decomposedQueries;
    }, [isInappropriate, decomposedQueries]);

    useEffect(() => {
        if (isInappropriate) return;
        showRQEBlockRef.current = showRetrievalQualityEnhancerBlock;
    }, [isInappropriate, showRetrievalQualityEnhancerBlock]);

    // removed enabledQueryEnhancer, enhancedQueriesFromChatHistory, chosenEnhancementFromChatHistory
    useEffect(() => {
        if (messageFromChatHistory) {
            setPartialMessage("");
            setFinalMessage(messageFromChatHistory);
            setGeneratingResponse(false);
            setShowSkeletons(false);
            // if (enabledQueryEnhancer && enhancedQueriesFromChatHistory && enhancedQueriesFromChatHistory.length > 0 && chosenEnhancementFromChatHistory !== null) {
            //     setShowQueryEnhancerBlock(true);
            //     setIsQueryEnhancerBlockActive(false);
            //     setIsQueryEnhancerBlockExpanded(false);
            //     setEnhancedQueries(prev => {
            //         let updated = enhancedQueriesFromChatHistory.map((query, idx) => {
            //             return { query: query, selected: idx === chosenEnhancementFromChatHistory };
            //         });
            //         updated.push({ query: "continue with your query", selected: chosenEnhancementFromChatHistory === -1 });
            //         return updated;
            //     });
            //     setIsEnhancedQuerySelected(true);
            // }
            if (enabledRetrievalQualityEnhancer && decomposedQueriesFromChatHistory && decomposedQueriesFromChatHistory.length > 0
                && rqeSubQueryStatusesFromChatHistory && rqeSubQueryStatusesFromChatHistory.length > 0) {
                setShowRetrievalQualityEnhancerBlock(true);
                setIsRetrievalQualityEnhancerBlockActive(false);
                setIsRetrievalQualityEnhancerBlockExpanded(false);
                setDecomposedQueries(decomposedQueriesFromChatHistory);
                setDecomposedQueryStatus(prev => {
                    let updated = Array(decomposedQueriesFromChatHistory.length).fill(false);
                    rqeSubQueryStatusesFromChatHistory.forEach(stsObj => {
                        if (stsObj?.fromRQE && stsObj?.subQueryIdx !== null) updated[stsObj.subQueryIdx] = true;
                    });
                    return updated;
                });
                setDecomposedQueryAnimations(Array(decomposedQueriesFromChatHistory.length).fill(false));
                setIsRetrievalQualityEnhanced(true);
            }
        }
    }, [messageFromChatHistory, enabledRetrievalQualityEnhancer, decomposedQueriesFromChatHistory]);

    useEffect(() => {
        if (messageFromChatHistory !== null || isInappropriate) return;

        if (finalMessage.length > 0 || (partialMessage.length > 0 && (generatingResponse || showSkeletons))) {
            // removed enabledQueryEnhancer
            if (enabledRetrievalQualityEnhancer) {
                setTimeout(() => {
                    setGeneratingResponse(prev => false);
                    setShowSkeletons(prev => false);
                }, 0);
            } else {
                setGeneratingResponse(prev => false);
                setShowSkeletons(prev => false);
            }
        }

        // if (partialMessage.length > 0 && finalMessage.length === 0 && !hoveringOnChatCentralTopContainer && !isMobile && !isTablet) toggleSmoothScrollToBottom();
    }, [messageFromChatHistory, isInappropriate, partialMessage, finalMessage, hoveringOnChatCentralTopContainer]);

    // responsible for showing QE block, if enabled, when user clicks enter
    // useEffect(() => {
    //     if (messageFromChatHistory !== null) return;
    //     if (enabledQueryEnhancer) {
    //         setIsQueryEnhancerBlockActive(true);
    //         setShowQueryEnhancerBlock(true);
    //         setTimeout(() => {
    //             toggleSmoothScrollToBottom();
    //         }, 200);
    //     }
    // }, [messageFromChatHistory, enabledQueryEnhancer]);

    // useEffect(() => {
    //     if (messageFromChatHistory !== null) return;
    //     if (enabledQueryEnhancer && enhancedQueries && enhancedQueries.length > 0) {
    //         if (!isEnhancedQuerySelected) {
    //             setIsQueryEnhancerBlockExpanded(true);
    //             setIsQueryEnhancerBlockActive(false);
    //         } else {
    //             setTimeout(() => {
    //                 setIsQueryEnhancerBlockExpanded(false);
    //             }, 900);
    //         }
    //     }
    // }, [messageFromChatHistory, enabledQueryEnhancer, enhancedQueries, isEnhancedQuerySelected]);

    // removed enabledQueryEnhancer, enhancedQueries, isEnhancedQuerySelected
    useEffect(() => {
        if (messageFromChatHistory !== null || isInappropriate) return;
        if (enabledRetrievalQualityEnhancer) {
            // if (enabledQueryEnhancer && !isEnhancedQuerySelected) return;
            if (!showRetrievalQualityEnhancerBlock) {
                setIsRetrievalQualityEnhancerBlockActive(true);
                setShowRetrievalQualityEnhancerBlock(true);
                // if (enabledQueryEnhancer && enhancedQueries && enhancedQueries.length > 0) {
                //     setTimeout(() => {
                //         setIsRetrievalQualityEnhancerBlockActive(true);
                //         setShowRetrievalQualityEnhancerBlock(true);
                //     }, 1000);
                // } else {
                    
                // }
            } else {
                setShowRetrievalQualityEnhancerBlock(false);
                setIsRetrievalQualityEnhancerBlockActive(false);
            }
        }
    }, [messageFromChatHistory, isInappropriate, enabledRetrievalQualityEnhancer]);

    // expands RQE block when decomposed Queries arrive
    useEffect(() => {
        if (messageFromChatHistory !== null || isInappropriate) return;
        if (enabledRetrievalQualityEnhancer && decomposedQueries && decomposedQueries.length > 0) {
            setDecomposedQueryStatus(Array(decomposedQueries.length).fill(false));
            setDecomposedQueryAnimations(Array(decomposedQueries.length).fill(false));
            setIsRetrievalQualityEnhancerBlockExpanded(true);
            // if (!isMobile && !isTablet) {
            //     setTimeout(() => {
            //         toggleSmoothScrollToBottom();
            //     }, 350);
            // }
        }
    }, [messageFromChatHistory, isInappropriate, enabledRetrievalQualityEnhancer, decomposedQueries]);

    useEffect(() => {
        if (messageFromChatHistory !== null || isInappropriate || !enabledRetrievalQualityEnhancer) return;

        if (isRetrievalQualityEnhanced) {
            setIsRetrievalQualityEnhancerBlockActive(false);
            setIsRetrievalQualityEnhancerBlockExpanded(false);
        }
    }, [messageFromChatHistory, isInappropriate, enabledRetrievalQualityEnhancer, isRetrievalQualityEnhanced, isMobile]);

    return (
        <div className="chat-agentmessage-block">
            <div className="chat-agentmessage-left-container">
                <div className="chat-agentmessage-logo-container">
                    <img src={AgentIcon} alt="user icon" />
                </div>
            </div>
            <div className="chat-agentmessage-right-container">
                <div className="chat-agentmessage-label-container">
                    <span>ResearchPaL</span>
                </div>

                {
                    isInappropriate ? (
                        <AgentInappropriateResponse />
                    ) : (
                        <div className="chat-agentmessage-content-container">
                            {/* {
                                enabledQueryEnhancer && showQueryEnhancerBlock && (
                                    <QueryEnhancerBlock
                                        isExpanded={isQueryEnhancerBlockExpanded}
                                        toggleExpansion={toggleQueryEnhancerBlockExpansion}
                                        queries={enhancedQueries}
                                        isActive={isQueryEnhancerBlockActive}
                                        isRetrievalQualityEnhancerEnabled={enabledRetrievalQualityEnhancer}
                                        isRetrievalQualityEnhancerBlockShowing={showRetrievalQualityEnhancerBlock}
                                        isEnhancedQuerySelected={isEnhancedQuerySelected}
                                        toggleEnhancedQuerySelection={toggleEnhancedQuerySelection}
                                    />
                                )
                            } */}
                            {
                                enabledRetrievalQualityEnhancer && showRetrievalQualityEnhancerBlock && (
                                    <RetrievalQualityEnhancerBlock
                                        isExpanded={isRetrievalQualityEnhancerBlockExpanded}
                                        toggleExpansion={toggleRetrievalEnhancerBlockExpansion}
                                        queries={decomposedQueries}
                                        isActive={isRetrievalQualityEnhancerBlockActive}
                                        queryStatus={decomposedQueryStatus}
                                        queryAnimations={decomposedQueryAnimations}
                                    />
                                )
                            }
                            {
                                // removed (enabledQueryEnhancer && !isEnhancedQuerySelected)
                                (enabledRetrievalQualityEnhancer && !isRetrievalQualityEnhanced) ? null : (
                                    generatingResponse ? (
                                        <div
                                            className={`chat-agentmessage-text-container-skeleton ${showSkeletons ? 'show-skeleton' : ''}`}
                                            style={ showSkeletons ? { maxHeight: 200 } : { maxHeight: 0 } }
                                        >
                                            <div className="skeleton-line" style={{ width: '100%' }}></div>
                                            <div className="skeleton-line" style={{ width: '100%' }}></div>
                                            <div className="skeleton-line" style={{ width: '100%' }}></div>
                                            <div className="skeleton-line" style={{ width: '80%' }}></div>
                                            <div className="skeleton-line" style={{ width: '60%' }}></div>
                                        </div>
                                    ) : !isRetrievalQualityEnhancerBlockActive ? ( // removed !isQueryEnhancerBlockActive
                                        <ReactMarkdown
                                            className="agentmessageblock-markdown-body"
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeRaw, rehypeKatex]}
                                            components={{
                                                a: ({ node, ...props }) => (
                                                  <a target="_blank" rel="noopener noreferrer" {...props} />
                                                ),
                                            }}
                                        >
                                            { finalMessage.length > 0 ? finalMessage : partialMessage }
                                        </ReactMarkdown>
                                    ) : null
                                )
                            }
                        </div>
                    )
                }
            </div>
        </div>
    );
});

export const UserMessageBlock = ({
    message,
    images,
    files,
    toggleOpenImagePreview,
    toggleOpenCSVFileModal,
    toggleOpenPyFileModal,
    toggleOpenJsFileModal,
    toggleOpenHtmlFileModal,
    toggleOpenCssFileModal
}) => {
    return (
        <div
            className="chat-usermessage-block"
        >
            <div className="chat-usermessage-left-container">
                <div className="chat-usermessage-logo-container">
                    <img src={UserIcon} alt="user icon" />
                </div>
            </div>
            <div className="chat-usermessage-right-container">
                <div className="chat-usermessage-label-container">
                    <span>You</span>
                </div>
                <div className="chat-usermessage-content-container">
                    {
                        images && images.length > 0 && (
                            <div className="chat-usermessage-images-container">
                                {
                                    images.map((imgObj) => {
                                        return <ChatImageTemplate key={imgObj.id} imgObj={imgObj} toggleOpenImagePreview={toggleOpenImagePreview} />;
                                    })
                                }
                            </div>
                        )
                    }
                    {
                        files && files.length > 0 && (
                            <div className="chat-usermessage-files-container">
                                {
                                    files.map(fileObj => {
                                        return (
                                            <ChatFileTemplate
                                                key={fileObj.id}
                                                fileObj={fileObj.file}
                                                fileName={fileObj.file.name}
                                                fileType={fileObj.file.name.split('.').pop()}
                                                toggleOpenCSVFileModal={toggleOpenCSVFileModal}
                                                toggleOpenPyFileModal={toggleOpenPyFileModal}
                                                toggleOpenJsFileModal={toggleOpenJsFileModal}
                                                toggleOpenHtmlFileModal={toggleOpenHtmlFileModal}
                                                toggleOpenCssFileModal={toggleOpenCssFileModal}
                                            />
                                        );
                                    })
                                }
                            </div>
                        )
                    }
                    <span className="chat-usermessage-content-container-span">{message}</span>
                </div>
            </div>
        </div>
    );
};