import React, { ReactElement } from 'react'
import { Control, Controller, FieldValues, Path } from 'react-hook-form'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary as OriginalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'

// Additional imports for toolbar and formatting
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalEditor, ParagraphNode, TextNode } from 'lexical'

import ToolbarPlugin from './ToolbarPlugin'
import { ListCommandPlugin } from './ListCommandPlugin'
import ExampleTheme from './ExampleTheme'

function onChange(editorState: LexicalEditor, onChange: (value: string) => void) {
  editorState.read(() => {
    // Read the contents of the EditorState here.
    const htmlString = $generateHtmlFromNodes(editorState, null);
    onChange(htmlString)
  })
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
}

export const TextEditor = <T extends FieldValues>({
  title,
  name,
  control,
}: TextEditorProps<T>) => {
  return (
    <div className="mb-5">
      <label className="block mb-2 text-sm font-medium text-gray-700">
        {title}
      </label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <LexicalComposer initialConfig={editorConfig}>
            {/* Add the Toolbar */}
            <ToolbarPlugin />
            <RichTextPlugin
              contentEditable={
                <ContentEditable className="border border-gray-300 rounded-md p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              }
              ErrorBoundary={LexicalErrorBoundary}
            />
            <OnChangePlugin
              onChange={(editorState, editor) => onChange(editor, field.onChange)}
            />
            <HistoryPlugin />
            <ListPlugin />
            <ListCommandPlugin />
          </LexicalComposer>
        )}
      />
    </div>
  )
}
