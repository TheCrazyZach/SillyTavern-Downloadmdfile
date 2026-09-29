const BUTTON_CLASS = 'save-message-md-button';

function downloadMessage(messageId) {
    const context = SillyTavern.getContext();

    if (!context || !context.chat) {
        toastr.error('Could not access SillyTavern chat data.');
        return;
    }

    const message = context.chat[messageId];

    if (!message) {
        toastr.error('Could not find this message.');
        console.error('Save Message Markdown: message not found:', messageId);
        return;
    }

    const text = message.mes ?? '';

    if (!text) {
        toastr.warning('This message is empty.');
        return;
    }

    const filename = `Zach_${String(messageId).padStart(3, '0')}.md`;

    const blob = new Blob([text], {
        type: 'text/markdown;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toastr.success(`Downloaded ${filename}`);
}


function addButton(messageElement) {
    if (!messageElement) return;

    // Already added.
    if (messageElement.querySelector(`.${BUTTON_CLASS}`)) {
        return;
    }

    const messageId = Number(messageElement.getAttribute('mesid'));

    if (!Number.isInteger(messageId)) {
        return;
    }

    const context = SillyTavern.getContext();
    const message = context.chat?.[messageId];

    if (!message) {
        return;
    }

    // Only show on user/Zach messages.
    if (message.is_user !== true) {
        return;
    }

    /*
     * SillyTavern's message controls can vary slightly between versions.
     * Try the normal message button container first.
     */
    let container = messageElement.querySelector('.mes_buttons');

    /*
     * Fallback: find the message header/button area.
     */
    if (!container) {
        container = messageElement.querySelector('.mes_header');
    }

    if (!container) {
        console.warn(
            'Save Message Markdown: could not find button container',
            messageElement
        );
        return;
    }

    const button = document.createElement('div');

    button.className = `mes_button ${BUTTON_CLASS}`;
    button.title = 'Save message as Markdown';
    button.innerHTML = '<i class="fa-solid fa-file-arrow-down"></i>';

    button.style.cursor = 'pointer';

    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        downloadMessage(messageId);
    });

    container.appendChild(button);
}


function scanMessages() {
    document.querySelectorAll('.mes').forEach(addButton);
}


function init() {
    console.log('Save Message Markdown: initializing...');

    /*
     * Initial scan.
     */
    scanMessages();

    /*
     * Watch for new messages being added to the chat.
     */
    const observer = new MutationObserver(() => {
        scanMessages();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    console.log('Save Message Markdown: loaded.');
}


init();