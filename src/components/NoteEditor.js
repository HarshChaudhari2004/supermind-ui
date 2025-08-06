import React, { useRef, useEffect } from 'react';
import '@mdxeditor/editor/style.css';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
  toolbarPlugin,
  diffSourcePlugin,
  frontmatterPlugin,
  directivesPlugin,
  sandpackPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  StrikeThroughSupSubToggles,
  CodeToggle,
  BlockTypeSelect,
  ListsToggle,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertCodeBlock,
  InsertThematicBreak,
  InsertFrontmatter,
  DiffSourceToggleWrapper,
  Separator,
  ConditionalContents,
  ChangeCodeMirrorLanguage
} from '@mdxeditor/editor';
import { AdmonitionDirectiveDescriptor } from '@mdxeditor/editor';

// NoteEditor: All features, robust dropdowns, left-aligned, kitchen sink toolbar, robust fullscreen
export default function NoteEditor({
  value,
  onChange,
  isDarkTheme
}) {
  // Set up all plugins and toolbar features as in the demo
  // Remove all wrappers, render MDXEditor directly
  // Set theme class and z-index for dropdowns
  return (
    <MDXEditor
      className={`mdxeditor ${isDarkTheme ? 'dark-theme' : ''}`}
      markdown={value}
      onChange={onChange}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        imagePlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'txt' }),
        codeMirrorPlugin({
          codeBlockLanguages: {
            js: 'JavaScript', jsx: 'JSX', ts: 'TypeScript', tsx: 'TSX',
            python: 'Python', py: 'Python', css: 'CSS', html: 'HTML',
            json: 'JSON', md: 'Markdown', txt: 'Plain Text', bash: 'Bash',
            sh: 'Shell', sql: 'SQL', yaml: 'YAML', xml: 'XML'
          }
        }),
        frontmatterPlugin(),
        directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
        sandpackPlugin(),
        diffSourcePlugin({
          diffMarkdown: value,
          viewMode: 'rich-text'
        }),
        toolbarPlugin({
          toolbarContents: (ctx) => (
            <DiffSourceToggleWrapper>
              <UndoRedo />
              <Separator />
              <BoldItalicUnderlineToggles />
              <StrikeThroughSupSubToggles />
              <CodeToggle />
              <Separator />
              <BlockTypeSelect />
              <Separator />
              <ListsToggle />
              <Separator />
              <CreateLink />
              <InsertImage />
              <Separator />
              <InsertTable />
              <InsertCodeBlock />
              <InsertThematicBreak />
              <InsertFrontmatter />
              <Separator />
              <ConditionalContents
                options={[{
                  when: (editor) => editor?.isInCodeBlock?.(),
                  contents: () => <ChangeCodeMirrorLanguage />
                }]}
              />
            </DiffSourceToggleWrapper>
          )
        })
      ]}
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        alignSelf: 'stretch',
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        textAlign: 'left',
        overflow: 'auto',
        zIndex: 9999 // Ensure dropdowns/portals are above popup
      }}
      contentEditableClassName="mdxeditor-content"
      // Ensure dropdowns/portals are above popup
      popupContainer={document.body}
    />
  );
}
