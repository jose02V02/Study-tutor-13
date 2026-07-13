/* Simple markdown to safe HTML renderer for tutor messages. */
export function renderMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) =>
    `<pre class="bg-emerald-900/5 border border-emerald-900/10 rounded-md p-3 overflow-x-auto"><code>${code}</code></pre>`
  );
  // Inline code
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // Headings
  html = html.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Blockquote
  html = html.replace(/^&gt;\s?(.*)$/gm, "<blockquote>$1</blockquote>");
  // Lists
  html = html.replace(/(^|\n)([-*])\s+(.+)/g, "$1<li>$3</li>");
  html = html.replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>))/g, "<ul>$1</ul>\n");
  html = html.replace(/(^|\n)\d+\.\s+(.+)/g, "$1<li>$2</li>");
  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*<(h\d|ul|ol|pre|blockquote|li)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return html;
}
