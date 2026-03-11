/* eslint-disable @typescript-eslint/no-explicit-any */
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary as OriginalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { clsx } from 'clsx'
import React, { ReactElement } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'

// Additional imports for toolbar and formatting
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { ListItemNode, ListNode } from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $getRoot, $insertNodes, LexicalEditor, ParagraphNode, TextNode } from 'lexical'
import { useEffect } from 'react'

import ExampleTheme from './ExampleTheme'
import { ListCommandPlugin } from './ListCommandPlugin'
import ToolbarPlugin from './ToolbarPlugin'
import { Typography } from './Typography'

function onChange(
  editorState: LexicalEditor,
  onChange: (value: string) => void
) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const htmlString = $generateHtmlFromNodes(editorState, null)
    onChange(htmlString)
  })
}

// Component to set initial HTML content
function InitialContentPlugin({ initialHtml }: { initialHtml?: string }) {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    if (initialHtml && initialHtml.trim()) {
      editor.update(() => {
        const parser = new DOMParser()
        const dom = parser.parseFromString(initialHtml, 'text/html')
        const nodes = $generateNodesFromDOM(editor, dom)

        // Clear existing content and insert new nodes
        const root = $getRoot()
        root.clear()
        $insertNodes(nodes)
      })
    }
  }, [editor, initialHtml])

  return null
}

function LexicalErrorBoundary({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  const handleError = (error: Error): void => {
    console.error(error)
  }

  return (
    <OriginalErrorBoundary onError={handleError}>
      {children as ReactElement}
    </OriginalErrorBoundary>
  )
}

const editorConfig = {
  namespace: 'MyEditor',
  // Register nodes for lists and other formatting
  nodes: [
    ListNode,
    ListItemNode,
    QuoteNode,
    HeadingNode,
    ParagraphNode,
    TextNode,
  ],
  theme: ExampleTheme,
  onError: (error: Error) => {
    console.error(error)
  },
}

interface TextEditorProps<T extends FieldValues> {
  title: string
  name: Path<T>
  control: Control<T>
  description?: string
  theme?: 'dark' | 'light'
  maxLength?: number
}

export const TextEditor = <T extends FieldValues>({
  title,
  description,
  name,
  control,
  theme = 'dark',
  maxLength,
}: TextEditorProps<T>) => {
  const getTextContent = (html: string): string => {
    if (typeof window === 'undefined') return html
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  return (
    <div className="mb-5">
      <Typography
        as="label"
        htmlFor={name}
        color={theme === 'dark' ? "primaryFocus" : "black"}
        className="mb-2"
      >
        {title}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          const textContent = getTextContent(field.value || '')
          const currentCharCount = textContent.length

          return (
            <>
              <div className={clsx("border rounded-lg overflow-hidden", fieldState.error ? 'border-danger-main' : 'border-primary-main')}>
                <LexicalComposer initialConfig={editorConfig as any}>
                  {/* Add the Toolbar */}
                  <ToolbarPlugin />
                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable className={clsx("w-full px-3 py-4 focus:outline-none text-base text-text-pale font-[var(--font-merriweather)] min-h-[100px] ", theme === 'dark' ? 'bg-primary-hover text-text-pale' : 'bg-white text-[#2c2c2c]')} />
                    }
                    ErrorBoundary={LexicalErrorBoundary}
                  />
                  <InitialContentPlugin initialHtml={field.value} />
                  <OnChangePlugin
                    onChange={(editorState, editor) =>
                      onChange(editor, field.onChange)
                    }
                  />
                  <HistoryPlugin />
                  <ListPlugin />
                  <ListCommandPlugin />
                </LexicalComposer>
              </div>
              {maxLength && (
                <Typography size="bodyXS" color={currentCharCount > maxLength ? "dangerMain" : (theme === 'dark' ? "primaryFocus" : "black")} className="mt-1">
                  {currentCharCount}/{maxLength} characters
                </Typography>
              )}
              {description ? <Typography size="bodyXS" color={theme === 'dark' ? "primaryFocus" : "black"} className='mt-2'>{description}</Typography> : null}
              {fieldState.error && (
                <Typography size="bodyXS" color="dangerMain" className="mt-2">
                  {fieldState.error.message}
                </Typography>
              )}
            </>
          )
        }}
      />
    </div>
  )
}
