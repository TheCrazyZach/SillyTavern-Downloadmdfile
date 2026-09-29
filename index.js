const MODULE_NAME = 'save_message_markdown';

const BUTTON_CLASS = 'save-message-md-button';

/**
 * Create the download button for a message.
 */
function createButton(messageId) {
    const button = document.createElement('div');

    button.className = `mes_button ${BUTTON_CLASS}`;
    button.title = 'Save message as Markdown';
    button.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i>';

    button.dataset.messageId = messageId;

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        downloadMessageAsMarkdown(Number(messageId));
    });

    return button;
}

/**
 * Download a specific SillyTavern chat message as a Markdown file.
 */
function downloadMessageAsMarkdown(messageId) {
    const context = SillyTavern.getContext();
    const chat = context.chat;

    if (!chat || !chat[messageId]) {
        toastr.error('Could not find the selected message.');
        console.error(`[${MODULE_NAME}] Message not found:`, messageId);
        return;
    }

    const message = chat[messageId];

    if (!message.mes) {
        toastr.error('The selected message has no text.');
        return;
    }

    // The message text itself.
    const text = message.mes;

    // Use the message's displayed name if available.
    const name = message.name || 'Message';

    // Determine whether this is a user message.
    const isUser = message.is_user === true;

    // Build the Markdown document.
    const markdown = `# ${name}

${text}
`;

    // Create a safe filename.
    const safeName = name
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50) || 'Message';

    const filename = `${safeName}_${String(messageId).padStart(3, '0')}.md`;

    // Create the downloadable file.
    const blob = new Blob([markdown], {
        type: 'text/markdown;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);

    toastr.success(`Saved ${filename}`);
}

/**
 * Add the button to a rendered message.
 */
function addButtonToMessage(messageElement) {
    if (!messageElement) {
        return;
    }

    // Don't add the button twice.
    if (messageElement.querySelector(`.${BUTTON_CLASS}`)) {
        return;
    }

    const messageId = Number(messageElement.getAttribute('mesid'));

    if (!Number.isInteger(messageId) || messageId < 0) {
        return;
    }

    const context = SillyTavern.getContext();
    const message = context.chat?.[messageId];

    if (!message) {
        return;
    }

    // Only add the button to Zach/user messages.
    if (message.is_user !== true) {
        return;
    }

    // SillyTavern's message button container.
    const buttonContainer = messageElement.querySelector('.mes_buttons');

    if (!buttonContainer) {
        return;
    }

    const button = createButton(messageId);

    // Put our button at the end of the existing buttons.
    buttonContainer.appendChild(button);
}

/**
 * Find a rendered message and add our button.
 */
function handleUserMessageRendered(messageId) {
    const messageElement = document.querySelector(
        `.mes[mesid="${messageId}"]`
    );

    if (messageElement) {
        addButtonToMessage(messageElement);
    }
}

/**
 * Initialize the extension.
 */
function init() {
    const context = SillyTavern.getContext();
    const {
        eventSource,
        event_types
    } = context;

    // Add the button when a user message is rendered.
    eventSource.on(
        event_types.USER_MESSAGE_RENDERED,
        handleUserMessageRendered
    );

    // Also add buttons to messages that already exist when the extension loads.
    document.querySelectorAll('.mes').forEach(addButtonToMessage);

    console.log(`[${MODULE_NAME}] Loaded.`);
}

init();