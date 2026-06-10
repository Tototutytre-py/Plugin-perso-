/**
 * Analyse les messages d'un utilisateur pour construire un profil de style d'écriture
 * Utilisé pour adapter les réponses IA au style de l'utilisateur
 */

import { StyleProfile } from "./storage";

// Mots vides français/anglais à ignorer lors de l'analyse
const STOP_WORDS = new Set([
    // Anglais
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "is", "are", "be", "been",
    "have", "has", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "must",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us", "them",
    // Français
    "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "dans", "sur", "à", "pour", "de", "est", "sont",
    "avoir", "être", "je", "tu", "il", "elle", "nous", "vous", "ils", "elles", "me", "te", "se", "qui", "que",
]);

/**
 * Extrait les emojis d'un texte
 */
function extractEmojis(text: string): number {
    const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|[\ud83c-\ud83e][\ud800-\udfff])/g;
    const matches = text.match(emojiRegex);
    return matches ? matches.length : 0;
}

/**
 * Extrait et compte les mots significatifs (pas les stop words)
 */
function extractSignificantWords(text: string): Map<string, number> {
    const words = new Map<string, number>();
    const wordList = text
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 2 && !STOP_WORDS.has(w))
        .slice(0, 100); // Limiter pour performance
    
    for (const word of wordList) {
        words.set(word, (words.get(word) ?? 0) + 1);
    }
    
    return words;
}

/**
 * Détecte le niveau de formalité (tutoiement/vouvoiement)
 * Retourne un score entre 0 (très informel) et 1 (très formel)
 */
function calculateFormalityScore(text: string): number {
    const lowerText = text.toLowerCase();
    
    // Indicateurs informels
    const informalMarkers = /\b(yo|dude|hey|lol|omg|wtf|gonna|wanna|gotta|ain't|u|r)\b/g;
    const informalCount = (lowerText.match(informalMarkers) || []).length;
    
    // Indicateurs formels (vouvoiement, termes professionnels)
    const formalMarkers = /\b(vous|monsieur|madame|cordiales|respectueusement|cher|chère|professionnel|client|rapport)\b/gi;
    const formalCount = (lowerText.match(formalMarkers) || []).length;
    
    const total = informalCount + formalCount;
    if (total === 0) return 0.5; // Neutre
    
    return formalCount / total;
}

/**
 * Compte la fréquence de la ponctuation
 * Retourne un score entre 0 et 1
 */
function calculatePunctuationScore(text: string): number {
    const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount === 0) return 0;
    return Math.min(punctuationCount / wordCount, 1);
}

/**
 * Analyze un message et retourne ses caractéristiques
 */
function analyzeMessage(text: string) {
    return {
        length: text.length,
        emojiCount: extractEmojis(text),
        formalityScore: calculateFormalityScore(text),
        punctuationScore: calculatePunctuationScore(text),
        words: extractSignificantWords(text),
    };
}

/**
 * Crée ou met à jour un profil de style à partir d'une liste de messages
 */
export function buildStyleProfile(messages: string[]): StyleProfile {
    if (messages.length === 0) {
        return {
            messageCount: 0,
            averageLength: 0,
            emojiFrequency: 0,
            formalityScore: 0.5,
            punctuationScore: 0.5,
            commonWords: new Map(),
            lastUpdated: Date.now(),
        };
    }

    // Analyser tous les messages
    const analyses = messages.map(msg => analyzeMessage(msg));
    
    // Combiner les résultats
    const totalLength = analyses.reduce((sum, a) => sum + a.length, 0);
    const totalEmojis = analyses.reduce((sum, a) => sum + a.emojiCount, 0);
    const avgFormality = analyses.reduce((sum, a) => sum + a.formalityScore, 0) / analyses.length;
    const avgPunctuation = analyses.reduce((sum, a) => sum + a.punctuationScore, 0) / analyses.length;
    
    // Fusionner tous les mots significatifs
    const commonWords = new Map<string, number>();
    for (const analysis of analyses) {
        for (const [word, count] of analysis.words) {
            commonWords.set(word, (commonWords.get(word) ?? 0) + count);
        }
    }
    
    // Garder seulement les 50 mots les plus fréquents
    const sortedWords = Array.from(commonWords.entries() as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
    
    return {
        messageCount: messages.length,
        averageLength: Math.round(totalLength / messages.length),
        emojiFrequency: totalEmojis / messages.length,
        formalityScore: avgFormality,
        punctuationScore: avgPunctuation,
        commonWords: new Map(sortedWords),
        lastUpdated: Date.now(),
    };
}

/**
 * Fusionne deux profils de style (pour mise à jour progressive)
 */
export function mergeStyleProfiles(existing: StyleProfile, newAnalysis: StyleProfile): StyleProfile {
    const totalMessages = existing.messageCount + newAnalysis.messageCount;
    
    // Moyenne pondérée
    const newAverageLength = Math.round(
        (existing.averageLength * existing.messageCount + newAnalysis.averageLength * newAnalysis.messageCount) / totalMessages
    );
    
    const newEmojiFrequency = 
        (existing.emojiFrequency * existing.messageCount + newAnalysis.emojiFrequency * newAnalysis.messageCount) / totalMessages;
    
    const newFormalityScore =
        (existing.formalityScore * existing.messageCount + newAnalysis.formalityScore * newAnalysis.messageCount) / totalMessages;
    
    const newPunctuationScore =
        (existing.punctuationScore * existing.messageCount + newAnalysis.punctuationScore * newAnalysis.messageCount) / totalMessages;
    
    // Fusionner les mots communs
    const mergedWords = new Map(existing.commonWords);
    for (const [word, count] of newAnalysis.commonWords) {
        mergedWords.set(word, (mergedWords.get(word) ?? 0) + count);
    }
    
    // Garder les 50 mots les plus fréquents
    const sortedWords = Array.from(mergedWords.entries() as Array<[string, number]>)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50);
    
    return {
        messageCount: totalMessages,
        averageLength: newAverageLength,
        emojiFrequency: newEmojiFrequency,
        formalityScore: newFormalityScore,
        punctuationScore: newPunctuationScore,
        commonWords: new Map(sortedWords),
        lastUpdated: Date.now(),
    };
}
