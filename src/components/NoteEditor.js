import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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

// Use inline SVGs for fullscreen icons
const FullScreenSVG = ({dark}) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#222'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
);
const ExitFullScreenSVG = ({dark}) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dark ? '#fff' : '#222'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9L5 5"/><path d="M15 9l4-4"/><path d="M9 15l-4 4"/><path d="M15 15l4 4"/></svg>
);

// NoteEditor: All features, robust dropdowns, left-aligned, kitchen sink toolbar, robust fullscreen
export default function NoteEditor({
  value,
  onChange,
  isDarkTheme
}) {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorContainerRef = useRef(null);

  // Always exit fullscreen on unmount to avoid portal errors
  useEffect(() => {
    return () => {
      setIsFullscreen(false);
    };
  }, []);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Prevent scroll on body when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Styles for fullscreen overlay and button
  const fullscreenStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 2147483647, // Max z-index
    background: isDarkTheme ? '#181818' : '#fff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'stretch',
    alignItems: 'stretch',
    boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)',
    transition: 'all 0.2s',
  };

  // Use a custom class for fullscreen button, style in CSS
  const fullscreenBtnStyles = undefined;

  // Editor JSX
  const editorJSX = (
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
        zIndex: 9999
      }}
      contentEditableClassName="mdxeditor-content"
      popupContainer={document.body}
    />
  );

  // Render fullscreen editor in portal to document.body
  if (isFullscreen) {
    return createPortal(
      <div
        ref={editorContainerRef}
        style={fullscreenStyles}
        className="note-editor-root note-editor-fullscreen"
      >
        {editorJSX}
        <button
          type="button"
          aria-label="Exit fullscreen"
          className="fullscreen-toggle-btn"
          onClick={() => setIsFullscreen(false)}
          tabIndex={0}
          style={{zIndex: 2147483647}}
        >
          <ExitFullScreenSVG dark={isDarkTheme} />
        </button>
      </div>,
      document.body
    );
  }
  // Normal editor
  return (
    <div
      ref={editorContainerRef}
      style={{ position: 'relative', flex: 1, minHeight: 0 }}
      className="note-editor-root"
    >
      {editorJSX}
      <button
        type="button"
        aria-label="Enter fullscreen"
        className="fullscreen-toggle-btn"
        onClick={() => setIsFullscreen(true)}
        tabIndex={0}
      >
        <FullScreenSVG dark={isDarkTheme} />
      </button>
    </div>
  );
}
