/**
 * Gère la réception de messages et déclenche la génération de réponses IA
 * S'intègre aux événements Discord pour les messages entrants
 */

import { createAIProvider } from "./aiProvider";
import { buildStyleProfile, mergeStyleProfiles } from "./styleProfiler";
import { generateAIResponse, getRecentMessages } from "./messageProcessor";
import {
    getConversationState,
    getStyleProfile,
    setStyleProfile,
} from "./storage";

export interface MessageReceiverOptions {
    onResponseGenerated?: (response: string) => void;
    onError?: (error: Error) => void;
}

/**
 * Gestionnaire pour la réception et le traitement des messages
 */
export class MessageReceiver {
    private aiProvider: any;
    private options: MessageReceiverOptions;
    private styleProfileCache = new Map<string, number>(); // Cache du nombre de messages traités

    constructor(options: MessageReceiverOptions = {}) {
        this.options = options;
    }

    /**
     * Configure le fournisseur IA
     */
    setAIProvider(provider: any) {
        this.aiProvider = provider;
    }

    /**
     * Récupère les derniers messages d'un canal
     * NOTE: Cette fonction nécessite une intégration plus profonde avec l'API Discord
     * Pour maintenant, elle retourne un array vide - à implémenter avec les hooks appropriés
     */
    private async fetchUserMessages(channelId: string, limit: number): Promise<string[]> {
        try {
            // TODO: Intégrer avec l'API Discord pour récupérer les messages réels
            // Cette implémentation nécessite l'accès à MessageStore ou un event listener
            // qui n'est pas disponible directement via l'API Vencord publique
            
            console.log(`Fetching ${limit} messages from channel ${channelId} (not implemented yet)`);
            return [];
        } catch (error) {
            console.error("Error fetching user messages:", error);
            return [];
        }
    }

    /**
     * Traite un message reçu et génère une réponse si approprié
     */
    async handleMessageReceived(
        channelId: string,
        message: string,
        sender: string,
        settings: any
    ): Promise<void> {
        // Vérifier si l'assistant est activé pour ce canal
        const state = await getConversationState(channelId);
        if (!state.enabled) return;

        try {
            // Récupérer ou construire le profil de style
            let styleProfile = await getStyleProfile(channelId);
            const messageCount = this.styleProfileCache.get(channelId) ?? 0;

            // Si le profil n'existe pas ou doit être mis à jour
            if (
                !styleProfile ||
                (settings.autoUpdateStyleProfile &&
                    messageCount > 0 &&
                    messageCount % (settings.styleProfileUpdateInterval || 5) === 0)
            ) {
                // Récupérer les messages de l'utilisateur
                const userMessages = await this.fetchUserMessages(
                    channelId,
                    settings.styleMessagesLimit || 20
                );

                if (userMessages.length > 0) {
                    const newProfile = buildStyleProfile(userMessages);

                    if (styleProfile) {
                        styleProfile = mergeStyleProfiles(styleProfile, newProfile);
                    } else {
                        styleProfile = newProfile;
                    }

                    // Sauvegarder le profil mis à jour
                    await setStyleProfile(channelId, styleProfile);
                }
            }

            // Incrémenter le compteur
            this.styleProfileCache.set(channelId, messageCount + 1);

            // Récupérer le contexte récent
            const recentMessages = await this.fetchUserMessages(
                channelId,
                settings.maxContextMessages || 10
            );

            if (!this.aiProvider) {
                console.error("AI Provider not configured");
                return;
            }

            // Générer la réponse
            const response = await generateAIResponse(
                this.aiProvider,
                message,
                styleProfile,
                recentMessages,
                settings.maxResponseLength || 500
            );

            // Émettre l'événement de réponse générée
            if (this.options.onResponseGenerated) {
                this.options.onResponseGenerated(response);
            }
        } catch (error) {
            console.error("Error in message receiver:", error);
            if (this.options.onError && error instanceof Error) {
                this.options.onError(error);
            }
        }
    }

    /**
     * Réinitialise le cache
     */
    resetCache() {
        this.styleProfileCache.clear();
    }
}
