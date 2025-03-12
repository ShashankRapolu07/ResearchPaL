import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SUGGESTIONS_PROMPT_TEMPLATE } from "./promptTemplates.tsx";
import { StringOutputParser } from "@langchain/core/output_parsers";

const MAX_CHUNKS_LIMIT_DEFAULT: number = 3;
const MAX_CHUNKS_LIMIT_ADVANCED: number = 10;
const MAX_CHUNKS_LIMIT_USER: number = 25;

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

export const getInitialSugesstions = async (
    textChunks: string[] | undefined, googleApiKey: string, fromUser: boolean = false, parseMode: string = "Default"
): Promise<string[] | null> => {
    if (!textChunks) return null;

    try {
        const suggestionsGeneratorAgent: ChatGoogleGenerativeAI = new ChatGoogleGenerativeAI({
            model: "gemini-1.5-flash-8b",
            apiKey: googleApiKey,
            temperature: 0
        });
    
        const suggestionsGenerationPromptTemplate: ChatPromptTemplate = ChatPromptTemplate.fromMessages([
            ["system", SUGGESTIONS_PROMPT_TEMPLATE.system],
            ["human", SUGGESTIONS_PROMPT_TEMPLATE.human]
        ]);
    
        const suggestionsGenerationChain = suggestionsGenerationPromptTemplate
            .pipe(suggestionsGeneratorAgent)
            .pipe(new StringOutputParser())

        let textData: string = "";
        for (let i = 0; i < Math.max(textChunks.length, fromUser ? MAX_CHUNKS_LIMIT_USER : parseMode === "Advanced" ? MAX_CHUNKS_LIMIT_ADVANCED : MAX_CHUNKS_LIMIT_DEFAULT); i++) {
            textData += textChunks[i];
        }

        const res = await suggestionsGenerationChain.invoke({ paperContents: textChunks });

        let parsedResult: string[] | null = destringify(res);

        if (parsedResult) {
            parsedResult = parsedResult.slice(0, 4);
        } else {
            const suggestionsGeneratorAgentBackup: ChatGoogleGenerativeAI = new ChatGoogleGenerativeAI({
                model: "gemini-1.5-flash",
                apiKey: googleApiKey,
                temperature: 0
            });

            const suggestionsGenerationChainBackup = suggestionsGenerationPromptTemplate
                .pipe(suggestionsGeneratorAgentBackup)
                .pipe(new StringOutputParser());

            const resBackup = await suggestionsGenerationChainBackup.invoke({ paperContents: textChunks });

            let parsedResultBackup: string[] | null = destringify(resBackup);

            if (parsedResultBackup) {
                parsedResultBackup = parsedResultBackup.slice(0, 4);
            } else {
                const suggestionsGeneratorAgentBackup: ChatGoogleGenerativeAI = new ChatGoogleGenerativeAI({
                    model: "gemini-2.0-flash-lite-preview-02-05",
                    apiKey: googleApiKey,
                    temperature: 0
                });
    
                const suggestionsGenerationChainBackup = suggestionsGenerationPromptTemplate
                    .pipe(suggestionsGeneratorAgentBackup)
                    .pipe(new StringOutputParser());
    
                const resBackupBackup = await suggestionsGenerationChainBackup.invoke({ paperContents: textChunks });
    
                let parsedResultBackupBackup: string[] | null = destringify(resBackupBackup);

                if (parsedResultBackupBackup) {
                    parsedResultBackupBackup = parsedResultBackupBackup.slice(0, 4);
                } else {
                    const suggestionsGeneratorAgentBackup: ChatGoogleGenerativeAI = new ChatGoogleGenerativeAI({
                        model: "gemini-2.0-flash",
                        apiKey: googleApiKey,
                        temperature: 0
                    });
        
                    const suggestionsGenerationChainBackup = suggestionsGenerationPromptTemplate
                        .pipe(suggestionsGeneratorAgentBackup)
                        .pipe(new StringOutputParser());
        
                    const resBackupBackupBackup = await suggestionsGenerationChainBackup.invoke({ paperContents: textChunks });
        
                    let parsedResultBackupBackupBackup: string[] | null = destringify(resBackupBackupBackup);

                    if (parsedResultBackupBackupBackup) {
                        parsedResultBackupBackupBackup = parsedResultBackupBackupBackup.slice(0, 4);
                    } else {
                        throw new Error("Failed to parse suggestions.")
                    }

                    return parsedResultBackupBackupBackup;
                }

                return parsedResultBackupBackup;
            }

            return parsedResultBackup;
        }
    
        return parsedResult;
    } catch (error) {
        console.error("Error generating initial suggestions:", error);
        return null;
    }
}