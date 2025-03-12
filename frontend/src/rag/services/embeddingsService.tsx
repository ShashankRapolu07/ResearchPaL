import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";

export const getSingleEmbedding = async (text: string, taskType: string = "RETRIEVAL_QUERY", googleApiKey: string | undefined): Promise<number[] | null> => {
    if (taskType === "RETRIEVAL_QUERY") {
        const embedModel: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_QUERY,
            apiKey: googleApiKey
        });
        const singleVector: number[] = await embedModel.embedQuery(text);
        return singleVector;
    } else if (taskType === "RETRIEVAL_DOCUMENT") {
        const embedModel: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });
        const singleVector: number[] = await embedModel.embedDocuments([text])[0];
        return singleVector;
    } else {
        return null;
    }
}

export const getMultipleEmbeddings = async (texts: string[], taskType: string = "RETRIEVAL_DOCUMENT", googleApiKey: string | undefined): Promise<number[][] | null> => {
    if (taskType === "RETRIEVAL_QUERY") {
        const embedModel: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_QUERY,
            apiKey: googleApiKey
        });
        const multipleVectors: number[][] = await embedModel.embedDocuments(texts);
        return multipleVectors;
    } else if (taskType === "RETRIEVAL_DOCUMENT") {
        const embedModel: GoogleGenerativeAIEmbeddings = new GoogleGenerativeAIEmbeddings({
            model: "text-embedding-004",
            taskType: TaskType.RETRIEVAL_DOCUMENT,
            apiKey: googleApiKey
        });
        const multipleVectors: number[][] = await embedModel.embedDocuments(texts);
        return multipleVectors;
    } else {
        return null;
    }
}