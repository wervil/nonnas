import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $insertList,
  $removeList,
} from '@lexical/list'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { COMMAND_PRIORITY_LOW } from 'lexical'
import { useEffect } from 'react'

export function ListCommandPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      INSERT_UNORDERED_LIST_COMMAND,
      () => {
        $insertList('bullet')
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      INSERT_ORDERED_LIST_COMMAND,
      () => {
        $insertList('number')
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  //   useEffect(() => {
  //     return editor.registerCommand(
  //       INSERT_CHECK_LIST_COMMAND,
  //       () => {
  //         $insertList(editor, 'check')
  //         return true
  //       },
  //       COMMAND_PRIORITY_LOW
  //     )
  //   }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      REMOVE_LIST_COMMAND,
      () => {
        $removeList()
        return true
      },
      COMMAND_PRIORITY_LOW
    )
  }, [editor])

  return null
}
