/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ReactElement } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary as OriginalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { clsx } from 'clsx'

// Additional imports for toolbar and formatting
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html'
import { LexicalEditor, ParagraphNode, TextNode, $getRoot, $insertNodes } from 'lexical'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { useEffect } from 'react'

import ToolbarPlugin from './ToolbarPlugin'
import { ListCommandPlugin } from './ListCommandPlugin'
import ExampleTheme from './ExampleTheme'
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
}

export const TextEditor = <T extends FieldValues>({
  title,
  description,
  name,
  control,
  theme = 'dark',
}: TextEditorProps<T>) => {
  return (
    <div className="mb-5">
      <Typography
        as="label"
        htmlFor={name}
        color="primaryFocus"
        className="mb-2"
      >
        {title}
      </Typography>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <LexicalComposer initialConfig={editorConfig as any}>
            {/* Add the Toolbar */}
            <ToolbarPlugin />
            <RichTextPlugin
              contentEditable={
                <ContentEditable className={clsx("w-full px-3 py-4 border rounded-br-lg rounded-bl-lg focus:outline-none text-base text-text-pale font-[var(--font-merriweather)] min-h-[100px] ", theme === 'dark' ? 'bg-primary-hover' : 'bg-brown-pale')} />
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
        )}
      />
      {description ? <Typography size="bodyXS" color="primaryFocus" className='mt-2'>{description}</Typography> : null}
    </div>
  )
}
