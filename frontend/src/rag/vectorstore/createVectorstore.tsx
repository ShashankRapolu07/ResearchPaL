import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { Document } from "@langchain/core/documents";

const NULL_EMBEDDINGS_THRESHOLD: number = 5;

interface chunkObjType {
    id: string,
    type: string,
    page: number,
    bounds: number[],
    content: string
}

interface defaultMetadataType {
    type: string,
    docId: string,
    sessionId: string
}

function properCreationCheck(embeddings: number[][]): boolean {
    let nullEmbeddings: number = 0;
    embeddings.forEach((embd: number[]) => {
        if (embd.length === 0) {
            nullEmbeddings += 1;
        }
    })

    if (nullEmbeddings > NULL_EMBEDDINGS_THRESHOLD) {
        return false;
    }
    return true;
};

export const createDefaultVectorstore = async (sessionId: string, texts: string[], googleApiKey: string): Promise<MemoryVectorStore | string> => {
    try {
        const embed_model: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });
    
        const vectorstore: MemoryVectorStore = new MemoryVectorStore(embed_model);
    
        let textDocuments: Document[] = [];
    
        texts.map((text, idx) => {
            textDocuments.push(
                new Document({
                    id: String(idx),
                    pageContent: text,
                    metadata: {
                        docId: String(idx),
                        type: "text",
                        sessionId: sessionId
                    }
                })
            );
        });
    
        await vectorstore.addDocuments(textDocuments);

        let embeddings: number[][] = [];
        vectorstore.memoryVectors.map((memVec) => {
            embeddings.push(memVec.embedding);
        })

        const checkResult: boolean = properCreationCheck(embeddings);

        if (!checkResult) {
            return "Failed to create vectorstore.";
        }
    
        return vectorstore;
    } catch (error) {
        return "Failed to create vectorstore.";
    }
}

export const createAdvancedVectorstore = async (sessionId: string, chunks: chunkObjType[], googleApiKey: string): Promise<MemoryVectorStore | string> => {
    try {
        const embed_model: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });
    
        const vectorstore: MemoryVectorStore = new MemoryVectorStore(embed_model);
    
        let chunkDocuments: Document[] = [];
    
        chunks.map((chunkObj: chunkObjType) => {
            chunkDocuments.push(
                new Document({
                    id: chunkObj.id,
                    pageContent: chunkObj.content,
                    metadata: {
                        docId: chunkObj.id,
                        type: chunkObj.type,
                        page: chunkObj.page,
                        bounds: chunkObj.bounds,
                        sessionId: sessionId
                    }
                })
            );
        });
    
        await vectorstore.addDocuments(chunkDocuments);

        let embeddings: number[][] = [];
        vectorstore.memoryVectors.map((memVec) => {
            embeddings.push(memVec.embedding);
        })

        const checkResult: boolean = properCreationCheck(embeddings);

        if (!checkResult) {
            return "Failed to create vectorstore.";
        }
    
        return vectorstore;
    } catch (error) {
        return "Failed to create vectorstore.";
    }
}

export const loadDefaultVectorstore = async (embeddings: number[][], texts: string[], metadatas: defaultMetadataType[], googleApiKey: string): Promise<MemoryVectorStore | string> => {
    try {
        const embed_model: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });

        const vectorstore: MemoryVectorStore = new MemoryVectorStore(embed_model);

        let textDocuments: Document[] = [];

        texts.map((text, idx) => {
            textDocuments.push(
                new Document({
                    id: metadatas[idx].docId,
                    pageContent: text,
                    metadata: metadatas[idx]
                })
            );
        });

        await vectorstore.addVectors(embeddings, textDocuments);

        return vectorstore;
    } catch (error) {
        return "Failed to load vectorstore."
    }
}

export const loadAdvancedVectorstore = async (sessionId: string, embeddings: number[][], chunks: chunkObjType[], googleApiKey: string): Promise<MemoryVectorStore | string> => {
    try {
        const embed_model: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });

        const vectorstore: MemoryVectorStore = new MemoryVectorStore(embed_model);

        let chunkDocuments: Document[] = [];

        chunks.map((chunkObj: chunkObjType) => {
            chunkDocuments.push(
                new Document({
                    id: chunkObj.id,
                    pageContent: chunkObj.content,
                    metadata: {
                        docId: chunkObj.id,
                        type: chunkObj.type,
                        page: chunkObj.page,
                        bounds: chunkObj.bounds,
                        sessionId: sessionId
                    }
                })
            );
        });

        await vectorstore.addVectors(embeddings, chunkDocuments);

        return vectorstore;
    } catch (error) {
        return "Failed to load vectorstore."
    }
}