import { Annotation, messagesStateReducer, Send, NodeInterrupt } from "@langchain/langgraph/web";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { BaseMessage, SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, PromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { getMultipleEmbeddings } from './services/embeddingsService.tsx';
import { type Document } from "@langchain/core/documents";
import { MemoryVectorStore } from 'langchain/vectorstores/memory.js';
import { type RunnableConfig } from '@langchain/core/runnables.js';
import {
    USER_IMAGE_SUMMARY_PROMPT_TEMPLATE,
    USER_FILE_SUMMARY_PROMPT_TEMPLATE,
    // QUERY_ENHANCER_PROMPT_TEMPLATE,
    RETRIEVAL_QUALITY_ENHANCER_PROMPT_TEMPLATE,
    GENERATION_PROMPT_TEMPLATE_normal_mode,
    GENERATION_PROMPT_TEMPLATE_citation_mode,
    FOLLOW_UP_QUESTIONS_PROMPT_TEMPLATE
} from './promptTemplates.tsx';
import { Settings } from "./config.tsx";


interface paperDetailsType {
    title: string;
    datePublished: string;
    authors: string[];
    codeURL: string;
    codeFramework: string;
    githubStars: number;
}

interface imageObjectType {
    name: string;
    data: string;
}

interface fileObjectType {
    name: string;
    data: string;
}

interface rqeSubqueryStatusType {
    subQueryIdx: number;
    fromRQE: boolean;
    success: boolean;
    error: string | null;
}

interface fileDataObjForPromptType {
    fileData: string;
}


const getLLM = (providerName: string, llm: string, providerApiKey: string | undefined, temperature: number = 0.7): (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq | undefined) => {
    if (!providerApiKey) {
        throw new Error("Provider API key must be provided.");
    }

    if (providerName === "OpenAI") {
        if (llm === "GPT-4o mini") {
            return new ChatOpenAI({
                model: "gpt-4o-mini",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "GPT-4o") {
            return new ChatOpenAI({
                model: "gpt-4o",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else {
            throw new Error("Invalid OpenAI model.");
        }
    } else if (providerName === "Anthropic") {
        if (llm === "Claude 3.5 Haiku") {
            return new ChatAnthropic({
                model: "claude-3-5-haiku-20241022",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Claude 3.5 Sonnet") {
            return new ChatAnthropic({
                model: "claude-3-5-sonnet-20241022",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Claude 3.5 Opus") {
            return new ChatAnthropic({
                model: "claude-3-opus-20240229",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else {
            throw new Error("Invalid Anthropic model.");
        }
    } else if (providerName === "Google") {
        if (llm === "Gemini 2.0 Flash-Lite") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-2.0-flash-lite-preview-02-05",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Gemini 2.0 Flash") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-2.0-flash",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Gemini 2.0 Pro") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-2.0-pro-exp-02-05",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Gemini 1.5 Flash-8B") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-1.5-flash-8b",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Gemini 1.5 Flash") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-1.5-flash",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Gemini 1.5 Pro") {
            return new ChatGoogleGenerativeAI({
                model: "gemini-1.5-pro",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else {
            throw new Error("Invalid Google model.");
        }
    } else if (providerName === "Groq") {
        if (llm === "Mixtral-8x7B") {
            return new ChatGroq({
                model: "mixtral-8x7b-32768",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Llama 3.1-8B") {
            return new ChatGroq({
                model: "llama-3.1-8b-instant",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else if (llm === "Llama 3.3-70B") {
            return new ChatGroq({
                model: "llama-3.3-70b-versatile",
                apiKey: providerApiKey,
                temperature: temperature
            });
        } else {
            throw new Error("Invalid Groq model.");
        }
    }
}

const getImageSummarizerAgent = (providerName: string, providerApiKey: string | undefined): ReturnType<typeof getLLM> => {
    let preferredLLM: string = "";

    if (providerName === "OpenAI") {
        preferredLLM = "GPT-4o mini";
    } else if (providerName === "Anthropic") {
        preferredLLM = "Claude 3.5 Sonnet";
    } else if (providerName === "Google") {
        preferredLLM = "Gemini 1.5 Flash-8B";
    }

    return getLLM(providerName, preferredLLM, providerApiKey, 0);
}

const getFileSummarizerAgent = (providerName: string, providerApiKey: string | undefined): ReturnType<typeof getLLM> => {
    let preferredLLM: string = "";

    if (providerName === "OpenAI") {
        preferredLLM = "GPT-4o mini";
    } else if (providerName === "Anthropic") {
        preferredLLM = "Claude 3.5 Sonnet";
    } else if (providerName === "Google") {
        preferredLLM = "Gemini 1.5 Flash-8B";
    }

    return getLLM(providerName, preferredLLM, providerApiKey, 0);
}

// const getQueryEnhancerAgent = (providerName: string, providerApiKey: string | undefined): ReturnType<typeof getLLM> => {
//     let preferredLLM: string = "";

//     if (providerName === "OpenAI") {
//         preferredLLM = "GPT-4o mini";
//     } else if (providerName === "Anthropic") {
//         preferredLLM = "Claude 3.5 Haiku";
//     } else if (providerName === "Google") {
//         preferredLLM = "Gemini 1.5 Flash-8B";
//     } else if (providerName === "Groq") {
//         preferredLLM = "Llama 3.1-8B";
//     }

//     return getLLM(providerName, preferredLLM, providerApiKey);
// }

const getRetrievalQualityEnhancerAgent = (providerName: string, providerApiKey: string | undefined): ReturnType<typeof getLLM> => {
    let preferredLLM: string = "";

    if (providerName === "OpenAI") {
        preferredLLM = "GPT-4o mini";
    } else if (providerName === "Anthropic") {
        preferredLLM = "Claude 3.5 Haiku";
    } else if (providerName === "Google") {
        preferredLLM = "Gemini 1.5 Flash-8B";
    } else if (providerName === "Groq") {
        preferredLLM = "Llama 3.1-8B";
    }

    return getLLM(providerName, preferredLLM, providerApiKey);
}

const getFollowUpGenerationAgent = (providerName: string, providerApiKey: string | undefined): ReturnType<typeof getLLM> => {
    let preferredLLM: string = "";

    if (providerName === "OpenAI") {
        preferredLLM = "GPT-4o mini";
    } else if (providerName === "Anthropic") {
        preferredLLM = "Claude 3.5 Haiku";
    } else if (providerName === "Google") {
        preferredLLM = "Gemini 1.5 Flash-8B";
    } else if (providerName === "Groq") {
        preferredLLM = "Llama 3.1-8B";
    }

    return getLLM(providerName, preferredLLM, providerApiKey);
}

const destringify = (strList: string): string[] | null => {
    try {
        if (strList.startsWith("```python")) {
            strList = strList.trim().slice(9, -3).trim();
        } else if (strList.startsWith("```json") || strList.startsWith("```text")) {
            strList = strList.trim().slice(7, -3).trim();
        } else if (strList.startsWith("```")) {
            strList = strList.trim().slice(3, -3).trim();
        }
        return JSON.parse(strList);
    } catch (e) {
        console.log("parse error:", e);
        return null;
    }
}


export const MainGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => []
    }),
    sessionId: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerName: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerApiKey: Annotation<string>({
        reducer: (state: string, update: string) => update,
    }),
    LLM: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    paperDetails: Annotation<paperDetailsType>({
        reducer: (state: paperDetailsType, update: paperDetailsType) => update
    }),
    userQuery: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    attachedImageObjects: Annotation<imageObjectType[]>({
        reducer: (state: imageObjectType[], update: imageObjectType[]) => update,
        default: () => []
    }),
    attachedImageSummaries: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    attachedFileObjects: Annotation<fileObjectType[]>({
        reducer: (state: fileObjectType[], update: fileObjectType[]) => update,
        default: () => []
    }),
    attachedFileSummaries: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    paperFigureObjects: Annotation<imageObjectType[]>({
        reducer: (state: imageObjectType[], update: imageObjectType[]) => update,
        default: () => []
    }),
    paperFigureLabels: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    paperTableObjects: Annotation<fileObjectType[]>({
        reducer: (state: fileObjectType[], update: fileObjectType[]) => update,
        default: () => []
    }),
    paperTableLabels: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    embeddingApiKey: Annotation<string>({
        reducer: (state: string, update: string) => update,
    }),
    searchEmbeddings: Annotation<number[][]>({
        reducer: (state: number[][], update: number[][]) => update,
        default: () => []
    }),
    // isQueryEnhancerEnabled: Annotation<boolean>({
    //     reducer: (state: boolean, update: boolean) => update,
    //     default: () => false
    // }),
    // queryEnhancements: Annotation<string[]>({
    //     reducer: (state: string[], update: string[]) => update,
    //     default: () => []
    // }),
    // chosenEnhancement: Annotation<number>({
    //     reducer: (state: number, update: number) => update,
    //     default: () => -1
    // }),
    isRetrievalQualityEnhancerEnabled: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    retrievalQualityEnhancements: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    rqeSubQueryStatuses: Annotation<rqeSubqueryStatusType[]>({
        reducer: (state: rqeSubqueryStatusType[], update: rqeSubqueryStatusType[]) => state.concat(update),
        default: () => []
    }),
    vectorstore: Annotation<MemoryVectorStore | undefined>({
        reducer: (state: MemoryVectorStore | undefined, update: MemoryVectorStore | undefined) => update,
    }),
    retrievedDocuments: Annotation<Document[]>({
        reducer: (state: Document[], update: Document[]) => state.concat(update),
        default: () => []
    }),
    fusedRetrievedDocuments: Annotation<Document[]>({
        reducer: (state: Document[], update: Document[]) => update,
        default: () => []
    }),
    finalAnswer: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    isFollowUpSuggestionsEnabled: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    followUpSuggestions: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    parseMode: Annotation<'Default' | 'Advanced'>({
        reducer: (state: 'Default' | 'Advanced', update: 'Default' | 'Advanced') => update,
        default: () => 'Default'
    }),
    onlyText: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    citationMode: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
})

export const TextGraphState = Annotation.Root({
    sessionId: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerName: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerApiKey: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    LLM: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    userQuery: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    // isQueryEnhancerEnabled: Annotation<boolean>({
    //     reducer: (state: boolean, update: boolean) => update,
    //     default: () => false
    // }),
    // queryEnhancements: Annotation<string[]>({
    //     reducer: (state: string[], update: string[]) => update,
    //     default: () => []
    // }),
    // chosenEnhancement: Annotation<number>({
    //     reducer: (state: number, update: number) => update,
    //     default: () => -1
    // }),
    isRetrievalQualityEnhancerEnabled: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    retrievalQualityEnhancements: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    // vectorstore: Annotation<MemoryVectorStore | undefined>({
    //     reducer: (state: MemoryVectorStore | undefined, update: MemoryVectorStore | undefined) => update,
    // })
    paperDetails: Annotation<paperDetailsType>({
        reducer: (state: paperDetailsType, update: paperDetailsType) => update
    }),
    attachedImageObjects: Annotation<imageObjectType[]>({
        reducer: (state: imageObjectType[], update: imageObjectType[]) => update,
        default: () => []
    }),
    attachedFileObjects: Annotation<fileObjectType[]>({
        reducer: (state: fileObjectType[], update: fileObjectType[]) => update,
        default: () => []
    })
})

export const ImageGraphState = Annotation.Root({
    sessionId: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerName: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerApiKey: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    LLM: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    attachedImageObjects: Annotation<imageObjectType[]>({
        reducer: (state: imageObjectType[], update: imageObjectType[]) => update,
        default: () => []
    }),
    attachedImageSummaries: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    onlyText: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    // vectorstore: Annotation<MemoryVectorStore | undefined>({
    //     reducer: (state: MemoryVectorStore | undefined, update: MemoryVectorStore | undefined) => update,
    // })
})

export const FileGraphState = Annotation.Root({
    sessionId: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerName: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerApiKey: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    LLM: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    attachedFileObjects: Annotation<fileObjectType[]>({
        reducer: (state: fileObjectType[], update: fileObjectType[]) => update,
        default: () => []
    }),
    attachedFileSummaries: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    onlyText: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    }),
    // vectorstore: Annotation<MemoryVectorStore | undefined>({
    //     reducer: (state: MemoryVectorStore | undefined, update: MemoryVectorStore | undefined) => update,
    // })
})

export const EmbeddingState = Annotation.Root({
    sessionId: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    providerName: Annotation<string>({
        reducer: (state: string, update: string) => update
    }),
    embedding: Annotation<number[]>({
        reducer: (state: number[], update: number[]) => update,
        default: () => []
    }),
    embeddingIdx: Annotation<number>({
        reducer: (state: number, update: number) => update,
        default: () => -1
    }),
    retrievalQualityEnhancements: Annotation<string[]>({
        reducer: (state: string[], update: string[]) => update,
        default: () => []
    }),
    rqeSubQueryStatuses: Annotation<rqeSubqueryStatusType[]>({
        reducer: (state: rqeSubqueryStatusType[], update: rqeSubqueryStatusType[]) => state.concat(update),
        default: () => []
    }),
    vectorstore: Annotation<MemoryVectorStore | undefined>({
        reducer: (state: MemoryVectorStore | undefined, update: MemoryVectorStore | undefined) => update,
    }),
    parseMode: Annotation<'Default' | 'Advanced'>({
        reducer: (state: 'Default' | 'Advanced', update: 'Default' | 'Advanced') => update,
        default: () => 'Default'
    }),
    onlyText: Annotation<boolean>({
        reducer: (state: boolean, update: boolean) => update,
        default: () => false
    })
})

export const summarizeAttachedImages = async (state: typeof ImageGraphState.State, config?: RunnableConfig) => {
    if (state.onlyText || state.providerName === "Groq" || state.attachedImageObjects.length === 0) {
        return { attachedImageSummaries: [] };
    }

    try {
        const imageSummarizerAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getImageSummarizerAgent(state.providerName, state.providerApiKey)!;

        const imageSummaryPromptsBatch: BaseMessage[][] = state.attachedImageObjects.map(imgObj => [
            new SystemMessage({
                content: USER_IMAGE_SUMMARY_PROMPT_TEMPLATE.system
            }),
            new HumanMessage({
                content: [
                    {
                        type: "text",
                        text: USER_IMAGE_SUMMARY_PROMPT_TEMPLATE.human
                    },
                    {
                        type: "image_url",
                        image_url: { url: `${imgObj.data}` }
                    }
                ]
            })
        ]);

        const summarizationChain = imageSummarizerAgent.pipe(new StringOutputParser());

        const batchResults: string[] = await summarizationChain.batch(imageSummaryPromptsBatch, config);

        return { attachedImageSummaries: batchResults };
    } catch (error) {
        if (state.providerName === 'OpenAI' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Anthropic' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Google' && String(error).toLowerCase().includes("quota exceeded")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Groq' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        }
        return { attachedImageSummaries: [] };
    }
}

export const validateAttachedImages = async (state: typeof ImageGraphState.State, config?: RunnableConfig) => {
    if (state.onlyText || state.providerName === "Groq" || state.attachedImageObjects.length === 0) {
        return { attachedImageSummaries: []};
    }

    for (const imgSummary of state.attachedImageSummaries) {
        if (imgSummary.trim().toLowerCase() === "inappropriate." || imgSummary.trim().toLowerCase() === "inappropriate") {
            throw new NodeInterrupt("One or more of the user images are inappropriate."); // need to check for this case in the frontend
        }
    }

    return { attachedImageSummaries: state.attachedImageSummaries };
}

export const summarizeAttachedFiles = async (state: typeof FileGraphState.State, config?: RunnableConfig) => {
    if (state.onlyText || state.providerName === "Groq" || state.attachedFileObjects.length === 0) {
        return { attachedFileSummaries: [] };
    }

    try {
        const fileSummarizerAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getFileSummarizerAgent(state.providerName, state.providerApiKey)!;

        const fileSummarizationPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
            ["system", USER_FILE_SUMMARY_PROMPT_TEMPLATE.system],
            ["human", USER_FILE_SUMMARY_PROMPT_TEMPLATE.human]
        ]);

        const fileSummarizationChain = fileSummarizationPromptTemplate
            .pipe(fileSummarizerAgent)
            .pipe(new StringOutputParser());

        const fileDataObjsForPrompt: fileDataObjForPromptType[] = state.attachedFileObjects.map(fileObj => {
            return { fileData: fileObj.data };
        });

        const batchResults: string[] = await fileSummarizationChain.batch(fileDataObjsForPrompt, config);

        return { attachedFileSummaries: batchResults };
    } catch (error) {
        if (state.providerName === 'OpenAI' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Anthropic' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Google' && String(error).toLowerCase().includes("quota exceeded")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Groq' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        }
        return { attachedFileSummaries: [] };
    }
}

// export const getQueryEnhancements = async (state: typeof TextGraphState.State, config?: RunnableConfig) => {
//     if (!state.isQueryEnhancerEnabled) return { queryEnhancements: [] };

//     const queryEnhancerAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getQueryEnhancerAgent(state.providerName, state.providerApiKey)!;

//     const queryEnhancementPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
//         ["system", QUERY_ENHANCER_PROMPT_TEMPLATE.system],
//         ["human", QUERY_ENHANCER_PROMPT_TEMPLATE.human]
//     ]);

//     const queryEnhancementChain = queryEnhancementPromptTemplate
//         .pipe(queryEnhancerAgent)
//         .pipe(new StringOutputParser());

//     const result: string = await queryEnhancementChain.invoke({ query: state.userQuery }, config);

//     console.log("result:", result);

//     const parsedResult: string[] | null = destringify(result);

//     console.log("parsedResult:", parsedResult);

//     if (!parsedResult) return { queryEnhancements: [] };

//     return { queryEnhancements: parsedResult };
// }

// export const userSelectQueryEnhancement = async (state: typeof TextGraphState.State, config?: RunnableConfig) => {
//     return { chosenEnhancement: state.chosenEnhancement, vectorstore: state.vectorstore };
// }

// export const queryEnhancerConditionalEdge = (state: typeof TextGraphState.State, config?: RunnableConfig) => {
//     if (state.queryEnhancements.length > 0) {
//         return "userSelectQueryEnhancement";
//     }
//     return "performRetrievalQualityEnhancement";
// }

export const performRetrievalQualityEnhancement = async (state: typeof TextGraphState.State, config?: RunnableConfig) => {
    if (!state.isRetrievalQualityEnhancerEnabled) return { retrievalQualityEnhancements: [] };

    const retrievalQualityEnhancerAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getRetrievalQualityEnhancerAgent(state.providerName, state.providerApiKey)!;

    const retrievalQualityEnhancementPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
        ["system", RETRIEVAL_QUALITY_ENHANCER_PROMPT_TEMPLATE.system],
        state.providerName !== 'Groq' && state.attachedImageObjects.length > 0 ? (
            new HumanMessage({
                content: [
                    { "type": "text", "text": RETRIEVAL_QUALITY_ENHANCER_PROMPT_TEMPLATE.attachedImages },
                    ...state.attachedImageObjects.map(imgObj => {
                        return {
                            type: "image_url",
                            image_url: {
                                url: `${imgObj.data}`
                            }
                        }
                    })
                ]
            })
        ) : new MessagesPlaceholder("empty"),
        state.providerName !== 'Groq' && state.attachedFileObjects.length > 0 ? (
            ["human", RETRIEVAL_QUALITY_ENHANCER_PROMPT_TEMPLATE.attachedFiles]
        ) : new MessagesPlaceholder("empty"),
        ["human", RETRIEVAL_QUALITY_ENHANCER_PROMPT_TEMPLATE.human]
    ]);

    let userFilesData: string = "";
    state.attachedFileObjects.forEach((fileObj) => {
        userFilesData += fileObj.data + "\n\n";
    });
    userFilesData = userFilesData.trim();

    const retrievalQualityEnhancementChain = retrievalQualityEnhancementPromptTemplate
        .pipe(retrievalQualityEnhancerAgent)
        .pipe(new StringOutputParser());
    
    try {
        const result: string = await retrievalQualityEnhancementChain.invoke({
            query: state.userQuery,
            paperTitle: state.paperDetails.title,
            files: userFilesData,
            empty: []
        }, config);
        // if (state.queryEnhancements.length === 0 || state.chosenEnhancement === -1) {
        //     result = await retrievalQualityEnhancementChain.invoke({ query: state.userQuery }, config);
        // } else {
        //     result = await retrievalQualityEnhancementChain.invoke({ query: state.queryEnhancements[state.chosenEnhancement] }, config);
        // }

        let parsedResult: string[] | null = destringify(result);

        if (!parsedResult) return { retrievalQualityEnhancements: [] };

        if (state.providerName === 'Groq') {
            parsedResult = parsedResult.slice(0, 3);
        } else if (parsedResult.length > Settings.MAX_RQE_DECOMPOSITIONS) {
            parsedResult = parsedResult.slice(0, Settings.MAX_RQE_DECOMPOSITIONS);
        }

        return { retrievalQualityEnhancements: parsedResult };
    } catch (error) {
        if (state.providerName === 'OpenAI' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Anthropic' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Google' && String(error).toLowerCase().includes("quota exceeded")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Groq' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        }
        return { retrievalQualityEnhancementChain: [] };
    }
}

export const convertToEmbeddings = async (state: typeof MainGraphState.State, config?: RunnableConfig) => {
    const imagesToEmbed: string[] = state.attachedImageSummaries || [];
    const filesToEmbed: string[] = state.attachedFileSummaries || [];

    let textsToEmbed: string[] = [];
    // removed (state.queryEnhancements.length === 0 || state.chosenEnhancement === -1)
    if (state.retrievalQualityEnhancements.length === 0) {
        textsToEmbed = [state.userQuery];
    } else if (state.retrievalQualityEnhancements.length > 0) {
        textsToEmbed = state.retrievalQualityEnhancements;
    } 
    // else {
    //     console.log("yes");
    //     textsToEmbed = [state.queryEnhancements[state.chosenEnhancement]];
    // }

    try {
        const searchEmbeddings: number[][] | null = await getMultipleEmbeddings(
            [...textsToEmbed, ...imagesToEmbed, ...filesToEmbed],
            "RETRIEVAL_QUERY",
            state.embeddingApiKey
        );
    
        if (!searchEmbeddings) return { searchEmbeddings: [] };
    
        return { searchEmbeddings: searchEmbeddings };
    } catch (error) {
        if (state.providerName === 'OpenAI' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Anthropic' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Google' && String(error).toLowerCase().includes("quota exceeded")) {
            throw new NodeInterrupt("API rate limit reached.");
        } else if (state.providerName === 'Groq' && String(error).toLowerCase().includes("rate limit reached")) {
            throw new NodeInterrupt("API rate limit reached.");
        }
        return { searchEmbeddings: [] };
    }
}

export const parallelizeVectorstoreRetrieval = (state: typeof MainGraphState.State, config?: RunnableConfig) => {
    if (state.searchEmbeddings.length === 0) {
        return [
            new Send("retrieveFromVectorstore", {
                sessionId: state.sessionId,
                providerName: state.providerName,
                embedding: [],
                embeddingIdx: -1,
                retrievalQualityEnhancements: [],
                parseMode: state.parseMode,
                onlyText: state.onlyText,
                vectorstore: state.vectorstore
            })
        ];
    }
    return state.searchEmbeddings.map((embedding, idx) => {
        return new Send("retrieveFromVectorstore", {
            sessionId: state.sessionId,
            providerName: state.providerName,
            embedding: embedding,
            embeddingIdx: idx,
            retrievalQualityEnhancements: state.retrievalQualityEnhancements,
            parseMode: state.parseMode,
            onlyText: state.onlyText,
            vectorstore: state.vectorstore
        });
    })
}

export const retrieveFromVectorstore = async (state: typeof EmbeddingState.State, config?: RunnableConfig) => {
    if (!state.vectorstore) {
        const subQueryStatus: rqeSubqueryStatusType = {
            subQueryIdx: state.embeddingIdx,
            fromRQE: state.embeddingIdx < state.retrievalQualityEnhancements.length,
            success: false,
            error: "Vectorstore not detected."
        };
        return { retrievedDocuments: [], rqeSubQueryStatuses: [subQueryStatus] };
    }

    if (state.embedding.length === 0) return { retrievedDocuments: [], rqeSubQueryStatuses: [] };

    try {
        const filter = (state.onlyText || state.providerName === "Groq" || state.parseMode === "Default") ? (doc: Document) => doc.metadata.type === "text" : undefined;
        const fetchedDocumentsWithScores: [Document, number][] = await state.vectorstore.similaritySearchVectorWithScore(
            state.embedding,
            state.providerName === 'Groq' ? 1 : state.parseMode === 'Advanced' ? Settings.NUM_FETCH_VECTORS_ADVANCED : Settings.NUM_FETCH_VECTORS_DEFAULT,
            filter
        );

        if (fetchedDocumentsWithScores.length === 0) {
            return { retrievedDocuments: [], rqeSubQueryStatuses: [] };
        }

        let fetchedDocuments: Document[] = [];
        fetchedDocumentsWithScores.forEach((tuple) => {
            fetchedDocuments.push(tuple[0]);
        });

        const subQueryStatus: rqeSubqueryStatusType = {
            subQueryIdx: state.embeddingIdx,
            fromRQE: state.embeddingIdx < state.retrievalQualityEnhancements.length,
            success: true,
            error: null
        };

        return { retrievedDocuments: fetchedDocuments, rqeSubQueryStatuses: [subQueryStatus] }
    } catch (error) {
        const subQueryStatus: rqeSubqueryStatusType = {
            subQueryIdx: state.embeddingIdx,
            fromRQE: state.embeddingIdx < state.retrievalQualityEnhancements.length,
            success: false,
            error: String(error)
        };
        return { retrievedDocuments: [], rqeSubQueryStatuses: [subQueryStatus] };
    }
}

export const performRagFusion = async (state: typeof MainGraphState.State, config?: RunnableConfig) => {
    if (state.retrievedDocuments.length === 0) return { retrievedDocuments: [] };

    let fusedDocuments: Document[] = [];
    let visited: Record<string, boolean> = {};

    for (const doc of state.retrievedDocuments) {
        if (!visited[doc.metadata.docId]) {
            fusedDocuments.push(doc);
            visited[doc.metadata.docId] = true;
        }
    }

    return { fusedRetrievedDocuments: fusedDocuments };
}

export const generateResponse = async (state: typeof MainGraphState.State, config?: RunnableConfig) => {
    try {
        const responseGenerationAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getLLM(state.providerName, state.LLM, state.providerApiKey)!;

        const paperImagesPromptTemplate: PromptTemplate = PromptTemplate.fromTemplate(
            state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.paperFigures
                : GENERATION_PROMPT_TEMPLATE_normal_mode.paperFigures
        );
        const userImagesPromptTemplate: PromptTemplate = PromptTemplate.fromTemplate(
            state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.userImages
                : GENERATION_PROMPT_TEMPLATE_normal_mode.userImages
        );

        let retrievedTextData: string = "", retrievedTabularData: string = "";
        let docIds = new Set(state.fusedRetrievedDocuments.map(doc => doc.metadata.docId));
        let retrievedImageObjs = state.onlyText || state.providerName === "Groq" ? [] : (
            state.paperFigureObjects.filter(imgObj => docIds.has(imgObj.name.split('.')[0]))
        );
        retrievedImageObjs = retrievedImageObjs.slice(0, Settings.MAX_RETRIEVED_IMAGES);
        let retrievedTableObjs = state.onlyText || state.providerName === "Groq" ? [] : (
            state.paperTableObjects.filter(tblObj => docIds.has(tblObj.name.split('.')[0]))
        );
        retrievedTableObjs = retrievedTableObjs.slice(0, Settings.MAX_RETRIEVED_TABLES);
        for (const doc of state.fusedRetrievedDocuments) {
            const type: string = doc.metadata.type;
            if (type === "text") {
                retrievedTextData += doc.pageContent + "\n\n";
            }
        };
        for (const tblObj of retrievedTableObjs) {
            retrievedTabularData += tblObj.data + "\n\n";
        };
        retrievedTextData = retrievedTextData.trim();
        retrievedTabularData = retrievedTabularData.trim();

        let userFilesData: string = "";
        state.attachedFileObjects.forEach((fileObj, idx) => {
            userFilesData += `${idx + 1}. ${fileObj.name}\n` + fileObj.data + "\n\n";
        });
        userFilesData = userFilesData.trim();

        const responseGenerationPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
            [
                "system",
                state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.preamble
                    : GENERATION_PROMPT_TEMPLATE_normal_mode.preamble
            ],
            retrievedTextData.length > 0 ? (
                [
                    "ai",
                    state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.paperText
                        : GENERATION_PROMPT_TEMPLATE_normal_mode.paperText
                ]
            ) : new MessagesPlaceholder("empty"),
            state.providerName !== "Groq" && retrievedImageObjs.length > 0 ? (
                new AIMessage({
                    content: [
                        {
                            type: "text",
                            text: await paperImagesPromptTemplate.format({})
                        },
                        ...retrievedImageObjs.map(imgObj => {
                            return {
                                type: "image_url",
                                image_url: { url: `${imgObj.data}` }
                            }
                        })
                    ]
                })
            ) : new MessagesPlaceholder("empty"),
            state.providerName !== "Groq" && retrievedImageObjs.length > 0 && state.paperFigureLabels.length > 0 ? (
                [
                    "ai",
                    state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.paperFigureLabels
                        : GENERATION_PROMPT_TEMPLATE_normal_mode.paperFigureLabels
                ]
            ) : new MessagesPlaceholder("empty"),
            state.providerName !== "Groq" && retrievedTabularData.length > 0 ? (
                [
                    "ai",
                    state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.paperTables
                        : GENERATION_PROMPT_TEMPLATE_normal_mode.paperTables
                ]
            ) : new MessagesPlaceholder("empty"),
            state.providerName !== "Groq" && retrievedTabularData.length > 0 && state.paperTableLabels.length > 0 ? (
                [
                    "ai",
                    state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.paperTableLabels
                        : GENERATION_PROMPT_TEMPLATE_normal_mode.paperTableLabels
                ]
            ) : new MessagesPlaceholder("empty"),
            [
                "human",
                state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.instructions
                    : GENERATION_PROMPT_TEMPLATE_normal_mode.instructions
            ],
            [
                "ai",
                state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.conversationStartIndicator
                    : GENERATION_PROMPT_TEMPLATE_normal_mode.conversationStartIndicator
            ],
            new MessagesPlaceholder("chatHistory"),
            state.providerName !== "Groq" && state.attachedImageObjects.length > 0 ? (
                new HumanMessage({
                    content: [
                        {
                            type: "text",
                            text: await userImagesPromptTemplate.format({})
                        },
                        ...state.attachedImageObjects.map(imgObj => {
                            return {
                                type: "image_url",
                                image_url: {
                                    url: `${imgObj.data}`
                                }
                            }
                        })
                    ]
                })
            ) : new MessagesPlaceholder("empty"),
            state.providerName !== "Groq" && state.attachedFileObjects.length > 0 && userFilesData.length > 0 ? (
                [
                    "human",
                    state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.userFiles
                        : GENERATION_PROMPT_TEMPLATE_normal_mode.userFiles
                ]
            ) : new MessagesPlaceholder("empty"),
            [
                "human",
                state.citationMode ? GENERATION_PROMPT_TEMPLATE_citation_mode.userQuery
                    : GENERATION_PROMPT_TEMPLATE_normal_mode.userQuery
            ]
        ]);

        const responseGenerationChain = responseGenerationPromptTemplate
            .pipe(responseGenerationAgent)
            .pipe(new StringOutputParser());

        // const finalUserQuery: string = (
        //     (state.queryEnhancements.length > 0 && state.chosenEnhancement !== -1)
        //         ? state.queryEnhancements[state.chosenEnhancement] : state.userQuery
        // );

        const finalAnswer: string = await responseGenerationChain.invoke({
            paperTitle: state.paperDetails.title || "<not mentioned>",
            datePublished: state.paperDetails.datePublished || "<not mentioned>",
            codeURL: state.paperDetails.codeURL || "<not mentioned>",
            codeFramework: state.paperDetails.codeFramework || "<not mentioned>",
            githubStars: state.paperDetails.githubStars || "<not mentioned>",
            authors: state.paperDetails.authors.join(", ").trim() || "<not mentioned>",
            chatHistory: state.providerName === 'Groq' ? state.messages.slice(-5) : state.messages.slice(-Settings.CHAT_CONTEXT_WINDOW),
            paperText: retrievedTextData,
            paperTabularData: retrievedTabularData,
            paperFigureLabels: state.paperFigureLabels,
            paperTableLabels: state.paperTableLabels,
            userFiles: userFilesData,
            userQuery: state.userQuery, // replaced finalUserQuery
            empty: []
        }, config);

        return {
            finalAnswer: finalAnswer, // replaced finalUserQuery
            messages: [
                new HumanMessage({
                    content: state.userQuery, 
                    response_metadata: {
                        fromHuman: true,
                        attachedImageObjects: state.attachedImageObjects,
                        attachedFileObjects: state.attachedFileObjects
                    }
                }),
                new AIMessage({
                    content: finalAnswer,
                    response_metadata: {
                        fromHuman: false,
                        // isQueryEnhancerEnabled: state.isQueryEnhancerEnabled,
                        // queryEnhancements: state.queryEnhancements,
                        // chosenEnhancement: state.chosenEnhancement,
                        isRetrievalQualityEnhancerEnabled: state.isRetrievalQualityEnhancerEnabled,
                        retrievalQualityEnhancements: state.retrievalQualityEnhancements,
                        rqeSubQueryStatuses: state.rqeSubQueryStatuses
                    }
                })
            ]
        };
    } catch (err) {
        if (state.providerName === 'OpenAI' && String(err).toLowerCase().includes("incorrect api key provided")) {
            throw new NodeInterrupt("Invalid API key.");
        } else if (state.providerName === 'Anthropic' && String(err).toLowerCase().includes("invalid x-api-key")) {
            throw new NodeInterrupt("Invalid API key.");
        } else if (state.providerName === 'Google' && String(err).toLowerCase().includes("api key not valid")) {
            throw new NodeInterrupt("Invalid API key.");
        } else if (state.providerName === 'Groq' && String(err).toLowerCase().includes("invalid api key")) {
            throw new NodeInterrupt("Invalid API key.");
        } else {
            throw new NodeInterrupt("Some error occurred.");
        }
    }
}

export const generateFollowUpSuggestions = async (state: typeof MainGraphState.State, config?: RunnableConfig) => {
    if (!state.isFollowUpSuggestionsEnabled || state.finalAnswer.length === 0) return { followUpSuggestions: [] };

    try {
        const followUpGeneratorAgent: (ChatOpenAI | ChatAnthropic | ChatGoogleGenerativeAI | ChatGroq) = getFollowUpGenerationAgent(state.providerName, state.providerApiKey)!;

        const followUpSuggestionsPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
            ["system", FOLLOW_UP_QUESTIONS_PROMPT_TEMPLATE.system],
            ["human", FOLLOW_UP_QUESTIONS_PROMPT_TEMPLATE.human]
        ]);

        const followUpGenerationChain = followUpSuggestionsPromptTemplate
            .pipe(followUpGeneratorAgent)
            .pipe(new StringOutputParser());

        // const finalUserQuery: string = (
        //     (state.queryEnhancements.length > 0 && state.chosenEnhancement !== -1)
        //         ? state.queryEnhancements[state.chosenEnhancement] : state.userQuery
        // );

        let retrievedTextData: string = "";
        for (const doc of state.retrievedDocuments) {
            const type: string = doc.metadata.type;
            if (type === "text") {
                retrievedTextData += doc.pageContent + "\n\n";
            } else {
                continue;
            }
        };

        retrievedTextData = retrievedTextData.trim();

        const result: string = await followUpGenerationChain.invoke({
            userQuery: state.userQuery, // replaced finalUserQuery
            relevantContext: retrievedTextData,
            agentResponse: state.finalAnswer
        }, config);

        const parsedResult: string[] | null = destringify(result);

        if (!parsedResult) return { followUpSuggestions: [] };

        return { followUpSuggestions: parsedResult };
    } catch (error) {
        return { followUpSuggestions: [] };
    }
}