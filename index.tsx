/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { aiAssistantSettings } from "./aiAssistant/settings";

const settings = definePluginSettings({
    language: {
        type: OptionType.SELECT,
        description: "Language / Idioma",
        default: "en",
        options: [
            { label: "English", value: "en" },
            { label: "Português (BR)", value: "pt-br" },
            { label: "Français", value: "fr" },
        ],
    },
    showGuildToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show separate button to hide guild list / Mostrar botão separado para ocultar servidores",
    },
    showSidebarToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show separate button to hide sidebar / Mostrar botão separado para ocultar barra lateral",
    },
    showBlurToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show separate button to blur conversation / Mostrar botão separado para flouter a conversa / Montrer un bouton séparé pour flouter la conversation",
    },
<<<<<<< HEAD
    showLockToggle: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Show lock button to password protect Discord / Mostrar botão de cadeado para proteger Discord / Montrer le bouton de cadenas pour protéger Discord",
    },
    lockPassword: {
        type: OptionType.STRING,
        description: "Password to unlock Discord / Senha para desbloquear Discord / Mot de passe pour déverrouiller Discord",
        default: "1234",
        secret: true,
    },
    // AI Assistant settings
    ...aiAssistantSettings,
=======
>>>>>>> fedb4e4820b819f38c909ac377021cf13dedae85
});

const i18n = {
    "en": {
        focusOn: "Focus Mode",
        focusOff: "Exit Focus Mode",
        guildShow: "Show servers",
        guildHide: "Hide servers",
        sidebarShow: "Show sidebar",
        sidebarHide: "Hide sidebar",
        blurOn: "Unblur chat",
        blurOff: "Blur chat",
        description: "Hide the server list and sidebar with one click to focus on chat/call. Optional extra buttons in settings.",
    },
    "pt-br": {
        focusOn: "Modo foco",
        focusOff: "Sair do modo foco",
        guildShow: "Mostrar servidores",
        guildHide: "Ocultar servidores",
        sidebarShow: "Mostrar barra lateral",
        sidebarHide: "Ocultar barra lateral",
        blurOn: "Desfocar chat",
        blurOff: "Flouter chat",
        description: "Oculta a lista de servidores e barra lateral com um clique para focar no chat/call. Botões extras opcionais nas configurações.",
    },
    "fr": {
        focusOn: "Mode Focus",
        focusOff: "Quitter le mode focus",
        guildShow: "Afficher les serveurs",
        guildHide: "Masquer les serveurs",
        sidebarShow: "Afficher la barre latérale",
        sidebarHide: "Masquer la barre latérale",
        blurOn: "Dés-flouter chat",
        blurOff: "Flouter chat",
        description: "Masque la liste des serveurs et la barre latérale d'un clic pour vous concentrer sur le chat/l'appel. Boutons supplémentaires optionnels dans les paramètres.",
    },
};

function t(key: keyof typeof i18n["en"]): string {
    const lang = settings.store.language as keyof typeof i18n;
    return i18n[lang]?.[key] ?? i18n["en"][key];
}

let styleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;

// State
let focusHidden = false;
let guildHidden = false;
let sidebarHidden = false;
let chatBlurred = false;

// Buttons
let focusBtn: HTMLDivElement | null = null;
let guildBtn: HTMLDivElement | null = null;
let sidebarBtn: HTMLDivElement | null = null;
let blurBtn: HTMLDivElement | null = null;

function applyCSS() {
    if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "vc-focusMode-style";
    }

    const hideGuild = focusHidden || guildHidden;
    const hideSidebar = focusHidden || sidebarHidden;

    const rules: string[] = [];

    if (hideGuild) {
        rules.push(`
            [class*="guilds_"] {
                width: 0 !important;
                min-width: 0 !important;
                flex-basis: 0 !important;
                overflow: hidden !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: width 0.2s ease, opacity 0.15s ease;
            }
        `);
    }

    if (hideSidebar) {
        rules.push(`
            [class*="sidebarList_"],
            [class*="sidebarListRounded_"] {
                width: 0 !important;
                min-width: 0 !important;
                flex-basis: 0 !important;
                overflow: hidden !important;
                padding: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transition: width 0.2s ease, opacity 0.15s ease;
            }
            [class*="panels_"] {
                display: none !important;
            }
        `);
    }

    if (chatBlurred) {
        rules.push(`
            [class*="chatContent_"] {
                filter: blur(8px) !important;
                pointer-events: none !important;
                user-select: none !important;
            }
        `);
    }

    if (rules.length > 0) {
        styleEl.textContent = rules.join("\n");
        if (!styleEl.parentElement) document.head.appendChild(styleEl);
    } else {
        styleEl.remove();
    }
}

function makeBtn(className: string, label: string, onClick: () => void): HTMLDivElement {
    const el = document.createElement("div");
    el.className = className;
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", label);

    Object.assign(el.style, {
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        width: "28px",
        height: "28px",
        borderRadius: "4px",
        cursor: "pointer",
        color: "#ffffff",
        fontSize: "11px",
        fontWeight: "700",
        fontFamily: "monospace",
        lineHeight: "1",
        transition: "background-color 0.15s ease",
        marginLeft: "4px",
        flexShrink: "0",
    });

    el.addEventListener("click", onClick);
    el.addEventListener("mouseenter", () => { el.style.filter = "brightness(0.85)"; });
    el.addEventListener("mouseleave", () => { el.style.filter = "none"; });

    return el;
}

function updateButtons() {
    if (focusBtn) {
        focusBtn.textContent = focusHidden ? "⊞" : "⊟";
        focusBtn.title = focusHidden ? t("focusOff") : t("focusOn");
        focusBtn.style.backgroundColor = focusHidden ? "#ed4245" : "#5865f2";
    }
    if (guildBtn) {
        guildBtn.textContent = guildHidden || focusHidden ? "G+" : "G";
        guildBtn.title = (guildHidden || focusHidden) ? t("guildShow") : t("guildHide");
        guildBtn.style.backgroundColor = (guildHidden || focusHidden) ? "#ed4245" : "#3ba55c";
    }
    if (sidebarBtn) {
        sidebarBtn.textContent = sidebarHidden || focusHidden ? "S+" : "S";
        sidebarBtn.title = (sidebarHidden || focusHidden) ? t("sidebarShow") : t("sidebarHide");
        sidebarBtn.style.backgroundColor = (sidebarHidden || focusHidden) ? "#ed4245" : "#faa61a";
    }
    if (blurBtn) {
        blurBtn.textContent = chatBlurred ? "👁" : "👁‍🗨";
        blurBtn.title = chatBlurred ? t("blurOn") : t("blurOff");
        blurBtn.style.backgroundColor = chatBlurred ? "#ed4245" : "#9c27b0";
    }
}

function toggleFocus() {
    focusHidden = !focusHidden;
    applyCSS();
    updateButtons();
}

function toggleGuild() {
    guildHidden = !guildHidden;
    applyCSS();
    updateButtons();
}

function toggleSidebar() {
    sidebarHidden = !sidebarHidden;
    applyCSS();
    updateButtons();
}

function toggleBlur() {
    chatBlurred = !chatBlurred;
    applyCSS();
    updateButtons();
}

function injectButtons() {
    const leading = document.querySelector<HTMLElement>("[class*='leading_']");
    if (!leading) return;

    // Focus button (always present)
    if (!leading.querySelector(".vc-focusMode-btn")) {
        focusBtn = makeBtn("vc-focusMode-btn", "Focus Mode", toggleFocus);
        updateButtons();
        leading.appendChild(focusBtn);
    }

    // Guild toggle (optional)
    if (settings.store.showGuildToggle && !leading.querySelector(".vc-focusMode-guild")) {
        guildBtn = makeBtn("vc-focusMode-guild", "Toggle Guild List", toggleGuild);
        updateButtons();
        leading.appendChild(guildBtn);
    }
    if (!settings.store.showGuildToggle && leading.querySelector(".vc-focusMode-guild")) {
        leading.querySelector(".vc-focusMode-guild")?.remove();
        guildBtn = null;
    }

    // Sidebar toggle (optional)
    if (settings.store.showSidebarToggle && !leading.querySelector(".vc-focusMode-sidebar")) {
        sidebarBtn = makeBtn("vc-focusMode-sidebar", "Toggle Sidebar", toggleSidebar);
        updateButtons();
        leading.appendChild(sidebarBtn);
    }
    if (!settings.store.showSidebarToggle && leading.querySelector(".vc-focusMode-sidebar")) {
        leading.querySelector(".vc-focusMode-sidebar")?.remove();
        sidebarBtn = null;
    }

    // Blur toggle (optional)
    if (settings.store.showBlurToggle && !leading.querySelector(".vc-focusMode-blur")) {
        blurBtn = makeBtn("vc-focusMode-blur", "Toggle Blur Chat", toggleBlur);
        updateButtons();
        leading.appendChild(blurBtn);
    }
    if (!settings.store.showBlurToggle && leading.querySelector(".vc-focusMode-blur")) {
        leading.querySelector(".vc-focusMode-blur")?.remove();
        blurBtn = null;
    }
}

function startObserver() {
    observer = new MutationObserver(() => {
        if (!document.querySelector(".vc-focusMode-btn")) {
            focusBtn = null;
            guildBtn = null;
            sidebarBtn = null;
            injectButtons();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// ============================================
// AI ASSISTANT INTEGRATION
// ============================================

import { injectAIAssistantButton, removeAIAssistantButton } from "./aiAssistant/ui";
import { createAIProvider } from "./aiAssistant/aiProvider";
import { MessageReceiver } from "./aiAssistant/messageReceiver";

let aiMessageReceiver: MessageReceiver | null = null;
let currentChannelId: string | null = null;

/**
 * Initialise le récepteur de messages IA
 */
function initializeAIAssistant() {
    if (!settings.store.enableAIAssistant) return;

    // Créer le fournisseur IA approprié
    const aiProvider = createAIProvider(
        settings.store.aiProvider as "openai" | "ollama",
        settings.store.openaiKey,
        settings.store.openaiModel,
        settings.store.ollamaUrl,
        settings.store.ollamaModel
    );

    // Créer le récepteur de messages
    aiMessageReceiver = new MessageReceiver({
        onResponseGenerated: (response) => {
            // Insérer la réponse dans la barre de saisie
            insertResponseIntoInput(response);
        },
        onError: (error) => {
            console.error("AI Assistant Error:", error);
            // Optionnel: afficher une notification d'erreur
        },
    });

    aiMessageReceiver.setAIProvider(aiProvider);
}

/**
 * Insère une réponse IA dans la zone de saisie du message
 */
function insertResponseIntoInput(response: string) {
    try {
        // Récupérer le textarea de saisie
        const textarea = document.querySelector<HTMLTextAreaElement>(
            'textarea[placeholder*="Message"]'
        );
        
        if (!textarea) {
            console.warn("Message textarea not found");
            return;
        }

        // Insérer le texte (sans envoyer automatiquement)
        textarea.value = response;
        
        // Déclencher l'événement input pour mettre à jour l'UI
        const inputEvent = new Event("input", { bubbles: true });
        textarea.dispatchEvent(inputEvent);

        // Focus sur le textarea pour que l'utilisateur puisse l'éditer
        textarea.focus();
    } catch (error) {
        console.error("Error inserting response:", error);
    }
}

/**
 * Configure le bouton d'Assistant IA
 */
function setupAIAssistantButton() {
    if (!settings.store.enableAIAssistant) return;

    try {
        // Récupérer le canal actuel
        const message = document.querySelector<HTMLElement>('textarea[placeholder*="Message"]');
        if (!message) return;

        // Injecter le bouton avec le handler
        injectAIAssistantButton(currentChannelId || "unknown", async (channelId, enabled) => {
            console.log(`AI Assistant ${enabled ? "enabled" : "disabled"} for channel ${channelId}`);
            
            if (enabled && aiMessageReceiver) {
                // Le profil de style sera construit à la première réception de message
                console.log("AI Assistant ready for this conversation");
            }
        });
    } catch (error) {
        console.error("Error setting up AI button:", error);
    }
}

/**
 * Monitore les changements de canal
 */
function watchChannelChanges() {
    if (!settings.store.enableAIAssistant) return;

    // Utiliser un MutationObserver pour détecter les changements de canal
    const channelObserver = new MutationObserver(() => {
        // Vérifier si le canal a changé
        const newChannelId = detectCurrentChannel();
        
        if (newChannelId && newChannelId !== currentChannelId) {
            currentChannelId = newChannelId;
            setupAIAssistantButton();
        }
    });

    channelObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
    });
}

/**
 * Détecte le canal actuellement actif
 */
function detectCurrentChannel(): string | null {
    try {
        // Chercher l'ID du canal dans les attributs de l'UI
        // Cette implémentation peut varier selon la version de Discord
        const channelElement = document.querySelector<HTMLElement>(
            '[class*="chat-"] h1, [class*="title_"]'
        );
        
        if (!channelElement) return null;

        // Essayer d'extraire l'ID depuis l'URL ou les attributs
        const href = window.location.href;
        const match = href.match(/channels\/\d+\/(\d+)/);
        
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

// ============================================
// MAIN PLUGIN DEFINITION
// ============================================

export default definePlugin({
    name: "FocusMode",
    description: "Hide server list & sidebar with one click to focus on chat/call. | Oculta servidores e barra lateral para focar no chat/call. + AI Assistant per-conversation mode.",
    authors: [Devs.Ven],
    settings,

    start() {
        // Focus Mode features
        startObserver();
        injectButtons();

        // AI Assistant features
        if (settings.store.enableAIAssistant) {
            initializeAIAssistant();
            watchChannelChanges();
            setupAIAssistantButton();
        }
    },

    stop() {
        // Clean up Focus Mode
        styleEl?.remove();
        styleEl = null;
        observer?.disconnect();
        observer = null;
        focusBtn?.remove();
        guildBtn?.remove();
        sidebarBtn?.remove();
        blurBtn?.remove();
        focusBtn = null;
        guildBtn = null;
        sidebarBtn = null;
        blurBtn = null;
        focusHidden = false;
        guildHidden = false;
        sidebarHidden = false;
        chatBlurred = false;
<<<<<<< HEAD
        discordLocked = false;

        // Clean up AI Assistant
        removeAIAssistantButton();
        aiMessageReceiver?.resetCache();
        aiMessageReceiver = null;
        currentChannelId = null;
=======
>>>>>>> fedb4e4820b819f38c909ac377021cf13dedae85
    },
});
