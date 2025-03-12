import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph/web";
import type { MemoryVectorStore } from 'langchain/vectorstores/memory.js';
import { BaseMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";
// import type { StateSnapshot } from "@langchain/langgraph";
import {
    MainGraphState,
    TextGraphState,
    ImageGraphState,
    FileGraphState,
    // getQueryEnhancements,
    // userSelectQueryEnhancement,
    performRetrievalQualityEnhancement,
    // queryEnhancerConditionalEdge,
    summarizeAttachedFiles,
    summarizeAttachedImages,
    validateAttachedImages,
    convertToEmbeddings,
    retrieveFromVectorstore,
    performRagFusion,
    generateResponse,
    generateFollowUpSuggestions,
    parallelizeVectorstoreRetrieval
} from './ragSystem.tsx';
import { IterableReadableStream } from "@langchain/core/utils/stream";

// window.process = window.process || {};
// window.process.env = window.process.env || {};
// window.process.env.LANGSMITH_TRACING = "true";
// window.process.env.LANGSMITH_API_KEY = "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";
// window.process.env.LANGSMITH_ENDPOINT = "https://api.smith.langchain.com";
// window.process.env.LANGCHAIN_CALLBACKS_BACKGROUND = "false";
// window.process.env.LANGCHAIN_PROJECT = "pr-long-retirement-7";

// console.log(window.process.env);

interface paperDetailsType {
    title: string;
    datePublished: string;
    codeURL: string;
    codeFramework: string;
    githubStars: number;
    authors: string[];
}

interface imageObjectType {
    name: string;
    data: string;
}

interface fileObjectType {
    name: string;
    data: string;
}


// const textSubGraphBuilder = new StateGraph(TextGraphState)
//     .addNode("getQueryEnhancements", getQueryEnhancements)
//     .addNode("userSelectQueryEnhancement", userSelectQueryEnhancement)
//     .addNode("performRetrievalQualityEnhancement", performRetrievalQualityEnhancement)
//     .addEdge(START, "getQueryEnhancements")
//     .addConditionalEdges("getQueryEnhancements", queryEnhancerConditionalEdge)
//     .addEdge("userSelectQueryEnhancement", "performRetrievalQualityEnhancement")
//     .addEdge("performRetrievalQualityEnhancement", END);

const textSubGraphBuilder = new StateGraph(TextGraphState)
    .addNode("performRetrievalQualityEnhancement", performRetrievalQualityEnhancement)
    .addEdge(START, "performRetrievalQualityEnhancement")
    .addEdge("performRetrievalQualityEnhancement", END)

const imageSubGraphBuilder = new StateGraph(ImageGraphState)
    .addNode("summarizeAttachedImages", RunnableLambda.from(summarizeAttachedImages).withConfig({ tags: ["nostream"] }))
    .addNode("validateAttachedImages", RunnableLambda.from(validateAttachedImages).withConfig({ tags: ["nostream"] }))
    .addEdge(START, "summarizeAttachedImages")
    .addEdge("summarizeAttachedImages", "validateAttachedImages")
    .addEdge("validateAttachedImages", END);

const fileSubGraphBuilder = new StateGraph(FileGraphState)
    .addNode("summarizeAttachedFiles", RunnableLambda.from(summarizeAttachedFiles).withConfig({ tags: ["nostream"] }))
    .addEdge(START, "summarizeAttachedFiles")
    .addEdge("summarizeAttachedFiles", END);

const mainGraphBuilder = new StateGraph(MainGraphState)
    .addNode("imageSubGraph", imageSubGraphBuilder.compile())
    .addNode("fileSubGraph", fileSubGraphBuilder.compile())
    // .addNode("textSubGraph", textSubGraphBuilder.compile({interruptBefore: ["userSelectQueryEnhancement"]}))
    .addNode("textSubGraph", textSubGraphBuilder.compile())
    .addNode("convertToEmbeddings", RunnableLambda.from(convertToEmbeddings).withConfig({ tags: ["nostream"] }))
    .addNode("retrieveFromVectorstore", RunnableLambda.from(retrieveFromVectorstore).withConfig({ tags: ["retrieveFromVectorstore"] }))
    .addNode("performRagFusion", RunnableLambda.from(performRagFusion).withConfig({ tags: ["nostream"] }))
    .addNode("generateResponse", generateResponse)
    .addNode("generateFollowUpSuggestions", generateFollowUpSuggestions)
    .addEdge(START, "textSubGraph")
    .addEdge(START, "imageSubGraph")
    .addEdge(START, "fileSubGraph")
    .addEdge("textSubGraph", "convertToEmbeddings")
    .addEdge("imageSubGraph", "convertToEmbeddings")
    .addEdge("fileSubGraph", "convertToEmbeddings")
    .addConditionalEdges("convertToEmbeddings", parallelizeVectorstoreRetrieval, ["retrieveFromVectorstore"])
    .addEdge("retrieveFromVectorstore", "performRagFusion")
    .addEdge("performRagFusion", "generateResponse")
    .addEdge("generateResponse", "generateFollowUpSuggestions")
    .addEdge("generateFollowUpSuggestions", END);

const checkpointer: MemorySaver = new MemorySaver();
const graph = mainGraphBuilder.compile({ checkpointer: checkpointer });

export const invokeGraph = async (
    turnNum: number,
    messages: BaseMessage[] = [],
    sessionId: string,
    providerName: 'OpenAI' | 'Anthropic' | 'Google' | 'Groq',
    providerApiKey: string,
    LLM: string,
    paperDetails: paperDetailsType,
    userQuery: string,
    attachedImageObjects: imageObjectType[] = [],
    attachedFileObjects: fileObjectType[] = [],
    paperFigureObjects: imageObjectType[] = [],
    paperTableObjects: fileObjectType[] = [],
    paperFigureLabels: string[] = [],
    paperTableLabels: string[] = [],
    embeddingApiKey: string,
    // isQueryEnhancerEnabled: boolean = false,
    isRetrievalQualityEnhancerEnabled: boolean = false,
    isFollowUpSuggestionsEnabled: boolean = false,
    vectorstore: MemoryVectorStore,
    onlyText: boolean = false,
    citationMode: boolean = false,
    parseMode: 'Default' | 'Advanced'
): Promise<typeof MainGraphState.State> => {
    const initialState: typeof MainGraphState.State = {
        messages: messages,
        sessionId: sessionId,
        providerName: providerName,
        providerApiKey: providerApiKey,
        LLM: LLM,
        paperDetails: paperDetails,
        userQuery: userQuery,
        attachedImageObjects: attachedImageObjects,
        attachedImageSummaries: [],
        attachedFileObjects: attachedFileObjects,
        attachedFileSummaries: [],
        paperFigureObjects: paperFigureObjects,
        paperTableObjects: paperTableObjects,
        paperFigureLabels: paperFigureLabels,
        paperTableLabels: paperTableLabels,
        embeddingApiKey: embeddingApiKey,
        searchEmbeddings: [],
        // isQueryEnhancerEnabled: isQueryEnhancerEnabled,
        // queryEnhancements: [],
        // chosenEnhancement: -1,
        isRetrievalQualityEnhancerEnabled: isRetrievalQualityEnhancerEnabled,
        retrievalQualityEnhancements: [],
        rqeSubQueryStatuses: [],
        retrievedDocuments: [],
        fusedRetrievedDocuments: [],
        finalAnswer: "",
        isFollowUpSuggestionsEnabled: isFollowUpSuggestionsEnabled,
        followUpSuggestions: [],
        vectorstore: vectorstore,
        onlyText: onlyText,
        citationMode: citationMode,
        parseMode: parseMode
    };
    const config = { configurable: { thread_id: `${sessionId}_${turnNum}` } };

    const finalState: typeof MainGraphState.State = await graph.invoke(initialState, config);

    return finalState;
};

export const streamGraph = async (
    turnNum: number,
    messages: BaseMessage[] = [],
    sessionId: string,
    providerName: 'OpenAI' | 'Anthropic' | 'Google' | 'Groq',
    providerApiKey: string,
    LLM: string,
    paperDetails: paperDetailsType,
    userQuery: string,
    attachedImageObjects: imageObjectType[] = [],
    attachedFileObjects: fileObjectType[] = [],
    paperFigureObjects: imageObjectType[] = [],
    paperTableObjects: fileObjectType[] = [],
    paperFigureLabels: string[] = [],
    paperTableLabels: string[] = [],
    embeddingApiKey: string,
    // isQueryEnhancerEnabled: boolean = false,
    isRetrievalQualityEnhancerEnabled: boolean = false,
    isFollowUpSuggestionsEnabled: boolean = false,
    vectorstore: MemoryVectorStore,
    onlyText: boolean = false,
    citationMode: boolean = false,
    parseMode: 'Default' | 'Advanced'
): Promise<IterableReadableStream<any>> => {
    const initialState: typeof MainGraphState.State = {
        messages: messages,
        sessionId: sessionId,
        providerName: providerName,
        providerApiKey: providerApiKey,
        LLM: LLM,
        paperDetails: paperDetails,
        userQuery: userQuery,
        attachedImageObjects: attachedImageObjects,
        attachedImageSummaries: [],
        attachedFileObjects: attachedFileObjects,
        attachedFileSummaries: [],
        paperFigureObjects: paperFigureObjects,
        paperTableObjects: paperTableObjects,
        paperFigureLabels: paperFigureLabels,
        paperTableLabels: paperTableLabels,
        embeddingApiKey: embeddingApiKey,
        searchEmbeddings: [],
        // isQueryEnhancerEnabled: isQueryEnhancerEnabled,
        // queryEnhancements: [],
        // chosenEnhancement: -1,
        isRetrievalQualityEnhancerEnabled: isRetrievalQualityEnhancerEnabled,
        retrievalQualityEnhancements: [],
        rqeSubQueryStatuses: [],
        retrievedDocuments: [],
        fusedRetrievedDocuments: [],
        finalAnswer: "",
        isFollowUpSuggestionsEnabled: isFollowUpSuggestionsEnabled,
        followUpSuggestions: [],
        vectorstore: vectorstore,
        onlyText: onlyText,
        citationMode: citationMode,
        parseMode: parseMode
    };
    const config = { configurable: { thread_id: `${sessionId}_${turnNum}` } };

    const stream = await graph.stream(
        initialState,
        { ...config, streamMode: ["updates", "messages"], subgraphs: true},
    );
    return stream;
};

// export const continueFromQueryEnhancement = async (
//     sessionId: string, turnNum: number, chosenEnhancement: number, vectorstore: MemoryVectorStore
// ): Promise<IterableReadableStream<any>> => {
//     console.log("continueFromQueryEnhancement turnNum:", turnNum);
//     const config = { configurable: { thread_id: `${sessionId}_${turnNum}` } };

//     const currState = await graph.getState(config, { subgraphs: true });
//     console.log("currState:", currState);

//     await graph.updateState((currState.tasks[2].state as StateSnapshot).config, { chosenEnhancement: chosenEnhancement, vectorstore: vectorstore }, "userSelectQueryEnhancement");

//     const updatedState = await graph.getState(config, { subgraphs: true });
//     console.log("updatedState:", updatedState);

//     const stream = await graph.stream(
//         null,
//         { ...config, streamMode: ["updates", "messages"], subgraphs: true }
//     );
//     return stream;
// }

// export const streamGraphForLatencyTracing = async (
//     turnNum: number,
//     messages: BaseMessage[] = [],
//     sessionId: string,
//     providerName: 'OpenAI' | 'Anthropic' | 'Google' | 'Groq',
//     providerApiKey: string,
//     LLM: string,
//     paperDetails: paperDetailsType,
//     userQuery: string,
//     attachedImageObjects: imageObjectType[] = [],
//     attachedFileObjects: fileObjectType[] = [],
//     paperFigureObjects: imageObjectType[] = [],
//     paperTableObjects: fileObjectType[] = [],
//     paperFigureLabels: string[] = [],
//     paperTableLabels: string[] = [],
//     embeddingApiKey: string,
//     isRetrievalQualityEnhancerEnabled: boolean = false,
//     isFollowUpSuggestionsEnabled: boolean = false,
//     vectorstore: MemoryVectorStore,
//     onlyText: boolean = false,
//     citationMode: boolean = false,
//     parseMode: 'Default' | 'Advanced'
// ): Promise<IterableReadableStream<any>> => {
//     performance.clearMarks();
//     performance.clearMeasures();

//     const overallStartMark = `graph_start_${sessionId}_${turnNum}`;
//     performance.mark(overallStartMark);
    
//     const initialState: typeof MainGraphState.State = {
//         messages: messages,
//         sessionId: sessionId,
//         providerName: providerName,
//         providerApiKey: providerApiKey,
//         LLM: LLM,
//         paperDetails: paperDetails,
//         userQuery: userQuery,
//         attachedImageObjects: attachedImageObjects,
//         attachedImageSummaries: [],
//         attachedFileObjects: attachedFileObjects,
//         attachedFileSummaries: [],
//         paperFigureObjects: paperFigureObjects,
//         paperTableObjects: paperTableObjects,
//         paperFigureLabels: paperFigureLabels,
//         paperTableLabels: paperTableLabels,
//         embeddingApiKey: embeddingApiKey,
//         searchEmbeddings: [],
//         isRetrievalQualityEnhancerEnabled: isRetrievalQualityEnhancerEnabled,
//         retrievalQualityEnhancements: [],
//         rqeSubQueryStatuses: [],
//         retrievedDocuments: [],
//         fusedRetrievedDocuments: [],
//         finalAnswer: "",
//         isFollowUpSuggestionsEnabled: isFollowUpSuggestionsEnabled,
//         followUpSuggestions: [],
//         vectorstore: vectorstore,
//         onlyText: onlyText,
//         citationMode: citationMode,
//         parseMode: parseMode
//     };
    
//     const config = { 
//         configurable: { thread_id: `${sessionId}_${turnNum}` }
//     };

//     let firstTokenGenerated = false;
    
//     const stream = await graph.stream(
//         initialState,
//         { 
//             ...config, 
//             streamMode: ["updates", "messages"], 
//             subgraphs: true,
//             callbacks: [{
//                 handleChainEnd: async (outputs: any, runId: string, parentRunId: string, tags?: string[]) => {
//                     if (tags && tags.includes("retrieveFromVectorstore")) {
//                         const retrievalEndMark = `retrieval_end_${sessionId}_${turnNum}`;
//                         performance.mark(retrievalEndMark);
//                         performance.measure('Query Latency', overallStartMark, retrievalEndMark);
//                         console.log(`Query Latency: ${performance.getEntriesByName('Query Latency')[0].duration}ms`);
//                     }
//                 }
//             }]
//         }
//     );
    
//     const wrappedStream = new TransformStream({
//         transform(chunk: any, controller: TransformStreamDefaultController) {
//             if (!firstTokenGenerated && 
//                 chunk[1] === 'messages' &&
//                 chunk[0][0].includes("generateResponse")) {
//                 firstTokenGenerated = true;
//                 const firstTokenMark = `first_token_${sessionId}_${turnNum}`;
//                 performance.mark(firstTokenMark);
//                 performance.measure('Response Latency', overallStartMark, firstTokenMark);
//                 console.log(`Response Latency: ${performance.getEntriesByName('Response Latency')[0].duration}ms`);
//             }
//             controller.enqueue(chunk);
//         }
//     });
    
//     const pipeResult = stream.pipeThrough(wrappedStream);
    
//     const iterableStream = {
//         ...pipeResult,
//         reader: undefined as any,
        
//         ensureReader() {
//             if (!this.reader) {
//                 this.reader = pipeResult.getReader();
//             }
//             return this.reader;
//         },
        
//         async next() {
//             const reader = this.ensureReader();
//             const { done, value } = await reader.read();
//             return { done, value: done ? undefined : value };
//         },
        
//         async return() {
//             if (this.reader) {
//                 await this.reader.cancel();
//                 this.reader = undefined;
//             }
//             return { done: true, value: undefined };
//         },
        
//         [Symbol.asyncIterator]() {
//             return {
//                 next: () => this.next(),
//                 return: () => this.return(),
//                 throw: async (e: any) => {
//                     if (this.reader) {
//                         await this.reader.cancel();
//                     }
//                     throw e;
//                 }
//             };
//         },
        
//         [Symbol.asyncDispose]: async function() {
//             return this.return();
//         },
        
//         cancel: pipeResult.cancel?.bind(pipeResult),
//         getReader: pipeResult.getReader?.bind(pipeResult),
//         pipeThrough: pipeResult.pipeThrough?.bind(pipeResult),
//         pipeTo: pipeResult.pipeTo?.bind(pipeResult),
//         tee: pipeResult.tee?.bind(pipeResult),
//         locked: pipeResult.locked
//     } as unknown as IterableReadableStream<any>;
    
//     return iterableStream;
// };