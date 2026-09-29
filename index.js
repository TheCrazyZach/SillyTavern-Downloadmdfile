const BUTTON_CLASS = 'save-message-md-button';


function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 120);
}


function getChatName(context) {
    /*
     * Try to determine the current chat name.
     * SillyTavern's chat filename is usually available through
     * the chat metadata/context, but the exact property can vary.
     */

    const candidates = [
        context.chatId,
        context.chatName,
        context.chatFileName,
        context.chat_metadata?.chat_id,
        context.chat_metadata?.chat_name
    ];

    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) {
            return value
                .replace(/\.jsonl$/i, '')
                .replace(/\.json$/i, '')
                .trim();
        }
    }

    return 'Chat';
}


function getCharacterName(context) {
    /*
     * Try the current character name first.
     */
    if (context.name1 && context.name1.trim()) {
        return context.name1.trim();
    }

    if (context.character?.name) {
        return context.character.name.trim();
    }

    /*
     * Fallback to the first character message.
     */
    if (context.chat) {
        for (const message of context.chat) {
            if (message?.name && message.is_user !== true) {
                return message.name.trim();
            }
        }
    }

    return 'Character';
}


function showSaveDialog(messageId) {
    const context = SillyTavern.getContext();
    const message = context.chat?.[messageId];

    if (!message) {
        toastr.error('Could not find this message.');
        return;
    }

    const text = message.mes ?? '';

    if (!text.trim()) {
        toastr.warning('This message is empty.');
        return;
    }

    const characterName = sanitizeFilename(
        getCharacterName(context)
    );

    const chatName = sanitizeFilename(
        getChatName(context)
    );

    const messageNumber = String(messageId).padStart(3, '0');

    const defaultFilename =
        `${characterName}_${chatName}_${messageNumber}.md`;

    /*
     * Build a simple modal.
     */
    const overlay = document.createElement('div');

    overlay.className = 'save-message-md-overlay';

    overlay.innerHTML = `
        <div class="save-message-md-dialog">
            <div class="save-message-md-title">
                Save Message as Markdown
            </div>

            <div class="save-message-md-info">
                Message ${messageNumber}
            </div>

            <textarea
                class="save-message-md-preview"
                readonly
            ></textarea>

            <label class="save-message-md-label">
                Filename
            </label>

            <input
                type="text"
                class="save-message-md-filename"
                value=""
            />

            <div class="save-message-md-buttons">
                <button
                    type="button"
                    class="menu_button save-message-md-cancel"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    class="menu_button save-message-md-save"
                >
                    Save Markdown
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const preview = overlay.querySelector(
        '.save-message-md-preview'
    );

    const filenameInput = overlay.querySelector(
        '.save-message-md-filename'
    );

    const saveButton = overlay.querySelector(
        '.save-message-md-save'
    );

    const cancelButton = overlay.querySelector(
        '.save-message-md-cancel'
    );

    preview.value = text;
    filenameInput.value = defaultFilename;

    /*
     * Select the filename without the .md extension.
     */
    filenameInput.focus();

    const extensionPosition = filenameInput.value.lastIndexOf('.md');

    if (extensionPosition > 0) {
        filenameInput.setSelectionRange(
            0,
            extensionPosition
        );
    } else {
        filenameInput.select();
    }


    function closeDialog() {
        overlay.remove();
    }


    function saveFile() {
        let filename = filenameInput.value.trim();

        if (!filename) {
            toastr.warning('Please enter a filename.');
            filenameInput.focus();
            return;
        }

        /*
         * Make sure the file has the Markdown extension.
         */
        if (!filename.toLowerCase().endsWith('.md')) {
            filename += '.md';
        }

        filename = sanitizeFilename(filename);

        /*
         * The downloaded file contains ONLY the original message.
         */
        const blob = new Blob(
            [text],
            {
                type: 'text/markdown;charset=utf-8'
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        link.href = url;
        link.download = filename;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        toastr.success(`Saved ${filename}`);

        closeDialog();
    }


    saveButton.addEventListener('click', saveFile);

    cancelButton.addEventListener(
        'click',
        closeDialog
    );


    /*
     * Escape closes the dialog.
     */
    overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeDialog();
        }

        if (
            event.key === 'Enter' &&
            event.ctrlKey
        ) {
            saveFile();
        }
    });


    /*
     * Clicking the dark area outside the dialog closes it.
     */
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
            closeDialog();
        }
    });
}


function addButton(messageElement) {
    if (!messageElement) {
        return;
    }

    if (
        messageElement.querySelector(
            `.${BUTTON_CLASS}`
        )
    ) {
        return;
    }

    const messageId = Number(
        messageElement.getAttribute('mesid')
    );

    if (!Number.isInteger(messageId)) {
        return;
    }

    const context = SillyTavern.getContext();

    const message = context.chat?.[messageId];

    if (!message) {
        return;
    }

    /*
     * Only show the button on user/Zach messages.
     */
    if (message.is_user !== true) {
        return;
    }


    /*
     * Find SillyTavern's existing message action container.
     *
     * Try several selectors because this has changed
     * between SillyTavern versions.
     */
    const selectors = [
        '.mes_buttons',
        '.mes_button_container',
        '.mes_header .mes_buttons',
        '.mes_header'
    ];

    let container = null;

    for (const selector of selectors) {
        container = messageElement.querySelector(selector);

        if (container) {
            break;
        }
    }

    if (!container) {
        console.warn(
            'Save Message Markdown: could not find message action container.'
        );

        return;
    }


    /*
     * Create the button using SillyTavern's normal
     * message-button classes.
     */
    const button = document.createElement('div');

    button.className =
        `mes_button ${BUTTON_CLASS}`;

    button.title =
        'Save message as Markdown';

    button.innerHTML =
        '<i class="fa-solid fa-file-arrow-down"></i>';


    button.addEventListener(
        'click',
        (event) => {
            event.preventDefault();
            event.stopPropagation();

            showSaveDialog(messageId);
        }
    );


    container.appendChild(button);
}


function scanMessages() {
    document
        .querySelectorAll('.mes')
        .forEach(addButton);
}


function init() {
    console.log(
        'Save Message Markdown: initializing...'
    );

    scanMessages();


    /*
     * Watch for newly rendered messages.
     */
    const observer =
        new MutationObserver(() => {
            scanMessages();
        });


    observer.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );


    console.log(
        'Save Message Markdown: loaded.'
    );
}


init();