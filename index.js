const BUTTON_CLASS = 'save-message-md-button';


function sanitizeFilename(name) {
    return String(name || '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
}


function getCharacterName(context) {
    // name2 is SillyTavern's current character name.
    if (context.name2 && context.name2.trim()) {
        return context.name2.trim();
    }

    // Fallback for versions/configurations where name2 isn't populated.
    if (
        context.characterId !== undefined &&
        context.characters?.[context.characterId]?.name
    ) {
        return context.characters[context.characterId].name.trim();
    }

    // Final fallback: find the first character message.
    if (context.chat) {
        for (const message of context.chat) {
            if (
                message?.name &&
                message.is_user !== true &&
                message.is_system !== true
            ) {
                return message.name.trim();
            }
        }
    }

    return 'Character';
}


function getUserName(context) {
    // name1 is the current user's/persona's name.
    if (context.name1 && context.name1.trim()) {
        return context.name1.trim();
    }

    return 'User';
}


function getChatName(context) {
    /*
     * chatId is normally the current chat filename.
     * Remove the .jsonl extension for the nicer filename.
     */
    if (context.chatId && context.chatId.trim()) {
        return context.chatId
            .replace(/\.jsonl$/i, '')
            .replace(/\.json$/i, '')
            .trim();
    }

    return 'Chat';
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


    /*
     * Build the default filename:
     *
     * Character_Chat_User_MessageNumber.md
     */
    const characterName = sanitizeFilename(
        getCharacterName(context)
    );

    const chatName = sanitizeFilename(
        getChatName(context)
    );

    const userName = sanitizeFilename(
        getUserName(context)
    );

    const messageNumber = String(messageId).padStart(3, '0');

    const defaultFilename =
        `${characterName}_${chatName}_${userName}_${messageNumber}.md`;


    /*
     * Create the dialog.
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
                autocomplete="off"
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
     * Select the filename without the extension.
     */
    filenameInput.focus();

    const extensionPosition =
        filenameInput.value.lastIndexOf('.md');

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
         * Ensure .md extension.
         */
        if (!filename.toLowerCase().endsWith('.md')) {
            filename += '.md';
        }


        filename = sanitizeFilename(filename);


        /*
         * IMPORTANT:
         *
         * Only the original message text goes into
         * the Markdown file.
         *
         * No character name.
         * No chat name.
         * No message number.
         * No extra instructions.
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


    saveButton.addEventListener(
        'click',
        saveFile
    );


    cancelButton.addEventListener(
        'click',
        closeDialog
    );


    /*
     * Escape closes the dialog.
     *
     * Ctrl+Enter saves.
     */
    overlay.addEventListener(
        'keydown',
        (event) => {

            if (event.key === 'Escape') {
                closeDialog();
            }

            if (
                event.key === 'Enter' &&
                event.ctrlKey
            ) {
                saveFile();
            }

        }
    );


    /*
     * Clicking outside the dialog closes it.
     */
    overlay.addEventListener(
        'click',
        (event) => {

            if (event.target === overlay) {
                closeDialog();
            }

        }
    );
}


function addButton(messageElement) {

    if (!messageElement) {
        return;
    }


    /*
     * Don't add the button twice.
     */
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
     * Only add this to user/Zach messages.
     */
    if (message.is_user !== true) {
        return;
    }


    /*
     * THIS IS THE IMPORTANT CHANGE.
     *
     * .mes_buttons is the entire action area.
     *
     * .extraMesButtons is the hidden menu that
     * opens when you click the "..." button.
     */
    const container =
        messageElement.querySelector(
            '.extraMesButtons'
        );


    if (!container) {

        console.warn(
            'Save Message Markdown: .extraMesButtons not found.',
            messageElement
        );

        return;
    }


    /*
     * Create the button using SillyTavern's
     * existing message-button styling.
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


    /*
     * Add it to the expanded Message Actions menu.
     */
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


    /*
     * Scan messages already on screen.
     */
    scanMessages();


    /*
     * Watch for new messages and dynamically
     * rendered messages.
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