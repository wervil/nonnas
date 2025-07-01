import DOMPurify from 'isomorphic-dompurify'

export const sanitizeHtml = (html: string) => {
    return html ? DOMPurify.sanitize(html) : ''
}