"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect } from "react";

// ─── Toolbar helpers ──────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors cursor-pointer
        ${active
          ? "bg-gray-800 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-gray-200 mx-0.5 self-center" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Enter content…",
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit, // includes Underline, Bold, Italic, Strike, Lists, Headings, History…
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-[220px] max-h-[420px] overflow-y-auto px-4 py-3 text-sm text-gray-800 leading-relaxed focus:outline-none",
      },
    },
  });

  // Sync external content changes (e.g. load from saved template)
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || "");
    }
  }, [content]); // eslint-disable-line

  if (!editor) return null;

  return (
    <div className="border border-amber-300 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-amber-500 focus-within:border-amber-500 transition-all">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolBtn>
        <Divider />

        {/* Inline formatting */}
        <ToolBtn title="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolBtn>
        <ToolBtn title="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolBtn>
        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align Left"   active={editor.isActive({ textAlign: "left" })}    onClick={() => editor.chain().focus().setTextAlign("left").run()}>≡</ToolBtn>
        <ToolBtn title="Align Center" active={editor.isActive({ textAlign: "center" })}  onClick={() => editor.chain().focus().setTextAlign("center").run()}>⊟</ToolBtn>
        <ToolBtn title="Align Right"  active={editor.isActive({ textAlign: "right" })}   onClick={() => editor.chain().focus().setTextAlign("right").run()}>≡</ToolBtn>
        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet List"  active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}>• —</ToolBtn>
        <ToolBtn title="Ordered List" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</ToolBtn>
        <Divider />

        {/* Extras */}
        <ToolBtn title="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolBtn>
        <ToolBtn title="Horizontal Rule" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>—</ToolBtn>
        <Divider />

        {/* Undo / Redo */}
        <ToolBtn title="Undo" active={false} onClick={() => editor.chain().focus().undo().run()}>↩</ToolBtn>
        <ToolBtn title="Redo" active={false} onClick={() => editor.chain().focus().redo().run()}>↪</ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Prose styles injected via a style tag */}
      <style>{`
        .ProseMirror h1 { font-size: 1.4rem; font-weight: 700; margin: 0.6em 0 0.3em; }
        .ProseMirror h2 { font-size: 1.2rem; font-weight: 700; margin: 0.6em 0 0.3em; }
        .ProseMirror h3 { font-size: 1rem;   font-weight: 700; margin: 0.5em 0 0.3em; }
        .ProseMirror p { margin: 0.35em 0; }
        .ProseMirror ul { list-style: disc;    padding-left: 1.4em; margin: 0.4em 0; }
        .ProseMirror ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .ProseMirror blockquote { border-left: 3px solid #e5e7eb; padding-left: 0.75em; color: #6b7280; font-style: italic; margin: 0.5em 0; }
        .ProseMirror hr { border: none; border-top: 1px solid #e5e7eb; margin: 0.75em 0; }
        .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  );
}
