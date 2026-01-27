import DOMPurify from 'dompurify'

export const sanitizeHtml = (html: string) => {
    if (typeof window === 'undefined') {
        return html;
    }
    return html ? DOMPurify.sanitize(html) : ''
}